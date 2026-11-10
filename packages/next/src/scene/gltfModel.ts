// Symbol.dispose and DisposableStack where the browser lacks them (Safari).
import "../core/disposeShim.ts";
import { MipGenerator } from "../gpu/MipGenerator.ts";
import { MaterialFlags } from "../render/layout.ts";
import * as m4 from "../math/mat4.ts";
import * as v3 from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import { Ellipsoid, fromDegrees } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type {
  CompressedFormat,
  CompressedImage,
  FeatureTable,
  GltfAsset,
  GltfAssetPart,
  GltfDraw,
  GltfImage,
  GltfLight,
  GltfMaterial,
  GltfSampler,
} from "../io/gltfTypes.ts";
import type { RenderContext } from "./RenderContext.ts";
import type {
  Clamp,
  HeightClamping,
  HeightReference,
} from "./HeightClamping.ts";
import type { LightHandle } from "./lights.ts";
import { contentAnchor, earthAnchor } from "./earthAnchor.ts";
import type { World } from "./World.ts";
import type {
  AnchorHandle,
  DrawHandle,
  InstanceOptions,
  MaterialOptions,
  MeshHandle,
  TextureBinding,
  TextureSetOptions,
  TransformHandle,
} from "./world/types.ts";
import type { CustomShader } from "./CustomShader.ts";

/**
 * How a model is uploaded (`engine.loadModel`, `engine.uploadModel`): what
 * belongs to the data, the same for every placement of it.
 */
export interface ModelResourceOptions {
  /**
   * How color textures are decoded: "srgb" (default) uses -srgb texture
   * formats; "gamma2.2" matches CesiumJS 1.x (unorm storage, pow 2.2 in the
   * shader, filtering in gamma space).
   */
  colorTransfer?: "srgb" | "gamma2.2";
  /**
   * The data's axis convention: "gltf" (default) is y-up, z-forward like
   * 1.x `Model`; "3d-tiles" is tile content (b3dm/glb in a tileset), y-up,
   * x-forward, like 1.x `Cesium3DTileset`; "3d-tiles-x-up": tile content of
   * a tileset with `asset.gltfUpAxis` "X"; "none": already in the frame of
   * the placement's matrix (terrain, georeferenced data, `gltfUpAxis` "Z").
   */
  axes?: "gltf" | "3d-tiles" | "3d-tiles-x-up" | "none";
  /**
   * Close the asset's decoded images once they are on the GPU (default
   * true), freeing the CPU copy; the asset can't be uploaded again. False
   * keeps them until `releaseSourceData()`. Freeing source data is the
   * caller's explicit choice, as Filament's `releaseSourceData()` and
   * Unity's `UploadMeshData(markNoLongerReadable)`.
   */
  releaseSourceData?: boolean;
  /** A name, for the inspector and warnings. */
  name?: string;
}

/** Where a placement stands: a matrix, or a place on the ellipsoid. */
type PlacementWhere =
  | {
      /**
       * Float64 transform (e.g. an east-north-up frame): in its anchor's
       * coordinates (Earth-fixed under the Earth's, the default), or
       * relative to `parent`.
       */
      modelMatrix: Mat4;
      at?: never;
    }
  | {
      /** An east-north-up frame there: degrees, and meters (default 0). */
      at: { longitude: number; latitude: number; height?: number };
      modelMatrix?: never;
    };

/** What a placement hangs from: a parent transform, or the ground. */
type PlacementAnchor =
  | {
      /** A transform the model hangs off (e.g. a tileset's root). */
      parent?: TransformHandle;
      heightReference?: never;
      heightOffset?: never;
    }
  | {
      /**
       * How the model's height relates to the ground (1.x
       * `heightReference`), anchored at its translation; kept current as
       * terrain and 3D Tiles load. Not with a `parent`.
       */
      heightReference: HeightReference;
      /**
       * Meters above the ground: added to "clamp" references, replacing the
       * anchor's own height for "relative" ones.
       */
      heightOffset?: number;
      parent?: never;
    };

interface PlacementCommon {
  /**
   * The anchor it hangs under (`World.addAnchor`, `World.bodyAnchor`):
   * default the Earth's, so `modelMatrix` and `at` are Earth-fixed. With a
   * `parent`, the parent's anchor; one given must be it. A `heightReference`
   * clamps to the Earth's ground, so only under the Earth's anchor.
   */
  anchor?: AnchorHandle;
  /** Unlit shading for every draw (1.x `LightingModel.UNLIT`). */
  unlit?: boolean;
  /** Custom shader stages for every draw (`setShader` changes them). */
  shader?: CustomShader;
  /** Ground for height captures (default true; `DrawOptions.ground`). */
  ground?: boolean;
  name?: string;
  /** Initial view mask of every draw (default: all views). */
  viewMask?: number;
  /**
   * Draws the model once per instance (GPU instancing, culled per
   * instance): one draw per primitive however many instances. Matrices are
   * in the placement's frame (e.g. east-north-up offsets), applied before
   * the axis correction, like 1.x `ModelInstanceCollection` instances
   * relative to a shared frame.
   */
  instances?: ModelInstances;
}

/**
 * How a model is placed (`ModelResource.place`). A matrix or a place, and
 * a parent or a height reference: each pair one or the other, in the type.
 */
export type PlacementOptions = PlacementCommon &
  PlacementWhere &
  PlacementAnchor;

/** Placement options only engine content uses (tiles, terrain). */
export type InternalPlacementOptions = PlacementOptions & {
  /** Ray casts may hit it (tilesets with `enableCollision`). */
  collision?: boolean;
  /** Drawn behind all other content (the bare ellipsoid's tiles). */
  underlay?: boolean;
};

/** GPU instances of a whole model (`PlacementOptions.instances`). */
export interface ModelInstances {
  /** Column-major 4×4 affine matrices, 16 numbers per instance. */
  matrices: ArrayLike<number>;
  /** Linear RGBA tint per instance, 4 numbers each. */
  tints?: ArrayLike<number>;
  /** Local feature ID per instance (picking and styling per instance). */
  featureIds?: ArrayLike<number>;
  /** Drawn only within / beyond a distance (`InstanceOptions`). */
  visibleWithin?: number;
  visibleBeyond?: number;
}

