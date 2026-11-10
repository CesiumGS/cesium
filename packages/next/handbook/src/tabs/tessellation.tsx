import { Board, type BoardStep } from "../diagram.tsx";
import {
  C,
  DataTable,
  Figure,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

const SEAM: BoardStep[] = [
  {
    id: "placement",
    lane: 0,
    row: 1,
    title: "A placement is data and a function",
    body: (
      <>
        A buffer of parameters plus <C>placement.slang</C>, not code inside one
        shader, so a compute pass can evaluate it at points the content never
        had.
      </>
    ),
  },
  {
    id: "query",
    lane: 0,
    row: 2,
    title: "A query, per draw and per view",
    body: (
      <>
        <C>placementOf</C> in the frames module says which placement applies,
        for which render root, and why.
      </>
    ),
  },
  {
    id: "bounds",
    lane: 0,
    row: 0,
    title: "Stated bounds",
    body: (
      <>
        <C>errorBound</C> and <C>secondDerivativeBound</C> say enough about a
        placement to choose a sampling rate by screen-space error.
      </>
    ),
  },
  {
    id: "arguments",
    lane: 0,
    row: 3,
    title: "Indirect draw arguments",
    body: (
      <>
        A draw record points at its batch's arguments, through{" "}
        <C>DrawArguments</C>, so a compute pass can write the counts.
      </>
    ),
  },
  {
    id: "edges",
    lane: 1,
    row: 0,
    planned: true,
    title: "Edges first",
    body: "Each shared edge is tessellated once at the view's tolerance, and both faces take their boundary from it, so faces can't crack apart.",
  },
  {
    id: "patches",
    lane: 1,
    row: 1,
    planned: true,
    title: "Patches by screen-space error",
    body: "Surfaces evaluated in source coordinates, then placed, in compute. The error is measured after placement.",
  },
  {
    id: "trims",
    lane: 1,
    row: 2,
    planned: true,
    title: "Trims per pixel",
    body: "The whole parameter domain is drawn. The pixel stage tests inside or outside the trim in (u, v), with the vector fill's coverage.",
  },
  {
    id: "draw",
    lane: 1,
    row: 3,
    planned: true,
    title: "Draw indirectly",
    body: "With the counts the compute pass wrote.",
  },
];

const SPIKE = [
  {
    distance: "150 m",
    n: "9 × 9",
    triangles: "1,458",
    bound: "0.41 px",
    measured: "0.40 px",
    gpu: "0.18 ms",
  },
  {
    distance: "600 m",
    n: "4 × 4",
    triangles: "288",
    bound: "0.48 px",
    measured: "0.38 px",
    gpu: "0.03 ms",
  },
  {
    distance: "3,000 m",
    n: "2 × 2",
    triangles: "72",
    bound: "0.38 px",
    measured: "0.23 px",
    gpu: "0.01 ms",
  },
];

export function Tessellation() {
  return (
    <Page
      title="Tessellation (not built)"
      status="sketch"
      lede={
        <>
          The plan calls for one GPU tessellation engine, for B-reps and for
          reprojected models. Its design is now outlined and two spikes have
          measured the riskiest parts, but none of it is in the engine. What the
          code has is the seam it will plug into.
        </>
      }
    >
      <Note title="Not built">
        <p>
          The engine does no subdivision of any kind today. Only the left-hand
          column of the figure below exists in the code. The right-hand column
          is the plan's design, and the spike results below come from throwaway
          code outside the engine.
        </p>
      </Note>

      <Section title="What it's for">
        <p>
          One engine serves two kinds of content that need view-dependent
          tessellation. B-reps: trimmed NURBS and other analytic surfaces from
          CAD, which the <a href="#/breps">B-reps tab</a> covers. And
          reprojected models, whose placement bends them, so a flat face isn't
          flat once placed.
        </p>
        <p>
          Tessellation runs on the GPU from the start, for each view, and not on
          the CPU at load. The CPU kernel the plan uses for conversion, SMLib,
          took about 10 ms to tessellate one simple face in WebAssembly. A model
          has thousands of faces.
        </p>
      </Section>

      <Section title="The seam, and the engine">
        <Figure caption="Solid cards exist today. Dashed cards are the plan's design, and aren't built.">
          <Board
            label="The seam, and the engine that will consume it"
            lanes={["In the code today", "Not built: the engine"]}
            steps={SEAM}
            edges={[
              { from: "placement", to: "patches" },
              { from: "query", to: "patches" },
              { from: "bounds", to: "edges" },
              { from: "arguments", to: "draw" },
              { from: "edges", to: "patches", vertical: true },
              { from: "patches", to: "trims", vertical: true },
              { from: "trims", to: "draw", vertical: true },
            ]}
          />
        </Figure>
        <p>
          One kind of placement is an exception today. A dual position has no
          function between its vertices, so it can't be evaluated at new points,
          and it states no bound. The plan reviews placement as a whole before
          this engine is built: rigid, dual-position and fitted placements
          become cases of one model, and dual positions may give way to fitted
          operations, whose Jacobian gives exact normals.
        </p>
        <p>
          The Rendering tab's frame graph has a dashed row for the engine's
          compute pass. Where the pass goes isn't settled yet.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.33, and the plan 5 spec, sections 3
              and 8, with <C>src/shaders/placement.slang</C>,{" "}
              <C>src/scene/placement.ts</C>, <C>src/frames/placementQuery.ts</C>{" "}
              and <C>src/render/drawArguments.ts</C>
            </>
          }
          on="2026-11-09"
        />
      </Section>

      <Section title="The design, step by step">
        <ul>
          <li>
            <strong>Edges first.</strong> A B-rep edge belongs to two faces. It
            is tessellated once, from the edge alone, and both faces stitch to
            it. This is the vector pipeline's curve refinement, so the same code
            refines vector lines and B-rep edges.
          </li>
          <li>
            <strong>Patches by screen-space error.</strong> NURBS are split into
            rational Bézier patches when they load. Each patch's grid density
            comes from a bound on its second differences, converted to pixels,
            with a target of half a pixel.
          </li>
          <li>
            <strong>Evaluate in source coordinates, then place.</strong> Each
            evaluated point goes through the draw's placement. Subdivision
            measures error after placement, including how much the placement
            bends across a patch. Normals are the surface's derivatives times
            the placement's Jacobian, so they're exact.
          </li>
          <li>
            <strong>Trims per pixel.</strong> A trimmed face's whole parameter
            domain is drawn, and the pixel stage tests each pixel inside or
            outside the trim loop in (u, v). The test is the vector fill's
            per-pixel coverage of quadratic curves, so trim edges are exact and
            antialiased, with no trim textures and no triangulation on the CPU.
          </li>
          <li>
            <strong>Planar faces are fills.</strong> A planar face is a vector
            polygon on a plane: one quad and the coverage test, while the
            placement stays close to affine over it.
          </li>
          <li>
            <strong>Slivers.</strong> Each face's trim comes from its own
            parameter space, so pixel slivers along a shared edge are possible.
            Faces cover half a pixel extra, and edges draw on top.
          </li>
        </ul>
        <Written from="the overall plan, section 13.33" on="2026-11-09" />
      </Section>

      <Section title="What a spike measured">
        <p>
          One rational bicubic NURBS face, 100 m across, made of 3 × 3 spans
          with one control point of weight 2, and a circular hole in (u, v). It
          was drawn in Chrome on an Apple GPU. The vertex shader evaluated a
          grid for each span, and the pixel shader computed exact normals and
          cut the hole. Grid density came from the bound, with a target of 0.5
          px.
        </p>
        <DataTable
          label="One trimmed NURBS face on the GPU"
          columns={[
            { head: "Camera distance", numeric: true, cell: (r) => r.distance },
            { head: "Grid per span", cell: (r) => r.n },
            { head: "Triangles", numeric: true, cell: (r) => r.triangles },
            { head: "Bound", numeric: true, cell: (r) => r.bound },
            { head: "Measured error", numeric: true, cell: (r) => r.measured },
            { head: "GPU per tick", numeric: true, cell: (r) => r.gpu },
          ]}
          rows={SPIKE}
        />
        <ul>
          <li>
            The measured error is against 512 × 512 exact evaluations per span,
            so it's accuracy against the surface, not agreement between two
            meshes.
          </li>
          <li>
            The bound was never exceeded, and over-tessellated by at most about
            1.6 times in pixels. At 150 m it had almost no margin, so the engine
            needs a bound that accounts for weights, or a safety factor.
          </li>
          <li>
            Cutting the hole per pixel cost nothing measurable. But a circle is
            one distance test, so this doesn't settle the cost of general trim
            curves.
          </li>
          <li>
            SMLib tessellated the same face to the same tolerance in 209
            triangles, with 0.498 px error, in 9.6 ms. Building and trimming the
            face took about 270 ms more. That was WebAssembly on one thread
            under Node.
          </li>
          <li>
            One face can't judge compute-driven against vertex-driven drawing.
            That waits for many patches.
          </li>
        </ul>
        <Written
          from="the overall plan, section 13.33, Spike B result"
          on="2026-11-09"
        />
      </Section>

      <Section title="Until then">
        <p>
          A flat face of edge <em>d</em> sags below the curved Earth by about{" "}
          <em>d</em>²/8<em>R</em> at its middle: 2 cm for 1 km, and 2 m for 10
          km. For reprojected models the engine didn't generate, the plan's
          answer until this engine exists is to state a rule and measure. The
          producer declares a chord tolerance, and a tile that declares none has
          its largest face's sag measured and stated as its display error. Picks
          and snaps on it carry that as an accuracy term.
        </p>
        <Written from="the plan 5 spec, section 13.4" on="2026-11-08" />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>An error bound that's safe for rational surfaces.</li>
          <li>
            Crack-free edges between patches of different density, with its
            test: shared-edge vertices bitwise equal from both sides.
          </li>
          <li>
            How surfaces stay accurate in 32-bit floats at a globe position:
            evaluated relative to a nearby origin, as the engine does elsewhere.
          </li>
          <li>
            The trim test on general curves, which waits for the vector design's
            coverage kernel.
          </li>
          <li>
            What a per-pixel trim does to antialiasing, a depth-only pass,
            shadows and picking. Each needs the same test.
          </li>
        </ul>
      </Section>
    </Page>
  );
}
