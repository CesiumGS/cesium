# Semantic metadata and picking (design, 2026-11-21)

**What this holds:** The design for CS-832. It covers how semantic metadata reaches the engine, how labels are keyed by taxonomy, and how they bind to CS-815's stable IDs. It says how picks, ID images and ray hits return them, and what "what did I pick?" means in Gaussian splats, point clouds and labeled or learned fields. It leaves room for per-feature embeddings and semantic search (CS-817). The owner answered CS-452 on 2026-11-21: design it now, with CS-815. CS-815 built the identity and label parts on 2026-11-22 (`packages/core/src/scene/identity.ts`): stable IDs, labels by taxonomy, `identify` and `setLabels`, and the IDs on picks and ray hits. The ID images (CS-813), fields and splats are not built.

**What it replaces.** The stub of 2026-11-08 ("For a later brainstorm: semantic metadata and picking"). Its question is answered below. The owner's 2026-11-08 framing stands: splats and point clouds have no surfaces, so a pick there may come from a learned or labeled field, not from a feature ID on a mesh.

**What it read.** Main at `d8029a6b41` for code. CS-552's design as merged into main at `41062e77ef` ([content-source-seam.md](content-source-seam.md)), which is the same text as its branch tip `8e88dcdb76`. The owner's answer to CS-841 (D1: render passes register, public from alpha.1). Items CS-452, CS-535, CS-802, CS-813, CS-814, CS-815, CS-816, CS-817 and CS-833. Outside specifications were not read again for this note: the USD, glTF and 3D Tiles names below are as remembered, and CS-815 checks each against its source when it builds.

**What to read first.** "Decisions for the owner" at the end, then "What a pick means without surfaces", then "What CS-815 and CS-813 must carry". The rest is detail.

## Where today's code stands

Paths are under `packages/core/src/`.

- **Feature IDs are a running counter.** Each draw takes a range of global feature IDs from `worldScene.nextFeatureId` (`scene/world/draws.ts:587`). So an ID depends on the order draws were added, and changes between runs. `World.feature(id)` binary-searches the ranges back to a draw and a local ID (`scene/World.ts:1768`).
- **glTF feature IDs are read, partly.** `io/features.ts` reads `EXT_mesh_features` feature IDs from vertex attributes and the legacy `_BATCHID`. Feature-ID textures and implicit IDs warn and are skipped. It reads `EXT_structural_metadata` property tables, including fixed-length arrays and enums. Variable-length arrays, property textures and property attributes are skipped, and so are external schemas.
- **3D Tiles metadata isn't read.** Tileset, group, tile and content metadata (3D Tiles 1.1, and `3DTILES_metadata` in 1.0) are CS-272's.
- **A pick returns a counter value, a name and properties.** `PickResult` is `{ featureId, name, properties, item }` (`scene/View.ts:95`). The pick pass writes the global feature ID and depth to one texel (`render/view/picks.ts`). Translucent terrain and the pick variant's pass can stand in for it.
- **Ray hits carry no feature.** `RayAnswer.hit` has `t`, a position, its reference frame, the target name and a time (`query/queries.ts:159`). The ray design names a feature in its hits ([ray-queries-where-they-run.md](ray-queries-where-they-run.md)), but nothing returns one yet.
- **No labels, no taxonomy, no ID images.** `OffscreenTarget.read()` returns color only. CS-813 adds render products.
- **The "splats" in today's code are point symbols,** rasterized in the cull pass and drawn opaque. There is no Gaussian-splat content yet.

## The model in one page

Three things, kept apart:

1. **Identity.** Every pickable thing has a `StableId`, derived from content or given by the host. It never depends on load order (CS-815).
2. **Labels.** Short, interned strings grouped by taxonomy: `{ class: ["car"], wikidata: ["Q1420"] }`. They mirror USD's `SemanticsLabelsAPI`, whose instance name is the taxonomy. Labels are what segmentation images and dataset tools read.
3. **Properties.** Everything else a feature carries: property tables, batch tables, USD attributes. Styling reads them. They are keyed by `StableId`, as CS-552 already says.

