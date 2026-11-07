// The drone's and the ship's lines on the globe (Task 7), placed on the
// page's thread every frame at the instant the globe shows, from the
// page's own frames for them (the stage builds them from the evaluation's
// track, vehicles.ts), as the sky ray is (skyRay.ts): never from a worker
// reply, which comes on the evaluation's cadence.
//
//  - The drone: its flight line; the camera's centre ray from the mount to
//    where the page's trace met the terrain (sightLines.ts), with a ring and
//    "Camera looks here · E, N" there; dashed to the trace's end when it met
//    nothing, or before it is traced.
//  - The ship: its track; the mast, a leader from the waterline up to the
//    sensor as the ship pitches and rolls; the sight line from the sensor to
//    the buoy's light, green where the last trace found it clear, red past
//    where it met the terrain, amber where it can't tell; the buoy's name.
//
//  - The robot arm (Task 7b): its links joint to joint from the page's own
//    joint frames (the knobs move them), a ring at the tool, and the
//    straight line from the tool to the station, labelled with its length
//    and accuracy: the tool's composed here by the library (pointAccuracy)
//    from the page's frames, the station's and PROJ's from the worker.
//
// The verdicts are the trace's, which trails the clock (on demand,
// sightLines.ts); the lines' places are this frame's.
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import { framePoint } from "../../src/frames/local.ts";
import { pointAccuracy } from "../../src/frames/pointAccuracy.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import { hexRgba, type Globe, type LabelSpec } from "./globe.ts";
import { overlayMesh, polyline } from "./overlays.ts";
import { footprintLabel } from "./panel/answerText.ts";
import type { TerrainSightView } from "./panel/model.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import type { SceneSpec } from "./scenarios/scenes.ts";
import { LINE_PX, segmentPlacement } from "./skyRay.ts";
import type { LabelBoard } from "./triadLayer.ts";
import { ARM, MARK, PAD_OUTSIDE_SHORT } from "./scenarios/arm.ts";
import {
  BUOY,
  CAMERA_MOUNT,
  MAST_SENSOR,
  SHIP_BODY,
  buoyLight,
  droneTrack,
  onEarth,
  shipTrack,
} from "./scenarios/vehicles.ts";

const OVERLAY = "scenario:body";

/** The lines' colours (the HUD exception: canvas colours). */
const COLOR = {
  white: "#ffffff",
  clear: "#3fb950",
  blocked: "#f85149",
  unsure: "#d29922",
  track: "#9cc0ff",
} as const;

/** One segment as drawn this frame. */
interface Segment {
  name: string;
  from: number[];
  to: number[];
  color: keyof typeof COLOR;
  dashed?: boolean;
  strength?: number;
}

export interface BodyLines {
  /** Every frame: the lines and labels at the instant the globe shows. */
  place(): void;
  dispose(): void;
}

const at3 = (m: ArrayLike<number>) => [m[12]!, m[13]!, m[14]!];

/** A ring of `radius` m round `p` (Earth-fixed) in its tangent plane. */
function ring(p: ArrayLike<number>, radius: number): Float64Array {
  const n = Ellipsoid.WGS84.geodeticSurfaceNormal(
    Float64Array.from(p),
    new Float64Array(3),
  )!;
  const h = Math.hypot(n[0]!, n[1]!);
  const e = [-n[1]! / h, n[0]! / h, 0];
  const u = [
    n[1]! * e[2]! - n[2]! * e[1]!,
    n[2]! * e[0]! - n[0]! * e[2]!,
    n[0]! * e[1]! - n[1]! * e[0]!,
  ];
  const out = new Float64Array(3 * 49);
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    for (let k = 0; k < 3; k++) {
      out[3 * i + k] =
        p[k]! + radius * (Math.cos(a) * e[k]! + Math.sin(a) * u[k]!);
    }
  }
  return out;
}

