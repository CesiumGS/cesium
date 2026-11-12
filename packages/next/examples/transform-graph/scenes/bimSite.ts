import { Ellipsoid, fromDegrees, type View, vec3 } from "@cesium/next";
import { Frame, smoothFrame } from "@cesium/next/frames";
import {
  geographicToGeocentric,
  utm,
} from "../../../src/georeference/index.ts";
import {
  addMeshDraw,
  addOsmBuildings,
  anchorIn,
  bindEarth,
  createDeformer,
  geodeticOf,
} from "../content.ts";
import { hex, MeshBuilder, polylines, type Rgba } from "../geometry.ts";
import { liveEdge } from "../liveEdge.ts";
import { utmToGeographic } from "../utmInverse.ts";
import { whenDrawn } from "../loading.ts";
import { createMarker } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { button, el, length, slider } from "../ui.ts";

const deg = Math.PI / 180;
const MAX = 10;
/** Tanjung Priok, Jakarta's port: where the site's grid origin is. */
const ORIGIN = { longitude: 106.889, latitude: -6.103 };

/** A port site authored in grid metres (x east, y north, z up from its datum): a quay, sheds, container stacks and cranes. */
function siteMesh() {
  const b = new MeshBuilder();
  const concrete = hex("#8c8f93");
  const ground = hex("#5f6a5a");
  // Apron and yard, 1.4 km along the quay.
  b.box([-700, -240, -2], [700, 0, 0.5], ground);
  b.box([-700, 0, -2], [700, 55, 3], concrete);
  // Sheds behind the yard.
  const roofs = ["#b9b2a3", "#a8b4bd", "#c4ae99", "#9fb0a4"];
  for (let i = 0; i < 4; i++) {
    b.box(
      [-640 + i * 330, -230, 0],
      [-640 + i * 330 + 260, -150, 16 + (i % 2) * 4],
      hex(roofs[i]!),
    );
  }
  // Container stacks in rows.
  const boxes = [
    "#c0392b",
    "#2e86c1",
    "#d4ac0d",
    "#27ae60",
    "#7f8c8d",
    "#e67e22",
  ];
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 18; k++) {
      const x = -620 + k * 70 + (row % 2) * 12;
      const h = 2.6 * (1 + ((k * 7 + row * 3) % 4));
      b.box(
        [x, -120 + row * 34, 3],
        [x + 60, -92 + row * 34, 3 + h],
        hex(boxes[(k + row) % boxes.length]!),
      );
    }
  }
  // Ship-to-shore cranes on the quay edge: legs, a girder, a boom out over the water.
  const steel = hex("#d9d2c1");
  for (const x of [-420, -100, 260]) {
    for (const dx of [0, 24]) {
      for (const dy of [34, 54]) {
        b.box([x + dx - 1.2, dy - 1.2, 3], [x + dx + 1.2, dy + 1.2, 38], steel);
      }
    }
    b.box([x - 2, 32, 38], [x + 28, 56, 41], steel);
    b.box([x + 8, 56, 36], [x + 14, 110, 39], hex("#e0592b"));
    b.box([x + 8, 20, 38], [x + 14, 36, 41], hex("#e0592b"));
  }
  return b.build();
}

/** The site's grid, one line every 100 m, as the CRS draws it. */
function gridLines() {
  const lines: Array<{ points: number[][]; color: Rgba }> = [];
  const color = hex("#4da3ff");
  for (let x = -700; x <= 700; x += 100) {
    lines.push({
      points: [
        [x, -250, 6],
        [x, 130, 6],
      ],
      color,
    });
  }
  for (let y = -250; y <= 130; y += 100) {
    lines.push({
      points: [
        [-700, y, 6],
        [700, y, 6],
      ],
      color,
    });
  }
  return polylines(lines);
}

