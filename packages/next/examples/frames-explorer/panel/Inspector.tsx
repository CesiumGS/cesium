// The inspector (R14 level 4, R16's computation trace): one result, glance to
// proof. Measured against expected, what it's compared against, the trace
// from input to output, the accuracy, the source, the fingerprint, and
// actions; Previous and Next step through its card (I4).
import { Button, IconButton, Link, Typography } from "@mui/material";
import { svgChevronLeft } from "@stratakit/icons/chevron-left";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { svgHierarchyTree } from "@stratakit/icons/hierarchy-tree";
import { svgLink } from "@stratakit/icons/link";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useId, useRef } from "react";
import type { StressResult } from "../tests.ts";
import { BudgetBar } from "./BudgetBar.tsx";
import { quantity } from "./format.ts";
import type { Comparison, GroupInfo, ResultExtras } from "./model.ts";
import {
  AccuracyText,
  CopyButton,
  StatusBadge,
  Term,
  resultStatus,
} from "./parts.tsx";
import { rowName } from "./QuestionCard.tsx";
import { type SheetControls, SheetHead } from "./Sheet.tsx";
import { ToleranceBar, ofTolerance } from "./ToleranceBar.tsx";

/** An http(s) URL, or undefined: a citation's link is never another scheme. */
function webLink(url: string | undefined): URL | undefined {
  try {
    const u = url === undefined ? undefined : new URL(url);
    return u && (u.protocol === "https:" || u.protocol === "http:")
      ? u
      : undefined;
  } catch {
    return undefined;
  }
}

function Part({ title, children }: { title: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className="fx-part" aria-labelledby={id}>
      <Typography
        variant="subtitle-sm"
        render={<h4 id={id} />}
        className="fx-part-title"
      >
        {title}
      </Typography>
      {children}
    </section>
  );
}

const COMPARED_LABEL: Record<Comparison["kind"], string> = {
  published: "Published value",
  formula: "Hand formula",
  roundTrip: "Round trip",
  error: "Expected error",
  independent: "Independent computation",
};

