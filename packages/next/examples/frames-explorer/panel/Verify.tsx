// The Verify tab (R14): lens chips, the run, question cards with their rows,
// and the inspector for the selected result.
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgPlay } from "@stratakit/icons/play";
import { Icon } from "@stratakit/mui";
import { useEffect, useState } from "react";
import type { StressResult } from "../tests.ts";
import { Inspector } from "./Inspector.tsx";
import { ITEM_LABEL } from "./parts.tsx";
import { runLine } from "./runText.ts";
import type {
  GroupInfo,
  LensChoice,
  PanelActions,
  PanelModel,
} from "./model.ts";
import { QuestionCard, isFailure } from "./QuestionCard.tsx";
import { Split } from "./Sheet.tsx";
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

/** The groups the lens and the tree's frame show, failing ones first (I1). */
export function visibleGroups(
  model: PanelModel,
  lens: LensChoice,
  frameFilter: string | undefined,
): GroupInfo[] {
  const shown = model.groups.filter(
    (g) =>
      (lens === "all" || g.lenses.includes(lens)) &&
      (frameFilter === undefined ||
        (g.focus?.frames.includes(frameFilter) ?? false)),
  );
  const fails = (g: GroupInfo) =>
    resultsOf(g, model.results).some(isFailure) ? 0 : 1;
  return shown
    .map((g, i) => ({ g, i }))
    .sort((a, b) => fails(a.g) - fails(b.g) || a.i - b.i)
    .map(({ g }) => g);
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
  onShowFrames,
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
  onShowFrames: (result: StressResult) => void;
  onCopyLink: (id: string) => void;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    const r = model.results.find((x) => x.id === selected);
    return new Set(r ? [r.group] : []);
  });
  const groups = visibleGroups(model, lens, frameFilter);
  // R14: the inspector never shows a result the lens hides.
  const shownIds = new Set(
    groups.flatMap((g) => resultsOf(g, model.results).map((r) => r.id)),
  );
  const result =
    selected !== undefined && shownIds.has(selected)
      ? model.results.find((r) => r.id === selected)
      : undefined;
  // A selection from elsewhere (the strip's "1 failed", a deep link) opens its card.
  useEffect(() => {
    if (result) {
      setOpen((was) =>
        was.has(result.group) ? was : new Set([...was, result.group]),
      );
    }
  }, [result]);
  const { run } = model;
  const missingData = model.items.some((s) => s.state === "missing");
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
  const showTryYourOwn = () => {
    setLens("all");
    clearFrameFilter();
    setCard("bound-crss", true);
    requestAnimationFrame(() =>
      document
        .getElementById("fx-try-your-own")
        ?.scrollIntoView({ block: "start" }),
    );
  };
  // The inspector's neighbours: the selected result's card, in order.
  const siblings = result
    ? resultsOf(
        model.groups.find((g) => g.id === result.group) ?? {
          id: result.group,
          name: result.group,
          question: "",
          lenses: [],
          accuracyNote: "",
          needs: [],
          compared: { kind: "independent", text: "" },
        },
        model.results,
      )
    : [];
  const list = (
    <div className="fx-verify-list-body">
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
          {/* No live region here: the strip announces the run (I19). */}
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            {runLine(run, model.results, ITEM_LABEL)}
          </Typography>
          {run.state === "running" ? (
            <Button size="small" variant="outlined" onClick={actions.cancel}>
              Stop
            </Button>
          ) : (
            <Button
              size="small"
              variant={missingData ? "outlined" : "contained"}
              color={missingData ? "secondary" : "primary"}
              startIcon={<Icon href={svgPlay} />}
              onClick={actions.runAll}
            >
              {run.state === "idle" ? "Run all" : "Run all again"}
            </Button>
          )}
        </div>
        <div className="fx-verify-links">
          <Button
            size="small"
            variant="text"
            className="fx-link-button fx-link-accent"
            onClick={showTryYourOwn}
            endIcon={<Icon href={svgChevronRight} />}
          >
            Try your own CRS
          </Button>
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
          <div className="fx-empty-filter">
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              {frameFilter && lens !== "all"
                ? `No ${LENS_LABEL[lens]} group uses ${frameFilter}.`
                : frameFilter
                  ? `No group uses ${frameFilter}.`
                  : `No group answers the ${LENS_LABEL[lens]} lens.`}
            </Typography>
            {lens !== "all" && (
              <Button
                size="small"
                variant="text"
                onClick={() => setLens("all")}
              >
                Choose All
              </Button>
            )}
            {frameFilter && (
              <Button size="small" variant="text" onClick={clearFrameFilter}>
                Show all groups
              </Button>
            )}
          </div>
        )}
        {groups.map((g) => (
          <QuestionCard
            key={g.id}
            group={g}
            results={resultsOf(g, model.results)}
            extras={model.extras}
            open={open.has(g.id)}
            setOpen={(v) => setCard(g.id, v)}
            selected={result?.id}
            onSelect={(id) => onSelect(id === result?.id ? undefined : id)}
            waitingFor={model.waiting[g.id]}
            onRun={() => actions.runGroup(g.id)}
            onOptIn={(r) => {
              // Asking for the item opts in; the run then fetches and checks it.
              if (r.optIn) {
                actions.retryItem(r.optIn.need);
                actions.runGroup(r.id);
              }
            }}
            busy={model.runBusy}
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
  );
  return (
    <Split
      className="fx-verify"
      list={list}
      sheetKey={result?.id}
      sheet={
        result
          ? (controls) => (
              <Inspector
                result={result}
                group={model.groups.find((g) => g.id === result.group)}
                extras={model.extras[result.id]}
                siblings={siblings}
                controls={controls}
                onStep={(id) => onSelect(id)}
                onClose={() => onSelect(undefined)}
                onShow={() => actions.showOnGlobe({ result: result.id })}
                onShowFrames={() => onShowFrames(result)}
                onCopyLink={() => onCopyLink(result.id)}
              />
            )
          : undefined
      }
    />
  );
}
