import type { CustomShader } from "./CustomShader.ts";
import type { EngineErrors } from "../gpu/EngineErrors.ts";
import {
  SURFACE_KEYS,
  type SurfaceKey,
  type SurfacePipelines,
} from "./RenderContext.ts";

type Factory = (key: SurfaceKey) => Promise<GPURenderPipeline>;

interface Entry {
  /** Settles when the shader has compiled: its pipeline factory, or the error. */
  validated: Promise<Factory>;
  factory?: Factory;
  failed: boolean;
  pipelines: Partial<SurfacePipelines>;
  /** Pipelines being made. */
  making: Map<SurfaceKey, Promise<GPURenderPipeline>>;
  /** Called once when a pipeline asked for is ready (worlds record again). */
  waiting: Set<() => void>;
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

  constructor(
    private readonly build: (shader: CustomShader) => Promise<Factory>,
    private readonly errors?: EngineErrors,
  ) {}

  /**
   * The shader's pipeline for `key`, or undefined while it is made
   * (`ready` is then called once it is) or if the shader failed.
   */
  pipeline(
    shader: CustomShader,
    key: SurfaceKey,
    ready: () => void,
  ): GPURenderPipeline | undefined {
    const entry = this.entry(shader);
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
   * Compiles the shader and makes all of its pipelines; settles when they
   * are ready or the shader failed.
   */
  async compile(shader: CustomShader): Promise<void> {
    const entry = this.entry(shader);
    await entry.validated;
    await Promise.all(
      SURFACE_KEYS.map((key) => entry.making.get(key) ?? this.make(entry, key)),
    );
  }

  private make(entry: Entry, key: SurfaceKey): Promise<GPURenderPipeline> {
    const making = entry.factory!(key);
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
        this.report(
          "pipeline",
          `${error instanceof Error ? error.message : String(error)} (its draws use the engine's shader in this pass)`,
        );
      },
    );
    return making;
  }

  private report(kind: "shader" | "pipeline", message: string): void {
    if (this.errors) {
      this.errors.report(kind, message);
    } else {
      console.error(`[cesium/next] ${message}`);
    }
  }

  private entry(shader: CustomShader): Entry {
    let entry = this.entries.get(shader.code);
    if (entry) {
      return entry;
    }
    const validated = this.build(shader);
    const created: Entry = {
      validated,
      failed: false,
      pipelines: {},
      making: new Map(),
      waiting: new Set(),
    };
    entry = created;
    this.entries.set(shader.code, created);
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
