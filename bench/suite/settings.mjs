// The settings a run can vary (docs/superpowers/plans/2026-11-13-dyno-dev-harness.md,
// section 4): one registry, read by the CLI to check a run before it starts,
// by engine ids for their labels, and by the suite page to apply `view.`
// settings and read them back. Plain JavaScript without Node imports, so
// the page (Vite) and the CLI (Node) share it.
//
// Namespaces:
//   engine.  the engine configuration (engineBuilds.mjs sets the path
//            after the namespace: engine.render.pixelRatio sets
//            config.render.pixelRatio). The default namespace: old ids
//            (2.0+sse=32, 2.0+maximumScreenSpaceError=8) read as before.
//   view.    the View, set by the catalog adapter (suite.ts) right after
//            the view is made and read back after the scene settles.
//   param.   an example's own URL parameters, declared by the example in
//            examples/index.ts (`params`) and registered from there by
//            the CLI (registerExampleParams): example scenes only, which
//            the host page (exampleDriver.ts) passes to the example.
//   tune.    development-only engine knobs (with the work that needs them).
//
// An unknown id, a value out of range, an engine or a run kind a setting
// doesn't take stops the CLI before anything runs, with the list of what
// is accepted.

/** A setting or sweep the run can't take (the CLI's usage error). */
export class SettingError extends Error {}

/** The namespaces a setting id may start with. */
export const NAMESPACES = ["engine", "view", "param", "tune"];

/** The run kinds the engine settings apply to. */
const RUNS = ["bench", "images"];

/**
 * The kinds `view.` settings apply to: the catalog's runs and example
 * runs (group D scenes), where the host page sets them on the example's
 * view. Engine settings aren't an example run's: its viewer makes its own
 * tilesets, so they would measure the default under their name.
 */
const VIEW_RUNS = [...RUNS, "example"];

/** The debug views `view.debug` may name (src/streaming/debugViews.ts). */
const DEBUG_VIEWS = [
  "off",
  "level",
  "tiles",
  "error",
  "state",
  "stretch",
  "skirts",
];

/**
 * Every setting. `label` is a person's name for it (labels and charts),
 * `type` one of number, integer, boolean or enum, with `min` and `max`
 * (inclusive) or `values`; `also` lists words a number setting accepts
 * too; `engines` and `kinds` what takes it; `aliases` other names typed
 * for it. `view.` settings say how the adapter sets (`apply`) and reads
 * (`read`) them on `{ engine, view }`.
 */
