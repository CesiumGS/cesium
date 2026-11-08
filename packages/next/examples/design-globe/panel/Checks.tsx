// The checks (DESIGN.md "Layout" 5; plan 4b Task 20): every value the page
// shows against the generator's exact answer, and NGS's mark against its
// datasheet. Quieter than the story: one summary line with its status, the
// rows behind "Show the checks". Each group is what the page shows (the
// marker, a measured pair with its ends, the mark); each row its kind's tag
// (as the frames explorer's: Exact answer, NGS datasheet, never a status
// colour), its label over the numbers worded once, and its status as an icon
// and a word. A value the page doesn't show says "Not shown", never Checked;
// an answer pair the page doesn't show can be measured from here.
import { Button, CircularProgress, Typography } from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgInfo } from "@stratakit/icons/info";
import { svgMeasureDistance } from "@stratakit/icons/measure-distance";
import { svgStatusError } from "@stratakit/icons/status-error";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { Icon } from "@stratakit/mui";
import { useId, useState } from "react";
import type {
  CheckGroupView,
  CheckRowView,
  ChecksView,
} from "../checksView.ts";
import type { PanelActions } from "./model.ts";

const KIND_MEANING: Record<CheckRowView["kind"], string> = {
  exact: "the generator's exact answer, by hand formula (answers.json)",
  published: "the value NGS publishes on the mark's datasheet",
};

function KindTag({ kind, text }: { kind: CheckRowView["kind"]; text: string }) {
  return (
    <span className={`dg-kind dg-kind-${kind}`} title={KIND_MEANING[kind]}>
      {text}
    </span>
  );
}

function StatusWord({ row }: { row: CheckRowView }) {
  return (
    <span className={`dg-check-status ${row.status}`}>
      {row.status === "pass" ? (
        <Icon href={svgStatusSuccess} aria-hidden />
      ) : row.status === "fail" ? (
        <Icon href={svgStatusError} aria-hidden />
      ) : (
        <i className="dg-check-dash" aria-hidden />
      )}
      {row.statusText}
    </span>
  );
}

function Row({ row }: { row: CheckRowView }) {
  return (
    <li className={`dg-check-row ${row.status}`}>
      <KindTag kind={row.kind} text={row.kindText} />
      <div className="dg-check-text">
        <span className="dg-check-label">{row.label}</span>
        <span className="dg-check-values dg-num">{row.values}</span>
        {row.difference !== undefined && (
          <span className="dg-check-values dg-num">{row.difference}</span>
        )}
      </div>
      <StatusWord row={row} />
    </li>
  );
}

function groupCount(g: CheckGroupView): string {
  if (g.failed > 0) {
    return `${g.failed} failed`;
  }
  const parts = [
    ...(g.checked > 0 ? [`${g.checked} checked`] : []),
    ...(g.notShown > 0 ? [`${g.notShown} not shown`] : []),
  ];
  return parts.join(", ");
}

function Group({
  group,
  actions,
}: {
  group: CheckGroupView;
  actions: PanelActions;
}) {
  const id = useId();
  // An answer pair the page doesn't show: one line, and the way to show it.
  if (group.measurable !== undefined) {
    return (
      <li className="dg-check-group unshown" aria-labelledby={id}>
        <div className="dg-check-unshown">
          <span id={id} className="dg-check-label">
            {group.title}
          </span>
          <span className="dg-muted dg-check-count">
            {group.notShown} values not shown
          </span>
        </div>
        <Button
          size="small"
          variant="text"
          onClick={() => actions.measurePair(group.measurable!)}
          startIcon={<Icon href={svgMeasureDistance} aria-hidden />}
          aria-label={`Measure ${group.title}`}
        >
          Measure it
        </Button>
      </li>
    );
  }
  return (
    <li className="dg-check-group" aria-labelledby={id}>
      <div className="dg-check-group-head">
        <span id={id} className="dg-strong">
          {group.title}
        </span>
        <span
          className={`dg-check-count${group.failed > 0 ? " fail" : " dg-muted"}`}
        >
          {groupCount(group)}
        </span>
      </div>
      <ul className="dg-check-rows">
        {group.rows.map((r) => (
          <Row key={r.id} row={r} />
        ))}
      </ul>
    </li>
  );
}

export function Checks({
  checks,
  actions,
}: {
  checks: ChecksView;
  actions: PanelActions;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const measured = checks.groups.filter((g) => g.measurable === undefined);
  const unshown = checks.groups.filter((g) => g.measurable !== undefined);
  return (
    <section className="dg-section dg-checks" aria-labelledby={`${id}-h`}>
      <Typography variant="subtitle-md" render={<h2 id={`${id}-h`} />}>
        Checks
      </Typography>
      <p className={`dg-check-summary ${checks.tone}`} role="status">
        {checks.tone === "waiting" ? (
          <CircularProgress size={12} aria-hidden />
        ) : checks.tone === "fail" ? (
          <Icon href={svgStatusError} aria-hidden />
        ) : (
          <Icon href={svgStatusSuccess} aria-hidden />
        )}
        <span>{checks.summary}</span>
      </p>
      {checks.state === "ready" && (
        <>
          <button
            type="button"
            className="dg-m-disclose"
            aria-expanded={open}
            aria-controls={`${id}-rows`}
            onClick={() => setOpen(!open)}
          >
            <Icon href={svgChevronDown} aria-hidden className="dg-m-caret" />
            {open ? "Hide the checks" : "Show the checks"}
          </button>
          {open && (
            <div id={`${id}-rows`} className="dg-check-body">
              <ul className="dg-check-legend" aria-label="Kinds of check">
                <li>
                  <KindTag kind="exact" text="Exact answer" />
                  <span className="dg-muted">{KIND_MEANING.exact}</span>
                </li>
                <li>
                  <KindTag kind="published" text="NGS datasheet" />
                  <span className="dg-muted">{KIND_MEANING.published}</span>
                </li>
              </ul>
              {checks.user !== undefined && (
                <p className="dg-check-user">
                  <Icon href={svgInfo} aria-hidden />
                  <span>{checks.user}</span>
                </p>
              )}
              <ul className="dg-check-groups">
                {measured.map((g) => (
                  <Group key={g.id} group={g} actions={actions} />
                ))}
              </ul>
              {unshown.length > 0 && (
                <>
                  <Typography
                    variant="caption-lg"
                    render={<h3 />}
                    className="dg-check-subhead dg-muted"
                  >
                    Answers the page doesn't show now
                  </Typography>
                  <ul className="dg-check-groups">
                    {unshown.map((g) => (
                      <Group key={g.id} group={g} actions={actions} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
