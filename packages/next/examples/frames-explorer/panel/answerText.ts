// A scenario's answer as the page writes it (DESIGN.md "Copy and numbers"):
// its figure with its unit, its accuracy in one line (R8: always stated, "not
// bounded" with its reason when it has no size), and how far a setting moves
// it from the checked setup's. Pure, unit-tested.
import type { ScenarioAnswer } from "../scenarios/evaluate.ts";
import { length, quantity } from "./format.ts";

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

/**
 * The accuracy needs the warning colour: it isn't bounded or isn't stated.
 * A bounded relative figure ("within 2% of the method") isn't a warning
 * (fix 2).
 */
export function accuracyWarns(answer: ScenarioAnswer): boolean {
  return (
    answer.accuracy.meters === undefined &&
    /^(not bounded|not stated|not known)/i.test(answer.accuracy.note)
  );
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

/**
 * The headline both the panel and the globe's callout show: the figure and
 * the few words that make it answer the question on its own ("1.40 km/s
 * relative to the Moon (MOON_ME)"); undefined without a figure.
 */
export function answerTitle(answer: ScenarioAnswer): string | undefined {
  if (answer.value === undefined || answer.unit === undefined) {
    return undefined;
  }
  const figure = formatAnswer(answer.value, answer.unit);
  return answer.label ? `${figure} ${answer.label}` : figure;
}

/** The headline's published counterpart, as the panel shows it (the owner, fix 1). */
export interface PublishedView {
  printed: string;
  document: string;
  url?: string;
  tolerance: string;
  unit: string;
  /** "checked": the catalog's comparison is in; "off": off the checked setup; "loading": not yet. */
  state: "checked" | "off" | "loading";
  /** At the checked setup: ours, the difference, and the verdict. */
  ours?: number;
  difference?: { value: number; unit?: string };
  pass?: boolean;
  /** Off it: how far the setting moves the answer (the proof's delta). */
  delta?: { value: number; unit: string };
}

/**
 * The comparison under the headline, in words: what was published and by
 * whom, then ours against it with the difference and the verdict at the
 * checked setup; off it, that the published value applies there and how far
 * the setting moves the answer, with no verdict; loading, no verdict.
 */
export function publishedText(p: PublishedView): {
  published: string;
  comparison: string;
} {
  const published = `Published: ${p.printed}`;
  switch (p.state) {
    case "checked":
      return {
        published,
        comparison: [
          p.ours !== undefined ? `ours ${formatAnswer(p.ours, p.unit)}` : "",
          p.difference
            ? `difference ${quantity(p.difference.value, p.difference.unit)}`
            : "",
          p.tolerance,
          p.pass ? "passes" : "fails",
        ]
          .filter((t) => t !== "")
          .join(" · "),
      };
    case "off":
      return {
        published,
        comparison: `The published value applies at the checked setup${
          p.delta
            ? `; your setting moves the answer by ${formatDelta(p.delta.value, p.delta.unit)}`
            : ""
        }. No verdict here.`,
      };
    case "loading":
      return { published, comparison: "Checking ours against it…" };
  }
}
