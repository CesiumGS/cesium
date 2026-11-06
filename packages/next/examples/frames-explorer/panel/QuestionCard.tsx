// A question card (R14 level 2) and its result rows (level 3).
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { svgPlay } from "@stratakit/icons/play";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useEffect, useId, useRef } from "react";
import type { DataItem } from "../protocol.ts";
import type { StressResult } from "../tests.ts";
import { quantity } from "./format.ts";
import type { GroupInfo, ResultExtras } from "./model.ts";
import {
  AccuracyText,
  ITEM_LABEL,
  StatusBadge,
  resultStatus,
} from "./parts.tsx";
import { ToleranceBar, ofTolerance } from "./ToleranceBar.tsx";

/** A result's row name: its short label (I14), else its title. */
export const rowName = (r: StressResult, extras?: ResultExtras) =>
  extras?.label ?? r.title;

/** A judged result that failed (not skipped, not shown-only, not the user's). */
export const isFailure = (r: StressResult) =>
  !r.pass &&
  !r.displayOnly &&
  !r.userInput &&
  (r.missing === undefined || r.missing.length === 0);

/** Why a result failed, in a few words (I1): the fingerprint, the error, or how far over. */
export function whyFailed(r: StressResult, extras?: ResultExtras): string {
  const name = rowName(r, extras);
  if (r.fingerprintCheck && !r.fingerprintCheck.match) {
    return `Browser ≠ Node, ${name}: ${r.fingerprintCheck.difference ?? "the fingerprints differ"}`;
  }
  if (r.expectedError !== undefined) {
    return r.error === undefined
      ? `${name}: expected an error, and nothing was thrown`
      : `${name}: threw a different error, "${r.error}"`;
  }
  if (r.value !== undefined && r.tolerance !== undefined) {
    return `${name}: ${quantity(r.value, r.unit)}, ${ofTolerance(r.value, r.tolerance)}`;
  }
  return r.error !== undefined ? `${name}: ${r.error}` : `${name} failed`;
}

/**
 * The card's answer (its headline): a failure first (I1), else the first
 * effect, else the worst value against its tolerance.
 */
export function cardAnswer(
  results: readonly StressResult[],
  extras: Readonly<Record<string, ResultExtras>>,
): { text: string; failed: boolean } | undefined {
  const failure = results.find(isFailure);
  if (failure) {
    return { text: whyFailed(failure, extras[failure.id]), failed: true };
  }
  const effect = results.find((r) => r.effect !== undefined)?.effect;
  if (effect !== undefined) {
    return {
      text: `${quantity(effect.value, effect.unit, 3)}: ${effect.label}`,
      failed: false,
    };
  }
  let worst: StressResult | undefined;
  let ratio = -1;
  for (const r of results) {
    if (r.value !== undefined && r.tolerance !== undefined && r.tolerance > 0) {
      const q = Math.abs(r.value) / r.tolerance;
      if (q > ratio) {
        ratio = q;
        worst = r;
      }
    }
  }
  if (worst !== undefined) {
    return {
      text:
        ratio === 0
          ? `Every value exact, against a tolerance of ${quantity(worst.tolerance!, worst.unit)}`
          : `Worst ${quantity(worst.value!, worst.unit)} against a tolerance of ${quantity(worst.tolerance!, worst.unit)}`,
      failed: false,
    };
  }
  const throws = results.filter((r) => r.expectedError !== undefined);
  if (throws.length === 1) {
    return { text: "The expected error, with its message", failed: false };
  }
  if (throws.length > 1) {
    return {
      text: `${throws.length} expected errors, each with its message`,
      failed: false,
    };
  }
  return undefined;
}

/**
 * The card's verdict. Passing is plain text with a small icon (I10: badges
 * are kept for what needs attention); fail, waiting and missing are badges.
 */
