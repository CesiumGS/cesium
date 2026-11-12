// Per-view variants of a draw (plan §13.37, "one view's content under
// different transforms"). A draw has one program and one record, so when the
// views of a world reach an anchor by routes of different structure (a switch
// frame with an exaggeration for one view and the identity or a plan-and-
// profile strip for another), no one draw can show each view its own route.
// The world keeps one draw per route shape instead:
//
//  - the views that draw the anchor are grouped by the shape of their route to
//    their render root (`viewShape`: the smooth edges crossed, in order and
//    direction, by the identity of the warp). One group is the common case and
//    costs nothing: no draw is added and no mask touched;
//  - with several, the anchor's own draws (the sources) belong to the primary
//    group, the one of the first view that crosses a smooth edge, and each
//    other group gets a twin of every source its views show (`World.twinDraw`),
//    made when a view of the group first shows it and removed when the group
//    goes (its last view left, or its route changed shape) or the source does;
//  - a twin of a group that crosses smooth edges is registered under a virtual
//    anchor key of its own (`VIRTUAL_SLOT`), so the warp scheduler routes or
//    fits it by the group's route as for any anchor (selection, fits, the
//    compiled program, terrain's exact term); a twin of the identity group is
//    not registered and draws unwarped;
//  - the sources' view masks (and caster masks) are what the application set,
//    narrowed to the primary group's views, and each twin's are the same
//    narrowed to its group's (`World.setViewMask` asks `viewMask`). Everything
//    else of a twin's record follows its source's every tick (`mirror`): the
//    material and shader, the tint, imagery, clips, visibility, placement of its
//    own, where its route is evaluated, terrain's `h·n̂`.
//
// Picks need nothing of their own: a twin's record has its source's first
// feature ID, so a pick in any view resolves to the source (`World.feature`),
// and the route a pick is carried through is the view's own
// (`View.pickPlacements`). Only meshes are twinned; billboards, point sets,
// patch draws and instanced draws stay as the primary group draws them.
import type { Route } from "../../camera/route.ts";
import {
  BATCH_WORD,
  CASTER_MASK_WORD,
  CENTER_WORD,
  MATERIAL_INDEX_WORD,
  PLACEMENT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  RecordFlags,
  TRANSFORM_WORD,
  VIEW_MASK_WORD,
} from "../../render/layout.ts";
import { isCapacityError } from "../CapacityError.ts";
import type { World } from "../World.ts";
import type { DrawHandle } from "./types.ts";
import type { MirrorMemo, WarpView, WorldWarps } from "./warps.ts";

/** The key a group's anchor has when its views cross no smooth edge: their twins are not warped. */
export const IDENTITY_SLOT = -1;

/** The first key of the virtual anchors a group other than the primary is warped as (real slots are far below). */
export const VIRTUAL_SLOT = 1 << 24;

/** The words of a twin's record that are its own: where it is drawn, by which route, in which views. */
const OWNED: ReadonlySet<number> = new Set([
  CENTER_WORD,
  CENTER_WORD + 1,
  CENTER_WORD + 2,
  RADIUS_WORD,
  TRANSFORM_WORD,
  MATERIAL_INDEX_WORD,
  BATCH_WORD,
  PLACEMENT_WORD,
  VIEW_MASK_WORD,
  CASTER_MASK_WORD,
]);

const ids = new WeakMap<object, number>();
let idCount = 0;
const shapes = new WeakMap<Route, string>();

/**
 * What a route is made of apart from its rigid steps and its parameters'
 * values: the smooth edges it crosses, in order and direction, each by the
 * identity of its warp (a view that sets a slider for itself still reads the
 * same warp). "" for no route: the view crosses no smooth edge.
 */
export function viewShape(route: Route | undefined): string {
  if (!route) {
    return "";
  }
  let key = shapes.get(route);
  if (key === undefined) {
    key = route.steps
      .flatMap((s) => {
        if (s.kind !== "warp") {
          return [];
        }
        const identity: object = s.warp.smooth ?? s.warp;
        let id = ids.get(identity);
        if (id === undefined) {
          id = ++idCount;
          ids.set(identity, id);
        }
        return [`${s.inverse ? "i" : "f"}${id}`];
      })
      .join(",");
    shapes.set(route, key);
  }
  return key;
}