export const SETTINGS = [
  {
    id: "engine.maximumScreenSpaceError",
    label: "SSE",
    description: "the maximum screen-space error, px",
    type: "number",
    min: 0.5,
    max: 1024,
    engines: ["1.x", "2.0"],
    kinds: RUNS,
    aliases: ["sse"],
  },
  {
    id: "engine.policy",
    label: "policy",
    description: "2.0's tile selection",
    type: "enum",
    values: ["budgeted", "stepwise"],
    engines: ["2.0"],
    kinds: RUNS,
  },
  {
    id: "engine.motionBenefit",
    label: "motion benefit",
    description: "budgeted selection: load in motion by time on screen",
    type: "number",
    min: 0,
    max: 100,
    engines: ["2.0"],
    kinds: RUNS,
  },
  {
    id: "engine.prefetchErrorScale",
    label: "prefetch error scale",
    description: "budgeted selection: what the camera is about to reveal",
    type: "number",
    min: 0,
    max: 64,
    engines: ["2.0"],
    kinds: RUNS,
  },
  {
    id: "engine.opportunisticRatio",
    label: "opportunistic ratio",
    description: "budgeted selection: cached finer content drawn early",
    type: "number",
    min: 0,
    max: 1,
    engines: ["2.0"],
    kinds: RUNS,
  },
  {
    id: "engine.skipLevels",
    label: "skip levels",
    description: "budgeted selection: levels skipped before an intermediate",
    type: "integer",
    min: 0,
    max: 32,
    engines: ["2.0"],
    kinds: RUNS,
  },
  {
    id: "engine.render.pixelRatio",
    label: "pixel ratio",
    description: "drawing-buffer pixels per CSS pixel",
    type: "number",
    min: 0.25,
    max: 4,
    also: ["device"],
    engines: ["1.x", "2.0"],
    kinds: RUNS,
  },
  {
    id: "view.lodExponent",
    label: "error exponent",
    description: "View.lodExponent",
    type: "number",
    min: 0,
    max: 1,
    engines: ["2.0"],
    kinds: VIEW_RUNS,
    apply: ({ view }, v) => (view.lodExponent = v),
    read: ({ view }) => view.lodExponent,
  },
  {
    id: "view.shadows",
    label: "shadows",
    description: "View.shadows: the sun's cascaded shadow maps",
    type: "boolean",
    engines: ["2.0"],
    kinds: VIEW_RUNS,
    apply: ({ view }, v) => (view.shadows = v),
    read: ({ view }) => view.shadows,
  },
  {
    id: "view.debug",
    label: "debug view",
    description: "View.debug",
    type: "enum",
    values: DEBUG_VIEWS,
    engines: ["2.0"],
    kinds: VIEW_RUNS,
    apply: ({ view }, v) => (view.debug = v),
    read: ({ view }) => view.debug,
  },
  {
    id: "view.occlusionCull",
    label: "occlusion culling",
    description: "View.occlusionCulling: off culls draws by the frustum alone",
    type: "enum",
    values: ["on", "off"],
    engines: ["2.0"],
    kinds: VIEW_RUNS,
    apply: ({ view }, v) => (view.occlusionCulling = v),
    read: ({ engine, view }) =>
      view.occlusionCulling ?? engine?.occlusionCulling,
  },
  {
    id: "view.coarsen",
    label: "coarsen hidden tiles",
    description: "OcclusionFeedback.coarsen: hidden tiles coarsen over time",
    type: "boolean",
    engines: ["2.0"],
    kinds: VIEW_RUNS,
    apply: ({ view }, v) => (view.occlusionState.coarsen = v),
    read: ({ view }) => view.occlusionState.coarsen,
  },
  {
    id: "view.lod",
    label: "terrain LOD",
    description: "View.lodTransitions: how terrain changes level",
    type: "enum",
    values: ["morph", "pop"],
    engines: ["2.0"],
    kinds: VIEW_RUNS,
    apply: ({ view }, v) => (view.lodTransitions = v),
    read: ({ view }) => view.lodTransitions,
  },
];

const BY_NAME = new Map();
for (const s of SETTINGS) {
  BY_NAME.set(s.id, s);
  for (const alias of s.aliases ?? []) {
    BY_NAME.set(alias, s);
  }
}

/**
 * Adds a `param.<name>` setting for each parameter the examples declare
 * (examples/index.ts `params`), once: `[{ id, title, params: [{ name,
 * label, type, min?, max?, values? }] }]`. A name two examples declare
 * must mean the same range in both; the setting lists the examples that
 * take it (`examples`). Returns the `param.` settings.
 */
export function registerExampleParams(examples) {
  for (const example of examples) {
    for (const p of example.params ?? []) {
      const id = `param.${p.name}`;
      const declared = {
        type: p.type,
        ...(p.type === "enum" ? { values: [...p.values] } : {}),
        ...(p.type === "number" || p.type === "integer"
          ? { min: p.min, max: p.max }
          : {}),
      };
      const existing = BY_NAME.get(id);
      if (existing) {
        const same =
          existing.type === declared.type &&
          existing.min === declared.min &&
          existing.max === declared.max &&
          (existing.values ?? []).join() === (declared.values ?? []).join();
        if (!same) {
          throw new SettingError(
            `${id}: ${example.id} declares it as ${rangeOf({ id, ...declared })}, another example as ${rangeOf(existing)}`,
          );
        }
        if (!existing.examples.includes(example.id)) {
          existing.examples.push(example.id);
        }
        continue;
      }
      const setting = {
        id,
        label: p.label,
        description: `${example.title}: ${p.label}`,
        ...declared,
        engines: ["2.0"],
        kinds: ["example"],
        examples: [example.id],
      };
      SETTINGS.push(setting);
      BY_NAME.set(id, setting);
    }
  }
  return SETTINGS.filter((s) => s.id.startsWith("param."));
}

