// The scenario's checks (spec goal 8; "Proof" until Task 6c, which
// overclaimed), a compact list (scenarios/checks.ts's rows) under a legend
// of the five kinds. The owner, 2026-11-06: no sheet. Each row is one
// full-width button, at least 40 px tall, in three columns: its kind's
// colour-coded tag (what it compares with), its title over one line of
// detail, and its status as an icon and a word (Checked, Failed, Not judged
// here, Loading, Updating, Following), then a chevron. Kind and status stay
// apart: the kind colours are none of the status colours, and neither is
// colour alone. It expands in place into its details (`aria-expanded`): the
// computed value and the tolerance, what it is compared against and the
// reference's source, its accuracy. A result with more to it than fits
// opens in Verification by one labelled link.
import { CircularProgress, Link, Typography } from "@mui/material";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgClock } from "@stratakit/icons/clock";
import { svgHelp } from "@stratakit/icons/help";
import { svgInfo } from "@stratakit/icons/info";
import { svgStatusError } from "@stratakit/icons/status-error";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { Icon } from "@stratakit/mui";
import { memo, useCallback, useId, useState } from "react";
import {
  CHECK_KINDS,
  type CheckKind,
  type CheckRow,
  type PageCheck,
} from "../scenarios/checks.ts";
import type { StressResult } from "../tests.ts";
import { formatDelta } from "./answerText.ts";
import { length, quantity } from "./format.ts";
import { webLink } from "./Inspector.tsx";
import type { ResultExtras } from "./model.ts";
import { AccuracyText } from "./parts.tsx";
import { KIND_TEXT, checkRowText, type CheckRowText } from "./checkText.ts";

/** A kind's tag: its short name (the legend's full one) on its colour. */
export function KindTag({
  kind,
  full = false,
}: {
  kind: CheckKind;
  full?: boolean;
}) {
  const k = KIND_TEXT[kind];
  return (
    <span
      className={`fx-kind fx-kind-${kind}`}
      title={`${k.name}: ${k.meaning}`}
    >
      {full ? k.name : k.tag}
    </span>
  );
}

/** The five kinds, once, at the top of the section. */
function KindLegend() {
  return (
    <ul className="fx-check-legend" aria-label="Kinds of check">
      {CHECK_KINDS.map((kind) => (
        <li key={kind}>
          <KindTag kind={kind} full />
        </li>
      ))}
    </ul>
  );
}

function StatusIcon({ tone }: { tone: CheckRowText["tone"] }) {
  switch (tone) {
    case "pass":
      return <Icon href={svgStatusSuccess} className="fx-check-icon" />;
    case "fail":
      return <Icon href={svgStatusError} className="fx-check-icon" />;
    case "reference":
      return <Icon href={svgInfo} className="fx-check-icon" />;
    case "loading":
      return <CircularProgress size={14} className="fx-check-icon" />;
    case "stale":
      return <Icon href={svgClock} className="fx-check-icon" />;
    case "unsure":
      return <Icon href={svgHelp} className="fx-check-icon" />;
  }
}

/** A page check's details: the whole comparison, its terrain's error and the mask's citation. */
function PageDetails({ check }: { check: PageCheck }) {
  return (
    <dl className="fx-check-details">
      <Detail label="Compared">{check.text}</Detail>
      <Detail label="Accuracy">
        {check.meters !== undefined
          ? `our terrain ±${length(check.meters)} at the levels crossed; terrain not drawn is never taken as clear`
          : "terrain not drawn is never taken as clear"}
      </Detail>
      <Detail label="Reference">
        {check.source.document}
        {check.source.publisher && `, ${check.source.publisher}`}
        {check.source.locator && `; ${check.source.locator}`}
      </Detail>
    </dl>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fx-check-detail">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ResultDetails({
  result,
  extras,
  live,
  onOpen,
}: {
  result: StressResult;
  extras: ResultExtras | undefined;
  live: boolean;
  onOpen?: (() => void) | undefined;
}) {
  const link = webLink(extras?.source?.url);
  return (
    <>
      <Typography variant="body-sm" render={<p />} className="fx-check-title">
        {result.title}
      </Typography>
      <dl className="fx-check-details">
        {result.value !== undefined && (
          <Detail
            label={result.tolerance !== undefined ? "Difference" : "Value"}
          >
            <span className="fx-num">
              {quantity(result.value, result.unit, 3)}
            </span>
            {result.tolerance !== undefined && (
              <>
                {" "}
                against a tolerance of{" "}
                <span className="fx-num">
                  {quantity(result.tolerance, result.unit, 2)}
                </span>
              </>
            )}
          </Detail>
        )}
        {result.effect && (
          <Detail label="Computed">
            <span className="fx-num">
              {result.effect.value.toPrecision(6)} {result.effect.unit}
            </span>
            : {result.effect.label}
          </Detail>
        )}
        {result.detail && <Detail label="Detail">{result.detail}</Detail>}
        {extras?.compared && (
          <Detail label="Compared against">{extras.compared.text}</Detail>
        )}
        {!live && extras?.source && (
          <Detail label="Reference">
            {extras.source.document}
            {extras.source.publisher && `, ${extras.source.publisher}`}
            {extras.source.locator && `; ${extras.source.locator}`}
            {link && (
              <>
                {" ("}
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {link.hostname}
                </Link>
                {")"}
              </>
            )}
          </Detail>
        )}
        {live && (
          <Detail label="Reference">
            None at your setting: a live re-run checks the frames&rsquo; own
            consistency (round trips, routes through the tree).
          </Detail>
        )}
        <Detail label="Accuracy">
          {result.accuracy ? (
            <AccuracyText accuracy={result.accuracy} compact />
          ) : (
            (result.accuracyNote ?? "not stated")
          )}
        </Detail>
      </dl>
      {onOpen && (
        <Link
          component="button"
          type="button"
          className="fx-check-open"
          onClick={onOpen}
        >
          Open in Verification
        </Link>
      )}
    </>
  );
}