/** A primitive's node frame, to express model-space instances in it. */
interface InstanceFrame {
  local: Float64Array;
  inverse: Float64Array;
  /** The primitive's own `EXT_mesh_gpu_instancing` instances, if any. */
  gltf?: Float32Array;
}

/**
 * A glTF asset's GPU resources in one world: uploaded once, shared by all
 * of a `ModelResource`'s placements, freed with it.
 */
interface UploadedAsset {
  meshes: MeshHandle[];
  materials: number[];
  textureSets: number[];
  textures: GPUTexture[];
  /** Texture sets with property textures, by `${material}|${mesh}`. */
  propertySets: Map<string, number>;
  /** Per glTF material, and the default material last. */
  readonly drawMaterials: Array<{
    index: number;
    textureSet: number;
    doubleSided: boolean;
  }>;
  bytes: number;
}

/**
 * What placing needs from a parsed asset, kept by its `ModelResource`: the
 * node tree, lights and feature tables, not the geometry or images (on the
 * GPU already), so a held model doesn't keep its CPU data alive.
 */
interface PlacementTemplate {
  draws: GltfDraw[];
  lights: GltfLight[];
  /** At least one: a composite's inner tiles, or the asset itself. */
  parts: GltfAssetPart[];
  /** Per draw, the feature table of its mesh, if any. */
  drawTables: Array<FeatureTable | undefined>;
  /** The first table (i3dm's batch table, for its instances). */
  firstTable?: FeatureTable;
}

/** What a placement's engine provides: its context and ground clamping. */
export interface ModelHost {
  readonly ctx: RenderContext;
  readonly clamping: HeightClamping;
}

/** A model's state, shared with the inspector and the leak check. */
export interface ModelUsage {
  name: string;
  bytes: number;
  placements: number;
  released: boolean;
  freed: boolean;
  /** Garbage-collected without `release()`: its GPU memory stays. */
  leaked: boolean;
}

/** The leak check's view of a model: its state and (weakly) its world. */
interface Tracked {
  state: ModelUsage;
  world: WeakRef<World>;
}

/** Each world's models, for the inspector (`modelUsage`). */
const models = new WeakMap<World, Set<ModelUsage>>();

/**
 * Models garbage-collected without `release()`: their GPU memory stays
 * until the world is destroyed, so say so (the handle is the caller's to
 * release, as a file handle is).
 */
const leakCheck =
  typeof FinalizationRegistry === "undefined"
    ? undefined
    : new FinalizationRegistry<Tracked>(({ state, world }) => {
        // A destroyed world took its models' GPU memory with it.
        const alive = world.deref();
        if (state.released || state.freed || !alive || alive.destroyed) {
          return;
        }
        state.leaked = true;
        console.warn(
          `ModelResource "${state.name}" was garbage-collected without release(): its ${(state.bytes / 1048576).toFixed(1)} MB of GPU memory stays until its world is destroyed.`,
        );
      });

/**
 * A world's models: name, GPU bytes, placements, and whether released or
 * leaked (the inspector's memory section).
 */
export function modelUsage(world: World): ModelUsage[] {
  return [...(models.get(world) ?? [])].map((m) => ({ ...m }));
}

/** Assets whose decoded images an upload closed (`releaseSourceData`). */
const sourceReleased = new WeakSet<GltfAsset>();

/**
 * A glTF asset uploaded into one world: its meshes, materials and textures
 * on the GPU, placed any number of times (`place`). The handle is the
 * caller's reference: the model is freed once it is released and no
 * placements remain, so removing placements never frees a model still
 * held, and a one-off model is released right after placing it (the
 * placement keeps it):
 *
 * ```ts
 * using model = await engine.loadModel(world, url);
 * model.place({ modelMatrix }); // freed when this placement is removed
 * ```
 *
 * As a handle in Bevy (`Handle<T>`) or Filament (`FilamentAsset`): uploads
 * are explicit and owned, never shared behind the caller's back.
 */
export class ModelResource implements Disposable {
  readonly world: World;
  readonly name: string | undefined;
  readonly colorTransfer: "srgb" | "gamma2.2";
  readonly axes: NonNullable<ModelResourceOptions["axes"]>;
  /** @internal The GPU resources. */
  readonly upload: UploadedAsset;
  /** @internal What placing needs. */
  readonly template: PlacementTemplate;
  /** @internal The engine's context and clamping. */
  readonly host: ModelHost;
  /** The asset until its source data is released. */
  private asset: GltfAsset | undefined;
  private readonly state: ModelUsage;

  /** @internal Use `engine.loadModel` or `engine.uploadModel`. */
  constructor(
    host: ModelHost,
    world: World,
    asset: GltfAsset,
    upload: UploadedAsset,
    options: ModelResourceOptions,
  ) {
    this.host = host;
    this.world = world;
    this.asset = asset;
    this.upload = upload;
    this.name = options.name;
    this.colorTransfer = options.colorTransfer ?? "srgb";
    this.axes = options.axes ?? "gltf";
    this.template = {
      draws: asset.draws,
      lights: asset.lights ?? [],
      parts: asset.parts ?? [
        {
          ...(asset.rtcCenter ? { rtcCenter: asset.rtcCenter } : {}),
          ...(asset.instances ? { instances: asset.instances } : {}),
        },
      ],
      drawTables: asset.draws.map((d) => {
        const table = asset.meshes[d.mesh]?.featureTable;
        return table !== undefined ? asset.featureTables[table] : undefined;
      }),
      ...(asset.featureTables[0] ? { firstTable: asset.featureTables[0] } : {}),
    };
    this.state = {
      name: options.name ?? "model",
      bytes: upload.bytes,
      placements: 0,
      released: false,
      freed: false,
      leaked: false,
    };
    let set = models.get(world);
    if (!set) {
      set = new Set();
      models.set(world, set);
    }
    set.add(this.state);
    leakCheck?.register(
      this,
      { state: this.state, world: new WeakRef(world) },
      this.state,
    );
  }

  /** GPU bytes: arena geometry plus textures, shared by its placements. */
  get bytes(): number {
    return this.upload.bytes;
  }

  /** Placements not yet removed. */
  get placementCount(): number {
    return this.state.placements;
  }

  /** The handle was released (`release`); it can't place any more. */
  get released(): boolean {
    return this.state.released;
  }

