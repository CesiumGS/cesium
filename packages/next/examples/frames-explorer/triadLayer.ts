// The triads on the globe (DESIGN.md "Triads"): the scene's, the selected
// frame's path to the root and the selection's emphasis, each in its
// family's color, with their labels. Every other part's labels (the
// overlays', the walk's, the callouts') come in through the label board and
// go to the globe with the triads', in one set.
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import { SECONDARY, type LabelSpec, type TriadSpec } from "./globe.ts";
import { EARTH_RADIUS, WGS84, isFrame, type PageCore } from "./page.ts";
import { familyMap, type Family } from "./panel/families.ts";
import type { OverlayId } from "./panel/model.ts";
import { LUNAR_SITE, type SceneSpec } from "./scenarios/scenes.ts";
import type { KnobState } from "./scenarios/spec.ts";
import { pathToRoot, type TreeNode } from "./tree.ts";

/** The labels each part has on the globe, shown with the triads' (the sag, the convergence, contour values). */
export type LabelBoard = Map<
  OverlayId | "callouts" | "walk" | "sky",
  LabelSpec[]
>;

export interface TriadLayer {
  /** The triads and every label, again. */
  refresh(): void;
  /** A frame's family (its color), "earth" until the tree is in. */
  familyOf(id: string): Family;
  dispose(): void;
}

export function createTriadLayer(deps: {
  core: Pick<PageCore, "frames" | "globe" | "view">;
  labels: LabelBoard;
  tree(): TreeNode | undefined;
  /** The scene's own frames (the lunar site, Sacramento). */
  local(): readonly Frame[];
  /** The triads overlay is on. */
  on(): boolean;
  scene(): SceneSpec | undefined;
  sceneKnobs(): KnobState;
  /** The frames the selection highlights. */
  emphasis(): Set<string>;
}): TriadLayer {
  const { frames: framesNow, globe, view } = deps.core;

  const familyOf = (id: string): Family => {
    const tree = deps.tree();
    return (tree && familyMap(tree).get(id)) ?? "earth";
  };

  const selectedFrame = () => {
    const s = view.get().selection;
    return isFrame(s) ? s.id : undefined;
  };

  function specs(): TriadSpec[] {
    const frames = framesNow();
    if (!frames || !deps.on()) {
      return [];
    }
    const scene = deps.scene();
    const tree = deps.tree();
    const byName = new Map<string, Frame>();
    for (const f of [
      frames.icrf,
      frames.hcrs,
      frames.gcrf,
      frames.earthIcrf,
      frames.eme2000,
      frames.moonIcrf,
      frames.itrf,
      frames.moonMe,
      frames.moonPa,
      ...deps.local(),
    ]) {
      byName.set(f.name, f);
    }
    const ids = new Set(scene?.triads(deps.sceneKnobs()) ?? ["ITRF", "GCRF"]);
    const s = view.get().selection;
    if (isFrame(s) && tree) {
      for (const n of pathToRoot(tree, s.id)) {
        ids.add(n.id);
      }
    }
    for (const id of deps.emphasis()) {
      ids.add(id);
    }
    const out: TriadSpec[] = [];
    for (const id of ids) {
      const frame = byName.get(id);
      if (frame === undefined || id === "ICRF" || id === "HCRS") {
        // The barycentre's and the Sun's origins are far off the scene.
        continue;
      }
      const geocentric = id === "ITRF" || id === "GCRF" || id === "EME2000";
      const length = 1.5 * EARTH_RADIUS;
      out.push({
        id,
        label: id,
        frame,
        family: familyOf(id),
        // Geocentric: from the surface out, no cube inside the Earth (S-I2);
        // GCRF at the secondary strength beside ITRF's (S-I1).
        ...(geocentric && {
          length,
          surface: [
            WGS84.radii[0]! / length,
            WGS84.radii[1]! / length,
            WGS84.radii[2]! / length,
          ] as const,
        }),
        // GCRF beside ITRF: secondary strength and box heads (S-I1).
        ...(id === "GCRF" && { strength: SECONDARY, head: "box" as const }),
        // Stand-on-moon's subject at 15% of the camera's distance (S-I8).
        ...(id === LUNAR_SITE &&
          scene?.id === "stand-on-moon" && { scale: 0.15 }),
      });
    }
    return out;
  }

  function refresh(): void {
    const triads = specs();
    globe.setTriads(triads);
    // Earth-turns is about the two geocentric triads: their axis names
    // stay pinned, exempt from the declutter (S-I1).
    const pinned = deps.scene()?.pinnedAxes === true;
    const labels: LabelSpec[] = triads.flatMap((t): LabelSpec[] => {
      if (t.length === undefined || !framesNow()) {
        return [
          {
            id: t.id,
            text: t.label,
            family: t.family,
            priority: t.id === selectedFrame() ? 3 : 1,
            at: () => globe.triadOrigin(t.id),
          },
        ];
      }
      // A geocentric triad names each axis at its tip ("x ITRF", "y GCRF"),
      // GCRF's to the left of the point and ITRF's to the right; the two z
      // axes, nearly one line, carry both names stacked on the left (S-I1).
      const length = t.length;
      return (["x", "y", "z"] as const).map((name, axis) => ({
        id: `${t.id}:${name}`,
        text: `${name} ${t.label}`,
        family: t.family,
        priority: t.id === selectedFrame() ? 3 : 2,
        ...((t.id === "GCRF" || name === "z") && { side: "left" as const }),
        ...(t.id !== "GCRF" && name === "z" && { dy: 18 }),
        ...(pinned && { pinned: true }),
        at: () => globe.triadOrigin(t.id) && axisTip(t.frame, length, axis),
      }));
    });
    globe.setLabels([...labels, ...[...deps.labels.values()].flat()]);
  }

  function axisTip(
    frame: Frame,
    length: number,
    axis = 0,
  ): Float64Array | undefined {
    const frames = framesNow();
    // The instant the globe shows, as the triad's own origin (globe.ts).
    const instant = globe.shownAt();
    if (!frames || !instant) {
      return undefined;
    }
    const m = frameTransform(frame, frames.itrf, instant);
    const c = 4 * axis;
    return Float64Array.from([
      m[12]! + m[c]! * length,
      m[13]! + m[c + 1]! * length,
      m[14]! + m[c + 2]! * length,
    ]);
  }

  return { refresh, familyOf, dispose: () => {} };
}