function CardStatus({
  results,
  waitingFor,
}: {
  results: readonly StressResult[];
  waitingFor: DataItem | undefined;
}) {
  if (waitingFor !== undefined) {
    return (
      <StatusBadge
        status="waiting"
        word={`Waiting for ${ITEM_LABEL[waitingFor]}`}
        quiet
      />
    );
  }
  if (results.length === 0) {
    return <span className="fx-muted fx-card-status-text">Not run</span>;
  }
  if (results.every((r) => r.missing !== undefined && r.missing.length > 0)) {
    return <StatusBadge status="missing" />;
  }
  const judged = results.filter(
    (r) => !r.displayOnly && !r.userInput && !r.missing,
  );
  const failed = judged.filter((r) => !r.pass).length;
  return failed > 0 ? (
    <StatusBadge status="fail" word={`${failed} of ${judged.length} fail`} />
  ) : (
    <span className="fx-verdict-pass">
      <Icon href={svgStatusSuccess} aria-hidden />
      {judged.length} of {judged.length}
      <span className="fx-visually-hidden"> pass</span>
    </span>
  );
}

/**
 * The rows: a table at full width; below 480 px of panel (C4) each row
 * stacks into two lines, the name and verdict over the bar, effect and
 * accuracy (CSS only; explicit roles keep the table's semantics).
 */