  /** Its GPU resources are freed (released, and no placements left). */
  get freed(): boolean {
    return this.state.freed;
  }

  /** Places it in its world: one root transform and a draw per primitive. */
  place(options: PlacementOptions): ModelPlacement {
    return placeModel(this, options);
  }

  /**
   * Closes the asset's decoded images (when `releaseSourceData: false`
   * kept them): the CPU copy freed, the asset no longer uploadable.
   */
  releaseSourceData(): void {
    const asset = this.asset;
    if (!asset) {
      return;
    }
    this.asset = undefined;
    closeImages(asset.images);
    sourceReleased.add(asset);
  }

  /**
   * Gives up the handle: the model is freed now, or with its last
   * placement. Placing from a released handle throws.
   */
  release(): void {
    if (this.state.released) {
      return;
    }
    this.state.released = true;
    leakCheck?.unregister(this.state);
    this.freeIfUnused();
  }

  [Symbol.dispose](): void {
    this.release();
  }

  /** @internal A placement was added. */
  placed(): void {
    this.state.placements++;
  }

  /** @internal A placement was removed. */
  unplaced(): void {
    this.state.placements--;
    this.freeIfUnused();
  }

  private freeIfUnused(): void {
    if (!this.state.released || this.state.placements > 0 || this.state.freed) {
      return;
    }
    this.state.freed = true;
    models.get(this.world)?.delete(this.state);
    freeUpload(this.world, this.upload);
  }
}

/** Closes decoded images (their CPU memory freed now, not at GC). */
function closeImages(images: GltfImage[]): void {
  for (const image of images) {
    if (image instanceof ImageBitmap) {
      image.close();
    }
  }
}

/**
 * glTF is y-up and z-forward; CesiumJS 1.x maps it to z-up, x-forward with
 * `Y_UP_TO_Z_UP × Z_UP_TO_X_UP` (ModelUtility.getAxisCorrectionMatrix).
 * Column-major, matching 1.x `Axis`.
 */
const Y_UP_TO_Z_UP = Float64Array.from([
  1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1,
]);
const Z_UP_TO_X_UP = Float64Array.from([
  0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1,
]);
const AXIS_CORRECTION = m4.multiply(m4.mat4(), Y_UP_TO_Z_UP, Z_UP_TO_X_UP);
const X_UP_TO_Z_UP = Float64Array.from([
  0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1,
]);

/**
 * Uploads a parsed glTF asset into a world: textures (sRGB where glTF says
 * so, with mips), materials and texture sets, and meshes, as a
 * `ModelResource` the caller owns. Transactional (§13.15): an upload that
 * runs out of room releases what it took and leaves the asset as it was,
 * so streaming can retry the tile once eviction frees room.
 */
export function uploadModel(
  host: ModelHost,
  world: World,
  asset: GltfAsset,
  options: ModelResourceOptions = {},
): ModelResource {
  if (sourceReleased.has(asset)) {
    throw new Error(
      "uploadModel: this asset's source data (its decoded images) was released by an earlier upload; place that ModelResource, or load the asset again.",
    );
  }
  const gamma22 = options.colorTransfer === "gamma2.2";
  const textures = new TextureUploader(host.ctx, asset);
  const taken = {
    materials: [] as number[],
    textureSets: [] as number[],
    meshes: [] as MeshHandle[],
  };
  let upload: UploadedAsset;
  try {
    upload = uploadAssetInto(host.ctx, world, asset, gamma22, textures, taken);
  } catch (error) {
    for (const mesh of taken.meshes) {
      world.removeMesh(mesh);
    }
    for (const material of taken.materials) {
      world.removeMaterial(material);
    }
    for (const set of taken.textureSets) {
      world.removeTextureSet(set);
    }
    // The images stay open: a retry of the same asset uploads them again.
    for (const texture of textures.textures) {
      texture.destroy();
    }
    throw error;
  }
  const model = new ModelResource(host, world, asset, upload, options);
  if (options.releaseSourceData !== false) {
    model.releaseSourceData();
  }
  return model;
}

function uploadAssetInto(
  ctx: RenderContext,
  world: World,
  asset: GltfAsset,
  gamma22: boolean,
  textures: TextureUploader,
  taken: { materials: number[]; textureSets: number[]; meshes: MeshHandle[] },
): UploadedAsset {
  const addMaterial = (options: MaterialOptions) => {
    const index = world.addMaterial(options);
    taken.materials.push(index);
    return index;
  };
  const createTextureSet = (options: TextureSetOptions) => {
    const index = world.createTextureSet(options);
    taken.textureSets.push(index);
    return index;
  };
  const setOptions = asset.materials.map((m): TextureSetOptions => ({
    baseColor: textures.binding(m.baseColorTexture, !gamma22),
    metallicRoughness: textures.binding(m.metallicRoughnessTexture, false),
    normal: textures.binding(m.normalTexture, false),
    occlusion: textures.binding(m.occlusionTexture, false),
    emissive: textures.binding(m.emissiveTexture, !gamma22),
  }));
  const materials = asset.materials.map((m, i) => ({
    // Its textures by reference (World.textureRefs, the bindless seam).
    index: addMaterial({
      ...materialData(m, gamma22),
      textures: world.textureRefs(setOptions[i]!),
    }),
    textureSet: createTextureSet(setOptions[i]!),
    doubleSided: m.doubleSided,
  }));
  // glTF default material: white, metallic 1, roughness 1. Shared by
  // content (World.addMaterial), so one slot serves every asset.
  const defaultMaterial = {
    index: addMaterial({ metallic: 1, roughness: 1 }),
    textureSet: 0,
    doubleSided: false,
  };
  const arenaBefore = world.arenaBytes;
  // Property textures: each mesh's (at most 2) bound in its texture sets.
  const propertyTextures = asset.meshes.map((mesh) =>
    [...new Set((mesh.propertyTextures ?? []).map((p) => p.texture))].slice(
      0,
      2,
    ),
  );
  const meshes: MeshHandle[] = asset.meshes.map((mesh, m) => {
    const slots = propertyTextures[m]!;
    // Its features' table (as the draws' `features`), for custom shaders.
    const table =
      mesh.featureTable !== undefined
        ? asset.featureTables[mesh.featureTable]
        : asset.instances
          ? asset.featureTables[0]
          : undefined;
    const handle = world.addMesh({
      ...mesh,
      featureTable: table,
      propertyTextures: (mesh.propertyTextures ?? [])
        .filter((p) => slots.includes(p.texture))
        .map(({ texture, ...p }) => ({ ...p, slot: slots.indexOf(texture) })),
    });
    taken.meshes.push(handle);
    return handle;
  });
  // A texture set per material and mesh with property textures: the
  // material's textures and the mesh's property textures.
  const propertySets = new Map<string, number>();
  for (const draw of asset.draws) {
    const slots = propertyTextures[draw.mesh]!;
    const key = `${draw.material}|${draw.mesh}`;
    if (slots.length === 0 || propertySets.has(key)) {
      continue;
    }
    propertySets.set(
      key,
      createTextureSet({
        ...(draw.material >= 0 ? setOptions[draw.material] : {}),
        properties: slots.map((t) => textures.binding(t, false)),
      }),
    );
  }
  const arenaBytes = world.arenaBytes - arenaBefore;
  return {
    meshes,
    materials: [...materials.map((m) => m.index), defaultMaterial.index],
    textureSets: [
      ...materials.map((m) => m.textureSet),
      ...propertySets.values(),
    ],
    propertySets,
    textures: textures.textures,
    drawMaterials: [...materials, defaultMaterial],
    bytes: arenaBytes + textures.bytes,
  };
}

