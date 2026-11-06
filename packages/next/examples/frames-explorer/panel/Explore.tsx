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
import { type ReactNode, useId } from "react";
import type { TreeNode } from "../tree.ts";
import { BudgetBar } from "./BudgetBar.tsx";
import { EDGE_LABEL, FAMILY_INFO, familyOf } from "./families.ts";
import { FamilyKey, FrameTree, edgeAccuracyText } from "./FrameTree.tsx";
import { sig } from "./format.ts";
import type {
  DistortionCrs,
  OrionFrame,
  OverlayView,
  PanelActions,
  PanelModel,
} from "./model.ts";
import { ITEM_LABEL, Term } from "./parts.tsx";

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

/** R16's walk: every edge from the root to the frame, then its composed accuracy. */
function Walk({
  model,
  path,
  actions,
}: {
  model: PanelModel;
  path: TreeNode[];
  actions: PanelActions;
}) {
  const target = path.at(-1)!;
  const composed = model.composed[target.id];
  let family = familyOf(path[0]!);
  return (
    <div className="fx-walk" key={target.id}>
      <div className="fx-walk-head">
        <Typography variant="body-md" render={<h3 />} className="fx-strong">
          {path[0]!.label} to {target.label}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon href={svgFitToView} />}
          onClick={() => actions.showOnGlobe({ frame: target.id })}
        >
          Show on globe
        </Button>
      </div>
      <ol className="fx-walk-edges">
        {path.slice(1).map((node, i) => {
          family = familyOf(node, family);
          const acc = edgeAccuracyText(node.edge.kind, node.edge.accuracy);
          return (
            <li
              key={node.id}
              className="fx-walk-edge"
              style={{ ["--i" as string]: i }}
            >
              <span className={`fx-walk-dot fx-family-${family}`} aria-hidden />
              <div className="fx-walk-text">
                <div className="fx-walk-line">
                  <span className="fx-strong">
                    {path[i]!.label} → {node.label}
                  </span>
                  <span className="fx-chip">{EDGE_LABEL[node.edge.kind]}</span>
                  <span
                    className={`fx-num fx-walk-acc${acc.unknown ? " fx-unbounded" : ""}`}
                  >
                    {acc.text}
                  </span>
                </div>
                <Typography
                  variant="body-sm"
                  color="textSecondary"
                  render={<p />}
                >
                  {node.edge.detail}
                </Typography>
                <Typography
                  variant="caption-lg"
                  color="textSecondary"
                  render={<p />}
                >
                  {node.edge.accuracy.note}
                </Typography>
              </div>
            </li>
          );
        })}
      </ol>
      {composed ? (
        <>
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            A point at {target.label}&rsquo;s origin, against <Term k="itrf" />{" "}
            at {utc(model.clock.utc)}.
          </Typography>
          <BudgetBar
            accuracy={composed}
            label={`Accuracy of ${target.label} against ITRF`}
          />
        </>
      ) : (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          No composed accuracy for this frame yet.
        </Typography>
      )}
    </div>
  );
}

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
        className={`fx-overlay-acc${overlay.unbounded ? " fx-unbounded" : ""}${problem ? " fx-problem" : ""}`}
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
  onStartTour,
}: {
  model: PanelModel;
  actions: PanelActions;
  selectedFrame: string | undefined;
  onSelectFrame: (id: string | undefined) => void;
  onStartTour: () => void;
}) {
  const path =
    model.tree && selectedFrame ? pathFromRoot(model.tree, selectedFrame) : [];
  const onPath = new Set(path.map((n) => n.id));
  const eop = model.clock.eop;
  return (
    <div className="fx-tab-body">
      <div className="fx-tour-prompt">
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          New to frames? Six stops, about two minutes.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon href={svgPathAnimationSingle} />}
          onClick={onStartTour}
        >
          Take the tour
        </Button>
      </div>

      <Section title="Frames" aside={<FamilyKey />}>
        {model.tree ? (
          <>
            <FrameTree
              tree={model.tree}
              selected={selectedFrame}
              onPath={onPath}
              onSelect={onSelectFrame}
              onShow={(id) => actions.showOnGlobe({ frame: id })}
            />
            {path.length > 1 ? (
              <Walk model={model} path={path} actions={actions} />
            ) : (
              <Typography
                variant="body-sm"
                color="textSecondary"
                render={<p />}
                className="fx-hint"
              >
                Select a frame to walk its edges from the root, with each
                edge&rsquo;s math, data and accuracy.
              </Typography>
            )}
          </>
        ) : (
          <div className="fx-empty" role="status">
            <CircularProgress size={16} aria-hidden />
            <Typography variant="body-sm" render={<p />}>
              {model.treeNote}
            </Typography>
          </div>
        )}
      </Section>

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
          Accuracies repeat in the globe&rsquo;s legend; {model.triadScale}.
        </Typography>
      </Section>

      <Section title="Clock">
        <div className="fx-clock">
          <div>
            <p className="fx-clock-time fx-num">{utc(model.clock.utc)}</p>
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
          Orion&rsquo;s path follow it. {FAMILY_INFO.trajectory.label} data
          covers 2026-04-02 to 04-10.
        </Typography>
      </Section>
    </div>
  );
}
