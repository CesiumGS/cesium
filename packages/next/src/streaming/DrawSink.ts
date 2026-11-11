// What content asks of the place it draws in, and of the engine that hosts it:
// adding, updating and removing draws, with no GPU types. `World` and `Engine`
// satisfy these as they are; content names these instead of them.
import type { GltfAsset } from "../io/gltfTypes.ts";
import type { MeshData } from "../scene/meshes.ts";
import type { EngineScene } from "../scene/engineScene.ts";
import type {
  ModelResource,
  ModelResourceOptions,
} from "../scene/gltfModel.ts";
import type {
  ClipBox,
  ClipHandle,
  DrawHandle,
  DrawOptions,
  MeshHandle,
  TransformHandle,
} from "../scene/world/types.ts";
import type { RequestScheduler } from "./RequestScheduler.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import type { AccelerationStructures } from "./acceleration.ts";

/** Draws, their meshes, transforms and clips, as content changes them. */
export interface DrawSink {
  readonly acceleration: AccelerationStructures;
  /** Bumped when draws change what a view shows. */
  readonly version: number;
  readonly contentRevision: number;
  /** What one draw costs the world's tables, in bytes (`RECORD_SIZE` and the like). */
  readonly drawOverheadBytes: number;
  addMesh(mesh: MeshData): MeshHandle;
  removeMesh(mesh: MeshHandle): number;
  addTransform(
    matrix: ArrayLike<number>,
    parent?: TransformHandle,
  ): TransformHandle;
  removeTransform(handle: TransformHandle): void;
  addDraw(options: DrawOptions): DrawHandle;
  removeDraw(handle: DrawHandle): void;
  /**
   * A tile's geometric error (m): the budget its draw's warp fit shares
   * (`max(1 mm, error / 64)`). Optional: a sink with no warps ignores it.
   */
  setDrawGeometricError?(handle: DrawHandle, error: number): void;
  drawMatrix<T extends Float64Array = Float64Array<ArrayBuffer>>(
    handle: DrawHandle,
    out?: T,
  ): T | undefined;
  drawMaterial(handle: DrawHandle): number | undefined;
  setDrawMaterial(handle: DrawHandle, material: number): void;
  materialWithFlags(material: number, flags: number): number;
  setColor(handle: DrawHandle, color: ArrayLike<number>): void;
  setCollision(handle: DrawHandle, collision: boolean): void;
  setGround(handle: DrawHandle, ground: boolean): void;
  setTerrainClip(handle: DrawHandle, mask: number): void;
  allocateClip(boxes: readonly ClipBox[]): ClipHandle | undefined;
  freeClip(clip: ClipHandle): void;
  /** How full the fullest of the world's pools is, and which. */
  pressure(): { fraction: number; pool: string };
}

/** What streaming reads of the engine that runs it. */
export interface TilesetHost {
  readonly requests: RequestScheduler;
  readonly tilesets: readonly Tileset3D[];
  readonly uploadBytesPerFrame: number;
  readonly scene: Pick<EngineScene, "uploadBudget">;
  loadGltf(
    url: string | URL,
    options?: { headers?: Record<string, string>; signal?: AbortSignal },
  ): Promise<GltfAsset>;
  uploadModel(
    world: DrawSink,
    asset: GltfAsset,
    options?: ModelResourceOptions,
  ): ModelResource;
  wake(): void;
}