/**
 * Places a model in its world: a root transform (`modelMatrix` or `at`), a
 * transform per node below it and one draw per node primitive. Transforms
 * compose in float64, so large Earth-fixed coordinates never reach
 * float32. `EXT_mesh_gpu_instancing` nodes draw their mesh once per
 * instance, culled per instance on the GPU. Transactional, as the upload
 * (§13.15): a placement that runs out of draws or transforms removes what
 * it placed.
 */
export function placeModel(
  model: ModelResource,
  options: InternalPlacementOptions,
): ModelPlacement {
  if (model.released) {
    throw new Error(
      `ModelResource "${model.name ?? "model"}" was released: it can't be placed. Keep the handle while placing, and release it after.`,
    );
  }
  // The type allows one or the other; JavaScript callers can pass both.
  const both = options as { parent?: unknown; heightReference?: string };
  if (both.parent && both.heightReference && both.heightReference !== "none") {
    throw new Error("place: a heightReference needs a model without parent");
  }
  const world = model.world;
  if (options.anchor !== undefined) {
    const anchor = contentAnchor(world, options.anchor, "place");
    if (options.parent) {
      const under = world.anchorOf(options.parent);
      if (under !== anchor) {
        throw new Error(
          `place: the parent hangs under ${under?.name ?? "no anchor"}, not ${anchor.name}; leave out the anchor, or give the parent's.`,
        );
      }
    } else if (
      both.heightReference &&
      both.heightReference !== "none" &&
      anchor !== earthAnchor(world)
    ) {
      throw new Error(
        `place: a heightReference clamps to the Earth's ground; ${anchor.name} is not the Earth's anchor.`,
      );
    }
  }
  const placed: { draws: DrawHandle[]; lights: LightHandle[] } = {
    draws: [],
    lights: [],
  };
  let root: TransformHandle | undefined;
  try {
    const placement = placeGltf(model, options, placed, (handle) => {
      root = handle;
    });
    model.placed();
    return placement;
  } catch (error) {
    for (const light of placed.lights) {
      world.removeLight(light);
    }
    for (const draw of placed.draws) {
      world.removeDraw(draw);
    }
    if (root) {
      world.removeTransform(root);
    }
    throw error;
  }
}

/** The placement's matrix: `modelMatrix`, or east-north-up at `at`. */
function placementMatrix(options: PlacementOptions): Mat4 {
  if (options.modelMatrix) {
    return options.modelMatrix;
  }
  const { longitude, latitude, height = 0 } = options.at!;
  const ellipsoid = Ellipsoid.WGS84;
  return eastNorthUpToFixedFrame(
    ellipsoid.cartographicToCartesian(
      fromDegrees(longitude, latitude, height),
      v3.vec3(),
    ),
    ellipsoid,
    m4.mat4(),
  );
}

