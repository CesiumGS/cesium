import type { Boundary } from "./boundary.ts";
import type { ShaderUnit } from "./unit.ts";

/**
 * Linking (plan §3.4, step 5): units in, one module out, or what stops
 * it. A strategy sits behind `Linker`: the first joins checked WGSL
 * (`WgslLinker`); others could link Slang modules where the compiler is
 * loaded anyway, or resolve WESL-style imports.
 */
export interface LinkRequest {
  /** The module's label (GPU objects, diagnostics). */
  label: string;
  /** In order: a unit may use what any other defines. */
  units: readonly ShaderUnit[];
  /** The boundaries the units must satisfy between them. */
  boundaries?: readonly Boundary[];
}

export interface LinkDiagnostic {
  /** The unit it is about, and its line there (1-based); none for both. */
  unit?: string;
  line?: number;
  message: string;
}

export interface LinkedModule {
  readonly label: string;
  /** The module's WGSL. */
  readonly code: string;
  /** Problems found linking; the module is usable when there are none. */
  readonly diagnostics: readonly LinkDiagnostic[];
  /** A line of `code` (1-based) as its unit and line there. */
  locate(line: number): { unit: string; line: number } | undefined;
}

export interface Linker {
  link(request: LinkRequest): LinkedModule;
}

const normalize = (type: string) => type.replace(/\s+/g, "");

/**
 * Joins units in order, after checking them: a name defined in two units
 * (a shader's helper over an engine function), a boundary's function
 * missing, defined twice or with other types, a directive (`enable`)
 * outside the first unit (WGSL wants them before any declaration). It
 * reads the units' declarations; it doesn't change their code.
 */
export class WgslLinker implements Linker {
  link({ label, units, boundaries = [] }: LinkRequest): LinkedModule {
    const diagnostics: LinkDiagnostic[] = [];
    const defined = new Map<string, { unit: string; line: number }>();
    units.forEach((unit, index) => {
      for (const d of unit.declarations) {
        if (d.kind === "directive") {
          if (index > 0) {
            diagnostics.push({
              unit: unit.name,
              line: d.line,
              message: `\`${d.name}\` must come first in the module: put it in the first unit (${units[0]!.name}).`,
            });
          }
          continue;
        }
        if (d.kind === "const_assert") {
          continue;
        }
        const earlier = defined.get(d.name);
        if (earlier) {
          diagnostics.push({
            unit: unit.name,
            line: d.line,
            message: `\`${d.name}\` is already defined (${earlier.unit}, line ${earlier.line}).`,
          });
          continue;
        }
        defined.set(d.name, { unit: unit.name, line: d.line });
      }
    });
    for (const boundary of boundaries) {
      for (const f of boundary.requires) {
        const found = units.flatMap((unit) =>
          unit.declarations
            .filter((d) => d.kind === "fn" && d.name === f.name)
            .map((d) => ({ unit, d })),
        );
        const want = `fn ${f.name}(${f.params.join(", ")})${f.result ? ` -> ${f.result}` : ""}`;
        if (found.length === 0) {
          diagnostics.push({
            message: `The ${boundary.name} boundary needs \`${want}\`; no unit defines it.`,
          });
          continue;
        }
        const { unit, d } = found[0]!;
        const params = d.params ?? [];
        const same =
          params.length === f.params.length &&
          params.every((p, k) => normalize(p) === normalize(f.params[k]!)) &&
          normalize(d.result ?? "") === normalize(f.result ?? "");
        if (!same) {
          diagnostics.push({
            unit: unit.name,
            line: d.line,
            message: `\`${f.name}\` must be \`${want}\` (the ${boundary.name} boundary).`,
          });
        }
      }
    }
    // Each unit's lines in the module, for `locate`.
    const starts: number[] = [];
    let line = 1;
    for (const unit of units) {
      starts.push(line);
      line += unit.code.split("\n").length;
    }
    const code = units.map((u) => u.code).join("\n");
    return {
      label,
      code,
      diagnostics,
      locate(at: number) {
        for (let k = units.length - 1; k >= 0; k--) {
          if (at >= starts[k]!) {
            return { unit: units[k]!.name, line: at - starts[k]! + 1 };
          }
        }
        return undefined;
      },
    };
  }
}

/** A module linked by `linker`, or the error of what stopped it. */
export function linkChecked(
  request: LinkRequest,
  linker: Linker = new WgslLinker(),
): LinkedModule {
  const linked = linker.link(request);
  const failure = linkFailure(linked);
  if (failure !== undefined) {
    throw new Error(failure);
  }
  return linked;
}

/** The module's diagnostics as one message, or undefined when none. */
export function linkFailure(module: LinkedModule): string | undefined {
  if (module.diagnostics.length === 0) {
    return undefined;
  }
  return `${module.label}: ${module.diagnostics.map(where).join("; ")}`;
}

/**
 * The compiler's errors on a linked module, each at its unit's line;
 * undefined when there are none.
 */
export function compileFailure(
  module: LinkedModule,
  messages: readonly GPUCompilationMessage[],
): string | undefined {
  const errors = messages.filter((m) => m.type === "error");
  if (errors.length === 0) {
    return undefined;
  }
  return `${module.label}: ${errors
    .map((m) => {
      const at = module.locate(m.lineNum);
      return where({ unit: at?.unit, line: at?.line, message: m.message });
    })
    .join("; ")}`;
}

function where(d: LinkDiagnostic): string {
  if (d.unit === undefined) {
    return d.message;
  }
  return `${d.unit}${d.line === undefined ? "" : ` line ${d.line}`}: ${d.message}`;
}
