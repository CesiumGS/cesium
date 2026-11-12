import {
  Ellipsoid,
  fromDegrees,
  mat4,
  vec3,
  type BrepForm,
} from "@cesium/next";
import { Frame, eastNorthUpFrame } from "@cesium/next/frames";
import { KernelClient } from "../../../src/brep/kernelClient.ts";
import type { FormBounds } from "../../../src/brep/formBounds.ts";
import { anchorIn, geodeticOf, stage } from "../content.ts";
import { hex, type Rgba } from "../geometry.ts";
import { createMarker } from "../markers.ts";
import type { Scene, SceneHost, ScenePick } from "../scene.ts";
import { button, el, length, slider } from "../ui.ts";

const AS1_URL =
  "https://raw.githubusercontent.com/tpaviot/pythonocc-demos/master/assets/models/as1-oc-214.stp";
/** NIST's parts, served by the dev server from the setup store. */
const NIST = [
  "nist_ftc_06_asme1_rd.stp",
  "nist_ftc_10_asme1_rb.stp",
  "nist_ctc_05_asme1_rd.stp",
  "nist_ftc_11_asme1_rb.stp",
];
const SITE = { longitude: 7.7491, latitude: 46.0207 };
const COLORS = [
  "#d9534f",
  "#4c8bf5",
  "#e9b949",
  "#4caf7a",
  "#9b6bd4",
  "#e0803a",
];

interface Part {
  readonly name: string;
  readonly form: BrepForm;
  /** The draw's model: scale and placement into the assembly's units. */
  readonly model: Float64Array;
  /** Where the part sits at rest, from the assembly's centre, in those units. */
  readonly centre: readonly [number, number, number];
  /** Scale of the model: the file's metres to the assembly's units. */
  readonly scale: number;
}

interface Loaded {
  readonly parts: Part[];
  readonly source: "AS1" | "NIST";
}

const isStep = (bytes: Uint8Array) =>
  new TextDecoder().decode(bytes.subarray(0, 12)) === "ISO-10303-21";

async function fetchStep(
  url: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!isStep(bytes)) {
    throw new Error("not a STEP file");
  }
  return bytes;
}

const extent = (b: FormBounds) =>
  Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
const middle = (b: FormBounds): [number, number, number] => [
  (b.min[0] + b.max[0]) / 2,
  (b.min[1] + b.max[1]) / 2,
  (b.min[2] + b.max[2]) / 2,
];

/** A model matrix: uniform scale `s`, then a translation. */
function modelOf(
  s: number,
  at: readonly [number, number, number],
): Float64Array {
  const m = mat4.fromScale(mat4.mat4(), s, s, s);
  m[12] = at[0];
  m[13] = at[1];
  m[14] = at[2];
  return m;
}

async function load(
  client: KernelClient,
  host: SceneHost,
): Promise<{ loaded?: Loaded; note?: string }> {
  try {
    host.loading("Fetching the AS1 assembly…");
    const bytes = await fetchStep(AS1_URL, host.signal);
    host.loading("Importing the assembly with Open CASCADE…");
    const imported = await client.importStep(bytes, {});
    const boxes = imported.forms.map((f) => f.bounds);
    const union: FormBounds = {
      min: [0, 1, 2].map((k) =>
        Math.min(...boxes.map((b) => b.min[k]!)),
      ) as unknown as FormBounds["min"],
      max: [0, 1, 2].map((k) =>
        Math.max(...boxes.map((b) => b.max[k]!)),
      ) as unknown as FormBounds["max"],
    };
    const s = 1.4 / extent(union);
    const c = middle(union);
    const parts = imported.forms.map((f, i): Part => {
      const m = middle(f.bounds);
      return {
        name: `AS1 part ${i + 1}`,
        form: f.form,
        scale: s,
        model: modelOf(s, [-s * c[0], -s * c[1], -s * c[2]]),
        centre: [s * (m[0] - c[0]), s * (m[1] - c[1]), s * (m[2] - c[2])],
      };
    });
    return { loaded: { parts, source: "AS1" } };
  } catch (error) {
    if (host.signal.aborted) {
      return {};
    }
    const why = host.scrub(error);
    try {
      host.loading("Importing NIST's parts instead…");
      const parts: Part[] = [];
      for (let i = 0; i < NIST.length; i++) {
        const bytes = await fetchStep(`/step-samples/${NIST[i]}`, host.signal);
        const imported = await client.importStep(bytes, {});
        const f = imported.forms[0]!;
        const s = 0.5 / extent(f.bounds);
        const m = middle(f.bounds);
        const x = (i - (NIST.length - 1) / 2) * 0.6;
        parts.push({
          name: NIST[i]!.replace(/^nist_|_asme1.*$/g, "").toUpperCase(),
          form: f.form,
          scale: s,
          model: modelOf(s, [x - s * m[0], -s * m[1], -s * m[2]]),
          centre: [x, 0, 0],
        });
      }
      return {
        loaded: { parts, source: "NIST" },
        note: `The AS1 assembly did not load (${why}): four NIST parts, scaled to half a metre and set in a row, stand in. They are an arrangement, not an assembly: nothing mates.`,
      };
    } catch (second) {
      return {
        note: `Neither the AS1 assembly (${why}) nor NIST's parts (${host.scrub(second)}) loaded; the parts need the dev server and \`npm run setup\`.`,
      };
    }
  }
}

