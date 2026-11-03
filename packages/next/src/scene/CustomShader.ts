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
 */
export interface CustomShaderOptions {
  /** WGSL defining `vertexMain`. */
  vertex?: string;
  /** WGSL defining `fragmentMain`. */
  fragment?: string;
  /**
   * The farthest `vertexMain` moves a vertex, in model units: it pads the
   * draws' culling bounds. Default 0.
   */
  displacement?: number;
  /** For error messages and GPU labels. */
  label?: string;
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
  /** Lines of `code` that are the vertex stage's (error messages). */
  readonly vertexLines: number;
  readonly displacement: number;
  readonly label: string;

  constructor(options: CustomShaderOptions) {
    const vertex = options.vertex ?? DEFAULT_VERTEX_MAIN;
    this.code = `${vertex}\n${options.fragment ?? DEFAULT_FRAGMENT_MAIN}\n`;
    this.vertexLines = vertex.split("\n").length;
    this.displacement = Math.max(0, options.displacement ?? 0);
    this.label = options.label ?? `custom shader ${this.id}`;
  }
}
