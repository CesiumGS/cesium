/**
 * A user's shader stages for models and tilesets (plan §3.4, "Custom
 * shading"): WGSL against the engine's contract in opaque.wgsl
 * (`VertexInput`, `VertexOutput`, `FragmentInput`, `MaterialOutput`), named
 * as CesiumJS 1.x `CustomShader`'s:
 *
 *   fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>)
 *   fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>)
 *
 * `vertexMain` moves the vertex in its mesh's own coordinates;
 * `fragmentMain` changes the glTF material's values (already sampled)
 * before lighting. Both run in every pass that draws the content, so
 * displaced geometry casts, occludes and picks where it is drawn. Either may
 * be left out (unchanged). Helpers and constants may sit beside them; names
 * the engine's shaders use are taken.
 *
 * Content using a shader draws with the default material until its
 * pipelines have compiled (in the background, once per distinct source),
 * and stays that way if they fail; the error is logged.
 *
 * Stages may be written in Slang against the `cesium` module
 * (shaders/cesium.slang): compiled at build time (scripts/slangShader.mjs,
 * the output passed as `wgsl`) or at runtime (`CustomShader.fromSlang`).
 */
export interface CustomShaderOptions {
  /** WGSL defining `vertexMain`. */
  vertex?: string;
  /** WGSL defining `fragmentMain`. */
  fragment?: string;
  /**
   * WGSL defining either stage or both, with their helpers, in place of
   * `vertex` and `fragment` (what the Slang paths produce).
   */
  wgsl?: string;
  /**
   * The farthest `vertexMain` moves a vertex, in model units: it pads the
   * draws' culling bounds. Default 0.
   */
  displacement?: number;
  /** For error messages and GPU labels. */
  label?: string;
}

export interface SlangShaderOptions extends Omit<
  CustomShaderOptions,
  "vertex" | "fragment" | "wgsl"
> {
  /**
   * The Slang WebAssembly build's script (`slang-wasm.js`, about 8 MB
   * compressed with its wasm), loaded once, in a worker, on first use.
   * Default "/slang-wasm/slang-wasm.js".
   */
  slangUrl?: string;
}

export const DEFAULT_VERTEX_MAIN =
  "fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {}";
export const DEFAULT_FRAGMENT_MAIN =
  "fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {}";

let nextId = 1;

export class CustomShader {
  /** Unique per shader object; batches key on it (0: the default). */
  readonly id = nextId++;
  /** Both stages' WGSL, defaults filled in: what pipelines are cached by. */
  readonly code: string;
  /**
   * Lines of `code` that are the vertex stage's, for error messages;
   * undefined for `wgsl` (lines count from its start).
   */
  readonly vertexLines: number | undefined;
  readonly displacement: number;
  readonly label: string;

  constructor(options: CustomShaderOptions) {
    if (options.wgsl !== undefined) {
      const wgsl = options.wgsl;
      const defines = (stage: string) =>
        new RegExp(`\\bfn\\s+${stage}\\s*\\(`).test(wgsl);
      this.code = [
        wgsl,
        defines("vertexMain") ? "" : DEFAULT_VERTEX_MAIN,
        defines("fragmentMain") ? "" : DEFAULT_FRAGMENT_MAIN,
        "",
      ].join("\n");
      this.vertexLines = undefined;
    } else {
      const vertex = options.vertex ?? DEFAULT_VERTEX_MAIN;
      this.code = `${vertex}\n${options.fragment ?? DEFAULT_FRAGMENT_MAIN}\n`;
      this.vertexLines = vertex.split("\n").length;
    }
    this.displacement = Math.max(0, options.displacement ?? 0);
    this.label = options.label ?? `custom shader ${this.id}`;
  }

  /**
   * A shader from Slang stages (`import cesium;`), compiled at runtime by
   * the Slang WebAssembly build in a worker. Rejects with Slang's
   * messages (lines in `source`).
   */
  static async fromSlang(
    source: string,
    options: SlangShaderOptions = {},
  ): Promise<CustomShader> {
    const { compileSlang } = await import("./slang.ts");
    const wgsl = await compileSlang(source, options.slangUrl);
    return new CustomShader({
      wgsl,
      ...(options.displacement !== undefined
        ? { displacement: options.displacement }
        : {}),
      ...(options.label !== undefined ? { label: options.label } : {}),
    });
  }
}