Labels are derived from properties or set directly. They are a separate, small table, because the GPU needs a label-set index per feature for every semantic image, and property tables are too large and too varied for that.

```ts
// Working names: the public API review (CS-102) names them.

/** CS-815 picks the encoding. This note asks only that it fits 64 bits (below). */
type StableId = bigint;

/** Taxonomy name to labels: `{ class: ["car"] }`. Labels in a taxonomy are a set. */
type Labels = Readonly<Record<string, readonly string[]>>;

/** What one ID resolves to. Picks resolve it for you; hits and images give the ID. */
interface Identified {
  readonly id: StableId;
  /** How the ID was made, so a consumer knows how far it is stable. */
  readonly key: StableKey;
  readonly labels: Labels;
  readonly properties?: Readonly<Record<string, FeatureValue>>;
  readonly item?: SceneItem;
}

/** One lookup for every contract: picks, hits and images all return IDs. */
interface Identity {
  identify(id: StableId, options?: { taxonomies?: readonly string[] }): Identified | undefined;
  /** Host labels by ID, kept across tile reloads like the edit layer's overrides. */
  setLabels(id: StableId, taxonomy: string, labels: readonly string[] | undefined): void;
}
```

## How metadata reaches the engine

Every path goes through CS-552's content-source seam. A source maps its own metadata into three things the seam already has room for: its `schema` (the properties a style can bind to), the stable ID on every row it writes to a sink, and, new here, a label-set index per taxonomy on every row. Sinks stay data-only, so this runs in workers and in worker mode unchanged.

**What a source declares, in its `schema`:**

```ts
interface FeatureSchema {
  // ...CS-552's properties, types and enums...
  /** How its IDs are made, and how far they hold (below). */
  readonly identity: IdentityDeclaration;
  /** The taxonomies it provides labels in, and where each comes from. */
  readonly taxonomies: readonly TaxonomyDeclaration[];
  /** Embedding spaces it carries vectors in (CS-817; may be empty). */
  readonly embeddings?: readonly EmbeddingSpace[];
}

interface IdentityDeclaration {
  /** "global": the same feature has one ID at every level and in every tile.
   *  "tile": the ID holds across reloads and runs, but a coarser tile's copy differs. */
  readonly scope: "global" | "tile";
  /** The property that names the feature, when there is one. */
  readonly property?: string;
}

interface TaxonomyDeclaration {
  readonly taxonomy: string;
  /** "labels": read directly (USD). "property": derived from a property's values. "host": set by the host. */
  readonly from: "labels" | "property" | "host";
  readonly property?: string;
}
```

**What each row carries, in every sink:** its `StableId`, and for each declared taxonomy a label-set index into a dictionary the source sends with the content. The engine interns those dictionaries into one per world. A label set is the sorted, de-duplicated labels of one taxonomy. Index 0 is "no label".

### 3D Tiles metadata

- **Levels.** 3D Tiles 1.1 metadata sits at the tileset, group, tile and content levels, and per feature through glTF. Each level's entity is a set of properties from the tileset's schema. CS-272 reads them. This note says where they go.
- **Inheritance.** Content, tile, group and tileset properties apply to every feature in the content, nearest level first. A property a feature has of its own wins. The source resolves this before it writes rows, so the engine sees one row per feature.
- **Identity.** A property whose semantic is `ID` in the 3D Metadata Semantic Reference names the feature. A source that finds one declares `scope: "global"`. A host can name another property, for example an element ID from a BIM export.
- **Labels.** No semantic in that reference names a class label, as far as this note knows. So a taxonomy comes from a property the host names (`{ taxonomy: "class", property: "classification" }`), or from a profile the tiles module ships for a known producer. Enum properties map to labels by their enum names.

### glTF `EXT_mesh_features` and `EXT_structural_metadata`

