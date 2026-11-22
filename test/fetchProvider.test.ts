// FetchProvider (CS-809): renewable credentials, proxies, origin rules,
// hooks, the worker bridge, and no secret in anything printed or thrown.
// Every token here is a fake.
import { afterEach, describe, expect, it, vi } from "vitest";

// The decoders' wasm modules don't load in Node, and no test here decodes.
vi.mock("../packages/core/src/io/decoders.ts", () => ({}));
import {
  Credential,
  DefaultProxy,
  FetchProvider,
  ForwardingProxy,
  engineFetch,
  type FetchProviderOptions,
  type FetchTransport,
  type OriginRule,
} from "../packages/core/src/io/fetchProvider.ts";
import { ionDefaults, resolveIonAsset } from "../packages/core/src/io/ion.ts";
import {
  settleWorkerFetch,
  workerFetch,
  WorkerFetchServer,
  type WorkerFetchReply,
} from "../packages/core/src/io/workerFetch.ts";
import { fetchTilesetJson } from "../packages/core/src/streaming/Tile.ts";

const FAKE = "fake-token-3f9c";
const ROTATED = "fake-token-rotated-77";

interface Sent {
  url: string;
  init: RequestInit | undefined;
}

/** A transport that records what it was sent and answers with `answer`. */
function recorder(answer: (sent: Sent) => Response | Promise<Response>) {
  const sent: Sent[] = [];
  const transport: FetchTransport = async (url, init) => {
    const s = { url, init };
    sent.push(s);
    return answer(s);
  };
  return { sent, transport };
}

const header = (s: Sent, name: string) =>
  (s.init?.headers as Record<string, string> | undefined)?.[name];

