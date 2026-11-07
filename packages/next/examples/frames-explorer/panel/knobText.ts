// A knob's value and what moved off the checked setup, in words (pure,
// test/framesExplorerProofText.test.ts).
import type { KnobSpec, KnobValue } from "../scenarios/spec.ts";

/** The digits after the point a step needs: 0 for 1, 1 for 0.5, 7 for 0.0000005. */
export function stepDigits(step: number): number {
  return step >= 1 ? 0 : Math.min(12, Math.ceil(-Math.log10(step) - 1e-9));
}

/** `v` rounded to `step`, without float64's tails (0.0000005 × 2000075 is 1.0000375, not 1.0000374999999999). */
export function snapToStep(v: number, step: number): number {
  return Number((Math.round(v / step) * step).toFixed(stepDigits(step)));
}

/** "3,600×", "−45.5°", "25 m". */
export function knobText(knob: KnobSpec, value: KnobValue): string {
  if (knob.kind === "choice") {
    return knob.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  const n = Number(value);
  const digits = stepDigits(knob.step ?? 1);
  const text = n
    .toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    .replace("-", "−");
  return knob.unit === "×" || knob.unit === "°"
    ? `${text}${knob.unit}`
    : knob.unit
      ? `${text} ${knob.unit}`
      : text;
}

/**
 * What moved and from what (owner, fix 1): "Draw Orion's path in ITRF
 * (checked: MOON_ME)", "time 2026-04-07 04:00 UTC (checked: 2026-04-06
 * 23:00 UTC)".
 */
export function movedText(s: {
  changed: readonly string[];
  knobs: readonly KnobSpec[];
  values: Readonly<Record<string, KnobValue>>;
  checked: Readonly<Record<string, KnobValue>>;
  epochUtc: string;
  checkedEpochUtc: string;
}): string {
  const short = (k: KnobSpec, v: KnobValue | undefined) =>
    v === undefined
      ? ""
      : k.kind === "choice"
        ? (k.options?.find((o) => o.value === v)?.short ?? String(v))
        : knobText(k, v);
  const parts = s.changed.map((c) => {
    if (c === "time") {
      return `time ${utcText(s.epochUtc)} (checked: ${utcText(s.checkedEpochUtc)})`;
    }
    const k = s.knobs.find((x) => x.id === c);
    return k
      ? `${k.label} ${short(k, s.values[c])} (checked: ${short(k, s.checked[c])})`
      : c;
  });
  return parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join("; ")}; and ${parts.at(-1)}`;
}

export function utcText(iso: string): string {
  return iso.replace("T", " ").replace(/:\d\d(\.\d+)?Z$/, " UTC");
}
