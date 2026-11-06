// A knob's value and what moved off the checked setup, in words (pure,
// test/framesExplorerProofText.test.ts).
import type { KnobSpec, KnobValue } from "../scenarios/spec.ts";

/** "3,600×", "−45.5°", "25 m". */
export function knobText(knob: KnobSpec, value: KnobValue): string {
  if (knob.kind === "choice") {
    return knob.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  const n = Number(value);
  const digits = (knob.step ?? 1) < 1 ? 1 : 0;
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
    v === undefined ? "" : k.kind === "choice" ? String(v) : knobText(k, v);
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
