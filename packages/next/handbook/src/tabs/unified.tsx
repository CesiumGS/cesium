import { Board, type BoardStep } from "../diagram.tsx";
import { DataTable, Figure, Note, Page, Section, Written } from "../parts.tsx";

/** What applications decide, beside the engine mechanism it runs on. */
const SPLIT: BoardStep[] = [
  {
    id: "a-exaggerate",
    lane: 0,
    row: 0,
    title: "Vertical exaggeration",
    body: "The factor, which content, and the surface it's measured from.",
  },
  {
    id: "e-place",
    lane: 1,
    row: 0,
    planned: true,
    title: "Placement",
    body: "Any map from content to the scene, with its Jacobian for normals and its inverse for picks and measurements, for every representation and the globe.",
  },
  {
    id: "a-compare",
    lane: 0,
    row: 1,
    title: "Comparison",
    body: "Which views, how they're linked: a swipe, a split, a CAD quad view.",
  },
  {
    id: "e-views",
    lane: 1,
    row: 1,
    title: "Views and cameras",
    body: "Viewports, linked views, controllers and touch. Orthographic and XR cameras are planned.",
  },
  {
    id: "a-model",
    lane: 0,
    row: 2,
    title: "Modeling",
    body: "A CSG tree, a kernel of its own, history and undo.",
  },
  {
    id: "e-brep",
    lane: 1,
    row: 2,
    title: "The B-rep form and geometry queries",
    body: "Exact surfaces drawn and answered, with stable IDs. Drafted; GPU tessellation is planned.",
  },
  {
    id: "a-analyse",
    lane: 0,
    row: 3,
    title: "Analysis",
    body: "Cut and fill, a scan's deviation, a viewshed, a stress result: the values.",
  },
  {
    id: "e-style",
    lane: 1,
    row: 3,
    planned: true,
    title: "Styling and scalar fields",
    body: "One language compiled to the GPU and evaluated per feature: colour ramps, run-time data by element ID, time, emphasis and X-ray. Built for live points.",
  },
  {
    id: "a-select",
    lane: 0,
    row: 4,
    title: "Which elements matter",
    body: "Isolate a system, schedule a sequence, mark a clash.",
  },
  {
    id: "a-cut",
    lane: 0,
    row: 5,
    title: "Where to cut",
    body: "A section along a tunnel, a floor's height, a clip box.",
  },
  {
    id: "e-clip",
    lane: 1,
    row: 5,
    planned: true,
    title: "Sections and clipping",
    body: "Across every representation, with capped faces, and queries that respect the cut.",
  },
  {
    id: "a-services",
    lane: 0,
    row: 6,
    title: "Its own services",
    body: "Exact snaps from design data, a server's queries.",
  },
  {
    id: "e-query",
    lane: 1,
    row: 6,
    title: "Queries with stated accuracy",
    body: "Rays, picks, snaps and measurements, answered at once and refined in stages.",
  },
];

interface Mechanism {
  name: string;
  what: string;
  state: "Built" | "Partly built" | "Drafted" | "Planned";
  uses: string;
}

const MECHANISMS: Mechanism[] = [
  {
    name: "Frames and placement",
    what: "The reference frame tree, and one model of placement from content to the scene: rigid, dual position and fitted maps, and any map an application supplies.",
    state: "Partly built",
    uses: "Every domain. Design coordinates, other bodies, exaggeration (an application's placement), reprojected models, curves through placement.",
  },
  {
    name: "Streaming",
    what: "3D Tiles selection, caching and loading, with stable IDs for elements, faces, edges and vertices across tiles.",
    state: "Partly built",
    uses: "Captured meshes, design models, terrain and imagery; B-reps and fallback meshes in tiles; edits overriding tiles.",
  },
  {
    name: "Representations",
    what: "Meshes, B-reps, implicit surfaces, points and splats, volumes, subdivision surfaces: each drawn and each answering the same queries.",
    state: "Partly built",
    uses: "Meshes and live points are built; the B-rep form is drafted; the rest are planned.",
  },
  {
    name: "Geometry queries",
    what: "One interface per object, with a scene layer above it for frames, instants and asynchronous answers. Every answer states its accuracy.",
    state: "Drafted",
    uses: "Picks, snaps, measurement, lines of sight, viewsheds, clash checks, a host's own query services.",
  },
  {
    name: "Tessellation and curves",
    what: "GPU tessellation by screen-space error, and one curve, coverage and stroke kernel shared by vectors and B-reps.",
    state: "Planned",
    uses: "B-reps and their trims, reprojected models, vector lines and fills, catenaries, alignments, labels.",
  },
  {
    name: "Styling and scalar fields",
    what: "One styling language compiled to the GPU and evaluated per feature, with run-time data by element ID, time, and colour ramps for values.",
    state: "Partly built",
    uses: "Vector styling, per-element overrides at scale, construction sequences over time, analysis results, heat maps, differences between captures.",
  },
  {
    name: "Sections and clipping",
    what: "Planes and volumes that cut every representation, with capped faces, and queries that respect the cut.",
    state: "Planned",
    uses: "Buildings by storey, tunnels, block models, plant models, plan and section drawings.",
  },
  {
    name: "Views and cameras",
    what: "Many views on one device, viewports, linked views, camera controllers with touch, and later orthographic and XR cameras.",
    state: "Partly built",
    uses: "Comparison layouts, CAD quad views, drawings printed to scale, phones and headsets.",
  },
  {
    name: "Time",
    what: "The scene clock and values bound to it.",
    state: "Partly built",
    uses: "Construction sequences, live sensor data, simulation replays, floods over time, sun studies, missions.",
  },
  {
    name: "Physical light",
    what: "The sun, sky and atmosphere in physical units, shadows and exposure.",
    state: "Built",
    uses: "Sun hours on a city, shadow studies, the sky from street level to orbit.",
  },
];

