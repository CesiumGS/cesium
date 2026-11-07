// Explore's parts (R14), reused by the scenarios' tab and Verification: the
// walk (R16, C2), the walk's reference, sections, and the catalog's overlay
// rows with their accuracy lines (R8). (The Explore tab itself gave way to
// the scenarios, Scenarios.tsx.)
import {
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { type ReactNode, useId } from "react";
import type { TreeNode } from "../tree.ts";
import { BudgetBar } from "./BudgetBar.tsx";
import { EDGE_LABEL, edgeAccuracyText, familyMap } from "./families.ts";
import { length, sig } from "./format.ts";
import { useLiveTime } from "./liveTime.ts";
import {
  type ComposedView,
  type DistortionCrs,
  type OrionFrame,
  type OverlayView,
  type PanelActions,
  type PanelModel,
  REFERENCES,
  type Reference,
  type WalkTerm,
} from "./model.ts";
import { AccuracyText, ITEM_LABEL, Term, unknownTerms } from "./parts.tsx";

/** A tab's section: an h2 in StrataKit's subtitle style, and its content. */
export function Section({
  title,
  aside,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="fx-section" aria-labelledby={id}>
      <div className="fx-section-head">
        <Typography variant="subtitle-md" render={<h2 id={id} />}>
          {title}
        </Typography>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** "2026-04-06 23:00:00 UTC" from ISO 8601. */
export const utc = (iso: string) =>
  iso.replace("T", " ").replace(/(\.\d+)?Z$/, " UTC");

/** The clock's instant, now (it moves every frame while the clock plays). */
function ClockUtc() {
  return <>{utc(useLiveTime().utc)}</>;
}

/** `id`'s node and its ancestors, root first. */
export function pathFromRoot(tree: TreeNode, id: string): TreeNode[] {
  const walk = (node: TreeNode): TreeNode[] | undefined => {
    if (node.id === id) {
      return [node];
    }
    for (const child of node.children) {
      const found = walk(child);
      if (found) {
        return [node, ...found];
      }
    }
    return undefined;
  };
  return walk(tree) ?? [];
}

/**
 * The path a composed statement uses (C2): from `from` up to the common
 * ancestor, then down to `to`. `up` and `down` hold the nodes whose edges
 * are walked (each edge named by its child), `up` from `from`, `down` to
 * `to`.
 */
export function pathBetween(
  tree: TreeNode,
  from: string,
  to: string,
): { up: TreeNode[]; ancestor: TreeNode; down: TreeNode[] } | undefined {
  const a = pathFromRoot(tree, from);
  const b = pathFromRoot(tree, to);
  if (a.length === 0 || b.length === 0) {
    return undefined;
  }
  let i = 0;
  while (i < a.length && i < b.length && a[i]!.id === b[i]!.id) {
    i++;
  }
  return {
    up: a.slice(i).reverse(),
    ancestor: a[i - 1]!,
    down: b.slice(i),
  };
}

const REFERENCE_LABEL: Record<Reference, string> = {
  ITRF: "ITRF (Earth-fixed)",
  GCRF: "GCRF (geocentric, inertial)",
  ICRF: "ICRF (barycentric)",
};

/**
 * R16's walk, as the statement composes it (C2): the reference up to the
 * common ancestor and down to the frame, each edge with its math, data and
 * own accuracy, and what it adds to the total at the frame's origin: a
 * term, or nothing and why.
 */
export function Walk({
  model,
  tree,
  target,
  reference,
  setReference,
  actions,
}: {
  model: PanelModel;
  tree: TreeNode;
  target: string;
  reference: Reference;
  setReference: (r: Reference) => void;
  actions: PanelActions;
}) {
  const path = pathBetween(tree, reference, target);
  const view: ComposedView | undefined = model.composed[reference]?.[target];
  if (!path) {
    return null;
  }
  const targetNode = path.down.at(-1) ?? path.up[0] ?? path.ancestor;
  const families = familyMap(tree);
  const labelOf = new Map<string, string>();
  for (const n of [...path.up, path.ancestor, ...path.down]) {
    labelOf.set(n.id, n.label);
  }
  // Each edge's terms, by index into the statement.
  const termsOn = new Map<string, number[]>();
  view?.termEdges.forEach((edges, i) =>
    edges.forEach((e) => termsOn.set(e, [...(termsOn.get(e) ?? []), i])),
  );
  const zero = new Map(view?.zeroAtOrigin.map((z) => [z.edge, z.why]) ?? []);
  let step = 0;
  const edgeRow = (
    child: TreeNode,
    from: string,
    to: string,
    inverse: boolean,
  ) => {
    const acc = edgeAccuracyText(child.edge.kind, child.edge.accuracy);
    const terms = termsOn.get(child.id) ?? [];
    // A term of 0 m here adds nothing; it is said as the rotations are (minor 7).
    const nonzero = terms.filter((t) => view?.statement.terms[t]?.meters !== 0);
    const i = step++;
    return (
      <li
        key={child.id}
        className="fx-walk-edge"
        style={{ ["--i" as string]: i }}
      >
        <span
          className={`fx-walk-dot fx-family-${families.get(child.id) ?? "earth"}`}
          aria-hidden
        />
        <div className="fx-walk-text">
          <div className="fx-walk-line">
            <span className="fx-strong">
              {from} → {to}
            </span>
            <span className="fx-edge-kind">
              {EDGE_LABEL[child.edge.kind]}
              {inverse ? ", inverse" : ""}
            </span>
            <span
              className={`fx-num fx-walk-acc${acc.unknown ? " fx-unbounded" : ""}`}
            >
              {acc.text}
            </span>
          </div>
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            {child.edge.detail}
          </Typography>
          <Typography variant="caption-lg" color="textSecondary" render={<p />}>
            {child.edge.accuracy.note}
          </Typography>
          {view && (
            <p className="fx-walk-adds">
              {nonzero.length > 0
                ? nonzero.map((t) => {
                    const term = view.statement.terms[t]!;
                    const shared = view.termEdges[t]!.filter(
                      (e) => e !== child.id,
                    );
                    return (
                      <span key={t} className="fx-walk-term">
                        Adds {ADDS[term.source]},{" "}
                        <span
                          className={`fx-num${term.meters === undefined ? " fx-unbounded" : ""}`}
                        >
                          {term.meters === undefined
                            ? "not bounded"
                            : length(term.meters)}
                        </span>
                        {shared.length > 0 &&
                          ` (one term with ${shared.map((e) => labelOf.get(e) ?? e).join(", ")})`}
                        {term.meters !== undefined &&
                        term.meters > 0 &&
                        view.statement.meters
                          ? `: ${budgetShare(term.meters, view.statement)} of the total`
                          : ""}
                      </span>
                    );
                  })
                : zero.has(child.id)
                  ? `Adds nothing at the origin: ${zero.get(child.id)}.`
                  : terms.length > 0 && child.edge.kind === "rotation"
                    ? // A term that is 0 m here (Earth orientation at the
                      // geocentre): the same words as the other rotations.
                      "Adds nothing at the origin: a rotation turns the frame's axes about its own origin, so it doesn't move that origin."
                    : child.edge.accuracy.byDefinition
                      ? "Adds nothing: exact by definition."
                      : "Adds nothing at the origin."}
            </p>
          )}
        </div>
      </li>
    );
  };
  return (
    <div className="fx-walk" key={`${reference}:${target}`}>
      {view && (
        <p className="fx-walk-total">
          <Typography variant="body-sm" color="textSecondary" render={<span />}>
            Composed at {targetNode.label}&rsquo;s origin
          </Typography>
          <span className="fx-budget-value">
            {view.statement.terms.length === 0 &&
            view.statement.meters !== undefined ? (
              "exact at the origin"
            ) : (
              // The headline says only "Not bounded"; why goes on its own
              // line below, at body size (S-I9).
              <AccuracyText accuracy={view.statement} compact />
            )}
          </span>
        </p>
      )}
      {view && view.statement.meters === undefined && (
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="fx-walk-why"
        >
          {sentence(unknownTerms(view.statement)[0] ?? "a term has no size")}
        </Typography>
      )}
      <ol
        className="fx-walk-edges"
        aria-label={`Edges from ${reference} to ${targetNode.label}`}
      >
        <li className="fx-walk-node" style={{ ["--i" as string]: step++ }}>
          <span className="fx-walk-node-label">
            {reference}
            <span className="fx-muted">, the reference</span>
          </span>
        </li>
        {path.up.map((n) => {
          const parent = pathFromRoot(tree, n.id).at(-2);
          return edgeRow(n, n.label, parent?.label ?? "", true);
        })}
        {path.up.length > 0 && path.down.length > 0 && (
          <li className="fx-walk-node" style={{ ["--i" as string]: step++ }}>
            <span className="fx-walk-node-label">
              {path.ancestor.label}
              <span className="fx-muted">, the common ancestor</span>
            </span>
          </li>
        )}
        {path.down.map((n, i) =>
          edgeRow(
            n,
            (i === 0 ? path.ancestor : path.down[i - 1]!).label,
            n.label,
            false,
          ),
        )}
      </ol>
      {view ? (
        <>
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            A point at {targetNode.label}&rsquo;s origin, against{" "}
            {reference === "ITRF" ? (
              <Term k="itrf" />
            ) : reference === "GCRF" ? (
              <Term k="gcrf" />
            ) : (
              <Term k="icrf" />
            )}{" "}
            at the clock&rsquo;s instant, <ClockUtc />.
          </Typography>
          <BudgetBar
            accuracy={view.statement}
            label={`Accuracy of ${targetNode.label} against ${reference}`}
            from={view.termEdges.map((edges) =>
              edges.length === 0
                ? "no edge"
                : edges.map((e) => labelOf.get(e) ?? e).join(", "),
            )}
          />
          {view.note && (
            <Typography
              variant="body-sm"
              render={<p />}
              className="fx-walk-note"
            >
              {view.note}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          No composed accuracy against {reference} for {targetNode.label}: it
          needs frame data. Choose another reference, or wait for frame data.
        </Typography>
      )}
    </div>
  );
}

/** `text` as a sentence: its first letter capitalized (the headline already says "Not bounded"). */
const sentence = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** A term as the walk's "Adds …" line names it, in plain words. */
const ADDS: Record<WalkTerm["source"], string> = {
  stated: "its stated accuracy",
  ephemeris: "the ephemeris",
  earthOrientation: "Earth orientation",
  relativity: "relativity",
  projection: "the PROJ operation",
  geoidFallback: "the geoid fallback",
  pick: "the pick tolerance",
  trajectory: "the trajectory",
  coordinateScale: "the time scale",
  lightTime: "light time",
};

/** The walk's "against": the frame the composed statement is stated in (C2). */
export function ReferenceSelect({
  reference,
  setReference,
}: {
  reference: Reference;
  setReference: (r: Reference) => void;
}) {
  const id = useId();
  return (
    <FormControl size="small" className="fx-walk-ref">
      <InputLabel id={`${id}-ref`}>Against</InputLabel>
      <Select
        labelId={`${id}-ref`}
        label="Against"
        value={reference}
        renderValue={(r) => String(r)}
        onChange={(e) => setReference(e.target.value as Reference)}
      >
        {REFERENCES.map((r) => (
          <MenuItem key={r} value={r}>
            {REFERENCE_LABEL[r]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const budgetShare = (m: number, a: { meters: number | undefined }) => {
  const share = (m * m) / (a.meters! * a.meters!);
  return share >= 0.995
    ? "≈ 100%"
    : share < 0.001
      ? "< 0.1%"
      : `${(100 * share).toPrecision(2)}%`;
};

export function OverlayRow({
  overlay,
  model,
  actions,
}: {
  overlay: OverlayView;
  model: PanelModel;
  actions: PanelActions;
}) {
  const id = useId();
  const waiting = overlay.on && overlay.state === "waiting";
  const problem = overlay.state === "missing" || overlay.state === "error";
  return (
    <li className="fx-overlay">
      <div className="fx-overlay-head">
        <Switch
          checked={overlay.on}
          disabled={overlay.state === "missing"}
          onChange={(_, on) => actions.setOverlay(overlay.id, on)}
          slotProps={{
            input: { "aria-labelledby": id, "aria-describedby": `${id}-d` },
          }}
        />
        <span id={id} className="fx-overlay-label">
          {overlay.label}
        </span>
        {waiting && overlay.waitingFor && (
          <span className="fx-overlay-wait" role="status">
            <CircularProgress size={12} aria-hidden />
            fetching {ITEM_LABEL[overlay.waitingFor]}…
          </span>
        )}
      </div>
      <Typography
        variant="caption-lg"
        render={<p id={`${id}-d`} />}
        className={`fx-overlay-acc${overlay.unbounded || overlay.caution ? " fx-unbounded" : ""}${problem ? " fx-problem" : ""}`}
      >
        {problem ? overlay.problem : overlay.accuracy}
      </Typography>
      {/* One line each (S-I7): what the figure means is one click away. */}
      {!problem && overlay.detail && (
        <details className="fx-overlay-detail">
          <summary>
            <Typography variant="caption-lg" render={<span />}>
              About this figure
            </Typography>
          </summary>
          <Typography variant="caption-lg" color="textSecondary" render={<p />}>
            {overlay.detail}
          </Typography>
        </details>
      )}
      {overlay.on && !problem && (
        <OverlayOptions overlay={overlay} model={model} actions={actions} />
      )}
      {overlay.on && !problem && overlay.note && (
        <Typography
          variant="caption-lg"
          render={<p />}
          className={`fx-overlay-drawing${overlay.note.attention ? " fx-unbounded" : ""}`}
        >
          {overlay.note.text}
        </Typography>
      )}
      {overlay.on && !problem && overlay.drawing && (
        <Typography
          variant="caption-lg"
          color="textSecondary"
          render={<p />}
          className="fx-overlay-drawing"
        >
          {overlay.drawing}
        </Typography>
      )}
    </li>
  );
}

const CRS_LABEL: Record<DistortionCrs, string> = {
  "6420": "California zone 3 (EPSG:6420)",
  "32610": "UTM zone 10N (EPSG:32610)",
  "3857": "Web Mercator (EPSG:3857)",
  ldp: "Low-distortion zone (flies to its site)",
};

/** An overlay's own controls, once it's on (progressive disclosure). */
function OverlayOptions({
  overlay,
  model,
  actions,
}: {
  overlay: OverlayView;
  model: PanelModel;
  actions: PanelActions;
}) {
  const id = useId();
  switch (overlay.id) {
    case "orion":
      return (
        <div className="fx-overlay-options">
          <span id={id} className="fx-option-label">
            Drawn in
          </span>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={model.orionFrame}
            aria-labelledby={id}
            onChange={(_, v: OrionFrame | null) =>
              v && actions.setOrionFrame(v)
            }
          >
            {(["GCRF", "ITRF", "MOON_ME"] as const).map((f) => (
              <ToggleButton
                key={f}
                value={f}
                render={<Button variant="outlined" />}
              >
                {f}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      );
    case "distortion":
      return (
        <div className="fx-overlay-options fx-overlay-grid">
          <FormControl size="small">
            <InputLabel id={`${id}-crs`}>Projection</InputLabel>
            <Select
              labelId={`${id}-crs`}
              label="Projection"
              value={model.distortionCrs}
              onChange={(e) =>
                actions.setDistortionCrs(e.target.value as DistortionCrs)
              }
            >
              {(Object.keys(CRS_LABEL) as DistortionCrs[]).map((c) => (
                <MenuItem key={c} value={c}>
                  {CRS_LABEL[c]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="number"
            label="Height above the ellipsoid, m"
            value={model.distortionHeight}
            onChange={(e) =>
              actions.setDistortionHeight(Number(e.target.value))
            }
          />
        </div>
      );
    case "designGrid":
      // F32: the convergence is about a pixel at the tour's framing, so the
      // true-north lines lean ×20 by default, labelled; this shows them true.
      return (
        <div className="fx-overlay-options">
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={model.trueScale}
                onChange={(_, on) => actions.setTrueScale(on)}
              />
            }
            label={
              <span className="fx-option-label">
                Show true scale
                {model.trueScale
                  ? ""
                  : ` (angle drawn ${model.convergenceFactor}× larger)`}
              </span>
            }
          />
        </div>
      );
    case "bias":
      return (
        <div className="fx-overlay-options">
          <span id={id} className="fx-option-label">
            Exaggeration ×{sig(model.biasFactor, 1)}
          </span>
          <Slider
            size="small"
            min={0}
            max={7}
            step={1}
            marks
            value={Math.log10(model.biasFactor)}
            aria-labelledby={id}
            getAriaValueText={(v) => `${sig(10 ** v, 1)} times`}
            onChange={(_, v) => actions.setBiasFactor(10 ** (v as number))}
          />
        </div>
      );
    default:
      return null;
  }
}