function placeGltf(
  model: ModelResource,
  options: InternalPlacementOptions,
  placed: { draws: DrawHandle[]; lights: LightHandle[] },
  onRoot: (root: TransformHandle) => void,
): ModelPlacement {
  const { world, upload, template: asset } = model;
  const modelMatrix = placementMatrix(options);
  const composite = asset.parts.length > 1;
  // i3dm content: its instances, relative to their origin in tile space.
  const contentInstances = (part: GltfAssetPart) =>
    options.instances === undefined ? part.instances : undefined;
  const originOf = (instances: NonNullable<GltfAssetPart["instances"]>) => {
    const translation = m4.mat4();
    translation[12] = instances.origin[0];
    translation[13] = instances.origin[1];
    translation[14] = instances.origin[2];
    return translation;
  };
  // One part's origin is the placement's root; a composite's are below it.
  const only = composite ? undefined : contentInstances(asset.parts[0]!);
  const root = world.addTransform(
    only ? m4.multiply(m4.mat4(), modelMatrix, originOf(only)) : modelMatrix,
    options.parent ?? contentAnchor(world, options.anchor, "place"),
  );
  onRoot(root);
  const rootWorld = world.worldMatrix(root);
  const parts = asset.parts.map((part) => {
    const instances = contentInstances(part);
    const frame =
      composite && instances
        ? world.addTransform(originOf(instances), root)
        : root;
    // Below the root: RTC_CENTER × axis correction × node, as 1.x
    // ModelSceneGraph composes modelMatrix × RTC_CENTER × axis × node.
    const correction = m4.mat4();
    if (part.rtcCenter) {
      correction[12] = part.rtcCenter[0];
      correction[13] = part.rtcCenter[1];
      correction[14] = part.rtcCenter[2];
    }
    if (model.axes !== "none") {
      m4.multiply(
        correction,
        correction,
        model.axes === "3d-tiles"
          ? Y_UP_TO_Z_UP
          : model.axes === "3d-tiles-x-up"
            ? X_UP_TO_Z_UP
            : AXIS_CORRECTION,
      );
    }
    const user: ModelInstances | undefined =
      options.instances ??
      (instances
        ? { matrices: instances.matrices, featureIds: instances.featureIds }
        : undefined);
    return {
      frame,
      frameWorld: frame === root ? rootWorld : world.worldMatrix(frame),
      correction,
      user,
      spheres: [] as Array<{ center: Vec3; radius: number }>,
    };
  });
  const nodes = new Map<Float64Array, TransformHandle>();
  const draws = placed.draws;
  // `setInstance` moves one set of instances: an application's, or a lone
  // i3dm's. A composite's parts each have their own, so none.
  const instanced =
    options.instances ?? (composite ? undefined : parts[0]!.user);
  const userCount = instanced ? instanced.matrices.length / 16 : 0;
  const frames: InstanceFrame[] | undefined = instanced ? [] : undefined;
  for (let d = 0; d < asset.draws.length; d++) {
    const draw = asset.draws[d]!;
    const part = parts[draw.part ?? 0]!;
    const { user, spheres } = part;
    // One transform per node: its primitives share the node's matrix.
    const local = m4.multiply(m4.mat4(), part.correction, draw.matrix);
    let node = nodes.get(draw.matrix);
    if (!node) {
      node = world.addTransform(local, part.frame);
      nodes.set(draw.matrix, node);
    }
    const worldMatrix = m4.multiply(m4.mat4(), part.frameWorld, local);
    const material =
      upload.drawMaterials[
        draw.material >= 0 ? draw.material : upload.drawMaterials.length - 1
      ]!;
    const mesh = upload.meshes[draw.mesh]!;
    // A mirroring transform flips the winding; draw those without culling.
    const mirrored = determinant3(worldMatrix) < 0;
    const handle = world.addDraw({
      mesh,
      transform: node,
      material: material.index,
      textureSet:
        upload.propertySets.get(`${draw.material}|${draw.mesh}`) ??
        material.textureSet,
      doubleSided: material.doubleSided || mirrored,
      unlit: options.unlit,
      ...(options.shader ? { shader: options.shader } : {}),
      collision: options.collision,
      underlay: options.underlay,
      ...(options.ground === false ? { ground: false } : {}),
      name: options.name,
      viewMask: options.viewMask,
      features:
        asset.drawTables[d] ??
        (!composite && only ? asset.firstTable : undefined),
      ...(user
        ? {
            instances: modelInstances(
              user,
              local,
              draw.instances,
              frames ?? [],
            ),
          }
        : draw.instances
          ? {
              instances: {
                matrices: draw.instances,
                ...(draw.instanceFeatureIds
                  ? { featureIds: draw.instanceFeatureIds }
                  : {}),
              },
            }
          : {}),
    });
    draws.push(handle);
    const meshCenter = v3.vec3(...mesh.center);
    const placements: Mat4[] = [];
    if (draw.instances) {
      for (let k = 0; k < draw.instances.length; k += 16) {
        const instance = m4.mat4();
        instance.set(draw.instances.subarray(k, k + 16));
        placements.push(m4.multiply(instance, worldMatrix, instance));
      }
    } else {
      placements.push(worldMatrix);
    }
    for (const m of placements) {
      spheres.push({
        center: m4.transformPoint(v3.vec3(), m, meshCenter),
        radius: mesh.radius * (Math.cbrt(Math.abs(determinant3(m))) || 1),
      });
    }
  }
  // Its lights, at their nodes (one placement: not for instanced models).
  const lights = placed.lights;
  for (const light of asset.lights) {
    const part = parts[light.part ?? 0]!;
    if (part.user) {
      continue;
    }
    let node = nodes.get(light.matrix);
    if (!node) {
      node = world.addTransform(
        m4.multiply(m4.mat4(), part.correction, light.matrix),
        part.frame,
      );
      nodes.set(light.matrix, node);
    }
    lights.push(
      world.addLight({
        type: light.type,
        color: light.color,
        intensity: light.intensity,
        range: light.range,
        innerConeAngle: light.innerConeAngle,
        outerConeAngle: light.outerConeAngle,
        transform: node,
      }),
    );
  }
  const partBounds = parts.map(({ spheres, user, frameWorld }) => {
    const sphere = unionSphere(spheres);
    return user ? instanceBounds(sphere, frameWorld, user.matrices) : sphere;
  });
  const bounds = composite ? unionSphere(partBounds) : partBounds[0]!;
  const placement = new ModelPlacement(
    model,
    draws,
    lights,
    root,
    // The bounds in the root's frame: they follow it (moves, clamping).
    m4.transformPoint(
      v3.vec3(),
      m4.invertAffine(m4.mat4(), rootWorld),
      bounds.center,
    ),
    bounds.radius,
    userCount,
    frames,
  );
  const reference = options.heightReference ?? "none";
  if (reference !== "none") {
    placement.anchor(reference, options.heightOffset);
  }
  return placement;
}

/**
 * A primitive's instances for model-space instance matrices P: its draw
 * sits at root × L (L: axis correction × node), so each instance is
 * L⁻¹ × P × L in the draw's frame (× the primitive's own glTF instance G,
 * instance-major, when it has `EXT_mesh_gpu_instancing`).
 */
function modelInstances(
  user: ModelInstances,
  local: Float64Array,
  gltf: Float32Array | undefined,
  frames: InstanceFrame[],
): InstanceOptions {
  const inverse = m4.invertAffine(m4.mat4(), local);
  frames.push({ local, inverse, ...(gltf ? { gltf } : {}) });
  const count = user.matrices.length / 16;
  const perUser = gltf ? gltf.length / 16 : 1;
  const out = new Float32Array(count * perUser * 16);
  const p = new Float64Array(16);
  const m = new Float64Array(16);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 16; k++) {
      p[k] = user.matrices[i * 16 + k]!;
    }
    conjugate(m, inverse, p, local);
    for (let j = 0; j < perUser; j++) {
      const o = (i * perUser + j) * 16;
      if (gltf) {
        multiplyAffineInto(out, o, m, gltf, j * 16);
      } else {
        out.set(m, o);
      }
    }
  }
  const repeat = (values: ArrayLike<number> | undefined, width: number) => {
    if (!values || perUser === 1) {
      return values;
    }
    const r = new Float32Array(count * perUser * width);
    for (let i = 0; i < count * perUser; i++) {
      for (let k = 0; k < width; k++) {
        r[i * width + k] = values[Math.floor(i / perUser) * width + k]!;
      }
    }
    return r;
  };
  const tints = repeat(user.tints, 4);
  const featureIds = repeat(user.featureIds, 1);
  return {
    matrices: out,
    ...(tints ? { tints } : {}),
    ...(featureIds ? { featureIds } : {}),
    ...(user.visibleWithin !== undefined
      ? { visibleWithin: user.visibleWithin }
      : {}),
    ...(user.visibleBeyond !== undefined
      ? { visibleBeyond: user.visibleBeyond }
      : {}),
  };
}

