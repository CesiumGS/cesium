// The kernel worker's brain (overall plan §13.33): runs the requests of
// kernelProtocol.ts against SMLib and Open CASCADE, one at a time, in
// whatever scope it is created in. `kernelWorker.ts` makes one in a Web
// Worker; tests make one in-process. Provisional.
//
// Cancelling: a request waits its turn in a queue, and a running one reports
// its stages and yields to the message loop at each, where a `cancel` for it
// is seen and it stops, freeing what it holds. A kernel call itself (a
// boolean, a STEP import) can't be interrupted, so a cancel waits for the
// call that is running.
import {
  createBoundsCache,
  formBounds,
  type BoundsCache,
  type FormBounds,
} from "./formBounds.ts";
import type { BrepForm } from "./form.ts";
import {
  createPrepareCache,
  prepareGpuPatches,
  type GpuPatches,
  type PrepareCache,
} from "./gpuPatches.ts";
import {
  checkRecipe,
  countBooleans,
  recipeLeaves,
  transferable,
  type BooleanOperation,
  type FormWork,
  type KernelForm,
  type KernelName,
  type KernelReply,
  type KernelRequest,
  type Placement,
  type Primitive,
  type SolidRecipe,
  type StepPart,
} from "./kernelProtocol.ts";
import { ExtractCache, OcctKernel, type OcctSolid } from "./occt.ts";
import { SmlibKernel, type SmlibSolid } from "./smlib.ts";
import { validateBrep, type BrepProblem } from "./validate.ts";

/** The primitives both kernels make the same way. */
interface Primitives<S> {
  box(origin: ArrayLike<number>, size: ArrayLike<number>): S;
  cylinder(base: ArrayLike<number>, radius: number, height: number): S;
  sphere(centre: ArrayLike<number>, radius: number): S;
  cone(
    base: ArrayLike<number>,
    radiusBase: number,
    radiusTop: number,
    height: number,
  ): S;
  torus(centre: ArrayLike<number>, major: number, minor: number): S;
}

function makePrimitive<S>(kernel: Primitives<S>, p: Primitive): S {
  switch (p.kind) {
    case "box":
      return kernel.box(p.origin, p.size);
    case "cylinder":
      return kernel.cylinder(p.base, p.radius, p.height);
    case "sphere":
      return kernel.sphere(p.centre, p.radius);
    case "cone":
      return kernel.cone(p.base, p.radiusBase, p.radiusTop, p.height);
    case "torus":
      return kernel.torus(p.centre, p.major, p.minor);
  }
}

/** What evaluating a recipe needs of a kernel, the same for both. Solids are `delete`d idempotently. */
interface Evaluator<S extends { delete(): void }> {
  primitives: Primitives<S>;
  /** A new solid of an imported STEP part (not for SMLib). */
  step?(key: number): S;
  place(solid: S, placement: Placement): S;
  tag(solid: S, tag: number): S;
  /** Combines two solids into one, taking both (each is deleted or consumed). */
  combine(operation: BooleanOperation, a: S, b: S): S;
  /**
   * Combines two solids into a new one and leaves both as they were, so a
   * solid can be an operand again (SMLib's change `a` and consume `b`, so it
   * has none). Where this is, a host keeps solids from one evaluation to the
   * next (`SolidCache`).
   */
  combineKeeping?(operation: BooleanOperation, a: S, b: S): S;
  toForm(solid: S): { form: BrepForm; faceTags: Int32Array };
}

const nodeKeys = new WeakMap<SolidRecipe, string>();

/** A node of a recipe as a string: equal for equal trees (the leaves' tags and placements included). */
function keyOf(node: SolidRecipe): string {
  let key = nodeKeys.get(node);
  if (key === undefined) {
    key =
      node.type === "boolean"
        ? `${node.operation}(${node.operands.map(keyOf).join(",")})`
        : JSON.stringify(node);
    nodeKeys.set(node, key);
  }
  return key;
}

/**
 * The solids of the last evaluation, by the key of the tree they came from
 * (and, for the partial folds of a node with several operands, by the keys of
 * the operands folded so far), so an edit re-makes only the leaves it changed
 * and the booleans above them, and each fold starts from the longest prefix
 * already made. A node's operands are folded unchanged ones first, in the
 * order they were last folded, and those the edit changed last: a union or an
 * intersection is the same in any order, and so is what a difference takes
 * away from its first operand; so dragging one operand of many redoes one
 * boolean, not all of them. `finish` frees what an evaluation didn't use.
 */
