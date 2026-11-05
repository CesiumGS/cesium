import { declarations, type Declaration } from "./declarations.ts";

/**
 * A compilation unit (plan §3.4, step 5): WGSL with a name and its
 * symbol table. Engine units are generated or hand-written modules (the
 * surface shaders, a kernel); run-time units come from front ends (a
 * custom shader's stages, its contract and glue, its uniforms' bindings,
 * a style). A linker joins units into one module.
 */
export interface ShaderUnit {
  /** Shown in diagnostics: "fragment stage", "opaque.wgsl". */
  readonly name: string;
  readonly code: string;
  /** Its top-level declarations (scanned from `code` when not given). */
  readonly declarations: readonly Declaration[];
}

/** A unit from WGSL source, its declarations scanned once, when read. */
export function wgslUnit(name: string, code: string): ShaderUnit {
  let scanned: Declaration[] | undefined;
  return {
    name,
    code,
    get declarations() {
      return (scanned ??= declarations(code));
    },
  };
}
