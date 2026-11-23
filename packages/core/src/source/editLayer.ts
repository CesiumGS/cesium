/**
 * The edit layer (CS-831, built here per CS-865): one per content, between
 * the sinks and what reads them. It hides, replaces and inserts features by
 * feature ID (`FeatureId`, CS-957 A): every item of its content, wherever it
 * is placed, shows the same edits. Its overrides hold through streaming: a row that reloads
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
import type { FeatureData } from "./editing.ts";
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
 * Hides, replaces and inserts features by feature ID, for every item of its
 * content. A content's layer (`SourceContent.edits`) takes an instance ID of
 * one of its items' draws too, as that draw's feature ID (CS-957 A).
 * @experimental
 */
export class EditLayer {
  private readonly overrides = new Map<FeatureId, Override>();
  private readonly listeners = new Set<(ids: readonly FeatureId[]) => void>();
  private revision_ = 0;

  /**
   * @internal `featureOf` maps an ID it is given to the feature ID it is
   * kept by (an instance ID to its feature's); by default, itself.
   */
  constructor(
    private readonly featureOf: (id: FeatureId) => FeatureId = (id) => id,
  ) {}

  /** Stops drawing `id` wherever it is: every tile, level and draw that holds it. */
  hide(id: FeatureId): void {
    this.set(id, { kind: "hide" });
  }

  /** Hides `id` and shows `feature` in its place. */
  replace(id: FeatureId, feature: FeatureData): void {
    this.set(id, { kind: "replace", feature: frozen(feature) });
  }

  /**
   * A new feature, with the feature ID of a key the client made
   * (`SourceContent.featureId`), provisional until committed.
   */
  insert(id: FeatureId, feature: FeatureData): void {
    this.set(id, { kind: "insert", feature: frozen(feature) });
  }

  /** Drops `id`'s override: the source's own content shows again. */
  clear(id: FeatureId): void {
    const feature = this.featureOf(id);
    if (this.overrides.delete(feature)) {
      this.bump([feature]);
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
  get(id: FeatureId): Override | undefined {
    return this.overrides.get(this.featureOf(id));
  }

  /** Whether the source's own `id` draws: false when hidden or replaced. */
  showsBase(id: FeatureId): boolean {
    const o = this.overrides.get(this.featureOf(id));
    return o === undefined || o.kind === "insert";
  }

  /** Every override, in the order set. */
  entries(): IterableIterator<[FeatureId, Override]> {
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
  onChange(listener: (ids: readonly FeatureId[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(id: FeatureId, override: Override): void {
    if (typeof id !== "bigint" || id <= 0n || id > MAX_ID) {
      throw new TypeError(
        "EditLayer: an ID is a feature ID (an unsigned 64-bit bigint, not 0).",
      );
    }
    const feature = this.featureOf(id);
    this.overrides.set(feature, override);
    this.bump([feature]);
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
