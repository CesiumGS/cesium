// Redirects when a source attaches its own headers (CS-966, owner's answer
// CS-1033 A). fetch strips only Authorization and cookies on a cross-origin
// hop, so a request that carries any other source header (a rule header, a
// bound header, a credential sent as a custom header) follows redirects
// through the provider: in Node by hand, each hop checked as a fresh
// request against the origin rules; in a browser, refused. A request whose
// only source header is Authorization keeps fetch's own `follow`. Each case
// is checked on the requests the fake transport receives. Every token here
// is a fake.
import { afterEach, describe, expect, it, vi } from "vitest";

// The decoders' wasm modules don't load in Node, and nothing here decodes.
vi.mock("../packages/core/src/io/decoders.ts", () => ({}));
import {
  bindToSource,
  Credential,
  engineFetch,
  FetchProvider,
  type FetchProviderOptions,
  type FetchTransport,
  ForwardingProxy,
} from "../packages/core/src/io/fetchProvider.ts";
import { ionDefaults, resolveIonAsset } from "../packages/core/src/io/ion.ts";
import { resolveITwinIModel } from "../packages/core/src/io/itwin.ts";
import {
  followRedirects,
  MAX_REDIRECTS,
} from "../packages/core/src/io/redirects.ts";

const KEY = "fake-key-5d21";
const TOKEN = "fake-token-c04e";
const SOURCE = "https://tiles.test/t/tileset.json";

interface Sent {
  url: string;
  init: RequestInit | undefined;
}

const headersOf = (s: Sent) =>
  (s.init?.headers as Record<string, string> | undefined) ?? {};

const redirect = (status: number, location: string) => () =>
  new Response(null, { status, headers: { Location: location } });
const ok = () => new Response("ok");

/**
 * A provider whose transport records each request and answers it from
 * `routes` (by exact URL), with a 404 for any other.
 */
function serve(
  routes: Record<string, (s: Sent) => Response>,
  options: Omit<FetchProviderOptions, "transport"> = {},
): Sent[] {
  const sent: Sent[] = [];
  const transport: FetchTransport = async (url, init) => {
    const s = { url, init };
    sent.push(s);
    const route = routes[url];
    return route ? route(s) : new Response("not found", { status: 404 });
  };
  FetchProvider.default = new FetchProvider({ ...options, transport });
  return sent;
}

const apiKey = () => bindToSource({ "X-Api-Key": KEY }, SOURCE);

afterEach(() => {
  FetchProvider.default = new FetchProvider();
});