- **Feature IDs.** Each feature-ID set of a primitive is one identity space. The ID key is (content, feature-ID set index, feature ID). Today only the first attribute-backed set is read. CS-815 reads every set, and picks report which set an ID came from. Feature-ID textures and implicit IDs follow, in CS-272.
- **Which set identifies.** A primitive can carry several sets, for example one per building and one per window. The first set is the identity set unless the source or host names another. The others stay readable as properties: "the building this window is in".
- **Property tables** feed properties, labels and embeddings by the same mapping as 3D Tiles above. A property with the `ID` semantic makes the identity global.
- **Points and splats are glTF primitives too.** A `POINTS` primitive can carry `EXT_mesh_features` per vertex, so a point cloud or a splat set can have a feature per point, or per group of points. That is how labeled point clouds and labeled splats reach the engine without anything new (see "What a pick means without surfaces").
- **Legacy `b3dm` and `pnts` batch tables** map the same way, with `_BATCHID` as the one feature-ID set.

### USD `SemanticsLabelsAPI`

- **Direct mapping.** `SemanticsLabelsAPI` is a multiple-apply schema. Its instance name is the taxonomy, and its `semantics:labels:<instance>` attribute is a token array of labels. Each instance becomes one taxonomy, read as `from: "labels"`.
- **Inheritance.** A prim's labels in a taxonomy are its own, else its nearest ancestor's, as UsdSemantics' ancestor queries compute. The USD source resolves this on the composed stage and writes rows already resolved.
- **Identity.** The prim path names the feature, with the instance index for point instancers. Paths are stable across loads of the same stage, so a USD source declares `scope: "global"`. Variant selections that change a path change the ID, which is correct.
- **Time samples.** Labels can be time-sampled in USD. The first USD source reads the default time sample and refuses later samples by name, with a warning. The `identify` call is shaped to take a time later without a change.
- **The older Isaac Sim schema** (`SemanticsAPI` with `semanticType` and `semanticData`) maps to taxonomy `semanticType` with one label, for older SimReady assets. CS-833 checks whether its sample assets still use it.
- **How USD gets in at all** is CS-802 and CS-833's question. This mapping holds for any of their paths, including conversion to glTF, as long as the converter writes labels as properties and names the mapping.

### Host labels on scene items

- **On the item:** `world.add(content, { id: "truck-7", labels: { class: ["truck"] } })`. The `id` is the item's key (below). Labels on the item apply to everything it draws, in every taxonomy the content doesn't set itself.
- **On one feature:** `identity.setLabels(id, "class", ["damaged"])`. These are kept by `StableId` in the engine, like the edit layer's overrides (CS-831), and come back when a tile reloads. They win over everything.
- **On a content source a host writes:** the host's source declares its taxonomies and writes label indexes on its rows, like any source.

### Precedence

In each taxonomy, the nearest level that sets it wins: host per-feature labels, then the feature's own, then its content, tile, group or ancestor prim, then the scene item's. Sets aren't merged across levels. A wheel labeled "wheel" under a car labeled "car" is a wheel in `class`, which is what segmentation wants. A host that wants both uses two taxonomies.

## How labels are keyed by taxonomy

- **A taxonomy is a name; a label is a string in it.** The engine attaches no meaning to either. Examples: `class` (free class names), `wikidata` (Q-codes), `asprs` (LAS point classes, by their ASPRS names), `cityjson` (CityJSON object types).
- **Labels in one taxonomy are a set,** like USD's token array. Most features have one.
- **The default taxonomy** is the one a semantic image uses when none is named. This note proposes `class`, which is the instance name Omniverse Replicator uses by default. The name is a decision below.
- **Interning.** Label sets are interned per world into dense indexes, per taxonomy. The GPU keeps, per feature slot, one label-set index for each taxonomy a view asks for. That table is what the semantic image's resolve pass reads.
- **Pinned palettes.** A host making a dataset can pin a palette per taxonomy (`{ car: 1, truck: 2, ... }`) before content loads, as CARLA's fixed tag table does. Then semantic IDs are the same across runs and machines. Without a palette, indexes follow interning order, and every semantic image carries its map from index to label set.

## How labels bind to CS-815's stable IDs

An ID is a hash of a canonical key. The key is the binding: labels, properties, embeddings and edits are all looked up by the ID, and the key says how far the ID holds.

