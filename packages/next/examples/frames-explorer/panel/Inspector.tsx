// The inspector (R14 level 4, R16's computation trace): one result, glance to
// proof. Measured against expected, the trace from input to output, the
// accuracy terms, the source or hand formula, the fingerprint, and actions.
import { Button, IconButton, Link, Typography } from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronUp } from "@stratakit/icons/chevron-up";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { svgHierarchyTree } from "@stratakit/icons/hierarchy-tree";
import { svgLink } from "@stratakit/icons/link";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useId } from "react";
import type { StressResult } from "../tests.ts";
import { BudgetBar } from "./BudgetBar.tsx";
import { quantity } from "./format.ts";
import type { GroupInfo, ResultExtras } from "./model.ts";
import {
  AccuracyText,
  CopyButton,
  StatusBadge,
  Term,
  resultStatus,
} from "./parts.tsx";
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

export function Inspector({
  result,
  group,
  extras,
  expanded,
  onExpand,
  onClose,
  onShow,
  onHighlight,
  onCopyLink,
}: {
  result: StressResult;
  group: GroupInfo | undefined;
  extras: ResultExtras | undefined;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onClose: () => void;
  onShow: () => void;
  onHighlight: () => void;
  onCopyLink: () => void;
}) {
  const s = resultStatus(result);
  const fp = result.fingerprint;
  return (
    <aside className="fx-inspector" aria-label="Inspector">
      <div className="fx-inspector-head">
        <StatusBadge status={s.status} {...(s.word && { word: s.word })} />
        <Typography
          variant="caption-lg"
          color="textSecondary"
          render={<span />}
          className="fx-inspector-group"
        >
          {group?.name ?? result.group}
        </Typography>
        <span className="fx-inspector-tools">
          <IconButton
            size="small"
            aria-label={expanded ? "Show the cards too" : "Fill the tab"}
            title={expanded ? "Show the cards too" : "Fill the tab"}
            onClick={() => onExpand(!expanded)}
          >
            <Icon href={expanded ? svgChevronDown : svgChevronUp} />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Close the inspector"
            title="Close"
            onClick={onClose}
          >
            <Icon href={svgDismiss} />
          </IconButton>
        </span>
      </div>
      <div className="fx-inspector-body">
        <Typography
          variant="body-md"
          render={<h3 />}
          className="fx-inspector-title"
        >
          {result.title}
        </Typography>
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
            onClick={onHighlight}
          >
            Highlight frames
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
                <dt>Deviation</dt>
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
              This check records no steps beyond its detail above.
            </Typography>
          )}
        </Part>

        <Part title={<Term k="accuracy">Accuracy</Term>}>
          {result.accuracy ? (
            <BudgetBar
              accuracy={result.accuracy}
              label="Accuracy of this result"
            />
          ) : (
            <Typography variant="body-sm" render={<p />}>
              <AccuracyText accuracy={undefined} />. It checks arithmetic
              against an expected value, so its tolerance, not an accuracy, is
              what it&rsquo;s judged by.
            </Typography>
          )}
        </Part>

        {(extras?.source || extras?.formula) && (
          <Part title="Source">
            {extras.source && (
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
                  {webLink(extras.source.url) && (
                    <>
                      {": "}
                      <Link
                        href={webLink(extras.source.url)!.href}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {webLink(extras.source.url)!.host}
                      </Link>
                    </>
                  )}
                </Typography>
              </div>
            )}
            {extras.formula && (
              <p className="fx-formula">
                <code className="fx-code">{extras.formula}</code>
              </p>
            )}
          </Part>
        )}

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
