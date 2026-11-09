/**
 * A scene item: one thing a world draws. In this version an item is a tileset
 * drawn once (`World.add`), and a tileset can be drawn more than once: each
 * item draws the same loaded tiles with its own placement, tint, opacity and
 * view mask. There is one tile selection, one cache and one set of bounds, and
 * the geometry and transforms are shared: a further item adds only a draw
 * record and a draw item per draw. The engine gives items no meaning. An
 * application decides what each stands for.
 *
 * The items are a flat list (`World.items`, `Tileset3D.items`), not a scene
 * graph, and nothing walks them per draw.
 */
import { MaterialFlags } from "../render/layout.ts";
import type { CustomShader } from "./CustomShader.ts";
import type { ModelPlacement } from "./gltfModel.ts";
import {
  checkParameterValue,
  maxDisplacement,
  type DualPosition,
} from "./placement.ts";
import type { AnchorHandle, DrawHandle, World } from "./World.ts";
import type { DesignPlacement } from "../streaming/designPlacement.ts";
import type { ItemDraws, Tile } from "../streaming/Tile.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";

/** At or above this opacity an item draws opaque (surface.slang's `OPAQUE_ALPHA`). */
const OPAQUE_OPACITY = 0.999;

/** All views: a view mask's every bit. */
const ALL_VIEWS = 0xffffffff;

const WHITE = [1, 1, 1] as const;

/** What `World.add` takes; each can change later on the `SceneItem`. */
export interface SceneItemOptions {
  /**
   * Where each vertex is drawn, between the tile's position (0) and its second
   * position (1), when its content has one (a `CESIUM_dual_position`
   * declaration in its tileset.json). Past those it extrapolates. A finite
   * number. Default 0. Anything but 0 needs the tileset to have a second
   * position. Setting it writes 4 bytes.
   */
  placement?: number;
  /**
   * Linear RGB multiplied with the content's colour. Default white. Setting
   * it writes a draw record per loaded draw: for a colour that changes every
   * tick, a custom shader's uniform costs less.
   */
  tint?: readonly [number, number, number];
  /**
   * How opaque it is, 0 to 1 (both included). Default 1.
   *
   * Below 1 the item is translucent: only the translucent passes draw it, so
   * it writes no depth, casts no shadow, takes no ambient occlusion and isn't
   * picked (a pick sees through it). Lines stay opaque. At 0 it isn't drawn at
   * all. Setting it writes a draw record per loaded draw. Crossing 1 also
   * moves its draws between the opaque and translucent passes, which records
   * those passes again, once. A custom shader can lower a fragment's alpha
   * further; raised to 0.999 or more, a translucent item's fragment isn't drawn.
   */
  opacity?: number;
  /**
   * The views that draw it, a bit per view (`Engine.viewBit`). Default all. A
   * view draws an item's tile only where selection chose that tile for the
   * view too. A view that no item of the tileset shows selects and fetches
   * nothing for it.
   */
  viewMask?: number;
  /**
   * Whether it is drawn at all. Default true. Its tiles stay selected, in the
   * views of its `viewMask`, but its placement no longer pads their bounds.
   */
  show?: boolean;
  /**
   * Its custom shader: full control of how this item looks, the same
   * `CustomShader` a tileset takes. A `FeatureStyle`'s shader (`style.shader`)
   * works here too, per item. Default the tileset's (`TilesetOptions.customShader`
   * or `style`), or none; an item's own shader replaces the tileset's, and
   * doesn't combine with it. A shader that wants no lighting sets
   * `material.unlit`. Until a new shader's pipelines compile it draws with the
   * engine's.
   */
  shader?: CustomShader;
}

