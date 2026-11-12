import { Ellipsoid, bump, fromDegrees, liveEdge, vec3 } from "@cesium/next";
import { smoothFrame } from "@cesium/next/frames";
import { addOsmBuildings, bindEarth, geodeticOf } from "../content.ts";
import { whenDrawn } from "../loading.ts";
import { createMarker } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { button, checkbox, el, length, slider, trueDrawnTable } from "../ui.ts";

const deg = Math.PI / 180;
/** The synthetic rate at the bowl's centre, m a year: the order of Jakarta's reported 10 to 25 cm a year. */
const RATE = 0.15;
/** The longest time the slider reaches, years. */
const YEARS = 10;
/** The strongest exaggeration of the subsidence the slider reaches. */
const MAX = 300;
/** The bowl's centre, near Muara Baru on Jakarta's north coast, and its width (σ), m. */
const CENTRE = { longitude: 106.79, latitude: -6.11 };
const SIGMA = 2_500;

export const subsidence: Scene = {
  id: "subsidence",
  number: 8,
  title: "Time-varying subsidence",
  caption:
    "A synthetic subsidence bowl over Jakarta: one smooth node (a Gaussian bump, lifting down) over the Earth's content, its amplitude moving with time. Terrain and OSM Buildings sink together; play it, or drag the time and the exaggeration.",
  point:
    "A parameter that varies with time is one float of the node, so the whole city moves with no refit; true and drawn subsidence at a pick differ by exactly the exaggeration. The field is synthetic, not InSAR.",
  sources: [
    {
      what: "Cesium World Terrain, Bing Maps Aerial, Cesium OSM Buildings",
      who: "Cesium ion (assets 1, 2 and 96188); © OpenStreetMap contributors",
      terms: "Under the ion terms; OSM is ODbL.",
      href: "https://cesium.com/platform/cesium-ion/",
    },
    {
      what: "Subsidence field",
      who: "Synthetic: one Gaussian bowl, 2.5 km wide (σ), at Muara Baru, 15 cm a year at its centre",
      terms:
        "Made up for this page; the rate is of the order reported for north Jakarta (Abidin et al. 2011, Natural Hazards 59; Chaussard et al. 2013, Remote Sensing of Environment 128), not read from their data.",
    },
  ],
  globe: true,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, world, view } = viewer;
    const centre = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(CENTRE.longitude, CENTRE.latitude, 0),
      vec3.vec3(),
    );
    const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
      centre,
      new Float64Array(3),
    )!;
    // The one float of the node: time over the longest time, times the exaggeration over its largest.
    const scale = world.createPlacementParameter(0, { range: [0, 1] });
    const bowl = bump({
      center: centre,
      direction: up,
      amplitude: -RATE * YEARS * MAX,
      sigma: SIGMA,
    });
    const edge = liveEdge(bowl, {
      description: "a Gaussian bowl along up, its depth moving with time",
      scale,
      identity: { amplitude: 0 },
    });
    const frame = smoothFrame("Earth content (subsiding)", host.itrf, edge);
    host.catalog.add(frame);
    const earth = bindEarth(host, frame);

    const state = { years: 10, factor: 300, playing: false, loop: true };
    const apply = () => {
      scale.value = (state.years / YEARS) * (state.factor / MAX);
      engine.requestRender();
    };
    apply();

    viewer.setSun(60, 35);
    const target = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(106.79, -6.11, 0),
      vec3.vec3(),
    );
    const shot = () => {
      view.camera.lookAt(target, 200 * deg, -18 * deg, 9_000);
      engine.requestRender();
    };
    shot();

    host.describe({
      placements: [
        {
          label: "Terrain, Cesium OSM Buildings",
          frame,
          kind: "content",
        },
        {
          label: "Camera (the viewer's rig)",
          frame: host.itrf,
          kind: "camera",
        },
      ],
      detail: (f) =>
        f === frame
          ? `bump along up, centre Muara Baru, σ ${SIGMA / 1000} km, amplitude × ${scale.value.toFixed(3)} of ${(RATE * YEARS * MAX).toFixed(0)} m`
          : undefined,
    });

    // ------------------------------------------------------- readouts
    const table = trueDrawnTable([
      "Subsidence here",
      "Peak, at the bowl's centre",
    ]);
    const note = el(
      "p",
      { className: "tgx-small" },
      "Click the ground or a building: its true subsidence, and what is drawn.",
    );
    const marker = createMarker(host);
    const subsidenceAt = (p: ArrayLike<number>, years: number): number => {
      const q = new Float64Array(3);
      bowl.spec.forward(p, { ...edge.params, amplitude: -RATE * years }, q);
      return (
        (q[0]! - p[0]!) * up[0]! +
        (q[1]! - p[1]!) * up[1]! +
        (q[2]! - p[2]!) * up[2]!
      );
    };
    let picked: { position: Float64Array } | undefined;
    const fill = () => {
      host.graph.refresh();
      const peakTrue = -RATE * state.years;
      table.set(
        "Peak, at the bowl's centre",
        length(peakTrue, 2),
        length(peakTrue * state.factor, 1),
      );
      if (picked) {
        const t = subsidenceAt(picked.position, state.years);
        table.set("Subsidence here", length(t, 3), length(t * state.factor, 2));
      } else {
        table.set("Subsidence here", "–", "–");
      }
    };
    fill();
    const stopPicks = host.onPick(({ pick, view: v, frame: f }: ScenePick) => {
      const truth = host.queries.pickIn(pick, "true");
      const drawn = host.queries.pickIn(pick, "drawn");
      picked = truth;
      fill();
      const dz =
        (drawn.position[0]! - truth.position[0]!) * up[0]! +
        (drawn.position[1]! - truth.position[1]!) * up[1]! +
        (drawn.position[2]! - truth.position[2]!) * up[2]!;
      note.textContent = `On “${f?.name ?? "no node"}” at ${geodeticOf(truth.position).height.toFixed(1)} m: the graph carries it ${length(dz, 2)} along up (drawn); ${truth.note}`;
      marker.set({
        position: truth.position,
        anchor: pick.anchor ?? earth,
        view: v,
      });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const timeSlider = slider(
      "Time",
      {
        min: 0,
        max: YEARS,
        step: 0.05,
        value: state.years,
        format: (v) => `${v.toFixed(1)} years`,
      },
      (v) => {
        state.years = v;
        apply();
        fill();
      },
    );
    const factorSlider = slider(
      "Exaggeration of the subsidence ×",
      {
        min: 1,
        max: MAX,
        step: 1,
        value: state.factor,
        format: (v) => `×${v}`,
      },
      (v) => {
        state.factor = v;
        apply();
        fill();
      },
    );
    const play = button("Play", () => {
      state.playing = !state.playing;
      play.textContent = state.playing ? "Pause" : "Play";
      if (state.playing && state.years >= YEARS) {
        state.years = 0;
      }
    });
    const loop = checkbox("Loop", true, (on) => {
      state.loop = on;
    });
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (state.playing) {
        // Ten years in ten seconds.
        state.years += dt;
        if (state.years >= YEARS) {
          state.years = state.loop ? 0 : YEARS;
          if (!state.loop) {
            state.playing = false;
            play.textContent = "Play";
          }
        }
        timeSlider.set(state.years);
        apply();
        fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    host.scope.defer(() => cancelAnimationFrame(raf));
    host.controls.append(
      el("div", { className: "buttons" }, play, loop.root),
      timeSlider.root,
      factorSlider.root,
      el("div", { className: "buttons" }, button("The city", shot)),
    );
    host.readouts.append(
      el(
        "p",
        { className: "tgx-small" },
        `Synthetic field: ${RATE * 100} cm a year at the centre, ${SIGMA / 1000} km wide (σ). Not InSAR.`,
      ),
      table.root,
      note,
    );

    const buildings = addOsmBuildings(host);
    whenDrawn(host, {
      terrainAt: {
        longitude: CENTRE.longitude * deg,
        latitude: CENTRE.latitude * deg,
      },
      tilesets: [{ name: "Cesium OSM Buildings", tileset: buildings }],
    });
  },
};
