import type { CustomShader } from "./CustomShader.ts";
import type { EngineErrors } from "../gpu/EngineErrors.ts";
import { SURFACE_KEYS, type PipelineKey } from "./RenderContext.ts";
import type { RouteVariant } from "./routeVariant.ts";

type Factory = (key: PipelineKey) => Promise<GPURenderPipeline>;

/**
 * Pipelines made over compiled routes at once. A route's vertex stage is
 * thousands of lines and its pipelines compile for seconds on the GPU
 * process's threads; made together they compete with the main thread's
 * frames, and the twins that differ only in cull mode (`opaque`,
 * `opaqueDoubleSided`) each compile in full, where one made after the other
 * is found in the driver's cache.
 */
const MAX_ROUTED_IN_FLIGHT = 1;

/** What a cache entry is made for: a custom shader (by its code), and a compiled route over it or over the engine's stages. */
const entryKey = (
  shader: CustomShader | undefined,
  route: RouteVariant | undefined,
): string =>
  route ? `${shader?.code ?? ""}\u0000route:${route.key}` : shader!.code;

interface Entry {
  /** Settles when the shader has compiled: its pipeline factory, or the error. */
  validated: Promise<Factory>;
  factory?: Factory;
  failed: boolean;
  pipelines: Partial<Record<PipelineKey, GPURenderPipeline>>;
  /** Made over a compiled route: its pipelines are made one at a time (`MAX_ROUTED_IN_FLIGHT`). */
  routed: boolean;
  /** Pipelines being made. */
  making: Map<PipelineKey, Promise<GPURenderPipeline>>;
  /** Called once when a pipeline asked for is ready (worlds record again). */
  waiting: Set<() => void>;
  /** Pipelines whose making failed: their passes keep the engine's. */
  failedKeys: Set<PipelineKey>;
}

/**
 * Custom shaders' pipelines, kept for the device's life: once per
 * distinct source (`CustomShader.code`) the shader compiles, then each of
 * its pipelines (`SurfaceKey`) is made in the background when content
 * first needs it. A shader drawing opaque, one-sided triangles makes 4 of
 * the 19, and compiling them together with the frames' drawing held
 * frames up (50–110 ms each new shader). Until a pipeline is ready, and
 * if the shader fails, content draws with the engine's for that pass.
 */
export class ShaderCache {
  private readonly entries = new Map<string, Entry>();
  private inFlight = 0;
  private readonly waitingToStart: Array<() => void> = [];

  constructor(
    private readonly build: (
      shader: CustomShader | undefined,
      route?: RouteVariant,
    ) => Promise<Factory>,
    private readonly errors?: EngineErrors,
  ) {}

  /**
   * The shader's pipeline for `key`, or undefined while it is made
   * (`ready` is then called once it is) or if the shader failed. With a
   * `route`, the pipeline of the shader (or the engine's stages: undefined)
   * with that compiled route's vertex stage.
   */
  pipeline(
    shader: CustomShader | undefined,
    key: PipelineKey,
    ready: () => void,
    route?: RouteVariant,
  ): GPURenderPipeline | undefined {
    const entry = this.entry(shader, route);
    const pipeline = entry.pipelines[key];
    if (pipeline || entry.failed) {
      return pipeline;
    }
    entry.waiting.add(ready);
    if (entry.factory && !entry.making.has(key)) {
      this.make(entry, key);
    }
    return undefined;
  }

  /**
   * Whether the shader's pipeline for `key` is still to come: asked for
   * (`pipeline`) and neither made nor failed. False once it is made, or the
   * shader or the pipeline failed (the engine's draws that pass for good).
   */
  pending(
    shader: CustomShader | undefined,
    key: PipelineKey,
    route?: RouteVariant,
  ): boolean {
    const entry = this.entries.get(entryKey(shader, route));
    return (
      entry !== undefined &&
      !entry.failed &&
      !entry.pipelines[key] &&
      !entry.failedKeys.has(key)
    );
  }

  /**
   * Compiles the shader and makes all of its pipelines; settles when they
   * are ready or the shader failed.
   */
  async compile(shader: CustomShader): Promise<void> {
    const entry = this.entry(shader, undefined);
    await entry.validated;
    await Promise.all(
      SURFACE_KEYS.map((key) => entry.making.get(key) ?? this.make(entry, key)),
    );
  }

  private make(entry: Entry, key: PipelineKey): Promise<GPURenderPipeline> {
    const making = entry.routed
      ? this.queued(() => entry.factory!(key))
      : entry.factory!(key);
    entry.making.set(key, making);
    making.then(
      (pipeline) => {
        entry.pipelines[key] = pipeline;
        for (const callback of entry.waiting) {
          callback();
        }
        entry.waiting.clear();
      },
      (error: unknown) => {
        // This pass keeps drawing the batch with the engine's pipeline.
        entry.failedKeys.add(key);
        for (const callback of entry.waiting) {
          callback();
        }
        entry.waiting.clear();
        this.report(
          "pipeline",
          `${error instanceof Error ? error.message : String(error)} (its draws use the engine's shader in this pass)`,
        );
      },
    );
    return making;
  }

  /** Runs `start` once fewer than `MAX_ROUTED_IN_FLIGHT` routed pipelines are being made. */
  private queued(
    start: () => Promise<GPURenderPipeline>,
  ): Promise<GPURenderPipeline> {
    return new Promise((resolve, reject) => {
      const run = () => {
        this.inFlight++;
        Promise.resolve()
          .then(start)
          .then(resolve, reject)
          .finally(() => {
            this.inFlight--;
            this.waitingToStart.shift()?.();
          });
      };
      if (this.inFlight < MAX_ROUTED_IN_FLIGHT) {
        run();
      } else {
        this.waitingToStart.push(run);
      }
    });
  }

  private report(kind: "shader" | "pipeline", message: string): void {
    if (this.errors) {
      this.errors.report(kind, message);
    } else {
      console.error(`[cesium/next] ${message}`);
    }
  }

  private entry(
    shader: CustomShader | undefined,
    route: RouteVariant | undefined,
  ): Entry {
    const name = entryKey(shader, route);
    let entry = this.entries.get(name);
    if (entry) {
      return entry;
    }
    const validated = this.build(shader, route);
    const created: Entry = {
      validated,
      failed: false,
      routed: route !== undefined,
      pipelines: {},
      making: new Map(),
      waiting: new Set(),
      failedKeys: new Set(),
    };
    entry = created;
    this.entries.set(name, created);
    validated.then(
      (factory) => {
        created.factory = factory;
        // Content asked for pipelines while it compiled: make them now.
        if (created.waiting.size > 0) {
          for (const callback of created.waiting) {
            callback();
          }
          created.waiting.clear();
        }
      },
      (error: unknown) => {
        created.failed = true;
        // Worlds record again: their draws now use the engine's shader for good.
        for (const callback of created.waiting) {
          callback();
        }
        created.waiting.clear();
        this.report(
          "shader",
          `${error instanceof Error ? error.message : String(error)} (its draws use the engine's shader)`,
        );
      },
    );
    return entry;
  }
}
