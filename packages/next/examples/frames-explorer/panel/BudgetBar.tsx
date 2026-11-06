// The accuracy budget (R16): a composed accuracy term by term, so the expert
// sees where the error comes from. Each term's width is its share of the
// variance (σᵢ² / σ²), which is what sums to the total in a root sum square;
// its color is the frame family the term comes from. An unknown term is an
// amber "not bounded" segment, and the total says so instead of a number.
import { Typography } from "@mui/material";
import type {
  AccuracyStatement,
  AccuracyTerm,
} from "../../../src/measure/accuracy.ts";
import type { Family } from "./families.ts";
import { length } from "./format.ts";
import { AccuracyText } from "./parts.tsx";

/** The family a term's error comes from (its segment's color). */
const TERM_FAMILY: Record<AccuracyTerm["source"], Family> = {
  ephemeris: "celestial",
  earthOrientation: "earth",
  relativity: "moon",
  projection: "engineering",
  trajectory: "trajectory",
  coordinateScale: "trajectory",
  lightTime: "celestial",
};

const TERM_LABEL: Record<AccuracyTerm["source"], string> = {
  ephemeris: "Ephemeris",
  earthOrientation: "Earth orientation",
  relativity: "Relativity",
  projection: "PROJ operation",
  trajectory: "Trajectory",
  coordinateScale: "Time scale",
  lightTime: "Light time",
};

const percent = (share: number) =>
  share >= 0.995
    ? "≈ 100%"
    : share < 0.001
      ? "< 0.1%"
      : `${(100 * share).toPrecision(2)}%`;

export function BudgetBar({
  accuracy,
  label,
}: {
  accuracy: AccuracyStatement;
  /** What the statement is of, as the bar's accessible name. */
  label: string;
}) {
  const known = accuracy.terms.filter(
    (t): t is AccuracyTerm & { meters: number } => t.meters !== undefined,
  );
  const variance = known.reduce((s, t) => s + t.meters * t.meters, 0);
  const unknown = accuracy.terms.filter((t) => t.meters === undefined);
  return (
    <figure className="fx-budget">
      <div className="fx-budget-total">
        <Typography variant="body-sm" color="textSecondary" render={<span />}>
          Composed accuracy
        </Typography>
        <span className="fx-budget-value">
          <AccuracyText accuracy={accuracy} compact />
        </span>
      </div>
      <div
        className="fx-budget-bar"
        role="img"
        aria-label={`${label}: ${known.map((t) => `${TERM_LABEL[t.source]} ${length(t.meters)}`).join(", ")}${unknown.length ? `, and ${unknown.length} not bounded` : ""}`}
      >
        {known.map((t, i) => (
          <span
            key={i}
            className={`fx-budget-seg fx-family-${TERM_FAMILY[t.source]}`}
            style={{
              flexGrow: variance > 0 ? (t.meters * t.meters) / variance : 0,
              ["--i" as string]: i,
            }}
          />
        ))}
        {unknown.map((_, i) => (
          <span key={`u${i}`} className="fx-budget-seg fx-budget-unknown" />
        ))}
      </div>
      <figcaption>
        <table className="fx-terms">
          <thead>
            <tr>
              <th scope="col">Term</th>
              <th scope="col" className="fx-num">
                1σ
              </th>
              <th scope="col" className="fx-num">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {accuracy.terms.map((t, i) => (
              <tr key={i}>
                <th scope="row">
                  <span
                    className={`fx-swatch ${t.meters === undefined ? "fx-swatch-unknown" : `fx-family-${TERM_FAMILY[t.source]}`}`}
                    aria-hidden
                  />
                  <span>
                    {TERM_LABEL[t.source]}
                    <span className="fx-term-note">{t.note}</span>
                  </span>
                </th>
                <td className="fx-num">
                  {t.meters === undefined ? (
                    <span className="fx-unbounded">not stated</span>
                  ) : (
                    length(t.meters)
                  )}
                </td>
                <td className="fx-num">
                  {t.meters === undefined
                    ? "—"
                    : variance > 0
                      ? percent((t.meters * t.meters) / variance)
                      : "0%"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Typography variant="caption-md" color="textSecondary" render={<p />}>
          Widths are each term&rsquo;s share of the variance, σᵢ²/σ², which sums
          to the total: σ = √(Σσᵢ²).
        </Typography>
      </figcaption>
    </figure>
  );
}
