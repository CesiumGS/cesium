// Credentials stay on their source's origin (CS-966). A tileset's signed
// query, its headers, and a `Credential` that lists no origins reach only
// the tileset's own origin; a `Credential` that lists origins reaches only
// those. Content that names another server (a tile, an external tileset, a
// glTF buffer) gets none of them. Each case is checked on the request the
// fake transport receives. Every token and signature here is a fake.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The decoders' wasm modules don't load in Node, and nothing here decodes.
vi.mock("../packages/core/src/io/decoders.ts", () => ({}));
import {
  bindToSource,
  Credential,
  FetchProvider,
  type FetchTransport,
} from "../packages/core/src/io/fetchProvider.ts";
import { parseGltf } from "../packages/core/src/io/gltfParse.ts";
import type { GltfAsset } from "../packages/core/src/io/gltfTypes.ts";
import {
  settleWorkerFetch,
  workerFetch,
  WorkerFetchServer,
  type WorkerFetchReply,
} from "../packages/core/src/io/workerFetch.ts";
import * as m4 from "../packages/core/src/math/mat4.ts";
import type { Engine } from "../packages/core/src/scene/Engine.ts";
import type { SelectionView } from "../packages/core/src/streaming/Stepwise.ts";
import { Tileset3D } from "../packages/core/src/streaming/Tileset3D.ts";
import type { TilesetOptions } from "../packages/core/src/streaming/tilesetTypes.ts";
import { fakeEngine } from "./fakeGpu.ts";

const TOKEN = "fake-token-3f9c";
const SIGNATURE = "fake-sig-81aa";
const KEY = "fake-key-07";
const ROOT = "https://tiles.test/t/";
const TILESET = `${ROOT}tileset.json?sig=${SIGNATURE}`;
const R = 6_378_137;

interface Sent {
  url: string;
  headers: Record<string, string>;
}

/**
 * The provider every request goes through, with a transport that records
 * each request and serves `files` (by URL without its query).
 */
function serve(files: Record<string, () => Response> = {}): Sent[] {
  const sent: Sent[] = [];
  const transport: FetchTransport = async (url, init) => {
    sent.push({
      url,
      headers: { ...(init?.headers as Record<string, string> | undefined) },
    });
    const file = files[url.split("?")[0]!];
    return file ? file() : new Response("not found", { status: 404 });
  };
  FetchProvider.default = new FetchProvider({ transport });
  return sent;
}

/** Whether a request carried any of the source's secrets. */
function secretsIn(s: Sent): string[] {
  const found: string[] = [];
  const text = `${s.url} ${JSON.stringify(s.headers)}`;
  for (const secret of [TOKEN, SIGNATURE, KEY]) {
    if (text.includes(secret)) {
      found.push(secret);
    }
  }
  return found;
}

const to = (sent: Sent[], origin: string) =>
  sent.filter((s) => new URL(s.url).origin === origin);

afterEach(() => {
  FetchProvider.default = new FetchProvider();
  vi.unstubAllGlobals();
});

