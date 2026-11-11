import type { ReactNode } from "react";
import {
  C,
  Cite,
  DataTable,
  Note,
  Page,
  Section,
  Sources,
  Written,
} from "../parts.tsx";

const TILESET_PROPOSALS: { name: string; where: ReactNode; what: string }[] = [
  {
    name: "A placement mode on the source CRS",
    where: (
      <>
        3D Tiles 2.0, on <Cite id="crsSource" />
      </>
    ),
    what: 'One field, "placement": "rigid" | "reprojected", saying whether content in a design CRS is meant to be placed rigidly at an anchor or reprojected vertex by vertex. Nothing in 3D Tiles, glTF or OGC can say "reprojected" today.',
  },
  {
    name: "Alignments",
    where: "3D Tiles, possibly glTF",
    what: "Horizontal and vertical alignment geometry as tileset data: lines, arcs, clothoid spirals, grades, parabolic vertical curves and stationing, with segment kinds named after IFC 4.3's IfcAlignment. Exact snapping and station-offset readouts then work on streamed content.",
  },
  {
    name: "A declared coordinate operation",
    where: "3D Tiles 2.0",
    what: "Which operation the producer used to reproject, as WKT2 COORDINATEOPERATION or BOUNDCRS rather than a PROJ pipeline string, so a consumer can reproduce the placement exactly. Every grid it names must be a published, hashed grid.",
  },
  {
    name: "A site transform mapped to IFC",
    where: (
      <>
        3D Tiles 2.0, after <Cite id="ifc" />
      </>
    ),
    what: "Rotation, scale and origin matching IFC 4.3's IfcMapConversionScaled, so IFC-sourced tilesets can carry it unchanged.",
  },
];

const DECLARATIONS = [
  {
    name: "BENTLEY_engineering_frame",
    what: "Declares a tileset's engineering frame: its design CRS, placement mode and site transform. It composes with ESRI_crs, EXT_geospatial_crs_source and 3DTILES_ellipsoid rather than replacing them.",
    state: "In use by the design globe. 5f may add a declared chord tolerance.",
  },
  {
    name: "BENTLEY_alignments",
    what: "Alignment geometry beside the frame, for exact snaps and stationing.",
    state: "In use by the design globe.",
  },
  {
    name: "BENTLEY_brep",
    what: "A B-rep beside a fallback mesh: surfaces, trims, edges and stable IDs as typed arrays. A client without it draws the fallback triangles.",
    state:
      "Draft, in src/brep/BENTLEY_brep.md. Read by the loader. The model path doesn't draw it: a host gives the form to the provisional World.addBrep, which draws it on the GPU.",
  },
];

const WEBGPU: {
  feature: string;
  state: ReactNode;
  engine: string;
}[] = [
  {
    feature: "Bindless",
    state: (
      <>
        Draft, with a resource table of up to 65,536 entries (
        <Cite id="bindless" />
        ). Chrome has no "What's New" entry for it (
        <Cite id="chrome" />
        ).
      </>
    ),
    engine:
      "Designed for, not built. One seam and a bypass test, test/bindless.test.ts.",
  },
  {
    feature: "Multi-draw indirect",
    state: (
      <>
        Experimental in Chrome since 131 (<Cite id="chrome" />
        ), on 0.14% of reporting adapters (<Cite id="survey" />
        ). No proposal file in the index (
        <Cite id="proposals" />
        ).
      </>
    ),
    engine:
      "Draw arguments pass through one seam, so it replaces an emulation rather than call sites.",
  },
  {
    feature: "Immediates (push constants)",
    state: (
      <>
        Merged (<Cite id="proposals" />
        ), and in Chrome 149 and 150 (
        <Cite id="chrome" />
        ).
      </>
    ),
    engine: "Per-draw constants pass through one seam.",
  },
  {
    feature: "Ray queries",
    state: (
      <>
        No proposal file in the index (<Cite id="proposals" />
        ).
      </>
    ),
    engine:
      "One query interface for rays, picks and heights: asynchronous, batched, three-way answers. A hardware engine can drop in behind it. Acceleration-structure lifetime has a hook with nothing behind it yet.",
  },
  {
    feature: "Mesh shaders",
    state: (
      <>
        No proposal file in the index (<Cite id="proposals" />
        ).
      </>
    ),
    engine:
      "Geometry reaches the GPU through one path, so a backend could replace the compute-plus-indirect stage, not the content format.",
  },
  {
    feature: "Tessellation",
    state: (
      <>
        No proposal file in the index (<Cite id="proposals" />
        ).
      </>
    ),
    engine:
      "A seam for reprojected models and B-reps, in plan 5, section 8. Built for B-reps, provisional and internal; a reprojected model isn't subdivided yet. See the Tessellation tab.",
  },
  {
    feature: "Subgroups",
    state: (
      <>
        Merged (<Cite id="proposals" />
        ).
      </>
    ),
    engine:
      "Used behind a capability check, with portable paths in every kernel.",
  },
  {
    feature: "64-bit atomics",
    state: (
      <>
        atomic-64-min-max merged (<Cite id="proposals" />
        ).
      </>
    ),
    engine: "For a later visibility buffer. To be audited in 5i.",
  },
];