class SolidCache<S extends { delete(): void }> {
  private readonly entries = new Map<string, S>();
  private used = new Set<string>();
  /** The keys of the last evaluation's nodes, and where each came in its fold. */
  private known = new Set<string>();
  private rank = new Map<string, number>();

  get(key: string): S | undefined {
    const solid = this.entries.get(key);
    if (solid) {
      this.used.add(key);
    }
    return solid;
  }

  set(key: string, solid: S): void {
    this.entries.set(key, solid);
    this.used.add(key);
  }

  /** A node's operands in the order to fold them (see the class). */
  ordered(node: Extract<SolidRecipe, { type: "boolean" }>): SolidRecipe[] {
    const first = node.operation === "difference" ? 1 : 0;
    const rest = node.operands.slice(first).map((operand, i) => {
      const key = keyOf(operand);
      return {
        operand,
        stable: this.known.has(key),
        rank: this.rank.get(key) ?? first + i,
      };
    });
    rest.sort(
      (a, b) => Number(!a.stable) - Number(!b.stable) || a.rank - b.rank,
    );
    return [...node.operands.slice(0, first), ...rest.map((r) => r.operand)];
  }

  begin(): void {
    this.used = new Set();
  }

  /** The evaluation of `recipe` succeeded: what it didn't use is freed; its nodes and their folding order are what the next knows. */
  finish(recipe: SolidRecipe): void {
    // A solid may be under several keys (a node's, a fold's): freed once.
    const before = new Set(this.entries.values());
    for (const key of [...this.entries.keys()]) {
      if (!this.used.has(key)) {
        this.entries.delete(key);
      }
    }
    const after = new Set(this.entries.values());
    before.forEach((solid) => {
      if (!after.has(solid)) {
        solid.delete();
      }
    });
    const known = new Set<string>();
    const rank = new Map<string, number>();
    const visit = (node: SolidRecipe): void => {
      known.add(keyOf(node));
      if (node.type === "boolean") {
        this.ordered(node).forEach((operand, i) => rank.set(keyOf(operand), i));
        node.operands.forEach(visit);
      }
    };
    visit(recipe);
    this.known = known;
    this.rank = rank;
  }

  /** Frees every solid (the STEP parts changed, or the host ends). */
  clear(): void {
    new Set(this.entries.values()).forEach((solid) => solid.delete());
    this.entries.clear();
    this.used = new Set();
    this.known = new Set();
    this.rank = new Map();
  }
}

function smlibEvaluator(kernel: SmlibKernel): Evaluator<SmlibSolid> {
  return {
    primitives: kernel,
    place: (solid, placement) => kernel.place(solid, placement),
    tag: (solid, tag) => {
      kernel.tag(solid, tag);
      return solid;
    },
    // Changes `a` in place and consumes `b`.
    combine: (operation, a, b) => kernel.boolean(operation, a, b),
    toForm: (solid) => kernel.toForm(solid),
  };
}

function occtEvaluator(
  kernel: OcctKernel,
  steps: ReadonlyMap<number, OcctSolid>,
  extract?: ExtractCache,
): Evaluator<OcctSolid> {
  return {
    primitives: kernel,
    step: (key) => {
      const part = steps.get(key);
      if (!part) {
        throw new Error(`the STEP part ${key} isn't loaded in the worker`);
      }
      return kernel.clone(part);
    },
    place: (solid, placement) => kernel.place(solid, placement),
    tag: (solid, tag) => kernel.tag(solid, tag),
    combineKeeping: (operation, a, b) => kernel.boolean(operation, a, b),
    // Makes a new solid and leaves its operands, which are freed here.
    combine: (operation, a, b) => {
      try {
        return kernel.boolean(operation, a, b);
      } finally {
        a.delete();
        b.delete();
      }
    },
    toForm: (solid) =>
      kernel.toForm(solid, extract ? { cache: extract } : undefined),
  };
}

/** Thrown at a stage when the request was cancelled. */
class Cancelled extends Error {}