/** @internal What an item needs of its tileset. */
export interface SceneItemHost {
  readonly tileset: Tileset3D;
  readonly world: World;
  /** Its second position, if its content has one. */
  readonly dualPosition:
    { readonly semantic: string; readonly maxDistance: number } | undefined;
  /** Where its positions are drawn (`Tileset3D.placement`). */
  readonly designPlacement: DesignPlacement | undefined;
  /** Where its second positions are drawn. */
  readonly secondPlacement: DesignPlacement | undefined;
  /** Its shader as a tile is placed with it, if any. */
  readonly contentShader: CustomShader | undefined;
  /** Its loaded tiles. */
  readonly loadedTiles: Iterable<Tile>;
  /** The item drawing the tiles' own draws, if any. */
  readonly baseItem: SceneItem | undefined;
  /** `draw` is a tile's content, drawn by `item`; `source` is the tile's own draw. */
  noteDraw(
    tile: Tile,
    draw: DrawHandle,
    item: SceneItem,
    source: DrawHandle,
  ): void;
  forgetDraw(draw: DrawHandle, tile: Tile): void;
  /** The tile's bytes changed by `delta` (it was loaded before and stays). */
  tileBytes(tile: Tile, delta: number): void;
  /** Something a view draws changed: the loop should run. */
  changed(): void;
  warn(message: string): void;
  /** The item is leaving its tileset. */
  removed(item: SceneItem): void;
}

/**
 * Throws what the item's constructor would refuse, before it exists: so a
 * refused `World.add` binds nothing. `hasSecond`: its tileset has a second
 * position.
 */
export function checkItemOptions(
  options: SceneItemOptions,
  hasSecond: boolean,
): void {
  if (options.opacity !== undefined) {
    checkOpacity(options.opacity);
  }
  if (options.tint !== undefined) {
    checkTint(options.tint);
  }
  if (options.placement !== undefined) {
    checkParameterValue("SceneItem.placement", options.placement);
    if (!hasSecond && options.placement !== 0) {
      throw new RangeError(
        `SceneItem: placement is ${options.placement}, but its tileset has no second position; it can only be 0.`,
      );
    }
  }
}

/** Throws unless `opacity` is a number from 0 to 1. */
function checkOpacity(opacity: number): void {
  if (!(opacity >= 0 && opacity <= 1)) {
    throw new RangeError(
      `SceneItem: opacity is ${opacity}; it takes 0 to 1, both included.`,
    );
  }
}

/** Throws unless `tint` is three finite numbers. */
function checkTint(tint: readonly number[]): void {
  if (tint.length !== 3 || !tint.every((c) => Number.isFinite(c))) {
    throw new RangeError(
      `SceneItem: tint is [${String(tint)}]; it takes three finite numbers, linear RGB.`,
    );
  }
}

/**
 * A tileset drawn once in its world (`World.add`). See `SceneItemOptions` for
 * what each property means and costs. A property reads as it was last set. A
 * change applies to every loaded tile at once, and to each tile that loads
 * later. After `remove` (or the tileset's destruction) a setter keeps its
 * value and does nothing else: the item draws nothing, and nothing brings it
 * back; `World.add` makes a new one.
 */
export class SceneItem {
  private tint_: readonly [number, number, number];
  private opacity_: number;
  private viewMask_: number;
  private show_: boolean;
  private shader_: CustomShader | undefined;
  private removed_ = false;
  /** The placement's value; with a second position, also its parameter. */
  private placementValue: number;
  private dual: DualPosition | undefined;
  /** The words its tint and opacity are written as. */
  private readonly color = new Float32Array(4);

  /** @internal Use `World.add`. */
  constructor(
    private readonly host: SceneItemHost,
    options: SceneItemOptions,
    /** @internal It draws its tiles' own draws: it was added when none did. */
    public holdsBase: boolean,
  ) {
    if (options.opacity !== undefined) {
      checkOpacity(options.opacity);
    }
    if (options.tint !== undefined) {
      checkTint(options.tint);
    }
    this.placementValue = 0;
    this.tint_ = options.tint ?? WHITE;
    this.opacity_ = options.opacity ?? 1;
    this.viewMask_ = (options.viewMask ?? ALL_VIEWS) >>> 0;
    this.show_ = options.show ?? true;
    this.shader_ = options.shader;
    this.setColorWords();
    this.makeDual();
    if (options.placement !== undefined) {
      this.placement = options.placement;
    }
  }

