// A b-rep as a world's draws (CESIUM2_WEBGPU_PLAN.md §13.33, "Step 5
// redirected", part 2): every face the GPU can draw is a patch draw, diced per
// view, in two: the faces whose trim is their rect (early depth), and the
// faces with a trim, whose fragment stage tests it per pixel. A face the GPU
// can't evaluate (a patch of degree above 3) stays a CPU mesh, so a caller
// gets the whole solid. Provisional.
import type { BrepForm } from "../../brep/form.ts";
import { packGpuPatches, prepareGpuPatches } from "../../brep/gpuPatches.ts";
import { tessellateBrep } from "../../brep/tessellate.ts";
import type { Mat4 } from "../../math/mat4.ts";
import type { Vec3 } from "../../math/vec3.ts";
import type { World } from "../World.ts";
import type {
  DrawHandle,
  DrawOptions,
  MeshHandle,
  PatchMesh,
  TransformHandle,
} from "./types.ts";

/** What `World.addBrep` needs of a world. */
export type BrepWorld = Pick<
  World,
  | "addDraw"
  | "addMesh"
  | "addPatchMesh"
  | "addTransform"
  | "removeDraw"
  | "removeMesh"
  | "removeTransform"
>;

/**
 * Where the form is, as `DrawOptions` places a draw (`parent`, `origin`
 * and `model`, with the form's coordinates, m, in the model's frame) or by
 * a shared `transform`; and how it draws. Provisional.
 */
export interface BrepOptions extends Pick<
  DrawOptions,
  | "color"
  | "doubleSided"
  | "ground"
  | "material"
  | "name"
  | "parent"
  | "shader"
  | "textureSet"
  | "viewMask"
> {
  /** A shared transform the form is placed by; the draws hang off child transforms of it. Not with `parent`, `origin` or `model`. */
  transform?: TransformHandle;
  origin?: Vec3;
  model?: Mat4;
  /** The error a cell of the GPU path may leave, pixels (default half a pixel). */
  errorPixels?: number;
  /** The chordal error, m, of the CPU mesh of the faces the GPU path doesn't draw (default 1 mm). */
  cpuTolerance?: number;
  /** The most chunks of 8 × 8 cells a patch draw lists per view (default 16,384). */
  maxChunks?: number;
  /**
   * Which faces are a CPU mesh. "unsupported" (default): only those the GPU
   * can't draw. "trimmed": also every face with a trim, as before the
   * per-pixel trim test; a diagnostic, to compare the two on one solid.
   */
  cpuFaces?: "unsupported" | "trimmed";
}

/** A b-rep's draws (`World.addBrep`). */
export interface BrepHandle {
  /** The faces drawn by GPU dicing whose rect is complete: early depth. Undefined when none is. */
  readonly patches: DrawHandle | undefined;
  /** The faces drawn by GPU dicing with the per-pixel trim test. Undefined when none is. */
  readonly trimmed: DrawHandle | undefined;
  /** The faces drawn from a CPU mesh (unsupported ones; trimmed ones with `cpuFaces: "trimmed"`). Undefined when none is. */
  readonly mesh: DrawHandle | undefined;
  /** Every face drawn by GPU dicing, trimmed or not. */
  readonly gpuFaces: readonly number[];
  /** Those of `gpuFaces` that have a trim test. */
  readonly trimmedFaces: readonly number[];
  readonly cpuFaces: readonly number[];
  /** Faces the GPU path can't draw at all (and why), which are in `cpuFaces`. */
  readonly unsupported: readonly { face: number; reason: string }[];
  /** The chordal error the CPU mesh states, m. */
  readonly cpuError: number;
  /** @internal */
  readonly meshes: readonly MeshHandle[];
  /** @internal */
  readonly transforms: readonly TransformHandle[];
}

const DEFAULT_CPU_TOLERANCE = 1e-3;

