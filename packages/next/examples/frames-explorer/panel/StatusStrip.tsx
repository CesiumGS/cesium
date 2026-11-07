// The status strip (R9, R14): always at the panel's top, every data item as
// a pill, the run's counts, a progress bar for each fetch, and the one thing
// to do when data is missing.
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
  Typography,
} from "@mui/material";
import { svgInfo } from "@stratakit/icons/info";
import { svgStatusError } from "@stratakit/icons/status-error";
import { svgStatusPending } from "@stratakit/icons/status-pending";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { Icon } from "@stratakit/mui";
import { unstable_Popover as Popover } from "@stratakit/structures";
import type { DataItem } from "../protocol.ts";
import { duration, megabytes } from "./format.ts";
import { memo } from "react";
import { equalOn } from "./memo.ts";
import type { ItemStatus, PanelActions, PanelModel } from "./model.ts";
import { ITEM_DETAIL, ITEM_LABEL, StatusBadge } from "./parts.tsx";
import { reportCounts } from "../report.ts";

function fetched(s: ItemStatus): string {
  const so = megabytes(s.received ?? 0);
  return s.total === undefined ? `${so}` : `${so} of ${megabytes(s.total)}`;
}

/** One item's pill: the state as a word, with its size while fetching. */
function ItemPill({ s }: { s: ItemStatus }) {
  const name = ITEM_LABEL[s.item];
  switch (s.state) {
    case "idle":
      return (
        <span className="fx-pill fx-pill-idle">
          {name} <span className="fx-muted">not loaded</span>
        </span>
      );
    case "fetching":
      return <StatusBadge status="waiting" word={`${name} ${fetched(s)}`} />;
    case "ready":
      return <StatusBadge status="pass" word={`${name} ready`} quiet />;
    case "missing":
      return <StatusBadge status="missing" word={`${name} missing`} />;
    case "error":
      return <StatusBadge status="fail" word={`${name} failed`} />;
  }
}

