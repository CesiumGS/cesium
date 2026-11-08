import type { ReactNode } from "react";
import { API_ROWS } from "./apiMap.ts";
import { C } from "./parts.tsx";
import { WEBGPU_USAGE } from "./sources.ts";

/**
 * The Overview's costs, by hand: what more development closes, what the
 * architecture gives up, and what falls on applications. Checked against the
 * code and the plans on the date in DESIGN.md. Don't write these from the
 * plan's first list of non-goals: some of those have since been built.
 */
type GapState = "covered" | "planned" | "unplanned";

const GAP_LABEL: Record<GapState, string> = {
  covered: "Covered",
  planned: "Planned",
  unplanned: "Not planned yet",
};

const GAP_CLASS: Record<GapState, string> = {
  covered: "api-same",
  planned: "api-renamed",
  unplanned: "goal-open",
};

const GAPS: readonly {
  what: string;
  state: GapState;
  today: ReactNode;
}[] = [
  {
    what: "Large sets of moving points, billboards and models",
    state: "covered",
    today: (
      <>
        A different shape: <C>PointSource</C> and <C>VectorLayer</C>, styled by
        the vector language, with <C>ModelPool</C>, as in the real-time tracks
        example. These replace Entities only for this use.
      </>
    ),
  },
  {
    what: "Globe translucency, and seeing buried work",
    state: "covered",
    today: (
      <>
        <C>setTerrainOpacity</C> and <C>addTerrainTranslucency</C>.
      </>
    ),
  },
  {
    what: "Clipping terrain to a polygon",
    state: "covered",
    today: (
      <>
        <C>addTerrainClip</C>, on terrain only.
      </>
    ),
  },
  {
    what: "Styling and custom shaders",
    state: "covered",
    today: (
      <>
        <C>FeatureStyle</C>, and <C>CustomShader</C> in WGSL or Slang. Old
        shader text doesn't carry over: see below.
      </>
    ),
  },
  {
    what: "Heights, clamping and snapping",
    state: "covered",
    today: (
      <>
        <C>Clamp</C>, spatial queries and <C>SnapService</C>.
      </>
    ),
  },
  {
    what: "Viewer, time controls, inspector and credits",
    state: "covered",
    today: "2.0's own versions, with different options.",
  },
  {
    what: "Camera flights, an orthographic camera, more controllers",
    state: "planned",
    today: "Plan 5 spec, sub-plan 5d.",
  },
  {
    what: "Point clouds and Gaussian splats",
    state: "planned",
    today:
      "Overall plan, sections 3.6 and 4.1. M6 is time-boxed to two or three of its items.",
  },
  {
    what: "Implicit tiling, multiple contents and more bounding volumes",
    state: "planned",
    today: "Overall plan, section 4.1.",
  },
  {
    what: "Classification",
    state: "planned",
    today: "Overall plan, sections 3.6 and 4.1.",
  },
  {
    what: "Vector tiles, labels, wide lines, and polygons draped on terrain and tilesets",
    state: "planned",
    today: "Overall plan, section 13.9, as a design for the vector renderer.",
  },
  {
    what: "Several imagery layers on a globe",
    state: "planned",
    today:
      "Overall plan, sections 3.6 and 3.8. Today a globe takes one provider, and one for its lights.",
  },
  {
    what: "glTF animation playback",
    state: "planned",
    today:
      "Later: outside plan 5, which adds only node transforms an application sets. Its animation core is shaped to drive playback (plan 5 spec, section 3).",
  },
  {
    what: "Clipping tilesets",
    state: "planned",
    today: "Later: its own design round after plan 5 (plan 5 spec, section 3).",
  },
  {
    what: "XR",
    state: "planned",
    today:
      "Overall plan, M6, which is time-boxed to two or three of its items.",
  },
  {
    what: "The Entity API, and CZML, KML and GeoJSON data sources",
    state: "unplanned",
    today:
      "Out of scope for the proof of concept, with no plan yet beyond that. The vector design in section 13.9 reads GeoJSON from a service, not as a data source.",
  },
  {
    what: "Primitive, Geometry and Appearance",
    state: "unplanned",
    today: (
      <>
        Out of scope for the proof of concept. Draws go through{" "}
        <C>world.addMesh</C> and <C>world.addDraw</C>.
      </>
    ),
  },
  {
    what: "2D and Columbus view",
    state: "unplanned",
    today: "Out of scope for the proof of concept, with no design yet.",
  },
  {
    what: "Imagery draped on 3D Tiles",
    state: "unplanned",
    today:
      "Out of scope for the proof of concept. Section 13.9 mentions a draping plan, but none is written.",
  },
  {
    what: "Post-process stages, particles, clouds and panoramas",
    state: "unplanned",
    today: (
      <>
        No plan covers these. FXAA and ambient occlusion are <C>View</C>{" "}
        settings.
      </>
    ),
  },
  {
    what: "Other imagery and terrain providers, I3S, voxels, clipping planes, time-dynamic content, and other widgets",
    state: "unplanned",
    today: (
      <>
        No plan commits to these. The <a href="#/compare">1.x to 2.0 API</a> tab
        lists them by name.
      </>
    ),
  },
];

const usageWithout = (100 - Number.parseFloat(WEBGPU_USAGE)).toFixed(2);