  /** The tileset it draws. */
  get tileset(): Tileset3D {
    return this.host.tileset;
  }

  /**
   * What it hangs under: its tileset's anchor (`TilesetOptions.anchor`, by
   * default the Earth's), which a view places through its reference frame.
   */
  get anchor(): AnchorHandle {
    return this.host.tileset.anchor;
  }

  /** See `SceneItemOptions.placement`. */
  get placement(): number {
    return this.placementValue;
  }
  set placement(value: number) {
    if (this.removed_) {
      // Stored and nothing more: the item draws nothing, and has no parameter.
      checkParameterValue("SceneItem.placement", value);
      this.placementValue = value;
      return;
    }
    if (this.dual === undefined) {
      if (value !== 0) {
        throw new RangeError(
          `SceneItem: placement is ${value}, but its tileset has no second position ; it can only be 0.`,
        );
      }
      return;
    }
    // Refuses a value that isn't finite, naming it, and keeps the old one.
    this.dual.t.value = value;
    if (value !== this.placementValue) {
      this.placementValue = value;
      this.host.changed();
    }
  }

  /** See `SceneItemOptions.tint`. */
  get tint(): readonly [number, number, number] {
    return this.tint_;
  }
  set tint(tint: readonly [number, number, number]) {
    checkTint(tint);
    if (tint.every((c, i) => c === this.tint_[i])) {
      return;
    }
    this.tint_ = [tint[0], tint[1], tint[2]];
    this.setColorWords();
    this.forEachLoaded((_tile, entry) => this.applyColor(entry));
    this.host.changed();
  }

  /** See `SceneItemOptions.opacity`. */
  get opacity(): number {
    return this.opacity_;
  }
  set opacity(opacity: number) {
    checkOpacity(opacity);
    if (opacity === this.opacity_) {
      return;
    }
    const was = this.opacity_;
    this.opacity_ = opacity;
    this.setColorWords();
    const passes =
      was >= OPAQUE_OPACITY !== opacity >= OPAQUE_OPACITY ||
      (was === 0) !== (opacity === 0);
    this.forEachLoaded((tile, entry) => {
      this.applyColor(entry);
      if (passes) {
        this.applyMaterials(entry);
        this.applyViewMask(tile);
        this.applyCasterMask(tile);
      }
    });
    this.host.changed();
  }

  /** See `SceneItemOptions.viewMask`. */
  get viewMask(): number {
    return this.viewMask_;
  }
  set viewMask(mask: number) {
    const next = mask >>> 0;
    if (next === this.viewMask_) {
      return;
    }
    this.viewMask_ = next;
    this.applyMasks();
  }

  /** See `SceneItemOptions.show`. */
  get show(): boolean {
    return this.show_;
  }
  set show(show: boolean) {
    if (show === this.show_) {
      return;
    }
    this.show_ = show;
    this.applyMasks();
  }

  /** See `SceneItemOptions.shader`. */
  get shader(): CustomShader | undefined {
    return this.shader_;
  }
  set shader(shader: CustomShader | undefined) {
    if (shader === this.shader_) {
      return;
    }
    this.shader_ = shader;
    this.forEachLoaded((_tile, entry) => this.applyShader(entry));
    this.host.changed();
  }

  /**
   * Where what it draws now has content coordinates, for a pick or a snap on
   * it: the tileset's `placement` at placement 0, its `secondPlacement` at
   * placement 1. Undefined between and past them: such a point is drawn where
   * the content has no point, so it has no content coordinates.
   */
  get designPlacement(): DesignPlacement | undefined {
    const t = this.placementValue;
    return t === 0
      ? this.host.designPlacement
      : t === 1
        ? this.host.secondPlacement
        : undefined;
  }

  /** True once `remove` ran, or its tileset was destroyed. */
  get removed(): boolean {
    return this.removed_;
  }