export function Unified() {
  return (
    <Page
      title="One core, many uses"
      status="sketch"
      lede={
        <>
          A small number of engine mechanisms, each general enough to serve many
          uses: design, construction, reality capture, analysis, geoscience and
          operations. Applications supply the policy; the engine supplies the
          mechanism. This tab is the current vision, and says which parts exist.
        </>
      }
    >
      <Note title="How far it goes">
        <p>
          A vision, drawn from the overall plan's sections 13.26, 13.33 and
          13.34. Some mechanisms are built, some drafted, most still planned;
          the table below says which.
        </p>
      </Note>

      <Section title="The split">
        <p>
          The same pattern keeps recurring. Something a domain needs turns out
          to be an application's choice made through an engine mechanism that
          already serves other uses, not a feature of its own.
        </p>
        <Figure caption="What applications decide, and the engine mechanism each runs on. Dashed cards are mechanisms not yet built in their general form.">
          <Board
            label="What applications decide, and the engine mechanisms under them"
            lanes={["The application decides", "The engine provides"]}
            steps={SPLIT}
            edges={[
              { from: "a-exaggerate", to: "e-place" },
              { from: "a-compare", to: "e-views" },
              { from: "a-model", to: "e-brep" },
              { from: "a-analyse", to: "e-style" },
              { from: "a-select", to: "e-style" },
              { from: "a-cut", to: "e-clip" },
              { from: "a-services", to: "e-query" },
            ]}
          />
        </Figure>
        <ul>
          <li>
            <strong>Exaggeration</strong> is a placement, not a scene setting:
            the test of the placement design is that an application can
            exaggerate everything, the globe included, through placements alone,
            and still measure true heights.
          </li>
          <li>
            <strong>Comparison</strong> is linked views and viewports, and a
            difference between two captures is an analysis drawn as a scalar
            field.
          </li>
          <li>
            <strong>Overrides</strong> for millions of elements are the styling
            language with data an application supplies, not a separate override
            system.
          </li>
          <li>
            <strong>Modeling</strong> stays with the application or a kernel it
            brings. The engine draws exact geometry and answers queries on it,
            and two different kernels can feed the same B-rep form.
          </li>
        </ul>
        <Written
          from="the overall plan, sections 13.26, 13.33 and 13.34"
          on="2026-11-10"
        />
      </Section>

      <Section title="The mechanisms">
        <DataTable
          label="The engine's mechanisms, their state, and what uses them"
          columns={[
            { head: "Mechanism", cell: (r) => r.name },
            { head: "What it is", cell: (r) => r.what },
            { head: "State", cell: (r) => r.state },
            { head: "What uses it", cell: (r) => r.uses },
          ]}
          rows={MECHANISMS}
        />
        <p>
          The <a href="#/architecture">System architecture tab</a> shows how the
          built ones are layered in code. The <a href="#/breps">B-reps tab</a>,{" "}
          <a href="#/tessellation">Tessellation</a> and{" "}
          <a href="#/vector">Vector rendering</a> go deeper into three of them.
        </p>
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
        <p>
          The gallery is where this is checked. Each planned example proves one
          mechanism on a real use: a viewshed on queries and scalar fields, a
          plant model on per-element styling, a CAD quad view on linked views, a
          tunnel on sections, a solid modeling tool on the B-rep form with two
          kernels.
        </p>
        <Written from="the overall plan, section 13.34" on="2026-11-10" />
      </Section>
    </Page>
  );
}