```ts
type StableKey =
  | { kind: "content"; item: string; source: string; content: string; set: number; feature: number }
  | { kind: "named"; item: string; source: string; name: string } // an ID property, or a USD prim path
  | { kind: "draw"; item: string; source: string; content: string } // content with no features
  | { kind: "host"; item: string; key: string }; // a host's own key
```

- **`item`** is the scene item's key: the host's `id` on `world.add`, or the content's source reference for the first item of a content that has none. One content placed twice gives two items, so the same building placed twice has two IDs. An instance image has to tell them apart. A second item of the same content without a host key gets an ordinal in the order added, with a warning that its IDs then depend on that order.
- **`source`** is the resolved asset's canonical reference: its URL without query tokens or credentials, or an ion asset ID and version. Session tokens never enter an ID.
- **`content`** is the tile's content URI relative to the tileset, or implicit tile coordinates, or a glTF file's node and primitive path.
- **The ID's scope follows its key.** A `named` key holds at every level of detail. A `content` key holds across reloads and runs of the same tile, but a coarser tile's copy of the same building has a different ID. Its source declares `scope: "tile"`, so a consumer knows. CS-552's "a declared mapping where an ID changes by level" is that declaration.
- **Collisions.** The engine keeps the key beside each hash it has seen. Two keys with one hash are reported as an error naming both, never merged silently.

## How picks, ID images and ray hits return them

