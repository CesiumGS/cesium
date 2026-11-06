// The scenario's headline answer in the panel (spec goal 5): its figure, the
// sentence that answers the question, and its accuracy (R8), always stated,
// "not bounded" with its reason when it has no size. While the knobs' new
// answer is on its way the last one stays, dimmed, with "Updating" (R9); a
// first answer shows its loading; a failure says what failed. The limit the
// scenario says plainly (the backdrop Moon) sits under it.
import { CircularProgress, Typography } from "@mui/material";
import { accuracyLine, formatAnswer } from "./answerText.ts";
import type { ScenarioPanelView } from "./model.ts";

export function ScenarioAnswer({ scenario }: { scenario: ScenarioPanelView }) {
  const a = scenario.answer;
  const loading = scenario.status === "loading";
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
        {a.value !== undefined && a.unit !== undefined && (
          <p className="fx-answer-figure fx-num">
            {formatAnswer(a.value, a.unit)}
          </p>
        )}
        <p className="fx-answer-text">{a.headline}</p>
      </div>
      <p
        className={`fx-answer-acc${a.accuracy.meters === undefined ? " fx-unbounded" : ""}`}
      >
        <span className="fx-answer-acc-label">Accuracy</span> {accuracyLine(a)}
      </p>
      {loading && (
        <p className="fx-answer-wait" role="status">
          <CircularProgress size={12} aria-hidden />
          {scenario.queued ?? "Updating for your setting…"}
        </p>
      )}
      {scenario.note && <p className="fx-answer-note">{scenario.note}</p>}
    </div>
  );
}
