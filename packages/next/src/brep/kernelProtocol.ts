// The kernel worker's messages (overall plan §13.33, the CSG sample's
// "kernel interface, workers"): what a page asks of the worker that hosts the
// WebAssembly kernels (SMLib, Open CASCADE), and what comes back. Provisional:
// the CSG sample reshapes it. Every message is structured-cloneable; the
// forms in replies are plain typed arrays, which move by transfer, so a page
// receives them without a copy.
import type { BrepForm } from "./form.ts";
import type { FormBounds } from "./formBounds.ts";
import type { GpuPatches } from "./gpuPatches.ts";
import type { BrepProblem } from "./validate.ts";

export type KernelName = "smlib" | "occt";

type Vec3 = readonly [number, number, number];

/** A solid both kernels make the same way, m. */
export type Primitive =
  | { kind: "box"; origin: Vec3; size: Vec3 }
  | { kind: "cylinder"; base: Vec3; radius: number; height: number }
  | { kind: "sphere"; centre: Vec3; radius: number }
  | { kind: "torus"; centre: Vec3; major: number; minor: number };

export type BooleanOperation = "union" | "difference" | "intersection";

/** A form with what the worker measured of it, so the page needn't. */
export interface KernelForm {
  readonly form: BrepForm;
  /** From the form itself (`formBounds`). */
  readonly bounds: FormBounds;
  /** `validateBrep`'s findings, when the request asked for them. */
  readonly problems?: readonly BrepProblem[];
  /**
   * Per face: the tag of the input solid it came from (1 for a boolean's
   * first operand, 2 for its second), -1 for none; for a boolean's result.
   */
  readonly faceTags?: Int32Array;
  /**
   * `prepareGpuPatches`' result for the form (its default origin and trim
   * tolerance), when the request asked for it: pass it to `World.addBrep` as
   * `prepared`, so the page's thread doesn't do that work. Cloned, not moved.
   */
  readonly patches?: GpuPatches;
}

/** What a request may ask of the worker for each form it returns. */
export interface FormWork {
  /** Run `validateBrep` (findings in `problems`). */
  validate: boolean;
  /** Run `prepareGpuPatches` (in `patches`). */
  prepare: boolean;
}

/**
 * Page to worker. `id` names a request in its replies. A `cancel` asks the
 * worker to stop the request with that id, at its next stage if it is
 * running, and to skip it if it is waiting.
 */
export type KernelRequest =
  | { type: "load"; id: number; kernel: KernelName; url?: string }
  | ({ type: "importStep"; id: number; bytes: Uint8Array } & FormWork)
  | ({
      type: "boolean";
      id: number;
      kernel: KernelName;
      operation: BooleanOperation;
      a: Primitive;
      b: Primitive;
    } & FormWork)
  | { type: "cancel"; id: number };

/** Worker to page. */
export type KernelReply =
  | { type: "stage"; id: number; stage: string }
  | { type: "loaded"; id: number; kernel: KernelName; ms: number }
  | {
      type: "imported";
      id: number;
      /** One per solid of the file, in metres whatever the file's units. */
      forms: KernelForm[];
      /** Loading the module, when this request did: 0 once it was loaded. */
      loadMs: number;
      importMs: number;
      /** All the solids, together. */
      convertMs: number;
    }
  | {
      type: "boolean";
      id: number;
      result: KernelForm;
      loadMs: number;
      booleanMs: number;
      convertMs: number;
    }
  | { type: "cancelled"; id: number }
  | { type: "error"; id: number; message: string };

type TypedArray = ArrayBufferView & { readonly buffer: ArrayBufferLike };

/**
 * A copy of the form that owns its buffers, and the buffers to transfer. A
 * typed array that views part of a larger buffer (as a view into a kernel's
 * heap would) is copied rather than moved, since moving it would take the
 * whole buffer, so kernel memory is never detached.
 */
export function transferable(forms: readonly KernelForm[]): {
  forms: KernelForm[];
  buffers: ArrayBuffer[];
} {
  const buffers = new Set<ArrayBuffer>();
  const own = <T extends TypedArray>(array: T): T => {
    const whole =
      array.byteOffset === 0 &&
      array.byteLength === array.buffer.byteLength &&
      array.buffer instanceof ArrayBuffer;
    const mine = whole
      ? array
      : ((array as unknown as { slice(): T }).slice() as T);
    buffers.add(mine.buffer as ArrayBuffer);
    return mine;
  };
  const walk = <T>(value: T): T => {
    if (ArrayBuffer.isView(value)) {
      return own(value as unknown as TypedArray) as unknown as T;
    }
    if (Array.isArray(value)) {
      return value.slice() as unknown as T;
    }
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, walk(item)]),
      ) as T;
    }
    return value;
  };
  // Only the form and the tags move; the rest (bounds, problems, patches) is cloned.
  return {
    forms: forms.map((part) => ({
      ...part,
      form: walk(part.form),
      ...(part.faceTags ? { faceTags: own(part.faceTags) } : {}),
    })),
    buffers: [...buffers],
  };
}