/**
 * A model placed in its world (`ModelResource.place`): a root transform,
 * its draws and lights. Remove it with `remove()` (or `using`); calling
 * anything else on a removed placement throws, rather than touching
 * handles the world has given to something else.
 */
export class ModelPlacement implements Disposable {
  readonly model: ModelResource;
  /** One per node primitive. */
  readonly draws: readonly DrawHandle[];
  /** Its `KHR_lights_punctual` lights (`World.setLight` changes them). */
  readonly lights: readonly LightHandle[];
  /** The root transform; node transforms hang off it. */
  readonly transform: TransformHandle;
  /** GPU instances placed with `instances` (0: none). */
  readonly instanceCount: number;
  /** @internal Per draw, for `setInstance`. */
  readonly instanceFrames: readonly InstanceFrame[] | undefined;
  private clamp_: Clamp | undefined;
  private removed_ = false;

  /** @internal Use `ModelResource.place`. */
  constructor(
    model: ModelResource,
    draws: DrawHandle[],
    lights: LightHandle[],
    transform: TransformHandle,
    private readonly localCenter: Vec3,
    private readonly radius: number,
    instanceCount: number,
    instanceFrames: InstanceFrame[] | undefined,
  ) {
    this.model = model;
    this.draws = draws;
    this.lights = lights;
    this.transform = transform;
    this.instanceCount = instanceCount;
    this.instanceFrames = instanceFrames;
  }

  /** Its ground clamping, with a `heightReference`. */
  get clamp(): Clamp | undefined {
    return this.clamp_;
  }

  get removed(): boolean {
    return this.removed_;
  }

  /**
   * Where it stands now (moves and clamping included), in its anchor's
   * coordinates: Earth-fixed under the Earth's.
   */
  bounds(): { center: Vec3; radius: number } {
    this.alive("bounds");
    const m = this.model.world.worldMatrix(this.transform);
    return {
      center: m4.transformPoint(v3.vec3(), m, this.localCenter),
      radius: this.radius,
    };
  }

  /**
   * Moves it: in its anchor's coordinates (Earth-fixed under the Earth's),
   * or relative to its parent. A clamped placement
   * is anchored again where it now stands.
   */
  setTransform(matrix: Mat4): void {
    this.alive("setTransform");
    this.model.world.setTransform(this.transform, matrix);
    const clamp = this.clamp_;
    if (clamp) {
      clamp.remove();
      this.clamp_ = undefined;
      this.anchor(clamp.options.heightReference, clamp.options.offset);
    }
  }

  /** Shows or hides all of it. */
  setVisible(visible: boolean): void {
    this.alive("setVisible");
    this.model.world.setTransformVisible(this.transform, visible);
  }

  /**
   * Changes the custom shader of every draw (undefined: the default), in
   * place: the draws move between batches, nothing is placed again.
   */
  setShader(shader: CustomShader | undefined): void {
    this.alive("setShader");
    for (const draw of this.draws) {
      this.model.world.setDrawShader(draw, shader);
    }
  }

  /**
   * Moves, hides or tints GPU instance `index` (placed with `instances`);
   * `matrix` is in the placement's frame, as when placed.
   */
  setInstance(
    index: number,
    change: {
      matrix?: ArrayLike<number>;
      visible?: boolean;
      tint?: ArrayLike<number>;
    },
  ): void {
    this.alive("setInstance");
    const frames = this.instanceFrames;
    if (!frames || index < 0 || index >= this.instanceCount) {
      throw new RangeError(`instance ${index} of ${this.instanceCount}`);
    }
    // Scratch only: moving every instance of a large fleet each frame must
    // not allocate per call.
    const matrix = change.matrix;
    if (matrix) {
      for (let k = 0; k < 16; k++) {
        scratchP[k] = matrix[k]!;
      }
    }
    scratchChange.matrix = matrix ? scratchOut : undefined;
    scratchChange.visible = change.visible;
    scratchChange.tint = change.tint;
    const world = this.model.world;
    const draws = this.draws;
    for (let d = 0; d < draws.length; d++) {
      const frame = frames[d]!;
      if (matrix) {
        conjugate(scratchM, frame.inverse, scratchP, frame.local);
      }
      const perUser = frame.gltf ? frame.gltf.length / 16 : 1;
      for (let j = 0; j < perUser; j++) {
        if (matrix) {
          if (frame.gltf) {
            multiplyAffineInto(scratchOut, 0, scratchM, frame.gltf, j * 16);
          } else {
            scratchOut.set(scratchM);
          }
        }
        world.setInstance(draws[d]!, index * perUser + j, scratchChange);
      }
    }
  }

  /**
   * Removes it from its world (again: nothing); its model is freed with
   * its last placement once the model's handle is released.
   */
  remove(): void {
    if (this.removed_) {
      return;
    }
    this.removed_ = true;
    this.clamp_?.remove();
    this.clamp_ = undefined;
    const world = this.model.world;
    for (const light of this.lights) {
      world.removeLight(light);
    }
    for (const draw of this.draws) {
      world.removeDraw(draw);
    }
    world.removeTransform(this.transform);
    this.model.unplaced();
  }

  [Symbol.dispose](): void {
    this.remove();
  }

  /** @internal Clamps it to the ground at its translation. */
  anchor(reference: HeightReference, offset: number | undefined): void {
    const m = this.model.world.localMatrix(this.transform);
    const anchor = Ellipsoid.WGS84.cartesianToCartographic(
      v3.vec3(m[12]!, m[13]!, m[14]!),
      { longitude: 0, latitude: 0, height: 0 },
    );
    if (anchor) {
      this.clamp_ = this.model.host.clamping.add(
        this.model.world,
        this.transform,
        {
          heightReference: reference,
          ...anchor,
          ...(offset !== undefined ? { offset } : {}),
        },
      );
    }
  }