const GIVEN_UP: readonly {
  what: ReactNode;
  why: ReactNode;
  cost: ReactNode;
}[] = [
  {
    what: "Browsers and devices without core WebGPU",
    why: "The renderer is GPU-driven: compute culls, indirect draws consume the result, and vertex shaders pull from storage buffers. WebGL 2 has none of those, so a thin fallback can't carry it.",
    cost: (
      <>
        About {usageWithout}% of global browser usage, by the{" "}
        <a href="#/browsers">Browser compatibility</a> tab's figure. Apps that
        need those browsers stay on 1.x there. The other options are
        compatibility mode, not yet examined, or a second renderer (overall
        plan, section 13.17).
      </>
    ),
  },
  {
    what: (
      <>
        GLSL shader code: <C>CustomShader</C> text, and <C>Appearance</C> and{" "}
        <C>PostProcessStage</C> shaders
      </>
    ),
    why: "2.0 runs WGSL, with Slang as its authoring language. It doesn't read GLSL or 1.x's built-ins.",
    cost: "Anyone with custom shaders rewrites them. Even if those features return, the old shader text doesn't.",
  },
  {
    what: (
      <>
        Synchronous answers from the GPU: <C>Scene.pick</C>, <C>pickPosition</C>
        , and creating a viewer
      </>
    ),
    why: "WebGPU reads back only through mapAsync, and hands out a device through a promise.",
    cost: (
      <>
        Every app: each call site awaits, and the answer comes a tick or more
        later. Answers from the CPU, such as <C>globe.sampleHeight</C>, stay
        synchronous.
      </>
    ),
  },
  {
    what: (
      <>
        Reaching into the renderer: custom primitives that push{" "}
        <C>DrawCommand</C>s from <C>update(frameState)</C>, or use{" "}
        <C>ShaderProgram</C> and <C>Context</C>
      </>
    ),
    why: (
      <>
        2.0 has no per-tick command list, since draws are records in GPU tables.{" "}
        <C>world.addDraw</C> and <C>addFrameCompute</C> are the ways in.
      </>
    ),
    cost: "Apps built on these rewrite that code. 1.x marks these classes private, so they never had a stability promise.",
  },
  {
    what: "Sharing a WebGL context, or direct GL state, with another library",
    why: "2.0 has no WebGL context. 1.x's own is private, but reachable.",
    cost: (
      <>
        Apps that draw into 1.x's context lose that route. WebGL libraries need
        their own canvas. 2.0 exposes its device as <C>engine.gpu.device</C>,
        and whether that stays public, for a host that shares it, is open for
        the API review.
      </>
    ),
  },
];

export function Costs() {
  const breaking = API_ROWS.filter(
    (r) =>
      r.status === "absent" || r.status === "changed" || r.status === "renamed",
  ).length;
  return (
    <>
      <p>
        Most of what 2.0 lacks today depends on further development, not on the
        architecture. A few things the architecture does give up, and
        applications carry the migration.
      </p>

      <h3>Gaps that more development closes</h3>
      <div className="api-table-wrap">
        <table className="api-table cost-table">
          <thead>
            <tr>
              <th scope="col">What 1.x has</th>
              <th scope="col">Today</th>
              <th scope="col">What covers it, or where it's planned</th>
            </tr>
          </thead>
          <tbody>
            {GAPS.map((g) => (
              <tr className="api-row" key={g.what}>
                <td data-label="What 1.x has">{g.what}</td>
                <td data-label="Today">
                  <span className={`api-badge ${GAP_CLASS[g.state]}`}>
                    {GAP_LABEL[g.state]}
                  </span>
                </td>
                <td data-label="In 2.0">{g.today}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="provenance">
        "Not planned yet" means no plan or spec commits to it. We found nothing
        in the architecture that rules these out, but none has a design. The 1.x
        comparison groups those the proof of concept left out as "not built
        yet".
      </p>

      <h3>What the architecture gives up</h3>
      <p>
        These don't come back with more work on this renderer. Some would take a
        second one.
      </p>
      <div className="api-table-wrap">
        <table className="api-table cost-table cost-wide">
          <thead>
            <tr>
              <th scope="col">What goes</th>
              <th scope="col">Why</th>
              <th scope="col">What it costs, and who</th>
            </tr>
          </thead>
          <tbody>
            {GIVEN_UP.map((g, i) => (
              <tr className="api-row" key={i}>
                <td data-label="What goes">{g.what}</td>
                <td data-label="Why">{g.why}</td>
                <td data-label="Cost">{g.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <strong>A choice, not a necessity:</strong> 2.0 doesn't match some of
        1.x's rendering on purpose. Style colours blend in linear light, so{" "}
        <C>colorBlendMode</C> <C>"mix"</C> and <C>"replace"</C> and translucent
        colours differ, and shading follows physics over 1.x. Apps tuned to
        1.x's look will see changes. The plan records why, and the{" "}
        <a href="#/differences">Differences</a> tab lists them.
      </p>

      <h3>Migration</h3>
      <p>
        This falls on applications built on 1.x. Their code changes: {breaking}{" "}
        of the {API_ROWS.length} areas in the{" "}
        <a href="#/compare">1.x to 2.0 API</a> comparison break it. So do their
        custom shaders, and anything that relied on internals. Nobody has
        estimated or measured the effort, and there's no migration tool.
      </p>
      <p>
        <strong>Content doesn't need converting.</strong> 3D Tiles in glTF,
        b3dm, i3dm and cmpt, quantized-mesh terrain and ion assets load as they
        are, when their extensions are supported. Some content doesn't load yet:{" "}
        <C>pnts</C>, <C>vctr</C>, <C>geom</C>, and the extensions planned above.
        That's a gap to close, not a format to convert.
      </p>
      <p>
        <span className="api-badge goal-open">Not written</span>{" "}
        <strong>A migration guide is needed, and doesn't exist yet.</strong> The{" "}
        <a href="#/compare">1.x to 2.0 API</a> comparison and its side-by-side
        tasks would feed it.
      </p>
    </>
  );
}
