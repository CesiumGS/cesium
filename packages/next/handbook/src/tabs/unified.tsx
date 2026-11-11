import { Fragment } from "react";
import { Figure, Note, Page, Section, Written } from "../parts.tsx";

type State = "built" | "partly" | "planned";

const STATE_TEXT: Record<State, string> = {
  built: "Built",
  partly: "Partly built",
  planned: "Planned",
};

interface Block {
  name: string;
  what: string;
  state: State;
}

/** The engine's public mechanisms, in the matrix's column order. */
const MECHANISMS: (Block & { short: string })[] = [
  {
    short: "Placement",
    name: "Placement and frames",
    what: "The reference frame tree, and one model of placing content: rigid, fitted, or any map an application supplies.",
    state: "partly",
  },
  {
    short: "Geometry",
    name: "Representations",
    what: "Meshes, B-reps, implicit surfaces, points and splats, volumes, subdivision: each drawn, each answering queries.",
    state: "partly",
  },
  {
    short: "Styling",
    name: "Styling and scalar fields",
    what: "One language compiled to the GPU, per feature: colour ramps, run-time data by element ID, time, emphasis.",
    state: "partly",
  },
  {
    short: "Clipping",
    name: "Sections and clipping",
    what: "Planes, boxes and polygon prisms that cut every representation, in any frame, with capped faces: exact on a b-rep, joined loops on a mesh. Clips a warp curves aren't built.",
    state: "partly",
  },
  {
    short: "Queries",
    name: "Queries",
    what: "Rays, picks, snaps and measurements, each with its accuracy, refined in stages by a host's services.",
    state: "partly",
  },
  {
    short: "Views",
    name: "Views and cameras",
    what: "Many views, viewports and linked views, controllers and touch; orthographic and XR cameras later.",
    state: "partly",
  },
  {
    short: "Time",
    name: "Time",
    what: "The scene clock, and values bound to it.",
    state: "partly",
  },
  {
    short: "Light",
    name: "Physical light",
    what: "Sun, sky and atmosphere in physical units, shadows and exposure.",
    state: "built",
  },
];

const MACHINERY: Block[] = [
  {
    name: "GPU tessellation and curves",
    what: "Patches by screen-space error; one curve, coverage and stroke kernel for vectors and B-reps. Built for B-reps, diced each view with per-pixel trims. Vectors don't share it yet.",
    state: "partly",
  },
  {
    name: "GPU-driven drawing",
    what: "Culling and listing in compute, indirect draws, the world's shared tables.",
    state: "built",
  },
  {
    name: "The frame graph",
    what: "Passes and the textures between them, sized and scheduled per view.",
    state: "built",
  },
  {
    name: "Streaming",
    what: "3D Tiles selection, loading and caching. Stable IDs across tiles are planned.",
    state: "partly",
  },
];

const DOMAINS = [
  "Design and engineering",
  "Construction",
  "Reality capture",
  "Analysis",
  "Geoscience",
  "Operations",
  "Simulation",
];

/** Each gallery example, the mechanisms it proves (indices into MECHANISMS), and whether it exists. */
const EXAMPLES: {
  domain: string;
  name: string;
  uses: number[];
  built?: boolean;
}[] = [
  {
    domain: "Design and engineering",
    name: "B-reps: a first look",
    uses: [1, 4, 5],
    built: true,
  },
  {
    domain: "Design and engineering",
    name: "Solid modeling with CSG, two kernels, a quad view",
    uses: [1, 2, 4, 5],
  },
  {
    domain: "Design and engineering",
    name: "A process plant: isolate, X-ray",
    uses: [1, 2, 3, 4, 5],
  },
  {
    domain: "Design and engineering",
    name: "A building by storey",
    uses: [2, 3, 4, 5],
  },
  {
    domain: "Design and engineering",
    name: "A drawing sheet printed to scale",
    uses: [0, 2, 3, 5],
  },
  {
    domain: "Design and engineering",
    name: "Changes between two design versions",
    uses: [2, 5],
  },
  {
    domain: "Design and engineering",
    name: "Rail clearance along a track",
    uses: [0, 1, 2, 4],
  },
  {
    domain: "Construction",
    name: "A construction sequence on a timeline",
    uses: [2, 5, 6],
  },
  { domain: "Construction", name: "Cut and fill", uses: [1, 2, 3, 4] },
  {
    domain: "Reality capture",
    name: "Change between two scans, with a swipe",
    uses: [1, 2, 5],
  },
  {
    domain: "Reality capture",
    name: "Inspection photos on the model",
    uses: [0, 1, 4, 5],
  },
  {
    domain: "Analysis",
    name: "A bridge's analysis results",
    uses: [0, 1, 2, 6],
  },
  { domain: "Analysis", name: "A viewshed", uses: [2, 4, 7] },
  { domain: "Analysis", name: "Sun hours on a city", uses: [2, 6, 7] },
  {
    domain: "Geoscience",
    name: "Drillholes and geological surfaces",
    uses: [0, 1, 2, 3, 5],
  },
  {
    domain: "Geoscience",
    name: "A tunnel through geology",
    uses: [0, 1, 3, 4, 5],
  },
  {
    domain: "Geoscience",
    name: "A block model cut by a section",
    uses: [1, 2, 3],
  },
  { domain: "Geoscience", name: "A geophysical survey", uses: [0, 1, 2] },
  {
    domain: "Operations",
    name: "Underground utilities",
    uses: [0, 1, 2, 4],
  },
  { domain: "Operations", name: "A flood over terrain", uses: [1, 2, 6] },
  {
    domain: "Operations",
    name: "A transmission line",
    uses: [0, 1, 2, 4],
  },
  {
    domain: "Simulation",
    name: "An agent replay in a station",
    uses: [1, 2, 6],
  },
];

