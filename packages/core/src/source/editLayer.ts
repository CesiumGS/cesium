/**
 * The edit layer (CS-831, built here per CS-865): one per content, between
 * the sinks and what reads them. It hides, replaces and inserts features by
 * the source's own key (CS-952 A): every item of its content, wherever it is
 * placed, shows the same edits. Each edit is a record that holds its key
 * and its feature ID (the key's projection, `FeatureId`), so it needs no
 * other table to say what it names, loaded or not. Its overrides hold
 * through streaming: a row that reloads (the same key in a new batch, at
 * another level, after eviction) comes back with its override, because the
 * layer is applied on read, never written into the source's rows. Sources
 * never see it.
 *
 * What reads content through it sees the edits: `SourceContent.feature`
 * and `features`, and a draw whose ID is hidden stops drawing (`World.setVisible`).
 * A feature inside a batched draw (one of a tile's features) needs the
 * per-feature visibility bit the shaders read, which 3D Tiles styling's
 * `show` needs too: that comes with CS-554.
 *
 * Its state is the host's: it lives until the host clears it, and `size`
 * reports it. Sessions, undo, commits and merging are after alpha.1
 * (docs/design/editing.md).
 */
import type { FeatureData, FeatureRef } from "./editing.ts";
import type { FeatureId } from "./types.ts";

/** The largest feature ID: they're unsigned 64-bit. */
const MAX_ID = (1n << 64n) - 1n;

/**
 * One override.
 * @experimental
 */
export type Override =
  | { readonly kind: "hide" }
  | { readonly kind: "replace"; readonly feature: FeatureData }
  | { readonly kind: "insert"; readonly feature: FeatureData };

/**
 * Where a feature is, as its source keys it: its key, or, with `row`, row
 * `row` of the batch keyed `key`, a row its source didn't name.
 * @internal
 */
export interface FeatureAddress {
  readonly key: string;
  readonly row?: number;
}

/** @internal What an edit layer needs of its content: the projection, and what it holds. */
export interface EditAddressing {
  /** The feature ID of `address`: the one-way projection. */
  idOf(address: FeatureAddress): FeatureId;
  /** The address of feature `id` while something loaded holds it (a row or a draw), else undefined. */
  loaded(id: FeatureId): FeatureAddress | undefined;
}

/** One edit: its override, with the address it names and that address's ID. */
interface EditRecord {
  readonly address: FeatureAddress;
  readonly override: Override;
}

/**
 * Hides, replaces and inserts features for every item of its content, by
 * the source's key (a string, or a `FeatureRef` as a change set or a pick
 * gives). A bare feature ID is taken only while something can supply its
 * key: a loaded row or draw, an edit already made, or (for an instance ID of
 * one of its items' draws) the world's identity table.
 * @experimental
 */
export class EditLayer {
  private readonly records = new Map<FeatureId, EditRecord>();
  private readonly listeners = new Set<(ids: readonly FeatureId[]) => void>();
  private revision_ = 0;

  /** @internal Use `SourceContent.edits`. */
  constructor(private readonly addressing: EditAddressing) {}

  /** Stops drawing the feature wherever it is: every tile, level and draw that holds it. */
  hide(target: string | FeatureRef | FeatureId): void {
    this.set(target, { kind: "hide" }, "hide");
  }

  /** Hides the feature and shows `feature` in its place. */
  replace(target: string | FeatureRef | FeatureId, feature: FeatureData): void {
    this.set(target, { kind: "replace", feature: frozen(feature) }, "replace");
  }

  /** A new feature, by a key the client made, provisional until committed. */
  insert(target: string | FeatureRef, feature: FeatureData): void {
    this.set(target, { kind: "insert", feature: frozen(feature) }, "insert");
  }

  /** Drops the feature's edit: the source's own content shows again. */
  clear(target: string | FeatureRef | FeatureId): void {
    const id = this.find(target);
    if (id !== undefined && this.records.delete(id)) {
      this.bump([id]);
    }
  }