afterEach(() => {
  FetchProvider.default = new FetchProvider();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("renewable credentials", () => {
  it("a 401 refreshes once and retries the request once", async () => {
    let tokens = 0;
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${FAKE}` } },
      {
        refresh: async () => ({
          headers: { Authorization: `Bearer ${ROTATED}${++tokens}` },
        }),
      },
    );
    const { sent, transport } = recorder(
      (s) =>
        new Response("x", {
          status: header(s, "Authorization") === `Bearer ${FAKE}` ? 401 : 200,
        }),
    );
    const provider = new FetchProvider({ transport });
    const response = await provider.fetch("https://a.test/t.json", {
      headers: credential.headers,
    });
    expect(response.status).toBe(200);
    expect(sent.map((s) => header(s, "Authorization"))).toEqual([
      `Bearer ${FAKE}`,
      `Bearer ${ROTATED}1`,
    ]);
    expect(credential.generation).toBe(1);
  });

  it("fifty requests refused together share one refresh", async () => {
    const refresh = vi.fn(async () => ({
      headers: { Authorization: `Bearer ${ROTATED}` },
    }));
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${FAKE}` } },
      { refresh },
    );
    const { sent, transport } = recorder(
      (s) =>
        new Response("x", {
          status:
            header(s, "Authorization") === `Bearer ${ROTATED}` ? 200 : 401,
        }),
    );
    const provider = new FetchProvider({ transport });
    const responses = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        provider.fetch(`https://a.test/${i}.glb`, {
          headers: credential.headers,
        }),
      ),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(sent).toHaveLength(100);
  });

  it("a refreshed credential that is refused again returns the 401: no loop", async () => {
    const refresh = vi.fn(async () => ({
      headers: { Authorization: `Bearer ${ROTATED}` },
    }));
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${FAKE}` } },
      { refresh },
    );
    const { sent, transport } = recorder(
      () => new Response("", { status: 401 }),
    );
    const response = await new FetchProvider({ transport }).fetch(
      "https://a.test/t.json",
      { headers: credential.headers },
    );
    expect(response.status).toBe(401);
    expect(sent).toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a refresh with nothing new, or plain headers, makes no retry", async () => {
    const { sent, transport } = recorder(
      () => new Response("", { status: 401 }),
    );
    const provider = new FetchProvider({ transport });
    const none = new Credential(
      { headers: { A: FAKE } },
      { refresh: async () => undefined },
    );
    expect(
      (await provider.fetch("https://a.test/", { headers: none.headers }))
        .status,
    ).toBe(401);
    expect(
      (await provider.fetch("https://a.test/", { headers: { A: FAKE } }))
        .status,
    ).toBe(401);
    expect(sent).toHaveLength(2);
  });

  it("a token rotates without reloading: the next request sends the new one", async () => {
    const credential = new Credential({
      headers: { Authorization: `Bearer ${FAKE}` },
    });
    // A source keeps its headers object for its lifetime (TilesetOptions.headers).
    const sourceHeaders = credential.headers;
    const { sent, transport } = recorder(() => new Response("{}"));
    FetchProvider.default = new FetchProvider({ transport });
    await fetchTilesetJson("https://a.test/tileset.json", sourceHeaders);
    credential.rotate({ headers: { Authorization: `Bearer ${ROTATED}` } });
    await fetchTilesetJson("https://a.test/tileset.json", sourceHeaders);
    expect(sent.map((s) => header(s, "Authorization"))).toEqual([
      `Bearer ${FAKE}`,
      `Bearer ${ROTATED}`,
    ]);
    expect(Credential.of(sourceHeaders)).toBe(credential);
  });

  it("a credential's query parameters go on the URL, and only to its origins", async () => {
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${FAKE}` }, query: { sig: FAKE } },
      { origins: ["https://a.test"] },
    );
    const { sent, transport } = recorder(() => new Response("{}"));
    const provider = new FetchProvider({ transport });
    await provider.fetch("https://a.test/x.glb?v=1", {
      headers: credential.headers,
    });
    await provider.fetch("https://elsewhere.test/x.glb", {
      headers: credential.headers,
    });
    expect(sent[0]!.url).toBe(`https://a.test/x.glb?v=1&sig=${FAKE}`);
    expect(header(sent[0]!, "Authorization")).toBe(`Bearer ${FAKE}`);
    expect(sent[1]!.url).toBe("https://elsewhere.test/x.glb");
    expect(sent[1]!.init?.headers).toBeUndefined();
  });

  it("ion: a 401 on content fetches the endpoint again and retries with the new asset token", async () => {
    ionDefaults.accessToken = FAKE;
    let issued = 0;
    const { sent, transport } = recorder((s) => {
      if (s.url.includes("/endpoint")) {
        issued++;
        return Response.json({
          type: "3DTILES",
          url: "https://assets.ion.test/1/tileset.json",
          accessToken: `asset-${issued}-${ROTATED}`,
        });
      }
      return new Response("{}", {
        status:
          header(s, "Authorization") === `Bearer asset-2-${ROTATED}`
            ? 200
            : 401,
      });
    });
    FetchProvider.default = new FetchProvider({ transport });
    try {
      const asset = await resolveIonAsset(98_765, {
        server: "https://api.ion.test/",
      });
      const response = await engineFetch(asset.url, {
        kind: "tileset",
        headers: asset.headers,
      });
      expect(response.status).toBe(200);
      expect(issued).toBe(2);
      // The asset's own headers object now holds the new token.
      expect(asset.headers.Authorization).toBe(`Bearer asset-2-${ROTATED}`);
      // The asset token goes only to the asset's origin.
      await engineFetch("https://other.test/a.glb", { headers: asset.headers });
      expect(sent.at(-1)!.init?.headers).toBeUndefined();
    } finally {
      delete ionDefaults.accessToken;
    }
  });
});

describe("proxies", () => {
  it("DefaultProxy rewrites as 1.x's does", () => {
    expect(
      new DefaultProxy("/proxy/").getURL("https://a.test/t.json?x=1"),
    ).toBe("/proxy/?https%3A%2F%2Fa.test%2Ft.json%3Fx%3D1");
    expect(new DefaultProxy("/proxy/?url=").getURL("https://a.test/")).toBe(
      "/proxy/?url=https%3A%2F%2Fa.test%2F",
    );
  });

  it("the provider's proxy routes requests; an origin rule can opt out; the engine's files skip it", async () => {
    const { sent, transport } = recorder(() => new Response("{}"));
    const provider = new FetchProvider({
      transport,
      proxy: new DefaultProxy("https://proxy.test/p/"),
      origins: [{ origin: "https://direct.test", proxy: null }],
    });
    await provider.fetch("https://a.test/t.json", { kind: "tileset" });
    await provider.fetch("https://direct.test/t.json");
    await provider.fetch("https://cdn.test/draco.wasm", { kind: "engine" });
    expect(sent.map((s) => s.url)).toEqual([
      "https://proxy.test/p/?https%3A%2F%2Fa.test%2Ft.json",
      "https://direct.test/t.json",
      "https://cdn.test/draco.wasm",
    ]);
  });

  it("ForwardingProxy sends to the host's endpoint with the target in a header", async () => {
    const { sent, transport } = recorder(() => new Response("{}"));
    const provider = new FetchProvider({
      transport,
      proxy: new ForwardingProxy("https://gateway.test/forward", {
        header: "X-Target",
      }),
      origins: [{ origin: "https://gateway.test", allowCredentials: true }],
    });
    const credential = new Credential({ query: { key: FAKE } });
    await provider.fetch("https://a.test/t.json", {
      headers: credential.headers,
    });
    expect(sent[0]!.url).toBe("https://gateway.test/forward");
    expect(header(sent[0]!, "X-Target")).toBe(
      `https://a.test/t.json?key=${FAKE}`,
    );
  });
});