export function Inspector({
  result,
  group,
  extras,
  siblings,
  controls,
  onStep,
  onClose,
  onShow,
  onShowFrames,
  onCopyLink,
}: {
  result: StressResult;
  group: GroupInfo | undefined;
  extras: ResultExtras | undefined;
  /** The results of its card, in order, for Previous and Next. */
  siblings: readonly StressResult[];
  controls: SheetControls;
  onStep: (id: string) => void;
  onClose: () => void;
  onShow: () => void;
  onShowFrames: () => void;
  onCopyLink: () => void;
}) {
  const s = resultStatus(result);
  const fp = result.fingerprint;
  const at = siblings.findIndex((r) => r.id === result.id);
  const prev = at > 0 ? siblings[at - 1] : undefined;
  const next =
    at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined;
  const title = useRef<HTMLHeadingElement>(null);
  const link = webLink(extras?.source?.url);
  return (
    <aside
      className="fx-inspector"
      aria-label="Inspector"
      onKeyDown={(e) => {
        // Arrows step through the card while focus is in the inspector
        // (not in a field or a code block being selected).
        if (e.target instanceof HTMLInputElement) {
          return;
        }
        if (e.key === "ArrowLeft" && prev) {
          onStep(prev.id);
        } else if (e.key === "ArrowRight" && next) {
          onStep(next.id);
        }
      }}
    >
      <SheetHead
        controls={controls}
        onClose={onClose}
        closeLabel="Close the inspector"
        focusRef={title}
      >
        <IconButton
          size="small"
          aria-label="Previous result"
          title="Previous result"
          disabled={!prev}
          onClick={() => prev && onStep(prev.id)}
        >
          <Icon href={svgChevronLeft} />
        </IconButton>
        <Typography
          variant="caption-lg"
          color="textSecondary"
          render={<span />}
          className="fx-num"
        >
          {group?.name ?? result.group}, {at + 1} of {siblings.length}
        </Typography>
        <IconButton
          size="small"
          aria-label="Next result"
          title="Next result"
          disabled={!next}
          onClick={() => next && onStep(next.id)}
        >
          <Icon href={svgChevronRight} />
        </IconButton>
        <StatusBadge status={s.status} {...(s.word && { word: s.word })} />
      </SheetHead>
      <div className="fx-sheet-body fx-inspector-body">
        <div>
          <Typography
            variant="body-md"
            render={<h3 ref={title} tabIndex={-1} />}
            className="fx-inspector-title"
          >
            {rowName(result, extras)}
          </Typography>
          {extras?.label && (
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              {result.title}
            </Typography>
          )}
        </div>
        <div className="fx-inspector-actions">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon href={svgFitToView} />}
            onClick={onShow}
          >
            Show on globe
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon href={svgHierarchyTree} />}
            onClick={onShowFrames}
          >
            Show frames in the tree
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon href={svgLink} />}
            onClick={onCopyLink}
          >
            Copy link
          </Button>
        </div>

        <Part title="Measured against expected">
          {result.value !== undefined && result.tolerance !== undefined ? (
            <div className="fx-measured">
              <ToleranceBar result={result} large />
              <dl className="fx-dl">
                <dt>
                  {result.unit === undefined
                    ? "Relative difference"
                    : "Deviation"}
                </dt>
                <dd className="fx-num">
                  {quantity(result.value, result.unit, 3)}
                  <span className="fx-muted">
                    {" "}
                    ({ofTolerance(result.value, result.tolerance)})
                  </span>
                </dd>
                <dt>
                  <Term k="tolerance" />
                </dt>
                <dd className="fx-num">
                  {quantity(result.tolerance, result.unit, 3)}
                </dd>
                {result.effect && (
                  <>
                    <dt>
                      <Term k="effect" />
                    </dt>
                    <dd className="fx-num">
                      {quantity(result.effect.value, result.effect.unit, 4)}
                      <span className="fx-muted">: {result.effect.label}</span>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          ) : result.expectedError !== undefined ? (
            <dl className="fx-dl">
              <dt>Expected an error matching</dt>
              <dd>
                <code className="fx-code">/{result.expectedError}/</code>
              </dd>
              <dt>Thrown</dt>
              <dd>{result.error ?? "nothing was thrown"}</dd>
            </dl>
          ) : (
            <Typography variant="body-sm" render={<p />}>
              {result.effect
                ? `${quantity(result.effect.value, result.effect.unit, 4)}: ${result.effect.label}. Shown, not judged.`
                : "Judged by the case itself; its detail says how."}
            </Typography>
          )}
          {result.fingerprintCheck && !result.fingerprintCheck.match && (
            <Typography
              variant="body-sm"
              render={<p />}
              className="fx-fail-text"
            >
              Failed: browser ≠ Node.{" "}
              {result.fingerprintCheck.difference ?? "The fingerprints differ."}
            </Typography>
          )}
          {result.detail && (
            <Typography
              variant="body-sm"
              color="textSecondary"
              render={<p />}
              className="fx-detail"
            >
              {result.detail}
            </Typography>
          )}
        </Part>

        <Part title="Compared against">
          {extras?.compared ? (
            <Typography variant="body-sm" render={<p />}>
              <span className="fx-strong">
                {COMPARED_LABEL[extras.compared.kind]}:
              </span>{" "}
              {extras.compared.text}
            </Typography>
          ) : (
            <Typography
              variant="body-sm"
              render={<p />}
              className="fx-unbounded"
            >
              The case doesn&rsquo;t say what its expected value is.
            </Typography>
          )}
          {extras?.source && (
            <div className="fx-citation">
              <Typography variant="body-sm" render={<p />}>
                {extras.source.document}
                {extras.source.publisher && `, ${extras.source.publisher}`}
                {extras.source.locator && `; ${extras.source.locator}`}
              </Typography>
              <Typography
                variant="caption-lg"
                color="textSecondary"
                render={<p />}
              >
                Retrieved {extras.source.retrieved}
                {link && (
                  <>
                    {": "}
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {link.host}
                    </Link>
                  </>
                )}
              </Typography>
            </div>
          )}
          {extras?.formula && (
            <p className="fx-formula">
              <code className="fx-code">{extras.formula}</code>
            </p>
          )}
        </Part>

        <Part title="Computation trace">
          {extras?.trace ? (
            <ol className="fx-trace">
              {extras.trace.map((step, i) => (
                <li key={i} className={`fx-trace-step fx-trace-${step.kind}`}>
                  <span className="fx-trace-label">
                    {step.label}
                    {step.note && (
                      <span className="fx-muted"> ({step.note})</span>
                    )}
                  </span>
                  <span className="fx-trace-value">
                    {step.code ? (
                      <code className="fx-code fx-code-block">
                        {step.value}
                      </code>
                    ) : (
                      <span className="fx-num">{step.value}</span>
                    )}
                    <CopyButton
                      text={step.value}
                      label={`Copy ${step.label}`}
                    />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              No steps recorded for this check yet; its detail above gives its
              numbers.
            </Typography>
          )}
        </Part>

        <Part title={<Term k="accuracy">Accuracy</Term>}>
          {result.accuracy ? (
            <>
              {extras?.relative && (
                <Typography variant="body-sm" render={<p />}>
                  {extras.relative}
                </Typography>
              )}
              <BudgetBar
                accuracy={result.accuracy}
                label="Accuracy of this result"
              />
            </>
          ) : (
            <Typography variant="body-sm" render={<p />}>
              <AccuracyText accuracy={undefined} note={extras?.accuracyNote} />.
              This check states no position, so this note, with its tolerance,
              is the accuracy that applies.
            </Typography>
          )}
        </Part>

        {fp && (
          <Part title={<Term k="fingerprint" />}>
            {result.fingerprintCheck && (
              <p className="fx-fp-line">
                {result.fingerprintCheck.match ? (
                  <StatusBadge status="pass" word="Browser = Node" />
                ) : (
                  <StatusBadge status="fail" word="Browser ≠ Node" />
                )}
                {result.fingerprintCheck.difference && (
                  <span className="fx-detail">
                    {result.fingerprintCheck.difference}
                  </span>
                )}
              </p>
            )}
            <div className="fx-fp-pipeline">
              <code className="fx-code fx-code-block">{fp.pipeline}</code>
              <CopyButton text={fp.pipeline} label="Copy the pipeline" />
            </div>
            <dl className="fx-dl">
              <dt>Grids</dt>
              <dd>
                {fp.grids.length === 0
                  ? "none"
                  : fp.grids.map((g) => (
                      <span key={g.name} className="fx-grid">
                        {g.name}{" "}
                        <code className="fx-code">
                          {g.sha256.slice(0, 12)}…
                        </code>
                        <CopyButton
                          text={g.sha256}
                          label={`Copy ${g.name}'s SHA-256`}
                        />
                      </span>
                    ))}
              </dd>
              <dt>Coordinates</dt>
              <dd className="fx-num">
                {fp.coordinates.length / 3} points, compared to 10⁻⁹ m
              </dd>
            </dl>
          </Part>
        )}
      </div>
    </aside>
  );
}