/** Each item's state, size, time and what it is (the pills' detail, by keyboard too). */
function ItemDetails({ items }: { items: readonly ItemStatus[] }) {
  return (
    <table className="fx-item-details">
      <caption>Data the page loads</caption>
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">State</th>
          <th scope="col">Size</th>
          <th scope="col">Time</th>
        </tr>
      </thead>
      <tbody>
        {items.map((s) => (
          <tr key={s.item}>
            <th scope="row">
              {ITEM_LABEL[s.item]}
              <span className="fx-muted">{ITEM_DETAIL[s.item]}</span>
            </th>
            <td>
              {s.state === "idle"
                ? "not loaded (loads when first needed)"
                : s.state === "fetching"
                  ? "fetching"
                  : s.state}
            </td>
            <td className="fx-num">
              {s.state === "fetching"
                ? fetched(s)
                : s.bytes !== undefined
                  ? megabytes(s.bytes)
                  : "—"}
            </td>
            <td className="fx-num">
              {s.ms !== undefined ? duration(s.ms) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * What the strip announces (I19): changes of state, not every result.
 * Start, each quarter of the run, and the end.
 */
function announcement(model: PanelModel, passed: number, failed: number) {
  const { run } = model;
  if (run.state === "running") {
    const quarter = run.total > 0 ? Math.floor((4 * run.done) / run.total) : 0;
    return quarter === 0 ? "Run started" : `Run ${25 * quarter}% done`;
  }
  if (run.state === "done") {
    return `Run done: ${passed} passed, ${failed} failed`;
  }
  if (run.state === "cancelled") {
    return run.reason !== undefined
      ? `Run stopped: ${run.reason}`
      : "Run stopped";
  }
  return "";
}

/** The model fields the status strip reads (Task 4d). */
export const STATUS_READS = ["items", "run", "results", "waiting"] as const;

export const StatusStrip = memo(
  StatusStripView,
  equalOn("model", STATUS_READS),
);

function StatusStripView({
  model,
  actions,
  onShowFailure,
}: {
  model: PanelModel;
  actions: PanelActions;
  /** Opens Verify on the first failure (I1). */
  onShowFailure: (id: string) => void;
}) {
  const { items, run } = model;
  const fetching = items.filter((s) => s.state === "fetching");
  const missing = items.filter((s) => s.state === "missing");
  const failed = items.filter((s) => s.state === "error");
  const allReady = items.every((s) => s.state === "ready");
  const judged = model.results.filter((r) => !r.displayOnly && !r.userInput);
  const failures = judged.filter(
    (r) => !r.pass && (r.missing === undefined || r.missing.length === 0),
  );
  const counts = reportCounts(model.results);
  const passed = counts.passed;
  const waitingGroups = new Set(Object.keys(model.waiting));
  const details = (
    <Popover content={<ItemDetails items={items} />}>
      <IconButton size="small" aria-label="Data details">
        <Icon href={svgInfo} />
      </IconButton>
    </Popover>
  );
  return (
    <section className="fx-strip" aria-label="Data and results">
      <div className="fx-strip-row">
        {allReady ? (
          // Calm when nothing needs attention (I10): one quiet line.
          <p className="fx-all-ready">
            <Icon href={svgStatusSuccess} aria-hidden />
            All data ready
          </p>
        ) : (
          <ul className="fx-strip-items" aria-label="Data">
            {items.map((s) => (
              <li key={s.item}>
                <ItemPill s={s} />
              </li>
            ))}
          </ul>
        )}
        {details}
      </div>
      <p className="fx-strip-counts">
        {run.state === "idle" && judged.length === 0 ? (
          <span className="fx-muted">No checks run yet</span>
        ) : (
          <>
            <span className="fx-count fx-count-pass">
              <Icon href={svgStatusSuccess} aria-hidden />
              {passed} passed
            </span>
            {failures.length > 0 ? (
              <Button
                size="small"
                variant="text"
                color="error"
                className="fx-count-fail fx-link-button"
                startIcon={<Icon href={svgStatusError} />}
                onClick={() => onShowFailure(failures[0]!.id)}
              >
                {failures.length} failed
              </Button>
            ) : (
              <span className="fx-count">
                <Icon href={svgStatusError} aria-hidden />0 failed
              </span>
            )}
            {counts.skipped > 0 && (
              <span className="fx-count">
                <Icon href={svgStatusPending} aria-hidden />
                {counts.skipped} skipped (missing data)
              </span>
            )}
            {waitingGroups.size > 0 && (
              <span className="fx-count fx-count-wait">
                <CircularProgress size={10} aria-hidden />
                {waitingGroups.size} groups waiting
              </span>
            )}
            {run.state === "running" && (
              <span className="fx-muted fx-num">
                running, {run.done} of {run.total}
              </span>
            )}
            {run.state === "done" && run.summary && (
              <span className="fx-muted">in {duration(run.summary.ms)}</span>
            )}
            {run.state === "cancelled" && run.reason !== undefined && (
              <span className="fx-muted">stopped: {run.reason}</span>
            )}
          </>
        )}
      </p>
      <p className="fx-visually-hidden" aria-live="polite">
        {announcement(model, passed, failures.length)}
      </p>
      {fetching.map((s) => (
        <div key={s.item} className="fx-fetch">
          <Typography variant="caption-lg" render={<span />}>
            Fetching {ITEM_DETAIL[s.item]}: {fetched(s)}
          </Typography>
          <LinearProgress
            className="fx-progress-info"
            aria-label={`Fetching ${ITEM_LABEL[s.item]}`}
            {...(s.total !== undefined
              ? {
                  variant: "determinate",
                  value: (100 * (s.received ?? 0)) / s.total,
                }
              : { variant: "indeterminate" })}
          />
        </div>
      ))}
      {missing.length > 0 && (
        <MissingAlert missing={missing.map((s) => s.item)} />
      )}
      {failed.map((s) => (
        <Alert
          key={s.item}
          severity="error"
          className="fx-strip-alert"
          action={
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              className="fx-nowrap"
              onClick={() => actions.retryItem(s.item)}
            >
              Retry {ITEM_LABEL[s.item]}
            </Button>
          }
        >
          {ITEM_LABEL[s.item]} failed to load. {s.detail}
        </Alert>
      ))}
    </section>
  );
}

const list = (words: string[]) =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

/** R5: what's missing, the one thing to do, and that the rest still works. */
function MissingAlert({ missing }: { missing: DataItem[] }) {
  const names = list(missing.map((m) => ITEM_LABEL[m]));
  return (
    <Alert severity="info" className="fx-strip-alert">
      {names} {missing.length === 1 ? "isn't" : "aren't"} in the frames store.
      Run <code className="fx-code">npm run setup</code> in packages/next, then
      reload. Everything that doesn't need{" "}
      {missing.length === 1 ? "it" : "them"} still works.
    </Alert>
  );
}