All three return the same `StableId`. Only the pick resolves it for you, because it is one result. Hits and images can be large, so they return IDs, and `identify` (or an image's own maps) resolves them.

**Picks.** `PickResult` gains:

```ts
interface PickResult {
  readonly id: StableId;
  readonly labels: Labels; // every taxonomy, resolved by precedence
  readonly properties?: Readonly<Record<string, FeatureValue>>;
  readonly item?: SceneItem;
  readonly name?: string;
  /** Where it was hit, in a named reference frame, and how. */
  readonly position?: { readonly value: Float64Array; readonly frame: FrameKey };
  /** "surface", "point", "splat" or "field": how the answer was made (next section). */
  readonly basis: PickBasis;
  /** For splats and fields: how much of the pixel this answer explains, 0 to 1. */
  readonly coverage?: number;
  /** The point or splat, when the answer is one sample of many. */
  readonly sample?: { readonly index: number };
  /** The camera record (CS-814) and scene time (CS-816) it was made with. */
  readonly camera: CameraRecord;
  readonly time: SceneTime;
}
```

`featureId`, the counter value, leaves the public API. Inside, the GPU keeps a dense per-world slot per feature, as today. Slots are cheap to write in every pass, and a table maps each slot to its `StableId` and label-set indexes.

**ID images (CS-813).** The pick pass's ID target becomes a full-view product:

- The draw passes write slots, as the pick pass does today.
- A resolve pass maps slots to `instanceId` (the `StableId`) and to `semanticId` (the label-set index for the taxonomy asked for).
- `semanticId` takes a taxonomy, or the default one. Each readback carries its map from index to label set, and the palette it used.
- Pixels with nothing write 0 in both.

**Ray hits (CS-535).** `RayAnswer.hit` gains `id` and `basis`. A hit's `accuracy` already says how far it may be off. For points and splats it says more (next section). Labels are fetched with `identify`, so a batch of a million lidar rays carries IDs only.

## What a pick means without surfaces

Four kinds of content, four contracts each. Every cell is a defined answer or a refusal with a reason.

- **Points:** a point cloud.
- **Splats:** Gaussian splats, blended front to back.
- **Labeled field:** labels as a function of position, for example a semantic voxel grid.
- **Learned field:** a model's per-point or per-splat feature vectors, for example language-aligned embeddings.

| Contract              | Surfaces (meshes)       | Points                                                         | Splats                                                                         | Labeled field                                                       | Learned field                                        |
| --------------------- | ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Pick at a pixel       | Nearest surface's ID    | The point drawn at the pixel                                   | The splat where opacity crosses 0.5                                            | The field's labels at the pick's position                           | Refused as labels: offered as a vector (CS-817)      |
| `instanceId` image    | The surface's ID        | The point drawn there; 0 between points                        | As the pick, per pixel; 0 where opacity stays under 0.5                        | Refused: a field has no instances                                   | Refused: no instances                                |
| `semanticId` image    | Its label set           | The point's label set                                          | As the pick, per pixel                                                         | The field's labels at each pixel's depth, once the field is on GPU  | Refused until a module maps vectors to labels        |
| Ray hit               | The surface's ID        | Points as discs of their spacing; refused without a spacing    | Where opacity along the ray crosses 0.5, with its spread as accuracy           | Only if the field declares a density; otherwise rays skip it        | Skipped by rays, declared                            |

### Points

- **What a point is.** A point is a sample, not an entity. It has an identity of its own only when its content gives it a feature: an `EXT_mesh_features` set per point, a batch ID, or a classification mapped to labels. Without one, a pick names the content (`kind: "draw"`) and the point as `sample.index`, with `basis: "point"`.
- **Picks and ID images** take the point drawn at the pixel, nearest first, as today's point pass does. Between points nothing is drawn, so the image has 0 there. The image depends on point size, so the product records the point-size setting it used. It is a rendering of samples, and the docs say so.
- **Labels** come from per-point properties. LAS classification codes map to the `asprs` taxonomy by the ASPRS class names, through a profile in the point-cloud source.
- **Rays** never meet a zero-size point. So a ray tests each point as a disc facing the ray, with the content's declared point spacing as its radius, and reports that radius in `accuracy`. Content that declares no spacing, and has no geometric error to derive one from, gets `unknown` with reason `unsupported` and the note "point content declares no spacing". A guess would make the hit lie.
- **A sample index is stable only within its tile.** Point clouds are resampled per level, so the same physical spot is a different point in a finer tile. The key's `scope: "tile"` says so.

### Gaussian splats

- **What is at a pixel.** A pixel's color is many splats blended front to back. No single splat is "the" surface. This note defines the pick by the median rule that 3D Gaussian splatting uses for depth: walk the splats front to back, and take the first where the accumulated opacity reaches 0.5. That splat gives the ID, and its depth is the pick's depth. Pick and depth then always agree.
- **When nothing reaches 0.5,** the pixel has no answer: the pick returns nothing, and the images write 0. The splats there are a haze, not a thing.
- **Coverage.** The pick reports `coverage`: the share of the pixel's total blend weight that belongs to splats with the same ID. Low coverage means the answer is uncertain. It costs one more accumulation in the same pass. A detail query, `view.pickDetail(x, y, { top: k })`, returns the k IDs with the most blend weight at one pixel, for a host that wants the whole mix.
- **Identity per splat.** Splats are glTF points, so a splat set carries features through `EXT_mesh_features` like a point cloud: one feature per object, many splats each. A splat set without features names the content and the splat's index, as points do.
- **Determinism.** The answer depends on sort order. The sort breaks depth ties by slot, so the same scene gives the same IDs every time (CS-816). That is part of the splat renderer's contract.
- **Rays** evaluate each splat's peak opacity along the ray, sort those peaks by distance, and take the 0.5 crossing, as ray-traced splatting does. `accuracy` reports the spread: the distance between the 0.25 and 0.75 crossings. That spread is how fuzzy the hit is, and the hit never claims more. It needs an acceleration structure over the splats' ellipsoids, so until CS-535 builds one, rays skip splats, and the splat module declares that.
- **The splat module declares all of this.** CS-552's `RenderFeature` must declare whether it writes the ID target and whether it gives a ray adapter. The owner's answer to CS-841 makes that registration public from alpha.1. So these rules are part of the public contract of a pickable render feature: a third-party splat renderer that writes the ID target follows the 0.5 rule, or declares itself unpickable.
- **The glTF splat extensions** (`KHR_gaussian_splatting`, and SPZ compression in `KHR_spz_gaussian_splats_compression`) carry the splats. They were drafts when last read, and this note didn't recheck them.

### Labeled fields

- **What one is.** Labels as a function of position, not attached to items: a semantic voxel grid, an occupancy grid with classes, a segmentation baked into a volume. A module or host supplies it as a source whose output is a field.
- **A pick** first finds a position, from whatever surface, point or splat answered at the pixel. Then it samples the field there. It returns the field's labels with `basis: "field"`, and the field's confidence as `coverage` when the field has one. Where no other content gives a position, a field with a density can give one (below). Otherwise the pick has no position and returns nothing.
- **Instance images are refused:** a field has classes, not instances. The refusal names the content and says "fields carry no instances".
- **Semantic images** sample the field at each pixel's depth. That needs the field in a GPU form (a 3D texture or a sparse grid), so it waits for a module that supplies one. Until then it is refused by name.
- **Rays** use a field only if it declares a density, with the same 0.5 crossing rule as splats. Otherwise rays skip it, and the field declares that.

### Learned fields and embeddings

- **What one is.** A model's output per point, per splat or per feature: a vector, not a label. Examples are language-aligned splat features and per-building embeddings.
- **Picks don't turn vectors into labels.** That needs a model and a query, which the engine doesn't own. So a pick on such content returns the ID as usual, and the vector is available through the embedding store below. A module that maps vectors to labels (for example by nearest class prompt) writes host labels by ID, and from then on those labels behave like any other.
- **Instance and semantic images** follow from IDs and labels. A per-pixel embedding image is reserved as a product name, `embedding:<space>`, and refused until a module builds it.

## Room for embeddings and semantic search (CS-817)

The engine stores and searches vectors. It never computes them, and it commits to no model.

```ts
/** A named space: which model made the vectors, how long they are, how to compare them. */
interface EmbeddingSpace {
  readonly name: string; // the host's own name, for example "clip-vit-b32"
  readonly dimension: number;
  readonly metric: "cosine" | "dot" | "l2";
}

interface Embeddings {
  space(space: EmbeddingSpace): EmbeddingTable;
}

interface EmbeddingTable {
  set(id: StableId, vector: Float32Array): void;
  get(id: StableId): Float32Array | undefined;
  /** The k nearest IDs to a vector the host computed, optionally only those with some labels. */
  search(query: Float32Array, options: { k: number; labels?: Labels }): Promise<readonly { id: StableId; score: number }[]>;
}
```

- **Vectors come from three places:** a content property (a fixed-length `FLOAT32` array in `EXT_structural_metadata`, which `io/features.ts` already reads); per-point or per-splat attributes; or the host, by ID.
- **They are keyed by `StableId`,** so a search result is an ID that picks, images, styling and the edit layer all understand. Highlighting the results is a style that reads a per-feature score, written by ID.
- **A space name is the host's string.** The engine checks only the dimension and the metric. Text-to-vector belongs to the host or to a CS-817 module.
- **Alpha.1 reserves the types and the product name only.** Brute-force search is enough to start. An index can come later without an API change.

## What CS-815 and CS-813 must carry

**CS-815 (stable identity and labels) must carry:**

- the `StableKey` kinds above, including the item's key, and a hash of the key as the `StableId` that fits 64 bits;
- the source's canonical reference with credentials and query tokens removed;
- the identity declaration (`scope: "global"` or `"tile"`), with an `ID`-semantic property or a host-named property making a feature global;
- every `EXT_mesh_features` set read, with the identity set named, and picks reporting the set;
- collision detection between keys, reported and never merged;
- labels by taxonomy from `EXT_structural_metadata`, 3D Tiles metadata (through CS-272), USD `SemanticsLabelsAPI` (through CS-559), and the host, with the precedence above;
- per-world interning of label sets, and pinned palettes;
- `identify` and `setLabels`, with host labels kept across reloads;
- `PickResult` with `id`, `labels`, `basis`, `coverage`, `sample`, `camera` and `time`, and `featureId` removed from the public API;
- `id` and `basis` on ray hits. As built, a hit's slot is the one the pick pass writes for its triangle (`raycast.slang`'s `rayFeature`), and `parity/rayIds.ts` checks the two against each other on the GPU. Where two triangles meet the ray at one distance (within 4 ulps: a shared edge, coplanar faces), the hit takes the lowest pickable slot, and a triangle with nothing pickable never wins a tie. The pick pass keeps whichever fragment its depth test passes, which follows draw order, so at such a tie a pick and a hit can name different features;
- room for `embeddings` in the schema, even if empty.

