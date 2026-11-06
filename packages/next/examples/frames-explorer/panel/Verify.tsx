// The Verify tab (R14): lens chips, the run, question cards with their rows,
// and the inspector for the selected result.
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgPlay } from "@stratakit/icons/play";
import { svgStop } from "@stratakit/icons/stop";
import { Icon } from "@stratakit/mui";
import { useState } from "react";
import type { StressResult } from "../tests.ts";
import { duration } from "./format.ts";
import { Inspector } from "./Inspector.tsx";
import type {
  GroupInfo,
  LensChoice,
  PanelActions,
  PanelModel,
} from "./model.ts";
import { QuestionCard } from "./QuestionCard.tsx";
import { TryYourOwn } from "./TryYourOwn.tsx";

const LENS_LABEL: Record<LensChoice, string> = {
  all: "All",
  civil: "Civil",
  bim: "BIM",
  gis: "GIS",
  space: "Space",
  timing: "Timing",
  offshore: "Offshore",
  av: "AV",
};

/** A group's results: its own, or a virtual group's collection. */
export function resultsOf(
  g: GroupInfo,
  results: readonly StressResult[],
): StressResult[] {
  return g.virtual
    ? results.filter((r) => r.fingerprint !== undefined)
    : results.filter((r) => r.group === g.id);
}

export function Verify({
  model,
  actions,
  lens,
  setLens,
  frameFilter,
  clearFrameFilter,
  selected,
  onSelect,
  onHighlightFrames,
  onCopyLink,
}: {
  model: PanelModel;
  actions: PanelActions;
  lens: LensChoice;
  setLens: (lens: LensChoice) => void;
  /** A frame selected in the tree: only the groups that use it (R14). */
  frameFilter: string | undefined;
  clearFrameFilter: () => void;
  selected: string | undefined;
  onSelect: (id: string | undefined) => void;
  onHighlightFrames: (result: StressResult) => void;
  onCopyLink: (id: string) => void;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    const r = model.results.find((x) => x.id === selected);
    return new Set(r ? [r.group] : []);
  });
  const [inspectorFull, setInspectorFull] = useState(false);
  const groups = model.groups.filter(
    (g) =>
      (lens === "all" || g.lenses.includes(lens)) &&
      (frameFilter === undefined ||
        (g.focus?.frames.includes(frameFilter) ?? false)),
  );
  // R14: the inspector never shows a result the lens hides.
  const shownIds = new Set(
    groups.flatMap((g) => resultsOf(g, model.results).map((r) => r.id)),
  );
  const result =
    selected !== undefined && shownIds.has(selected)
      ? model.results.find((r) => r.id === selected)
      : undefined;
  const { run } = model;
  const setCard = (id: string, v: boolean) =>
    setOpen((was) => {
      const next = new Set(was);
      if (v) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  return (
    <div
      className={`fx-verify${result ? " fx-has-inspector" : ""}${result && inspectorFull ? " fx-inspector-full" : ""}`}
    >
      <div className="fx-verify-list">
        <div className="fx-verify-tools">
          {/* One audience at a time (R14), so exclusive: All clears it. */}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={lens}
            onChange={(_, next: LensChoice | null) => setLens(next ?? "all")}
            aria-label="Audience"
            className="fx-lenses"
          >
            {(Object.keys(LENS_LABEL) as LensChoice[]).map((l) => (
              <ToggleButton
                key={l}
                value={l}
                render={<Button variant="outlined" />}
              >
                {LENS_LABEL[l]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <div className="fx-run">
            <Typography
              variant="body-sm"
              color="textSecondary"
              render={<p />}
              aria-live="polite"
            >
              {run.state === "running"
                ? `Running: ${run.done} of ${run.total} checks`
                : run.state === "done" && run.summary
                  ? `${run.summary.passed} passed, ${run.summary.failed} failed, ${run.summary.skipped} skipped, ${run.summary.shown} shown, in ${duration(run.summary.ms)}`
                  : "Not run yet"}
            </Typography>
            {run.state === "running" ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Icon href={svgStop} />}
                onClick={actions.cancel}
              >
                Stop
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<Icon href={svgPlay} />}
                onClick={actions.runAll}
              >
                {run.state === "idle" ? "Run all" : "Run all again"}
              </Button>
            )}
          </div>
          {frameFilter && (
            <p className="fx-filter">
              <Typography variant="body-sm" render={<span />}>
                Groups that use <span className="fx-strong">{frameFilter}</span>
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={<Icon href={svgDismiss} />}
                onClick={clearFrameFilter}
              >
                Show all groups
              </Button>
            </p>
          )}
        </div>
        <div className="fx-cards">
          {groups.length === 0 && (
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              No group answers that lens
              {frameFilter ? ` with ${frameFilter}` : ""}. Choose All to see
              every question.
            </Typography>
          )}
          {groups.map((g) => (
            <QuestionCard
              key={g.id}
              group={g}
              results={resultsOf(g, model.results)}
              open={open.has(g.id)}
              setOpen={(v) => setCard(g.id, v)}
              selected={result?.id}
              onSelect={(id) => onSelect(id === result?.id ? undefined : id)}
              waitingFor={model.waiting[g.id]}
              onRun={() => actions.runGroup(g.id)}
              {...(g.focus && {
                onShow: () => actions.showOnGlobe({ result: g.id }),
              })}
            >
              {g.id === "bound-crss" && (
                <TryYourOwn
                  token={model.token}
                  state={model.userCrs}
                  exampleWkt2={model.exampleWkt2}
                  onFetch={actions.fetchAsset}
                  onRun={actions.runUserCrs}
                />
              )}
            </QuestionCard>
          ))}
        </div>
      </div>
      {result && (
        <Inspector
          result={result}
          group={model.groups.find((g) => g.id === result.group)}
          extras={model.extras[result.id]}
          expanded={inspectorFull}
          onExpand={setInspectorFull}
          onClose={() => onSelect(undefined)}
          onShow={() => actions.showOnGlobe({ result: result.id })}
          onHighlight={() => onHighlightFrames(result)}
          onCopyLink={() => onCopyLink(result.id)}
        />
      )}
    </div>
  );
}