/** The views of a world that reach an anchor by one shape of route. */
export interface ViewGroup {
  /** `viewShape` of the views' routes. */
  readonly key: string;
  /** The views' bits. */
  mask: number;
  /** The views, the first the one whose route the group's anchor is made from. */
  views: readonly WarpView[];
  /** The first view's route: undefined where the views cross no smooth edge. */
  route: Route | undefined;
  /** The key of the group's anchor in the warp scheduler: the real slot for the primary group, a virtual one for another, `IDENTITY_SLOT` for none. */
  slot: number;
}

/** The views that share one shape of route to an anchor (`WorldVariants.sync`). */
export interface ViewPart {
  readonly key: string;
  readonly views: WarpView[];
}

/** Groups a slot's views by the shape of their routes: undefined when no view crosses a smooth edge. */
export function partitionViews(
  slot: number,
  views: readonly WarpView[],
): ViewPart[] | undefined {
  if (!views.some((view) => view.routes[slot] !== undefined)) {
    return undefined;
  }
  const parts = new Map<string, ViewPart>();
  for (const view of views) {
    const key = viewShape(view.routes[slot]);
    let part = parts.get(key);
    if (!part) {
      part = { key, views: [] };
      parts.set(key, part);
    }
    part.views.push(view);
  }
  return [...parts.values()];
}

interface Twin {
  readonly handle: DrawHandle;
  readonly group: ViewGroup;
  /** What `WorldWarps.mirror` last carried over. */
  readonly memo: MirrorMemo;
}

/** A source draw under an anchor with several groups: the masks its owner asked for, and its twins. */
interface Source {
  readonly slot: number;
  readonly handle: DrawHandle;
  view: number;
  caster: number;
  readonly twins: Map<ViewGroup, Twin>;
}

interface SlotState {
  primary: string;
  /** By shape. */
  readonly groups: Map<string, ViewGroup>;
  readonly sources: Set<Source>;
  /** The primary group's views. */
  mask: number;
}

const bitsOf = (views: readonly WarpView[]): number =>
  views.reduce((mask, view) => (mask | (1 << view.id)) >>> 0, 0);

export class WorldVariants {
  readonly #slots = new Map<number, SlotState>();
  readonly #sources = new Map<number, Source>();
  readonly #twins = new Map<number, { source: Source; twin: Twin }>();
  /** The key the twin being made is registered under (`slotOf`). */
  #assigning: number | undefined;
  #nextVirtual = 0;

  constructor(
    private readonly world: World,
    private readonly warps: WorldWarps,
  ) {}

  /** Whether any anchor has views of different route shapes. */
  get active(): boolean {
    return this.#slots.size > 0;
  }

