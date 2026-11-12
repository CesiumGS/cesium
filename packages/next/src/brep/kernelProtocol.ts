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
  | {
      /** A frustum up z from the centre of its base; a top radius of 0 is a cone. */
      kind: "cone";
      base: Vec3;
      radiusBase: number;
      radiusTop: number;
      height: number;
    }
  | { kind: "torus"; centre: Vec3; major: number; minor: number };

/**
 * A rigid placement, applied after a primitive is made: a turn about the
 * world's x, then y, then z axes through the origin, then a move. Degrees
 * and m.
 */
export interface Placement {
  rotate?: Vec3;
  translate?: Vec3;
}

export type BooleanOperation = "union" | "difference" | "intersection";

/**
 * A solid as a tree of primitives and booleans (the CSG sample's model, as
 * data). A leaf's `tag` is a positive integer, unique in the tree: the faces
 * it makes carry it through every boolean above it, so a result's `faceTags`
 * name the leaf each face came from. A node folds its operands left to right:
 * a union or intersection of all of them, a difference of the first minus the
 * rest. A node with one operand is that operand; with none it is an error.
 *
 * A `step` leaf is a solid imported earlier (`registerStep`) under `step`'s
 * key, centred on the middle of its bounds and placed like a primitive. Only
 * Open CASCADE reads it.
 */
export type SolidRecipe =
  | {
      type: "primitive";
      tag: number;
      primitive: Primitive;
      placement?: Placement;
    }
  | {
      type: "step";
      tag: number;
      /** The key the solid was registered under. */
      step: number;
      placement?: Placement;
    }
  | {
      type: "boolean";
      operation: BooleanOperation;
      operands: SolidRecipe[];
    };

/** A recipe's leaf: a primitive or an imported solid. */
export type RecipeLeaf = Exclude<SolidRecipe, { type: "boolean" }>;

/** What `registerStep` made of a file. */
export interface StepPart {
  /** How many solids the file held (more than one are fused into the part). */
  solids: number;
  /** The part's faces. */
  faces: number;
  /** Its extent along x, y and z, m. The part is centred on the middle of its bounds. */
  size: Vec3;
}

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
  /** How long the worker spent on `validateBrep` and on `prepareGpuPatches`, ms, where it ran them. */
  readonly validateMs?: number;
  readonly prepareMs?: number;
  /** How many faces' preparation was taken from the worker's cache of the last evaluation, of all the form's. */
  readonly facesReused?: number;
  /** How long `formBounds` took in the worker, ms. */
  readonly boundsMs?: number;
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
  /**
   * Imports a STEP file with Open CASCADE and keeps its solid in the worker
   * under `key` (replacing one already there), for recipes' `step` leaves.
   */
  | { type: "registerStep"; id: number; key: number; bytes: Uint8Array }
  | { type: "releaseStep"; id: number; key: number }
  | ({
      type: "boolean";
      id: number;
      kernel: KernelName;
      operation: BooleanOperation;
      a: Primitive;
      b: Primitive;
    } & FormWork)
  | ({
      type: "evaluate";
      id: number;
      kernel: KernelName;
      recipe: SolidRecipe;
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
      type: "stepRegistered";
      id: number;
      key: number;
      part: StepPart;
      /** Loading the module, when this request did: 0 once it was loaded. */
      loadMs: number;
      importMs: number;
      /** Fusing the solids, centring the part and measuring it. */
      convertMs: number;
    }
  | { type: "stepReleased"; id: number; key: number }
  | {
      type: "boolean";
      id: number;
      result: KernelForm;
      loadMs: number;
      booleanMs: number;
      convertMs: number;
    }
  | {
      type: "evaluated";
      id: number;
      /** Its `faceTags` are the recipe's leaf tags. */
      result: KernelForm;
      loadMs: number;
      /** Making the primitives, placing them and every boolean, in the kernel. */
      kernelMs: number;
      /** The booleans among them. */
      booleans: number;
      convertMs: number;
      /** Making the reply's copy of the form (`transferable`), ms. */
      packMs: number;
      /** Faces the conversion took from the worker's cache of the last Open CASCADE solid, not converted again. */
      extractReused: number;
      /** What the stages' waits on the message loop added, ms (a cancel can get in at each). */
      stageMs: number;
      /** When the worker took the request up and when it posted this reply, epoch ms (`performance.timeOrigin + performance.now()`), for the page to tell the worker's time from the hops. */
      startedAt: number;
      sentAt: number;
    }
  | { type: "cancelled"; id: number }
  | { type: "error"; id: number; message: string };

type TypedArray = ArrayBufferView & { readonly buffer: ArrayBufferLike };

/** The leaves of a recipe, left to right. */
export function recipeLeaves(recipe: SolidRecipe): RecipeLeaf[] {
  return recipe.type === "boolean"
    ? recipe.operands.flatMap(recipeLeaves)
    : [recipe];
}

/** How many booleans a recipe makes (a node of n operands makes n - 1). */
export function countBooleans(recipe: SolidRecipe): number {
  return recipe.type !== "boolean"
    ? 0
    : Math.max(0, recipe.operands.length - 1) +
        recipe.operands.reduce((n, operand) => n + countBooleans(operand), 0);
}

/** Throws unless every node has an operand and every leaf a positive integer tag, none repeated. */
export function checkRecipe(recipe: SolidRecipe): void {
  const seen = new Set<number>();
  const visit = (node: SolidRecipe): void => {
    if (node.type !== "boolean") {
      if (!Number.isInteger(node.tag) || node.tag < 1 || seen.has(node.tag)) {
        throw new Error(`the recipe's leaf tag ${node.tag} isn't unique`);
      }
      seen.add(node.tag);
      return;
    }
    if (node.operands.length === 0) {
      throw new Error(`the recipe's ${node.operation} has no operands`);
    }
    node.operands.forEach(visit);
  };
  visit(recipe);
}

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
