/**
 * The edit layer (CS-831, built here per CS-865): one per content, between
 * the sinks and what reads them. It hides, replaces and inserts features by
 * stable ID, and its overrides hold through streaming: a row that reloads
 * (the same ID in a new batch, at another level, after eviction) comes back
 * with its override, because the layer is applied on read, never written
 * into the source's rows. Sources never see it.
 *
 * What reads content through it sees the edits: `SourceContent.feature`
 * and `features`, and a draw whose ID is hidden stops drawing (`World.setVisible`).
 * A feature inside a batched draw (one of a tile's features) needs the
 * per-feature visibility bit the shaders read, which 3D Tiles styling's
 * `show` needs too: that comes with CS-554.
 *
 * Sessions, undo, commits and merging are after alpha.1 (docs/design/editing.md).
 */
import type { StableId } from "../scene/identity.ts";
import type { FeatureData } from "./editing.ts";

/**
 * One override.
 * @experimental
 */
export type Override =
  | { readonly kind: "hide" }
  | { readonly kind: "replace"; readonly feature: FeatureData }
  | { readonly kind: "insert"; readonly feature: FeatureData };

/**
 * Hides, replaces and inserts features by stable ID.
 * @experimental
 */
export class EditLayer {
  private readonly overrides = new Map<StableId, Override>();
  private readonly listeners = new Set<(ids: readonly StableId[]) => void>();
  private revision_ = 0;

  /** Stops drawing `id` wherever it is: every tile, level and draw that holds it. */
  hide(id: StableId): void {
    this.set(id, { kind: "hide" });
  }

  /** Hides `id` and shows `feature` in its place. */
  replace(id: StableId, feature: FeatureData): void {
    this.set(id, { kind: "replace", feature: frozen(feature) });
  }

  /** A new feature, with an ID the client made (provisional until committed). */
  insert(id: StableId, feature: FeatureData): void {
    this.set(id, { kind: "insert", feature: frozen(feature) });
  }

  /** Drops `id`'s override: the source's own content shows again. */
  clear(id: StableId): void {
    if (this.overrides.delete(id)) {
      this.bump([id]);
    }
  }

  /** Drops every override. */
  clearAll(): void {
    const ids = [...this.overrides.keys()];
    this.overrides.clear();
    if (ids.length > 0) {
      this.bump(ids);
    }
  }

  /** `id`'s override, if it has one. */
  get(id: StableId): Override | undefined {
    return this.overrides.get(id);
  }

  /** Whether the source's own `id` draws: false when hidden or replaced. */
  showsBase(id: StableId): boolean {
    const o = this.overrides.get(id);
    return o === undefined || o.kind === "insert";
  }

  /** Every override, in the order set. */
  entries(): IterableIterator<[StableId, Override]> {
    return this.overrides.entries();
  }

  /** How many overrides it holds (what a session would warn on). */
  get size(): number {
    return this.overrides.size;
  }

  /** Bumped by each change. */
  get revision(): number {
    return this.revision_;
  }

  /** Called with the IDs each change touched. Returns the remover. */
  onChange(listener: (ids: readonly StableId[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(id: StableId, override: Override): void {
    if (typeof id !== "bigint" || id === 0n) {
      throw new TypeError("EditLayer: an ID is a stable ID (a bigint, not 0).");
    }
    this.overrides.set(id, override);
    this.bump([id]);
  }

  private bump(ids: readonly StableId[]): void {
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