  /** The groups and the twin draws now. */
  get stats(): { groups: number; draws: number } {
    let groups = 0;
    for (const state of this.#slots.values()) {
      groups += state.groups.size;
    }
    return { groups, draws: this.#twins.size };
  }

  /** Whether the anchor has views of different shapes (its groups are in `sync`'s answer). */
  has(slot: number): boolean {
    return this.#slots.has(slot);
  }

  /**
   * The key the draw is registered under in the warp scheduler, if it is a
   * twin (or is being made as one): `IDENTITY_SLOT` for none.
   */
  slotOf(index: number): number | undefined {
    return this.#assigning ?? this.#twins.get(index)?.twin.group.slot;
  }

  /**
   * Brings the anchor's groups to its views' route shapes (`partitionViews`),
   * made once a frame by the warp scheduler. Returns the groups, the primary
   * first, or undefined for one shape (no variants: the common case).
   */
  sync(slot: number, parts: readonly ViewPart[]): ViewGroup[] | undefined {
    if (parts.length === 1) {
      if (this.#slots.has(slot)) {
        this.#dissolve(slot);
      }
      return undefined;
    }
    let state = this.#slots.get(slot);
    let changed = false;
    if (!state) {
      state = {
        primary: "",
        groups: new Map(),
        sources: new Set(),
        mask: 0,
      };
      this.#slots.set(slot, state);
      this.#activate(slot, state);
      changed = true;
    }
    const keys = new Set(parts.map((part) => part.key));
    for (const group of [...state.groups.values()]) {
      if (!keys.has(group.key)) {
        this.#removeTwins(state, group);
        state.groups.delete(group.key);
        changed = true;
      }
    }
    // The primary group stays while it has views, so a view coming or going
    // elsewhere does not move the sources' route.
    const primary =
      state.primary !== "" && keys.has(state.primary)
        ? state.primary
        : parts.find((part) => part.key !== "")!.key;
    changed ||= primary !== state.primary;
    state.primary = primary;
    for (const part of parts) {
      let group = state.groups.get(part.key);
      if (!group) {
        group = {
          key: part.key,
          mask: 0,
          views: [],
          route: undefined,
          slot: IDENTITY_SLOT,
        };
        state.groups.set(part.key, group);
      }
      const mask = bitsOf(part.views);
      changed ||= mask !== group.mask;
      group.mask = mask;
      group.views = part.views;
      group.route = part.views[0]!.routes[slot];
      const want =
        part.key === primary
          ? slot
          : part.key === ""
            ? IDENTITY_SLOT
            : group.slot >= VIRTUAL_SLOT
              ? group.slot
              : VIRTUAL_SLOT + this.#nextVirtual++;
      if (group.slot !== want) {
        // Another route's twins are not this one's: they are made again.
        this.#removeTwins(state, group);
        group.slot = want;
        changed = true;
      }
    }
    state.mask = state.groups.get(primary)!.mask;
    if (changed) {
      for (const source of state.sources) {
        this.#apply(source);
      }
    }
    return [
      state.groups.get(primary)!,
      ...[...state.groups.values()].filter((g) => g.key !== primary),
    ];
  }

  /** The anchors whose views no longer cross smooth edges by routes of several shapes (all but `keep`) are dissolved. */
  prune(keep: ReadonlySet<number>): void {
    for (const slot of [...this.#slots.keys()]) {
      if (!keep.has(slot)) {
        this.#dissolve(slot);
      }
    }
  }

  /**
   * The anchor key whose route the view draws the anchor by: undefined when
   * its views cross no smooth edge. Selection of the view's tiles runs on it.
   */
  keyFor(slot: number, viewId: number): number | undefined {
    const state = this.#slots.get(slot);
    if (!state) {
      return slot;
    }
    const bit = (1 << viewId) >>> 0;
    for (const group of state.groups.values()) {
      if ((group.mask & bit) !== 0) {
        return group.slot === IDENTITY_SLOT ? undefined : group.slot;
      }
    }
    return slot;
  }

  /**
   * The draw that shows `handle`'s content in the views whose route to the
   * anchor has the shape of `route` (undefined: no smooth edge): the draw
   * itself, or its twin for that group.
   */
  drawFor(handle: DrawHandle, route: Route | undefined): DrawHandle {
    const source = this.#sources.get(handle.index);
    if (!source || source.handle.generation !== handle.generation) {
      return handle;
    }
    const state = this.#slots.get(source.slot)!;
    const group = state.groups.get(viewShape(route));
    return (group && source.twins.get(group)?.handle) ?? handle;
  }

  /** The draw `twin` follows, if it is a twin. */
  sourceOf(twin: DrawHandle): DrawHandle | undefined {
    const held = this.#twins.get(twin.index);
    return held && held.twin.handle.generation === twin.generation
      ? held.source.handle
      : undefined;
  }

  /** The views a draw is drawn in, as `World.setViewMask` is asked: the owner's, narrowed to the primary group's if it has twins. */
  viewMask(handle: DrawHandle, mask: number): number {
    if (this.#sources.size === 0) {
      return mask;
    }
    const source = this.#sources.get(handle.index);
    if (!source || source.handle.generation !== handle.generation) {
      return mask;
    }
    source.view = mask >>> 0;
    for (const twin of source.twins.values()) {
      this.world.setViewMask(twin.handle, source.view & twin.group.mask);
    }
    return (source.view & this.#slots.get(source.slot)!.mask) >>> 0;
  }

  /** The same for the views whose shadow cascades alone draw it. */
  casterMask(handle: DrawHandle, mask: number): number {
    if (this.#sources.size === 0) {
      return mask;
    }
    const source = this.#sources.get(handle.index);
    if (!source || source.handle.generation !== handle.generation) {
      return mask;
    }
    source.caster = mask >>> 0;
    for (const twin of source.twins.values()) {
      this.world.setCasterMask(twin.handle, source.caster & twin.group.mask);
    }
    return (source.caster & this.#slots.get(source.slot)!.mask) >>> 0;
  }

  /** A draw was added: under an anchor with several groups it is a source, and narrowed to the primary group's views. */
  drawAdded(handle: DrawHandle): void {
    if (this.#slots.size === 0 || this.#assigning !== undefined) {
      return;
    }
    const slot = this.#slotOfDraw(handle.index);
    const state = this.#slots.get(slot);
    if (!state) {
      return;
    }
    if (this.#eligible(handle.index)) {
      this.#apply(this.#adopt(slot, state, handle.index));
    } else {
      this.#unserved(handle.index);
    }
  }

  /** A draw is being removed: a source takes its twins with it. */
  drawRemoved(handle: DrawHandle): void {
    const twin = this.#twins.get(handle.index);
    if (twin) {
      this.#twins.delete(handle.index);
      twin.source.twins.delete(twin.twin.group);
      return;
    }
    const source = this.#sources.get(handle.index);
    if (source && source.handle.generation === handle.generation) {
      this.#sources.delete(handle.index);
      this.#slots.get(source.slot)?.sources.delete(source);
      for (const t of [...source.twins.values()]) {
        this.world.removeDraw(t.handle);
      }
    }
  }

  /**
   * The tick's step, after the groups are known (`sync`): a twin is made for
   * each source a group's views show, and each twin follows its source.
   */
  frame(): void {
    if (this.#slots.size === 0) {
      return;
    }
    for (const state of this.#slots.values()) {
      for (const source of [...state.sources]) {
        if (!this.world.hasDraw(source.handle)) {
          continue;
        }
        for (const group of state.groups.values()) {
          if (group.key === state.primary) {
            continue;
          }
          let twin = source.twins.get(group);
          if (
            !twin &&
            ((source.view | source.caster) & group.mask) !== 0 &&
            !this.#failed.has(group)
          ) {
            twin = this.#make(source, group);
          }
          if (twin) {
            this.#mirror(source, twin);
          }
        }
      }
    }
  }

  /** The world is gone. */
  clear(): void {
    this.#slots.clear();
    this.#sources.clear();
    this.#twins.clear();
    this.#failed.clear();
    this.#assigning = undefined;
  }

  // ---------------------------------------------------------------- internals

  /** Groups whose twins the world had no room for (said once, not tried again until the groups change). */
  readonly #failed = new Set<ViewGroup>();

  #slotOfDraw(index: number): number {
    const { raster, scene } = this.world;
    return scene.transformAnchor[
      raster.recordsU32[index * RECORD_WORDS + TRANSFORM_WORD]!
    ]!;
  }

  /** Whether a draw can be twinned: a mesh, not a point set, patch draw, billboard or instanced draw. */
  #eligible(index: number): boolean {
    const batch = this.world.raster.drawBatches[index];
    return (
      batch !== undefined &&
      !batch.points &&
      !batch.patches &&
      !batch.billboard &&
      !batch.instanced
    );
  }

  /** Says once that a draw of a kind with no per-view variant is drawn as the primary group's route draws it. */
  #unserved(index: number): void {
    const batch = this.world.raster.drawBatches[index];
    if (batch && (batch.billboard || batch.instanced || batch.patches)) {
      this.warps.say(
        "variants:kinds",
        "warp: billboards, instanced draws and patch draws are drawn by the route of the first view that crosses a smooth edge, in every view of their anchor (only mesh draws have one draw for each shape of route).",
      );
    }
  }

  /** Notes a draw as a source under the anchor, with the masks it has. */
  #adopt(slot: number, state: SlotState, index: number): Source {
    const { raster, scene } = this.world;
    const o = index * RECORD_WORDS;
    const source: Source = {
      slot,
      handle: {
        index,
        generation: raster.drawGeneration[index]!,
        name: scene.names[index],
      },
      view: raster.recordsU32[o + VIEW_MASK_WORD]!,
      caster: raster.recordsU32[o + CASTER_MASK_WORD]!,
      twins: new Map(),
    };
    state.sources.add(source);
    this.#sources.set(index, source);
    return source;
  }