/** A row's head: what a collapsed row shows. */
const sameHead = (a: CheckRowText, b: CheckRowText): boolean =>
  a.key === b.key &&
  a.kind === b.kind &&
  a.tone === b.tone &&
  a.title === b.title &&
  a.status === b.status &&
  a.summary === b.summary;

interface CheckItemProps {
  row: CheckRow;
  t: CheckRowText;
  expanded: boolean;
  region: string;
  onToggle: (key: string) => void;
  extras: ResultExtras | undefined;
  freshness: "current" | "updating" | "following";
  atChecked: boolean;
  onOpenResult: (id: string) => void;
  onBack: () => void;
}

/**
 * One row. A re-evaluation while the clock plays makes new rows every time;
 * a row renders again only when its text changed, or, expanded, when what
 * its details show did (Task 4d).
 */
export const CheckItem = memo(
  function CheckItem({
    row,
    t,
    expanded,
    region,
    onToggle,
    extras,
    freshness,
    atChecked,
    onOpenResult,
    onBack,
  }: CheckItemProps) {
    return (
      <li className={`fx-check-row fx-tone-${t.tone}`}>
        <button
          type="button"
          className="fx-check-head"
          aria-expanded={expanded}
          aria-controls={region}
          onClick={() => onToggle(t.key)}
        >
          <KindTag kind={t.kind} />
          <span className="fx-check-text">
            <span className="fx-check-name">{t.title}</span>
            <span className="fx-check-summary fx-num">{t.summary}</span>
          </span>
          <span className="fx-check-status">
            <StatusIcon tone={t.tone} />
            <span className="fx-check-status-word">{t.status}</span>
          </span>
          <Icon
            href={svgChevronRight}
            className={`fx-check-chevron${expanded ? " fx-open" : ""}`}
          />
        </button>
        <div id={region} className="fx-check-body" hidden={!expanded}>
          {expanded && row.status === "checked" && row.note !== undefined && (
            <Typography
              variant="body-sm"
              render={<p />}
              className="fx-check-note"
            >
              {row.note}
            </Typography>
          )}
          {expanded &&
            (row.status === "page" ? (
              <PageDetails check={row.check} />
            ) : t.result ? (
              <ResultDetails
                result={t.result}
                extras={extras}
                live={row.status === "live"}
                onOpen={
                  row.status === "checked" && freshness === "current"
                    ? () => onOpenResult(t.result!.id)
                    : undefined
                }
              />
            ) : t.tone === "stale" ? (
              <Typography variant="body-sm" render={<p />}>
                Re-running at your setting: its verdict shows here when
                it&rsquo;s in, and nothing is claimed until then.
              </Typography>
            ) : row.status === "reference-only" ? (
              <>
                <Typography variant="body-sm" render={<p />}>
                  Its reference applies at the checked setup, not at yours, so
                  it isn&rsquo;t judged here.
                  {row.delta &&
                    ` Your setting moves the answer by ${formatDelta(row.delta.value, row.delta.unit)}.`}
                </Typography>
                <Link
                  component="button"
                  type="button"
                  className="fx-check-open"
                  onClick={onBack}
                >
                  Back to the checked setup
                </Link>
              </>
            ) : (
              <Typography variant="body-sm" render={<p />}>
                {atChecked
                  ? "The catalog's check runs in the worker; its verdict shows here when it's in."
                  : "Re-running at your setting; nothing is claimed until it's in."}
              </Typography>
            ))}
        </div>
      </li>
    );
  },
  (a, b) =>
    a.expanded === b.expanded &&
    a.region === b.region &&
    a.onToggle === b.onToggle &&
    sameHead(a.t, b.t) &&
    (!b.expanded ||
      (a.row === b.row &&
        a.extras === b.extras &&
        a.freshness === b.freshness &&
        a.atChecked === b.atChecked &&
        a.onOpenResult === b.onOpenResult &&
        a.onBack === b.onBack)),
);

export const Checks = memo(function Checks({
  rows,
  extras,
  atChecked,
  freshness,
  published,
  onOpenResult,
  onBack,
}: {
  rows: readonly CheckRow[];
  freshness: "current" | "updating" | "following";
  /** The headline's published counterpart: its row says ours against it. */
  published?: { checkId: string; printed: string; unit: string } | undefined;
  extras: Readonly<Record<string, ResultExtras>>;
  atChecked: boolean;
  onOpenResult: (id: string) => void;
  onBack: () => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback(
    (key: string) =>
      setOpen((o) => {
        const next = new Set(o);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      }),
    [],
  );
  if (rows.length === 0) {
    return (
      <Typography variant="body-sm" color="textSecondary" render={<p />}>
        {atChecked
          ? "The catalog's checks for this scenario come with it later."
          : "No checks re-run at this setting."}
      </Typography>
    );
  }
  return (
    <>
      <KindLegend />
      <ul className="fx-checks">
        {rows.map((row) => {
          const t = checkRowText(row, extras, freshness, published);
          return (
            <CheckItem
              key={t.key}
              row={row}
              t={t}
              expanded={open.has(t.key)}
              region={`${uid}-${t.key}`}
              onToggle={toggle}
              extras={t.result ? extras[t.result.id] : undefined}
              freshness={freshness}
              atChecked={atChecked}
              onOpenResult={onOpenResult}
              onBack={onBack}
            />
          );
        })}
      </ul>
    </>
  );
});
