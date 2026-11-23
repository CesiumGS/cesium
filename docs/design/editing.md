# Editing back through the seams (design, 2026-11-21)

**What this holds:** The design of the write path for CS-831: how an edit made in a 2.0-based application gets back to where its content came from, through every content seam, so that collaborative editing works wherever a source supports it. It covers write capabilities, the edit layer, change sets, commits and conflicts, the change feed in, and each source's way back. Built in CS-847 (`packages/core/src/source/editing.ts` and `editLayer.ts`, experimental API): "What the seam must carry in alpha.1" (S1 to S8; S9 and S10 belong to CS-815 and CS-809), with change sets extended per decision 1 (CS-861), the 0.x JSON form per decision 2 (CS-862), and the edit layer's hide, replace and insert per decision 5 (CS-865). Since CS-957 A and CS-952 A, the edit layer is keyed by feature ID (the same in every item of a content), and each change-set op names its feature by the source's own key with the feature ID beside it (JSON version 0.2.0; [content-source-seam.md](content-source-seam.md), "As built"), where the sketches below still show `id: StableId`. Hiding one feature inside a batched tile draw waits for the per-feature visibility bit (CS-554). Sessions, writers and presence are not built.

**What it builds on.** CS-552's design, [content-source-seam.md](content-source-seam.md), read on branch `hitld/CS-552-content-source-seam` at `8e88dcdb76` (not yet on main when this was written). Its section "Room for editing (CS-831)" put three things in alpha.1: the capability declaration, the override contract and the `ChangeSet` type. This note fills them in and names what they must carry. It also read CS-809's fetch provider on `hitld/CS-809-fetch-provider` at `58561a693d`, and the items CS-808, CS-815, CS-832, CS-306, CS-663 and CS-825 on main at `026520244f`.

**What it supersedes.** The stub this file held since 2026-11-13. Its two questions are kept below, and this note answers the vector and GIS one. The CAD and B-rep half stays with [breps-and-geometry-queries.md](breps-and-geometry-queries.md), "Editing", which uses the same edit layer.

**What to read first.** "The write path in one page", then "Decisions for the owner" at the end. "What the seam must carry in alpha.1" is the checklist for CS-552's interface. The rest is detail.

## The questions

**The owner, 2026-11-21:** "how might we push data edited in a 2.0-based application back to the database? or for 3d tiles? or any other content source. so we could enable collaborative editing of these content sources when they support that."

**Editing (owner, 2026-11-08).** Editing use cases, and how the engine can efficiently support things like CAD-style mesh editing or b-rep-based solid modeling. Today's content is streamed, immutable and tiled, so questions include how edited geometry coexists with tiles, how often buffers change, and where a modeling kernel would sit relative to the engine's seams. Related: geometry submission and per-draw constants (the seams), snapping and measurement, the later tessellation engine ([bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md)), and design space (plan 5f).

**Vector data and GIS sources (owner, 2026-11-08).** Part of the same brainstorm, for the vector rendering engine. Vector data commonly comes from databases such as PostGIS and similar. How would editing vectors interact with the engine, with ion and with 3D Tiles? The same question applies to MVT servers that stream, to WMS, and to the other common GIS streaming protocols: which of them the engine should read, what happens to an edit when the data is tiled or served by someone else, and how updates reach a view that's already drawing them.

## The write path in one page

An edit is drawn at once, held as plain data, sent to the source that owns the data, and confirmed or refused by it. Others' edits come back the same way.

| Step                 | What happens                                                                                           | Where                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1. Edit              | The application changes a feature (a drag, a property, a new point). The engine models nothing.        | The application                                            |
| 2. Draw at once      | The edit layer overrides the streamed feature by stable ID: hide, replace or insert.                   | Core: the edit layer, between sinks and renderer           |
| 3. Record            | The edit goes into an edit session's open change set: plain data, undoable, serializable.              | Core types; the session is a module                        |
| 4. Commit            | The session sends the change set, with the version it was made against, to the source's writer.        | `ContentSource.writer`, one per source kind                |
| 5. Transport         | The writer speaks the source's protocol through the fetch provider, which holds the credentials.       | CS-809's provider; a server, never a database              |
| 6. Confirm or refuse | The source applies it and returns a new version, or returns typed conflicts. Never a silent overwrite. | `CommitResult`                                             |
| 7. Settle            | Confirmed overrides stay until the source's own content carries the new version, then drop.            | The edit layer, on `invalidate` or `features`              |
| 8. Others' edits     | The source pushes others' change sets or invalidations. Local drafts rebase over them.                 | CS-552's push, `host.changed`                              |
| 9. Presence          | Others' selections, cursors and drags arrive on the application's channel and draw as overlays.        | Hooks on the edit layer; the protocol is the application's |

