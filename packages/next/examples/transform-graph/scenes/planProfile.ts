import {
  Ellipsoid,
  cartographic,
  corridorUnroll,
  fromFunction,
  liveEdge,
  scaleAlongAxes,
  type MeshHandle,
  type DrawHandle,
  type View,
} from "@cesium/next";
import {
  eastNorthUpFrame,
  smoothFrame,
  switchFrame,
  type SwitchChoice,
} from "@cesium/next/frames";
import { ROAD, ROAD_CREDIT } from "../data/road.ts";
import { anchorIn } from "../content.ts";
import { hex, MeshBuilder, polylines, type Rgba } from "../geometry.ts";
import { whenDrawn } from "../loading.ts";
import { createMarker, createPointLabel } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { button, el, length, slider } from "../ui.ts";
import { positionOf } from "../../vertical-exaggeration/places.ts";

const deg = Math.PI / 180;
/** The strongest vertical exaggeration of the profile. */
const MAX_VERTICAL = 20;
/** The ribbon's half-width, m, and the stations' spacing, m. */
const HALF_WIDTH = 35;
const STEP = 20;
/** Where the profile sheet floats above the site, m. */
const SHEET_HEIGHT = 6_000;
/** The ribbon sits this far above the terrain so that the ground doesn't cover it, m. */
const LIFT = 2;

const colorOf = (u: number, low: number, high: number): Rgba => {
  const t = Math.min(1, Math.max(0, (u - low) / Math.max(1, high - low)));
  const a = hex("#4d7b3b");
  const b = hex("#c2a468");
  const c = hex("#f1f1ee");
  const mix = (x: Rgba, y: Rgba, k: number): Rgba => [
    x[0] + (y[0] - x[0]) * k,
    x[1] + (y[1] - x[1]) * k,
    x[2] + (y[2] - x[2]) * k,
    1,
  ];
  return t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2);
};

