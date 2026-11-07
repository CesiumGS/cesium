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
//    the lighthouse's light, green where the last trace found it clear, red
//    past where it met the terrain, amber where it can't tell; the light's
//    name.
//
//  - The robot arm (Task 7b): its links joint to joint from the page's own
//    joint frames (the knobs move them), a ring at the tool, and the
//    straight line from the tool to the station, labelled with its length
//    and accuracy: the tool's composed here by the library (pointAccuracy)
//    from the page's frames, the station's and PROJ's from the worker.
//
//  - The capstone (Task 8): the straight line from From to To, from the
//    page's own frames for both ends (Orion from the page's own OEM,
//    orionTrack.ts), with its length (ICRF, as the answer's) and the
//    worker's accuracy at its middle.
//
// The verdicts are the trace's, which trails the clock (on demand,
// sightLines.ts); the lines' places are this frame's.
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import { hexRgba, type Globe, type LabelSpec } from "./globe.ts";
import { overlayMesh, polyline } from "./overlays.ts";
import { footprintLabel, spotOf } from "./panel/answerText.ts";
import type { TerrainSightView } from "./panel/model.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import { LINE_PX, segmentPlacement } from "./skyRay.ts";
import { orionPlace, type OrionTrack } from "./orionTrack.ts";
import type { LabelBoard } from "./triadLayer.ts";
import { ARM, MARK, PAD_OUTSIDE_SHORT } from "./scenarios/arm.ts";
import { CAPSTONE, type SceneSpec } from "./scenarios/scenes.ts";
import {
  CAMERA_MOUNT,
  LIGHTHOUSE,
  MAST_SENSOR,
  SHIP_BODY,
  droneTrack,
  lighthouseLight,
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

/**
 * The capstone's two ends on the page at `instant` (Task 8): each end's
 * place (ITRF and ICRF, m) from the page's own frames by its node, Orion's
 * from the page's own OEM; undefined while an end's frame isn't there (the
 * ship's before its track is in, Orion's outside its data).
 */
export function pairPlaces(
  pair: NonNullable<ScenarioEvaluation["pair"]>,
  local: readonly Frame[],
  orion: OrionTrack | undefined,
  frames: Pick<Frames, "itrf" | "icrf">,
  instant: NonNullable<ReturnType<Globe["shownAt"]>>,
):
  | {
      from: { itrf: number[]; icrf: number[] };
      to: { itrf: number[]; icrf: number[] };
    }
  | undefined {
  const place = (node: string) => {
    if (node === "orion") {
      const p = orion ? orionPlace(orion, frames, instant) : undefined;
      if (!p || !orion) {
        return undefined;
      }
      return {
        itrf: Array.from(p),
        icrf: at3(frameTransform(orion.frame, frames.icrf, instant)),
      };
    }
    const f = local.find((l) => l.name === node);
    return f
      ? {
          itrf: at3(frameTransform(f, frames.itrf, instant)),
          icrf: at3(frameTransform(f, frames.icrf, instant)),
        }
      : undefined;
  };
  const from = place(pair.from.node);
  const to = place(pair.to.node);
  return from && to ? { from, to } : undefined;
}

/** "384,912 km", "12.4 km", "860 m": the leader's length, coarse enough not to flicker as it moves. */
export function leaderLength(meters: number): string {
  return meters >= 100_000
    ? `${Math.round(meters / 1000).toLocaleString("en-US")} km`
    : meters >= 1000
      ? `${(meters / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`
      : `${Math.round(meters)} m`;
}

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

/**
 * The trace a line's verdict is drawn from (the final review, finding 3):
 * the one traced for its own setup (`key`), and none while the evaluation
 * is stale, so the globe says "tracing" rather than the last verdict.
 */
export function currentTrace(
  traces: readonly TerrainSightView[] | undefined,
  line: string,
  key: string | undefined,
  stale: boolean,
): TerrainSightView | undefined {
  if (stale) {
    return undefined;
  }
  const v = traces?.find((t) => t.id === line);
  return v?.traced === key ? v : undefined;
}

/** The capstone leader's words: its length, and its ± only when it is this setup's. */
export function pairLeaderText(
  length: number,
  meters: number | undefined,
  stale: boolean,
): string {
  if (stale) {
    return `${leaderLength(length)} apart · updating`;
  }
  return `${leaderLength(length)} apart ${meters === undefined ? "(not bounded)" : `±${meters < 1 ? `${(meters * 1000).toFixed(0)} mm` : `${meters.toPrecision(2)} m`}`}`;
}

/**
 * The drone camera's mark on the globe (Task 9 C1, round 2): the ring and
 * the spot's label only where the answer gives a spot (`spotOf`, the
 * panel's rule); otherwise the ray's words, matching the panel's.
 */
export function cameraMark(
  fp: Parameters<typeof footprintLabel>[0],
  mine: TerrainSightView | undefined,
): { hit?: readonly number[]; text: string } {
  const hit = spotOf(mine);
  if (hit) {
    return { hit, text: footprintLabel(fp, hit) };
  }
  return {
    text:
      mine?.state === "clear"
        ? "Camera ray · no ground within reach"
        : mine?.state === "blocked"
          ? "Camera ray · can't tell yet where it lands"
          : mine
            ? "Camera ray · can't tell where it lands"
            : "Camera ray · tracing on the terrain",
  };
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
  /**
   * Whether the evaluation is the last setup's while the new one is worked
   * out (the host's `state().stale`, as callouts.ts takes it): no verdict of
   * it is painted as current (the final review, finding 3).
   */
  stale?(): boolean;
  labels: LabelBoard;
  refreshLabels(): void;
  camera?():
    | {
        position: ArrayLike<number>;
        pixelAt(p: ArrayLike<number>): number;
      }
    | undefined;
  /** Orion on the page's own thread (orionTrack.ts), for the capstone's leader. */
  orionTrack?(): OrionTrack | undefined;
}): BodyLines {
  const { globe } = deps;
  /** Each segment overlay drawn, by id, and how (its colour and dash). */
  const shown = new Map<string, string>();
  /** The static overlays (the track, the ring) and what they were drawn from. */
  const fixed = new Map<string, string>();
  let labelKey = "";
  /** Where the moving labels sit this frame: their `at` reads it (the text is set only when it changes). */
  const anchor: {
    sight?: number[];
    camera?: number[];
    leader?: number[];
    pairFrom?: number[];
    pairTo?: number[];
  } = {};

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
    stale: boolean,
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
    // The answer's own ± (the worker's), not composed again here; none
    // while it is the last setup's (the final review, findings 3 and 6).
    const total = a.totalMeters;
    // The label 70 m along the line from the tool, clear of the arm and
    // still in the view.
    anchor.leader = tool.map((x, i) => x + (70 / length) * (mark[i]! - x));
    labels.push({
      id: "bodies:leader",
      text: `${length.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m ${stale ? "· updating" : total === undefined ? "(not bounded)" : `±${(total * 1000).toFixed(1)} mm`} to ${MARK.name} (${PAD_OUTSIDE_SHORT})`,
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
      !(e?.track || e?.arm || e?.pair) ||
      e.scenario !== scene.id
    ) {
      if (shown.size > 0 || fixed.size > 0 || deps.labels.has("bodies")) {
        clear();
      }
      return;
    }
    const byName = new Map(deps.local().map((f) => [f.name, f]));
    const traces = deps.traces();
    const stale = deps.stale?.() === true;
    const segments: Segment[] = [];
    const labels: LabelSpec[] = [];
    const heights = e.track?.heights ?? [];
    if (scene.id === "everything" && e.pair) {
      const ends = pairPlaces(
        e.pair,
        deps.local(),
        deps.orionTrack?.(),
        frames,
        instant,
      );
      if (ends) {
        const [a, b] = [ends.from.itrf, ends.to.itrf];
        segments.push({
          name: "pair",
          from: a,
          to: b,
          // The last setup's pair while the new one is worked out: unsure.
          color: stale ? "unsure" : "white",
          ...(stale && { dashed: true }),
        });
        const mid = a.map((v, i) => (v + b[i]!) / 2);
        // Both on the Earth, the line runs through it (depth-tested, out of
        // sight, as the answer says): the length goes with From's label.
        const inside = Math.hypot(mid[0]!, mid[1]!, mid[2]!) < 6_300_000;
        anchor.leader = mid;
        anchor.pairFrom = a;
        anchor.pairTo = b;
        const length = Math.hypot(
          ...ends.to.icrf.map((v, i) => v - ends.from.icrf[i]!),
        );
        const apart = pairLeaderText(length, e.pair.meters, stale);
        const name = (o: string) =>
          (CAPSTONE as Record<string, { name: string } | undefined>)[o]?.name ??
          o;
        labels.push(
          {
            id: "bodies:pair-from",
            text: `From ${name(e.pair.from.object)}${inside ? ` · ${apart}` : ""}`,
            at: () => anchor.pairFrom,
            family: "earth",
            priority: 4,
            marker: true,
          },
          {
            id: "bodies:pair-to",
            text: `To ${name(e.pair.to.object)}`,
            at: () => anchor.pairTo,
            family: "earth",
            priority: 3,
            marker: true,
          },
          ...(inside
            ? []
            : [
                {
                  id: "bodies:pair",
                  text: apart,
                  at: () => anchor.leader,
                  family: "earth" as const,
                  priority: 4,
                  pinned: true,
                },
              ]),
        );
      }
    } else if (scene.id === "robot-arm" && e.arm) {
      placeArm(e.arm, byName, frames.itrf, instant, segments, labels, stale);
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
        const mine = currentTrace(traces, fp.line, fp.key, stale);
        const mark = cameraMark(fp, mine);
        const hit = mark.hit;
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
            text: mark.text,
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
            text: mark.text,
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
      if (body && mast && sight && e.track?.lightSea !== undefined) {
        const waterline = at3(frameTransform(body, frames.itrf, instant));
        const sensor = at3(frameTransform(mast, frames.itrf, instant));
        segments.push({
          name: "mast",
          from: waterline,
          to: sensor,
          color: "white",
        });
        const light = Array.from(lighthouseLight(e.track.lightSea));
        const mine = currentTrace(traces, sight.line, sight.key, stale);
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
            id: "bodies:lighthouse",
            text: LIGHTHOUSE.name,
            at: Float64Array.from(light),
            family: "earth",
            priority: 3,
            marker: true,
          },
          {
            id: "bodies:sight",
            text: `To ${LIGHTHOUSE.short} · ${words}`,
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
    // A fixed label's place is part of its key: the lighthouse's light moves 32 m
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