**Three rules hold everywhere:**

- **A source that can't write says so,** and the edit stays local: the application can keep it, export it as a change set, or drop it. The engine never pretends an edit reached a source.
- **The authoritative source is written, not its derived products.** Tiles, MVT and rendered images are derived. An edit goes to the feature service, the database's server, the iModel or the USD layer behind them, and the derived product catches up by invalidation.
- **The engine picks no collaboration algorithm.** Optimistic concurrency, locks, server-side rebasing and CRDTs all sit behind the same writer and the same change sets.

## Write capabilities

Each source declares what it can write in `SourceCapabilities.write`. Every alpha.1 source declares `READ_ONLY`.

```ts
// Working names: the public API review (CS-102) names them.
interface WriteCapabilities {
  readonly update: boolean;
  readonly insert: boolean;
  readonly delete: boolean;
  /** How a stale edit is detected: a version per feature, one per source, or none. */
  readonly versioned: "feature" | "source" | false;
  /** A change set applies whole or not at all. */
  readonly transactions: boolean;
  /** It pushes others' changes (`features` or `invalidate`), so they show without a reload. */
  readonly live: boolean;
  /** It merges concurrent edits itself (a CRDT, a rebasing service): a stale base never conflicts. */
  readonly merges: boolean;
  /** Edits reach its content later, after a rebuild such as re-tiling. */
  readonly deferred: boolean;
  /** The properties it lets an edit change, when not all; and whether geometry is editable. */
  readonly editable?: {
    readonly geometry: boolean;
    readonly properties?: readonly string[];
  };
}

const READ_ONLY: WriteCapabilities = {
  update: false,
  insert: false,
  delete: false,
  versioned: false,
  transactions: false,
  live: false,
  merges: false,
  deferred: false,
};
```

- **Capabilities are a hint for the interface, not authority.** The server decides what this user may write. A writer that's refused returns a `forbidden` conflict, so an interface that offered an edit can say why it failed. A source may narrow its capabilities once it knows the user (after a service's capabilities document is read), never widen them past what its kind supports.
- **`live` without writes** is valid: a read-only source whose upstream changes, such as a re-tiled tileset or a feature service others edit.
- **`deferred`** is 3D Tiles' case: the commit succeeds upstream, and the tiles show it only after they're rebuilt. The edit layer keeps the override until then.

## The edit layer

The engine keeps one edit layer per content, between the sinks and the renderer. Every scene item of that content shows the same edits. Sources never see it.

**Overrides by stable ID.** Three kinds, keyed by CS-815's stable IDs:

- **hide** an ID: every tile, level and draw that holds the feature stops drawing it. In batched tile content this is a per-feature visibility bit read by the shaders, which 3D Tiles styling's `show` already needs.
- **replace** an ID: hide it, and draw the edited version as live content from the layer's own small buffers, not by rewriting tile buffers.
- **insert** a new ID: draw it as live content.

When a tile loads or reloads, the edit layer applies its overrides to what the tile brings, so an edit survives streaming, eviction and a change of level. CS-306's B-rep overrides are the same mechanism with face-granular replacements.

**Four tiers, in drawing order,** strongest last:

1. **Base:** what the source streams.
2. **Pending:** committed by this client, not yet confirmed or not yet visible in the source's own content.
3. **Drafts:** edits in an open session, not yet committed.
4. **Transient:** a drag preview, redrawn each tick and never recorded, as the B-rep design's "drag previews" are.

Remote peers' drags draw in the transient tier too, marked with their peer (see "Presence").

**Queries see the edit.** Picks, rays, heights, clamping, snapping and measurement run over the layer's result, not the base, so a moved feature is picked where it's drawn. A query can skip the IDs being dragged, as the B-rep design asks.