export interface KernelHostOptions {
  /** Sends a reply, moving `transfer`'s buffers with it. */
  post(reply: KernelReply, transfer: ArrayBuffer[]): void;
  /** Loads a kernel from a URL (default: the dev server's build). Tests pass their own. */
  loadSmlib?: (url?: string) => Promise<SmlibKernel>;
  loadOcct?: (url?: string) => Promise<OcctKernel>;
  /** Lets the message loop run (default: a message to itself). A test whose transport is a timer yields on a timer. */
  yield?: () => Promise<void>;
}

const NAMES: Record<KernelName, string> = {
  smlib: "SMLib",
  occt: "Open CASCADE",
};

/**
 * Lets the message loop run, so a waiting `cancel` is delivered. A message
 * to ourselves, not a timer: a worker's `setTimeout(0)` waits a few ms (4 once
 * nested, more on a busy machine), and a request has a dozen stages.
 */
const yielders: Array<() => void> = [];
let yielding: MessageChannel | undefined;
function yieldNow(): Promise<void> {
  if (typeof MessageChannel === "undefined") {
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  if (!yielding) {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      yielders.shift()?.();
      if (yielders.length === 0) {
        (channel.port1 as { unref?(): void }).unref?.();
      }
    };
    yielding = channel;
  }
  const channel = yielding;
  return new Promise<void>((resolve) => {
    yielders.push(resolve);
    // Node keeps a process alive for an open port: only while a yield waits.
    (channel.port1 as { ref?(): void }).ref?.();
    channel.port2.postMessage(null);
  });
}

/** Now on the clock all threads of the page share, epoch ms. */
const epochNow = () => performance.timeOrigin + performance.now();

/**
 * Where a form's patches are anchored: the cache's last anchor while the
 * form's centre stays within one size of it (the faces prepared there are
 * still good), else the centre. Positions are float32 relative to it, so a
 * form's own size away costs nothing noticeable.
 */
function anchorFor(bounds: FormBounds, cache: PrepareCache): Float64Array {
  const centre = Float64Array.from(
    bounds.min,
    (low, k) => (low + bounds.max[k]!) / 2,
  );
  const size = Math.max(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  );
  const last = cache.origin;
  return last &&
    Math.hypot(
      last[0]! - centre[0]!,
      last[1]! - centre[1]!,
      last[2]! - centre[2]!,
    ) <= size
    ? last
    : centre;
}

export class KernelHost {
  private readonly queue: KernelRequest[] = [];
  private readonly cancelled = new Set<number>();
  /** When each request arrived, epoch ms, and how long its stages waited on the message loop. */
  private readonly arrived = new Map<number, number>();
  private readonly stalled = new Map<number, number>();
  /** What the last evaluation on each kernel made of its faces (their bounds, their patches for the GPU), to reuse in the next. */
  private readonly faceCaches = new Map<
    KernelName,
    { prepare: PrepareCache; bounds: BoundsCache }
  >();
  /** The Open CASCADE solids of the last evaluation, to build the next from. */
  private readonly solidCache = new SolidCache<OcctSolid>();
  /** The faces and edges of the last Open CASCADE solid converted, to reuse in the next. */
  private readonly extract = new ExtractCache();

  private faceCache(kernel: KernelName) {
    let cache = this.faceCaches.get(kernel);
    if (!cache) {
      cache = { prepare: createPrepareCache(), bounds: createBoundsCache() };
      this.faceCaches.set(kernel, cache);
    }
    return cache;
  }
  /** STEP parts kept for recipes' `step` leaves, centred, by key. */
  private readonly steps = new Map<number, OcctSolid>();
  private running = false;
  private smlib: Promise<SmlibKernel> | undefined;
  private occt: Promise<OcctKernel> | undefined;

  constructor(private readonly options: KernelHostOptions) {}

  /** Frees what the host keeps (the STEP parts). A worker's termination does the same; tests call it. */
  dispose(): void {
    this.faceCaches.clear();
    this.solidCache.clear();
    this.extract.release();
    for (const part of this.steps.values()) {
      part.delete();
    }
    this.steps.clear();
  }

