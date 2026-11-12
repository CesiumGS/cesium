import { Ellipsoid, fromDegrees, vec3 } from "@cesium/next";
import { Frame, eastNorthUpFrame, smoothFrame } from "@cesium/next/frames";
import { velocityModel } from "../../../src/transforms/index.ts";
import {
  addMeshDraw,
  anchorIn,
  createDeformer,
  geodeticOf,
  stage,
} from "../content.ts";
import { F3_URL, loadF3, synthetic, type Section } from "../data/seismic.ts";
import { hex, MeshBuilder, polylines, type Rgba } from "../geometry.ts";
import { liveEdge } from "../liveEdge.ts";
import { createMarker } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { el, length, slider } from "../ui.ts";

const deg = Math.PI / 180;
const MAX = 10;
/** The velocity model, an assumption: v(z) = v0 + g z. */
const V0 = 1800;
const GRADIENT = 0.6;

/** Seismic polarity: negative blue, zero white, positive red. */
const colorOf = (a: number): Rgba => {
  const t = Math.max(-1, Math.min(1, a));
  const white = hex("#f4f4f4");
  const end = t < 0 ? hex("#1f4e9c") : hex("#b3261e");
  const k = Math.abs(t);
  return [
    white[0] + (end[0] - white[0]) * k,
    white[1] + (end[1] - white[1]) * k,
    white[2] + (end[2] - white[2]) * k,
    1,
  ];
};