export function Specs() {
  return (
    <Page
      title="Spec extensions"
      status="sketch"
      lede={
        <>
          What building this engine suggests changing upstream: in 3D Tiles and
          glTF, in WebGPU, and in the Slang toolchain. None of these is proposed
          yet; each is a draft for the right people to weigh.
        </>
      }
    >
      <Section title="3D Tiles and glTF">
        <p>
          The design globe's tileset declaration overlaps existing work for its
          CRS (<C>ESRI_crs</C> in 3D Tiles 1.1, and <Cite id="crsSource" /> in
          the 3D Tiles 2.0 work, which <Cite id="tiles" /> lists as in
          development) and its body (<C>3DTILES_ellipsoid</C>). So it composes
          with those, and only what is new is worth proposing:
        </p>
        <DataTable
          label="Proposals for 3D Tiles and glTF"
          columns={[
            { head: "Proposal", cell: (r) => <strong>{r.name}</strong> },
            { head: "Where", cell: (r) => r.where },
            { head: "What it says", cell: (r) => r.what },
          ]}
          rows={TILESET_PROPOSALS}
        />
        <p>
          <strong>Deliberately not proposed:</strong> the geoid fallback (EGM96
          or EGM2008 when a national grid is missing). That is application
          policy, not tileset data.
        </p>
        <p>
          <strong>Candidates to add:</strong> a declared chord tolerance for
          reprojected models (plan 5, section 13.4), and a <C>hosted</C>{" "}
          placement mode for content a producer or host reprojected itself
          (section 7.9).
        </p>
        <p>
          <strong>Proposed, not built:</strong> an explicit colour space in the
          styling language, using CSS Color 4 syntax (
          <C>color(srgb-linear 1 0.5 0)</C>, <C>color(display-p3 ...)</C>)
          passed through the existing <C>color('...')</C> string (the overall
          plan, section 13.18).
        </p>
        <h3>What the engine declares today</h3>
        <DataTable
          label="Tileset declarations in use"
          columns={[
            { head: "Declaration", cell: (r) => <C>{r.name}</C> },
            { head: "What it declares", cell: (r) => r.what },
            { head: "State", cell: (r) => r.state },
          ]}
          rows={DECLARATIONS}
        />
        <Written
          from="the overall plan, section 13.14, and the plan 5 spec, section 15.3"
          on="2026-11-08"
        />
      </Section>

      <Section title="WebGPU: what we'd adopt, and how ready we are">
        <p>
          The engine follows one pattern for features after V1: one seam every
          caller goes through, plus a test that fails on a bypass. A seam is
          laid only where it costs nothing today. These are less requests than a
          list of what's ready to adopt.
        </p>
        <DataTable
          label="Later WebGPU features"
          columns={[
            { head: "Feature", cell: (r) => <strong>{r.feature}</strong> },
            { head: "Where it stands", cell: (r) => r.state },
            { head: "The engine's seam", cell: (r) => r.engine },
          ]}
          rows={WEBGPU}
        />
        <Note title="A gap in this table">
          <p>
            The working group's <C>Roadmap</C> wiki page dates from 2018 and
            lists nothing after V1. "No proposal file" here means only that the
            index has none. Discussion may be happening in issues this tab
            hasn't traced.
          </p>
        </Note>
      </Section>

      <Section title="Slang and Tint">
        <p>
          On Metal, Chrome guards every Slang-generated loop: the same kernel
          body written as a WGSL <C>for</C> was even with hand-written WGSL, and
          as <C>while</C> or <C>loop</C> was 5 to 7% slower. Either fix would
          remove this upstream: Slang emitting WGSL <C>for</C> for counted
          loops, or Tint recognizing a counted loop in <C>loop</C> form. This is
          still to raise with both, and to check on Tint's HLSL and SPIR-V
          writers.
        </p>
        <Written from="the overall plan, section 3.4" on="2026-11-08" />
      </Section>

      <Sources
        ids={[
          "tiles",
          "crsSource",
          "ifc",
          "proposals",
          "bindless",
          "chrome",
          "survey",
        ]}
      />
    </Page>
  );
}
