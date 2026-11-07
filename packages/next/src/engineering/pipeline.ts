// Structured PROJ pipelines. A pipeline is data (steps with parameters); the
// only place a pipeline string is made is `formatPipeline`, which validates
// every key and value. `parsePipeline` reads a PROJ string into the same data.

/** A parameter's value: its text, or `true` for a bare flag such as `+inv`. */
export type ParamValue = string | true;

/** One PROJ operation; `operation` is the `+proj=` value. */
export interface PipelineStep {
  readonly operation: string;
  /** Run in reverse (`+inv`). */
  readonly inverse?: boolean;
  /** Parameters other than `proj` and `inv`, in written order. */
  readonly params?: Readonly<Record<string, ParamValue>>;
}

export interface Pipeline {
  /** Parameters written before the first step (`+proj=pipeline +ellps=GRS80 ...`). */
  readonly globals?: Readonly<Record<string, ParamValue>>;
  readonly steps: readonly PipelineStep[];
}

/** The parameters that name grid files, and so need them loaded. */
export type GridKey = "grids" | "nadgrids" | "geoidgrids";

export interface PipelineGrid {
  readonly name: string;
  /** Written `@name`: PROJ goes on without it. */
  readonly optional: boolean;
  readonly key: GridKey;
}

const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const GRID_KEYS: readonly GridKey[] = ["grids", "nadgrids", "geoidgrids"];

function shown(text: string): string {
  return JSON.stringify(text.length > 60 ? `${text.slice(0, 57)}...` : text);
}

function checkKey(key: string): void {
  if (!KEY.test(key)) {
    throw new Error(
      `PROJ pipeline: ${shown(key)} is not a valid parameter name`,
    );
  }
}

// What PROJ writes in a value (checked against every string proj.db 9.7.1
// produces). An allowlist, not a blocklist: PROJ's tokenizer honours double
// quotes, so a quote could hide a "+step" and make PROJ run another pipeline
// than the one validated here.
const VALUE = /^[A-Za-z0-9_.,@/:=-]+$/;

function checkValue(key: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || !VALUE.test(value)) {
    throw new Error(
      `PROJ pipeline: the value ${shown(String(value))} of +${key} is empty or holds a character outside A-Z a-z 0-9 _ . , @ / : = -`,
    );
  }
}

function tokens(
  text: string,
  what: string,
): { key: string; value: ParamValue }[] {
  const out: { key: string; value: ParamValue }[] = [];
  for (const token of text.trim().split(/\s+/)) {
    if (token === "") {
      continue;
    }
    if (!token.startsWith("+")) {
      throw new Error(
        `PROJ pipeline: ${what} has the token ${shown(token)}, which does not start with "+"`,
      );
    }
    const equals = token.indexOf("=");
    const key = equals < 0 ? token.slice(1) : token.slice(1, equals);
    checkKey(key);
    if (equals < 0) {
      out.push({ key, value: true });
    } else {
      const value = token.slice(equals + 1);
      checkValue(key, value);
      out.push({ key, value });
    }
  }
  return out;
}

function collect(
  list: { key: string; value: ParamValue }[],
  what: string,
): Record<string, ParamValue> {
  const params: Record<string, ParamValue> = {};
  for (const { key, value } of list) {
    if (Object.hasOwn(params, key)) {
      throw new Error(`PROJ pipeline: ${what} repeats +${key}`);
    }
    params[key] = value;
  }
  return params;
}

function parseStep(text: string, index: number): PipelineStep {
  const what = `step ${index + 1}`;
  const list = tokens(text, what);
  if (list.length === 0) {
    throw new Error(`PROJ pipeline: ${what} is empty`);
  }
  let inverse = false;
  let operation: string | undefined;
  const rest: { key: string; value: ParamValue }[] = [];
  for (const entry of list) {
    if (entry.key === "inv" && entry.value === true) {
      inverse = true;
    } else if (entry.key === "inv" || entry.key === "step") {
      throw new Error(`PROJ pipeline: ${what} has +${entry.key} with a value`);
    } else if (entry.key === "proj") {
      if (typeof entry.value !== "string" || operation !== undefined) {
        throw new Error(`PROJ pipeline: ${what} has a bad +proj`);
      }
      operation = entry.value;
    } else {
      rest.push(entry);
    }
  }
  if (operation === undefined) {
    throw new Error(`PROJ pipeline: ${what} has no +proj`);
  }
  checkKey(operation);
  if (operation === "pipeline") {
    throw new Error(`PROJ pipeline: ${what} nests a pipeline`);
  }
  const params = collect(rest, what);
  return {
    operation,
    ...(inverse && { inverse }),
    ...(rest.length > 0 && { params }),
  };
}

