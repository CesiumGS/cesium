// A scenario's answer as the page writes it (DESIGN.md "Copy and numbers"):
// its figure with its unit, its accuracy in one line (R8: always stated, "not
// bounded" with its reason when it has no size), and how far a setting moves
// it from the checked setup's. Pure, unit-tested.
import type { ScenarioAnswer } from "../scenarios/evaluate.ts";
import { length } from "./format.ts";

/** Digits after the point that suit a unit's figures. */
const DIGITS: Readonly<Record<string, number>> = {
  "°": 2,
  "km/s": 2,
  "µs/day": 2,
};

const grouped = (value: number, digits: number): string =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** "56.02 µs/day", "178.31°", "1.24 km/s". */
export function formatAnswer(value: number, unit: string): string {
  const text = grouped(value, DIGITS[unit] ?? 3).replace("-", "−");
  return unit === "°" ? `${text}°` : `${text} ${unit}`;
}

/** "±1.1 m (1σ): measured Earth orientation …", or "Not bounded: …". */
export function accuracyLine(answer: ScenarioAnswer): string {
  const { meters, note } = answer.accuracy;
  if (meters !== undefined) {
    return `±${length(meters)} (1σ): ${note}`;
  }
  const why = note.replace(/^not bounded:\s*/i, "");
  return /^(not bounded|within|not stated)/i.test(note)
    ? note.charAt(0).toUpperCase() + note.slice(1)
    : `Not bounded: ${why}`;
}

/** "+2.31°", "−0.04 km/s", "no change". */
export function formatDelta(value: number, unit: string): string {
  if (value === 0) {
    return "no change";
  }
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatAnswer(Math.abs(value), unit)}`;
}