export const assembly: Scene = {
  id: "assembly",
  number: 6,
  title: "Exploded assembly",
  caption:
    "Each part of a STEP assembly sits under its own affine node, an offset along its direction from the assembly's centre times t. Every route is affine, so each collapses to one matrix; picks and measurements map back through it.",
  point:
    "The true distance between two points is the same route read with the explode nodes at rest: in each part's own coordinates. The distance in the Assembly node is what is drawn, and it moves with t.",
  sources: [
    {
      what: "AS1 assembly (plate, brackets, bolts, nuts, rods)",
      who: "CAx-IF's public AS1 test model, as distributed in pythonocc-demos; read at run time, not bundled",
      terms:
        "Licence not stated by the repository: confirm before shipping. If it can't be read, NIST's parts stand in.",
      href: "https://github.com/tpaviot/pythonocc-demos",
    },
    {
      what: "NIST PMI test parts (the stand-in)",
      who: "NIST, as served from the setup store",
      terms: "NIST's open licence (public domain).",
      href: "https://www.nist.gov/ctl/smart-connected-systems-division/smart-connected-manufacturing-systems-group/mbe-pmi-validation",
    },
  ],
  globe: false,
  async start(host: SceneHost) {
    const { viewer } = host;
    const { engine, world, view } = viewer;
    stage(host);
    viewer.setSun(40, 50);
    const client = new KernelClient();
    host.scope.defer(() => client.dispose());
    const { loaded, note } = await load(client, host);
    host.loading(undefined);
    if (note) {
      host.note(note);
    }
    if (!loaded || host.signal.aborted) {
      return;
    }
    const { parts } = loaded;

    // ----------------------------------------------------------- nodes
    const origin = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(SITE.longitude, SITE.latitude, 1800),
      vec3.vec3(),
    );
    const site = eastNorthUpFrame(
      "Assembly (at rest)",
      host.itrf,
      Ellipsoid.WGS84,
      origin,
    );
    host.catalog.add(site);
    const state = { t: 0.6 };
    const spread = 1.2;
    const exact = {
      byDefinition: true as const,
      note: "an offset the application sets: the node is defined by it",
    };
    const frames: Frame[] = parts.map((p, i) => {
      const lift =
        Math.hypot(...p.centre) < 1e-3 ? [0, 0, 0.25 * (i + 1)] : p.centre;
      const frame = new Frame(
        `Explode: ${p.name}`,
        site,
        (_instant, out) => {
          mat4.identity(out);
          out[12] = state.t * spread * lift[0]!;
          out[13] = state.t * spread * lift[1]!;
          out[14] = state.t * spread * lift[2]!;
        },
        { cache: false, accuracy: exact },
      );
      host.catalog.add(frame);
      return frame;
    });
    const anchors = parts.map((p, i) => {
      const anchor = anchorIn(host, p.name, frames[i]!);
      const brep = world.addBrep(p.form, {
        parent: anchor,
        origin: new Float64Array(3),
        model: p.model,
        color: hex(COLORS[i % COLORS.length]!) as Rgba as unknown as [
          number,
          number,
          number,
          number,
        ],
        doubleSided: true,
        name: p.name,
      });
      host.scope.defer(() => {
        if (!world.destroyed) {
          world.removeBrep(brep);
        }
      });
      return anchor;
    });

    host.describe({
      placements: [
        ...parts.map((p, i) => ({
          label: p.name,
          frame: frames[i]!,
          kind: "content" as const,
        })),
        {
          label: "Camera (the viewer's rig)",
          frame: host.itrf,
          kind: "camera" as const,
        },
      ],
      detail: (f) =>
        frames.includes(f)
          ? `translate by ${(state.t * spread).toFixed(2)} × the part's offset from the centre`
          : undefined,
    });

    // ------------------------------------------------------------ camera
    const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
      origin,
      new Float64Array(3),
    )!;
    const target = Float64Array.from(origin, (o, i) => o + up[i]! * 0.2);
    const shot = () => {
      view.camera.lookAt(
        target,
        30 * (Math.PI / 180),
        -22 * (Math.PI / 180),
        3.4,
      );
      view.camera.near = 0.05;
      engine.requestRender();
    };
    shot();

    // ------------------------------------------------------- readouts
    const where = el("dd", {}, "–");
    const rest = el("dd", {}, "–");
    const placed = el("dd", {}, "–");
    const note2 = el(
      "p",
      { className: "tgx-small" },
      "Click a part. Its own coordinates are the assembled ones; the Assembly node sees it moved by t.",
    );
    const lengths = {
      true: el("dd", {}, "–"),
      assembly: el("dd", {}, "–"),
      drawn: el("dd", {}, "–"),
    };
    const mm = (m: number) => length(m, 1);
    type End = {
      frame: Frame;
      local: Float64Array;
      scale: number;
      drawn: Float64Array;
      view: typeof view;
    };
    const ends: [End | undefined, End | undefined] = [undefined, undefined];
    let last: End | undefined;
    const markers = [createMarker(host), createMarker(host)];
    const fill = () => {
      host.graph.refresh();
      const [a, b] = ends;
      if (!a || !b) {
        lengths.true.textContent =
          lengths.assembly.textContent =
          lengths.drawn.textContent =
            "set both ends";
        return;
      }
      const inAssembly = host.queries.measure(
        [a, b].map((e) => ({ frame: e.frame, position: e.local })),
        site,
        a.view,
      );
      // At rest each part's own coordinates are the assembled ones, in the assembly's units.
      lengths.true.textContent = mm(
        Math.hypot(
          b.local[0]! - a.local[0]!,
          b.local[1]! - a.local[1]!,
          b.local[2]! - a.local[2]!,
        ),
      );
      lengths.assembly.textContent = mm(inAssembly.distance);
      lengths.drawn.textContent =
        a.view === b.view
          ? mm(
              Math.hypot(
                b.drawn[0]! - a.drawn[0]!,
                b.drawn[1]! - a.drawn[1]!,
                b.drawn[2]! - a.drawn[2]!,
              ),
            )
          : "–";
    };
    const stopPicks = host.onPick(({ pick, view: v, frame }: ScenePick) => {
      const i = frame ? frames.indexOf(frame) : -1;
      if (i < 0) {
        note2.textContent = `On “${frame?.name ?? "no node"}”: pick a part.`;
        return;
      }
      const truth = host.queries.pickIn(pick, "true");
      const inSite = host.queries.pickIn(pick, frames[i]!.parent!);
      const drawn = host.queries.pickIn(pick, "drawn");
      where.textContent = parts[i]!.name;
      rest.textContent = `${Array.from(truth.position, (x) => x.toFixed(3)).join(", ")} m`;
      placed.textContent = `${Array.from(inSite.position, (x) => x.toFixed(3)).join(", ")} m`;
      note2.textContent = `${geodeticOf(drawn.position).height.toFixed(2)} m above the ellipsoid as drawn; ${truth.note}`;
      last = {
        frame: frames[i]!,
        local: Float64Array.from(truth.position),
        scale: parts[i]!.scale,
        drawn: Float64Array.from(drawn.position),
        view: v,
      };
      markers[0]!.set({
        position: truth.position,
        anchor: anchors[i]!,
        view: v,
      });
    });
    host.scope.defer(stopPicks);

    // ------------------------------------------------------- controls
    const explode = slider(
      "Explode t",
      {
        min: 0,
        max: 1.5,
        step: 0.01,
        value: state.t,
        format: (v) => v.toFixed(2),
      },
      (v) => {
        state.t = v;
        for (const f of frames) {
          f.invalidate();
        }
        fill();
        engine.requestRender();
      },
    );
    const setEnd = (i: 0 | 1) => () => {
      if (last) {
        ends[i] = last;
        fill();
      }
    };
    host.controls.append(
      explode.root,
      el(
        "div",
        { className: "buttons" },
        button("Reset view", shot),
        button("Set as start", setEnd(0)),
        button("Set as end", setEnd(1)),
      ),
    );
    host.readouts.append(
      el(
        "dl",
        {},
        el("dt", {}, "Part"),
        where,
        el("dt", {}, "True: its own coordinates (assembled)"),
        rest,
        el("dt", {}, "In the Assembly node (exploded now)"),
        placed,
      ),
      note2,
      el(
        "dl",
        {},
        el("dt", {}, "Distance, true (at rest)"),
        lengths.true,
        el("dt", {}, "Distance in the Assembly node (now)"),
        lengths.assembly,
        el("dt", {}, "Distance as drawn (one view)"),
        lengths.drawn,
      ),
    );
    fill();
  },
};
