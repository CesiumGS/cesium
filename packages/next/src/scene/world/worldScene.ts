// A world's scene data: what exists and where, whichever renderer draws it. The
// rasterizer's half is `WorldRaster`.
import { MAX_ANCHORS, MATERIAL_SIZE } from "../../render/layout.ts";
import type {
  AnchorHandle,
  TransformFrameKey,
  DrawPlacement,
  ParameterSlot,
} from "./types.ts";
import type { PlacementParameter } from "../placement.ts";
import type { FeatureTable } from "../../io/gltfTypes.ts";

/** One per world, made once with it, and filled by its constructor. */
export class WorldScene {
  transformLocal!: Float64Array;
  transformWorld!: Float64Array;
  transformParent!: Int32Array;
  readonly transformChildren: Array<number[] | undefined> = [];
  transformGeneration!: Uint32Array;
  transformLive!: Uint8Array;
  /** Hidden by itself, and by itself or an ancestor. */
  transformHidden!: Uint8Array;
  transformHiddenWorld!: Uint8Array;
  /**
   * The anchor slot a transform hangs under (0: none), inherited from its
   * parent; an anchor's own slot for an anchor.
   */
  transformAnchor!: Uint8Array;
  /** Anchors by slot; slot 0 ("no anchor") stays empty. */
  readonly anchorSlots: Array<AnchorHandle | undefined> = [];
  /** Anchors' places in the table root, by slot (16 float64 each). */
  readonly anchorPlaces = new Float64Array(MAX_ANCHORS * 16);
  readonly bodyAnchors = new Map<string, AnchorHandle>();
  anchorList: readonly AnchorHandle[] | undefined;
  /** `frameOf`'s keys by transform slot. */
  readonly transformFrames = new Map<number, TransformFrameKey>();
  transformRevision_ = 0;
  anchorPlaceRevision_ = 0;
  contentRevision_ = 0;
  readonly transformPending: number[] = [];
  transformPendingFlag!: Uint8Array;
  transformStamp!: Uint32Array;
  transformResolve = 0;
  transformCount = 0;
  readonly freeTransforms: number[] = [];
  /** Each draw's per-vertex placement, by draw slot (`setPlacement`). */
  readonly drawPlacements: Array<DrawPlacement | undefined> = [];
  /** This world's placement parameters: their float and their draws. */
  readonly parameters = new WeakMap<PlacementParameter, ParameterSlot>();
  materialCount = 0;
  readonly freeMaterials: number[] = [];
  /** Shared materials: slot by record key, key and references by slot. */
  readonly materialByKey = new Map<string, number>();
  readonly materialKeys: Array<string | undefined> = [];
  readonly materialReferences: number[] = [];
  readonly materialScratch = (() => {
    const data = new ArrayBuffer(MATERIAL_SIZE);
    return { f32: new Float32Array(data), u32: new Uint32Array(data) };
  })();
  /** Slab ranges per mesh id, as [byte offset, byte size]. */
  readonly meshRanges = new Map<
    number,
    {
      slab: number;
      vertex: Array<[number, number]>;
      index: [number, number];
      /** Its feature table's columns (`tableColumns`), shared. */
      table?: FeatureTable;
      /** Its named attributes' components (a dual position's check). */
      named?: Map<string, number>;
    }
  >();
  /**
   * Feature tables' columns in the arena (directory entries: hash, offset,
   * components with `TABLE_PROPERTY`), shared by the meshes using them.
   */
  readonly tableColumns = new Map<
    string,
    {
      entries: number[][];
      ranges: Array<[number, number]>;
      meshes: number;
      /** The strings its string columns hold references on (`stringIds`). */
      strings: string[];
      /** Columns left out, by name, with why (`warnUnavailable`). */
      skipped: Map<string, string>;
    }
  >();
  /** An id per feature table object, for `tableColumns`' slab keys. */
  readonly tableIds = new WeakMap<FeatureTable, number>();
  nextTableId = 1;
  readonly names: Array<string | undefined> = [];
  readonly featureTables: Array<FeatureTable | undefined> = [];
  /**
   * Global feature-ID ranges in allocation order (so sorted by first ID):
   * first ID and draw index, for resolving picks by binary search.
   */
  readonly featureRangeFirst: number[] = [];
  readonly featureRangeDraw: number[] = [];
  readonly drawFeatureFirst: number[] = [];
  nextFeatureId = 1;
  maxClipBlocks!: number;
  /**
   * Block 0 is the terrain clip regions' directory (`addTerrainClipRegion`),
   * reserved so the shaders find it without a binding of its own. Blocks
   * past it are placeholders' (one each) or terrain regions' (runs); each
   * kind keeps its own free list, so placeholders don't break up the runs
   * regions free.
   */
  clipBlockCount = 1;
  /** Placeholders' free blocks. */
  readonly freeClipBlocks: number[] = [];
  /** Blocks placeholders hold, and the most they may. */
  placeholderBlocks = 0;
  placeholderCapacity!: number;
  /** Free runs terrain regions left: sorted by block, never touching. */
  readonly freeClipRuns: Array<{ block: number; blocks: number }> = [];
  /** Blocks terrain regions hold, and the most they may. */
  terrainClipBlocks = 0;
  terrainClipBudget!: number;
  /**
   * Terrain regions by slot: their first block, block count and rows
   * (kept to move them: only the directory points at them), their opacity
   * (0 to 1) and whether they hold everywhere (no rows, no blocks).
   */
  readonly terrainClipRuns: Array<
    | {
        block: number;
        blocks: number;
        rows: Float32Array;
        opacity: number;
        ground: boolean;
        everywhere: boolean;
      }
    | undefined
  > = [];
  nextMeshId = 0;
  anchorRemovals_ = 0;
}
