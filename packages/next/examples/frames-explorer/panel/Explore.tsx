// The Explore tab (R14): the frame tree with the selected frame's walk to the
// root (R16), the overlays with their accuracy lines (R8), and the clock.
import {
  Button,
  CircularProgress,
  FormControl,
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
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { svgPathAnimationSingle } from "@stratakit/icons/path-animation-single";
import { Icon } from "@stratakit/mui";
import {
  type ReactNode,
  type RefObject,
  useId,
  useMemo,
  useState,
} from "react";
import type { TreeNode } from "../tree.ts";
import type { AccuracyTerm } from "../../../src/measure/accuracy.ts";
import { BudgetBar } from "./BudgetBar.tsx";
import { EDGE_LABEL, familyMap } from "./families.ts";
import { FamilyKey, FrameTree, edgeAccuracyText } from "./FrameTree.tsx";
import { length, sig } from "./format.ts";
import {
  type ComposedView,
  type DistortionCrs,
  type OrionFrame,
  type OverlayView,
  type PanelActions,
  type PanelModel,
  REFERENCES,
  type Reference,
} from "./model.ts";
import { SheetHead, Split } from "./Sheet.tsx";
import { AccuracyText, ITEM_LABEL, Term } from "./parts.tsx";

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

/** Every node on the path, with its place along it (for the tree's connector). */
export function pathSteps(
  tree: TreeNode,
  from: string,
  to: string,
): Map<string, number> {
  const p = pathBetween(tree, from, to);
  const out = new Map<string, number>();
  if (!p) {
    return out;
  }
  [...p.up, p.ancestor, ...p.down].forEach((n, i) => out.set(n.id, i));
  return out;
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
              {terms.length > 0
                ? terms.map((t) => {
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
            {view.statement.terms.length === 0 ? (
              "exact at the origin"
            ) : (
              <AccuracyText accuracy={view.statement} />
            )}
          </span>
        </p>
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
            at the clock&rsquo;s instant, {utc(model.clock.utc)}.
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

/** A term as the walk's "Adds …" line names it, in plain words. */
const ADDS: Record<AccuracyTerm["source"], string> = {
  ephemeris: "the ephemeris",
  earthOrientation: "Earth orientation",
  relativity: "relativity",
  projection: "the PROJ operation",
  trajectory: "the trajectory",
  coordinateScale: "the time scale",
  lightTime: "light time",
};

/** The walk's "against": the frame the composed statement is stated in (C2). */
function ReferenceSelect({
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

function OverlayRow({
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
      {overlay.on && !problem && (
        <OverlayOptions overlay={overlay} model={model} actions={actions} />
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

export function Explore({
  model,
  actions,
  selectedFrame,
  onSelectFrame,
  resultFrames,
  onBackToResult,
  onStartTour,
  tourButton,
}: {
  model: PanelModel;
  actions: PanelActions;
  selectedFrame: string | undefined;
  onSelectFrame: (id: string | undefined) => void;
  /** While a result is selected: its label and the frames it uses (R14, I5). */
  resultFrames?: { label: string; frames: readonly string[] } | undefined;
  onBackToResult: () => void;
  onStartTour: () => void;
  tourButton: RefObject<HTMLButtonElement | null>;
}) {
  const [reference, setReference] = useState<Reference>("ITRF");
  const tree = model.tree;
  const onPath = useMemo(() => {
    if (!tree) {
      return new Map<string, number>();
    }
    if (selectedFrame) {
      return pathSteps(tree, reference, selectedFrame);
    }
    const out = new Map<string, number>();
    for (const f of resultFrames?.frames ?? []) {
      for (const [id, i] of pathSteps(tree, "ITRF", f)) {
        out.set(id, Math.min(i, out.get(id) ?? i));
      }
    }
    return out;
  }, [tree, selectedFrame, reference, resultFrames]);
  const eop = model.clock.eop;
  const selectedNode =
    tree && selectedFrame
      ? pathFromRoot(tree, selectedFrame).at(-1)
      : undefined;
  const list = (
    <div className="fx-tab-body">
      <div className="fx-tour-prompt">
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          New to frames? Six stops, about two minutes.
        </Typography>
        <Button
          ref={tourButton}
          variant="outlined"
          size="small"
          startIcon={<Icon href={svgPathAnimationSingle} />}
          onClick={onStartTour}
        >
          Take the tour
        </Button>
      </div>

      <Section title="On the globe">
        <ul className="fx-overlays">
          {model.overlays.map((o) => (
            <OverlayRow
              key={o.id}
              overlay={o}
              model={model}
              actions={actions}
            />
          ))}
        </ul>
        <Typography variant="caption-lg" color="textSecondary" render={<p />}>
          Each line is the overlay&rsquo;s composed accuracy, as the
          globe&rsquo;s legend states it; {model.triadScale}.
        </Typography>
      </Section>

      <Section title="Frames" aside={<FamilyKey />}>
        {resultFrames && !selectedFrame && (
          <p className="fx-filter">
            <Typography variant="body-sm" render={<span />}>
              Frames used by{" "}
              <span className="fx-strong">{resultFrames.label}</span>
            </Typography>
            <Button size="small" variant="text" onClick={onBackToResult}>
              Back to the result
            </Button>
          </p>
        )}
        {tree ? (
          <FrameTree
            tree={tree}
            selected={selectedFrame}
            onPath={onPath}
            onSelect={onSelectFrame}
            onShow={(id) => actions.showOnGlobe({ frame: id })}
          />
        ) : (
          <div className="fx-empty" role="status">
            <CircularProgress size={16} aria-hidden />
            <Typography variant="body-sm" render={<p />}>
              {model.treeNote}
            </Typography>
          </div>
        )}
      </Section>

      <Section title="Clock">
        <div className="fx-clock">
          <div>
            <p className="fx-clock-time fx-num">{utc(model.clock.utc)}</p>
            <Typography
              variant="caption-lg"
              color="textSecondary"
              render={<p />}
            >
              {model.clock.local
                ? `${model.clock.local} on the time controls over the globe, which show the place's local time`
                : "The same instant as the time controls over the globe, which show the place's local time"}
            </Typography>
            <Typography
              variant="caption-lg"
              render={<p />}
              className={eop.kind === "measured" ? "fx-muted" : "fx-unbounded"}
            >
              <Term k="eop">Earth orientation</Term>{" "}
              {eop.kind === "measured"
                ? "measured (IERS)"
                : eop.kind === "predicted"
                  ? `predicted, ${eop.ageDays.toFixed(1)} days past the last measured row (IERS Bulletin A)`
                  : `outside the table (${eop.span})`}
            </Typography>
          </div>
          <Button variant="outlined" size="small" onClick={actions.jumpToFlyby}>
            Jump to the Artemis II flyby
          </Button>
        </div>
        <Typography variant="caption-lg" color="textSecondary" render={<p />}>
          Set the time with the controls over the globe; triads and
          Orion&rsquo;s path follow it. Orion&rsquo;s data covers 2026-04-02 to
          04-10.
        </Typography>
      </Section>
    </div>
  );
  return (
    <Split
      list={list}
      sheetKey={selectedFrame}
      sheet={
        tree && selectedNode
          ? (controls) => (
              <>
                <SheetHead
                  controls={controls}
                  onClose={() => onSelectFrame(undefined)}
                  closeLabel="Close the walk"
                >
                  <ReferenceSelect
                    reference={reference}
                    setReference={setReference}
                  />
                  <Typography
                    variant="body-md"
                    render={<h3 />}
                    className="fx-strong"
                  >
                    to {selectedNode.label}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Icon href={svgFitToView} />}
                    onClick={() =>
                      actions.showOnGlobe({ frame: selectedNode.id })
                    }
                  >
                    Show on globe
                  </Button>
                </SheetHead>
                <div className="fx-sheet-body">
                  <Walk
                    model={model}
                    tree={tree}
                    target={selectedNode.id}
                    reference={reference}
                    setReference={setReference}
                    actions={actions}
                  />
                </div>
              </>
            )
          : undefined
      }
    />
  );
}