/**
 * The example scenes among `scenes` that don't take a `param.` setting,
 * as "<setting> (<scene>: <example>)", for the CLI's refusal; empty when
 * every one does.
 */
export function paramsNotTaken(settingIds, scenes) {
  const out = [];
  for (const id of settingIds) {
    const setting = findSetting(id);
    if (!setting?.id.startsWith("param.")) {
      continue;
    }
    for (const scene of scenes) {
      if (!setting.examples.includes(scene.example)) {
        out.push(`${setting.id} (${scene.id}: ${scene.example})`);
      }
    }
  }
  return out;
}

/**
 * The setting a typed key names: its id, an alias, or a key without a
 * namespace, which reads as `engine.` (maximumScreenSpaceError,
 * render.pixelRatio). Undefined when there is none.
 */
export function findSetting(key) {
  const k = String(key);
  if (BY_NAME.has(k)) {
    return BY_NAME.get(k);
  }
  const namespace = k.split(".")[0];
  return NAMESPACES.includes(namespace)
    ? undefined
    : BY_NAME.get(`engine.${k}`);
}

/** What a setting takes, in words: "0 to 1", "on or off", "true or false". */
export function rangeOf(setting) {
  const or = (list) =>
    list.length < 3
      ? list.join(" or ")
      : `${list.slice(0, -1).join(", ")} or ${list.at(-1)}`;
  if (setting.type === "boolean") {
    return "true or false";
  }
  if (setting.type === "enum") {
    return or(setting.values);
  }
  const range = `${setting.type === "integer" ? "an integer " : ""}${setting.min} to ${setting.max}`;
  return setting.also ? `${range}, or ${or(setting.also)}` : range;
}

/** The settings, one per line, for messages and `--help`. */
export function settingsList({ engine, kind } = {}) {
  return SETTINGS.filter(
    (s) =>
      (!engine || s.engines.includes(engine)) &&
      (!kind || s.kinds.includes(kind)),
  )
    .map((s) => `  ${s.id} (${rangeOf(s)}): ${s.description}`)
    .join("\n");
}

/** An error naming what was wrong and what is accepted. */
function refused(message, filter) {
  return new SettingError(
    `${message}. The settings${filter.engine ? ` ${filter.engine} takes` : ""}:\n${settingsList(filter)}`,
  );
}

/**
 * Checks one typed `key=value` and returns `{ setting, value }`, the value
 * typed (a number, a boolean or a word). `engine` ("1.x" or "2.0") and
 * `kind` (bench, images) narrow what is accepted.
 */
export function checkSetting(key, raw, { engine, kind } = {}) {
  const setting = findSetting(key);
  if (!setting) {
    const near = SETTINGS.find((s) => s.id.endsWith(`.${key}`));
    throw refused(
      `unknown setting "${key}"${near ? ` (did you mean ${near.id}?)` : ""}`,
      { engine, kind },
    );
  }
  if (engine && !setting.engines.includes(engine)) {
    throw refused(`${setting.id} doesn't apply to ${engine}`, {
      engine,
      kind,
    });
  }
  if (kind && !setting.kinds.includes(kind)) {
    throw refused(`a ${kind} run doesn't take ${setting.id}`, {
      engine,
      kind,
    });
  }
  return { setting, value: parseValue(setting, raw) };
}

