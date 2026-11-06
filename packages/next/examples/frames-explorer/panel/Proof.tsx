// The scenario's proof (spec goal 8), a compact list (scenarios/proof.ts's
// rows). The owner, 2026-11-06: no sheet. Each row is one full-width button
// with a clear chevron, at least 40 px tall, that expands in place into its
// details (`aria-expanded`): the computed value and the tolerance, what it
// is compared against and the reference's source, its accuracy. Each states
// its status in words beside its colour: Checked against a reference (or by
// the catalog, for a round trip that cites nothing), Live re-run,
// Reference applies at the checked setup, or Loading. A result with more to
// it than fits opens in Verification by one labelled link.
import { CircularProgress, Link, Typography } from "@mui/material";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgClock } from "@stratakit/icons/clock";
import { svgInfo } from "@stratakit/icons/info";
import { svgStatusError } from "@stratakit/icons/status-error";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { Icon } from "@stratakit/mui";
import { useId, useState } from "react";
import type { ProofRow } from "../scenarios/proof.ts";
import type { StressResult } from "../tests.ts";
import { quantity } from "./format.ts";
import { webLink } from "./Inspector.tsx";
import type { ResultExtras } from "./model.ts";
import { AccuracyText } from "./parts.tsx";
import { proofRowText, type ProofRowText } from "./proofText.ts";

function StatusIcon({ tone }: { tone: ProofRowText["tone"] }) {
  switch (tone) {
    case "pass":
      return <Icon href={svgStatusSuccess} className="fx-proof-icon" />;
    case "fail":
      return <Icon href={svgStatusError} className="fx-proof-icon" />;
    case "reference":
      return <Icon href={svgInfo} className="fx-proof-icon" />;
    case "loading":
      return <CircularProgress size={14} className="fx-proof-icon" />;
    case "stale":
      return <Icon href={svgClock} className="fx-proof-icon" />;
  }
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fx-proof-detail">
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
      <Typography variant="body-sm" render={<p />} className="fx-proof-title">
        {result.title}
      </Typography>
      <dl className="fx-proof-details">
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
          className="fx-proof-open"
          onClick={onOpen}
        >
          Open in Verification
        </Link>
      )}
    </>
  );
}

export function Proof({
  rows,
  extras,
  atChecked,
  freshness,
  published,
  onOpenResult,
  onBack,
}: {
  rows: readonly ProofRow[];
  freshness: "current" | "updating" | "following";
  /** The headline's published counterpart: its row says ours against it. */
  published?: { proofId: string; printed: string; unit: string } | undefined;
  extras: Readonly<Record<string, ResultExtras>>;
  atChecked: boolean;
  onOpenResult: (id: string) => void;
  onBack: () => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
    <ul className="fx-proof">
      {rows.map((row) => {
        const t = proofRowText(row, extras, freshness, published);
        const expanded = open.has(t.key);
        const region = `${uid}-${t.key}`;
        return (
          <li key={t.key} className={`fx-proof-row fx-tone-${t.tone}`}>
            <button
              type="button"
              className="fx-proof-head"
              aria-expanded={expanded}
              aria-controls={region}
              onClick={() => toggle(t.key)}
            >
              <Icon
                href={svgChevronRight}
                className={`fx-proof-chevron${expanded ? " fx-open" : ""}`}
              />
              <StatusIcon tone={t.tone} />
              <span className="fx-proof-text">
                <span className="fx-proof-name">{t.title}</span>
                <span className="fx-proof-status">
                  <span className="fx-proof-status-word">
                    {t.verdict ? `${t.verdict} · ` : ""}
                    {t.status}
                  </span>
                  <span className="fx-proof-summary fx-num">{t.summary}</span>
                </span>
              </span>
            </button>
            <div id={region} className="fx-proof-body" hidden={!expanded}>
              {expanded &&
                (t.result ? (
                  <ResultDetails
                    result={t.result}
                    extras={extras[t.result.id]}
                    live={row.kind === "live"}
                    onOpen={
                      row.kind === "checked" && freshness === "current"
                        ? () => onOpenResult(t.result!.id)
                        : undefined
                    }
                  />
                ) : t.tone === "stale" ? (
                  <Typography variant="body-sm" render={<p />}>
                    Re-running at your setting: its verdict shows here when
                    it&rsquo;s in, and nothing is claimed until then.
                  </Typography>
                ) : row.kind === "reference-only" ? (
                  <>
                    <Typography variant="body-sm" render={<p />}>
                      Its published reference applies at the checked setup, not
                      at yours, so it isn&rsquo;t judged here.{" "}
                      {t.summary.charAt(0).toUpperCase()}
                      {t.summary.slice(1)}.
                    </Typography>
                    <Link
                      component="button"
                      type="button"
                      className="fx-proof-open"
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
      })}
    </ul>
  );
}