describe("Node: the provider follows redirects by hand when a source header is attached", () => {
  it("a same-origin redirect keeps the source's headers", async () => {
    const sent = serve({
      "https://tiles.test/t/a.glb": redirect(302, "/t/b.glb"),
      "https://tiles.test/t/b.glb": ok,
    });
    const response = await engineFetch("https://tiles.test/t/a.glb", {
      headers: apiKey(),
    });
    expect(response.status).toBe(200);
    expect(sent.map((s) => s.url)).toEqual([
      "https://tiles.test/t/a.glb",
      "https://tiles.test/t/b.glb",
    ]);
    expect(sent.map((s) => s.init?.redirect)).toEqual(["manual", "manual"]);
    expect(sent.map((s) => headersOf(s)["X-Api-Key"])).toEqual([KEY, KEY]);
  });

  it("a cross-origin hop drops them, and no later hop regains them", async () => {
    const sent = serve({
      "https://tiles.test/t/a.glb": redirect(302, "https://evil.test/x"),
      "https://evil.test/x": redirect(307, "/y"),
      "https://evil.test/y": redirect(302, "https://tiles.test/t/c.glb"),
      "https://tiles.test/t/c.glb": ok,
    });
    const response = await engineFetch("https://tiles.test/t/a.glb", {
      headers: apiKey(),
      accept: "model/gltf-binary",
    });
    expect(response.status).toBe(200);
    expect(sent.map((s) => s.url)).toEqual([
      "https://tiles.test/t/a.glb",
      "https://evil.test/x",
      "https://evil.test/y",
      "https://tiles.test/t/c.glb",
    ]);
    expect(headersOf(sent[0]!)["X-Api-Key"]).toBe(KEY);
    // Accept, which carries nothing, goes with every hop; the key with none
    // after the chain left its origin.
    for (const s of sent.slice(1)) {
      expect(headersOf(s)).toEqual({ Accept: "model/gltf-binary" });
    }
  });

  it("a hop's origin with its own rule gets that rule's headers, and only those", async () => {
    const sent = serve(
      {
        "https://tiles.test/t/a.glb": redirect(302, "https://cdn.test/a.glb"),
        "https://cdn.test/a.glb": redirect(302, "/b.glb"),
        "https://cdn.test/b.glb": ok,
      },
      {
        origins: [
          { origin: "https://tiles.test", headers: { "X-Tenant": "t1" } },
          {
            origin: "https://cdn.test",
            headers: { "X-Gateway": "g2" },
            credentials: "include",
          },
        ],
      },
    );
    await engineFetch("https://tiles.test/t/a.glb", { headers: apiKey() });
    expect(headersOf(sent[0]!)).toEqual({ "X-Tenant": "t1", "X-Api-Key": KEY });
    for (const s of sent.slice(1)) {
      expect(headersOf(s)).toEqual({ "X-Gateway": "g2" });
      expect(s.init?.credentials).toBe("include");
    }
  });

  it("an origin rule's header alone takes redirects over", async () => {
    const sent = serve(
      {
        "https://tiles.test/a.json": redirect(301, "https://other.test/a.json"),
        "https://other.test/a.json": ok,
      },
      {
        origins: [
          { origin: "https://tiles.test", headers: { "X-Tenant": "t1" } },
        ],
      },
    );
    await engineFetch("https://tiles.test/a.json");
    expect(sent[0]!.init?.redirect).toBe("manual");
    expect(headersOf(sent[1]!)).toEqual({});
  });

  it("a credential with declared origins goes only to those, hop by hop", async () => {
    const credential = new Credential(
      { headers: { "X-Api-Key": KEY } },
      { origins: ["https://cdn.test", "https://cdn2.test"] },
    );
    const sent = serve({
      "https://cdn.test/a.glb": redirect(302, "https://cdn2.test/a.glb"),
      "https://cdn2.test/a.glb": redirect(302, "https://other.test/a.glb"),
      "https://other.test/a.glb": redirect(302, "https://cdn2.test/b.glb"),
      "https://cdn2.test/b.glb": ok,
    });
    await engineFetch("https://cdn.test/a.glb", {
      headers: bindToSource(credential.headers, SOURCE),
    });
    expect(sent.map((s) => headersOf(s)["X-Api-Key"])).toEqual([
      KEY,
      KEY,
      undefined,
      undefined,
    ]);
  });

  it(`follows ${MAX_REDIRECTS} redirects and refuses the next`, async () => {
    const chain = (length: number) => {
      const routes: Record<string, (s: Sent) => Response> = {};
      for (let i = 0; i < length; i++) {
        routes[`https://tiles.test/r${i}`] = redirect(302, `/r${i + 1}`);
      }
      routes[`https://tiles.test/r${length}`] = ok;
      return routes;
    };
    let sent = serve(chain(MAX_REDIRECTS));
    const response = await engineFetch("https://tiles.test/r0", {
      headers: apiKey(),
    });
    expect(response.status).toBe(200);
    expect(sent).toHaveLength(MAX_REDIRECTS + 1);

    sent = serve(chain(MAX_REDIRECTS + 1));
    await expect(
      engineFetch("https://tiles.test/r0", { headers: apiKey() }),
    ).rejects.toThrow(/more than 20 times/);
    expect(sent).toHaveLength(MAX_REDIRECTS + 1);
  });

  it("refuses a loop", async () => {
    const sent = serve({
      "https://tiles.test/a": redirect(302, "/b"),
      "https://tiles.test/b": redirect(302, "/a"),
    });
    await expect(
      engineFetch("https://tiles.test/a", { headers: apiKey() }),
    ).rejects.toThrow(/in a loop/);
    expect(sent).toHaveLength(2);
  });

  it("refuses a downgrade from https to http", async () => {
    const sent = serve({
      "https://tiles.test/a": redirect(302, "http://tiles.test/a"),
    });
    await expect(
      engineFetch("https://tiles.test/a", { headers: apiKey() }),
    ).rejects.toThrow(/from https to http/);
    expect(sent).toHaveLength(1);
  });

  it("an abort signal covers the whole chain", async () => {
    const controller = new AbortController();
    const sent = serve({
      "https://tiles.test/a": () => {
        controller.abort();
        return redirect(302, "/b")();
      },
      "https://tiles.test/b": ok,
    });
    await expect(
      engineFetch("https://tiles.test/a", {
        headers: apiKey(),
        signal: controller.signal,
      }),
    ).rejects.toThrow(/abort/i);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.init?.signal).toBe(controller.signal);
  });

  it("an abort signal goes with every hop of a three-hop chain", async () => {
    const controller = new AbortController();
    const sent = serve({
      "https://tiles.test/a": redirect(302, "/b"),
      "https://tiles.test/b": redirect(307, "https://cdn.test/c"),
      "https://cdn.test/c": redirect(302, "/d"),
      "https://cdn.test/d": ok,
    });
    const response = await engineFetch("https://tiles.test/a", {
      headers: apiKey(),
      signal: controller.signal,
    });
    expect(response.status).toBe(200);
    expect(sent).toHaveLength(4);
    for (const s of sent) {
      expect(s.init?.signal).toBe(controller.signal);
    }
  });

  it("refuses a downgrade from https to http on a later hop", async () => {
    const sent = serve({
      "https://tiles.test/a": redirect(302, "https://tiles.test/b"),
      "https://tiles.test/b": redirect(302, "http://tiles.test/c"),
    });
    await expect(
      engineFetch("https://tiles.test/a", { headers: apiKey() }),
    ).rejects.toThrow(/from https to http/);
    expect(sent.map((s) => s.url)).toEqual([
      "https://tiles.test/a",
      "https://tiles.test/b",
    ]);
  });

  it("refuses a redirect to a scheme other than http or https", async () => {
    for (const location of [
      `data:text/plain,${TOKEN}`,
      `javascript:alert("${TOKEN}")`,
    ]) {
      const sent = serve({
        [`https://tiles.test/t/a.glb?key=${KEY}`]: redirect(302, location),
      });
      const error = await engineFetch(`https://tiles.test/t/a.glb?key=${KEY}`, {
        headers: apiKey(),
      }).catch((e: unknown) => e as Error);
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toMatch(/only http and https are followed/);
      expect(message).toContain(location.slice(0, location.indexOf(":") + 1));
      expect(message).toContain("https://tiles.test/t/a.glb");
      expect(message).not.toContain(KEY);
      expect(message).not.toContain(TOKEN);
      expect(sent).toHaveLength(1);
    }
  });

  // Each hop is compared by origin (`URL.origin`), never by string.
  it.each([
    [
      "a protocol-relative hop to another host",
      "//evil.test/x",
      "https://evil.test/x",
      false,
    ],
    [
      "a hop to another port",
      "https://tiles.test:8443/x",
      "https://tiles.test:8443/x",
      false,
    ],
    [
      "a hop to an IP literal",
      "https://127.0.0.1/x",
      "https://127.0.0.1/x",
      false,
    ],
    ["a hop to an IPv6 literal", "https://[::1]/x", "https://[::1]/x", false],
    [
      "a hop to the same host in upper case",
      "https://TILES.TEST/t/b.glb",
      "https://tiles.test/t/b.glb",
      true,
    ],
    [
      "a hop to the default port written out",
      "https://tiles.test:443/t/b.glb",
      "https://tiles.test/t/b.glb",
      true,
    ],
  ])("%s", async (_, location, next, keeps) => {
    const sent = serve({
      "https://tiles.test/t/a.glb": redirect(302, location),
      [next]: ok,
    });
    const response = await engineFetch("https://tiles.test/t/a.glb", {
      headers: apiKey(),
    });
    expect(response.status).toBe(200);
    expect(sent.map((s) => s.url)).toEqual([
      "https://tiles.test/t/a.glb",
      next,
    ]);
    expect(headersOf(sent[1]!)["X-Api-Key"]).toBe(keeps ? KEY : undefined);
  });

  it("a redirect without a Location is the response", async () => {
    serve({
      "https://tiles.test/a": () => new Response(null, { status: 302 }),
    });
    const response = await engineFetch("https://tiles.test/a", {
      headers: apiKey(),
    });
    expect(response.status).toBe(302);
  });

  it("errors name the URL without its query and say why, never a header's value", async () => {
    const credential = new Credential({
      headers: { "X-Api-Key": KEY },
      query: { key: TOKEN },
    });
    serve({
      [`https://tiles.test/t/a.glb?key=${TOKEN}`]: redirect(
        302,
        "http://tiles.test/t/a.glb",
      ),
    });
    const error = await engineFetch("https://tiles.test/t/a.glb", {
      headers: bindToSource(credential.headers, SOURCE),
    }).catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("https://tiles.test/t/a.glb");
    expect((error as Error).message).toMatch(/from https to http/);
    expect((error as Error).message).not.toContain(KEY);
    expect((error as Error).message).not.toContain(TOKEN);
  });
});

