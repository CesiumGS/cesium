// The overlays on the globe (DESIGN.md "Overlays"): their state, each
// one's request to the worker (shown waiting until it draws, R9, and a late
// answer for an old request dropped), the design grid's 2 km lines, the
// rigid line's inset, and the legend's view of each. Orion's path is
// orionLayer.ts's, given the overlay's state; the fixed parts are
// overlayConfig.ts's.
import type { CrsRef } from "../../src/engineering/crs.ts";
import type { SiteTransform } from "../../src/engineering/EngineeringFrame.ts";
import type { GapInset } from "./gapInset.ts";
import { SECONDARY, familyRgba, type Globe, type LabelSpec } from "./globe.ts";
import { distortionAccuracy, operationText } from "./legend.ts";
import {
  CONVERGENCE_FACTOR,
  DEFAULT_ENGINEERING,
  DISTORTION,
  OVERLAYS,
  OVERLAY_LABEL,
  OVERLAY_NEEDS,
  defaultAccuracy,
  defaultDetail,
  type EngineeringSetup,
  type OverlayState,
} from "./overlayConfig.ts";
import { overlayMesh, roundTripMarkers, triad } from "./overlays.ts";
import {
  EARTH_RADIUS,
  WGS84,
  isAbort,
  messageOf,
  meters,
  missingText,
  type PageCore,
} from "./page.ts";
import { radians, sig } from "./panel/format.ts";
import type {
  DistortionCrs,
  OverlayId,
  OverlayPart,
  OverlayView,
} from "./panel/model.ts";
import type { FrameParams, OverlayGeometry } from "./protocol.ts";
import { RIGID_LINE } from "./rigidLine.ts";
import { pointOf, rigidLayers, type RigidBuilt } from "./rigidOverlay.ts";
import type { StressResult } from "./tests.ts";
import type { LabelBoard } from "./triadLayer.ts";
import { findNode } from "./treeState.ts";
import type { TreeNode } from "./tree.ts";

/** The settings the overlays are drawn at (Explore's controls). */
export interface OverlaySettings {
  distortionCrs: DistortionCrs;
  distortionHeight: number;
  biasFactor: number;
  trueScale: boolean;
}

export interface OverlayControl {
  /** An overlay's state: the shared object (Orion's layer writes its own). */
  state(id: OverlayId): OverlayState;
  /** Turns an overlay on or off (nothing if it already is). */
  set(id: OverlayId, on: boolean): void;
  /** Draws an overlay again as it is now (or takes it off). */
  draw(id: OverlayId): void;
  /** Turns an overlay on and draws it again, even if it was on. */
  drawOn(id: OverlayId): void;
  settings(): OverlaySettings;
  setDistortionCrs(crs: DistortionCrs): void;
  setDistortionHeight(height: number): void;
  setBiasFactor(factor: number): void;
  setTrueScale(on: boolean): void;
  /** The rigid and exact lines as drawn, for stop 4's camera. */
  rigidBuilt(): RigidBuilt | undefined;
  /**
   * The engineering overlays' setup (a scenario's CRS and site grid), or the
   * default California one: the ones on are drawn again in it.
   */
  setEngineering(setup: EngineeringSetup | undefined): void;
  engineering(): EngineeringSetup;
  /** The clock time the bias triad was drawn at. */
  biasAt(): number;
  /** The 2 km lines show only while the camera is within 60 km of them. */
  updateMinorGrid(): void;
  /** The legend's and Explore's view of every overlay. */
  views(): OverlayView[];
  dispose(): void;
}