  /**
   * Stops drawing it and frees its draws. Idempotent. Its tiles stay in the
   * tileset's cache until normal eviction; a tileset with no items selects
   * nothing and does no work per tick, and `World.add` draws it again.
   */
  remove(): void {
    if (this.removed_) {
      return;
    }
    this.removed_ = true;
    for (const tile of this.host.loadedTiles) {
      const bytes = this.bytes(tile);
      if (this.holdsBase) {
        this.releaseBase(tile);
      }
      this.unplace(tile);
      this.host.tileBytes(tile, -bytes);
    }
    this.releaseDual();
    this.host.removed(this);
    this.host.changed();
  }

  /** @internal Its tileset was destroyed: its tiles have unloaded. */
  destroyed(): void {
    this.removed_ = true;
    this.dual = undefined;
  }

  /** @internal How far it can move a vertex now, in model units. */
  get reach(): number {
    return this.moves ? maxDisplacement(this.dual!) : 0;
  }

  /**
   * @internal Whether it moves vertices that are drawn: not while it is hidden,
   * fully transparent or shown in no view, so a hidden item's last placement
   * pads no bounds.
   */
  get moves(): boolean {
    return (
      this.dual !== undefined &&
      this.show_ &&
      this.opacity_ > 0 &&
      this.viewMask_ !== 0
    );
  }

  /**
   * @internal The views it may draw in, even while hidden (a hidden item's
   * tiles stay selected, as `SceneItemOptions.show` says).
   */
  get views(): number {
    return this.removed_ ? 0 : this.viewMask_;
  }

  /** Whether it draws tiles as they load, changing nothing. */
  private get plain(): boolean {
    return (
      this.holdsBase &&
      this.dual === undefined &&
      this.opacity_ === 1 &&
      this.tint_ === WHITE &&
      this.shader_ === undefined
    );
  }

  /**
   * @internal Its draws of a tile just placed (or loaded before it existed).
   * Throws a capacity error, leaving nothing behind, when the world has no
   * room.
   */
  place(tile: Tile, placement: ModelPlacement): void {
    if (this.plain) {
      return;
    }
    const world = this.host.world;
    const base = this.host.baseItem;
    const baseEntry = base && tile.items?.get(base);
    const draws: DrawHandle[] = [];
    const sources: DrawHandle[] = [];
    const materials: number[] = [];
    const contentMaterial = (source: DrawHandle, i: number) =>
      baseEntry?.materials[i] ?? world.drawMaterial(source)!;
    if (this.holdsBase) {
      placement.draws.forEach((source, i) => {
        draws.push(source);
        sources.push(source);
        materials.push(contentMaterial(source, i));
      });
    } else {
      let skipped = false;
      try {
        placement.draws.forEach((source, i) => {
          const draw = world.twinDraw(source);
          if (draw === undefined) {
            skipped = true;
            return;
          }
          draws.push(draw);
          sources.push(source);
          materials.push(contentMaterial(source, i));
        });
      } catch (error) {
        for (const draw of draws) {
          world.removeDraw(draw);
        }
        throw error;
      }
      if (skipped) {
        this.host.warn(
          "Instanced content and point clouds draw only once, however many items a tileset has",
        );
      }
    }
    const entry: ItemDraws = {
      draws,
      materials,
      twins: draws.map(() => -1),
      denied: false,
    };
    (tile.items ??= new Map()).set(this, entry);
    if (!this.holdsBase) {
      draws.forEach((draw, i) =>
        this.host.noteDraw(tile, draw, this, sources[i]!),
      );
    }
    this.applyShader(entry);
    this.applyMaterials(entry);
    this.applyColor(entry);
    this.applyPlacement(entry);
    this.applyViewMask(tile);
    this.applyCasterMask(tile);
    if (tile.placeholderMask !== 0 || tile.clip !== undefined) {
      this.applyPlaceholder(tile);
    }
  }

