// Stable identity and labels (CS-815): the hash, keys, sources, label sets
// and the identity table, without a GPU.
import { describe, expect, it } from "vitest";
import {
  canonicalKey,
  canonicalSource,
  checkSchemaIdentity,
  DEFAULT_TAXONOMY,
  hashKey,
  IdentityTable,
  type IdentityWorld,
  LabelSets,
  murmur3x86x128,
  resolveLabels,
  stableIdOf,
  type DrawIdentity,
  type ItemIdentity,
} from "../packages/core/src/scene/identity.ts";
import type { FeatureTable } from "../packages/core/src/io/gltfTypes.ts";

describe("the hash", () => {
  it("is MurmurHash3_x86_128: SMHasher's verification value", () => {
    // SMHasher's VerificationTest: hash keys {0}, {0,1}, ... of 0 to 255
    // bytes with seed 256 - n, hash the 256 digests with seed 0, and read
    // the first 4 bytes little-endian.
    const key = new Uint8Array(256);
    const digests = new Uint8Array(256 * 16);
    const view = new DataView(digests.buffer);
    for (let n = 0; n < 256; n++) {
      key[n] = n;
      const words = murmur3x86x128(key.subarray(0, n), 256 - n);
      words.forEach((w, k) => view.setUint32(n * 16 + k * 4, w, true));
    }
    const [h1] = murmur3x86x128(digests, 0);
    expect(h1).toBe(0xb3ece62a);
  });

  it("hashes the empty input with seed 0 to zeros, and never gives 0 as an ID", () => {
    expect(murmur3x86x128(new Uint8Array(0))).toEqual([0, 0, 0, 0]);
    expect(hashKey("")).toBe(1n);
  });

  it("gives a 64-bit ID from a key's canonical text, the same every time", () => {
    const key = {
      kind: "content",
      item: "site",
      source: "https://tiles.test/site/tileset.json",
      content: "a.glb#n0/p0",
      set: 0,
      feature: 7,
    } as const;
    expect(canonicalKey(key)).toBe(
      '["content","site","https://tiles.test/site/tileset.json","a.glb#n0/p0",0,7]',
    );
    const id = stableIdOf(key);
    expect(typeof id).toBe("bigint");
    expect(id > 0n && id < 1n << 64n).toBe(true);
    expect(stableIdOf({ ...key })).toBe(id);
    expect(stableIdOf({ ...key, feature: 8 })).not.toBe(id);
    expect(stableIdOf({ ...key, item: "site#2" })).not.toBe(id);
    // Its first 64 bits, as two words, low first.
    const [h1, h2] = murmur3x86x128(
      new TextEncoder().encode(canonicalKey(key)),
    );
    expect(id).toBe((BigInt(h2) << 32n) | BigInt(h1));
  });

  it("keeps kinds apart: the same strings in two kinds are two keys", () => {
    expect(stableIdOf({ kind: "host", item: "a", key: "b" })).not.toBe(
      stableIdOf({ kind: "draw", item: "a", source: "b", content: "" }),
    );
  });
});

describe("canonical sources", () => {
  it("drops credentials, query tokens and fragments", () => {
    expect(
      canonicalSource(
        "https://user:secret@Tiles.Test/site/tileset.json?access_token=abc&x=1#top",
      ),
    ).toBe("https://tiles.test/site/tileset.json");
    expect(canonicalSource("site/tileset.json?token=abc")).toBe(
      "site/tileset.json",
    );
  });

  it("keeps a Cesium ion asset's version, and nothing else of its query", () => {
    expect(
      canonicalSource(
        "https://assets.ion.cesium.com/us-east-1/96188/tileset.json?v=3&session=xyz",
      ),
    ).toBe("https://assets.ion.cesium.com/us-east-1/96188/tileset.json?v=3");
  });
});