/**
 * Reads a PROJ string (`+key[=value]` tokens) into a `Pipeline`. A string
 * that is not a `+proj=pipeline` is a single step. Throws on an empty step, a
 * token that does not start with "+", a step with no `+proj`, or a repeated
 * parameter.
 */
export function parsePipeline(text: string): Pipeline {
  const parts = text.split(/\s\+step(?=\s|$)|^\+step(?=\s|$)/);
  const head = tokens(parts[0]!, "the pipeline");
  const wrapper = head.find((entry) => entry.key === "proj");
  const isPipeline = wrapper !== undefined && wrapper.value === "pipeline";
  if (!isPipeline) {
    if (parts.length > 1) {
      throw new Error(
        `PROJ pipeline: "+step" needs "+proj=pipeline" before it`,
      );
    }
    return { steps: [parseStep(text, 0)] };
  }
  const globals = head.filter((entry) => entry !== wrapper);
  const steps = parts.slice(1).map(parseStep);
  if (steps.length === 0) {
    throw new Error("PROJ pipeline: the pipeline has no steps");
  }
  return {
    ...(globals.length > 0 && { globals: collect(globals, "the pipeline") }),
    steps,
  };
}

function writeParams(
  params: Readonly<Record<string, ParamValue>> | undefined,
  reserved: readonly string[],
): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(params ?? {})) {
    checkKey(key);
    if (reserved.includes(key)) {
      throw new Error(
        `PROJ pipeline: +${key} is not allowed as a parameter here`,
      );
    }
    if (value === true) {
      out.push(`+${key}`);
    } else {
      checkValue(key, value as unknown);
      out.push(`+${key}=${value}`);
    }
  }
  return out;
}

function writeStep(step: PipelineStep): string {
  checkKey(step.operation);
  return [
    ...(step.inverse ? ["+inv"] : []),
    `+proj=${step.operation}`,
    ...writeParams(step.params, ["proj", "inv", "step"]),
  ].join(" ");
}

/**
 * The PROJ string for a pipeline: the only place one is made. It validates
 * every key (letters, digits and "_", not starting with a digit) and value
 * (only A-Z a-z 0-9 _ . , @ / : = -, so no quote, space or "+") and throws,
 * naming the token. One step with no globals is written without the
 * `+proj=pipeline` wrapper, so a one-step pipeline PROJ wrote with the wrapper
 * is equivalent, not identical, after a round trip.
 */
export function formatPipeline(pipeline: Pipeline): string {
  const { globals, steps } = pipeline;
  const globalTokens = writeParams(globals, ["proj", "step"]);
  if (steps.length === 0) {
    throw new Error("PROJ pipeline: the pipeline has no steps");
  }
  if (steps.length === 1 && globalTokens.length === 0) {
    return writeStep(steps[0]!);
  }
  return [
    "+proj=pipeline",
    ...globalTokens,
    ...steps.map((step) => `+step ${writeStep(step)}`),
  ].join(" ");
}

/**
 * The grid files a pipeline names (`grids`, `nadgrids`, `geoidgrids`, in
 * steps and globals), in written order. Each value splits on ","; a leading
 * "@" marks the grid optional; PROJ's special name `null` is dropped.
 */
export function pipelineGrids(pipeline: Pipeline): readonly PipelineGrid[] {
  const out: PipelineGrid[] = [];
  const scan = (params: Readonly<Record<string, ParamValue>> | undefined) => {
    for (const key of GRID_KEYS) {
      const value = params?.[key];
      if (typeof value !== "string") {
        continue;
      }
      for (const raw of value.split(",")) {
        const optional = raw.startsWith("@");
        const name = optional ? raw.slice(1) : raw;
        if (name !== "" && name !== "null") {
          out.push({ name, optional, key });
        }
      }
    }
  };
  scan(pipeline.globals);
  for (const step of pipeline.steps) {
    scan(step.params);
  }
  return out;
}
