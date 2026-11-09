// What can be read of a shader's loops from its text. WebGPU can't stop a shader that
// doesn't end: a hang resets the GPU for every application on the machine. So a stage
// from outside the engine keeps to loops whose count can be read. It's a guard, not a
// proof: it doesn't follow calls, or add up loops that follow one another.
import { blankComments } from "./declarations.ts";

/** The most iterations a loop nest may read as, per invocation, per pixel. */
export const MAX_LOOP_ITERATIONS = 256;

/** The index of the bracket that closes the one at `open`. */
function closing(code: string, open: number): number {
  const opener = code[open]!;
  const closer = opener === "(" ? ")" : "}";
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === opener) {
      depth++;
    } else if (code[i] === closer && --depth === 0) {
      return i;
    }
  }
  return -1;
}

/** An integer written out, or a `const` of one. */
function integer(
  text: string,
  constants: ReadonlyMap<string, number>,
): number | undefined {
  const t = text
    .trim()
    .replace(/^[iu]32\((.*)\)$/s, "$1")
    .trim();
  const literal = /^(0[xX][0-9a-fA-F]+|[0-9]+)[iu]?$/.exec(t);
  return literal ? Number(literal[1]) : constants.get(t);
}

/** How many times a `for` runs from its header, or undefined if it can't be read. */
function forCount(
  header: string,
  body: string,
  constants: ReadonlyMap<string, number>,
): number | undefined {
  const parts = header.split(";");
  if (parts.length !== 3) {
    return undefined;
  }
  const init = /^\s*(?:var\s+)?(\w+)\s*(?::[^=]*)?=([^=].*)$/s.exec(parts[0]!);
  const test = /^\s*\(?\s*(\w+)\s*(<=|>=|<|>)\s*(.+?)\s*\)?\s*$/s.exec(
    parts[1]!,
  );
  if (!init || !test || init[1] !== test[1]) {
    return undefined;
  }
  const counter = init[1]!;
  const stepText = parts[2]!.trim();
  const unit = new RegExp(`^${counter}\\s*(\\+\\+|--)$`).exec(stepText);
  const by = new RegExp(`^${counter}\\s*([+-])=\\s*(.+)$`, "s").exec(stepText);
  const add = new RegExp(
    `^${counter}\\s*=\\s*${counter}\\s*([+-])\\s*(.+)$`,
    "s",
  ).exec(stepText);
  let step: number | undefined;
  if (unit) {
    step = unit[1] === "++" ? 1 : -1;
  } else if (by ?? add) {
    const [, sign, amount] = (by ?? add)!;
    const size = integer(amount!, constants);
    step = size === undefined ? undefined : sign === "+" ? size : -size;
  }
  const start = integer(init[2]!, constants);
  const bound = integer(test[3]!, constants);
  if (
    step === undefined ||
    step === 0 ||
    start === undefined ||
    bound === undefined
  ) {
    return undefined;
  }
  const rising = test[2]!.startsWith("<");
  if (rising !== step > 0) {
    return undefined;
  }
  // Its count holds only if the body leaves the counter alone.
  const written = new RegExp(
    `\\b${counter}\\s*(?:\\+\\+|--|(?:[-+*/%&|^]|<<|>>)?=(?!=))|&\\s*${counter}\\b`,
  );
  if (written.test(body)) {
    return undefined;
  }
  const span = Math.abs(bound - start) + (test[2]!.endsWith("=") ? 1 : 0);
  return Math.ceil(span / Math.abs(step));
}

/**
 * Why a shader's loops can't be shown to end soon, or undefined if they can: a `loop`
 * or a `while`, or a `for` whose count can't be read from its header, or a nest of
 * more than `MAX_LOOP_ITERATIONS`.
 */
export function unguardedLoop(source: string): string | undefined {
  const code = blankComments(source);
  const open = /\b(loop|while)\b/.exec(code);
  if (open) {
    return `a \`${open[1]}\` has no bound that can be read`;
  }
  const constants = new Map<string, number>();
  for (const [, name, value] of code.matchAll(
    /\bconst\s+(\w+)\s*(?::[^=]*)?=\s*([^;]+);/g,
  )) {
    const known = integer(value!, constants);
    if (known !== undefined) {
      constants.set(name!, known);
    }
  }
  const loops: Array<{ start: number; end: number; count: number }> = [];
  for (const match of code.matchAll(/\bfor\s*\(/g)) {
    const headerOpen = match.index + match[0].length - 1;
    const headerClose = closing(code, headerOpen);
    const bodyOpen = code.indexOf("{", headerClose);
    const bodyClose = bodyOpen < 0 ? -1 : closing(code, bodyOpen);
    const count =
      headerClose < 0 || bodyClose < 0
        ? undefined
        : forCount(
            code.slice(headerOpen + 1, headerClose),
            code.slice(bodyOpen, bodyClose),
            constants,
          );
    if (count === undefined) {
      const line = code.slice(0, match.index).split("\n").length;
      return `the \`for\` at line ${line} has no constant bound that can be read`;
    }
    loops.push({ start: match.index, end: bodyClose, count });
  }
  for (const loop of loops) {
    const total = loops
      .filter((l) => l.start <= loop.start && l.end >= loop.end)
      .reduce((product, l) => product * l.count, 1);
    if (total > MAX_LOOP_ITERATIONS) {
      const line = code.slice(0, loop.start).split("\n").length;
      return `the \`for\` at line ${line} runs ${total} times per invocation, over ${MAX_LOOP_ITERATIONS}`;
    }
  }
  return undefined;
}