  private alive(what: string): void {
    if (this.removed_) {
      throw new Error(`ModelPlacement.${what}: the placement was removed.`);
    }
  }
}

const scratchP = new Float64Array(16);
const scratchM = new Float64Array(16);
const scratchT = new Float64Array(16);
const scratchOut = new Float32Array(16);
const scratchChange: {
  matrix?: ArrayLike<number>;
  visible?: boolean;
  tint?: ArrayLike<number>;
} = {};

/** out = a × p × b (column-major 4×4). */
function conjugate(
  out: Float64Array,
  a: Float64Array,
  p: Float64Array,
  b: Float64Array,
): void {
  m4.multiply(scratchT, p, b);
  m4.multiply(out, a, scratchT);
}

/** out[o..] = a × b[bo..] (b float32), column-major. */
function multiplyAffineInto(
  out: Float32Array,
  o: number,
  a: Float64Array,
  b: Float32Array,
  bo: number,
): void {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[o + c * 4 + r] =
        a[r]! * b[bo + c * 4]! +
        a[4 + r]! * b[bo + c * 4 + 1]! +
        a[8 + r]! * b[bo + c * 4 + 2]! +
        a[12 + r]! * b[bo + c * 4 + 3]!;
    }
  }
}

/**
 * The bounds of a model's instances: its bounding sphere (Earth-fixed)
 * moved into the model frame, placed by each instance matrix.
 */
function instanceBounds(
  sphere: { center: Vec3; radius: number },
  root: Float64Array,
  matrices: ArrayLike<number>,
): { center: Vec3; radius: number } {
  const inverse = m4.invertAffine(m4.mat4(), root);
  const c = m4.transformPoint(v3.vec3(), inverse, sphere.center);
  const spheres: Array<{ center: Vec3; radius: number }> = [];
  for (let k = 0; k < matrices.length; k += 16) {
    const x =
      matrices[k]! * c[0]! +
      matrices[k + 4]! * c[1]! +
      matrices[k + 8]! * c[2]! +
      matrices[k + 12]!;
    const y =
      matrices[k + 1]! * c[0]! +
      matrices[k + 5]! * c[1]! +
      matrices[k + 9]! * c[2]! +
      matrices[k + 13]!;
    const z =
      matrices[k + 2]! * c[0]! +
      matrices[k + 6]! * c[1]! +
      matrices[k + 10]! * c[2]! +
      matrices[k + 14]!;
    const scale = Math.max(
      Math.hypot(matrices[k]!, matrices[k + 1]!, matrices[k + 2]!),
      Math.hypot(matrices[k + 4]!, matrices[k + 5]!, matrices[k + 6]!),
      Math.hypot(matrices[k + 8]!, matrices[k + 9]!, matrices[k + 10]!),
    );
    spheres.push({
      center: m4.transformPoint(v3.vec3(), root, v3.vec3(x, y, z)),
      radius: sphere.radius * scale,
    });
  }
  return unionSphere(spheres);
}

/** Frees a model's GPU resources. */
function freeUpload(world: World, upload: UploadedAsset): void {
  for (const mesh of upload.meshes) {
    world.removeMesh(mesh);
  }
  for (const material of upload.materials) {
    world.removeMaterial(material);
  }
  for (const set of upload.textureSets) {
    world.removeTextureSet(set);
  }
  for (const texture of upload.textures) {
    texture.destroy();
  }
  upload.meshes.length = 0;
  upload.materials.length = 0;
  upload.textureSets.length = 0;
  upload.textures.length = 0;
}

function materialData(m: GltfMaterial, gamma22: boolean) {
  let flags = gamma22 ? MaterialFlags.gamma22Textures : 0;
  if (m.unlit) {
    flags |= MaterialFlags.unlit;
  }
  if (m.doubleSided) {
    flags |= MaterialFlags.doubleSided;
  }
  if (m.alphaMode === "MASK") {
    flags |= MaterialFlags.alphaMask;
  }
  if (m.alphaMode === "BLEND") {
    flags |= MaterialFlags.alphaBlend;
  }
  if (m.baseColorTexture !== undefined) {
    flags |= MaterialFlags.baseColorTexture;
  }
  if (m.metallicRoughnessTexture !== undefined) {
    flags |= MaterialFlags.metallicRoughnessTexture;
  }
  if (m.normalTexture !== undefined) {
    flags |= MaterialFlags.normalTexture;
  }
  if (m.occlusionTexture !== undefined) {
    flags |= MaterialFlags.occlusionTexture;
  }
  if (m.emissiveTexture !== undefined) {
    flags |= MaterialFlags.emissiveTexture;
  }
  return {
    baseColor: m.baseColor,
    emissive: m.emissive,
    metallic: m.metallic,
    roughness: m.roughness,
    alphaCutoff: m.alphaCutoff,
    normalScale: m.normalScale,
    occlusionStrength: m.occlusionStrength,
    flags,
  };
}

/** Creates GPU textures and samplers on demand, one per (image, color space). */
class TextureUploader {
  /** Every texture created, freed with the model. */
  readonly textures: GPUTexture[] = [];
  /** Approximate GPU bytes of those textures (mips included). */
  bytes = 0;
  private readonly views = new Map<string, GPUTextureView>();
  private readonly samplers = new Map<string, GPUSampler>();

  constructor(
    private readonly ctx: RenderContext,
    private readonly asset: GltfAsset,
  ) {}

  binding(
    textureIndex: number | undefined,
    srgb: boolean,
  ): TextureBinding | undefined {
    if (textureIndex === undefined) {
      return undefined;
    }
    const texture = this.asset.textures[textureIndex];
    if (!texture || this.asset.images[texture.image] === undefined) {
      return undefined;
    }
    return {
      view: this.view(texture.image, srgb, texture.sampler.mipmaps),
      sampler: this.sampler(texture.sampler),
    };
  }

