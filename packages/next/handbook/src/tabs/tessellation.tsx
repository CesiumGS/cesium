import { Board, type BoardStep } from "../diagram.tsx";
import { C, Figure, Note, Page, Section, Written } from "../parts.tsx";

const SEAM: BoardStep[] = [
  {
    id: "placement",
    lane: 0,
    row: 0,
    title: "A placement is data and a function",
    body: (
      <>
        A buffer of parameters plus <C>placement.slang</C>, not code inside one
        shader, so a compute pass could evaluate it at points the content never
        had.
      </>
    ),
  },
  {
    id: "query",
    lane: 0,
    row: 1,
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
    row: 2,
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
        <C>DrawArguments</C>, so a later compute pass could write the counts.
      </>
    ),
  },
  {
    id: "evaluate",
    lane: 1,
    row: 0,
    rows: 2,
    planned: true,
    title: "Evaluate in compute",
    body: "Patches and the draw's placement, evaluated together.",
  },
  {
    id: "subdivide",
    lane: 1,
    row: 2,
    planned: true,
    title: "Subdivide",
    body: "By screen-space error, handling trim curves.",
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

export function Tessellation() {
  return (
    <Page
      title="Tessellation (not built)"
      status="stub"
      lede={
        <>
          The plan calls for one GPU tessellation engine, later, and builds none
          of it now. What it does is keep a seam open. This tab holds the place,
          and says only what the plan says.
        </>
      }
    >
      <Note title="Not built">
        <p>
          The engine does no subdivision of any kind today. Only the left-hand
          column of the figure below exists in the code.
        </p>
      </Note>

      <Section title="What it's for">
        <p>
          One engine would serve both reprojected models and B-reps: trimmed
          NURBS and other analytic surfaces from CAD. Both need view-dependent
          tessellation.
        </p>
      </Section>

      <Section title="The seam">
        <p>
          The plan puts the seam in one sentence: per-vertex placement and the
          frames module's per-draw placement query are what the tessellation
          engine will consume.
        </p>
        <Figure caption="Solid cards exist today. Dashed cards are the plan's outline of the engine, and aren't built.">
          <Board
            label="The seam, and the engine that would consume it"
            lanes={["In the code today", "Not built: the engine"]}
            steps={SEAM}
            edges={[
              { from: "placement", to: "evaluate" },
              { from: "query", to: "evaluate" },
              { from: "bounds", to: "subdivide" },
              { from: "arguments", to: "draw" },
              { from: "evaluate", to: "subdivide", vertical: true },
              { from: "subdivide", to: "draw", vertical: true },
            ]}
          />
        </Figure>
        <p>
          One kind of placement is an exception. A dual position has no function
          between its vertices, so it can't be evaluated at new points, and it
          states no bound.
        </p>
        <p>
          The Rendering tab's frame graph has a dashed row for it. The plan says
          only that a later compute pass can write the draw counts, so that row
          holds a place and doesn't settle where the pass goes.
        </p>
        <Written
          from={
            <>
              the plan 5 spec, sections 3 and 8, with{" "}
              <C>src/shaders/placement.slang</C>, <C>src/scene/placement.ts</C>,{" "}
              <C>src/frames/placementQuery.ts</C> and{" "}
              <C>src/render/drawArguments.ts</C>
            </>
          }
          on="2026-11-08"
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
          <li>The engine's design. Only its seam is specified so far.</li>
        </ul>
      </Section>
    </Page>
  );
}