/** A typed value of `setting` from text, or a SettingError. */
export function parseValue(setting, raw) {
  const text = String(raw).trim();
  const bad = () =>
    new SettingError(
      `${setting.id}=${text}: ${setting.id} takes ${rangeOf(setting)}`,
    );
  if (setting.type === "boolean") {
    if (text === "true" || text === "false") {
      return text === "true";
    }
    throw bad();
  }
  if (setting.type === "enum") {
    if (setting.values.includes(text)) {
      return text;
    }
    throw bad();
  }
  if (setting.also?.includes(text)) {
    return text;
  }
  const n = Number(text);
  if (
    text === "" ||
    !Number.isFinite(n) ||
    n < setting.min ||
    n > setting.max ||
    (setting.type === "integer" && !Number.isInteger(n))
  ) {
    throw bad();
  }
  return n;
}

/**
 * How a configuration id spells a setting: engine settings without their
 * namespace, as ids always have (2.0+maximumScreenSpaceError=8), others
 * in full (2.0+view.lodExponent=0.5).
 */
export function variantKey(setting) {
  return setting.id.startsWith("engine.")
    ? setting.id.slice("engine.".length)
    : setting.id;
}

/** Where a setting goes in an engine configuration (engineBuilds.mjs). */
export function configPath(setting) {
  return variantKey(setting);
}

/** "SSE 32", "error exponent 0.5", "shadows off": a variant in words. */
export function variantWords(key, value) {
  const setting = findSetting(key);
  const label = setting?.label ?? key;
  if (setting?.type === "boolean") {
    return `${label} ${value === "true" || value === true ? "on" : "off"}`;
  }
  return `${label} ${value}`;
}

/**
 * Checks every `key=value` variant of a parsed engine spec (engines.mjs),
 * for the run kind; named variants (stepwise) are the catalog's.
 */
export function checkVariants(parsed, kind) {
  return parsed.variants
    .filter((v) => v.includes("="))
    .map((v) => {
      const at = v.indexOf("=");
      return checkSetting(v.slice(0, at), v.slice(at + 1), {
        engine: parsed.engine,
        kind,
      });
    });
}

// ----------------------------------------------------------------- sweeps

/** The coordinates of a point, in axis order, as a configuration suffix. */
export function pointSuffix(coords, order) {
  return order
    .filter((id) => Object.hasOwn(coords, id))
    .map((id) => {
      const setting = findSetting(id);
      return `+${setting ? variantKey(setting) : id}=${coords[id]}`;
    })
    .join("");
}

/** "key=a,b,c" → { setting, values } (typed, in order, without repeats). */
function parseAxis(text, filter) {
  const at = String(text).indexOf("=");
  const key = at > 0 ? text.slice(0, at) : "";
  const list = at > 0 ? text.slice(at + 1) : "";
  if (!key || !list) {
    throw new SettingError(
      `--sweep ${text}: write --sweep <setting>=<value>,<value>, e.g. --sweep view.lodExponent=0,0.5,1`,
    );
  }
  const values = list
    .split(",")
    .map((raw) => checkSetting(key, raw, filter).value);
  return axisOf(findSetting(key), values);
}

function axisOf(setting, values) {
  const unique = [...new Set(values)];
  if (unique.length < 2) {
    throw new SettingError(
      `${setting.id}: a sweep axis takes at least two values`,
    );
  }
  return { setting, values: unique };
}

/**
 * Plans a sweep before anything runs: its axes, its points and its
 * reference, every id and value checked against the registry.
 *
 *   sweeps          the typed --sweep values ("key=a,b"), any number
 *   file            the parsed --sweep-file: { axes: [{ id, values }],
 *                   points?: [{ "<id>": value, … }] }; points, when
 *                   given, list the grid (for grids that aren't products)
 *   reference       --reference "key=value": a value of a swept axis, or
 *                   a setting outside the grid, run once per other point
 *   referenceReps   --reference-reps: how often each reference point runs
 *                   in each repetition (the noise floor)
 *   engine, kind    what the swept engines are and the run kind
 *
 * Returns { axes: [{ id, values }], points: [{ coords, reference? }],
 * reference?: { id, value, reps, outside? } }, or undefined without any
 * sweep. Throws a SettingError for anything it can't run.
 */