  private view(
    imageIndex: number,
    srgb: boolean,
    mipmaps: boolean,
  ): GPUTextureView {
    const key = `${imageIndex}|${srgb}|${mipmaps}`;
    let view = this.views.get(key);
    if (!view) {
      const image = this.asset.images[imageIndex]!;
      const { device, mips } = this.ctx;
      if (!(image instanceof ImageBitmap)) {
        const texture = uploadCompressed(
          this.ctx,
          image,
          srgb,
          mipmaps,
          imageIndex,
        );
        this.textures.push(texture);
        this.bytes += image.levels.reduce((n, l) => n + l.byteLength, 0);
        view = texture.createView();
        this.views.set(key, view);
        return view;
      }
      const texture = device.createTexture({
        label: `gltf.image${imageIndex}`,
        size: [image.width, image.height],
        format: srgb ? "rgba8unorm-srgb" : "rgba8unorm",
        mipLevelCount: mipmaps
          ? MipGenerator.levelCount(image.width, image.height)
          : 1,
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      device.queue.copyExternalImageToTexture({ source: image }, { texture }, [
        image.width,
        image.height,
      ]);
      mips.generate(texture);
      this.textures.push(texture);
      // RGBA8 plus a full mip chain ≈ 4/3 of the base level.
      this.bytes += Math.round(
        image.width *
          image.height *
          4 *
          (texture.mipLevelCount > 1 ? 4 / 3 : 1),
      );
      view = texture.createView();
      this.views.set(key, view);
    }
    return view;
  }

  private sampler(s: GltfSampler): GPUSampler {
    const key = JSON.stringify(s);
    let sampler = this.samplers.get(key);
    if (!sampler) {
      sampler = this.ctx.device.createSampler({
        magFilter: s.magFilter,
        minFilter: s.minFilter,
        mipmapFilter: s.mipmapFilter,
        addressModeU: s.addressModeU,
        addressModeV: s.addressModeV,
        maxAnisotropy:
          s.mipmaps &&
          s.minFilter === "linear" &&
          s.magFilter === "linear" &&
          s.mipmapFilter === "linear"
            ? 16
            : 1,
      });
      this.samplers.set(key, sampler);
    }
    return sampler;
  }
}

const BLOCK_FORMATS: Record<
  Exclude<CompressedFormat, "rgba8">,
  [GPUTextureFormat, GPUTextureFormat]
> = {
  bc7: ["bc7-rgba-unorm", "bc7-rgba-unorm-srgb"],
  "astc-4x4": ["astc-4x4-unorm", "astc-4x4-unorm-srgb"],
  "etc2-rgba8": ["etc2-rgba8unorm", "etc2-rgba8unorm-srgb"],
};

/**
 * Uploads a worker-transcoded KTX2 image. Block formats get exactly the mip
 * levels the file provides (compressed formats cannot be render targets);
 * the uncompressed fallback gets a generated mip chain like other images.
 */
function uploadCompressed(
  ctx: RenderContext,
  image: CompressedImage,
  srgb: boolean,
  mipmaps: boolean,
  index: number,
): GPUTexture {
  const { device, mips } = ctx;
  const block = image.format !== "rgba8";
  const format: GPUTextureFormat =
    image.format === "rgba8"
      ? srgb
        ? "rgba8unorm-srgb"
        : "rgba8unorm"
      : BLOCK_FORMATS[image.format][srgb ? 1 : 0];
  const generate = !block && mipmaps && image.levels.length === 1;
  const texture = device.createTexture({
    label: `gltf.ktx2.image${index}`,
    size: [image.width, image.height],
    format,
    mipLevelCount: generate
      ? MipGenerator.levelCount(image.width, image.height)
      : image.levels.length,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      (generate ? GPUTextureUsage.RENDER_ATTACHMENT : 0),
  });
  // Through one mapped staging buffer, as World's geometry: writeTexture
  // goes through the browser's transfer ring, and under a GPU backlog it
  // blocked the main thread for up to 0.5 s (AEC with vsync off, r38).
  // Buffer copies need rows padded to 256 bytes.
  const levels = image.levels.map((data, level) => {
    const width = Math.max(1, image.width >> level);
    const height = Math.max(1, image.height >> level);
    // Block formats: 4×4 blocks of 16 bytes; copies cover whole blocks.
    const columns = block ? Math.ceil(width / 4) : width;
    const rows = block ? Math.ceil(height / 4) : height;
    const rowBytes = columns * (block ? 16 : 4);
    const paddedRow = Math.ceil(rowBytes / 256) * 256;
    return { data, width, height, columns, rows, rowBytes, paddedRow };
  });
  const size = levels.reduce((n, l) => n + l.paddedRow * l.rows, 0);
  const staging = device.createBuffer({
    label: `gltf.ktx2.image${index}.staging`,
    size,
    usage: GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  const bytes = new Uint8Array(staging.getMappedRange());
  const encoder = device.createCommandEncoder({ label: "gltf.ktx2.upload" });
  let at = 0;
  levels.forEach((l, level) => {
    if (l.paddedRow === l.rowBytes) {
      bytes.set(l.data.subarray(0, l.rowBytes * l.rows), at);
    } else {
      for (let r = 0; r < l.rows; r++) {
        bytes.set(
          l.data.subarray(r * l.rowBytes, (r + 1) * l.rowBytes),
          at + r * l.paddedRow,
        );
      }
    }
    encoder.copyBufferToTexture(
      {
        buffer: staging,
        offset: at,
        bytesPerRow: l.paddedRow,
        rowsPerImage: l.rows,
      },
      { texture, mipLevel: level },
      block ? [l.columns * 4, l.rows * 4] : [l.width, l.height],
    );
    at += l.paddedRow * l.rows;
  });
  staging.unmap();
  device.queue.submit([encoder.finish()]);
  staging.destroy(); // released once the copies have run
  if (generate) {
    mips.generate(texture);
  }
  return texture;
}

function determinant3(m: Mat4): number {
  return (
    m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) -
    m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) +
    m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!)
  );
}

function unionSphere(spheres: Array<{ center: Vec3; radius: number }>): {
  center: Vec3;
  radius: number;
} {
  const center = v3.vec3();
  if (spheres.length === 0) {
    return { center, radius: 0 };
  }
  for (const s of spheres) {
    v3.add(center, center, s.center);
  }
  v3.scale(center, center, 1 / spheres.length);
  let radius = 0;
  for (const s of spheres) {
    radius = Math.max(radius, v3.distance(center, s.center) + s.radius);
  }
  return { center, radius };
}