  /** Takes a request from the page. */
  receive(request: KernelRequest): void {
    if (request.type === "cancel") {
      this.cancelled.add(request.id);
      return;
    }
    this.arrived.set(request.id, epochNow());
    this.queue.push(request);
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      while (this.queue.length > 0) {
        // A cancel sent just after its request arrives before it starts.
        await (this.options.yield ?? yieldNow)();
        const request = this.queue.shift()!;
        if (request.type === "cancel") {
          continue;
        }
        try {
          if (this.cancelled.has(request.id)) {
            throw new Cancelled();
          }
          await this.run(request);
        } catch (error) {
          this.options.post(
            error instanceof Cancelled
              ? { type: "cancelled", id: request.id }
              : { type: "error", id: request.id, message: String(error) },
            [],
          );
        } finally {
          this.cancelled.delete(request.id);
          this.arrived.delete(request.id);
          this.stalled.delete(request.id);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Names the stage to the page, and lets a cancel in. */
  private async stage(id: number, stage: string): Promise<void> {
    const start = performance.now();
    this.options.post({ type: "stage", id, stage }, []);
    await (this.options.yield ?? yieldNow)();
    this.stalled.set(
      id,
      (this.stalled.get(id) ?? 0) + performance.now() - start,
    );
    if (this.cancelled.has(id)) {
      throw new Cancelled();
    }
  }

  private loadSmlib(url?: string): Promise<SmlibKernel> {
    this.smlib ??= (this.options.loadSmlib ?? ((u) => SmlibKernel.load(u)))(
      url,
    ).catch((error: unknown) => {
      this.smlib = undefined;
      throw error;
    });
    return this.smlib;
  }

  private loadOcct(url?: string): Promise<OcctKernel> {
    this.occt ??= (this.options.loadOcct ?? ((u) => OcctKernel.load(u)))(
      url,
    ).catch((error: unknown) => {
      this.occt = undefined;
      throw error;
    });
    return this.occt;
  }

  /** Loads a kernel, naming the stage when it isn't loaded yet; the time that took, 0 if it was. */
  private async ensure(
    id: number,
    kernel: KernelName,
    url?: string,
  ): Promise<number> {
    const loaded = kernel === "smlib" ? this.smlib : this.occt;
    if (loaded) {
      await loaded;
      return 0;
    }
    await this.stage(id, `Loading ${NAMES[kernel]}…`);
    const start = performance.now();
    await (kernel === "smlib" ? this.loadSmlib(url) : this.loadOcct(url));
    return performance.now() - start;
  }

  private async run(
    request: Exclude<KernelRequest, { type: "cancel" }>,
  ): Promise<void> {
    const { id } = request;
    switch (request.type) {
      case "load": {
        const ms = await this.ensure(id, request.kernel, request.url);
        this.options.post(
          { type: "loaded", id, kernel: request.kernel, ms },
          [],
        );
        return;
      }
      case "importStep":
        return this.importStep(id, request.bytes, request);
      case "registerStep":
        return this.registerStep(id, request.key, request.bytes);
      case "releaseStep":
        this.solidCache.clear();
        this.steps.get(request.key)?.delete();
        this.steps.delete(request.key);
        this.options.post({ type: "stepReleased", id, key: request.key }, []);
        return;
      case "evaluate":
        return this.evaluate(id, request.kernel, request.recipe, request);
      case "boolean":
        return this.boolean(
          id,
          request.kernel,
          request.operation,
          request.a,
          request.b,
          request,
        );
    }
  }

  /**
   * The forms with what the page would otherwise work out: their bounds
   * always, and the checks and the GPU's patches when `work` asks. Each takes
   * a stage, where a cancel can stop it.
   */
  private async measured(
    id: number,
    forms: readonly BrepForm[],
    work: FormWork,
    faceTags?: Int32Array,
    cache?: { prepare: PrepareCache; bounds: BoundsCache },
  ): Promise<KernelForm[]> {
    const boundsStart = performance.now();
    const parts = forms.map((form) => ({
      form,
      bounds: formBounds(form, cache ? { cache: cache.bounds } : {}),
    }));
    const boundsMs = performance.now() - boundsStart;
    let problems: BrepProblem[][] | undefined;
    let validateMs: number | undefined;
    if (work.validate) {
      await this.stage(id, "Checking the form…");
      const start = performance.now();
      problems = forms.map((form) => validateBrep(form));
      validateMs = performance.now() - start;
    }
    let patches: GpuPatches[] | undefined;
    let prepareMs: number | undefined;
    if (work.prepare) {
      await this.stage(id, "Preparing faces for the GPU…");
      const start = performance.now();
      patches = parts.map(({ form, bounds }) =>
        prepareGpuPatches(form, {
          ...(cache
            ? {
                cache: cache.prepare,
                origin: anchorFor(bounds, cache.prepare),
              }
            : {}),
        }),
      );
      prepareMs = performance.now() - start;
    }
    return parts.map((part, i) => ({
      ...part,
      ...(problems ? { problems: problems[i]! } : {}),
      ...(patches ? { patches: patches[i]! } : {}),
      ...(validateMs !== undefined ? { validateMs } : {}),
      ...(prepareMs !== undefined ? { prepareMs } : {}),
      ...(prepareMs !== undefined && cache
        ? { facesReused: cache.prepare.reused }
        : {}),
      boundsMs,
      ...(faceTags ? { faceTags } : {}),
    }));
  }

  private async importStep(
    id: number,
    bytes: Uint8Array,
    work: FormWork,
  ): Promise<void> {
    const loadMs = await this.ensure(id, "occt");
    const kernel = await this.loadOcct();
    let solids: OcctSolid[] = [];
    try {
      await this.stage(id, "Importing STEP…");
      let start = performance.now();
      solids = kernel.importStep(bytes);
      const importMs = performance.now() - start;
      await this.stage(
        id,
        `Converting ${solids.length} ${solids.length === 1 ? "solid" : "solids"} to B-reps…`,
      );
      start = performance.now();
      const forms = solids.map((solid) => kernel.toForm(solid).form);
      const convertMs = performance.now() - start;
      await this.stage(id, "Measuring the part…");
      const results = await this.measured(id, forms, work);
      const { forms: moved, buffers } = transferable(results);
      this.options.post(
        { type: "imported", id, forms: moved, loadMs, importMs, convertMs },
        buffers,
      );
    } finally {
      // The forms are their own copy; the solids are the host's to free.
      solids.forEach((solid) => solid.delete());
    }
  }

  /**
   * Imports a STEP file and keeps it as one solid (a file of several is
   * fused), centred on the middle of its bounds, under `key`.
   */
  private async registerStep(
    id: number,
    key: number,
    bytes: Uint8Array,
  ): Promise<void> {
    const loadMs = await this.ensure(id, "occt");
    const kernel = await this.loadOcct();
    let solids: OcctSolid[] = [];
    let part: OcctSolid | undefined;
    try {
      await this.stage(id, "Importing STEP…");
      let start = performance.now();
      solids = kernel.importStep(bytes);
      const importMs = performance.now() - start;
      const count = solids.length;
      if (count === 0) {
        throw new Error("the STEP file holds no solid");
      }
      await this.stage(id, "Measuring the part…");
      start = performance.now();
      // The fuse takes both operands, so what it consumed leaves the list.
      part = solids.shift()!;
      while (solids.length > 0) {
        const next = solids.shift()!;
        const left = part;
        part = undefined;
        part = occtEvaluator(kernel, this.steps).combine("union", left, next);
      }
      const { form } = kernel.toForm(part);
      const { min, max } = formBounds(form);
      part = kernel.place(part, {
        translate: [
          -(min[0]! + max[0]!) / 2,
          -(min[1]! + max[1]!) / 2,
          -(min[2]! + max[2]!) / 2,
        ],
      });
      const info: StepPart = {
        solids: count,
        faces: form.faceSurface.length,
        size: [max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!],
      };
      const convertMs = performance.now() - start;
      this.solidCache.clear();
      this.steps.get(key)?.delete();
      this.steps.set(key, part);
      part = undefined;
      this.options.post(
        {
          type: "stepRegistered",
          id,
          key,
          part: info,
          loadMs,
          importMs,
          convertMs,
        },
        [],
      );
    } finally {
      solids.forEach((solid) => solid.delete());
      part?.delete();
    }
  }

  private async evaluate(
    id: number,
    kernel: KernelName,
    recipe: SolidRecipe,
    work: FormWork,
  ): Promise<void> {
    checkRecipe(recipe);
    if (
      kernel === "smlib" &&
      recipeLeaves(recipe).some((leaf) => leaf.type === "step")
    ) {
      throw new Error(
        `${NAMES[kernel]} can't read STEP files: use Open CASCADE`,
      );
    }
    const loadMs = await this.ensure(id, kernel);
    if (kernel === "smlib") {
      return this.evaluateWith(
        id,
        kernel,
        smlibEvaluator(await this.loadSmlib()),
        recipe,
        work,
        loadMs,
      );
    }
    return this.evaluateWith(
      id,
      kernel,
      occtEvaluator(await this.loadOcct(), this.steps, this.extract),
      recipe,
      work,
      loadMs,
    );
  }

  /** Builds the recipe's tree in the kernel, one stage per boolean (where a cancel stops it, freeing what it holds), and converts the result. */
  private async evaluateWith<S extends { delete(): void }>(
    id: number,
    kernel: KernelName,
    evaluator: Evaluator<S>,
    recipe: SolidRecipe,
    work: FormWork,
    loadMs: number,
  ): Promise<void> {
    const booleans = countBooleans(recipe);
    let kernelMs = 0;
    let done = 0;
    const timed = <T>(fn: () => T): T => {
      const start = performance.now();
      try {
        return fn();
      } finally {
        kernelMs += performance.now() - start;
      }
    };
    const stepSolid = (key: number): S => {
      if (!evaluator.step) {
        throw new Error(
          `${NAMES[kernel]} can't read STEP files: use Open CASCADE`,
        );
      }
      return evaluator.step(key);
    };
    const makeLeaf = (node: Exclude<SolidRecipe, { type: "boolean" }>): S =>
      timed(() => {
        let solid =
          node.type === "step"
            ? stepSolid(node.step)
            : makePrimitive(evaluator.primitives, node.primitive);
        try {
          if (node.placement) {
            solid = evaluator.place(solid, node.placement);
          }
          return evaluator.tag(solid, node.tag);
        } catch (error) {
          solid.delete();
          throw error;
        }
      });
    const stageFor = (operation: BooleanOperation) =>
      this.stage(
        id,
        `${NAMES[kernel]}: ${operation} (${done} of ${booleans})…`,
      );
    const cache = evaluator.combineKeeping
      ? (this.solidCache as unknown as SolidCache<S>)
      : undefined;
    const buildPlain = async (node: SolidRecipe): Promise<S> => {
      if (node.type !== "boolean") {
        return makeLeaf(node);
      }
      const parts: S[] = [];
      let acc: S | undefined;
      try {
        for (const operand of node.operands) {
          parts.push(await buildPlain(operand));
        }
        let combined: S = parts[0]!;
        acc = combined;
        for (const next of parts.slice(1)) {
          done++;
          await stageFor(node.operation);
          const left: S = combined;
          combined = timed(() => evaluator.combine(node.operation, left, next));
          acc = combined;
        }
        return combined;
      } catch (error) {
        acc?.delete();
        parts.forEach((part) => part.delete());
        throw error;
      }
    };
    /**
     * With the cache, a node's solid (and the solids of a fold's first
     * operands) is kept from the last evaluation: only what an edit changed
     * is made again. The cache's solids are borrowed, not freed here.
     */
    const buildCached = async (
      node: SolidRecipe,
      keeping: SolidCache<S>,
    ): Promise<S> => {
      const key = keyOf(node);
      const hit = keeping.get(key);
      if (hit) {
        return hit;
      }
      if (node.type !== "boolean") {
        const made = makeLeaf(node);
        keeping.set(key, made);
        return made;
      }
      const operands = keeping.ordered(node);
      const keys = operands.map(keyOf);
      const last = operands.length - 1;
      // The fold's solid after its first i + 1 operands.
      const foldKey = (i: number) =>
        i === last
          ? key
          : i === 0
            ? keys[0]!
            : `${node.operation}|${keys.slice(0, i + 1).join(",")}`;
      let from = 0;
      let start: S | undefined;
      for (let i = last; i >= 1 && !start; i--) {
        start = keeping.get(foldKey(i));
        from = i;
      }
      if (!start) {
        from = 0;
      } else {
        for (let i = 1; i < from; i++) {
          keeping.get(foldKey(i));
        }
      }
      let acc: S = start ?? (await buildCached(operands[0]!, keeping));
      for (let i = from + 1; i <= last; i++) {
        const next = await buildCached(operands[i]!, keeping);
        done++;
        await stageFor(node.operation);
        const left: S = acc;
        acc = timed(() =>
          evaluator.combineKeeping!(node.operation, left, next),
        );
        keeping.set(foldKey(i), acc);
      }
      return acc;
    };
    let brep: { form: BrepForm; faceTags: Int32Array };
    let convertMs: number;
    let solid: S;
    if (cache) {
      cache.begin();
      solid = await buildCached(recipe, cache);
      cache.finish(recipe);
    } else {
      solid = await buildPlain(recipe);
    }
    try {
      const start = performance.now();
      brep = evaluator.toForm(solid);
      convertMs = performance.now() - start;
    } finally {
      if (!cache) {
        solid.delete();
      }
    }
    const [result] = await this.measured(
      id,
      [brep.form],
      work,
      brep.faceTags,
      this.faceCache(kernel),
    );
    const packStart = performance.now();
    const { forms, buffers } = transferable([result!]);
    const packMs = performance.now() - packStart;
    this.options.post(
      {
        type: "evaluated",
        id,
        result: forms[0]!,
        loadMs,
        kernelMs,
        booleans,
        convertMs,
        packMs,
        extractReused: kernel === "occt" ? this.extract.reused : 0,
        stageMs: this.stalled.get(id) ?? 0,
        startedAt: this.arrived.get(id) ?? epochNow(),
        sentAt: epochNow(),
      },
      buffers,
    );
  }

  private async boolean(
    id: number,
    kernel: KernelName,
    operation: BooleanOperation,
    a: Primitive,
    b: Primitive,
    work: FormWork,
  ): Promise<void> {
    const loadMs = await this.ensure(id, kernel);
    await this.stage(id, `${NAMES[kernel]}: ${operation}…`);
    const made =
      kernel === "smlib"
        ? await this.smlibBoolean(operation, a, b)
        : await this.occtBoolean(operation, a, b);
    const [result] = await this.measured(id, [made.form], work, made.faceTags);
    const { forms, buffers } = transferable([result!]);
    this.options.post(
      {
        type: "boolean",
        id,
        result: forms[0]!,
        loadMs,
        booleanMs: made.booleanMs,
        convertMs: made.convertMs,
      },
      buffers,
    );
  }

  private async smlibBoolean(
    operation: BooleanOperation,
    specA: Primitive,
    specB: Primitive,
  ) {
    const kernel = await this.loadSmlib();
    const a: SmlibSolid = makePrimitive(kernel, specA);
    let b: SmlibSolid | undefined;
    try {
      b = makePrimitive(kernel, specB);
      kernel.tag(a, 1);
      kernel.tag(b, 2);
      let start = performance.now();
      // The boolean changes `a` in place and consumes `b`.
      const result = kernel.boolean(operation, a, b);
      const booleanMs = performance.now() - start;
      start = performance.now();
      const brep = kernel.toForm(result);
      return {
        form: brep.form,
        faceTags: brep.faceTags,
        booleanMs,
        convertMs: performance.now() - start,
      };
    } finally {
      a.delete();
      b?.delete();
    }
  }

  private async occtBoolean(
    operation: BooleanOperation,
    specA: Primitive,
    specB: Primitive,
  ) {
    const kernel = await this.loadOcct();
    const a: OcctSolid = makePrimitive(kernel, specA);
    let b: OcctSolid | undefined;
    let result: OcctSolid | undefined;
    try {
      b = makePrimitive(kernel, specB);
      let start = performance.now();
      result = kernel.boolean(operation, kernel.tag(a, 1), kernel.tag(b, 2));
      const booleanMs = performance.now() - start;
      start = performance.now();
      const brep = kernel.toForm(result);
      return {
        form: brep.form,
        faceTags: brep.faceTags,
        booleanMs,
        convertMs: performance.now() - start,
      };
    } finally {
      // OCCT's solids are the caller's to free; the form is its own copy.
      result?.delete();
      b?.delete();
      a.delete();
    }
  }
}