export const planProfile: Scene = {
  id: "plan-profile",
  number: 4,
  title: "Plan and profile",
  caption:
    "The Täsch to Zermatt road is a strip authored in station, offset and elevation. A switch node chooses its edge per view: in the left view a corridor node unrolls it onto the terrain along the road; in the right view the same strip is a straight sheet, with a vertical ×k whose value that view sets for itself.",
  point:
    "Structurally different routes per view, with every pixel's route still a tree. True values (station, offset, elevation) are the content's own; plan and drawn distances come through each view's route.",
  sources: [
    ROAD_CREDIT,
    {
      what: "Cesium World Terrain and Bing Maps Aerial",
      who: "Cesium ion (assets 1 and 2)",
      terms: "Under the ion terms; attributions are on the view.",
      href: "https://cesium.com/platform/cesium-ion/",
    },
  ],
  globe: true,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, world, view } = viewer;
    const ellipsoid = Ellipsoid.WGS84;

    // ------------------------------------------------ the site and the road
    const centre = { longitude: 7.765, latitude: 46.045 };
    const origin = positionOf(centre, 1600);
    const site = eastNorthUpFrame(
      "Road site (ENU)",
      host.itrf,
      ellipsoid,
      origin,
    );
    host.catalog.add(site);
    const matrix = site.toParent(viewer.clock.instant());
    const east = [matrix[0]!, matrix[1]!, matrix[2]!];
    const north = [matrix[4]!, matrix[5]!, matrix[6]!];
    const up = [matrix[8]!, matrix[9]!, matrix[10]!];
    const enuOf = (p: ArrayLike<number>) => {
      const d = [p[0]! - matrix[12]!, p[1]! - matrix[13]!, p[2]! - matrix[14]!];
      const dot = (a: number[]) =>
        d[0]! * a[0]! + d[1]! * a[1]! + d[2]! * a[2]!;
      return [dot(east), dot(north), dot(up)] as const;
    };
    const itrfOf = (x: number, y: number, z: number) =>
      Float64Array.of(
        matrix[12]! + x * east[0]! + y * north[0]! + z * up[0]!,
        matrix[13]! + x * east[1]! + y * north[1]! + z * up[1]!,
        matrix[14]! + x * east[2]! + y * north[2]! + z * up[2]!,
      );
    const plan = ROAD.map(([lon, lat]) => {
      const [x, y] = enuOf(positionOf({ longitude: lon, latitude: lat }, 1600));
      return [x, y] as const;
    });
    const corridorEdge = corridorUnroll({ polyline: plan });
    const total = corridorEdge.spec.params.se!;

    // --------------------------------------------------------- the nodes
    const corridor = liveEdge(corridorEdge, {
      description: "corridor unroll: station, offset, elevation to plan",
    });
    const translation = fromFunction(
      (p, params) => [
        p[0]! + params.tx!,
        p[1]! + params.ty!,
        p[2]! + params.tz!,
      ],
      {
        params: { tx: -total / 2, ty: 0, tz: SHEET_HEIGHT },
        description: "the strip as a straight sheet, floated above the site",
        inverse: (q, params) => [
          q[0]! - params.tx!,
          q[1]! - params.ty!,
          q[2]! - params.tz!,
        ],
        separable: ["tx", "ty", "tz"],
        identity: { tx: 0, ty: 0, tz: 0 },
      },
    );
    const right = (() => {
      viewer.split = true;
      host.scope.defer(() => {
        viewer.split = false;
      });
      return viewer.views.find((v) => v !== view) as View;
    })();
    const sheet = switchFrame("Corridor sheet (a choice per view)", site, {
      byView: new Map<View, SwitchChoice>([
        [view, corridor],
        [right, translation],
      ]),
    });
    host.catalog.add(sheet);
    const verticalScale = world.createPlacementParameter(0, { range: [0, 1] });
    const vertical = smoothFrame(
      "Vertical ×k (a value per view)",
      sheet,
      liveEdge(
        scaleAlongAxes({
          center: [0, 0, 0],
          factors: [1, 1, MAX_VERTICAL],
          axes: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        }),
        {
          description: "vertical exaggeration of the strip, an affine map",
          scale: verticalScale,
        },
      ),
    );
    host.catalog.add(vertical);
    // The strip in the corridor's plan, for readouts: the same strip coordinates, mapped by the corridor alone.
    const surveyed = smoothFrame(
      "Corridor as surveyed (readouts)",
      site,
      corridor,
    );
    host.catalog.add(surveyed);

    const scaleOf = (k: number) => (k - 1) / (MAX_VERTICAL - 1);
    view.setParameter(verticalScale, 0);
    right.setParameter(verticalScale, scaleOf(10));
    host.scope.defer(() => {
      view.setParameter(verticalScale, undefined);
      right.setParameter(verticalScale, undefined);
    });
    const anchor = anchorIn(host, "Corridor strip", vertical);

    host.describe({
      placements: [
        {
          label:
            "Ribbon, section and road line (authored as station, offset, elevation)",
          frame: vertical,
          kind: "content",
        },
        { label: "Camera, left view", frame: host.itrf, kind: "camera" },
        { label: "Camera, right view", frame: host.itrf, kind: "camera" },
      ],
      detail: (f) =>
        f === vertical
          ? `heights × a value per view: ${1 + view.parameterValue(verticalScale) * (MAX_VERTICAL - 1)} left, ${(1 + right.parameterValue(verticalScale) * (MAX_VERTICAL - 1)).toFixed(0)} right`
          : f === surveyed
            ? "for readouts: the same corridor edge, not drawn"
            : undefined,
    });

    // ------------------------------------------------------- the geometry
    const geodetic = (p: ArrayLike<number>) =>
      ellipsoid.cartesianToCartographic(
        Float64Array.of(p[0]!, p[1]!, p[2]!),
        cartographic(),
      )!;
    const out = new Float64Array(3);
    /** Terrain elevation above the site's tangent plane at strip point (s, o): the ground the globe has loaded. */
    let heightsKnown = 0;
    const elevation = (s: number, o: number): number => {
      corridorEdge.spec.forward([s, o, 0], corridorEdge.spec.params, out);
      const q = itrfOf(out[0]!, out[1]!, 0);
      const c = geodetic(q);
      const h = viewer.globe?.surfaceHeight(c.longitude, c.latitude);
      if (h === undefined) {
        return -100;
      }
      heightsKnown++;
      const t = ellipsoid.cartographicToCartesian(
        { longitude: c.longitude, latitude: c.latitude, height: h },
        new Float64Array(3),
      );
      return enuOf(t)[2];
    };

    let built: { mesh: MeshHandle; draw: DrawHandle }[] = [];
    let stationMarks: { s: number; low: number }[] = [];
    let signature = "";
    const removeBuilt = () => {
      if (world.destroyed) {
        return;
      }
      for (const b of built) {
        world.removeDraw(b.draw);
        world.removeMesh(b.mesh);
      }
      built = [];
    };
    host.scope.defer(removeBuilt);
    const build = () => {
      heightsKnown = 0;
      const n = Math.ceil(total / STEP);
      const rows: number[][] = [];
      const offsets: number[] = [];
      for (let o = -HALF_WIDTH; o <= HALF_WIDTH + 1e-6; o += HALF_WIDTH / 5) {
        offsets.push(o);
      }
      let low = Infinity;
      let high = -Infinity;
      for (let i = 0; i <= n; i++) {
        const s = Math.min(total, i * STEP);
        const row = offsets.map((o) => elevation(s, o));
        for (const u of row) {
          low = Math.min(low, u);
          high = Math.max(high, u);
        }
        rows.push(row);
      }
      const sig = `${heightsKnown}:${low.toFixed(0)}:${high.toFixed(0)}`;
      if (sig === signature) {
        return;
      }
      signature = sig;
      removeBuilt();
      const base = Math.floor((low - 120) / 100) * 100;
      const ribbon = new MeshBuilder();
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < offsets.length - 1; j++) {
          const p = (a: number, b: number): [number, number, number] => [
            Math.min(total, (i + a) * STEP),
            offsets[j + b]!,
            rows[i + a]![j + b]! + LIFT,
          ];
          const cell = (a: number, b: number) =>
            colorOf(rows[i + a]![j + b]!, low, high);
          const v = [
            ribbon.vertex(p(0, 0), [0, 0, 1], cell(0, 0)),
            ribbon.vertex(p(1, 0), [0, 0, 1], cell(1, 0)),
            ribbon.vertex(p(1, 1), [0, 0, 1], cell(1, 1)),
            ribbon.vertex(p(0, 1), [0, 0, 1], cell(0, 1)),
          ];
          ribbon.triangle(v[0]!, v[1]!, v[2]!);
          ribbon.triangle(v[0]!, v[2]!, v[3]!);
        }
      }
      const curtain = new MeshBuilder();
      const mid = offsets.indexOf(0);
      for (let i = 0; i < n; i++) {
        const s0 = Math.min(total, i * STEP);
        const s1 = Math.min(total, (i + 1) * STEP);
        const u0 = rows[i]![mid]!;
        const u1 = rows[i + 1]![mid]!;
        const top = hex("#9a8460");
        const bottom = hex("#3b3328");
        const a = curtain.vertex([s0, 0, u0], [0, -1, 0], top);
        const b = curtain.vertex([s1, 0, u1], [0, -1, 0], top);
        const c = curtain.vertex([s1, 0, base], [0, -1, 0], bottom);
        const d = curtain.vertex([s0, 0, base], [0, -1, 0], bottom);
        curtain.triangle(a, d, c);
        curtain.triangle(a, c, b);
      }
      const grid: Array<{
        points: ReadonlyArray<ArrayLike<number>>;
        color: Rgba;
      }> = [];
      const white = hex("#ffffff", 1);
      for (let z = base; z <= high + 1; z += 100) {
        grid.push({
          points: [
            [0, -0.5, z],
            [total, -0.5, z],
          ],
          color: white,
        });
      }
      for (let s = 0; s <= total; s += 500) {
        grid.push({
          points: [
            [s, -0.5, base],
            [s, -0.5, high + 20],
          ],
          color: white,
        });
      }
      const road = polylines([
        {
          points: Array.from({ length: n + 1 }, (_, i) => [
            Math.min(total, i * STEP),
            0,
            rows[i]![mid]! + LIFT + 0.5,
          ]),
          color: hex("#ffd21a"),
        },
      ]);
      const add = (mesh: ReturnType<MeshBuilder["build"]>, name: string) => {
        const handle = world.addMesh(mesh);
        const draw = world.addDraw({
          mesh: handle,
          parent: anchor,
          origin: new Float64Array(3),
          name,
          doubleSided: true,
          unlit: mesh.topology === "line-list",
          ground: false,
        });
        built.push({ mesh: handle, draw });
      };
      add(ribbon.build(), "Corridor ribbon");
      add(curtain.build(), "Ground section");
      add(polylines(grid), "Section grid");
      add(road, "Road centreline");
      stationMarks = [];
      for (let s = 0; s <= total; s += 1000) {
        stationMarks.push({ s, low: base });
      }
      labelStations();
      engine.requestRender();
    };

    // Station labels follow the strip's points in each view.
    const labels = [view, right].map((v) =>
      Array.from({ length: Math.floor(total / 1000) + 1 }, () => ({
        v,
        label: createPointLabel(host),
      })),
    );
    const perSet = Math.floor(total / 1000) + 1;
    const labelStations = () => {
      labels.flat().forEach(({ v, label }, k) => {
        const mark = stationMarks[k % perSet];
        if (!mark) {
          label.set(undefined);
          return;
        }
        label.set(
          { position: [mark.s, 0, mark.low], anchor, view: v },
          `${(mark.s / 1000).toFixed(0)}+000`,
        );
      });
    };

    // -------------------------------------------------------- the cameras
    const lookPlan = () => {
      view.camera.lookAt(itrfOf(0, 0, 0), 15 * deg, -38 * deg, 9_500);
      engine.requestRender();
    };
    const lookSheet = () => {
      right.camera.lookAt(itrfOf(0, 0, SHEET_HEIGHT), 0, -12 * deg, 12_000);
      engine.requestRender();
    };
    lookPlan();
    lookSheet();
    viewer.setSun(150, 40);

    // ------------------------------------------------------- readouts
    const tags = [
      el(
        "div",
        { className: "tgx-corner half-left bottom" },
        "Plan: the strip on the terrain",
      ),
      el(
        "div",
        { className: "tgx-corner half-right bottom" },
        "Profile: the strip as a sheet",
      ),
    ];
    host.overlay.append(...tags);
    const stationText = el("dd", {}, "–");
    const planText = el("dd", {}, "–");
    const drawnText = el("dd", {}, "–");
    const pickNote = el(
      "p",
      { className: "tgx-small" },
      "Click the ribbon, the section or the ground in either view.",
    );
    const lengths = {
      along: el("dd", {}, "–"),
      plan: el("dd", {}, "–"),
      drawn: el("dd", {}, "–"),
    };
    const readout = el(
      "dl",
      {},
      el("dt", {}, "Station, offset, elevation (the strip's own)"),
      stationText,
      el("dt", {}, "Plan: east, north, height above the ellipsoid"),
      planText,
      el("dt", {}, "As drawn in the view you clicked"),
      drawnText,
    );
    const measure = el(
      "dl",
      {},
      el("dt", {}, "Along the road (stations)"),
      lengths.along,
      el("dt", {}, "Straight line in plan (the survey)"),
      lengths.plan,
      el("dt", {}, "Straight line as drawn (one view)"),
      lengths.drawn,
    );
    const markers = [createMarker(host), createMarker(host)];
    const picks: Array<
      | {
          strip: Float64Array;
          itrf: Float64Array;
          drawn: Float64Array;
          view: View;
        }
      | undefined
    > = [undefined, undefined];
    const fillMeasure = () => {
      const [a, b] = picks;
      if (!a || !b) {
        lengths.along.textContent =
          lengths.plan.textContent =
          lengths.drawn.textContent =
            "set both ends";
        return;
      }
      lengths.along.textContent = length(Math.abs(b.strip[0]! - a.strip[0]!));
      lengths.plan.textContent = length(
        Math.hypot(
          b.itrf[0]! - a.itrf[0]!,
          b.itrf[1]! - a.itrf[1]!,
          b.itrf[2]! - a.itrf[2]!,
        ),
      );
      lengths.drawn.textContent =
        a.view === b.view
          ? length(
              Math.hypot(
                b.drawn[0]! - a.drawn[0]!,
                b.drawn[1]! - a.drawn[1]!,
                b.drawn[2]! - a.drawn[2]!,
              ),
            )
          : "the ends are in different views";
    };
    let last: (typeof picks)[number];
    const stopPicks = host.onPick(({ pick, view: v, frame }: ScenePick) => {
      if (frame !== vertical) {
        pickNote.textContent = `On “${frame?.name ?? "no node"}”, not the strip: pick the ribbon or the section.`;
        return;
      }
      const truth = host.queries.pickIn(pick, "true");
      const drawn = host.queries.pickIn(pick, "drawn");
      const inPlan = host.queries.pointIn(
        { frame: surveyed, position: truth.position },
        host.itrf,
      );
      const enu = enuOf(inPlan.position);
      const g = geodetic(inPlan.position);
      stationText.textContent = `${truth.position[0]!.toFixed(0)} m, ${truth.position[1]!.toFixed(1)} m, ${truth.position[2]!.toFixed(1)} m`;
      planText.textContent = `${enu[0].toFixed(0)} m, ${enu[1].toFixed(0)} m, ${g.height.toFixed(1)} m`;
      drawnText.textContent = `stretch ×${drawn.stretch[0].toFixed(2)} to ×${drawn.stretch[1].toFixed(2)} of the strip's own lengths`;
      pickNote.textContent = `On “${frame.name}” in the ${v === view ? "left" : "right"} view; ${truth.note}`;
      last = {
        strip: Float64Array.from(truth.position),
        itrf: Float64Array.from(inPlan.position),
        drawn: Float64Array.from(drawn.position),
        view: v,
      };
      for (const m of markers) {
        void m;
      }
      markers[v === view ? 0 : 1]!.set({
        position: truth.position,
        anchor,
        view: v,
      });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const vSlider = slider(
      "Profile vertical ×",
      { min: 1, max: MAX_VERTICAL, step: 1, value: 10, format: (k) => `×${k}` },
      (k) => {
        right.setParameter(verticalScale, scaleOf(k));
        host.graph.refresh();
        engine.requestRender();
      },
    );
    const setEnd = (i: 0 | 1) => () => {
      if (last) {
        picks[i] = last;
        fillMeasure();
      }
    };
    host.controls.append(
      vSlider.root,
      el(
        "div",
        { className: "buttons" },
        button("Plan view", lookPlan),
        button("Profile view", lookSheet),
        button("Set as start", setEnd(0)),
        button("Set as end", setEnd(1)),
      ),
    );
    host.readouts.append(readout, pickNote, measure);
    fillMeasure();

    // The terrain streams in as the camera looks: build again while it refines.
    build();
    const timer = setInterval(build, 1500);
    host.scope.defer(() => clearInterval(timer));
    whenDrawn(host, {
      terrainAt: {
        longitude: centre.longitude * deg,
        latitude: centre.latitude * deg,
      },
    });
  },
};
