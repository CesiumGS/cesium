// The Report tab (R15): the run as QA evidence, copied or saved as the user
// chooses. 6b's report.ts builds the Markdown and JSON; this is their page.
import { Button, Typography } from "@mui/material";
import { svgCopy } from "@stratakit/icons/copy";
import { svgDownload } from "@stratakit/icons/download";
import { Icon } from "@stratakit/mui";
import { Section } from "./Explore.tsx";
import type { PanelActions, PanelModel } from "./model.ts";
import { StatusBadge, resultStatus } from "./parts.tsx";
import { rowName, whyFailed } from "./QuestionCard.tsx";

export function Report({
  model,
  actions,
  onCopied,
  onSelectResult,
}: {
  model: PanelModel;
  actions: PanelActions;
  onCopied: (message: string) => void;
  onSelectResult: (id: string) => void;
}) {
  const results = model.results;
  const judged = results.filter((r) => !r.displayOnly && !r.userInput);
  const failures = judged.filter(
    (r) => !r.pass && (r.missing === undefined || r.missing.length === 0),
  );
  const skipped = judged.filter((r) => r.missing && r.missing.length > 0);
  const user = results.filter((r) => r.userInput);
  const fingerprinted = results.filter((r) => r.fingerprintCheck);
  const matched = fingerprinted.filter((r) => r.fingerprintCheck!.match);
  const ready = model.run.state === "done" || model.run.state === "cancelled";
  return (
    <div className="fx-tab-body">
      <Section title="This run">
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          Every result with its value, tolerance, accuracy, effect and
          fingerprint, failures first, and the environment it ran in: the
          evidence to file with a QA record. The ion token is never in it.
        </Typography>
        <dl className="fx-dl fx-report-counts">
          <dt>Results</dt>
          <dd className="fx-num">
            {judged.length} judged:{" "}
            {judged.length - failures.length - skipped.length} passed,{" "}
            {failures.length} failed, {skipped.length} skipped
          </dd>
          <dt>Shown, not judged</dt>
          <dd className="fx-num">
            {results.filter((r) => r.displayOnly).length}
          </dd>
          <dt>Fingerprints</dt>
          <dd className="fx-num">
            {matched.length} of {fingerprinted.length} match Node&rsquo;s
          </dd>
          <dt>Your input</dt>
          <dd className="fx-num">
            {user.length === 0 ? "none" : `${user.length}, listed apart`}
          </dd>
        </dl>
        <div className="fx-report-buttons">
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Icon href={svgCopy} />}
            disabled={!ready}
            onClick={() =>
              void actions.copyReport().then(() => onCopied("Report copied"))
            }
          >
            Copy report
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icon href={svgDownload} />}
            disabled={!ready}
            onClick={() => {
              actions.saveReport("markdown");
              onCopied("Download started: frames-explorer-report.md");
            }}
          >
            Save Markdown
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icon href={svgDownload} />}
            disabled={!ready}
            onClick={() => {
              actions.saveReport("json");
              onCopied("Download started: frames-explorer-report.json");
            }}
          >
            Save JSON
          </Button>
        </div>
        {!ready && (
          <div className="fx-report-wait">
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              The report is ready once a run ends.
            </Typography>
            <Button size="small" variant="outlined" onClick={actions.runAll}>
              Run all
            </Button>
          </div>
        )}
      </Section>

      {failures.length > 0 && (
        <Section title="Failures">
          <ul className="fx-report-list">
            {failures.map((r) => {
              const s = resultStatus(r);
              return (
                <li key={r.id}>
                  <StatusBadge status={s.status} />
                  <button
                    type="button"
                    className="fx-row-button"
                    onClick={() => onSelectResult(r.id)}
                  >
                    {rowName(r, model.extras[r.id])}
                  </button>
                  <span className="fx-num fx-fail-text">
                    {whyFailed(r, model.extras[r.id])}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Environment">
        <dl className="fx-dl fx-env">
          {model.environment.map(([label, value]) => (
            <div key={label} className="fx-env-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