function ResultRows({
  results,
  extras,
  selected,
  onSelect,
  waitingFor,
}: {
  results: readonly StressResult[];
  extras: Readonly<Record<string, ResultExtras>>;
  selected: string | undefined;
  onSelect: (id: string) => void;
  waitingFor: DataItem | undefined;
}) {
  const effects = results.some((r) => r.effect !== undefined);
  // The selected row stays in view as the inspector opens under the list.
  const selectedRow = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    const row = selectedRow.current;
    if (row) {
      requestAnimationFrame(() => row.scrollIntoView({ block: "nearest" }));
    }
  }, [selected]);
  return (
    <Table
      size="small"
      className={`fx-results${effects ? " fx-has-effects" : ""}`}
      role="table"
    >
      <colgroup>
        <col />
        <col className="fx-col-value" />
        {effects && <col className="fx-col-effect" />}
        <col className="fx-col-accuracy" />
        <col className="fx-col-status" />
      </colgroup>
      <TableHead role="rowgroup">
        <TableRow role="row">
          <TableCell role="columnheader">Check</TableCell>
          <TableCell role="columnheader">Value / tolerance</TableCell>
          {effects && <TableCell role="columnheader">Effect</TableCell>}
          <TableCell role="columnheader">Accuracy</TableCell>
          <TableCell role="columnheader">Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody role="rowgroup">
        {results.map((r) => {
          const s = resultStatus(r, waitingFor);
          const x = extras[r.id];
          return (
            <TableRow
              key={r.id}
              role="row"
              ref={r.id === selected ? selectedRow : undefined}
              selected={r.id === selected}
              hover
              className={`fx-result${r.userInput ? " fx-user-row" : ""}${isFailure(r) ? " fx-fail-row" : ""}`}
            >
              <TableCell role="cell" className="fx-check">
                <button
                  type="button"
                  className="fx-row-button"
                  aria-pressed={r.id === selected}
                  title={r.title}
                  onClick={() => onSelect(r.id)}
                >
                  {rowName(r, x)}
                </button>
                {r.fingerprintCheck && (
                  <span
                    className={`fx-fp${r.fingerprintCheck.match ? "" : " fx-fp-diff"}`}
                  >
                    {r.fingerprintCheck.match
                      ? "browser = Node"
                      : "browser ≠ Node"}
                  </span>
                )}
              </TableCell>
              <TableCell role="cell" className="fx-value">
                <ToleranceBar result={r} />
              </TableCell>
              {effects && (
                <TableCell
                  role="cell"
                  className="fx-num fx-effect"
                  data-label="Effect"
                >
                  {r.effect ? (
                    quantity(r.effect.value, r.effect.unit, 3)
                  ) : (
                    <span aria-label="no effect size" className="fx-muted">
                      —
                    </span>
                  )}
                </TableCell>
              )}
              <TableCell role="cell" className="fx-acc" data-label="Accuracy">
                <AccuracyText
                  accuracy={r.accuracy}
                  note={x?.accuracyNote}
                  placement={x?.relative !== undefined}
                  compact
                />
              </TableCell>
              <TableCell role="cell" className="fx-status">
                <StatusBadge
                  status={s.status}
                  {...(s.word && { word: s.word })}
                  quiet={s.status === "pass"}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function QuestionCard({
  group,
  results,
  extras,
  open,
  setOpen,
  selected,
  onSelect,
  waitingFor,
  onRun,
  busy,
  onShow,
  children,
}: {
  group: GroupInfo;
  results: readonly StressResult[];
  extras: Readonly<Record<string, ResultExtras>>;
  open: boolean;
  setOpen: (open: boolean) => void;
  selected: string | undefined;
  onSelect: (id: string) => void;
  waitingFor: DataItem | undefined;
  onRun: () => void;
  /** Why "Run this group" waits: a run is going on (one at a time). */
  busy?: string | undefined;
  onShow?: () => void;
  /** Extra content above the rows ("Try your own"). */
  children?: ReactNode;
}) {
  const busyId = useId();
  const missing = results.find((r) => r.missing && r.missing.length > 0)
    ?.missing?.[0];
  const answer =
    missing !== undefined &&
    results.every((r) => r.missing && r.missing.length > 0)
      ? {
          text: `Needs ${ITEM_LABEL[missing]}, which isn't in the frames store.`,
          failed: false,
        }
      : cardAnswer(
          results.filter((r) => !r.userInput),
          extras,
        );
  return (
    <Accordion
      expanded={open}
      onChange={(_, v) => setOpen(v)}
      disableGutters
      className="fx-card"
      id={`fx-card-${group.id}`}
      slotProps={{ heading: { render: <h3 /> } }}
    >
      <AccordionSummary className="fx-card-summary">
        <span className="fx-card-head">
          <span className="fx-card-question">{group.question}</span>
          <span className="fx-card-status">
            <CardStatus results={results} waitingFor={waitingFor} />
          </span>
          <span
            className={`fx-card-answer${answer?.failed ? " fx-card-answer-fail" : ""}`}
          >
            {waitingFor
              ? `Runs once ${ITEM_LABEL[waitingFor]} is in.`
              : (answer?.text ?? group.name)}
          </span>
        </span>
      </AccordionSummary>
      <AccordionDetails className="fx-card-body">
        <div className="fx-card-actions">
          <Typography
            variant="caption-lg"
            color="textSecondary"
            render={<span />}
          >
            {group.name}, {results.length}{" "}
            {results.length === 1 ? "check" : "checks"}
          </Typography>
          <span className="fx-card-buttons">
            {onShow && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Icon href={svgFitToView} />}
                onClick={onShow}
              >
                Show on globe
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={<Icon href={svgPlay} />}
              onClick={onRun}
              disabled={waitingFor !== undefined || busy !== undefined}
              {...(busy !== undefined && { "aria-describedby": busyId })}
            >
              Run this group
            </Button>
          </span>
          {busy !== undefined && (
            <Typography
              variant="caption-lg"
              color="textSecondary"
              render={<span id={busyId} />}
            >
              {busy}
            </Typography>
          )}
        </div>
        {children}
        {/* Rows only while open: a result can sit in two cards (its own and
            Reproducibility), and only the open one may scroll to it. */}
        {!open ? null : results.length > 0 ? (
          <ResultRows
            results={results}
            extras={extras}
            selected={selected}
            onSelect={onSelect}
            waitingFor={waitingFor}
          />
        ) : (
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            {waitingFor
              ? `Waiting for ${ITEM_LABEL[waitingFor]}; its checks run as soon as it's in.`
              : "Not run yet. Run this group, or Run all."}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