describe("a forwarding proxy whose header carries a credential's key", () => {
  const GATEWAY = "https://gw.test/fwd";
  const proxied = (routes: Record<string, (s: Sent) => Response>) =>
    serve(routes, {
      proxy: new ForwardingProxy(GATEWAY),
      origins: [{ origin: "https://gw.test", allowCredentials: true }],
    });

  it.each([
    ["a query key alone", { query: { key: TOKEN } }],
    [
      "a query key with Authorization",
      { headers: { Authorization: `Bearer ${KEY}` }, query: { key: TOKEN } },
    ],
  ])(
    "%s: the gateway's redirect to a CDN gets no X-Target-URL",
    async (_, value) => {
      const credential = new Credential(value);
      const sent = proxied({ [GATEWAY]: redirect(302, "https://cdn.test/x") });
      await engineFetch("https://tiles.test/t/a.glb", {
        headers: bindToSource(credential.headers, SOURCE),
      });
      expect(sent.map((s) => s.url)).toEqual([GATEWAY, "https://cdn.test/x"]);
      // The first hop goes to the gateway with the key in its header, and
      // follows by hand, so the header stays on the gateway's origin.
      expect(sent[0]!.init?.redirect).toBe("manual");
      expect(headersOf(sent[0]!)["X-Target-URL"]).toBe(
        `https://tiles.test/t/a.glb?key=${TOKEN}`,
      );
      expect(headersOf(sent[1]!)).toEqual({});
      expect(JSON.stringify(sent[1])).not.toContain(TOKEN);
      expect(JSON.stringify(sent[1])).not.toContain(KEY);
    },
  );

  it("a proxied request with no token in its target keeps fetch's follow", async () => {
    const credential = new Credential({
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const sent = proxied({ [GATEWAY]: ok });
    await engineFetch("https://tiles.test/t/a.glb", {
      headers: bindToSource(credential.headers, SOURCE),
    });
    expect(sent).toHaveLength(1);
    expect(headersOf(sent[0]!)["X-Target-URL"]).toBe(
      "https://tiles.test/t/a.glb",
    );
    expect(sent[0]!.init?.redirect ?? "follow").toBe("follow");
  });
});

describe("the method and body across a redirect, as fetch does", () => {
  async function hop(status: number, method: string) {
    const sent: Sent[] = [];
    const transport = async (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      return sent.length === 1 ? redirect(status, "/next")() : ok();
    };
    await followRedirects(
      transport,
      "https://tiles.test/first",
      {
        method,
        body: "payload",
        headers: { "Content-Type": "text/plain", "X-Api-Key": KEY },
      },
      () => ({ headers: { "Content-Type": "text/plain", "X-Api-Key": KEY } }),
    );
    const next = sent[1]!.init!;
    return {
      method: next.method ?? "GET",
      body: next.body,
      contentType: (next.headers as Record<string, string>)["Content-Type"],
    };
  }

  it("303 becomes GET with no body", async () => {
    expect(await hop(303, "POST")).toEqual({
      method: "GET",
      body: undefined,
      contentType: undefined,
    });
    expect(await hop(303, "PUT")).toMatchObject({ method: "GET" });
  });

  it("301 or 302 after a POST becomes GET with no body; after a PUT stays", async () => {
    for (const status of [301, 302]) {
      expect(await hop(status, "POST")).toEqual({
        method: "GET",
        body: undefined,
        contentType: undefined,
      });
      expect(await hop(status, "PUT")).toEqual({
        method: "PUT",
        body: "payload",
        contentType: "text/plain",
      });
    }
  });

  it("307 and 308 keep the method and the body", async () => {
    for (const status of [307, 308]) {
      expect(await hop(status, "POST")).toEqual({
        method: "POST",
        body: "payload",
        contentType: "text/plain",
      });
    }
  });
});

describe("browsers: a redirect is refused", () => {
  /** What a browser gives for `redirect: "manual"`: no status, no Location. */
  const opaqueRedirect = () =>
    Object.defineProperties(new Response(null), {
      type: { value: "opaqueredirect" },
      status: { value: 0 },
      ok: { value: false },
    });

  it("an opaque-redirect response is refused with an error that says why", async () => {
    const credential = new Credential({
      headers: { "X-Api-Key": KEY },
      query: { key: TOKEN },
    });
    serve({
      [`https://tiles.test/t/a.glb?key=${TOKEN}`]: opaqueRedirect,
    });
    const error = await engineFetch("https://tiles.test/t/a.glb", {
      headers: bindToSource(credential.headers, SOURCE),
    }).catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain("https://tiles.test/t/a.glb");
    expect(message).toMatch(/redirect/);
    expect(message).toMatch(/browser/);
    expect(message).not.toContain(KEY);
    expect(message).not.toContain(TOKEN);
  });
});

describe("Authorization alone, or no source header: fetch's own follow", () => {
  it("a plain request, and one whose only source header is Authorization", async () => {
    const sent = serve({
      "https://tiles.test/a": redirect(302, "https://other.test/a"),
    });
    await engineFetch("https://tiles.test/a", { accept: "application/json" });
    await engineFetch("https://tiles.test/a", {
      headers: bindToSource({ Authorization: `Bearer ${TOKEN}` }, SOURCE),
    });
    // fetch follows: the provider makes one request and leaves the mode.
    expect(sent).toHaveLength(2);
    for (const s of sent) {
      expect(s.init?.redirect ?? "follow").toBe("follow");
    }
  });

  it("ion: the endpoint request and the asset's content use follow", async () => {
    ionDefaults.accessToken = TOKEN;
    const sent = serve({
      "https://api.ion.test/v1/assets/4242/endpoint": () =>
        Response.json({
          type: "3DTILES",
          url: "https://assets.ion.test/4242/tileset.json",
          accessToken: `asset-${TOKEN}`,
        }),
      "https://assets.ion.test/4242/tileset.json": ok,
    });
    try {
      const asset = await resolveIonAsset(4242, {
        server: "https://api.ion.test/",
      });
      await engineFetch(asset.url, {
        kind: "tileset",
        headers: bindToSource(asset.headers, asset.url),
        accept: "application/json",
      });
    } finally {
      delete ionDefaults.accessToken;
    }
    expect(sent.map((s) => s.url)).toEqual([
      "https://api.ion.test/v1/assets/4242/endpoint",
      "https://assets.ion.test/4242/tileset.json",
    ]);
    expect(headersOf(sent[1]!).Authorization).toBe(`Bearer asset-${TOKEN}`);
    for (const s of sent) {
      expect(s.init?.redirect ?? "follow").toBe("follow");
    }
  });

  it("iTwin: the mesh-export request (Authorization, Accept, Prefer) uses follow", async () => {
    const sent = serve({});
    FetchProvider.default = new FetchProvider({
      transport: async (url, init) => {
        sent.push({ url, init });
        return Response.json({
          exports: [
            {
              status: "Complete",
              _links: { mesh: { href: "https://export.itwin.test/m1" } },
            },
          ],
        });
      },
    });
    await resolveITwinIModel("redirects-test-imodel", {
      accessToken: TOKEN,
      server: "https://api.itwin.test/",
    });
    expect(sent).toHaveLength(1);
    expect(Object.keys(headersOf(sent[0]!)).sort()).toEqual([
      "Accept",
      "Authorization",
      "Prefer",
    ]);
    expect(sent[0]!.init?.redirect ?? "follow").toBe("follow");
  });
});