  /** The draws under the anchor now are sources. */
  #activate(slot: number, state: SlotState): void {
    const { raster } = this.world;
    for (let index = 0; index < raster.drawCount; index++) {
      if (
        raster.drawBatches[index] !== undefined &&
        !this.#twins.has(index) &&
        !this.#sources.has(index) &&
        this.#slotOfDraw(index) === slot
      ) {
        if (this.#eligible(index)) {
          this.#adopt(slot, state, index);
        } else {
          this.#unserved(index);
        }
      }
    }
  }

  /** Writes the masks a source and its twins show now: the owner's, narrowed to each group's views. */
  #apply(source: Source): void {
    this.world.setViewMask(source.handle, source.view);
    this.world.setCasterMask(source.handle, source.caster);
  }

  /** The anchor's views agree again (or no view crosses a smooth edge): its twins go and its sources show what the owner asked. */
  #dissolve(slot: number): void {
    const state = this.#slots.get(slot)!;
    this.#slots.delete(slot);
    for (const source of [...state.sources]) {
      this.#sources.delete(source.handle.index);
      for (const twin of [...source.twins.values()]) {
        this.world.removeDraw(twin.handle);
      }
      if (this.world.hasDraw(source.handle)) {
        this.world.setViewMask(source.handle, source.view);
        this.world.setCasterMask(source.handle, source.caster);
      }
    }
    for (const group of state.groups.values()) {
      this.#failed.delete(group);
    }
  }

  #removeTwins(state: SlotState, group: ViewGroup): void {
    for (const source of state.sources) {
      const twin = source.twins.get(group);
      if (twin) {
        this.world.removeDraw(twin.handle);
      }
    }
    this.#failed.delete(group);
  }

  #make(source: Source, group: ViewGroup): Twin | undefined {
    this.#assigning = group.slot;
    let handle: DrawHandle | undefined;
    try {
      handle = this.world.twinDraw(source.handle);
    } catch (error) {
      if (!isCapacityError(error)) {
        throw error;
      }
      this.#failed.add(group);
      this.warps.say(
        `variants:capacity:${group.key}`,
        `warp: no room for a draw of a view whose route has another shape (${error.message}); those views show no such content.`,
      );
      return undefined;
    } finally {
      this.#assigning = undefined;
    }
    if (!handle) {
      return undefined;
    }
    const twin: Twin = { handle, group, memo: {} };
    source.twins.set(group, twin);
    this.#twins.set(handle.index, { source, twin });
    this.world.setViewMask(handle, source.view & group.mask);
    this.world.setCasterMask(handle, source.caster & group.mask);
    return twin;
  }

  /** The twin draws what its source does: material, shader, record and what the warp scheduler holds of the draw. */
  #mirror(source: Source, twin: Twin): void {
    const { raster } = this.world;
    const from = raster.drawBatches[source.handle.index];
    const to = raster.drawBatches[twin.handle.index];
    if (!from || !to) {
      return;
    }
    if (
      from.mesh !== to.mesh ||
      from.textureSet !== to.textureSet ||
      from.doubleSided !== to.doubleSided
    ) {
      // Not a change a twin follows: it is made again from the source.
      this.world.removeDraw(twin.handle);
      return;
    }
    if (from.material !== to.material) {
      this.world.setDrawMaterial(twin.handle, from.material);
    }
    if (from.shader !== to.shader) {
      this.world.setDrawShader(twin.handle, from.shader);
    }
    if (
      raster.drawConstants.mirror(
        twin.handle.index,
        source.handle.index,
        OWNED,
        RecordFlags.hidden,
      )
    ) {
      this.world.markDirty(twin.handle.index);
    }
    this.warps.mirror(source.handle, twin.handle, twin.memo);
  }
}
