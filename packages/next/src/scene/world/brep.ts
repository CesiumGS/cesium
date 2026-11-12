// A b-rep as a world's draws (CESIUM2_WEBGPU_PLAN.md §13.33, "Step 5
// redirected", part 2): every face is a patch draw, diced per view, in two:
// the faces whose trim is their rect (early depth), and the faces with a
// trim, whose fragment stage tests it per pixel. Patches of degree 1 to 7
// are evaluated on the GPU alike. Only a face with nothing to draw (no loop
// of a finite extent, no patch under its rect) is left out, reported in
// `unsupported`; the CPU mesh is a diagnostic (`cpuFaces: "trimmed"`).
// Provisional.
import type { BrepForm } from "../../brep/form.ts";
import {
  packGpuPatches,
  prepareGpuPatches,
  type GpuPatches,
} from "../../brep/gpuPatches.ts";
import { tessellateBrep } from "../../brep/tessellate.ts";
import { brepGeometry, type BrepGeometry } from "../../geometry/brep.ts";
import type { Mat4 } from "../../math/mat4.ts";
import type { Vec3 } from "../../math/vec3.ts";
import type { World } from "../World.ts";
import type { PatchPickSource } from "./domains.ts";
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
  | "setPickSource"
>;

/**
 * Where the form is, as `DrawOptions` places a draw (`parent`, `origin`
 * and `model`, with the form's coordinates, m, in the model's frame) or by
 * a shared `transform`; and how it draws. Its draws are named `name` (default
 * "brep"), as a pick reports them. Provisional.
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
  /** The chordal error, m, of the CPU mesh of `cpuFaces: "trimmed"` (default 1 mm). */
  cpuTolerance?: number;
  /** The most chunks of 4 × 4 cells a patch draw lists per view (default 65,536). */
  maxChunks?: number;
  /**
   * The display tolerance of the faces' trims as a share of a face's size
   * (default 1e-4, `DISPLAY_TRIM_TOLERANCE`): how far a trim piece may stray
   * from the face's pcurves in the drawing. Picks are refined exactly.
   */
  trimTolerance?: number;
  /**
   * The form's `prepareGpuPatches` result when it was made elsewhere (the
   * kernel worker does): from the same form with the same `trimTolerance`
   * and the origin this call would use (the form's centre, or [0, 0, 0] with
   * `transform`). Saves the main thread the preparing, which is most of
   * `addBrep`'s time on a part of hundreds of faces.
   */
  prepared?: GpuPatches;
  /**
   * Which faces are a CPU mesh. "unsupported" (default): none, every face is
   * on the GPU. "trimmed": every face with a trim, as before the per-pixel
   * trim test; a diagnostic, to compare the two on one solid.
   */
  cpuFaces?: "unsupported" | "trimmed";
}

/** A b-rep's draws (`World.addBrep`). */
export interface BrepHandle {
  /** The faces drawn by GPU dicing whose rect is complete: early depth. Undefined when none is. */
  readonly patches: DrawHandle | undefined;
  /** The faces drawn by GPU dicing with the per-pixel trim test. Undefined when none is. */
  readonly trimmed: DrawHandle | undefined;
  /** The faces drawn from a CPU mesh (`cpuFaces: "trimmed"`'s trimmed ones). Undefined when none is. */
  readonly mesh: DrawHandle | undefined;
  /** Every face drawn by GPU dicing, trimmed or not. */
  readonly gpuFaces: readonly number[];
  /** Those of `gpuFaces` that have a trim test. */
  readonly trimmedFaces: readonly number[];
  readonly cpuFaces: readonly number[];
  /** Faces with nothing to draw (and why: no loop of a finite extent, no patch under the rect), drawn by neither path. */
  readonly unsupported: readonly { face: number; reason: string }[];
  /** The chordal error the CPU mesh states, m. */
  readonly cpuError: number;
  /** @internal */
  readonly meshes: readonly MeshHandle[];
  /** @internal */
  readonly transforms: readonly TransformHandle[];
}

const DEFAULT_CPU_TOLERANCE = 1e-3;
/** The name of a b-rep's draws when `BrepOptions.name` gives none: `world.feature(id).draw.name` says it. */
export const DEFAULT_BREP_NAME = "brep";

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
  const prepared =
    options.prepared ??
    prepareGpuPatches(form, {
      ...(options.transform ? { origin: [0, 0, 0] } : {}),
      ...(options.trimTolerance !== undefined
        ? { trimTolerance: options.trimTolerance }
        : {}),
    });
  const cpuTrimmed = options.cpuFaces === "trimmed";
  const gpuFaces: number[] = [];
  const trimmedFaces: number[] = [];
  const cpuFaces: number[] = [];
  const unsupported: { face: number; reason: string }[] = [];
  for (let face = 0; face < faceCount; face++) {
    const f = prepared.faces[face]!;
    if (!f.supported) {
      unsupported.push({ face, reason: f.reason ?? "" });
    } else if (cpuTrimmed && f.needsTrim) {
      cpuFaces.push(face);
    } else {
      gpuFaces.push(face);
      if (f.needsTrim) {
        trimmedFaces.push(face);
      }
    }
  }
  const onGpu = new Set(gpuFaces);
  const onCpu = new Set(cpuFaces);
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
  // Where the patch draws' faces are exact for picks (`World.setPickSource`):
  // the form as a geometry, made when a pick first asks.
  let geometry: BrepGeometry | undefined;
  const pickSource: PatchPickSource = {
    origin: prepared.origin,
    refinePick: (face, hint) =>
      (geometry ??= brepGeometry(form)).refinePick(face, hint),
  };
  const common = {
    ...(options.color ? { color: options.color } : {}),
    ...(options.doubleSided !== undefined
      ? { doubleSided: options.doubleSided }
      : {}),
    ...(options.ground !== undefined ? { ground: options.ground } : {}),
    ...(options.material !== undefined ? { material: options.material } : {}),
    name: options.name ?? DEFAULT_BREP_NAME,
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
      const data = packGpuPatches(
        prepared,
        (f) => onGpu.has(f.face) && include(f),
      );
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
      world.setPickSource(draw, pickSource);
      return draw;
    };
    const patchDraw = patchDrawOf((f) => !f.needsTrim);
    const trimmedDraw = patchDrawOf((f) => f.needsTrim);
    let meshDraw: DrawHandle | undefined;
    let cpuError = 0;
    if (cpuFaces.length > 0) {
      const cpu = tessellateBrep(form, {
        tolerance: options.cpuTolerance ?? DEFAULT_CPU_TOLERANCE,
        faces: (face) => onCpu.has(face),
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