**CS-813 (render products) must carry:**

- `instanceId` as the `StableId` itself, so pixel values match picks and hits exactly. That makes it 64 bits per pixel, not the 32 its done-when says today. This is the first decision below.
- `semanticId` per taxonomy, the default taxonomy when none is named, each readback carrying its index-to-label map and its palette;
- 0 for "nothing here" in both;
- the splat rule: ID and depth from the 0.5 opacity crossing, with depth ties broken by slot;
- the point-size setting recorded on images of point content;
- refusals by name for fields' instance images, and for semantic images of fields until a GPU form exists;
- `embedding:<space>` reserved and refused.

**Other items this lands on:** CS-272 (3D Tiles metadata, feature-ID textures, implicit IDs); CS-559 (USD's labels and prim paths); CS-535 (ray hits with IDs; splat rays need an acceleration structure over ellipsoids); the splat render feature (CS-552's `RenderFeature`, its pick and ray declarations); CS-833 (whether SimReady samples use the older Isaac schema).

## Settled here

- One identity, three consumers: picks, ID images and ray hits all return the same `StableId`.
- Labels are separate from properties, keyed by taxonomy, interned, and resolved by precedence before the GPU sees them.
- Metadata enters only through the content-source seam, as schema, IDs and label indexes on sink rows.
- The scene item is part of an ID.
- Points: a point is an entity only when its content says so. Rays test points as discs of their declared spacing, or refuse.
- Splats: the 0.5 opacity crossing names the pick, the depth and the ray hit, with coverage and spread reported. This rule is the recommendation in the second decision below.
- Fields: labels by position, no instances, rays only with a density.
- Embeddings: stored and searched by ID, never computed. The model is the host's.