export const seismic: Scene = {
  id: "seismic",
  number: 5,
  title: "Seismic time to depth",
  caption:
    "A seismic section recorded in two-way time hangs in a time node, under a velocity-model node that turns time into depth, under the vertical exaggeration. Horizons bend as the velocity changes; reflector picks report time and depth.",
  point:
    "Nested nodes: time to depth to the Earth, each a different kind of edge, and a pick's time uncertainty grows into a depth uncertainty through the same Jacobian. The velocity is an assumption, and the depth is only as good as it.",
  sources: [
    {
      what: "F3 Netherlands, dip-steered median-filtered subvolume (inline 330, 1.6 to 1.8 s)",
      who: "dGB Earth Sciences / TerraNubis, through Equinor's segyio-notebooks on GitHub",
      terms:
        "CC BY-SA. The page reads one inline with an HTTP Range request. A synthetic section stands in when that fails.",
      href: "https://github.com/equinor/segyio-notebooks",
    },
    {
      what: "Velocity model",
      who: "v(z) = 1800 m/s + 0.6 /s · z: an assumption for the North Sea's shallow section, with no well tie",
      terms: "Textbook-plausible, not measured here.",
    },
  ],
  globe: false,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, view } = viewer;
    stage(host);
    viewer.setSun(100, 45);

    host.loading("Reading one inline of the F3 block…");
    let section: Section;
    try {
      section = await loadF3(host.signal);
    } catch (error) {
      if (host.signal.aborted) {
        return;
      }
      host.note(
        `The F3 inline did not load (${host.scrub(error)}; ${F3_URL.split("/").pop()}): a synthetic section with a fault stands in.`,
      );
      section = synthetic();
    }
    host.loading(undefined);
    const { traces, samples, spacing, t0, dt } = section;
    const width = (traces - 1) * spacing;

    // --------------------------------------------------- the nested nodes
    const deformer = createDeformer(host, {
      max: MAX,
      ceiling: 12_000,
      start: 8,
      name: "Earth content (exaggerated)",
    });
    const origin = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(section.longitude, section.latitude, 0),
      vec3.vec3(),
    );
    const survey = eastNorthUpFrame(
      "Survey site (ENU)",
      deformer.frame,
      Ellipsoid.WGS84,
      origin,
    );
    host.catalog.add(survey);
    const az = section.azimuth * deg;
    const sa = Math.sin(az);
    const ca = Math.cos(az);
    // Section x along its azimuth, y to its right, and depth down: no reflection.
    const depth = Frame.constant(
      "Depth (m, down)",
      survey,
      [sa, ca, 0, 0, ca, -sa, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1],
      {
        accuracy: {
          byDefinition: true,
          note: "the section's placement, defined as an azimuth at the survey's origin",
        },
      },
    );
    host.catalog.add(depth);
    const velocity = liveEdge(velocityModel({ v0: V0, gradient: GRADIENT }), {
      description: "two-way time to depth for v(z) = v0 + g z",
    });
    const time = smoothFrame("Two-way time (s)", depth, velocity);
    host.catalog.add(time);
    const anchor = anchorIn(host, "Seismic section", time);

    host.describe({
      placements: [
        {
          label: `Seismic section (${section.kind === "real" ? "F3, inline 330" : "synthetic"}), authored in x and two-way time`,
          frame: time,
          kind: "content",
        },
        {
          label: "Camera (the viewer's rig)",
          frame: host.itrf,
          kind: "camera",
        },
      ],
      detail: (f) =>
        f === time
          ? `velocity v(z) = ${velocity.params.v0} + ${velocity.params.g} z`
          : f === deformer.frame
            ? `heights × ${deformer.factor.toFixed(1)}, depths too`
            : undefined,
    });

    // ------------------------------------------------------- the section
    let high = 0;
    {
      const sorted = Float32Array.from(section.data, Math.abs).sort();
      high = sorted[Math.floor(sorted.length * 0.98)]! || 1;
    }
    const image = new MeshBuilder();
    for (let i = 0; i < traces - 1; i++) {
      for (let j = 0; j < samples - 1; j++) {
        const at = (a: number, b: number) => {
          const p: [number, number, number] = [
            -width / 2 + (i + a) * spacing,
            0,
            t0 + (j + b) * dt,
          ];
          return image.vertex(
            p,
            [0, -1, 0],
            colorOf(section.data[(i + a) * samples + j + b]! / high),
          );
        };
        const v = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
        image.triangle(v[0]!, v[2]!, v[1]!);
        image.triangle(v[0]!, v[3]!, v[2]!);
      }
    }
    addMeshDraw(host, anchor, image.build(), {
      origin: new Float64Array(3),
      name: "Seismic section",
      doubleSided: true,
      unlit: true,
    });
    const tMin = t0;
    const tMax = t0 + (samples - 1) * dt;
    const lines: Array<{ points: number[][]; color: Rgba }> = [];
    const gridColor = hex("#555555");
    for (let t = Math.ceil(tMin / 0.1) * 0.1; t <= tMax + 1e-9; t += 0.1) {
      lines.push({
        points: [
          [-width / 2, -2, t],
          [width / 2, -2, t],
        ],
        color: gridColor,
      });
    }
    for (let x = -width / 2; x <= width / 2 + 1; x += 1000) {
      lines.push({
        points: [
          [x, -2, tMin],
          [x, -2, tMax],
        ],
        color: gridColor,
      });
    }
    const horizonColors = [
      "#e67e22",
      "#16a085",
      "#8e44ad",
      "#c0392b",
      "#2c3e50",
    ];
    section.horizons.forEach((times, h) => {
      lines.push({
        points: Array.from({ length: traces }, (_, i) => [
          -width / 2 + i * spacing,
          -4,
          times[i]!,
        ]),
        color: hex(horizonColors[h % horizonColors.length]!),
      });
    });
    addMeshDraw(host, anchor, polylines(lines), {
      origin: new Float64Array(3),
      name: "Grid and horizons",
      unlit: true,
      ground: false,
    });

    // ----------------------------------------------------------- camera
    const tMid = (tMin + tMax) / 2;
    const midDepth = host.queries.pointIn(
      { frame: time, position: [0, 0, tMid] },
      depth,
    ).position[2]!;
    const look = () => {
      const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
        origin,
        new Float64Array(3),
      )!;
      const target = Float64Array.from(origin, (o, i) => o - up[i]! * midDepth);
      view.camera.lookAt(
        deformer.drawn(target),
        (section.azimuth - 90) * deg,
        -6 * deg,
        Math.max(4_500, width * 0.95),
      );
      engine.requestRender();
    };
    look();

    // ------------------------------------------------------- readouts
    const out = {
      time: el("dd", {}, "–"),
      depth: el("dd", {}, "–"),
      sigma: el("dd", {}, "–"),
      drawn: el("dd", {}, "–"),
      where: el("dd", {}, "–"),
    };
    const note = el(
      "p",
      { className: "tgx-small" },
      "Click a reflector: its two-way time, its depth through the velocity model, and the depth's uncertainty from a one-sample (4 ms) time error.",
    );
    const readout = el(
      "dl",
      {},
      el("dt", {}, "Position along the section"),
      out.where,
      el("dt", {}, "Two-way time (the section's own)"),
      out.time,
      el("dt", {}, "Depth below the datum (true, through the model)"),
      out.depth,
      el("dt", {}, "σ of the depth from σ(time) = 4 ms"),
      out.sigma,
      el("dt", {}, "Depth as drawn (exaggerated)"),
      out.drawn,
    );
    const marker = createMarker(host);
    const stopPicks = host.onPick(({ pick, view: v, frame }: ScenePick) => {
      if (frame !== time) {
        note.textContent = `On “${frame?.name ?? "no node"}”: pick the section.`;
        return;
      }
      const truth = host.queries.pickIn(pick, "true");
      const drawn = host.queries.pickIn(pick, "drawn");
      const down = host.queries.pointIn(
        { frame: time, position: truth.position, sigma: [0, 0, 0.004] },
        depth,
        v,
      );
      out.where.textContent = `${(truth.position[0]! + width / 2).toFixed(0)} m from the start`;
      out.time.textContent = `${(truth.position[2]! * 1000).toFixed(0)} ms`;
      out.depth.textContent = length(down.position[2]!, 1);
      out.sigma.textContent = Number.isFinite(down.accuracy.meters)
        ? `±${down.accuracy.meters.toFixed(1)} m`
        : "not bounded";
      out.drawn.textContent = length(-geodeticOf(drawn.position).height, 1);
      note.textContent = `${truth.note}`;
      marker.set({ position: truth.position, anchor, view: v });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const apply = () => {
      host.graph.refresh();
      engine.requestRender();
    };
    const v0 = slider(
      "Surface velocity v0",
      {
        min: 1500,
        max: 3000,
        step: 50,
        value: V0,
        format: (v) => `${v} m/s`,
      },
      (v) => {
        velocity.setParams({ v0: v });
        apply();
      },
    );
    const g = slider(
      "Velocity gradient g",
      {
        min: 0.1,
        max: 1.2,
        step: 0.05,
        value: GRADIENT,
        format: (v) => `${v.toFixed(2)} /s`,
      },
      (v) => {
        velocity.setParams({ g: v });
        apply();
      },
    );
    const k = slider(
      "Vertical exaggeration ×",
      {
        min: 1,
        max: MAX,
        step: 0.5,
        value: deformer.factor,
        format: (v) => `×${v.toFixed(1)}`,
      },
      (v) => {
        deformer.factor = v;
        apply();
      },
    );
    host.controls.append(v0.root, g.root, k.root);
    host.readouts.append(readout, note);
  },
};