export function planSweep({
  sweeps = [],
  file,
  reference,
  referenceReps,
  engine,
  kind,
} = {}) {
  const filter = { engine, kind };
  if (sweeps.length && file) {
    throw new SettingError("--sweep and --sweep-file: give one or the other");
  }
  let axes;
  let points;
  if (file) {
    if (!Array.isArray(file.axes) || !file.axes.length) {
      throw new SettingError(
        '--sweep-file: expected { "axes": [{ "id": "view.lodExponent", "values": [0, 1] }], "points"?: [{ "view.lodExponent": 0 }] }',
      );
    }
    axes = file.axes.map((a) => {
      const setting = findSetting(a?.id);
      if (!setting) {
        throw refused(`--sweep-file: unknown setting "${a?.id}"`, filter);
      }
      if (!Array.isArray(a.values)) {
        throw new SettingError(`--sweep-file: ${a.id} has no "values" list`);
      }
      return axisOf(
        setting,
        a.values.map((v) => checkSetting(a.id, v, filter).value),
      );
    });
  } else if (sweeps.length) {
    axes = sweeps.map((text) => parseAxis(text, filter));
  } else {
    if (reference || referenceReps !== undefined) {
      throw new SettingError(
        "--reference and --reference-reps belong to a sweep (--sweep or --sweep-file)",
      );
    }
    return undefined;
  }
  const ids = axes.map((a) => a.setting.id);
  const twice = ids.find((id, i) => ids.indexOf(id) !== i);
  if (twice) {
    throw new SettingError(`${twice} is swept twice: give it one --sweep`);
  }
  const byId = new Map(axes.map((a) => [a.setting.id, a]));
  if (file?.points) {
    if (!Array.isArray(file.points) || !file.points.length) {
      throw new SettingError('--sweep-file: "points" is an empty list');
    }
    const seen = new Set();
    points = file.points.map((p, i) => {
      const coords = {};
      for (const [key, raw] of Object.entries(p ?? {})) {
        const setting = findSetting(key);
        const axis = setting && byId.get(setting.id);
        if (!axis) {
          throw new SettingError(
            `--sweep-file: point ${i + 1} sets ${key}, which isn't an axis (${ids.join(", ")})`,
          );
        }
        const value = checkSetting(key, raw, filter).value;
        if (!axis.values.includes(value)) {
          throw new SettingError(
            `--sweep-file: point ${i + 1} has ${setting.id}=${value}, not one of the axis's values (${axis.values.join(", ")})`,
          );
        }
        coords[setting.id] = value;
      }
      const missing = ids.filter((id) => !Object.hasOwn(coords, id));
      if (missing.length) {
        throw new SettingError(
          `--sweep-file: point ${i + 1} has no ${missing.join(" or ")}`,
        );
      }
      const key = JSON.stringify(ids.map((id) => coords[id]));
      if (seen.has(key)) {
        throw new SettingError(`--sweep-file: point ${i + 1} is a repeat`);
      }
      seen.add(key);
      return { coords };
    });
  } else {
    // The grid: every combination, the first axis varying slowest.
    points = axes.reduce(
      (grid, axis) =>
        grid.flatMap((p) =>
          axis.values.map((v) => ({
            coords: { ...p.coords, [axis.setting.id]: v },
          })),
        ),
      [{ coords: {} }],
    );
  }
  let ref;
  if (reference) {
    const text = String(reference);
    const at = text.indexOf("=");
    if (at <= 0) {
      throw new SettingError(
        `--reference ${text}: write --reference <setting>=<value>`,
      );
    }
    const { setting, value } = checkSetting(
      text.slice(0, at),
      text.slice(at + 1),
      filter,
    );
    const axis = byId.get(setting.id);
    if (axis) {
      if (!axis.values.includes(value)) {
        throw new SettingError(
          `--reference ${setting.id}=${value}: not one of the swept values (${axis.values.join(", ")})`,
        );
      }
      for (const p of points) {
        if (p.coords[setting.id] === value) {
          p.reference = true;
        }
      }
      ref = { id: setting.id, value };
    } else {
      // A variant outside the grid: once per combination of the axes.
      const extra = points.map((p) => ({
        coords: { ...p.coords, [setting.id]: value },
        reference: true,
      }));
      points.push(...extra);
      ref = { id: setting.id, value, outside: true };
    }
  }
  if (referenceReps !== undefined) {
    if (!ref) {
      throw new SettingError("--reference-reps needs --reference");
    }
    const n = Number(referenceReps);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      throw new SettingError(
        `--reference-reps ${referenceReps}: an integer from 1 to 20`,
      );
    }
    ref.reps = n;
  } else if (ref) {
    ref.reps = 1;
  }
  return {
    axes: axes.map((a) => ({ id: a.setting.id, values: a.values })),
    points,
    ...(ref ? { reference: ref } : {}),
  };
}