describe("labels", () => {
  it("takes each taxonomy from the nearest level that sets it, never merged", () => {
    const labels = resolveLabels([
      { class: ["damaged"] },
      { class: ["wheel"], wikidata: ["Q446"] },
      undefined,
      { class: ["car"], asprs: ["Building"] },
    ]);
    expect(labels).toEqual({
      class: ["damaged"],
      wikidata: ["Q446"],
      asprs: ["Building"],
    });
    expect(resolveLabels([{ class: ["a"] }, { b: ["c"] }], ["b"])).toEqual({
      b: ["c"],
    });
  });

  it("interns label sets per taxonomy, 0 for none", () => {
    const sets = new LabelSets();
    expect(sets.index("class", [])).toBe(0);
    expect(sets.index("class", ["car"])).toBe(1);
    expect(sets.index("class", ["truck"])).toBe(2);
    expect(sets.index("class", ["car"])).toBe(1);
    expect(sets.index("wikidata", ["Q1420"])).toBe(1);
    expect([...sets.map("class")]).toEqual([
      [1, ["car"]],
      [2, ["truck"]],
    ]);
  });

  it("pins a palette before content loads, and refuses one after", () => {
    const sets = new LabelSets();
    sets.pin("class", { car: 1, truck: 7 });
    expect(sets.index("class", ["truck"])).toBe(7);
    expect(sets.index("class", ["bus"])).toBe(8);
    expect(sets.index("class", ["car"])).toBe(1);
    expect(() => sets.pin("class", { car: 1 })).toThrow(/palette already/);
    sets.index("other", ["x"]);
    expect(() => sets.pin("other", { x: 1 })).toThrow(/before content loads/);
    expect(() => sets.pin("third", { a: 1, b: 1 })).toThrow(/gives 1/);
    expect(() => sets.pin("third", { a: 0 })).toThrow(/0 is no label/);
  });

  it("names the default taxonomy class", () => {
    expect(DEFAULT_TAXONOMY).toBe("class");
  });
});

describe("reserved names", () => {
  it("refuses embedding spaces and embedding taxonomies by name", () => {
    expect(() =>
      checkSchemaIdentity(
        { embeddings: [{ name: "clip", dimension: 512, metric: "cosine" }] },
        "source",
      ),
    ).toThrow(/reserved for embeddings and learned fields \(CS-817\)/);
    expect(() =>
      checkSchemaIdentity(
        { taxonomies: [{ taxonomy: "embedding:clip", from: "host" }] },
        "source",
      ),
    ).toThrow(/reserved/);
    expect(() =>
      checkSchemaIdentity(
        { taxonomies: [{ taxonomy: "class", from: "property" }] },
        "source",
      ),
    ).toThrow(/names none/);
    expect(() =>
      checkSchemaIdentity({ embeddings: [] }, "source"),
    ).not.toThrow();
  });
});

/** An identity table over plain draws: tables and items by draw index. */
function table(options: {
  tables?: Record<number, FeatureTable>;
  items?: Record<number, ItemIdentity>;
  hash?: (text: string) => bigint;
}) {
  const reports: string[] = [];
  const tables: Array<FeatureTable | undefined> = [];
  for (const [i, t] of Object.entries(options.tables ?? {})) {
    tables[Number(i)] = t;
  }
  const world: IdentityWorld = {
    scene: { featureTables: tables, names: [] },
    itemIdentity: (draw) => options.items?.[draw.index],
    featureProperties: () => ({}),
    report: (message) => reports.push(message),
  };
  return { ids: new IdentityTable(world, options.hash), reports };
}

const content = (name: string, set = 0): DrawIdentity => ({
  source: "https://tiles.test/site/tileset.json",
  content: `${name}#n0/p0`,
  set,
  scope: "tile",
});