  /**
   * @internal A refused `World.add`: frees whatever it made on `tiles` (a base
   * item's tiles' own draws go back to hidden) and its parameter.
   */
  discard(tiles: Iterable<Tile>): void {
    this.removed_ = true;
    for (const tile of tiles) {
      if (this.holdsBase && tile.items?.has(this)) {
        this.releaseBase(tile);
      }
      this.unplace(tile);
    }
    this.releaseDual();
  }

  /** @internal Frees its draws of a tile (its content is leaving, or it is). */
  unplace(tile: Tile): void {
    const entry = tile.items?.get(this);
    if (entry === undefined) {
      return;
    }
    const world = this.host.world;
    if (!this.holdsBase) {
      for (const draw of entry.draws) {
        this.host.forgetDraw(draw, tile);
        world.removeDraw(draw);
      }
    }
    for (const twin of entry.twins) {
      if (twin >= 0) {
        world.removeMaterial(twin);
      }
    }
    tile.items!.delete(this);
    if (tile.items!.size === 0) {
      tile.items = undefined;
    }
  }

  /**
   * The tile's own draws back as they loaded, hidden, for the next item that
   * draws them. They stay in the world while the tile is cached.
   */
  private releaseBase(tile: Tile): void {
    const world = this.host.world;
    const entry = tile.items?.get(this);
    if (entry !== undefined) {
      const shader = this.host.contentShader;
      entry.draws.forEach((draw, i) => {
        world.setPlacement(draw, undefined);
        world.setDrawShader(draw, shader);
        world.setDrawMaterial(draw, entry.materials[i]!);
        world.setColor(draw, [1, 1, 1, 1]);
      });
    }
    for (const draw of tile.placement?.draws ?? []) {
      world.setViewMask(draw, 0);
      world.setCasterMask(draw, 0);
    }
  }

  /** @internal What its draws of a tile add to the tile's bytes. */
  bytes(tile: Tile): number {
    return this.holdsBase
      ? 0
      : (tile.items?.get(this)?.draws.length ?? 0) * ITEM_DRAW_BYTES;
  }

  /** @internal Its draws of a tile; the tile's own if it holds them. */
  drawsOf(tile: Tile): readonly DrawHandle[] {
    return this.holdsBase
      ? (tile.placement?.draws ?? [])
      : (tile.items?.get(this)?.draws ?? []);
  }

  /** @internal The views this item draws the tile in. */
  shownIn(tile: Tile): number {
    const mask = tile.appliedMask === -1 ? 0 : tile.appliedMask;
    return (mask & this.shownMask(tile)) >>> 0;
  }

  /** @internal The tile's selected views, as its draws show them. */
  applyViewMask(tile: Tile): void {
    const mask = tile.appliedMask === -1 ? 0 : tile.appliedMask;
    const shown = (mask & this.shownMask(tile)) >>> 0;
    for (const draw of this.drawsOf(tile)) {
      this.host.world.setViewMask(draw, shown);
    }
  }

  /**
   * @internal The views whose shadow cascades alone draw the tile, as its
   * draws show them. Opaque items cast; translucent ones don't.
   */
  applyCasterMask(tile: Tile): void {
    const casts =
      this.opacity_ >= OPAQUE_OPACITY
        ? (tile.appliedCasterMask & this.shownMask(tile)) >>> 0
        : 0;
    for (const draw of this.drawsOf(tile)) {
      this.host.world.setCasterMask(draw, casts);
    }
  }

  /** @internal The tile's placeholder state, as its draws show it. */
  applyPlaceholder(tile: Tile): void {
    for (const draw of this.drawsOf(tile)) {
      this.host.world.setPlaceholder(draw, tile.placeholderMask, tile.clip);
    }
  }

  /** @internal Its tint and opacity, as a draw's colour. */
  get drawColor(): ArrayLike<number> {
    return this.color;
  }

  private applyMasks(): void {
    if (this.removed_) {
      return;
    }
    for (const tile of this.host.loadedTiles) {
      this.applyViewMask(tile);
      this.applyCasterMask(tile);
    }
    this.host.changed();
  }