/**
 * A run's sweep record as { axes, reference?, engines, points: [{ coords,
 * configs, reference? }] }, whichever form it was written in: one-axis
 * records from before (`{ param, values, engines, points: [{ value,
 * configs }] }`) read as one axis. Undefined for anything else.
 */
export function readSweep(sweep) {
  if (!sweep || typeof sweep !== "object") {
    return undefined;
  }
  if (Array.isArray(sweep.axes)) {
    return {
      ...sweep,
      engines: sweep.engines ?? [],
      points: (sweep.points ?? []).map((p) => ({
        ...p,
        coords: p.coords ?? {},
        configs: p.configs ?? [],
      })),
    };
  }
  if (typeof sweep.param === "string" && Array.isArray(sweep.points)) {
    return {
      axes: [
        {
          id: sweep.param,
          values: sweep.values ?? sweep.points.map((p) => p.value),
        },
      ],
      engines: sweep.engines ?? [],
      points: sweep.points.map((p) => ({
        coords: { [sweep.param]: p.value },
        configs: p.configs ?? [],
      })),
    };
  }
  return undefined;
}

// ------------------------------------------------------- the page (view.)

/** The `view.` settings, by the key a configuration's `view` holds. */
const VIEW_SETTINGS = SETTINGS.filter((s) => s.id.startsWith("view."));
const viewKey = (s) => s.id.slice("view.".length);

/**
 * Sets a configuration's `view` settings ({ lodExponent: 0.5, … }) on a
 * 2.0 view (suite.ts, after `addView`, before content is added).
 */
export function applyViewSettings(target, settings = {}) {
  for (const s of VIEW_SETTINGS) {
    const value = settings[viewKey(s)];
    if (value !== undefined) {
      s.apply(target, value);
    }
  }
}

/** What a 2.0 view holds for every `view.` setting, by key. */
export function readViewSettings(target) {
  return Object.fromEntries(
    VIEW_SETTINGS.map((s) => [viewKey(s), s.read(target)]),
  );
}

/**
 * The `view.` settings a run asked for and the page doesn't hold
 * (`metrics.view`, read back from the page): ["view.lodExponent: asked
 * 0.5, the view has 0.3"]. Empty when every one reached the view.
 */
export function unappliedViewSettings(asked = {}, held) {
  const out = [];
  for (const s of VIEW_SETTINGS) {
    const want = asked[viewKey(s)];
    if (want === undefined) {
      continue;
    }
    const have = held?.[viewKey(s)];
    if (have !== want) {
      out.push(
        `${s.id}: asked ${want}, the view has ${have === undefined ? "nothing" : have}`,
      );
    }
  }
  return out;
}
