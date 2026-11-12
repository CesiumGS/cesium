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
    name: "Alignments",
    where: "3D Tiles, possibly glTF",
    what: "Horizontal and vertical alignment geometry as tileset data: lines, arcs, clothoid spirals, grades, parabolic vertical curves and stationing, with segment kinds named after IFC 4.3's IfcAlignment. Exact snapping and station-offset readouts then work on streamed content.",
  },
  {
    name: "A declared coordinate operation",
    where: (
      <>
        Beside <C>EXT_geospatial_crs</C> in the 3D Tiles 2.0 draft
      </>
    ),
    what: "Which operation the producer used to reproject, as WKT2 COORDINATEOPERATION or BOUNDCRS rather than a PROJ pipeline string, so a consumer can reproduce the placement exactly, and an accuracy for it. Every grid it names must be a published, hashed grid. A CRS names where the content is, not how it was moved there.",
  },
  {
    name: "IFC's scale semantics for a local site",
    where: (
      <>
        3D Tiles 2.0 draft, after <Cite id="ifc" />
      </>
    ),
    what: "A local CRS with EXT_georeference already gives an origin and, from the node's own transform, a rotation and scale. What may be missing is IfcMapConversionScaled's separate horizontal and vertical scale factors and what they scale (grid or ground distances). To check against the draft before proposing anything.",
  },
];

const DECLARATIONS = [
  {
    name: "BENTLEY_engineering_frame",
    what: "Declares a tileset's engineering frame: its design CRS, placement mode and site transform. It composes with ESRI_crs, the 3D Tiles 2.0 draft's EXT_geospatial_crs and EXT_georeference, and 3DTILES_ellipsoid rather than replacing them.",
    state:
      "In use by the design globe. The owner decided on no placement modes (plan section 13.26, 2026-11-11), so the mode field goes with the API review (5i), and the declaration may shrink to what the 2.0 draft's extensions can't say, such as a site transform for a whole tileset. 5f may add a declared chord tolerance.",
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
      "A seam for reprojected models and B-reps, in plan 5, section 8. Built for B-reps: every face is diced on the GPU each view, at degrees 1 to 7, with per-pixel trims, behind a provisional API. A reprojected model isn't subdivided: tessellation through a route is a spike. See the Tessellation tab.",
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
          CRS (<C>ESRI_crs</C> in 3D Tiles 1.1, and in the 3D Tiles 2.0 draft,
          which <Cite id="tiles" /> lists as in development,{" "}
          <C>EXT_geospatial_crs</C> with its <C>_wkid</C> and <C>_wkt2</C>{" "}
          format extensions; <Cite id="crsSource" />, an open draft, isn&apos;t
          in the branch&apos;s list) and its placement (<C>EXT_georeference</C>:
          a node anchored at a longitude, latitude and height, with
          east-up-north axes applied after the node&apos;s transform) and body (
          <C>3DTILES_ellipsoid</C>). Those extensions are in glTF 2.1&apos;s
          vendor folder on the CesiumGS/glTF branch <C>3d-tiles-2.0</C>. The
          CRS&apos;s type (geographic, geocentric, projected, compound or local)
          already says how content reaches the Earth, so the earlier idea of a
          placement mode on the CRS is dropped: the owner decided against it
          (plan, section 13.26, 2026-11-11). The type selects the route: a
          geocentric CRS is the identity, a geographic, projected or compound
          one is a coordinate operation, and a local one with{" "}
          <C>EXT_georeference</C> or a site transform is a rigid edge. The
          declaration composes with those, and only what is new is worth
          proposing:
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
          reprojected models (plan 5, section 13.4). A <C>hosted</C> placement
          mode is no longer a candidate: content already in the body&apos;s
          frame is a geocentric CRS, whose route is the identity (section
          13.26).
        </p>
        <p>
          <strong>Brainstorm, nothing decided:</strong> a next-generation
          styling language. The 3D Tiles 1.x language is already a small subset
          of JavaScript. The plan&apos;s recommendation (section 13.38) is that
          the spec define the language and an IR with a JSON form, with
          JavaScript or TypeScript as one front end onto it, not the definition,
          and that the same IR serve transform functions and vector styling.
        </p>
        <p>
          <strong>Proposed, not built:</strong> an explicit colour space in the
          styling language, using CSS Color 4 syntax (
          <C>color(srgb-linear 1 0.5 0)</C>, <C>color(display-p3 ...)</C>)
          passed through the existing <C>color('...')</C> string (the overall
          plan, section 13.18).
        </p>
        <p>
          <strong>What the engine reads today:</strong> a tileset's CRS from{" "}
          <C>ESRI_crs</C>, or from <C>EXT_geospatial_crs_source</C>, and its own{" "}
          <C>BENTLEY_engineering_frame</C>. The glTF-level{" "}
          <C>EXT_geospatial_crs</C> (with its <C>wkid</C> and <C>wkt2</C>{" "}
          formats) and <C>EXT_georeference</C> aren&apos;t read yet. Reading
          them is a small step, planned with the API review (5i), where{" "}
          <C>georeferenceTileset</C> picks the route from the CRS&apos;s type.
          The reprojection nodes that routes use (UTM, transverse Mercator,
          Lambert conformal conic, web Mercator) are built.
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
          from="the overall plan, sections 13.14, 13.26 and 13.37, and the plan 5 spec, section 15.3"
          on="2026-11-12"
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