**Buffers change at three rates.** Transient geometry every tick while a drag lasts, in a small buffer of its own. Drafts and pending edits at human rate, in the layer's live buffers. Incoming feeds in batches, applied in the apply phase under the tick's budget. Tile buffers are never rewritten for an edit; they're hidden by bit and rebuilt only when the source's content changes.

**When an override drops.** A pending override drops when the source's content carries a version at or past the commit's version: a `features` push with that change set's ID, or an `invalidate` whose version covers it, after the reloaded tiles have arrived. Until then the user sees their edit, not the stale tile. If the source never confirms, the override stays pending and the session reports it.

**What the IDs must be.** An editable feature needs the source's own identity, not only one derived from where it was loaded:

- **Content-derived IDs** (source, content key, feature-ID set, feature ID) can differ for one feature across tiles and levels. CS-552's override contract allows "a declared mapping where an ID changes by level". For a writable source that mapping is required: each tile's feature must name its **source key**, the key the writer sends (a primary key, an `ElementId`, a prim path, a GeoJSON `id`).
- **Inserted features** get a provisional ID made by the client. The commit's result maps provisional IDs to the source's keys, and the layer re-keys its overrides.

CS-815 decides the encoding. It must carry the source key and the provisional ID; see "What the seam must carry in alpha.1".

## Change sets

A change set is plain data: a list of operations on features, with the version it was made against. It can be serialized, undone, redone, replayed and sent. CS-552's type is the start; this note extends it.

```ts
interface ChangeSet {
  readonly id: string; // unique; also the idempotency key and the echo filter
  readonly source: string; // the content's ID
  readonly base?: string; // the source version it was made against
  readonly ops: readonly ChangeOp[];
  readonly meta?: {
    readonly author?: string;
    readonly time?: string;
    readonly note?: string;
  };
}

type ChangeOp =
  | { op: "insert"; id: StableId; feature: FeatureData }
  | {
      op: "update";
      id: StableId;
      base?: string;
      patch: FeaturePatch;
      before?: FeaturePatch;
      overwrite?: true;
    }
  | {
      op: "delete";
      id: StableId;
      base?: string;
      before?: FeatureData;
      overwrite?: true;
    };

/** Only what changed: properties set or removed, and the geometry if it changed. */
interface FeaturePatch {
  readonly properties?: Readonly<Record<string, PlainValue | null>>;
  readonly geometry?: GeometryData;
}

interface FeatureData {
  readonly properties?: Readonly<Record<string, PlainValue>>;
  readonly geometry?: GeometryData;
}

/** Coordinates in a named CRS, in double precision. Never render-space coordinates. */
interface GeometryData {
  readonly crs: string; // "EPSG:4979", "EPSG:4978", or the source's CRS
  readonly type:
    | "Point"
    | "LineString"
    | "Polygon"
    | "MultiPoint"
    | "MultiLineString"
    | "MultiPolygon"
    | "Mesh";
  readonly coordinates: unknown; // GeoJSON's nesting for vector types; a mesh's arrays for "Mesh"
}
```

**Why updates are patches.** Two people who change different properties of one feature don't conflict, and the writer can send only what changed (OGC API Features' `PATCH`, WFS-T's `Update` with named properties). A whole-feature `after` loses that. This changes CS-552's type, so it's decision 1 below.

**Why geometry names its CRS.** Edits are made in the engine's coordinates, but a writer sends the source's. The change set holds doubles in a named CRS, and the writer converts with `/proj`. Render-space float coordinates would lose precision and tie the change set to one render root.

**Undo and redo** are local and per session. The inverse of an operation comes from its `before`: an insert's inverse is a delete, an update's is the patch of `before`, a delete's is an insert of `before`. Undoing a committed change set commits its inverse as a new change set. The source's history is never rewritten. If someone else changed the feature since, the inverse conflicts like any other edit.

**Replay** applies change sets in order to a base version. It's how a session restores drafts after a reload, how tests check a writer against a fixture, and how a feed is reproduced in stepped mode (CS-816).

**Serialized form.** JSON, tagged with a format name and version. It is a file format others may write, so its stability is decision 2 below.

## Commits and conflicts