describe("enterprise environments", () => {
  it("origin rules add required headers, by exact origin or subdomain wildcard", async () => {
    const { sent, transport } = recorder(() => new Response("{}"));
    const provider = new FetchProvider({
      transport,
      origins: [
        { origin: "https://tiles.corp.test", headers: { "X-Tenant": "t1" } },
        { origin: "https://*.gateway.test", headers: { "X-Gateway": "g" } },
      ],
    });
    await provider.fetch("https://tiles.corp.test/a");
    await provider.fetch("https://east.gateway.test/a");
    await provider.fetch("https://gateway.test/a");
    await provider.fetch("https://evilgateway.test/a");
    expect(sent.map((s) => s.init?.headers)).toEqual([
      { "X-Tenant": "t1" },
      { "X-Gateway": "g" },
      undefined,
      undefined,
    ]);
  });

  it("the credentials mode stays the browser's default unless a rule chooses one for the origin sent to", async () => {
    const { sent, transport } = recorder(() => new Response("{}"));
    const provider = new FetchProvider({
      transport,
      origins: [
        { origin: "https://sso.corp.test", credentials: "include" },
        {
          origin: "https://proxy.corp.test",
          credentials: "include",
          allowCredentials: true,
        },
        {
          origin: "https://behind.test",
          proxy: new DefaultProxy("https://proxy.corp.test/"),
        },
        { origin: "https://plain.test", credentials: "omit" },
      ],
    });
    await provider.fetch("https://public.test/a");
    await provider.fetch("https://sso.corp.test/a");
    await provider.fetch("https://behind.test/a");
    await provider.fetch("https://plain.test/a");
    expect(sent.map((s) => s.init?.credentials)).toEqual([
      undefined,
      "include",
      "include",
      "omit",
    ]);
    // The default provider adds no credentials mode either.
    const fetchSpy = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);
    await engineFetch("https://public.test/b");
    expect(fetchSpy).toHaveBeenCalledWith("https://public.test/b", {});
  });

  it("the request hook can sign a request; it sees the rule's headers but never a credential's", async () => {
    const seen: unknown[] = [];
    const { sent, transport } = recorder(
      () => new Response("{}", { status: 202 }),
    );
    const responses: unknown[] = [];
    const provider = new FetchProvider({
      transport,
      origins: [{ origin: "https://a.test", headers: { "X-Tenant": "t1" } }],
      onRequest: (request) => {
        seen.push(structuredClone({ ...request }));
        request.headers["X-Signature"] = `sig(${request.url})`;
      },
      onResponse: (response) => {
        responses.push({
          url: response.url,
          kind: response.kind,
          status: response.status,
        });
      },
    });
    const credential = new Credential({
      headers: { Authorization: `Bearer ${FAKE}` },
    });
    await provider.fetch("https://a.test/t.json", {
      kind: "tileset",
      headers: credential.headers,
      accept: "application/json",
    });
    expect(seen).toEqual([
      {
        url: "https://a.test/t.json",
        kind: "tileset",
        headers: { "X-Tenant": "t1", Accept: "application/json" },
      },
    ]);
    expect(sent[0]!.init?.headers).toEqual({
      "X-Tenant": "t1",
      Accept: "application/json",
      "X-Signature": "sig(https://a.test/t.json)",
      Authorization: `Bearer ${FAKE}`,
    });
    expect(responses).toEqual([
      { url: "https://a.test/t.json", kind: "tileset", status: 202 },
    ]);
  });
});

