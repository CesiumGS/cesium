// The scenario's headline answer in the panel (spec goal 5): its figure, the
// sentence that answers the question, and its accuracy (R8), always stated,
// "not bounded" with its reason when it has no size. While the knobs' new
// answer is on its way the last one stays, dimmed, with "Updating" (R9); a
// first answer shows its loading; a failure says what failed. The limit the
// scenario says plainly (the backdrop Moon) sits under it. Where the answer
// says how it is worked out (stand-on-moon's clock rates, Task 4c item 1),
// its steps follow, open, under "How this is worked out".
import { CircularProgress, Link, Typography } from "@mui/material";
import {
  accuracyLine,
  accuracyWarns,
  answerTitle,
  publishedText,
  type PublishedView,
} from "./answerText.ts";
import { accuracyLength } from "./families.ts";
import { webLink } from "./Inspector.tsx";

/**
 * The published counterpart, under the headline (the owner, fix 1): the
 * value and its citation (a link where references.json gives one; its text
 * rendered as text), then ours against it at the checked setup, or that it
 * applies there when off it. No verdict but at the checked setup.
 */
function Published({ p }: { p: PublishedView }) {
  const t = publishedText(p);
  const link = webLink(p.url);
  return (
    <div className={`fx-answer-published fx-published-${p.state}`}>
      <p>
        <span className="fx-strong">{t.published}</span>
        {" — "}
        {link ? (
          <Link href={link.href} target="_blank" rel="noreferrer noopener">
            {p.document}
          </Link>
        ) : (
          p.document
        )}
      </p>
      <p className="fx-answer-comparison fx-num">{t.comparison}</p>
    </div>
  );
}
import { memo } from "react";
import { equalOn } from "./memo.ts";
import type { ScenarioPanelView } from "./model.ts";

/** The scenario fields the answer reads (Task 4d). */
export const ANSWER_READS = [
  "answer",
  "freshness",
  "problem",
  "status",
  "queued",
  "published",
  "note",
  "terrain",
  "appCode",
] as const;

export const ScenarioAnswer = memo(
  ScenarioAnswerView,
  equalOn("scenario", ANSWER_READS),
);

function ScenarioAnswerView({ scenario }: { scenario: ScenarioPanelView }) {
  const a = scenario.answer;
  // The last setup's answer, dimmed, while the new one is worked out; while
  // the clock plays it follows in place, not dimmed.
  const loading = scenario.freshness === "updating";
  const following = scenario.freshness === "following";
  if (scenario.status === "error" && scenario.problem) {
    return (
      <div className="fx-answer fx-answer-problem" role="alert">
        <p className="fx-strong">
          {scenario.problem.missing
            ? "This scenario's data isn't in the frames store."
            : "This scenario didn't answer."}
        </p>
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          {scenario.problem.missing
            ? "Run npm run setup in packages/next, then reload."
            : scenario.problem.message}
        </Typography>
      </div>
    );
  }
  if (!a) {
    return (
      <div className="fx-answer" role="status">
        <p className="fx-answer-wait">
          <CircularProgress size={14} aria-hidden />
          {scenario.queued ?? "Working out the answer in the worker…"}
        </p>
      </div>
    );
  }
  return (
    <div className="fx-answer" aria-busy={loading}>
      <div className={`fx-answer-main${loading ? " fx-stale" : ""}`}>
        {answerTitle(a) !== undefined && (
          <p className="fx-answer-figure fx-num">{answerTitle(a)}</p>
        )}
        {a.aside && <p className="fx-answer-aside fx-num">{a.aside}</p>}
        {/* The mask's comparison is a Checks row of its own (Task 6c fix 1). */}
        {scenario.terrain
          ?.filter((t) => t.id !== "mask-check")
          .map((t) => (
            <p
              key={t.id}
              className={`fx-answer-terrain fx-terrain-${t.state}`}
              role="status"
            >
              {t.text}
              {t.accuracy && (
                <span className="fx-answer-terrain-acc"> {t.accuracy}.</span>
              )}
            </p>
          ))}
        {scenario.published ? (
          <Published p={scenario.published} />
        ) : (
          a.unpublished && (
            // No published value for this answer (the capstone's pairs):
            // said in one line, with what checks it instead (Task 8).
            <p className="fx-answer-published fx-published-none">
              {a.unpublished}
            </p>
          )
        )}
        <p className="fx-answer-text">{a.headline}</p>
      </div>
      <p className={`fx-answer-acc${accuracyWarns(a) ? " fx-unbounded" : ""}`}>
        <span className="fx-answer-acc-label">Accuracy</span> {accuracyLine(a)}
      </p>
      {a.breakdown && a.breakdown.length > 0 && (
        <dl
          className={`fx-answer-breakdown${loading ? " fx-stale" : ""}`}
          aria-label="The accuracy term by term (1σ)"
        >
          {a.breakdown.map((t) => (
            <div key={t.label} className="fx-answer-term" title={t.note}>
              <dt>{t.label}</dt>
              <dd className="fx-num">
                {t.meters === undefined
                  ? "not stated"
                  : t.meters === 0
                    ? "exact"
                    : breakdownFigure(t.meters)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {loading && (
        <p className="fx-answer-wait" role="status">
          <CircularProgress size={12} aria-hidden />
          {scenario.queued ?? "Updating for your setting…"}
        </p>
      )}
      {following && (
        <p className="fx-answer-follow">
          Following the clock: the answer at a moment ago, updated as it plays.
        </p>
      )}
      {a.method && a.method.length > 0 && (
        <details className="fx-answer-method" open>
          <summary>How this is worked out</summary>
          <ol>
            {a.method.map((s) => (
              <li key={s.title}>
                <span className="fx-strong">{s.title}.</span> {s.text}
              </li>
            ))}
          </ol>
        </details>
      )}
      {scenario.appCode && (
        <details className="fx-answer-method fx-answer-code">
          <summary>How these frames are defined</summary>
          <p>{scenario.appCode.summary}</p>
          <pre aria-label={`From ${scenario.appCode.file}`}>
            <code>{scenario.appCode.code}</code>
          </pre>
          <p className="fx-answer-code-file">{scenario.appCode.file}</p>
        </details>
      )}
      {scenario.note && <p className="fx-answer-note">{scenario.note}</p>}
    </div>
  );
}

/** A term's size, as an edge or a route step prints the same accuracy (Task 9, I2). */
function breakdownFigure(meters: number): string {
  return `±${accuracyLength(meters)}`;
}
