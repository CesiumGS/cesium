// A scenario's description: its question, its knobs (three or four at most,
// on the frames it adds: knobs, not an editor) and its checked setup, the
// knob values and epoch where its published references apply (R10). At the
// checked setup its checks are the catalog's judged results; off it, they
// say the reference applies at the checked setup, and re-run live.
//
// Knob values from a deep link are untrusted: `clampKnobs` keeps valid ones,
// clamps a range's, and falls back to the checked value for anything else,
// never throwing (Review Focus 4).

import type { CheckKind } from "./checks.ts";

export type ScenarioId =
  | "earth-turns"
  | "bim-site"
  | "corridor"
  | "dish-tracks"
  | "drone"
  | "moon-from-here"
  | "one-path"
  | "stand-on-moon"
  | "ship"
  | "robot-arm"
  | "everything";

export type KnobValue = number | string;

/** One knob: a range (a number between `min` and `max`) or a choice of `options`. */
export interface KnobSpec {
  /** The knob's id, `k.<id>` in the URL. */
  id: string;
  label: string;
  kind: "range" | "choice";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /**
   * A way of looking, not a setting (the dish's "From the dish" or "From
   * orbit"): it never moves the scenario off its checked setup.
   */
  view?: boolean;
  /** A choice's options: its value (in the URL), its label, and the button's short text (the value without one). */
  options?: readonly { value: string; label: string; short?: string }[];
}

/** Each knob's value, by knob id. */
export type KnobState = Readonly<Record<string, KnobValue>>;

export interface ScenarioSpec {
  id: ScenarioId;
  title: string;
  /** The headline question the scenario answers. */
  question: string;
  knobs: readonly KnobSpec[];
  /** Where the scenario's published references apply: an ISO UTC epoch and every knob's value. */
  checked: { epochUtc: string; knobs: KnobState };
  /** The data beyond the frames it needs. */
  needs: readonly ("proj" | "geoid" | "orion" | "terrain" | "ships")[];
  globe: "ellipsoid" | "terrain";
  /** The stress catalog's result ids that back it at the checked setup. */
  checks: readonly string[];
  /**
   * What applies at the checked setup, in words: "published references"
   * (the default), or "hand formulas and round trips" for a scenario whose
   * checks cite no published value (fix 1: the BIM site, the corridor).
   */
  checkedBy?: string;
  /** A word on a check row, by its id: how far the check carries to the scenario. */
  checkNotes?: Readonly<Record<string, string>>;
  /**
   * A check's kind, by its id, where it can't be derived from its result
   * (scenarios/checks.ts `checkKind`): a hand formula that cites the kernel
   * its inputs come from, say.
   */
  checkKinds?: Readonly<Record<string, CheckKind>>;
  /**
   * Two choice knobs that never take the same value (the capstone's From
   * and To, Task 8): setting one to the other's value swaps them
   * (`withKnob`), and a link that gives both the same falls back to the
   * checked pair (`clampKnobs`).
   */
  distinct?: readonly [string, string];
  /**
   * The evaluation's own checks of its answer show at the checked setup
   * too, under their kinds (`ScenarioEvaluation.liveKinds`): the capstone's
   * pair, whose answer no catalog case checks (Task 8 fix 1).
   */
  liveAtChecked?: true;
}

/**
 * Whether `knobs` at `epochUtcMs` (UTC ms) is the checked setup, and what
 * moved: the knob ids whose values differ, in the spec's order, then "time"
 * when the epoch does. Exact comparison: any move is off the checked setup.
 */
export function checkedState(
  spec: ScenarioSpec,
  knobs: KnobState,
  epochUtcMs: number,
): { atChecked: boolean; changed: readonly string[] } {
  const changed = spec.knobs
    .filter((k) => k.view !== true && knobs[k.id] !== spec.checked.knobs[k.id])
    .map((k) => k.id);
  if (epochUtcMs !== Date.parse(spec.checked.epochUtc)) {
    changed.push("time");
  }
  return { atChecked: changed.length === 0, changed };
}

/**
 * A decimal number's text, as a URL carries it (no hex, no words, no
 * blanks). Linear: each digit run can match only one way (ReDoS).
 */
const NUMBER = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;

/** The longest number text read; longer is no knob value, and isn't tested. */
const NUMBER_LENGTH = 32;

/** `value` as a finite number, if it is one or a number's text. */
function finiteNumber(value: unknown): number | undefined {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" &&
          value.length <= NUMBER_LENGTH &&
          NUMBER.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(n) ? n : undefined;
}

function knobValue(knob: KnobSpec, value: unknown, checked: KnobValue) {
  if (knob.kind === "choice") {
    return knob.options?.some((o) => o.value === value) === true
      ? (value as string)
      : checked;
  }
  const n = finiteNumber(value);
  return n === undefined
    ? checked
    : Math.min(knob.max ?? Infinity, Math.max(knob.min ?? -Infinity, n));
}

/**
 * The scenario's knobs from untrusted values (a deep link's text, or
 * anything): a valid choice or an in-range number is kept, a number (or a
 * number's text) out of range is clamped to the range, and anything else,
 * or a knob that is missing, takes its checked value. Values for knobs the
 * scenario hasn't are dropped.
 */
export function clampKnobs(
  spec: ScenarioSpec,
  knobs: Readonly<Record<string, unknown>>,
): KnobState {
  const out: Record<string, KnobValue> = {};
  for (const knob of spec.knobs) {
    const checked = spec.checked.knobs[knob.id]!;
    out[knob.id] = knobValue(
      knob,
      Object.hasOwn(knobs, knob.id) ? knobs[knob.id] : undefined,
      checked,
    );
  }
  const pair = spec.distinct;
  if (pair && out[pair[0]] === out[pair[1]]) {
    // The same object at both ends answers nothing: the checked pair.
    out[pair[0]] = spec.checked.knobs[pair[0]]!;
    out[pair[1]] = spec.checked.knobs[pair[1]]!;
  }
  return out;
}

/**
 * `knobs` with knob `id` set to `value`, clamped (`clampKnobs`). For one of
 * the spec's `distinct` pair, taking the other's value swaps them: the
 * capstone's To set to its From turns the pair round.
 */
export function withKnob(
  spec: ScenarioSpec,
  knobs: KnobState,
  id: string,
  value: KnobValue,
): KnobState {
  const next: Record<string, KnobValue> = { ...knobs, [id]: value };
  const pair = spec.distinct;
  if (pair?.includes(id)) {
    const other = pair[0] === id ? pair[1] : pair[0];
    if (knobs[other] === value && knobs[id] !== undefined) {
      next[other] = knobs[id];
    }
  }
  return clampKnobs(spec, next);
}