```ts
interface SourceWriter {
  commit(
    changes: ChangeSet,
    init: { signal?: AbortSignal },
  ): Promise<CommitResult>;
  /** The current versions of these features, to rebase on or to learn whether a lost commit landed. */
  read?(
    ids: readonly StableId[],
    init: { signal?: AbortSignal },
  ): Promise<readonly FeatureVersion[]>;
}

interface FeatureVersion {
  readonly id: StableId;
  readonly version?: string;
  readonly feature?: FeatureData; // absent: deleted, or never existed
}

type CommitResult =
  | { ok: true; version: string; ids?: Readonly<Record<string, StableId>> }
  | {
      ok: "partial";
      version: string;
      applied: readonly number[];
      conflicts: readonly Conflict[];
      ids?: Readonly<Record<string, StableId>>;
    }
  | { ok: false; conflicts: readonly Conflict[] };

interface Conflict {
  readonly id: StableId; // the feature
  readonly kind: "changed" | "deleted" | "exists" | "forbidden" | "invalid";
  readonly op: number; // index into the change set's ops
  readonly mine: ChangeOp;
  readonly base?: FeatureVersion; // what mine was made against
  readonly theirs?: FeatureVersion; // what the source holds now
  readonly reason?: string; // the server's words, without user data or credentials
}
```

**Optimistic concurrency by default.** Each update and delete carries the version it was made against: the feature's own (`versioned: "feature"`), or the change set's `base` (`versioned: "source"`). The writer sends it the way the protocol checks it: `If-Match` with an entity tag, a version column compared on the server, a changeset index. A stale version comes back as a `changed` or `deleted` conflict naming the feature, my operation, the base and theirs.

**Sources without versions.** With `versioned: false`, the writer compares each operation's `before` with what the source holds now (`read`, then commit), inside a transaction where it has one. Without a transaction it says so: a check, then a write, has a window. It never writes over a value it didn't check.

**Last writer wins only when asked.** An operation with `overwrite: true` skips the check. The application sets it per operation, after a person chose it in a conflict's interface. It's recorded in the change set, so it's never silent.

**Transactions.** With `transactions: true` a change set applies whole or not at all, and the result is `true` or `false`. Without, the writer applies what it can and returns `partial`, with the indexes applied and the conflicts for the rest.

**Resolving is the application's.** The engine gives a helper: a three-way merge per property, from base, mine and theirs. Properties only one side changed merge; one both changed stays a conflict for the person to choose. The edit layer marks conflicted features so the application can style them.

**Failures aren't conflicts.** A network error, a timeout or a 5xx leaves a non-idempotent commit's outcome unknown. So:

- the change set's `id` goes as an idempotency key where the server takes one;
- otherwise the writer calls `read` on the change set's IDs to learn whether it landed, before anything retries;
- the fetch provider never retries a write by itself, except once after a 401, which means it wasn't applied (CS-809 already renews and retries then).

## The change feed in

A `live` source calls `host.changed(change)` with CS-552's push kinds:

- **`features`** carries a change set someone else committed. The base tier updates under the drafts.
- **`invalidate`** carries content keys or a region and a version: derived content (tiles, MVT) was rebuilt, so the engine drops and selects again.

**Rebasing drafts.** When a feed changes a feature with a draft on it, the session rebases the draft: the three-way merge above, at once rather than at commit. What doesn't merge is marked conflicted before the person commits, which is the better time to learn it.

**Echoes.** A source's feed brings this client's own commits back. The session matches them by change set `id` and drops its pending override instead of applying the change twice.

**Transport is the source's,** through the fetch provider: a WebSocket, server-sent events, or a host's channel, under the same proxies and credentials. CS-809 has no streams yet; CS-552's decision 4 recommends adding `connect` in a follow-up. A server with no push at all is decision 3 below.

**Feeds are data, never trusted.** A feed's change sets are checked against the source's schema and size limits before they're applied, and a malformed one is dropped and reported. A feed can't make the engine run code.

## Presence

Collaboration needs to show who is doing what: others' selections, cursors, in-progress drags and viewpoints. Presence is ephemeral and isn't content, so it doesn't go through the source and isn't a change set.

- **The application owns the channel:** a CRDT's awareness protocol, a WebSocket, a collaboration service.
- **The engine gives hooks that take plain data:** a peer's selection as stable IDs with a color, a cursor as a position in a named reference frame, a drag as transient overrides marked with the peer, a viewpoint as a camera record (CS-814). The edit layer draws them as overlays.
- **No presence type is in the seam.** The hooks are a module, after alpha.1.

## Security

