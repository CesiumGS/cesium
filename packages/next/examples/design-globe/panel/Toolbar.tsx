// The design globe's toolbar over the view (DESIGN.md "The viewer";
// owner's feedback F8: "turn that into a small toolbar over the viewer,
// like a cad tool"). StrataKit's solid toolbar of ghost icon buttons, as
// Dyno's Viewer has, in two groups: Measure (the snap mode, a point at the
// view's centre, Clear) and View (the ghost, the exaggeration, the
// compass, the error ribbon, see underground). Under it, while a measurement is under way or
// a click was refused, one line saying what to do next.
import { Divider, IconButton } from "@stratakit/bricks";
import { svgCompass } from "@stratakit/icons/compass";
import { svgCursor } from "@stratakit/icons/cursor";
import { svgMeasureLocation } from "@stratakit/icons/measure-location";
import { svgObjectScale } from "@stratakit/icons/object-scale";
import { svgRoad } from "@stratakit/icons/road";
import { svgSelectionClear } from "@stratakit/icons/selection-clear";
import { svgSnapKeypoint } from "@stratakit/icons/snap-keypoint";
import { svgSnapNearest } from "@stratakit/icons/snap-nearest";
import { svgTransparency } from "@stratakit/icons/transparency";
import { svgUndergroundStorage } from "@stratakit/icons/underground-storage";
import { unstable_Toolbar as Toolbar } from "@stratakit/structures";
import type { MeasurePanel } from "../measureView.ts";
import type { SnapMode } from "../page.ts";
import type { MeasureActions } from "./Measure.tsx";
import type { PanelActions, PanelModel } from "./model.ts";

/** The snap modes as the toolbar names them, with their tooltips. */
const SNAPS: readonly {
  readonly mode: SnapMode;
  readonly icon: string;
  readonly label: string;
}[] = [
  {
    mode: "exact",
    icon: svgSnapKeypoint,
    label: "Snap to the alignment, exact (else to the drawn mesh)",
  },
  { mode: "geometry", icon: svgSnapNearest, label: "Snap to the drawn mesh" },
  { mode: "none", icon: svgCursor, label: "No snapping: the point you click" },
];

function Toggle({
  label,
  icon,
  active,
  reason,
  onChange,
}: {
  label: string;
  icon: string;
  active: boolean;
  /** Why it can't apply now; disabled with it. */
  reason?: string | undefined;
  onChange: (on: boolean) => void;
}) {
  return (
    <Toolbar.Item
      render={
        <IconButton
          label={reason !== undefined ? `${label} (${reason})` : label}
          icon={icon}
          variant="ghost"
          active={active && reason === undefined}
          disabled={reason !== undefined}
          onClick={() => onChange(!active)}
        />
      }
    />
  );
}

export function MeasureToolbar({
  model,
  measure,
  actions,
  measureActions,
}: {
  model: PanelModel;
  measure: MeasurePanel;
  actions: PanelActions;
  measureActions: MeasureActions;
}) {
  const u = measure.user;
  const noOther = model.switchable ? undefined : "this site has one placement";
  const view = model.view;
  // What to do next, shown only while it matters: a point down, a refusal,
  // a snap under way (the idle instruction is the tooltips').
  const prompt = u.busy
    ? "Snapping…"
    : u.refused || u.phase === "first"
      ? [u.note, u.instruction].filter(Boolean).join(" ")
      : u.note;
  return (
    <div className="dg-toolbar">
      <Toolbar.Group variant="solid" aria-label="Measure and view">
        {SNAPS.map((s) => (
          <Toolbar.Item
            key={s.mode}
            render={
              <IconButton
                label={s.label}
                icon={s.icon}
                variant="ghost"
                active={measure.snap === s.mode}
                onClick={() => measureActions.setSnap(s.mode)}
              />
            }
          />
        ))}
        <Toolbar.Item
          render={
            <IconButton
              label={
                u.phase === "first"
                  ? "Second point at the view's centre (Enter)"
                  : "Point at the view's centre (Enter)"
              }
              icon={svgMeasureLocation}
              variant="ghost"
              onClick={() => measureActions.pointAtCentre()}
            />
          }
        />
        <Toolbar.Item
          render={
            <IconButton
              label="Clear the measurement (Escape)"
              icon={svgSelectionClear}
              variant="ghost"
              disabled={u.phase === "empty"}
              onClick={() => measureActions.clear()}
            />
          }
        />
        <Divider orientation="vertical" />
        <Toggle
          label="Show the other placement (the ghost)"
          icon={svgTransparency}
          active={model.ghost}
          reason={noOther}
          onChange={(on) => actions.setGhost(on)}
        />
        <Toggle
          label={`Exaggerate the error ×${model.exaggeration}`}
          icon={svgObjectScale}
          active={model.exaggerate}
          reason={noOther}
          onChange={(on) => actions.setExaggerate(on)}
        />
        {view !== undefined && (
          <>
            <Toggle
              label="Compass at the cursor: grid north against true north"
              icon={svgCompass}
              active={view.compass}
              onChange={(on) => actions.setCompass(on)}
            />
            <Toggle
              label="Error ribbon: the road where it truly is, tinted by rigid's error there"
              icon={svgRoad}
              active={view.ribbon}
              reason={
                view.ribbonReady ? undefined : "once the corridor's frame is in"
              }
              onChange={(on) => actions.setRibbon(on)}
            />
            <Toggle
              label="See underground: the ground around the road translucent, its tunnels in view (clicks go through it)"
              icon={svgUndergroundStorage}
              active={view.underground}
              reason={view.undergroundNote}
              onChange={(on) => actions.setUnderground(on)}
            />
          </>
        )}
      </Toolbar.Group>
      {model.exaggerate && (
        <span className="dg-toolbar-badge dg-num">
          Errors drawn ×{model.exaggeration}
        </span>
      )}
      <p
        className={`dg-toolbar-prompt${prompt === undefined ? " idle" : ""}${u.refused ? " refused" : ""}`}
        role="status"
        aria-live="polite"
      >
        {prompt ?? ""}
      </p>
    </div>
  );
}