export function createOverlayControl(deps: {
  core: Pick<
    PageCore,
    | "viewer"
    | "globe"
    | "loading"
    | "client"
    | "frames"
    | "instantNow"
    | "invalidate"
    | "disposed"
    | "scrub"
  >;
  labels: LabelBoard;
  gapInset: GapInset;
  tree(): TreeNode | undefined;
  /** The catalog's results (the round-trip markers). */
  results(): readonly StressResult[];
  orion: {
    draw(): void;
    off(): void;
    accuracy(): Partial<OverlayView>;
  };
  noteEngineering(g: OverlayGeometry, center: ArrayLike<number>): void;
  refreshTriads(): void;
  refreshCallouts(): void;
}): OverlayControl {
  const {
    viewer,
    globe,
    loading,
    client,
    frames: framesNow,
    instantNow,
    invalidate,
    disposed,
    scrub,
  } = deps.core;
  const { labels, gapInset } = deps;
  const overlays = new Map<OverlayId, OverlayState>(
    OVERLAYS.map((id) => [
      id,
      {
        on: id === "triads",
        state: id === "triads" ? "drawn" : "off",
        token: 0,
      },
    ]),
  );
  let distortionCrs: DistortionCrs = "6420";
  let distortionHeight = 0;
  let biasFactor = 1e6;
  let trueScale = false;
  let rigidBuilt: RigidBuilt | undefined;
  let setup: EngineeringSetup = DEFAULT_ENGINEERING;

  const frameParams = (
    crs: CrsRef,
    name: string,
    site?: SiteTransform,
  ): FrameParams => ({
    name,
    body: "earth",
    crs,
    ...(site && { site }),
  });

  /** Asks the worker for an overlay, showing it waiting until it draws (R9). */
  async function request(
    id: OverlayId,
    build: () => Promise<{
      layers: Parameters<Globe["setOverlay"]>[1];
      accuracy: string;
      detail?: string;
      caution?: boolean;
      labels?: LabelSpec[];
      parts?: readonly OverlayPart[];
    }>,
  ): Promise<void> {
    const s = overlays.get(id)!;
    const token = ++s.token;
    s.state = "waiting";
    delete s.problem;
    invalidate();
    try {
      const built = await build();
      if (token !== s.token || !s.on || disposed()) {
        return;
      }
      globe.setOverlay(id, built.layers);
      s.state = "drawn";
      s.accuracy = built.accuracy;
      if (built.detail !== undefined) {
        s.detail = built.detail;
      } else {
        delete s.detail;
      }
      s.caution = built.caution === true;
      if (built.parts) {
        s.parts = built.parts;
      } else {
        delete s.parts;
      }
      labels.set(id, built.labels ?? []);
      deps.refreshTriads();
      refreshInset();
    } catch (error) {
      if (isAbort(error) || token !== s.token || disposed()) {
        return;
      }
      const need = OVERLAY_NEEDS[id];
      const item = need && loading.get(need);
      s.state = item?.state === "missing" ? "missing" : "error";
      s.problem =
        item?.state === "missing"
          ? missingText(need!)
          : `It didn't draw: ${scrub(messageOf(error))}`;
    }
    invalidate();
  }

  function drawOverlay(id: OverlayId): void {
    const s = overlays.get(id)!;
    if (!s.on) {
      s.token++;
      if (id === "orion") {
        deps.orion.off();
        s.state = "off";
        deps.refreshCallouts();
      }
      if (id === "designGrid") {
        globe.removeOverlay(`${id}:minor`);
        minorGrid = undefined;
      }
      if (id === "rigidVsExact") {
        rigidBuilt = undefined;
        refreshInset();
      }
      globe.removeOverlay(id);
      labels.delete(id);
      s.state = "off";
      deps.refreshTriads();
      invalidate();
      return;
    }
    const engineeringColor = familyRgba("engineering");
    switch (id) {
      case "triads":
        s.state = "drawn";
        deps.refreshTriads();
        invalidate();
        return;
      case "designGrid":
        void request(id, async () => {
          const u = setup.unitsPerMeter;
          const extent = setup.gridExtent;
          const step = 10_000 * u;
          const frame = frameParams(setup.crs, setup.name);
          // The 2 km lines, shown only under 60 km range (DESIGN.md "The
          // tour", stop 3), built after the major ones and drawn apart.
          const minorToken = s.token;
          void client
            .overlay("designGrid", {
              frame,
              extent,
              step: step / 5,
              segment: 2000 * u,
              skipEvery: 5,
            })
            .then((minor) => {
              if (minorToken !== s.token || !s.on || disposed()) {
                return;
              }
              const chunks = minor.layers[0]!.chunks;
              globe.setOverlay(`${id}:minor`, [
                { chunks, color: engineeringColor, strength: SECONDARY },
              ]);
              minorGrid = chunks.map((c) => c.origin);
              updateMinorGrid();
            })
            .catch(() => {
              // The major lines say what failed; the minor ones just don't show.
            });
          const [grid, north] = await Promise.all([
            client.overlay("designGrid", {
              frame,
              extent,
              step,
              segment: 1000 * u,
            }),
            client.overlay("trueNorthLines", {
              frame,
              extent,
              step,
              segment: 2000 * u,
              ...(!trueScale && { exaggeration: CONVERGENCE_FACTOR }),
            }),
          ]);
          const op = operationText(grid.operation);
          const center = pointOf(grid.layers[0]!.chunks) ?? new Float64Array(3);
          deps.noteEngineering(grid, center);
          const west = pointOf(north.layers[0]!.chunks, true);
          return {
            layers: [
              { chunks: grid.layers[0]!.chunks, color: engineeringColor },
              {
                chunks: north.layers[0]!.chunks,
                color: familyRgba("earth"),
                strength: SECONDARY,
                dashed: true,
              },
            ],
            accuracy: op.text,
            detail: `${op.sentence} True north ${trueScale ? "at true scale" : `with its convergence angle drawn ${CONVERGENCE_FACTOR} times larger`}. The 2 km lines appear below 60 km.`,
            caution: op.caution,
            labels: west
              ? [
                  {
                    id: "label:true-north",
                    text: trueScale
                      ? "true north"
                      : `true north, angle ×${CONVERGENCE_FACTOR}`,
                    at: west,
                    priority: 2,
                  },
                ]
              : [],
          };
        });
        return;
      case "siteGrid":
        void request(id, async () => {
          const site = setup.site;
          const g = await client.overlay("designGrid", {
            frame: frameParams(setup.crs, `${setup.name} site`, site.transform),
            extent: site.extent,
            step: site.step,
            segment: site.segment,
          });
          const op = operationText(g.operation);
          return {
            layers: [
              {
                chunks: g.layers[0]!.chunks,
                color: engineeringColor,
                strength: SECONDARY,
                dashed: true,
              },
            ],
            accuracy: op.text,
            detail: `${op.sentence} The site formula (rotation and scale) is exact to 1 nm.`,
            caution: op.caution,
          };
        });
        return;
      case "rigidVsExact":
        void request(id, async () => {
          // Stop 4 (owner's rework): the 400 km line at true scale
          // (rigidOverlay.ts), and the 20 km mark for the inset.
          const r = setup.rigid;
          const g = await client.overlay("rigidVsExact", {
            frame: r.frame,
            from: r.from,
            to: r.to,
            samples: RIGID_LINE.samples,
            dashes: RIGID_LINE.dashes,
            ticks: RIGID_LINE.ticks,
            marks: [r.mark],
          });
          const { built, ...drawn } = rigidLayers(g, engineeringColor, r);
          rigidBuilt = built;
          return drawn;
        });
        return;
      case "roundTrip": {
        const marks = deps
          .results()
          .filter(
            (r) =>
              r.fingerprint &&
              r.value !== undefined &&
              r.tolerance !== undefined &&
              !r.userInput,
          )
          .flatMap((r) => {
            const c = r.fingerprint!.coordinates;
            const out = [];
            for (let i = 0; i + 2 < c.length; i += 3) {
              const p = [c[i]!, c[i + 1]!, c[i + 2]!];
              // Only points on the Earth (a few cases fingerprint other bodies' coordinates).
              const radius = Math.hypot(p[0]!, p[1]!, p[2]!);
              if (radius > 6.3e6 && radius < 6.4e6) {
                out.push({
                  position: p,
                  error: Math.abs(r.value!),
                  tolerance: r.tolerance!,
                });
              }
            }
            return out;
          });
        if (marks.length === 0) {
          s.state = "drawn";
          s.accuracy = "no markers yet: run the tests to place them";
          globe.removeOverlay(id);
          invalidate();
          return;
        }
        const worst = marks.reduce((a, m) =>
          m.error / m.tolerance > a.error / a.tolerance ? m : a,
        );
        globe.setOverlay(id, [
          { chunks: overlayMesh(roundTripMarkers(marks, 3000)) },
        ]);
        s.state = "drawn";
        s.accuracy = `${marks.length} points; worst round trip ${meters(worst.error)} against ${meters(worst.tolerance)}`;
        invalidate();
        return;
      }
      case "orion":
        deps.orion.draw();
        return;
      case "distortion":
        void request(id, async () => {
          const d = DISTORTION[distortionCrs];
          const g = await client.overlay("distortion", {
            frame: frameParams(
              d.crs,
              `distortion EPSG:${d.crs.format === "wkid" ? d.crs.wkid : ""}`,
            ),
            extent: d.extent,
            step: d.step,
            height: distortionHeight || (d.height ?? 0),
            tissotRadius: d.radius,
          });
          const tissot = g.layers.find((l) => l.name === "tissot")!.chunks;
          const contours = g.layers.find((l) => l.name === "contours")!.chunks;
          const labels: LabelSpec[] = [];
          if (g.labels) {
            const n = g.labels.values.length;
            for (let i = 0; i < Math.min(n, 12); i++) {
              const k = Math.floor((i * n) / Math.min(n, 12));
              const v = g.labels.values[k]!;
              labels.push({
                id: `label:ppm:${i}`,
                text: `${v > 0 ? "+" : ""}${v} ppm`,
                at: g.labels.positions.slice(3 * k, 3 * k + 3),
                priority: 0,
              });
            }
          }
          const op = operationText(g.operation);
          return {
            layers: [
              { chunks: tissot, color: engineeringColor, strength: SECONDARY },
              { chunks: contours, color: familyRgba("earth") },
            ],
            accuracy: distortionAccuracy(op),
            detail: `Tissot ellipses in true-north axes (convergence not applied); combined-factor contours from PROJ's factors, in ppm${g.skipped ? `; ${g.skipped} nodes with no scale left out` : ""}. ${op.sentence}`,
            caution: op.caution,
            labels,
          };
        });
        return;
      case "bias": {
        const frames = framesNow();
        const instant = instantNow();
        if (!frames || !instant) {
          return;
        }
        const g = triad(frames, frames.eme2000, instant, 1.5 * EARTH_RADIUS, {
          biasExaggeration: biasFactor,
        });
        globe.setOverlay(id, [{ chunks: overlayMesh(g) }]);
        biasAt = viewer.clock.time;
        s.state = "drawn";
        delete s.accuracy;
        const tip = Float64Array.from(g.positions.subarray(3, 6));
        labels.set(id, [
          {
            id: "label:bias",
            text: `EME2000 (bias ×${sig(biasFactor, 1)})`,
            at: tip,
            family: "celestial",
            priority: 2,
          },
        ]);
        deps.refreshTriads();
        invalidate();
        return;
      }
    }
  }
  let biasAt = 0;

  /** The design grid's 2 km lines' chunk origins, once drawn. */
  let minorGrid: readonly ArrayLike<number>[] | undefined;
  const MINOR_GRID_RANGE = 60_000;
  /** The 2 km lines show only while the camera is within 60 km of them. */
  function updateMinorGrid(): void {
    if (minorGrid === undefined) {
      return;
    }
    const eye = viewer.view.camera.position;
    let near = Infinity;
    for (const o of minorGrid) {
      near = Math.min(
        near,
        Math.hypot(o[0]! - eye[0]!, o[1]! - eye[1]!, o[2]! - eye[2]!),
      );
    }
    // Within 60 km above the ground, and over the grid: a chunk spans up
    // to 100 km, so its origin can be that far from its nearest line.
    const height =
      WGS84.cartesianToCartographic(eye, {
        longitude: 0,
        latitude: 0,
        height: 0,
      })?.height ?? Infinity;
    globe.setOverlayVisible(
      "designGrid:minor",
      height < MINOR_GRID_RANGE && near < MINOR_GRID_RANGE + 1e5,
    );
  }

  function setOverlay(id: OverlayId, on: boolean): void {
    const s = overlays.get(id)!;
    if (s.on === on) {
      return;
    }
    s.on = on;
    drawOverlay(id);
  }

  /**
   * The gap inset shows while the rigid and exact lines are drawn (from a
   * result in Verification); the overlay off, or leaving the example,
   * removes it.
   */
  function refreshInset(): void {
    const s = overlays.get("rigidVsExact")!;
    const built = rigidBuilt;
    if (
      !disposed() &&
      s.on &&
      s.state === "drawn" &&
      built?.mark !== undefined
    ) {
      gapInset.show({ ...built.mark, ...built.inset });
    } else {
      gapInset.hide();
    }
  }
  /** The triads' line in the legend: GCRF against ITRF, the edge's own figure (R8). */
  function triadsAccuracy(): Pick<
    OverlayView,
    "accuracy" | "detail" | "unbounded"
  > {
    const tree = deps.tree();
    const itrf = tree && findNode(tree, "ITRF");
    const a = itrf?.edge.accuracy;
    if (a?.radians !== undefined) {
      // One line (S-I7): the figure and its one qualifier, "measured Earth
      // orientation" or "predicted Earth orientation, N days".
      const qualifier = a.note.split(/ \(|\. /)[0]!;
      return {
        accuracy: `±${radians(a.radians)} (1σ), ${qualifier}`,
        detail: `The axes of GCRF against ITRF: ${a.note}.`,
      };
    }
    return {
      accuracy: a ? `not bounded: ${a.note}` : "waiting for frame data",
      ...(a && { detail: `The axes of GCRF against ITRF: ${a.note}.` }),
      unbounded: a !== undefined,
    };
  }

  function overlayViews(): OverlayView[] {
    return OVERLAYS.map((id) => {
      const s = overlays.get(id)!;
      const [fixed, short] = OVERLAY_LABEL[id];
      // The grids are named for the setup they're drawn in (a scenario's).
      const label =
        id === "designGrid"
          ? setup.gridLabel
          : id === "siteGrid"
            ? setup.site.label
            : fixed;
      const need = OVERLAY_NEEDS[id];
      const base: OverlayView = {
        id,
        label,
        short,
        on: s.on,
        state: s.on ? s.state : "off",
        accuracy: s.accuracy ?? defaultAccuracy(id, biasFactor),
        ...((s.detail ?? defaultDetail(id, trueScale)) !== undefined && {
          detail: s.detail ?? defaultDetail(id, trueScale)!,
        }),
        ...(need !== undefined && { waitingFor: need }),
        ...(s.problem !== undefined && { problem: s.problem }),
        ...(s.caution && { caution: true }),
        ...(s.unbounded && { unbounded: true }),
        ...(s.on && s.state === "drawn" && s.parts && { parts: s.parts }),
      };
      if (id === "triads") {
        Object.assign(base, triadsAccuracy());
      }
      if (id === "orion") {
        Object.assign(base, deps.orion.accuracy());
      }
      // An item the store doesn't have disables its toggles (R5).
      const item = need && loading.get(need);
      if (item?.state === "missing" && s.state !== "drawn") {
        base.state = "missing";
        base.problem = missingText(need!);
      }
      return base;
    });
  }

  return {
    state: (id) => overlays.get(id)!,
    set: setOverlay,
    draw: drawOverlay,
    drawOn: (id) => {
      overlays.get(id)!.on = true;
      drawOverlay(id);
    },
    settings: () => ({
      distortionCrs,
      distortionHeight,
      biasFactor,
      trueScale,
    }),
    setDistortionCrs: (crs) => {
      distortionCrs = crs;
      drawOverlay("distortion");
    },
    setDistortionHeight: (h) => {
      if (Number.isFinite(h)) {
        distortionHeight = h;
        drawOverlay("distortion");
      }
    },
    setBiasFactor: (k) => {
      biasFactor =
        Math.round(Math.log10(k)) === Math.log10(k)
          ? k
          : 10 ** Math.round(Math.log10(k));
      drawOverlay("bias");
    },
    setTrueScale: (on) => {
      trueScale = on;
      drawOverlay("designGrid");
    },
    rigidBuilt: () => rigidBuilt,
    setEngineering: (next) => {
      const to = next ?? DEFAULT_ENGINEERING;
      // What each overlay is drawn from: only those whose part changed
      // are drawn again (the rotation knob moves the site grid and the
      // line, not the design grid).
      const parts = (x: EngineeringSetup) => ({
        designGrid: JSON.stringify([
          x.crs,
          x.name,
          x.unitsPerMeter,
          x.gridExtent,
        ]),
        siteGrid: JSON.stringify([x.crs, x.name, x.site]),
        rigidVsExact: JSON.stringify(x.rigid),
      });
      const before = parts(setup);
      const after = parts(to);
      setup = to;
      if (before.rigidVsExact !== after.rigidVsExact) {
        // The old line's ends and gap mustn't frame the camera or the inset
        // while the new one draws.
        rigidBuilt = undefined;
        refreshInset();
      }
      for (const id of ["designGrid", "siteGrid", "rigidVsExact"] as const) {
        if (before[id] !== after[id] && overlays.get(id)!.on) {
          drawOverlay(id);
        }
      }
      invalidate();
    },
    engineering: () => setup,
    biasAt: () => biasAt,
    updateMinorGrid,
    views: overlayViews,
    dispose: () => {},
  };
}