describe("the worker bridge", () => {
  it("a worker's request is made on the page with its job's headers; the worker never sees them", async () => {
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${FAKE}` } },
      {
        refresh: async () => ({
          headers: { Authorization: `Bearer ${ROTATED}` },
        }),
      },
    );
    const { sent, transport } = recorder((s) =>
      header(s, "Authorization") === `Bearer ${ROTATED}`
        ? new Response(new Uint8Array([1, 2, 3]), {
            headers: { "Content-Type": "application/octet-stream" },
          })
        : new Response("", { status: 401 }),
    );
    FetchProvider.default = new FetchProvider({ transport });
    const toPage: unknown[] = [];
    // The worker's postMessage goes to the page's server; its replies come back.
    const server = new WorkerFetchServer({
      postMessage: (reply: WorkerFetchReply) => settleWorkerFetch(reply),
    });
    vi.stubGlobal("postMessage", (message: unknown) => {
      toPage.push(structuredClone(message));
      server.serve(message as never);
    });
    server.open(7, credential.headers);
    const response = await workerFetch("https://a.test/tile.terrain", {
      kind: "terrain",
      accept: "application/vnd.quantized-mesh",
      scope: 7,
    });
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([
      1, 2, 3,
    ]);
    expect(response.headers.get("Content-Type")).toBe(
      "application/octet-stream",
    );
    expect(sent.map((s) => header(s, "Authorization"))).toEqual([
      `Bearer ${FAKE}`,
      `Bearer ${ROTATED}`,
    ]);
    expect(header(sent[0]!, "Accept")).toBe("application/vnd.quantized-mesh");
    expect(JSON.stringify(toPage)).not.toContain("fake-token");
  });

  it("closing a job's scope aborts its requests on the page", async () => {
    let signal: AbortSignal | undefined;
    FetchProvider.default = new FetchProvider({
      transport: (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    });
    const replies: WorkerFetchReply[] = [];
    const server = new WorkerFetchServer({
      postMessage: (r) => replies.push(r),
    });
    server.serve({
      fetch: 1,
      url: "https://a.test/x",
      kind: "content",
      scope: 3,
    });
    await vi.waitFor(() => expect(signal).toBeDefined());
    server.close(3);
    await vi.waitFor(() => expect(replies).toHaveLength(1));
    expect(replies[0]).toMatchObject({ fetchReply: 1, abort: true });
  });
});

describe("credentials through a proxy (owner, CS-838)", () => {
  const TENANT = "tenant-secret-5";
  const URL_TOKEN = "url-token-9";
  const SECRETS = [FAKE, ROTATED, TENANT, URL_TOKEN];

  /**
   * One request carrying every kind of credential: a renewable Credential
   * (header and query), a tenant header from the target's rule, a header
   * the hook adds, tokens already in the URL, and `credentials: "include"`
   * from the target's rule.
   */
  async function sendThrough(
    proxyOptions: Pick<FetchProviderOptions, "proxy"> & {
      targetProxy?: OriginRule["proxy"];
      rules?: OriginRule[];
    },
    status = 200,
  ) {
    const refresh = vi.fn(async () => ({
      headers: { Authorization: `Bearer ${ROTATED}` },
    }));
    const credential = new Credential(
      {
        headers: { Authorization: `Bearer ${FAKE}`, "X-Api-Key": FAKE },
        query: { sig: FAKE },
      },
      { refresh },
    );
    const { sent, transport } = recorder(() => new Response("{}", { status }));
    const provider = new FetchProvider({
      transport,
      ...(proxyOptions.proxy ? { proxy: proxyOptions.proxy } : {}),
      origins: [
        ...(proxyOptions.rules ?? []),
        {
          origin: "https://a.test",
          headers: { "X-Tenant": TENANT },
          credentials: "include",
          ...(proxyOptions.targetProxy !== undefined
            ? { proxy: proxyOptions.targetProxy }
            : {}),
        },
      ],
      onRequest: (request) => {
        request.headers["X-Signature"] = `signed-${FAKE}`;
      },
    });
    const response = await provider.fetch(
      `https://a.test/t.json?v=2&access_token=${URL_TOKEN}&key=${URL_TOKEN}`,
      {
        kind: "tileset",
        headers: credential.headers,
        accept: "application/json",
      },
    );
    return { sent, response, refresh };
  }

  const leaks = (sent: Sent[]) =>
    SECRETS.filter((secret) => JSON.stringify(sent).includes(secret));

  it("the provider-wide DefaultProxy, with no rule for its origin, gets no credential or token", async () => {
    const { sent } = await sendThrough({
      proxy: new DefaultProxy("https://proxy.test/p/"),
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe(
      `https://proxy.test/p/?${encodeURIComponent("https://a.test/t.json?v=2")}`,
    );
    expect(sent[0]!.init?.headers).toEqual({ Accept: "application/json" });
    expect(sent[0]!.init?.credentials).toBeUndefined();
    expect(leaks(sent)).toEqual([]);
  });

  it("a target rule's DefaultProxy, with no rule for its origin, gets no credential or token", async () => {
    const { sent } = await sendThrough({
      targetProxy: new DefaultProxy("https://proxy.test/q/"),
    });
    expect(sent[0]!.url).toBe(
      `https://proxy.test/q/?${encodeURIComponent("https://a.test/t.json?v=2")}`,
    );
    expect(sent[0]!.init?.headers).toEqual({ Accept: "application/json" });
    expect(sent[0]!.init?.credentials).toBeUndefined();
    expect(leaks(sent)).toEqual([]);
  });

  it("ForwardingProxy, with no rule for its origin, gets no credential, and X-Target-URL carries no token", async () => {
    const { sent } = await sendThrough({
      proxy: new ForwardingProxy("https://gateway.test/forward"),
    });
    expect(sent[0]!.url).toBe("https://gateway.test/forward");
    expect(sent[0]!.init?.headers).toEqual({
      Accept: "application/json",
      "X-Target-URL": "https://a.test/t.json?v=2",
    });
    expect(sent[0]!.init?.credentials).toBeUndefined();
    expect(leaks(sent)).toEqual([]);
  });

  it("a proxy that refuses the bare request gets its 401 back: no renewal, no fallback with credentials", async () => {
    const { sent, response, refresh } = await sendThrough(
      { proxy: new DefaultProxy("https://proxy.test/p/") },
      401,
    );
    expect(response.status).toBe(401);
    expect(sent).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(leaks(sent)).toEqual([]);
  });

  it("a proxy whose origin rule allows credentials gets them, as 1.x's do", async () => {
    const { sent } = await sendThrough({
      proxy: new DefaultProxy("https://proxy.test/p/"),
      rules: [
        {
          origin: "https://proxy.test",
          allowCredentials: true,
          credentials: "include",
        },
      ],
    });
    const target = decodeURIComponent(
      sent[0]!.url.split("?").slice(1).join("?"),
    );
    expect(target).toBe(
      `https://a.test/t.json?v=2&access_token=${URL_TOKEN}&key=${URL_TOKEN}&sig=${FAKE}`,
    );
    expect(sent[0]!.init?.headers).toMatchObject({
      Authorization: `Bearer ${FAKE}`,
      "X-Api-Key": FAKE,
      "X-Tenant": TENANT,
      "X-Signature": `signed-${FAKE}`,
    });
    expect(sent[0]!.init?.credentials).toBe("include");
  });

  it("an allowed proxy's 401 renews the credential once, through the proxy", async () => {
    const { sent, response, refresh } = await sendThrough(
      {
        proxy: new ForwardingProxy("https://gateway.test/forward"),
        rules: [{ origin: "https://gateway.test", allowCredentials: true }],
      },
      401,
    );
    expect(response.status).toBe(401);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sent.map((s) => header(s, "Authorization"))).toEqual([
      `Bearer ${FAKE}`,
      `Bearer ${ROTATED}`,
    ]);
  });

  it("rules match the proxy's origin, exact or *.subdomain, never the target's", async () => {
    // A wildcard rule for the proxy's origin allows.
    const wildcard = await sendThrough({
      proxy: new DefaultProxy("https://east.gw.test/p/"),
      rules: [{ origin: "https://*.gw.test", allowCredentials: true }],
    });
    expect(header(wildcard.sent[0]!, "Authorization")).toBe(`Bearer ${FAKE}`);
    // Rules for other origins don't: the target's own, a wildcard that
    // matches the target, an exact rule for a near miss, a bare domain.
    for (const rules of [
      [{ origin: "https://a.test", allowCredentials: true }],
      [{ origin: "https://*.a.test", allowCredentials: true }],
      [{ origin: "https://proxy.test:8443", allowCredentials: true }],
      [{ origin: "http://proxy.test", allowCredentials: true }],
      [{ origin: "https://*.proxy.test", allowCredentials: true }],
    ]) {
      const { sent } = await sendThrough({
        proxy: new DefaultProxy("https://proxy.test/p/"),
        rules,
      });
      expect(sent[0]!.init?.headers, JSON.stringify(rules)).toEqual({
        Accept: "application/json",
      });
      expect(leaks(sent), JSON.stringify(rules)).toEqual([]);
    }
  });

  it("an ion asset through a proxy with no rule: neither the access token nor an asset token reaches it", async () => {
    ionDefaults.accessToken = FAKE;
    const answer = (s: Sent) => {
      const target = decodeURIComponent(s.url.split("?").slice(1).join("?"));
      if (target.includes("/endpoint")) {
        return header(s, "Authorization") === `Bearer ${FAKE}`
          ? Response.json({
              type: "3DTILES",
              url: "https://assets.ion.test/1/tileset.json?v=1",
              accessToken: `asset-${ROTATED}`,
            })
          : new Response("", { status: 401 });
      }
      return new Response("{}", {
        status:
          header(s, "Authorization") === `Bearer asset-${ROTATED}` ? 200 : 401,
      });
    };
    try {
      const bare = recorder(answer);
      FetchProvider.default = new FetchProvider({
        transport: bare.transport,
        proxy: new DefaultProxy("https://proxy.test/"),
      });
      await expect(
        resolveIonAsset(55_501, { server: "https://api.ion.test/" }),
      ).rejects.toThrow("endpoint request failed (401)");
      expect(bare.sent).toHaveLength(1);
      expect(leaks(bare.sent)).toEqual([]);
      // With a rule for the proxy, the endpoint and the asset token go through.
      const allowed = recorder(answer);
      FetchProvider.default = new FetchProvider({
        transport: allowed.transport,
        proxy: new DefaultProxy("https://proxy.test/"),
        origins: [{ origin: "https://proxy.test", allowCredentials: true }],
      });
      const asset = await resolveIonAsset(55_502, {
        server: "https://api.ion.test/",
      });
      const response = await engineFetch(asset.url, { headers: asset.headers });
      expect(response.status).toBe(200);
      // The same asset through a proxy that isn't allowed: refused, no token.
      const refused = recorder(answer);
      FetchProvider.default = new FetchProvider({
        transport: refused.transport,
        proxy: new DefaultProxy("https://proxy.test/"),
      });
      expect(
        (await engineFetch(asset.url, { headers: asset.headers })).status,
      ).toBe(401);
      expect(leaks(refused.sent)).toEqual([]);
    } finally {
      delete ionDefaults.accessToken;
    }
  });
});

describe("no token or header value in any output", () => {
  it("a fake value through a 401 retry, a proxy and a hook appears in nothing printed or thrown", async () => {
    const printed: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        printed.push(args.map((a) => String(a)).join(" "));
      });
    }
    const hookViews: string[] = [];
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${FAKE}` }, query: { key: FAKE } },
      {
        refresh: async () => ({
          headers: { Authorization: `Bearer ${ROTATED}` },
          query: { key: ROTATED },
        }),
      },
    );
    const sends: number[] = [];
    const provider = new FetchProvider({
      proxy: new DefaultProxy("https://proxy.test/"),
      origins: [
        {
          origin: "https://a.test",
          headers: { "X-Tenant": "tenant-secret-5" },
        },
        // Allowed, so the credential and its 401 retry go through the proxy.
        { origin: "https://proxy.test", allowCredentials: true },
      ],
      onRequest: (request) => {
        hookViews.push(JSON.stringify(request));
      },
      onResponse: (response) => {
        hookViews.push(
          JSON.stringify({ ...response, headers: [...response.headers] }),
        );
      },
      transport: async () => {
        sends.push(1);
        return new Response("denied", { status: 401 });
      },
    });
    FetchProvider.default = provider;
    const thrown: string[] = [];
    const capture = async (run: () => Promise<unknown>) => {
      try {
        await run();
      } catch (error) {
        thrown.push(
          error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack}`
            : String(error),
        );
      }
    };
    // Each engine path that turns a refused request into an error.
    await capture(() =>
      fetchTilesetJson("https://a.test/t.json?key=abc", credential.headers),
    );
    const { parseGltf } = await import("../packages/core/src/io/gltfParse.ts");
    await capture(() =>
      parseGltf("https://a.test/c.glb", "rgba8unorm" as never),
    );
    expect(thrown).toHaveLength(2);
    // The tileset JSON was refused, renewed and refused again; the glTF once.
    expect(sends).toHaveLength(3);
    const output = [...printed, ...thrown].join("\n");
    for (const secret of [FAKE, ROTATED, "tenant-secret-5"]) {
      expect(output).not.toContain(secret);
    }
    // A hook sees what the host gave it (its rule's headers), never a
    // credential's values.
    expect(hookViews.length).toBeGreaterThan(0);
    for (const secret of [FAKE, ROTATED]) {
      expect(hookViews.join("\n")).not.toContain(secret);
    }
    // The URL (which can carry a key) isn't in the errors either.
    expect(thrown.join("\n")).not.toContain("a.test");
  });
});