export function addBrep(
  world: BrepWorld,
  form: BrepForm,
  options: BrepOptions = {},
): BrepHandle {
  if (
    options.transform &&
    (options.parent || options.origin || options.model)
  ) {
    throw new Error(
      "addBrep: a shared transform places the form; not with parent, origin or model.",
    );
  }
  const faceCount = form.faceSurface.length;
  const prepared = prepareGpuPatches(
    form,
    options.transform ? { origin: [0, 0, 0] } : {},
  );
  const cpuTrimmed = options.cpuFaces === "trimmed";
  const onGpu = (face: number): boolean => {
    const f = prepared.faces[face]!;
    return f.supported && !(cpuTrimmed && f.needsTrim);
  };
  const gpuFaces: number[] = [];
  const trimmedFaces: number[] = [];
  const cpuFaces: number[] = [];
  for (let face = 0; face < faceCount; face++) {
    if (onGpu(face)) {
      gpuFaces.push(face);
      if (prepared.faces[face]!.needsTrim) {
        trimmedFaces.push(face);
      }
    } else {
      cpuFaces.push(face);
    }
  }
  const unsupported = prepared.faces
    .filter((f) => !f.supported)
    .map((f) => ({ face: f.face, reason: f.reason ?? "" }));

  const meshes: MeshHandle[] = [];
  const transforms: TransformHandle[] = [];
  const draws: DrawHandle[] = [];
  /** The placement of a draw whose model space is the form's less `at`. */
  const placed = (
    at: ArrayLike<number>,
  ): Pick<DrawOptions, "transform" | "parent" | "origin" | "model"> => {
    if (options.transform) {
      const child = world.addTransform(
        Float64Array.of(
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          at[0]!,
          at[1]!,
          at[2]!,
          1,
        ),
        options.transform,
      );
      transforms.push(child);
      return { transform: child };
    }
    const m = options.model;
    const o = options.origin ?? new Float64Array(3);
    // The model's linear part takes `at` along: origin + M · at.
    const shift = Float64Array.from(
      [0, 1, 2],
      (k) =>
        o[k]! +
        (m ? m[k]! * at[0]! + m[4 + k]! * at[1]! + m[8 + k]! * at[2]! : at[k]!),
    );
    return {
      ...(options.parent ? { parent: options.parent } : {}),
      origin: shift,
      ...(m ? { model: m } : {}),
    };
  };
  const common = {
    ...(options.color ? { color: options.color } : {}),
    ...(options.doubleSided !== undefined
      ? { doubleSided: options.doubleSided }
      : {}),
    ...(options.ground !== undefined ? { ground: options.ground } : {}),
    ...(options.material !== undefined ? { material: options.material } : {}),
    ...(options.name !== undefined ? { name: options.name } : {}),
    ...(options.shader ? { shader: options.shader } : {}),
    ...(options.textureSet !== undefined
      ? { textureSet: options.textureSet }
      : {}),
    ...(options.viewMask !== undefined ? { viewMask: options.viewMask } : {}),
  };

  try {
    // One patch draw per pipeline: complete faces keep early depth, faces
    // with a trim run the trim test in the fragment stage.
    const patchDrawOf = (
      include: (face: { needsTrim: boolean; face: number }) => boolean,
    ): DrawHandle | undefined => {
      const data = packGpuPatches(prepared, (f) => onGpu(f.face) && include(f));
      if (data.spanCount === 0) {
        return undefined;
      }
      const mesh: PatchMesh = world.addPatchMesh(data, faceCount, {
        ...(options.errorPixels !== undefined
          ? { errorPixels: options.errorPixels }
          : {}),
        ...(options.maxChunks !== undefined
          ? { maxChunks: options.maxChunks }
          : {}),
      });
      meshes.push(mesh);
      const draw = world.addDraw({
        mesh,
        ...placed(prepared.origin),
        ...common,
      });
      draws.push(draw);
      return draw;
    };
    const patchDraw = patchDrawOf((f) => !f.needsTrim);
    const trimmedDraw = patchDrawOf((f) => f.needsTrim);
    let meshDraw: DrawHandle | undefined;
    let cpuError = 0;
    if (cpuFaces.length > 0) {
      const cpu = tessellateBrep(form, {
        tolerance: options.cpuTolerance ?? DEFAULT_CPU_TOLERANCE,
        faces: (face) => !onGpu(face),
      });
      cpuError = cpu.error;
      if (cpu.faces.indices.length > 0) {
        const mesh = world.addMesh({
          positions: cpu.faces.positions,
          normals: cpu.faces.normals,
          uvs: cpu.faces.uvs,
          indices: cpu.faces.indices,
          featureIds: cpu.faces.featureIds,
          featureCount: faceCount,
        });
        meshes.push(mesh);
        meshDraw = world.addDraw({ mesh, ...placed(cpu.origin), ...common });
        draws.push(meshDraw);
      }
    }
    return {
      patches: patchDraw,
      trimmed: trimmedDraw,
      mesh: meshDraw,
      gpuFaces,
      trimmedFaces,
      cpuFaces,
      unsupported,
      cpuError,
      meshes,
      transforms,
    };
  } catch (error) {
    // Nothing taken may outlive a failure (transactional, §13.15).
    for (const draw of draws) {
      world.removeDraw(draw);
    }
    for (const mesh of meshes) {
      world.removeMesh(mesh);
    }
    for (const transform of transforms) {
      world.removeTransform(transform);
    }
    throw error;
  }
}

/** Removes a b-rep's draws, meshes and the transforms made for it. */
export function removeBrep(world: BrepWorld, handle: BrepHandle): void {
  for (const draw of [handle.patches, handle.trimmed, handle.mesh]) {
    if (draw) {
      world.removeDraw(draw);
    }
  }
  for (const mesh of handle.meshes) {
    world.removeMesh(mesh);
  }
  for (const transform of handle.transforms) {
    world.removeTransform(transform);
  }
}