function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="vision-blocks">
      {blocks.map((b) => (
        <section key={b.name} className={`vision-block ${b.state}`}>
          <h3>{b.name}</h3>
          <p>{b.what}</p>
          <span className="vision-state">{STATE_TEXT[b.state]}</span>
        </section>
      ))}
    </div>
  );
}

function VisionStack() {
  return (
    <div className="vision">
      <div className="vision-layer apps">
        <p className="vision-label">Applications</p>
        <div className="vision-domains">
          {DOMAINS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <p className="vision-brings">
          They bring the policy: exaggeration settings, comparison layouts,
          modeling kernels, analyses, the data that styles their elements, and
          their own query services.
        </p>
      </div>
      <div className="vision-layer">
        <p className="vision-label">Engine mechanisms: the public surface</p>
        <Blocks blocks={MECHANISMS} />
      </div>
      <div className="vision-layer">
        <p className="vision-label">Shared GPU machinery</p>
        <Blocks blocks={MACHINERY} />
      </div>
      <div className="vision-layer platform">
        <p className="vision-label">Platform</p>
        <p>WebGPU, with shaders in WGSL and Slang</p>
      </div>
    </div>
  );
}

function UsesMatrix() {
  let lastDomain = "";
  return (
    <div className="table-wrap vision-matrix">
      <table>
        <caption className="visually-hidden">
          Gallery examples by domain, and the engine mechanisms each uses
        </caption>
        <thead>
          <tr>
            <th scope="col">Example</th>
            {MECHANISMS.map((m) => (
              <th scope="col" key={m.short} title={m.name}>
                {m.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map((e) => {
            const head = e.domain !== lastDomain;
            lastDomain = e.domain;
            return (
              <Fragment key={e.name}>
                {head ? (
                  <tr className="vision-domain">
                    <th scope="colgroup" colSpan={MECHANISMS.length + 1}>
                      {e.domain}
                    </th>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row">
                    {e.name}
                    {e.built ? (
                      <span className="vision-built"> · in the gallery</span>
                    ) : null}
                  </th>
                  {MECHANISMS.map((m, i) => (
                    <td key={m.short}>
                      {e.uses.includes(i) ? (
                        <span aria-label="uses" className="vision-dot">
                          ●
                        </span>
                      ) : (
                        <span className="visually-hidden">no</span>
                      )}
                    </td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
          <tr className="vision-total">
            <th scope="row">Examples using it</th>
            {MECHANISMS.map((m, i) => (
              <td key={m.short}>
                {EXAMPLES.filter((e) => e.uses.includes(i)).length}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Unified() {
  return (
    <Page
      title="One core, many uses"
      status="sketch"
      lede={
        <>
          A small number of engine mechanisms, on a small amount of shared GPU
          machinery, each general enough to serve many uses: design,
          construction, reality capture, analysis, geoscience and operations.
          Applications supply the policy; the engine supplies the mechanism.
          This is the current vision, and says which parts exist.
        </>
      }
    >
      <Note title="How far it goes">
        <p>
          A vision, from the overall plan's sections 13.26, 13.33 and 13.34.
          Each block says whether it is built, partly built or planned. The{" "}
          <a href="#/architecture">System architecture tab</a> shows the modules
          as they are in code today.
        </p>
      </Note>

      <Section title="The architecture">
        <Figure caption="Every domain sits on the same eight mechanisms, and they on the same four pieces of GPU machinery. Solid blocks are built, striped ones partly built, dashed ones planned.">
          <VisionStack />
        </Figure>
        <p>
          The line between applications and the engine kept landing in the same
          place as the plan grew:
        </p>
        <ul>
          <li>
            <strong>Vertical exaggeration</strong> is an application's
            placement, not a scene setting. The placement design's test is that
            an application can exaggerate everything, the globe included,
            through placements alone, and still measure true heights.
          </li>
          <li>
            <strong>Comparison</strong> is linked views and viewports. A
            difference between two captures is an analysis drawn as a scalar
            field.
          </li>
          <li>
            <strong>Overrides</strong> for millions of elements are the styling
            language with data an application supplies, not a separate system.
          </li>
          <li>
            <strong>Modeling</strong> stays with the application or a kernel it
            brings. Two different kernels can feed the same B-rep form.
          </li>
        </ul>
        <Written
          from="the overall plan, sections 13.26, 13.33 and 13.34"
          on="2026-11-10"
        />
      </Section>

      <Section title="What each use needs">
        <p>
          The gallery examples planned to prove the mechanisms, by domain. Read
          down a column for how far a mechanism reaches, across a row for what a
          use needs. Styling and representations carry the most.
        </p>
        <Figure caption="Gallery examples and the mechanisms each uses. One is in the gallery today; the rest are planned.">
          <UsesMatrix />
        </Figure>
        <Written from="the overall plan, section 13.34" on="2026-11-10" />
      </Section>

      <Section title="The rule it gives">
        <p>
          When a new use arrives, the first question is whether it is an
          application's use of a mechanism that exists or is planned. Only when
          it isn't does the engine grow, and then the new mechanism should be
          general enough to serve uses beyond the one that asked. A feature that
          serves one use is a sign the line between application and engine is in
          the wrong place.
        </p>
      </Section>
    </Page>
  );
}