- **Credentials live in CS-809's fetch provider:** its renewable `Credential`, its origin rules and its proxy. A writer gets them only by making requests through `host.fetch`, as every read does.
- **A browser never writes to a database directly.** It doesn't hold the database's credentials, and it doesn't speak a database protocol. Writes go to a server the application names, which authorizes each user and each write. The engine's capability flags never stand in for that.
- **Change sets carry user data.** They're never logged with their values, and a conflict's `reason` carries the server's words without feature data or credentials. The author in `meta` is the application's claim; a server stamps the author from the user it authenticated.
- **Drafts kept across reloads are the application's to store,** and so is the protection of user data at rest.
- **Engine reference data can't be written.** A writable data-resource provider refuses names the engine pins (PROJ grids, frames data, sky packs, decoders).
- **No example holds a token.** Examples take theirs from Dyno's token setting, as every example does.

## How each source's edits get back

| Source                           | Way back                                                                            | Concurrency                                           | Feed in                                              |
| -------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| PostGIS                          | A server: OGC API Features Part 4, WFS-T, or a host API                             | A version column or entity tag, checked by the server | The server's push, from the database's notifications |
| 3D Tiles                         | Overrides now; then the upstream source, and re-tiling                              | The upstream's                                        | `invalidate` with the tileset's version              |
| Esri feature services            | `applyEdits`                                                                        | The service's; edit sessions where it has them        | The service's, where it has one                      |
| iTwin                            | A host backend that applies elements and pushes a changeset                         | Changesets: rebase on pull, or locks                  | New changesets                                       |
| USD                              | Opinions in an edit-target layer, saved through a file or a host                    | The layer's version                                   | The host's live layers, where it has them            |
| Files                            | A writable data-resource provider                                                   | The file's entity tag or hash                         | None, or the host's                                  |
| Application layers               | The application's store: a CRDT, a server, or memory                                | The application's; a CRDT merges                      | The application's                                    |
| MVT, WMS, WMTS, imagery, terrain | Can't: derived or raster. Edits stay local, or go to the feature source behind them | none                                                  | `invalidate`, where the server says                  |

### PostGIS

**Never directly from a browser.** The browser has no business holding database credentials, and it can't speak the database's wire protocol anyway. PostGIS already loads through a server the application names (CS-663, CS-825), and writes go to the same kind of server.

Three ways, one writer interface:

- **OGC API Features Part 4** (Create, Replace, Update, Delete): `POST` to a collection's items, and `PUT`, `PATCH` and `DELETE` on an item. Optimistic concurrency through entity tags and `If-Match`, where the server supports them. Part 4's status and which servers implement it (and with entity tags) weren't checked for this note; the writer's item checks them before building. This is the recommended first writer, since the read side is OGC API Features too.
- **WFS-T:** a `Transaction` with `Insert`, `Update` and `Delete`, atomic per request, and `LockFeature` for locks. Mature and widely served. It has no standard version check, so the writer compares `before` values inside the transaction (a filter on the checked properties' values), or uses a version column the server exposes.
- **A host API:** the application's own endpoint. The writer is the application's module, on the same interface.

**Versions** come from the table: a version or timestamp column the server compares, or the server's entity tags. **The feed** comes from the server: the database's notifications or logical replication, turned into change sets and pushed to clients. The engine never sees the database.

**When the features are also tiled** (vector tiles from the same table), a commit invalidates the tiles that cover the feature's old and new bounds at every level. The edit layer keeps the override until those tiles reload.

### 3D Tiles

Tiles are a derived product. Nothing writes into tile files.

- **Now:** overrides in the edit layer. Hide a feature by stable ID across every tile that holds it, and draw its edited version as live content. This is CS-306's design for B-rep tiles, and it works for any 3D Tiles content with feature IDs.
- **Then: edit the source and re-tile.** A tileset names its upstream: the feature service, database, iModel, B-rep model or other authoritative data it was built from, as an asset reference in the tiles kind's options. The tiles source's writer forwards change sets to the upstream source's writer. Its capabilities are the upstream's, with `deferred: true`. Each tile's feature names its source key through its metadata (CS-832 says how), so an override maps to the upstream's feature.
- **Version invalidation.** After re-tiling, the tileset's version changes: its JSON's `asset.tilesetVersion`, or the entity tags of its JSON and changed tiles. The tiles source pushes `invalidate` with the changed content keys, or a region when the tiler gives no list, and the version. The engine reloads those tiles. Overrides whose commit the version covers drop when the reloaded tiles arrive, so there's no flash of the old feature.
- **Without an upstream,** a tileset is read-only. Its overrides stay local and can be exported as a change set.

Who re-tiles, and when, is the tiler's: ion, the B-rep tiler (CS-305), a host's pipeline. The engine only learns of it through the version.

### Esri feature services

A feature source with `applyEdits` (adds, updates, deletes, by object ID or global ID), atomic when the service rolls back on failure. Branch-versioned services and edit sessions give versions to check. It's CS-558's second kind, and its writer is a module after the reader.

### iTwin

An iModel's history is a sequence of changesets. Writing means applying element changes in a briefcase and pushing a changeset, which a backend running the iTwin libraries does, not a browser on its own.

- **The writer calls a host backend,** through the fetch provider, which applies the change set's operations to elements and pushes a changeset.
- **Concurrency is iTwin's:** a push rebases on changesets pulled since, or the backend takes locks first. What can't be rebased comes back as conflicts on element IDs.
- **The stable ID** is the iModel's and the element's ID. The resolver for iTwin (CS-552's second resolver) gives the iModel.
- **The feed** is new changesets: `features` for element property changes, `invalidate` for the tile trees they change.

How much iTwin's own libraries already do on that backend, and what an engine writer adds, is for the iTwin writer's item to read and say.

### USD

A USD stage is composed from layers, and an edit is an opinion written into a layer that the edit target names. That fits the edit layer closely: the engine's overrides are like a session layer over the stage.

- **Write-back** turns a change set into opinions (`over` prims with changed attributes, new prims, deactivated prims for deletes) in a named layer, and saves that layer through a file writer or a host. Text layers (`usda`) are easiest to write.
- **The stable ID** is the prim path in the stage. A rename or reparent changes it, so a writer treats those as delete and insert.
- **Concurrency** is the layer file's version, checked on save, or a collaboration host's live layers that merge deltas.
- **It depends on the USD runtime** (CS-552's decision 3, CS-559). A subset reader can write override layers. Writing doesn't change which runtime is chosen.

### Files

A whole source (GeoJSON, CZML, KML, a glTF's extras) writes through a writable data-resource provider. CS-808's provider reads only, so writing is a separate interface beside it, after alpha.1:

```ts
interface WritableDataResource {
  /** The resource's version: an entity tag, a hash, a modification stamp. */
  stat(
    name: string,
    init: { signal?: AbortSignal },
  ): Promise<{ version: string }>;
  write(
    name: string,
    bytes: Uint8Array,
    init: { ifMatch?: string; signal?: AbortSignal },
  ): Promise<{ version: string }>;
}
```

- **Hosts supply it:** the File System Access API, the origin-private file system, a host's storage API, or Node's file system.
- **The source kind serializes the whole file** and writes it with `ifMatch` on the version it read. A stale version is a conflict on the file. A kind with feature IDs (GeoJSON's `id`) may re-read, merge by feature and write again, and then conflicts name features.
- **Engine reference data is refused** (see "Security").

### Application layers

Content the application makes and owns: annotations, markups, planning features. Its store is the application's choice: a CRDT document (Yjs, Automerge), its own server, or memory.

- **A CRDT sits behind the same change sets.** An adapter source maps change sets to the CRDT's operations (a map per feature, a key per property) and the CRDT's updates back to `features` pushes. Its capabilities say `merges: true`, so a commit never conflicts on a stale base.
- **A CRDT's merge is its own policy.** A property both sides changed resolves by the CRDT's rule, often the last writer. The application chose that when it chose the CRDT, and `merges: true` tells the interface so.
- **The engine picks no algorithm** and ships none. An example (below) uses one, behind this interface.

### Sources that can't write

MVT, WMS and WMTS, imagery and terrain are derived or raster products. An edit to what they show either goes to the feature source behind them, when the application knows one, or stays local. Terrain edits (flattening, cut and fill) are overrides in the edit layer, not write-back. A server that rebuilds its tiles can still push `invalidate`, so a view follows others' edits.

## What the seam must carry in alpha.1

This is the checklist for CS-552's interface before it freezes. Each line is a type or a rule; nothing here needs a writer built.

**In `ContentSource` and its types:**

- **S1.** `SourceCapabilities.write: WriteCapabilities`, with the fields above, and the `READ_ONLY` constant.
- **S2.** `ContentSource.writer?: SourceWriter`, with `commit` and the optional `read`.
- **S3.** The change-set types: `ChangeSet` with `id` and `base`; `ChangeOp` with per-operation `base`, patch updates and `overwrite`; `FeaturePatch`, `FeatureData` and `GeometryData` with a named CRS.
- **S4.** `CommitResult` with `partial`, the provisional-ID map `ids`, and `Conflict` with its kinds, the operation's index, `mine`, `base` and `theirs`.
- **S5.** `SourceChange` with `features` (a change set) and `invalidate` (keys or region, and a version), as CS-552 has it, and one more rule: the union is open, and the engine ignores kinds it doesn't know, so presence or later kinds can be added without breaking sources.

**In the override contract:**

- **S6.** Sinks key everything by stable ID, and sources never see overrides (CS-552 has this).
- **S7.** A writable source's features name their source key in every tile and level; the declared mapping is required, not optional, when `write` isn't `READ_ONLY`.
- **S8.** Queries run over the edit layer's result.

**In the seams underneath:**

- **S9.** **CS-815** carries the source key and a provisional-ID form for inserts in its encoding.
- **S10.** **CS-809** needs, for writers, a request method and body, a `"write"` request kind, and the rule that it never retries a write except once after a 401. Its provider today makes reads only. This and CS-552's `connect` for streams can be one follow-up item after CS-809 merges.
- **S11.** **CS-808** needs nothing in alpha.1; the writable interface sits beside it later, so `read` doesn't widen.

**Later, as modules:** the edit layer's public API, edit sessions and undo, the merge helper, each writer, the writable data-resource provider, presence hooks, and the CRDT adapter. The edit layer's hide, replace and insert are core, because queries and picks must see them, but their public API can sit in the experimental tier until the first writer uses them.

## CS-453's vector and GIS half

This note proposes the answer, for the owner to take or send back (decision 4):

- **Which GIS protocols the engine reads** is CS-552's list: MVT, Esri's services, WMS and WMTS through the imagery provider (CS-810), OGC API Features, and PostGIS through a server.
- **How edited vectors coexist with tiles:** as overrides by stable ID in the edit layer, until the tiled source's own content carries the edit's version.
- **What happens to an edit when the data is tiled or served by someone else:** it goes to the authoritative source's writer (the feature service or database server behind the tiles). When there is none, or the service won't accept it, the edit stays local, and the application can keep or export it. The engine never pretends it reached the source.
- **How updates reach a view that's already drawing them:** through the change feed (`features`) and invalidation (`invalidate`), pushed by the source, applied in the apply phase. Nothing in the engine polls.
- **How often buffers change:** a drag's preview every tick in its own small buffer; drafts and commits at human rate in the edit layer's buffers; feeds in batches under the tick's budget; tile buffers never rewritten for an edit.
- **With ion:** ion is a resolver and credential provider (CS-269), not a writer. An ion-hosted tileset with an upstream the application can write gets the 3D Tiles path above. Whether ion offers re-tiling on edit is ion's roadmap, not the engine's.

The CAD and B-rep half stays with the B-rep work ([breps-and-geometry-queries.md](breps-and-geometry-queries.md)).

## Follow-up items

Proposed, for the main session to file. Each needs CS-552's core unless it says otherwise.

| Title                                                                                                     | Kind     | Needs                                     |
| --------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| The edit layer: hide, replace and insert by stable ID, re-applied on reload, seen by queries              | work     | CS-552's core, CS-815                     |
| Edit sessions: change sets, undo and redo, replay, the per-property merge and rebasing on a feed          | work     | the edit layer                            |
| CS-809's provider makes writes and opens streams: method, body, a write kind, no write retries, `connect` | work     | CS-809                                    |
| An OGC API Features source and Part 4 writer, checked against the standard's status and two servers       | work     | edit sessions, CS-809's follow-up, CS-663 |
| Example (CS-830): collaborative PostGIS editing                                                           | work     | the Part 4 writer, CS-825                 |
| 3D Tiles: an upstream writer and version invalidation, with overrides dropped on reload                   | work     | edit sessions, CS-306                     |
| A writable data-resource provider, and GeoJSON written back through it                                    | work     | CS-808, edit sessions                     |
| Presence hooks on the edit layer                                                                          | work     | the edit layer                            |
| Example (CS-830): an application layer edited together through a CRDT, behind the change-set interface    | work     | edit sessions                             |
| A WFS-T writer                                                                                            | proposed | the Part 4 writer                         |
| An Esri `applyEdits` writer                                                                               | proposed | CS-558's feature services                 |
| An iTwin writer through a host backend: what iTwin's libraries do, and what the writer adds               | proposed | edit sessions                             |
| A USD layer writer                                                                                        | proposed | CS-559's runtime                          |

**The collaborative PostGIS example,** for CS-830. Two browser views, side by side or in two profiles, edit the same small fixture database through a local server that speaks OGC API Features Part 4 and pushes changes. One moves a feature and the other sees it move. Both change one property at once, and the second commit shows a conflict naming the feature, both versions and both people's values, with a choice of which to keep. Undo and redo work across a commit. The page shows each view's drafts, pending commits and the feed. It runs on the executor's own server with no outside service, and holds no token. It builds on CS-825's read-only example.

## Settled here

- **The authoritative source is written,** never a derived product; derived products follow by versioned invalidation.
- **A browser never writes to a database directly;** writes go through a server, with credentials in CS-809's provider.
- **The edit layer is core,** between sinks and renderer, with four tiers, and queries run over its result.
- **Optimistic concurrency by default,** with typed conflicts that name the feature and both versions. An overwrite is an explicit, recorded choice.
- **Undo commits an inverse;** a source's history is never rewritten.
- **The engine picks no collaboration algorithm;** a CRDT is an adapter behind the same change sets.
- **Presence is the application's channel,** drawn through hooks, outside the content seam.

## Decisions for the owner

Each goes back to the main session to file, with options and a recommendation.

1. **The alpha.1 change-set type.** CS-552's type has whole-feature `after` values, one result shape and no provisional IDs. It freezes in alpha.1.
   - A. Extend it as "Change sets" and "Commits and conflicts" show: patch updates, per-operation versions, an explicit `overwrite`, geometry in a named CRS, provisional IDs, partial results and typed conflict kinds. _Recommended:_ patches let edits to different properties merge and map onto `PATCH` and WFS-T's `Update`; the rest is what conflicts and inserts need to be typed.
   - B. Keep CS-552's type as written, and add the rest after alpha.1 as a new version of the type.
2. **The serialized change-set format.** Applications and servers may write it, so it's a public format.
   - A. JSON with a format name and a 0.x version, experimental until a second writer exists, as CS-836 decided for the IR's JSON. _Recommended._
   - B. 1.0 at alpha.1.
   - C. No serialized format in the engine; each application serializes its own.
3. **Servers with no push.** CS-552 settled that no source polls. A collaborative view of a server with no push channel then never sees others' edits until reload.
   - A. A source may check its server's version on an interval it declares (a cheap version request, or long polling) and turn what it learns into pushes. The engine still never polls, and a source without push says `live: false`. _Recommended:_ many feature servers have no push, and the interval stays inside the source, under the shared budget.
   - B. Keep "no source polls": collaboration only on servers that push.
4. **CS-453's vector and GIS half.**
   - A. Answer it with this note's section "CS-453's vector and GIS half". _Recommended._
   - B. Answer it with the vector renderer's plan, as CS-453 first recommended, and keep this note as input.
5. **How much of the edit layer is in alpha.1.**
   - A. The types and rules in "What the seam must carry in alpha.1", and the edit layer's hide, replace and insert built in CS-552's core, with its public API experimental. Sessions, writers and presence after. _Recommended:_ picks and queries must see overrides from the start, or every source's query path changes later.
   - B. Types and rules only in alpha.1; the edit layer built later.

## Risks

- **Source keys in tiles.** A tileset built without each feature's source key can't be written back, only overridden. The tiles writer needs tilers that write the key into feature metadata, and CS-832 says how it's read.
- **Override memory.** A long session with many pending edits that a slow re-tile doesn't confirm grows the edit layer's buffers. The layer reports its size, and the session can warn before it's large.
- **Unchecked outside facts.** Part 4's status, servers' support for entity tags, and what iTwin's libraries do on a backend were not read for this note. The writers' items read them before building and correct this note.