  private shownMask(tile: Tile): number {
    return !this.show_ ||
      this.opacity_ === 0 ||
      tile.items?.get(this)?.denied === true
      ? 0
      : this.viewMask_;
  }

  private setColorWords(): void {
    this.color[0] = this.tint_[0];
    this.color[1] = this.tint_[1];
    this.color[2] = this.tint_[2];
    this.color[3] = this.opacity_;
  }

  private makeDual(): void {
    const declared = this.host.dualPosition;
    if (declared === undefined) {
      this.dual = undefined;
      return;
    }
    this.dual = {
      kind: "dual",
      semantic: declared.semantic,
      t: this.host.world.createPlacementParameter(this.placementValue),
      maxDistance: declared.maxDistance,
    };
  }

  private releaseDual(): void {
    const dual = this.dual;
    this.dual = undefined;
    if (dual !== undefined) {
      for (const tile of this.host.loadedTiles) {
        for (const draw of tile.items?.get(this)?.draws ?? []) {
          this.host.world.setPlacement(draw, undefined);
        }
      }
      this.host.world.releasePlacementParameter(dual.t);
    }
  }

  /** Runs `each` for every loaded tile, its entry made where it had none. */
  private forEachLoaded(each: (tile: Tile, entry: ItemDraws) => void): void {
    if (this.removed_) {
      return;
    }
    for (const tile of this.host.loadedTiles) {
      if (tile.placement === undefined) {
        continue;
      }
      let entry = tile.items?.get(this);
      if (entry === undefined) {
        if (this.plain) {
          continue;
        }
        this.place(tile, tile.placement);
        entry = tile.items?.get(this);
        if (entry === undefined) {
          continue;
        }
      }
      each(tile, entry);
    }
  }

  private applyPlacement(entry: ItemDraws): void {
    const world = this.host.world;
    const dual = this.dual;
    entry.denied = false;
    for (const draw of entry.draws) {
      if (dual !== undefined && !world.drawHasPosition(draw, dual.semantic)) {
        entry.denied = true;
        this.host.warn(
          `A tile's mesh has no ${dual.semantic} attribute of 3 components, or is instanced, so it has no second position and no item that moves it draws that tile`,
        );
        world.setPlacement(draw, undefined);
        continue;
      }
      world.setPlacement(draw, dual);
    }
  }

  private applyColor(entry: ItemDraws): void {
    for (const draw of entry.draws) {
      this.host.world.setColor(draw, this.color);
    }
  }

  private applyShader(entry: ItemDraws): void {
    const shader = this.shader_ ?? this.host.contentShader;
    for (const draw of entry.draws) {
      this.host.world.setDrawShader(draw, shader);
    }
  }

  /**
   * Each draw's material: the content's, or, while translucent, its blended
   * twin. The world's materials are interned, so every tile's twin of one
   * material is one row. A draw holds its twin's reference.
   */
  private applyMaterials(entry: ItemDraws): void {
    const world = this.host.world;
    const translucent = this.opacity_ < OPAQUE_OPACITY;
    entry.draws.forEach((draw, i) => {
      const own = entry.materials[i]!;
      const twin = entry.twins[i]!;
      if (translucent && twin < 0) {
        const next = world.materialWithFlags(
          own,
          MaterialFlags.alphaBlend | MaterialFlags.blendedOnly,
        );
        world.setDrawMaterial(draw, next);
        entry.twins[i] = next;
      } else if (!translucent) {
        if (world.drawMaterial(draw) !== own) {
          world.setDrawMaterial(draw, own);
        }
        if (twin >= 0) {
          world.removeMaterial(twin);
          entry.twins[i] = -1;
        }
      }
    });
  }
}

/**
 * Bytes a further item's draw adds to its tile: a record and a draw item, five
 * words of indirect arguments and a row of the placements buffer, on the GPU
 * and in their CPU copies. The geometry, material and transforms are shared.
 */
export const ITEM_DRAW_BYTES = 2 * (160 + 80 + 20 + 16);