  /** Drops every edit. */
  clearAll(): void {
    const ids = [...this.records.keys()];
    this.records.clear();
    if (ids.length > 0) {
      this.bump(ids);
    }
  }

  /** The feature's override, if it has one. */
  get(target: string | FeatureRef | FeatureId): Override | undefined {
    const id = this.find(target);
    return id === undefined ? undefined : this.records.get(id)?.override;
  }

  /** The source's key that edit `id` names, while it has one (a positional row's has none). */
  keyOf(id: FeatureId): string | undefined {
    const address = this.records.get(id)?.address;
    return address?.row === undefined ? address?.key : undefined;
  }

  /** @internal The address edit `id` names, while it has one. */
  addressOf(id: FeatureId): FeatureAddress | undefined {
    return this.records.get(id)?.address;
  }

  /** Whether the source's own feature `id` draws: false when hidden or replaced. */
  showsBase(id: FeatureId): boolean {
    const o = this.records.get(id)?.override;
    return o === undefined || o.kind === "insert";
  }

  /** Every override by feature ID, in the order set. */
  *entries(): IterableIterator<[FeatureId, Override]> {
    for (const [id, record] of this.records) {
      yield [id, record.override];
    }
  }

  /** How many edits it holds (what a session would warn on). */
  get size(): number {
    return this.records.size;
  }

  /** Bumped by each change. */
  get revision(): number {
    return this.revision_;
  }

  /** Called with the feature IDs each change touched. Returns the remover. */
  onChange(listener: (ids: readonly FeatureId[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** The feature ID `target` names, when it can be told (no throw). */
  private find(target: string | FeatureRef | FeatureId): FeatureId | undefined {
    if (typeof target === "bigint") {
      if (this.records.has(target)) {
        return target;
      }
      const address = this.addressing.loaded(target);
      return address && this.addressing.idOf(address);
    }
    const address = this.address(target, "EditLayer");
    return this.addressing.idOf(address);
  }

  /** The address `target` names, or a `TypeError` naming `where`. */
  private address(
    target: string | FeatureRef | FeatureId,
    where: string,
  ): FeatureAddress {
    if (typeof target === "string") {
      if (target.length === 0) {
        throw new TypeError(`${where}: a key is a non-empty string.`);
      }
      return { key: target };
    }
    if (typeof target === "bigint") {
      if (target <= 0n || target > MAX_ID) {
        throw new TypeError(
          `${where}: an ID is a feature ID (an unsigned 64-bit bigint, not 0).`,
        );
      }
      const address =
        this.records.get(target)?.address ?? this.addressing.loaded(target);
      if (!address) {
        throw new TypeError(
          `${where}: nothing loaded has this ID, so its key isn't known: name the feature by its key (a FeatureRef).`,
        );
      }
      return address;
    }
    if (
      typeof target !== "object" ||
      target === null ||
      typeof target.key !== "string" ||
      target.key.length === 0
    ) {
      throw new TypeError(
        `${where}: a feature is named by its key, a non-empty string, or a FeatureRef.`,
      );
    }
    if (
      target.id !== undefined &&
      target.id !== this.addressing.idOf({ key: target.key })
    ) {
      throw new TypeError(
        `${where}: the FeatureRef's id isn't its key's feature ID in this content.`,
      );
    }
    return { key: target.key };
  }

  private set(
    target: string | FeatureRef | FeatureId,
    override: Override,
    method: string,
  ): void {
    const address = this.address(target, `EditLayer.${method}`);
    const id = this.addressing.idOf(address);
    this.records.set(id, { address, override });
    this.bump([id]);
  }

  private bump(ids: readonly FeatureId[]): void {
    this.revision_++;
    for (const listener of [...this.listeners]) {
      listener(ids);
    }
  }
}

function frozen(feature: FeatureData): FeatureData {
  if (typeof feature !== "object" || feature === null) {
    throw new TypeError("EditLayer: a feature is an object (FeatureData).");
  }
  return Object.freeze({ ...feature });
}