describe("the provider: a source's headers go only to its origin", () => {
  const source = "https://tiles.test/t/tileset.json";

  it("plain headers bound to a source: its origin gets them, another gets none", async () => {
    const sent = serve();
    const headers = bindToSource({ Authorization: `Bearer ${TOKEN}` }, source);
    await FetchProvider.default.fetch("https://tiles.test/t/a.glb", {
      headers,
    });
    await FetchProvider.default.fetch("https://other.test/a.glb", { headers });
    expect(sent[0]!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(secretsIn(sent[1]!)).toEqual([]);
  });

  it("a credential with no origins goes to its source's origin only, with its query", async () => {
    const sent = serve();
    const credential = new Credential({
      headers: { Authorization: `Bearer ${TOKEN}` },
      query: { key: KEY },
    });
    const headers = bindToSource(credential.headers, source);
    await FetchProvider.default.fetch("https://tiles.test/t/a.glb", {
      headers,
    });
    await FetchProvider.default.fetch("https://other.test/a.glb", { headers });
    expect(sent[0]!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(new URL(sent[0]!.url).searchParams.get("key")).toBe(KEY);
    expect(secretsIn(sent[1]!)).toEqual([]);
  });

  it("a credential that lists origins goes to those only, even past its source's", async () => {
    const sent = serve();
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${TOKEN}` } },
      { origins: ["https://cdn.test"] },
    );
    const headers = bindToSource(credential.headers, source);
    for (const url of [
      "https://cdn.test/a.glb",
      "https://tiles.test/t/a.glb",
      "https://other.test/a.glb",
    ]) {
      await FetchProvider.default.fetch(url, { headers });
    }
    expect(sent[0]!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(secretsIn(sent[1]!)).toEqual([]);
    expect(secretsIn(sent[2]!)).toEqual([]);
  });

  it("a bound credential reads rotations live, and a 401 on its origin renews it", async () => {
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${TOKEN}` } },
      {
        refresh: async () => ({
          headers: { Authorization: "Bearer fake-rotated" },
        }),
      },
    );
    const sent: Sent[] = [];
    FetchProvider.default = new FetchProvider({
      transport: async (url, init) => {
        const headers = { ...(init?.headers as Record<string, string>) };
        sent.push({ url, headers });
        return new Response("", {
          status: headers.Authorization === `Bearer ${TOKEN}` ? 401 : 200,
        });
      },
    });
    const headers = bindToSource(credential.headers, source);
    const response = await FetchProvider.default.fetch(
      "https://tiles.test/t/a.glb",
      { headers },
    );
    expect(response.status).toBe(200);
    expect(sent.map((s) => s.headers.Authorization)).toEqual([
      `Bearer ${TOKEN}`,
      "Bearer fake-rotated",
    ]);
  });

  it("a 401 from another origin, which got no credential, renews nothing", async () => {
    let refreshes = 0;
    const credential = new Credential(
      { headers: { Authorization: `Bearer ${TOKEN}` } },
      {
        refresh: async () => {
          refreshes++;
          return { headers: {} };
        },
      },
    );
    FetchProvider.default = new FetchProvider({
      transport: async () => new Response("", { status: 401 }),
    });
    const response = await FetchProvider.default.fetch(
      "https://other.test/a.glb",
      { headers: bindToSource(credential.headers, source) },
    );
    expect(response.status).toBe(401);
    expect(refreshes).toBe(0);
  });

  it("binding again keeps the first source; unbound headers have their request as source", async () => {
    const sent = serve();
    const once = bindToSource({ Authorization: `Bearer ${TOKEN}` }, source);
    const twice = bindToSource(once, "https://other.test/a.glb");
    expect(twice).toBe(once);
    await FetchProvider.default.fetch("https://other.test/a.glb", {
      headers: twice,
    });
    // A host's own request, with no source bound: its headers go with it.
    await FetchProvider.default.fetch("https://other.test/b.json", {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(secretsIn(sent[0]!)).toEqual([]);
    expect(sent[1]!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });
});

/** One triangle, one draw, the default material (as test/models.test.ts). */
function triangle(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

/** A one-tile tileset at the equator and prime meridian. */
function tilesetJson(contentUri: string) {
  return {
    asset: { version: "1.1" },
    geometricError: 100,
    root: {
      geometricError: 0,
      refine: "REPLACE",
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, R, 0, 0, 1],
      boundingVolume: { box: [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10] },
      content: { uri: contentUri },
    },
  };
}

/** A view 1 km above the tile, looking down. */
function view(): SelectionView {
  return {
    id: 0,
    position: new Float64Array([R + 1000, 0, 0]),
    direction: new Float64Array([-1, 0, 0]),
    cartographic: { longitude: 0, latitude: 0, height: 1000 },
    planes: new Float64Array(0),
    sseDenominator: 2 * Math.tan(Math.PI / 6),
    height: 1000,
  };
}

describe("a tileset's content that names another origin (CS-966)", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  /**
   * Loads a tileset whose root tile names `contentUri`, and drives it until
   * the content (or external tileset) has been asked for. The fake engine's
   * workers never answer, so a glTF job is served here as the page serves
   * a worker's requests: through the provider, with the job's headers.
   */
  async function requestsFor(
    contentUri: string,
    options: TilesetOptions,
  ): Promise<{ sent: Sent[]; content: Sent }> {
    const sent = serve({
      [`${ROOT}tileset.json`]: () =>
        new Response(JSON.stringify(tilesetJson(contentUri)), {
          headers: { "Content-Type": "application/json" },
        }),
    });
    const request = vi
      .spyOn(engine.scene.workers, "request")
      .mockImplementation(async (_type, payload) => {
        await FetchProvider.default.fetch(payload.url as string, {
          kind: "content",
          headers: payload.headers as Record<string, string> | undefined,
        });
        return triangle() as never;
      });
    const tileset = await Tileset3D.load(
      engine,
      engine.createWorld(),
      TILESET,
      options,
    );
    try {
      for (let i = 0; i < 100 && sent.length < 2; i++) {
        tileset.update([view()]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      tileset.destroy();
      request.mockRestore();
    }
    expect(sent.length).toBeGreaterThanOrEqual(2);
    // The root tileset JSON went to its own origin with everything.
    expect(new URL(sent[0]!.url).searchParams.get("sig")).toBe(SIGNATURE);
    expect(sent[0]!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    return { sent, content: sent[1]! };
  }

  const plain = (): TilesetOptions => ({
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const unscoped = (): TilesetOptions => ({
    headers: new Credential({
      headers: { Authorization: `Bearer ${TOKEN}` },
      query: { key: KEY },
    }).headers,
  });
  const scoped = (origins: string[]) => (): TilesetOptions => ({
    headers: new Credential(
      { headers: { Authorization: `Bearer ${TOKEN}` }, query: { key: KEY } },
      { origins },
    ).headers,
  });

  it.each([
    ["the source's headers", plain],
    ["a credential without origins", unscoped],
    [
      "a credential whose origins don't include it",
      scoped(["https://tiles.test"]),
    ],
  ])(
    "a tile on another origin gets neither the signed query nor %s",
    async (_name, options) => {
      const { content } = await requestsFor(
        "https://evil.test/a.glb",
        options(),
      );
      expect(new URL(content.url).origin).toBe("https://evil.test");
      expect(content.url).toBe("https://evil.test/a.glb");
      expect(secretsIn(content)).toEqual([]);
    },
  );

  it.each([
    ["the source's headers", plain],
    ["a credential without origins", unscoped],
    [
      "a credential whose origins don't include it",
      scoped(["https://tiles.test"]),
    ],
  ])(
    "an external tileset on another origin gets neither the signed query nor %s",
    async (_name, options) => {
      const { content } = await requestsFor(
        "https://evil.test/ext/tileset.json",
        options(),
      );
      expect(content.url).toBe("https://evil.test/ext/tileset.json");
      expect(secretsIn(content)).toEqual([]);
    },
  );

  it("a tile on the same origin still gets the signed query, the headers and the credential", async () => {
    for (const options of [plain, unscoped]) {
      const { content } = await requestsFor("a.glb", options());
      const url = new URL(content.url);
      expect(url.origin).toBe("https://tiles.test");
      expect(url.searchParams.get("sig")).toBe(SIGNATURE);
      expect(content.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    }
    const { content } = await requestsFor(
      "https://tiles.test/elsewhere/a.glb",
      unscoped(),
    );
    expect(new URL(content.url).searchParams.get("sig")).toBe(SIGNATURE);
    expect(new URL(content.url).searchParams.get("key")).toBe(KEY);
    expect(content.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("a listed origin gets its credential, but not the base's signed query", async () => {
    const { content } = await requestsFor(
      "https://cdn.test/a.glb",
      scoped(["https://tiles.test", "https://cdn.test"])(),
    );
    const url = new URL(content.url);
    expect(url.origin).toBe("https://cdn.test");
    expect(content.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(url.searchParams.get("key")).toBe(KEY);
    expect(url.searchParams.has("sig")).toBe(false);
  });
});

describe("a glTF buffer that names another origin, fetched for a worker (CS-966)", () => {
  /** A one-triangle glTF whose positions are in `positions`'s buffer. */
  function gltf(positions: string) {
    return {
      asset: { version: "2.0" },
      buffers: [
        { uri: positions, byteLength: 36 },
        { uri: "indices.bin", byteLength: 6 },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 36 },
        { buffer: 1, byteOffset: 0, byteLength: 6 },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: "VEC3",
          min: [0, 0, 0],
          max: [1, 1, 0],
        },
        { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    };
  }

  const positions = () =>
    new Response(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
  const indices = () => new Response(new Uint16Array([0, 1, 2]).buffer);

  /** Parses the glTF as a worker does, its requests made on the page. */
  async function parse(
    positionsUri: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<Sent[]> {
    const sent = serve({
      [`${ROOT}a.gltf`]: () =>
        new Response(JSON.stringify(gltf(positionsUri)), {
          headers: { "Content-Type": "model/gltf+json" },
        }),
      [`${ROOT}positions.bin`]: positions,
      [`${ROOT}indices.bin`]: indices,
      "https://evil.test/positions.bin": positions,
    });
    const server = new WorkerFetchServer({
      postMessage: (reply: WorkerFetchReply) => settleWorkerFetch(reply),
    });
    vi.stubGlobal("postMessage", (message: unknown) =>
      server.serve(message as never),
    );
    // What loadGltf does: the tileset's headers, bound to the tileset.
    server.open(11, bindToSource(headers, TILESET));
    await parseGltf(`${ROOT}a.gltf?sig=${SIGNATURE}`, "rgba8", (url, signal) =>
      workerFetch(url, {
        kind: "content",
        scope: 11,
        ...(signal ? { signal } : {}),
      }),
    );
    server.close(11);
    return sent;
  }

  it.each([
    ["the source's headers", () => ({ Authorization: `Bearer ${TOKEN}` })],
    [
      "a credential without origins",
      () =>
        new Credential({
          headers: { Authorization: `Bearer ${TOKEN}` },
          query: { key: KEY },
        }).headers,
    ],
    [
      "a credential whose origins don't include it",
      () =>
        new Credential(
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
            query: { key: KEY },
          },
          { origins: ["https://tiles.test"] },
        ).headers,
    ],
  ])(
    "gets neither the signed query nor %s; the glTF's own origin gets both",
    async (_name, headers) => {
      const sent = await parse("https://evil.test/positions.bin", headers());
      const evil = to(sent, "https://evil.test");
      expect(evil.map((s) => s.url)).toEqual([
        "https://evil.test/positions.bin",
      ]);
      expect(secretsIn(evil[0]!)).toEqual([]);
      const own = to(sent, "https://tiles.test");
      expect(own.map((s) => s.url.split("?")[0])).toEqual([
        `${ROOT}a.gltf`,
        `${ROOT}indices.bin`,
      ]);
      for (const s of own) {
        expect(new URL(s.url).searchParams.get("sig")).toBe(SIGNATURE);
        expect(s.headers.Authorization).toBe(`Bearer ${TOKEN}`);
      }
    },
  );
});