describe("the identity table", () => {
  it("gives the same IDs whatever order draws are added in", () => {
    const item = { key: "site" };
    const a = table({ items: { 0: item, 1: item } });
    a.ids.register(
      { index: 0, generation: 1 },
      1,
      3,
      true,
      content("a.glb"),
      undefined,
    );
    a.ids.register(
      { index: 1, generation: 1 },
      4,
      2,
      true,
      content("b.glb"),
      undefined,
    );
    const b = table({ items: { 0: item, 1: item } });
    b.ids.register(
      { index: 0, generation: 1 },
      1,
      2,
      true,
      content("b.glb"),
      undefined,
    );
    b.ids.register(
      { index: 1, generation: 1 },
      3,
      3,
      true,
      content("a.glb"),
      undefined,
    );
    const of = (t: IdentityTable, slots: number[]) =>
      slots.map((s) => t.idOfSlot(s));
    expect(of(a.ids, [1, 2, 3])).toEqual(of(b.ids, [3, 4, 5]));
    expect(of(a.ids, [4, 5])).toEqual(of(b.ids, [1, 2]));
    expect(new Set(of(a.ids, [1, 2, 3, 4, 5])).size).toBe(5);
  });

  it("names a feature by its ID-semantic property: one ID in every tile", () => {
    const features: FeatureTable = {
      count: 2,
      columns: { elementId: ["0x2000001", "0x2000002"] },
      semantics: { elementId: "ID" },
    };
    const { ids } = table({ tables: { 0: features, 1: features } });
    ids.register(
      { index: 0, generation: 1 },
      1,
      2,
      true,
      content("coarse.glb"),
      undefined,
    );
    ids.register(
      { index: 1, generation: 1 },
      3,
      2,
      true,
      content("fine.glb"),
      undefined,
    );
    expect(ids.idOfSlot(1)).toBe(ids.idOfSlot(3));
    expect(ids.slot(1)).toMatchObject({
      key: { kind: "named", name: "0x2000001" },
      scope: "global",
    });
    expect(ids.slot(2)!.key.kind).toBe("named");
  });

  it("reports a collision naming both keys, and merges neither", () => {
    const { ids, reports } = table({ hash: () => 42n });
    ids.register(
      { index: 0, generation: 1 },
      1,
      1,
      true,
      content("a.glb"),
      undefined,
    );
    ids.register(
      { index: 1, generation: 1 },
      2,
      1,
      true,
      content("b.glb"),
      undefined,
    );
    expect(ids.idOfSlot(1)).toBe(42n);
    expect(ids.idOfSlot(2)).toBe(42n);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatch(/a\.glb.*b\.glb/);
    expect(ids.collisions.get(42n)).toHaveLength(2);
    expect(ids.identify(42n)).toBeUndefined();
    // Each pick still names its own key.
    expect(ids.slot(1)!.key).toMatchObject({ content: "a.glb#n0/p0" });
    expect(ids.slot(2)!.key).toMatchObject({ content: "b.glb#n0/p0" });
  });

  it("keeps host labels by ID across a reload, over every other level", () => {
    const features: FeatureTable = {
      count: 2,
      columns: { kind: ["car", "truck"] },
    };
    const item: ItemIdentity = {
      key: "site",
      labels: { class: ["vehicle"], wikidata: ["Q42889"] },
      taxonomies: [{ taxonomy: "class", from: "property", property: "kind" }],
    };
    const { ids } = table({
      tables: { 0: features, 1: features },
      items: { 0: item, 1: item },
    });
    ids.register(
      { index: 0, generation: 1 },
      1,
      2,
      true,
      content("a.glb"),
      undefined,
    );
    const truck = ids.idOfSlot(2);
    expect(ids.labelsOfSlot(1)).toEqual({
      class: ["car"],
      wikidata: ["Q42889"],
    });
    ids.setLabels(truck, "class", ["damaged", "truck", "damaged"]);
    expect(ids.identify(truck)!.labels.class).toEqual(["damaged", "truck"]);
    // The tile unloads, and loads again into other slots.
    ids.unregister(0);
    expect(ids.identify(truck)).toBeUndefined();
    ids.register(
      { index: 1, generation: 1 },
      7,
      2,
      true,
      content("a.glb"),
      undefined,
    );
    expect(ids.idOfSlot(8)).toBe(truck);
    expect(ids.identify(truck)!.labels).toEqual({
      class: ["damaged", "truck"],
      wikidata: ["Q42889"],
    });
    ids.setLabels(truck, "class", undefined);
    expect(ids.identify(truck)!.labels.class).toEqual(["truck"]);
    expect(() => ids.setLabels(truck, "embedding:clip", ["x"])).toThrow(
      /reserved/,
    );
  });

  it("resolves an ID image: two words per pixel, the label sets' indexes, 0 for nothing", () => {
    const features: FeatureTable = {
      count: 2,
      columns: { kind: ["car", "truck"] },
    };
    const item: ItemIdentity = {
      key: "site",
      taxonomies: [{ taxonomy: "class", from: "property", property: "kind" }],
    };
    const { ids } = table({ tables: { 0: features }, items: { 0: item } });
    ids.pinPalette("class", { truck: 5 });
    ids.register(
      { index: 0, generation: 1 },
      1,
      2,
      true,
      content("a.glb"),
      undefined,
    );
    const image = ids.resolveSlots(Uint32Array.of(0, 1, 2, 2));
    const id = (k: number) =>
      (BigInt(image.instanceId[2 * k + 1]!) << 32n) |
      BigInt(image.instanceId[2 * k]!);
    expect(id(0)).toBe(0n);
    expect(id(1)).toBe(ids.idOfSlot(1));
    expect(id(2)).toBe(ids.idOfSlot(2));
    expect([...image.semanticId]).toEqual([0, 6, 5, 5]);
    expect(image.labelSets.get(5)).toEqual(["truck"]);
    expect(image.labelSets.get(6)).toEqual(["car"]);
  });

  it("refuses embeddings by name", () => {
    const { ids } = table({});
    expect(() => ids.embeddings).toThrow(/reserved for embeddings/);
  });

  it("gives an item key once, and ordinals to further items without one", () => {
    const { ids, reports } = table({});
    expect(ids.claimItemKey(undefined, "site")).toBe("site");
    expect(ids.claimItemKey(undefined, "site")).toBe("site#2");
    expect(reports[0]).toMatch(/#2.*order/);
    expect(ids.claimItemKey("truck-7", "site")).toBe("truck-7");
    expect(() => ids.claimItemKey("truck-7", "site")).toThrow(/its own/);
    ids.releaseItemKey("site#2");
    expect(ids.claimItemKey(undefined, "site")).toBe("site#2");
  });
});