export function createBodyLines(deps: {
  globe: Pick<
    Globe,
    "shownAt" | "setOverlay" | "placeOverlay" | "removeOverlay"
  >;
  frames(): Frames | undefined;
  scene(): SceneSpec | undefined;
  /** The scene's own frames (the stage's: the bodies among them). */
  local(): readonly Frame[];
  evaluation(): ScenarioEvaluation | undefined;
  /** The page's traces of the evaluation's sight lines (sightLines.ts). */
  traces(): readonly TerrainSightView[] | undefined;
  labels: LabelBoard;
  refreshLabels(): void;
  camera?():
    | {
        position: ArrayLike<number>;
        pixelAt(p: ArrayLike<number>): number;
      }
    | undefined;
}): BodyLines {
  const { globe } = deps;
  /** Each segment overlay drawn, by id, and how (its colour and dash). */
  const shown = new Map<string, string>();
  /** The static overlays (the track, the ring) and what they were drawn from. */
  const fixed = new Map<string, string>();
  let labelKey = "";
  /** Where the moving labels sit this frame: their `at` reads it (the text is set only when it changes). */
  const anchor: { sight?: number[]; camera?: number[]; leader?: number[] } = {};

  function clear(): void {
    for (const id of [...shown.keys(), ...fixed.keys()]) {
      globe.removeOverlay(id);
    }
    shown.clear();
    fixed.clear();
    if (deps.labels.has("bodies")) {
      deps.labels.delete("bodies");
      labelKey = "";
      deps.refreshLabels();
    }
  }

  /** Each segment's strands: 1 px and one a pixel to each side, square to the view (skyRay's). */
  function strands(s: Segment): Float64Array[] {
    const cam = deps.camera?.();
    if (!cam) {
      return [segmentPlacement(s.from, s.to)];
    }
    const d = s.to.map((x, i) => x - s.from[i]!);
    const l = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
    const side = (p: number[]) => {
      const v = p.map((x, i) => x - cam.position[i]!);
      const c = [
        d[1]! * v[2]! - d[2]! * v[1]!,
        d[2]! * v[0]! - d[0]! * v[2]!,
        d[0]! * v[1]! - d[1]! * v[0]!,
      ];
      const lc = Math.hypot(c[0]!, c[1]!, c[2]!) || 1;
      return c.map((x) => (x / lc) * cam.pixelAt(p) * (l > 0 ? 1 : 0));
    };
    const s0 = side(s.from);
    const s1 = side(s.to);
    const half = (LINE_PX - 1) / 2;
    const out: Float64Array[] = [];
    for (let k = -half; k <= half; k++) {
      out.push(
        segmentPlacement(
          s.from.map((x, i) => x + k * s0[i]!),
          s.to.map((x, i) => x + k * s1[i]!),
        ),
      );
    }
    return out;
  }

  function draw(s: Segment): void {
    const how = `${s.color}:${s.dashed === true}:${s.strength ?? 1}`;
    strands(s).forEach((placement, k) => {
      const id = `${OVERLAY}:${s.name}:${k}`;
      if (shown.get(id) !== how) {
        const unit = new Float64Array(3 * 101);
        for (let i = 0; i <= 100; i++) {
          unit[3 * i + 2] = i / 100;
        }
        globe.setOverlay(
          id,
          [
            {
              chunks: overlayMesh(polyline(unit, [255, 255, 255, 255])),
              color: hexRgba(COLOR[s.color]),
              strength: s.strength ?? 1,
              dashed: s.dashed === true,
            },
          ],
          { placement },
        );
        shown.set(id, how);
      } else {
        globe.placeOverlay(id, placement);
      }
    });
  }

  /**
   * A static line (the track, the ring), its points built and drawn again
   * only when `key` changes (review finding 10: not every frame).
   */
  function fixedLine(
    name: string,
    key: string,
    points: () => Float64Array,
    color: keyof typeof COLOR,
  ): void {
    const id = `${OVERLAY}:fixed:${name}`;
    if (fixed.get(id) === key) {
      return;
    }
    globe.setOverlay(id, [
      {
        chunks: overlayMesh(polyline(points(), [255, 255, 255, 255])),
        color: hexRgba(COLOR[color]),
      },
    ]);
    fixed.set(id, key);
  }

  function dropFixed(name: string): void {
    const id = `${OVERLAY}:fixed:${name}`;
    if (fixed.has(id)) {
      globe.removeOverlay(id);
      fixed.delete(id);
    }
  }

  /** A track's line, its vertices at their heights (the waterline, the drone's). */
  function trackPoints(
    vertices: readonly (readonly [number, number])[],
    heights: readonly number[],
  ): Float64Array {
    // Each leg in 20 pieces, so the line follows the ground's curve.
    const out: number[] = [];
    for (let i = 0; i + 1 < vertices.length; i++) {
      const [a, b] = [vertices[i]!, vertices[i + 1]!];
      for (let k = i === 0 ? 0 : 1; k <= 20; k++) {
        const f = k / 20;
        out.push(
          ...onEarth(
            a[0] + f * (b[0] - a[0]),
            a[1] + f * (b[1] - a[1]),
            heights[i]! + f * (heights[i + 1]! - heights[i]!),
          ),
        );
      }
    }
    return Float64Array.from(out);
  }

  /** The arm's links, its tool's ring and its line to the station, this frame. */
  function placeArm(
    a: NonNullable<ScenarioEvaluation["arm"]>,
    byName: ReadonlyMap<string, Frame>,
    itrf: Frame,
    instant: NonNullable<ReturnType<typeof globe.shownAt>>,
    segments: Segment[],
    labels: LabelSpec[],
  ): void {
    const chain = [ARM.base, ARM.yaw, ARM.elbow, ARM.wrist, ARM.tool].map((n) =>
      byName.get(n),
    );
    if (chain.some((f) => f === undefined)) {
      return;
    }
    const at = chain.map((f) => at3(frameTransform(f!, itrf, instant)));
    ["column", "boom", "forearm", "tool"].forEach((name, i) => {
      segments.push({ name, from: at[i]!, to: at[i + 1]!, color: "white" });
    });
    const tool = at[4]!;
    fixedLine(
      "ring",
      tool.map((x) => x.toFixed(3)).join(),
      () => ring(tool, 0.8),
      "white",
    );
    const mark = Array.from(a.mark);
    segments.push({
      name: "leader",
      from: tool,
      to: mark,
      color: "track",
      dashed: true,
    });
    const length = Math.hypot(...tool.map((x, i) => x - mark[i]!));
    const composed = pointAccuracy(
      framePoint(chain[4]!, [0, 0, 0], instant),
      itrf,
    );
    const total =
      composed.meters === undefined || a.projMeters === undefined
        ? undefined
        : Math.hypot(composed.meters, a.markMeters, a.projMeters);
    // The label 70 m along the line from the tool, clear of the arm and
    // still in the view.
    anchor.leader = tool.map((x, i) => x + (70 / length) * (mark[i]! - x));
    labels.push({
      id: "bodies:leader",
      text: `${length.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m ${total === undefined ? "(not bounded)" : `±${(total * 1000).toFixed(1)} mm`} to ${MARK.name} (${PAD_OUTSIDE_SHORT})`,
      at: () => anchor.leader,
      family: "earth",
      priority: 4,
      pinned: true,
    });
  }

  function place(): void {
    const scene = deps.scene();
    const frames = deps.frames();
    const instant = globe.shownAt();
    const e = deps.evaluation();
    if (
      !scene?.bodies ||
      !frames ||
      !instant ||
      !(e?.track || e?.arm) ||
      e.scenario !== scene.id
    ) {
      if (shown.size > 0 || fixed.size > 0 || deps.labels.has("bodies")) {
        clear();
      }
      return;
    }
    const byName = new Map(deps.local().map((f) => [f.name, f]));
    const traces = deps.traces();
    const segments: Segment[] = [];
    const labels: LabelSpec[] = [];
    const heights = e.track?.heights ?? [];
    if (scene.id === "robot-arm" && e.arm) {
      placeArm(e.arm, byName, frames.itrf, instant, segments, labels);
    } else if (scene.id === "drone") {
      const mount = byName.get(CAMERA_MOUNT);
      const fp = e.answer.footprint;
      const line = e.sightLines?.find((l) => l.id === fp?.line);
      fixedLine(
        "track",
        JSON.stringify(heights),
        () => trackPoints(droneTrack(heights).vertices, heights),
        "track",
      );
      if (mount && fp && line) {
        const m = frameTransform(mount, frames.itrf, instant);
        const from = at3(m);
        const dir = [m[0]!, m[1]!, m[2]!];
        const v = traces?.find((t) => t.id === fp.line);
        const mine = v?.traced === fp.key ? v : undefined;
        const hit = mine?.state === "blocked" ? mine.hitAt : undefined;
        if (hit) {
          segments.push({
            name: "camera",
            from,
            to: Array.from(hit),
            color: "white",
          });
          fixedLine("ring", hit.join(), () => ring(hit, 12), "white");
          labels.push({
            id: "bodies:footprint",
            text: footprintLabel(fp, hit),
            at: Float64Array.from(hit),
            family: "engineering",
            priority: 4,
            pinned: true,
          });
        } else {
          dropFixed("ring");
          anchor.camera = from.map((x, i) => x + 120 * dir[i]!);
          segments.push({
            name: "camera",
            from,
            to: from.map((x, i) => x + fp.reach * dir[i]!),
            color: mine && mine.state !== "clear" ? "unsure" : "white",
            dashed: true,
          });
          labels.push({
            id: "bodies:footprint",
            text:
              mine?.state === "clear"
                ? "Camera ray · no ground within reach"
                : mine
                  ? "Camera ray · can't tell where it lands"
                  : "Camera ray · tracing on the terrain",
            at: () => anchor.camera,
            family: "engineering",
            priority: 3,
          });
        }
      }
    } else if (scene.id === "ship") {
      const body = byName.get(SHIP_BODY);
      const mast = byName.get(MAST_SENSOR);
      const sight = e.answer.sight;
      fixedLine(
        "track",
        JSON.stringify(heights),
        () => trackPoints(shipTrack(heights).vertices, heights),
        "track",
      );
      if (body && mast && sight && e.track?.buoySea !== undefined) {
        const waterline = at3(frameTransform(body, frames.itrf, instant));
        const sensor = at3(frameTransform(mast, frames.itrf, instant));
        segments.push({
          name: "mast",
          from: waterline,
          to: sensor,
          color: "white",
        });
        const light = Array.from(buoyLight(e.track.buoySea));
        const v = traces?.find((t) => t.id === sight.line);
        const mine = v?.traced === sight.key ? v : undefined;
        const hit = mine?.state === "blocked" ? mine.hitAt : undefined;
        if (hit && mine?.from) {
          // Green to where it met the terrain (as traced), red past it.
          const total = Math.hypot(...light.map((x, i) => x - mine.from![i]!));
          const to = Math.hypot(...hit.map((x, i) => x - mine.from![i]!));
          const f = Math.min(1, to / total);
          const cut = sensor.map((x, i) => x + f * (light[i]! - x));
          segments.push({
            name: "sight-a",
            from: sensor,
            to: cut,
            color: "clear",
          });
          segments.push({
            name: "sight-b",
            from: cut,
            to: light,
            color: "blocked",
            dashed: true,
          });
        } else {
          segments.push({
            name: "sight-a",
            from: sensor,
            to: light,
            color:
              mine?.state === "clear"
                ? "clear"
                : mine?.state === "blocked"
                  ? "blocked"
                  : "unsure",
            dashed: mine?.state !== "clear",
          });
        }
        anchor.sight = sensor.map((x, i) => x + 0.25 * (light[i]! - x));
        const words =
          mine?.state === "clear"
            ? "in sight"
            : mine?.state === "blocked"
              ? "hidden by the terrain"
              : mine
                ? "can't tell"
                : "tracing";
        labels.push(
          {
            id: "bodies:buoy",
            text: BUOY.name,
            at: Float64Array.from(light),
            family: "earth",
            priority: 3,
            marker: true,
          },
          {
            id: "bodies:sight",
            text: `To ${BUOY.short} · ${words}`,
            at: () => anchor.sight,
            family: "earth",
            priority: 4,
            pinned: true,
          },
        );
      }
    }
    const keep = new Set(segments.map((s) => `${OVERLAY}:${s.name}:`));
    for (const id of [...shown.keys()]) {
      if (![...keep].some((k) => id.startsWith(k))) {
        globe.removeOverlay(id);
        shown.delete(id);
      }
    }
    for (const s of segments) {
      draw(s);
    }
    // A fixed label's place is part of its key: the buoy's light moves 32 m
    // with the datum, the spot with the knobs (review finding 10).
    const key = labels
      .map(
        (l) =>
          `${l.id}:${l.text}:${typeof l.at === "function" ? "" : Array.from(l.at, (x) => x.toFixed(2)).join()}`,
      )
      .join("|");
    if (key !== labelKey) {
      labelKey = key;
      deps.labels.set("bodies", labels);
      deps.refreshLabels();
    }
  }

  return {
    place,
    dispose: clear,
  };
}