export const bimSite: Scene = {
  id: "bim-site",
  number: 3,
  title: "A BIM site in a projected CRS",
  caption:
    "A port site authored in UTM 48S grid metres at Tanjung Priok, nested under the exaggeration: grid, then geographic, then geocentric, then the node that scales heights. Pick two points: the grid distance, the true ground distance and the drawn distance differ.",
  point:
    "Nesting is just parenting: the CRS node sits under the deformer, so the site is exaggerated with the terrain it stands on, and a measurement in any node is the same route read at that node.",
  sources: [
    {
      what: "The port site",
      who: "Synthetic buildings, cranes and container stacks generated for this page, authored in UTM 48S grid metres at Tanjung Priok",
      terms:
        "No data. The design-globe's generated Jakarta tileset (EPSG:9488) could not be placed under a node: see the report.",
    },
    {
      what: "Cesium World Terrain, Bing Maps Aerial, Cesium OSM Buildings",
      who: "Cesium ion (assets 1, 2 and 96188); © OpenStreetMap contributors",
      terms: "Under the ion terms; OSM is ODbL.",
      href: "https://cesium.com/platform/cesium-ion/",
    },
  ],
  globe: true,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, view } = viewer;
    const deformer = createDeformer(host, {
      max: MAX,
      ceiling: 12_000,
      start: 3,
    });
    const earth = bindEarth(host, deformer.frame);
    viewer.setSun(70, 35);

    // ----------------------------------------------- the nested nodes
    const toUtm = utm({ zone: 48, hemisphere: "south" });
    const corner = new Float64Array(3);
    toUtm.spec.forward(
      [ORIGIN.longitude, ORIGIN.latitude, 0],
      toUtm.spec.params,
      corner,
    );
    const geographic = smoothFrame(
      "Geographic to geocentric",
      deformer.frame,
      liveEdge(geographicToGeocentric(), {
        description: "longitude, latitude, height to body-fixed metres",
      }),
    );
    host.catalog.add(geographic);
    const utmFrame = smoothFrame(
      "UTM 48S (grid E, N, height)",
      geographic,
      liveEdge(utmToGeographic({ zone: 48, hemisphere: "south" }), {
        description:
          "transverse Mercator, central meridian 105°E, scale 0.9996, run from the grid to geographic",
        differences: 0.5,
      }),
    );
    host.catalog.add(utmFrame);
    const grid = Frame.constant(
      "Site grid",
      utmFrame,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, corner[0]!, corner[1]!, 3, 1],
      {
        accuracy: {
          byDefinition: true,
          note: "the site's own datum, defined as a grid offset",
        },
      },
    );
    host.catalog.add(grid);
    const anchor = anchorIn(host, "Port site", grid);
    addMeshDraw(host, anchor, siteMesh(), {
      origin: new Float64Array(3),
      name: "Port site",
      doubleSided: true,
    });
    addMeshDraw(host, anchor, gridLines(), {
      origin: new Float64Array(3),
      name: "Site grid",
      unlit: true,
      ground: false,
    });

    host.describe({
      placements: [
        {
          label: "Terrain, Cesium OSM Buildings",
          frame: deformer.frame,
          kind: "content",
        },
        {
          label: "Port site (buildings, cranes, grid lines)",
          frame: grid,
          kind: "content",
        },
        {
          label: "Camera (the viewer's rig)",
          frame: host.itrf,
          kind: "camera",
        },
      ],
      detail: (f) =>
        f === deformer.frame
          ? `heights × ${deformer.factor.toFixed(1)}`
          : f === grid
            ? `the grid's offset: E ${corner[0]!.toFixed(0)}, N ${corner[1]!.toFixed(0)}`
            : undefined,
    });

    // ------------------------------------------------------ the camera
    const centre = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(ORIGIN.longitude, ORIGIN.latitude, 3),
      vec3.vec3(),
    );
    const shot = () => {
      view.camera.lookAt(deformer.drawn(centre), 200 * deg, -26 * deg, 1_150);
      engine.requestRender();
    };
    shot();

    // ------------------------------------------------------- readouts
    const gridText = el("dd", {}, "–");
    const lonlatText = el("dd", {}, "–");
    const heightText = el("dd", {}, "–");
    const note = el(
      "p",
      { className: "tgx-small" },
      "Click a building, a crane, the quay or the ground.",
    );
    const lengths = {
      grid: el("dd", {}, "–"),
      ground: el("dd", {}, "–"),
      drawn: el("dd", {}, "–"),
      factor: el("dd", {}, "–"),
    };
    const readout = el(
      "dl",
      {},
      el("dt", {}, "Site grid (x, y, z), the content's own"),
      gridText,
      el("dt", {}, "UTM 48S easting, northing"),
      lonlatText,
      el("dt", {}, "Height above the ellipsoid: true | drawn"),
      heightText,
    );
    const measure = el(
      "dl",
      {},
      el("dt", {}, "Grid distance (E, N)"),
      lengths.grid,
      el("dt", {}, "Ground distance (true metres, below the deformer)"),
      lengths.ground,
      el("dt", {}, "Drawn distance (ITRF, as the view sees it)"),
      lengths.drawn,
      el("dt", {}, "Grid over ground"),
      lengths.factor,
    );
    type End = { grid: Float64Array; view: View };
    const ends: [End | undefined, End | undefined] = [undefined, undefined];
    let last: End | undefined;
    const markers = [createMarker(host), createMarker(host)];
    const fillMeasure = () => {
      const [a, b] = ends;
      if (!a || !b) {
        lengths.grid.textContent =
          lengths.ground.textContent =
          lengths.drawn.textContent =
          lengths.factor.textContent =
            "set both ends";
        return;
      }
      const at = (e: End, frame: Frame) =>
        host.queries.pointIn({ frame: grid, position: e.grid }, frame, e.view)
          .position;
      const ua = at(a, utmFrame);
      const ub = at(b, utmFrame);
      const ta = at(a, deformer.frame);
      const tb = at(b, deformer.frame);
      const da = at(a, host.itrf);
      const db = at(b, host.itrf);
      const chord = (p: Float64Array, q: Float64Array) =>
        Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!);
      const gridDistance = Math.hypot(ub[0]! - ua[0]!, ub[1]! - ua[1]!);
      const ground = chord(ta, tb);
      lengths.grid.textContent = length(gridDistance, 3);
      lengths.ground.textContent = length(ground, 3);
      lengths.drawn.textContent = length(chord(da, db), 3);
      lengths.factor.textContent = `${(gridDistance / ground).toFixed(6)} (UTM's 0.9996 at the central meridian, 1.0004 at the zone's edge)`;
    };
    const stopPicks = host.onPick(({ pick, view: v, frame }: ScenePick) => {
      if (frame !== grid) {
        note.textContent = `On “${frame?.name ?? "no node"}”: pick the site to read its grid.`;
        return;
      }
      const truth = host.queries.pickIn(pick, "true");
      const inUtm = host.queries.pointIn(
        { frame: grid, position: truth.position },
        utmFrame,
        v,
      );
      const trueGeo = host.queries.pointIn(
        { frame: grid, position: truth.position },
        deformer.frame,
        v,
      );
      const drawn = host.queries.pickIn(pick, "drawn");
      gridText.textContent = `${truth.position[0]!.toFixed(1)}, ${truth.position[1]!.toFixed(1)}, ${truth.position[2]!.toFixed(1)} m`;
      lonlatText.textContent = `${inUtm.position[0]!.toFixed(1)} E, ${inUtm.position[1]!.toFixed(1)} N`;
      heightText.textContent = `${geodeticOf(trueGeo.position).height.toFixed(1)} m | ${geodeticOf(drawn.position).height.toFixed(1)} m`;
      note.textContent = `On “${frame.name}”; ${truth.note}`;
      last = { grid: Float64Array.from(truth.position), view: v };
      markers[0]!.set({
        position: truth.position,
        anchor: pick.anchor ?? earth,
        view: v,
      });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const k = slider(
      "Heights ×",
      {
        min: 1,
        max: MAX,
        step: 0.1,
        value: deformer.factor,
        format: (v) => `×${v.toFixed(1)}`,
      },
      (v) => {
        deformer.factor = v;
        host.graph.refresh();
        fillMeasure();
        engine.requestRender();
      },
    );
    const setEnd = (i: 0 | 1) => () => {
      if (last) {
        ends[i] = last;
        markers[i]!.set({ position: last.grid, anchor, view: last.view });
        fillMeasure();
      }
    };
    host.controls.append(
      k.root,
      el(
        "div",
        { className: "buttons" },
        button("The site", shot),
        button("Set as start", setEnd(0)),
        button("Set as end", setEnd(1)),
      ),
    );
    host.readouts.append(readout, note, measure);
    fillMeasure();

    const buildings = addOsmBuildings(host);
    whenDrawn(host, {
      terrainAt: {
        longitude: ORIGIN.longitude * deg,
        latitude: ORIGIN.latitude * deg,
      },
      tilesets: [{ name: "Cesium OSM Buildings", tileset: buildings }],
    });
  },
};