## Decisions for the owner

Each goes back to the main session to file, with options and a recommendation.

1. **ID images: 64-bit stable IDs, or 32-bit indexes with a table?** CS-813 says `instanceId` is uint32. A hash that is stable across runs doesn't fit 32 bits without collisions in large scenes.
   - A. 64 bits: `instanceId` holds the `StableId`, as two 32-bit words per pixel. Pixel values match picks and hits, and match across runs and machines, with no table. It costs 8 bytes per pixel instead of 4. _Recommended:_ datasets and ground truth compare runs, which is why CS-815 exists.
   - B. 32 bits: a dense index per readback, with a table from index to `StableId`. It is half the size, and like Omniverse Replicator's maps, but every consumer has to join through the table.
2. **What a pick at a pixel names in Gaussian splats.**
   - A. The splat where opacity first reaches 0.5, with its coverage reported, and `pickDetail` for the full mix. Pick, depth and ray hit agree, and it is one pass. _Recommended._
   - B. The ID with the most blend weight at the pixel. It is closer to "what is most of this pixel", but it needs a histogram per pixel, and its depth no longer matches.
   - C. Both, chosen per call.
3. **The default taxonomy's name.**
   - A. `class`, as Omniverse Replicator uses by default. _Recommended._
   - B. No default: every semantic image must name its taxonomy.
4. **What alpha.1's seams reserve for fields and embeddings.**
   - A. The types and names only: field outputs in the content-source seam, `Embeddings` and `EmbeddingSpace`, and the `embedding:<space>` product, all refused by name until a module builds them. _Recommended:_ it keeps CS-817 possible without an API change, and commits to no model.
   - B. Nothing until CS-817's modules are committed.

## Risks

- **Hash collisions** at 64 bits are rare: for a million features in one world, the chance of any collision is about three in a hundred million. They are detected, not prevented.
- **Per-tile IDs surprise people.** A building in a 3D Tiles tileset without an `ID` property has a different ID at each level. The declaration says so, but a dataset tool that ignores it will count one building several times.
- **Splat picks cost one more accumulation** in the splat pass, and `pickDetail` a small pass of its own. Measure both in Dyno when the splat renderer exists.
- **Outside names were not reread** for this note. CS-815 checks the 3D Metadata Semantic Reference, UsdSemantics and the glTF splat extensions before it builds.
