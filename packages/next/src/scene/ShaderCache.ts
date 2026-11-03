import type { CustomShader } from "./CustomShader.ts";
import type { SurfacePipelines } from "./RenderContext.ts";

interface Entry {
  pipelines?: SurfacePipelines;
  failed: boolean;
  /** Settles when compiled: the pipelines, or the compiler's error. */
  compiled: Promise<SurfacePipelines>;
  /** Called once when the pipelines are ready (worlds record again). */
  waiting: Set<() => void>;
}

/**
 * Custom shaders' pipelines, compiled in the background once per distinct
 * source (`CustomShader.code`) and kept for the device's life. Until they
 * are ready, and if they fail, content draws with the engine's own.
 */
export class ShaderCache {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly build: (shader: CustomShader) => Promise<SurfacePipelines>,
  ) {}

  /**
   * The shader's pipelines, or undefined while they compile (`ready` is
   * then called once they are) or after they failed.
   */
  pipelines(
    shader: CustomShader,
    ready: () => void,
  ): SurfacePipelines | undefined {
    const entry = this.entry(shader);
    if (!entry.pipelines && !entry.failed) {
      entry.waiting.add(ready);
    }
    return entry.pipelines;
  }

  /** Compiles the shader if needed; settles when it is ready or failed. */
  compile(shader: CustomShader): Promise<SurfacePipelines> {
    return this.entry(shader).compiled;
  }

  private entry(shader: CustomShader): Entry {
    let entry = this.entries.get(shader.code);
    if (entry) {
      return entry;
    }
    const compiled = this.build(shader);
    const created: Entry = { failed: false, compiled, waiting: new Set() };
    entry = created;
    this.entries.set(shader.code, created);
    compiled.then(
      (pipelines) => {
        created.pipelines = pipelines;
        for (const callback of created.waiting) {
          callback();
        }
        created.waiting.clear();
      },
      (error: unknown) => {
        created.failed = true;
        created.waiting.clear();
        console.error(
          `[cesium/next] ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    );
    return entry;
  }
}
