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

const ENCODER = new TextEncoder();

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

  it("drops user information from every form: protocol-relative, relative, opaque and blob", () => {
    expect(canonicalSource("//user:pw@tiles.test/site/x.json?t=1")).toBe(
      "//tiles.test/site/x.json",
    );
    expect(canonicalSource("\\\\user:pw@tiles.test\\x.json")).toBe(
      "//tiles.test/x.json",
    );
    expect(canonicalSource("s3://key:pw@bucket/x.json")).toBe(
      "s3://bucket/x.json",
    );
    expect(canonicalSource("custom:user:pw@site/x.json")).toBe(
      "custom:site/x.json",
    );
    expect(canonicalSource("blob:https://user:pw@tiles.test/4d5e?t=1")).toBe(
      "blob:https://tiles.test/4d5e",
    );
    // An "@" in a relative path is a path, not user information.
    expect(canonicalSource("site/a@b/x.json")).toBe("site/a@b/x.json");
  });

  it("keeps a data URI as a digest of its bytes, never its payload", () => {
    const json = '{"a":1}';
    const digest = canonicalSource(
      `data:application/json;base64,${btoa(json)}`,
    );
    expect(digest).toMatch(/^data:application\/json;murmur3-128=[0-9a-f]{32}$/);
    // The same bytes in each encoding give the same digest.
    expect(
      canonicalSource(`data:application/json,${encodeURIComponent(json)}`),
    ).toBe(digest);
    expect(canonicalSource(`data:Application/JSON;charset=utf-8,${json}`)).toBe(
      digest,
    );
    // Other bytes, another digest; a media type with odd characters goes.
    expect(canonicalSource("data:application/json,{}")).not.toBe(digest);
    expect(canonicalSource("data:<script>,x")).toMatch(/^data:;murmur3-128=/);
    // Bounded whatever the payload's size.
    expect(
      canonicalSource(`data:;base64,${btoa("x".repeat(100_000))}`).length,
    ).toBeLessThan(64);
  });

  it("keeps a Cesium ion asset's version, and nothing else of its query", () => {
    expect(
      canonicalSource(
        "https://assets.ion.cesium.com/us-east-1/96188/tileset.json?v=3&session=xyz",
      ),
    ).toBe("https://assets.ion.cesium.com/us-east-1/96188/tileset.json?v=3");
    // Protocol-relative, the same.
    expect(
      canonicalSource("//assets.ion.cesium.com/96188/tileset.json?v=3&t=x"),
    ).toBe("//assets.ion.cesium.com/96188/tileset.json?v=3");
  });

  it("reads a reference as the URL parser does: leading spaces and controls, tabs and newlines go first", () => {
    expect(canonicalSource(" //u:p@h/x")).toBe("//h/x");
    expect(canonicalSource(" https://u:p@h/")).toBe("https://h/");
    expect(canonicalSource("\t//u:p@h")).toBe("//h/");
    expect(canonicalSource("https://u:p@h/\n")).toBe("https://h/");
    expect(canonicalSource("\u0000 htt\tps://u:p@h/a\r\nb ")).toBe(
      "https://h/ab",
    );
    // A data URI with a leading space is still a digest, never its payload.
    expect(canonicalSource(' data:application/json,{"a":1}')).toBe(
      canonicalSource('data:application/json,{"a":1}'),
    );
  });

  it("keeps nothing before the last @ of an authority the URL parser can't read", () => {
    // A raw "?", "#" or "/" in the password: the parser fails or would cut it.
    expect(canonicalSource("https://user:pa?ss@h/")).toBe("https://h/");
    expect(canonicalSource("https://user:pa#ss@h/x")).toBe("https://h/x");
    expect(canonicalSource("https://user:pa/ss@h/x")).toBe("https://h/x");
    expect(canonicalSource("//user:pa?ss@h/x?t=1")).toBe("//h/x");
    expect(canonicalSource("s3://key:p?w@bucket/x")).toBe("s3://bucket/x");
    expect(canonicalSource("blob:https://u:p?s@h/x")).toBe("blob:https://h/x");
    // A special scheme's authority starts after any slashes, or none.
    expect(canonicalSource("https:/u:p@h/x")).toBe("https://h/x");
    expect(canonicalSource("https:\\u:p@h/x")).toBe("https://h/x");
    expect(canonicalSource("https:u:p@h/x")).toBe("https://h/x");
    expect(canonicalSource("https:/user:pa?ss@h/x")).toBe("https:/h/x");
    // An opaque reference's password may hold "?" or "#" too.
    expect(canonicalSource("custom:user:p?w#x@site/x")).toBe("custom:site/x");
  });

  it("reads base64 only after a semicolon, as RFC 2397 and fetch's data URL processor do", () => {
    expect(canonicalSource("data:base64,QUJD")).toBe(
      canonicalSource("data:,QUJD"),
    );
    expect(canonicalSource("data:;base64,QUJD")).toBe(
      canonicalSource("data:,ABC"),
    );
  });

  it("digests a 20 MB data URI in one pass: under 2 s and 32 MB of heap", () => {
    const base64 = `data:application/octet-stream;base64,${"QUJD".repeat(5_000_000)}`;
    const percent = `data:text/plain,${"%41".repeat(7_000_000)}`;
    const expected = [
      murmur3x86x128(ENCODER.encode("ABC".repeat(5_000_000))),
      murmur3x86x128(ENCODER.encode("A".repeat(7_000_000))),
    ].map((w) => w.map((x) => x.toString(16).padStart(8, "0")).join(""));
    [base64, percent].forEach((uri, i) => {
      expect(uri.length).toBeGreaterThanOrEqual(20_000_000);
      const heap = process.memoryUsage().heapUsed;
      const start = performance.now();
      const digest = canonicalSource(uri);
      const elapsed = performance.now() - start;
      const grown = process.memoryUsage().heapUsed - heap;
      // The same digest as hashing the decoded bytes whole.
      expect(digest).toMatch(new RegExp(`;murmur3-128=${expected[i]}$`));
      expect(elapsed).toBeLessThan(2000);
      // A concatenated string is flattened once (one copy); nothing more.
      expect(grown).toBeLessThan(32 * 1024 * 1024);
    });
  }, 30_000);
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

  it("reports one collision once, and clears it when a colliding draw leaves", () => {
    const { ids, reports } = table({ hash: () => 42n });
    const add = (index: number, first: number, name: string) => {
      ids.register(
        { index, generation: 1 },
        first,
        1,
        true,
        content(name),
        undefined,
      );
      ids.idOfSlot(first);
    };
    add(0, 1, "a.glb");
    add(1, 2, "b.glb");
    // a.glb's feature drawn a second time meets b.glb's the other way round.
    add(2, 3, "a.glb");
    expect(reports).toHaveLength(1);
    expect(ids.identify(42n)).toBeUndefined();
    // b.glb leaves: a.glb's key is the only one left, drawn twice.
    ids.unregister(1);
    expect(ids.collisions.has(42n)).toBe(false);
    expect(ids.identify(42n)!.key).toMatchObject({ content: "a.glb#n0/p0" });
    // One of a.glb's draws leaving keeps it identified.
    ids.unregister(0);
    expect(ids.identify(42n)!.key).toMatchObject({ content: "a.glb#n0/p0" });
    // b.glb back: the same collision again, not reported a second time.
    add(1, 4, "b.glb");
    expect(ids.collisions.get(42n)).toHaveLength(2);
    expect(ids.identify(42n)).toBeUndefined();
    expect(reports).toHaveLength(1);
  });

  it("keeps no credential, token or data URI payload in keys or messages", () => {
    const secret = /secret|token|pw|user|eyJ|%7B|\{/;
    const sources = [
      "https://user:secret@tiles.test/site/tileset.json?token=pw",
      "//user:secret@tiles.test/site/tileset.json?access_token=pw",
      "\\\\user:secret@tiles.test\\site\\tileset.json",
      "s3://key:secret@bucket/site/tileset.json",
      "custom:user:secret@site/tileset.json",
      "blob:https://user:secret@tiles.test/4d5e?token=pw",
      "site/tileset.json?token=pw#secret",
      "data:application/json;base64,eyJzZWNyZXQiOiJwdyJ9",
      'data:application/json;charset=utf-8,{"secret":"pw"}',
      " //user:secret@tiles.test/site/tileset.json",
      " https://user:secret@tiles.test/site/tileset.json",
      ' data:application/json,{"secret":"pw"}',
      "\t//user:secret@tiles.test/site/tileset.json",
      "https://user:secret@tiles.test/site/tileset.json\n",
      "https://user:pw?secret@tiles.test/site/tileset.json",
      "https://user:pw#secret@tiles.test/site/tileset.json",
      "https://user:pw/secret@tiles.test/site/tileset.json",
      "//user:pw?secret@tiles.test/site/tileset.json",
      "custom:user:pw?secret@site/tileset.json",
      "https:/user:secret@tiles.test/site/tileset.json",
      "https:\\user:secret@tiles.test/site/tileset.json",
      "https:user:secret@tiles.test/site/tileset.json",
      "https:/user:pw?secret@tiles.test/site/tileset.json",
    ];
    const { ids, reports } = table({ hash: () => 42n });
    sources.forEach((source, index) => {
      ids.register(
        { index, generation: 1 },
        index + 1,
        1,
        true,
        { ...content("a.glb"), source: canonicalSource(source) },
        undefined,
      );
      ids.idOfSlot(index + 1);
    });
    const keys = sources.map((_, i) => canonicalKey(ids.slot(i + 1)!.key));
    expect(reports.length).toBeGreaterThan(0);
    for (const text of [...keys, ...reports]) {
      expect(text).not.toMatch(secret);
    }
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
    // An empty set is "none": it hides the lower levels in its taxonomy.
    ids.setLabels(truck, "class", []);
    expect(ids.identify(truck)!.labels).toEqual({
      class: [],
      wikidata: ["Q42889"],
    });
    expect(ids.resolveSlots(Uint32Array.of(8)).semanticId[0]).toBe(0);
    // Undefined removes the host's set: the feature's own shows again.
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

  it("keeps the host's ids apart from derived ordinals", () => {
    const { ids } = table({});
    // A host id that looks like an ordinal is freed by its own release.
    expect(ids.claimItemKey("wall#12", "site")).toBe("wall#12");
    ids.releaseItemKey("wall#12");
    expect(ids.claimItemKey("wall#12", "site")).toBe("wall#12");
    // Releasing a host's "a#2" frees it, not the second derived "a".
    expect(ids.claimItemKey(undefined, "a")).toBe("a");
    expect(ids.claimItemKey("a#2", "site")).toBe("a#2");
    expect(ids.claimItemKey(undefined, "a")).toBe("a#3");
    ids.releaseItemKey("a#2");
    expect(() => ids.claimItemKey("a#3", "site")).toThrow(/its own/);
    expect(ids.claimItemKey("a#2", "site")).toBe("a#2");
    // A derived key the host's id holds is skipped, never shared.
    expect(() => ids.claimItemKey("a", "site")).toThrow(/its own/);
  });
});
