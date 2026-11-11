import { Board, type BoardStep } from "../diagram.tsx";
import {
  C,
  Cite,
  CodeBlock,
  DataTable,
  Figure,
  Note,
  Page,
  Section,
  Sources,
  Written,
} from "../parts.tsx";

const FLOW: BoardStep[] = [
  {
    id: "smlib",
    lane: 0,
    row: 0,
    title: "SMLib",
    body: "NVIDIA's kernel, built to WebAssembly from usd-brep. Every surface comes out as a NURBS.",
  },
  {
    id: "occt",
    lane: 0,
    row: 1,
    title: "Open CASCADE",
    body: "Analytic faces stay analytic. Reads and writes STEP.",
  },
  {
    id: "host",
    lane: 0,
    row: 2,
    title: "A host's own kernel, or tiles",
    body: "The application writes the form with BrepBuilder, or a tile carries it in BENTLEY_brep.",
  },
  {
    id: "convert",
    lane: 1,
    row: 0,
    rows: 2,
    title: "Converters",
    body: "Exact splits of NURBS into Bézier patches, surface identities, curves above degree 3 approximated within a stated error, and which input each face came from.",
  },
  {
    id: "form",
    lane: 2,
    row: 0,
    rows: 2,
    title: "BrepForm",
    body: "The engine's render form: typed arrays, validated, with bounds read from the form itself.",
    accent: true,
  },
  {
    id: "draw",
    lane: 3,
    row: 0,
    title: "GPU path",
    body: "Diced per view, trimmed per pixel. Built. The Tessellation tab has it.",
  },
  {
    id: "adapter",
    lane: 3,
    row: 1,
    title: "B-rep adapter",
    body: "Answers rays, closest points and pick refinement from the form, with accuracy as terms. Built, a draft: not yet behind a drawn B-rep.",
  },
];

const LAYERS: BoardStep[] = [
  {
    id: "callers",
    lane: 0,
    row: 0,
    title: "Picks, snapping, measurement, lines of sight",
    body: "They ask the scene layer, never a backend or a tileset's triangles directly. A test enforces this.",
  },
  {
    id: "scene",
    lane: 1,
    row: 0,
    title: "Scene layer: SpatialQueries",
    body: "Reference frames and instants, batches of rays, asynchronous answers, revisions and standing queries. Built, in src/query.",
  },
  {
    id: "mesh",
    lane: 2,
    row: 0,
    title: "Mesh adapter",
    body: "Triangles as stored, placed in float64. Tileset rays and snap occlusion run on it. Built, with a draft API.",
  },
  {
    id: "field",
    lane: 2,
    row: 1,
    title: "Distance-field adapter",
    body: "The f-rep slot: answers by sphere tracing, with a step cap. Drafted, and nothing in the engine uses it yet.",
  },
  {
    id: "brep",
    lane: 2,
    row: 2,
    title: "B-rep adapter",
    body: "Chooses a route for each query: closed form, or Newton steps on patches and edges. A kernel or a mesh would be more routes, and aren't built. Built, a draft.",
  },
  {
    id: "server",
    lane: 1,
    row: 2,
    planned: true,
    title: "A host's own query service",
    body: "Answers in stages: provisional at once, exact when the service replies.",
  },
];

const FORM = [
  {
    group: "Surfaces",
    arrays:
      "surfaceKind, surfaceIdentity, surfaceError, surfaceFrame, surfaceParams, surfacePatches",
    notes:
      "One entry each: an analytic kind, or a list of rational Bézier patches. Identity and error are below.",
  },
  {
    group: "Patches",
    arrays: "patchDegree, patchFirst, patchPoints, patchDomain",
    notes:
      "Degree 1 to 7 in u and v, homogeneous float64 control points (weights above zero), and the span each covers in its surface's (u, v). The GPU path draws degree 3 and below.",
  },
  {
    group: "Faces and loops",
    arrays: "faceSurface, faceReversed, faceLoops, loopUses",
    notes:
      "A face's first loop is its outer one: counter-clockwise in (u, v), inner loops clockwise.",
  },
  {
    group: "Edge uses",
    arrays: "useEdge, useReversed, usePcurve",
    notes:
      "Each use of an edge in a loop has its pcurve in the surface's (u, v): rational Bézier segments of degree 1 to 3.",
  },
  {
    group: "Edges and vertices",
    arrays:
      "edgeVertices, edgeCurve, edgeTolerance, vertexPosition, vertexTolerance",
    notes:
      "Each edge has its exact 3D curve (rational Bézier, degree 3 at most) and a tolerance in metres.",
  },
  {
    group: "Names and version",
    arrays: "ids, version",
    notes:
      "One string table of stable source IDs (faces, then edges, then vertices) and a content version that goes up when the geometry changes.",
  },
];

const TOLERANCES = [
  {
    name: "Model tolerance",
    is: "How exact the source claims to be: the gaps a kernel allows between edges, uses and vertices.",
    where: "Queries against the source, validation, and trim fitting.",
    held: "edgeTolerance and vertexTolerance. SMLib's are 1e-5 m, Open CASCADE's 1e-7 m, and NIST's CTC-05 part 0.1 to 0.6 µm.",
    accuracy: "Yes",
  },
  {
    name: "Representation error",
    is: "How far the form's surface or curve is from the source's.",
    where:
      "Conversion: curves approximated above degree 3, refits, and later offsets and sweeps.",
    held: "surfaceError per surface. An approximated curve adds its error to its edge's tolerance. SMLib's export also reports the largest gap (approximationGap).",
    accuracy: "Yes, added to the model tolerance",
  },
  {
    name: "Display tolerance",
    is: "How far the drawn triangles or patches may be from the form's surface.",
    where: "Tessellation, for each view.",
    held: "A chordal tolerance in metres on the CPU (TessellateOptions.tolerance, reported back as BrepMesh.error), or an error in pixels on the GPU (setPatchErrorPixels). Trim curves are fitted to a ten-thousandth of the face's size.",
    accuracy:
      "No, except when an answer comes from a mesh, and then it says so",
  },
];

const KERNELS = [
  {
    what: "Size, brotli",
    smlib: "1.05 MiB (4.6 MiB raw)",
    occt: "4.8 MB (22.9 MB raw)",
  },
  { what: "Instantiate, in Node", smlib: "about 14 ms", occt: "160 to 190 ms" },
  { what: "Load, cold, in Chrome", smlib: "68 ms", occt: "250 to 310 ms" },
  {
    what: "Box minus cylinder, warm, in Node",
    smlib: "about 5 ms",
    occt: "4 to 5 ms",
  },
  {
    what: "Conversion to the form, warm, in Node",
    smlib: "about 1 ms",
    occt: "4 to 6 ms",
  },
  {
    what: "A boolean and its conversion, cold, in Chrome",
    smlib: "7 to 57 ms and 3 to 10 ms",
    occt: "18 to 89 ms and 4 to 131 ms",
  },
  {
    what: "Faces as they arrive",
    smlib: "All NURBS, so all Bézier patches with an identity",
    occt: "Analytic kinds; other surfaces as B-splines",
  },
  {
    what: "Which input a face came from",
    smlib: "An attribute on each input's faces, copied through booleans",
    occt: "The boolean's history (Modified, IsDeleted)",
  },
  { what: "STEP", smlib: "Not built", occt: "Import and export" },
  { what: "Threads", smlib: "None needed", occt: "None needed" },
  {
    what: "Licence",
    smlib: "Apache 2.0",
    occt: "LGPL 2.1 with an exception for OCCT",
  },
];

const STEP_PARTS = [
  {
    part: "FTC-11",
    file: "7.6 KB",
    faces: "6",
    imported: "7 to 11 ms",
    converted: "6 to 7 ms",
    validated: "4 to 6 ms",
    problems: "0",
  },
  {
    part: "FTC-06",
    file: "223 KB",
    faces: "144",
    imported: "92 to 104 ms",
    converted: "210 to 221 ms",
    validated: "30 to 31 ms",
    problems: "0",
  },
  {
    part: "FTC-10",
    file: "324 KB",
    faces: "214 (1 free-form)",
    imported: "122 to 149 ms",
    converted: "351 to 533 ms",
    validated: "55 to 86 ms",
    problems: "0",
  },
  {
    part: "CTC-05",
    file: "327 KB",
    faces: "208 (9 free-form)",
    imported: "123 to 135 ms",
    converted: "438 to 537 ms",
    validated: "73 to 79 ms",
    problems: "33, each under 20 µm",
  },
];

const ROUTES = [
  {
    route: "Closed form",
    for: "Ray hits and closest points on planes, cylinders, cones, spheres and tori: quadratics, quartic roots for tori, and the surfaces' stationary points. Edges that are lines too.",
    exact: "Exact in float64, to the surface",
    state:
      "Built. The answer names its route, for example closed form, cylinder.",
  },
  {
    route: "Subdivision and Newton steps",
    for: "Bézier patches (rays: subdivision, then Newton; closest points: branch and bound, then Newton) and edge curves (projection or bisection, then Newton). A hierarchy over each face's box, and each patch's control net, keeps a query to the surfaces near it.",
    exact: "Exact to the patches and curves",
    state:
      "Built. The answer's route reads Newton on Bézier patch or Newton on edge curve. A ray that doesn't settle is unknown.",
  },
  {
    route: "A kernel call",
    for: "Intersections, sections, clashes, healing, and areas and volumes.",
    exact: "The kernel's, with its own tolerance",
    state:
      "Planned. The kernels run in workers (provisional) but answer no queries yet.",
  },
  {
    route: "A mesh",
    for: "Anything, at once, while a better answer is on its way.",
    exact: "Provisional, with the tessellation's error",
    state:
      "Planned as a route. The mesh adapter exists, and nothing feeds it a drawn B-rep. The B-rep adapter's display is a reference mesh, not a route.",
  },
];

const TERMS = [
  {
    term: "Model tolerance",
    composes: "Worst-case bound",
    from: "The form's edge and vertex tolerances",
  },
  {
    term: "Representation error",
    composes: "Worst-case bound",
    from: "The form's surface errors, and approximated curves. Both converters write a surface error of 0, so today it is only an edge's, from Open CASCADE's cubic approximation",
  },
  {
    term: "Display tolerance",
    composes: "Worst-case bound",
    from: "A tile's geometric error, or a tessellation's error. Only when the answer came from a mesh.",
  },
  {
    term: "Transform between reference frames",
    composes: "Statistical (1σ), in quadrature",
    from: "The frames layer's accuracy terms",
  },
];

const DOMAIN_POINTS = [
  { rep: "Mesh", point: "(triangle, barycentrics)" },
  { rep: "B-rep", point: "(face, u, v), or (edge, t)" },
  { rep: "Curve", point: "(segment, t)" },
  { rep: "Terrain", point: "(tile, longitude, latitude)" },
  { rep: "Points", point: "(point)" },
  {
    rep: "Volume or distance field",
    point: "(cell, x, y, z), or just x, y, z",
  },
];

const TWO_BY_TWO = [
  {
    row: "Changes where content is",
    space: "A coordinate operation (a reprojection)",
    domain: "A deformer for a state: 4D construction, a survey epoch",
  },
  {
    row: "Changes only how it's drawn",
    space: "A drawn map (exaggeration, flattening, the 2D morph)",
    domain: "A drawn deformer (an analysis shape at ×50), colour fields",
  },
];

const QUERIES = [
  {
    query: "bounds",
    mesh: "Box of the placed vertices",
    field: "The field's box",
    brep: "From the form, not a tessellation (formBounds): holds the faces within 0.1% of the part's size",
  },
  {
    query: "rayHit",
    mesh: "Nearest triangle, exact for the mesh",
    field: "Sphere tracing; unknown if it runs out of steps",
    brep: "Closed forms, or subdivision and Newton on patches; unknown if one doesn't settle. Carries (u, v)",
  },
  {
    query: "closestPoint",
    mesh: "Vertex, edge or face it lands on",
    field: "Projection along the gradient",
    brep: "A face, edge or vertex: closed form, branch and bound with Newton, or the curve's projection. Carries (u, v) or t",
  },
  {
    query: "segmentDistance",
    mesh: "Exact, for near misses",
    field: "Sampled: an upper bound",
    brep: "Zero on a crossing, else 33 closest points along the segment with the minima refined: not exact, a narrow dip can be missed",
  },
  {
    query: "entity",
    mesh: "Triangles, half-edges, vertices",
    field: "One face",
    brep: "Face, loop, edge and vertex tables",
  },
  {
    query: "display",
    mesh: "Itself, with its error",
    field: "None: draws by ray marching",
    brep: "A reference mesh at the tolerance",
  },
];

const SHARED = [
  {
    piece:
      "Curve pipeline: exact source, placement, quadratic segments with an error bound, refined by view",
    vector: "Lines and outlines",
    brep: "Edges, silhouettes, sections and trim loops",
  },
  {
    piece: "Per-pixel fill coverage",
    vector: "Polygons and glyphs",
    brep: "Trimmed faces, tested in (u, v): built, in coverage.slang",
  },
  {
    piece: "Stroke styles",
    vector: "Vector strokes",
    brep: "CAD edge styles",
  },
  {
    piece: "Feature IDs and picking",
    vector: "Per feature",
    brep: "Per face, edge and vertex, with (u, v)",
  },
  {
    piece: "The exact source kept for snapping",
    vector: "The feature's own geometry",
    brep: "The surfaces and curves",
  },
];

type State = "Built" | "Provisional" | "Draft" | "Being built" | "Planned";

const STATUS: { piece: string; state: State; where: string }[] = [
  {
    piece: "The render form, its builder and validator",
    state: "Draft",
    where: "src/brep/form.ts, build.ts, validate.ts",
  },
  {
    piece: "Surface identity and representation error",
    state: "Built",
    where:
      "form.ts, build.ts. No converter writes a surface error above zero yet",
  },
  {
    piece: "The exact NURBS split, and curve approximation",
    state: "Built",
    where: "src/brep/nurbs.ts",
  },
  {
    piece: "BENTLEY_brep, the glTF extension",
    state: "Draft",
    where: "src/brep/gltf.ts, BENTLEY_brep.md. Name and schema open",
  },
  {
    piece: "SMLib in WebAssembly, and its conversion",
    state: "Built",
    where: "scripts/smlibTools.mjs, src/brep/smlib.ts",
  },
  {
    piece: "Open CASCADE in WebAssembly, and its conversion",
    state: "Built",
    where: "scripts/occtTools.mjs, src/brep/occt.ts",
  },
  {
    piece: "STEP import and export",
    state: "Built",
    where: "src/brep/occt.ts. One reader issue is open",
  },
  {
    piece: "Kernels in Web Workers",
    state: "Provisional",
    where: "kernelProtocol.ts, kernelHost.ts, kernelClient.ts",
  },
  {
    piece: "A form's bounds, with no tessellation",
    state: "Built",
    where: "src/brep/formBounds.ts",
  },
  {
    piece: "GeometryQueries, with mesh, B-rep and distance-field adapters",
    state: "Draft",
    where:
      "src/geometry. The mesh adapter serves tileset rays and snaps; the B-rep adapter isn't behind a drawn B-rep yet",
  },
  {
    piece: "The B-rep adapter",
    state: "Draft",
    where:
      "brepGeometry in src/geometry/brep.ts. Rays, closest points, segment distance, entities, bounds and display, answered from the form. Not wired to World.addBrep",
  },
  {
    piece: "Accuracy as terms that name their route",
    state: "Draft",
    where:
      "The note lists model tolerance, surface and edge terms, and GeometryAccuracy has an optional route. Only the B-rep adapter fills them. The bound-and-σ pair and display tolerance are open",
  },
  {
    piece: "Exact picks: refining a pick onto the face",
    state: "Draft",
    where:
      "refinePick(face, hint) in the B-rep adapter: Newton from the pick's (u, v), or the nearest point to its point. The example previews the same refinement (examples/brep-first-look/exact.ts)",
  },
  {
    piece: "Exact picks: the GPU writes (u, v)",
    state: "Planned",
    where:
      "The pick pass writes the face's feature ID only, so nothing calls refinePick with a real pick yet",
  },
  {
    piece: "Distance between two geometries, across reference frames",
    state: "Planned",
    where: "Needs the adapter and a closest-pair query",
  },
  {
    piece: "Queries answered by a host's service",
    state: "Planned",
    where: "A scene-layer backend",
  },
  {
    piece: "The kernel interface, and the CSG sample",
    state: "Planned",
    where: "Starts 2026-11-13",
  },
  {
    piece: "BrepSource.fromUsd, the tiler, and editing overrides",
    state: "Planned",
    where: "Nothing reads USD in the browser yet",
  },
  {
    piece: "Drawing, with trims per pixel",
    state: "Provisional",
    where: "World.addBrep. The Tessellation tab",
  },
];

const INTERFACE = `interface GeometryQueries {
  readonly kind: "mesh" | "brep" | "frep";
  readonly version: number;
  bounds(): GeometryBounds;
  rayHit(ray: QueryRay, options?: RayHitOptions): GeometryRayAnswer;
  closestPoint(point: ArrayLike<number>, options?: ClosestPointOptions):
    ClosestPoint | undefined;
  segmentDistance(from: ArrayLike<number>, to: ArrayLike<number>):
    SegmentDistance;
  entity(ref: EntityRef): EntityInfo | undefined;
  display(tolerance: number): DisplayMesh | undefined;
}

interface GeometryAccuracy {
  readonly meters: number;
  readonly exact: boolean;
  readonly note: string;   // the composed terms, and how it was found
  readonly route?: string; // B-reps: "closed form, cylinder", ...
}`;

export function Breps() {
  return (
    <Page
      title="B-reps and geometry queries"
      status="sketch"
      lede={
        <>
          How the engine holds, draws and queries exact CAD geometry: one render
          form for B-reps, kernels that stay outside the engine and hand it that
          form, and one query interface over meshes, distance fields and B-reps.
          The form, the converters for two kernels, STEP import, drawing and the
          B-rep query adapter, with accuracy as composed terms, are built. Exact
          picks need the GPU to write (u, v), which it doesn't yet.
        </>
      }
    >
      <Note title="How far it goes">
        <p>
          Built: the render form and its glTF extension (a draft), SMLib and
          Open CASCADE converting into it, STEP import and export, kernels in
          workers (provisional), and GPU drawing of every face. Drafted: the
          query interface, with mesh, B-rep and distance-field adapters. The
          mesh adapter is used, for tileset rays and snap occlusion. No drawn
          B-rep goes through the B-rep adapter yet: it answers from a form
          handed to it, and <C>World.addBrep</C> doesn&apos;t wire it in.
          Planned: a kernel or a server as more routes, the GPU writing (u, v),
          and everything that crosses representations or reference frames. The
          table at the end of this page has each piece.
        </p>
      </Note>

      <Section title="What the engine does, and what it leaves out">
        <p>
          The engine evaluates exact geometry, but never models it. Booleans,
          fillets, healing as an edit, feature history and constraints belong to
          the application, or to a kernel the application brings. The engine
          draws exact surfaces fast at any view, answers picks, snaps and
          measurements against them, and shows edits quickly.
        </p>
      </Section>

      <Section title="The render form">
        <p>
          The engine defines its own B-rep form, <C>BrepForm</C> in{" "}
          <C>src/brep/form.ts</C>: plain typed arrays, so it moves between
          workers without copying and a host with its own kernel can write it
          directly. Lengths are metres and angles are radians.
        </p>
        <DataTable
          label="What the render form holds"
          columns={[
            { head: "Group", cell: (r) => r.group },
            { head: "Arrays", cell: (r) => <C>{r.arrays}</C> },
            { head: "Notes", cell: (r) => r.notes },
          ]}
          rows={FORM}
        />
        <p>
          <strong>Analytic or Bézier.</strong> A surface is either one of five
          analytic kinds (plane, cylinder, cone, sphere, torus), each with a
          fixed parameterization the form states, or a list of rational Bézier
          patches. A NURBS surface is split into patches by{" "}
          <C>nurbsSurfaceToPatches</C>, in TypeScript, by knot insertion. That
          is exact and needs no kernel. An analytic surface is evaluated from
          its formula, which is cheaper than a patch and bounds its error from
          its curvature.
        </p>
        <p>
          <strong>Surface identity.</strong> A Bézier surface can say what it
          is: the analytic kind it lies on, with its frame and radii, kept
          beside its patches. The identity serves 3D queries and error bounds.
          It doesn't replace the patches' parameterization, because pcurves and
          picks live in that. SMLib needs it, because its cylinders and spheres
          are B-splines whose parameters aren't the form's. Giving the CPU
          tessellator the identity's curvature bound cut SMLib's sphere (1.5 m
          radius) at 1 mm from 24 thousand triangles in 53 ms, capped at 2.1 mm,
          to 15.5 thousand in 44 ms, within 1 mm.
        </p>
        <p>
          <strong>Representation error.</strong> <C>surfaceError</C> says how
          far a surface's stored geometry may be from the modeling surface, in
          metres, and is zero when exact. The builder takes it with the identity
          (<C>BrepBuilder.nurbsSurface</C>), the validator checks it, and both
          tessellators treat it as slack in their bounds. No converter writes a
          value above zero yet, because both kernels' NURBS split exactly. The
          first representation error is on edges: Open CASCADE makes plane and
          sphere intersections B-splines of degree 8, and a curve above the
          form's degree 3 becomes piecewise cubic curves within half the edge's
          tolerance (<C>approximateCubic</C>), with the error added to that
          tolerance. A box and a sphere intersected stays under 1e-5 m.
        </p>
        <p>
          <strong>The validator.</strong> <C>validateBrep</C> never throws, so
          it can check a form its caller didn't write. It checks index ranges
          and degrees, that each loop closes, that each use's pcurve lands on
          its edge's 3D curve within the edge's tolerance (against the exact
          curve, refined by Newton steps), and that an edge has one or two uses.
        </p>
        <p>
          <strong>BENTLEY_brep.</strong> A draft glTF extension carries the form
          beside a primitive's fallback triangles, so a client without the
          extension still draws. Each array is a raw bufferView, because glTF
          accessors have no float64. It is never required. <C>ids</C> use{" "}
          <C>EXT_structural_metadata</C>'s string encoding, and{" "}
          <C>surfaceIdentity</C> and <C>surfaceError</C> are optional.{" "}
          <C>parseGltf</C> reads it and drops a malformed B-rep with a warning.
          The name and schema are open.
        </p>
        <Written
          from={
            <>
              <C>src/brep/form.ts</C>, <C>build.ts</C>, <C>validate.ts</C>,{" "}
              <C>gltf.ts</C> and <C>BENTLEY_brep.md</C>, and the overall plan,
              section 13.33
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Modeling geometry and display geometry">
        <p>
          A kernel's model is its own: surfaces in its parameterization, its
          tolerances, its topology names and its edit history. What the engine
          draws is whatever the GPU evaluates fastest within a visual tolerance.
          The form sits between them. It keeps the kernel's parameterization,
          since pcurves and picks need it, and adds identity and error beside
          it. Whether the form should go further and hold a render geometry with
          its own parameterization is not decided. If it did, the pick path
          would need an exact map between the two.
        </p>
        <DataTable
          label="The three tolerances"
          columns={[
            { head: "Tolerance", cell: (r) => <strong>{r.name}</strong> },
            { head: "What it is", cell: (r) => r.is },
            { head: "Where it enters", cell: (r) => r.where },
            { head: "Held as", cell: (r) => r.held },
            { head: "Counts as accuracy?", cell: (r) => r.accuracy },
          ]}
          rows={TOLERANCES}
        />
        <p>
          <strong>Visual against measured.</strong> A pixel is a property of a
          view and a metre is a property of the geometry. A silhouette within
          half a pixel is a different number of metres at every zoom, so a
          measurement can't inherit it. The rule is that a measured answer
          states the model tolerance plus the representation error. A display
          tolerance enters only when the answer came from a mesh, and then the
          answer is provisional and says so. A pick shows the idea: the draw
          says where on the face, and the exact point is the surface evaluated
          there in float64, with no tessellation's error in it.
        </p>
        <Written
          from="the overall plan, section 13.33, the modeling-and-render-geometry brainstorm, and the form's fields"
          on="2026-11-11"
        />
      </Section>

      <Section title="CAD kernels">
        <p>
          The engine never asks a kernel to draw. A kernel makes and edits
          solids. The engine takes the result as a form, draws it on the GPU and
          answers what it can itself. A kernel is for the hard parts:
          conversion, booleans, healing, intersections, the record of which
          input a face came from, and STEP. SMLib's own tessellator is only a
          reference to test against. Neither kernel is in the engine's entry or
          bundle. Setup fetches or builds each into a store outside the
          repository, the dev server serves them at <C>/smlib/</C> and{" "}
          <C>/occt/</C>, and a page loads one only when asked.
        </p>
        <Figure caption="From kernels to the engine.">
          <Board
            label="Kernels to the render form to the engine"
            lanes={["Source", "Conversion", "Form", "Engine"]}
            steps={FLOW}
            edges={[
              { from: "smlib", to: "convert" },
              { from: "occt", to: "convert" },
              { from: "convert", to: "form" },
              { from: "host", to: "form" },
              { from: "form", to: "draw" },
              { from: "form", to: "adapter" },
            ]}
          />
        </Figure>
        <DataTable
          label="The two kernels, measured"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "SMLib", cell: (r) => r.smlib },
            { head: "Open CASCADE", cell: (r) => r.occt },
          ]}
          rows={KERNELS}
        />
        <p>
          Node timings are warm runs on one Windows machine. The Chrome ones are
          cold and were taken on the main thread, before the kernels moved to
          workers. The solids are simple analytic ones, not real models. Open
          CASCADE's conversion is slower because every read crosses its
          bindings, where SMLib writes one flat record.
        </p>

        <h3>SMLib</h3>
        <p>
          <C>scripts/smlibTools.mjs</C> fetches NVIDIA's usd-brep (Apache 2.0,
          which includes SMLib) at one pinned commit and a pinned Emscripten,
          compiles its files and links the module, with no source edits (
          <Cite id="usdBrep" />
          ). <C>scripts/smlib/bindings.cpp</C> is a small C layer over its API.
          It writes a b-rep as one flat record of numbers, and{" "}
          <C>readSmlibExport</C> in <C>src/brep/smlib.ts</C> builds the form
          from it. SMLib's threading code compiles only with a TBB flag its own
          build doesn't set, so it runs on one thread and needs no cross-origin
          isolation. It needs exceptions and a stack of at least 4 MB. Reading
          USD itself needs OpenUSD, which isn't built for the browser, so
          nothing reads USD here yet.
        </p>
        <p>
          Its analytic surfaces arrive as B-splines, so every face converts to
          Bézier patches, and the converter names each plane, cylinder, cone,
          sphere and torus as an identity from SMLib's own report of what the
          surface is. Edges are trimmed to their interval exactly, and a
          sphere's poles become zero-length edges.
        </p>

        <h3>Open CASCADE</h3>
        <p>
          Replicad's custom WebAssembly build of OpenCascade.js,{" "}
          <C>replicad-opencascadejs</C> 1.2.1, published on 6 November 2026 (
          <Cite id="replicadOcct" />
          ). Setup fetches it from npm and checks it against npm's integrity
          hash (<C>scripts/occtTools.mjs</C>). Open CASCADE is LGPL 2.1 with an
          additional exception (<Cite id="occtLicence" />
          ), unlike SMLib, so it stays a separate module for the examples and
          its licence needs checking before anything built with it is
          distributed. Its plane, cylinder, sphere and torus match the form's
          parameterizations term for term, and its cone differs only in
          measuring v along the slant. So <C>occtToForm</C> keeps the kinds,
          reads each frame off Open CASCADE's evaluator, checks it against the
          form's formula at three points, and turns a left-handed frame around.
          A picked point's (u, v) is then a real angle.
        </p>
        <p>The build's bindings have gaps, which the converter works around:</p>
        <ul>
          <li>
            An indexed map of shapes can't be made, and shapes have no hash, so
            finding a sub-shape is a linear scan. It is quadratic: fine for a
            sample, not for a big import.
          </li>
          <li>
            <C>BRep_Tool.CurveOnSurface</C> fails for a face, so pcurves come
            through <C>BRepAdaptor_Curve2d</C>.
          </li>
          <li>
            <C>Oriented()</C> returns an untyped shape, and there is no 3D curve
            approximation, so <C>approximateCubic</C> is ours.
          </li>
          <li>
            Wires aren't explored in loop order, and vertices can't order the
            uses on a cylinder's side, so uses chain by their ends in (u, v).
          </li>
        </ul>
        <p>
          <strong>Handles.</strong> Every object from the bindings lives in the
          WebAssembly heap until it is deleted. <C>withScope</C> frees a call's
          temporaries, last first, even when it throws, and only a solid
          escapes, owned by its caller. A test tracks every handle: none is
          alive once a boolean's solids are deleted, and the heap grows by less
          than 4 MiB over 200 conversions (<C>test/data/brepOcct.test.ts</C>).
        </p>

        <h3>STEP</h3>
        <p>
          <C>OcctKernel.importStep</C> reads the solids of a STEP file (AP203,
          AP214 or AP242, as Open CASCADE reads them) in metres whatever the
          file's units, with each solid's placement within compounds and
          assemblies. Free shells and surfaces aren't read. The bytes pass
          through the module's in-memory file system, as its reader only takes a
          path. <C>exportStep</C> writes AP214 in metres. A box minus a
          cylinder, and a box with a sphere on its origin corner, round-trip
          with their faces, kinds and volume kept.
        </p>
        <p>
          <strong>A reader issue.</strong> A sphere face whose loop runs along
          the seam both ways, as in a box united with a sphere on its far
          corner, comes back as the complementary patch: the corner's eighth of
          the ball, where the face is the seven eighths outside the box. The
          test that records it is marked as expected to fail. The probable cause
          is Open CASCADE issue 1652, open and uncommented when read, which
          reports that since 7.7.0 the reader takes a clockwise outer boundary
          on a sphere or torus for a hole (
          <Cite id="occtIssue1652" />
          ). The issue's workaround, a shape-fix parameter, can't be set through
          this build, because its parameter map's base type isn't bound. The
          match with our case is likely, not confirmed.
        </p>
        <p>
          <strong>NIST's samples.</strong> The example's STEP scene loads four
          of NIST's public test models for CAD software (geometry only,{" "}
          <Cite id="nistPmi" />
          ). <C>scripts/stepSamples.mjs</C> fetches NIST's zip (about 14 MB)
          into the store, checks it against a pinned hash, and keeps four files,
          each pinned by its own SHA-256. They are never committed. The files
          are in millimetres, and import converts them to metres: CTC-05 is
          0.527 by 0.559 by 0.483 m.
        </p>
        <DataTable
          label="NIST's STEP samples through Open CASCADE, measured"
          columns={[
            {
              head: "Part, file",
              cell: (r) => (
                <span style={{ whiteSpace: "nowrap" }}>
                  {r.part}, {r.file}
                </span>
              ),
            },
            { head: "Faces", cell: (r) => r.faces, numeric: true },
            { head: "Import", cell: (r) => r.imported, numeric: true },
            { head: "To the form", cell: (r) => r.converted, numeric: true },
            { head: "Validate", cell: (r) => r.validated, numeric: true },
            { head: "Problems", cell: (r) => r.problems, numeric: true },
          ]}
          rows={STEP_PARTS}
        />
        <p>
          The times are the second and third of three runs in Node on one
          Windows machine, 2026-11-11. A cold first import of CTC-05 took 144 ms
          and its conversion 569 ms. A form's bounds, read from the form itself,
          took 1 to 37 ms. CTC-05's problems are open loops and uses off their
          edge. The largest is 18.2 µm, on an edge whose tolerance is 0.6 µm, on
          a part half a metre across, and Open CASCADE calls the solid valid.
          The test holds them to under 20 µm rather than hide them. CTC-05's 208
          faces draw on the GPU. The CPU tessellator takes 768 ms for the same
          part at 1 mm.
        </p>

        <h3>Kernels in Web Workers</h3>
        <p>
          A kernel call blocks for tens to hundreds of milliseconds, so the
          kernels run in Web Workers behind a typed protocol. It is provisional,
          and the CSG sample, the first real user, will reshape it.{" "}
          <C>KernelClient</C> (<C>kernelClient.ts</C>) makes one worker on its
          first call, and a client per kernel runs both at once, since SMLib's
          context isn't thread-safe and Open CASCADE's is heavy.{" "}
          <C>KernelHost</C> (<C>kernelHost.ts</C>) runs the requests of{" "}
          <C>kernelProtocol.ts</C>: load, import a STEP file, a boolean of two
          primitives, and cancel.
        </p>
        <ul>
          <li>
            <strong>What comes back.</strong> A <C>KernelForm</C>: the form, its
            bounds from <C>formBounds</C> with no tessellation, optionally the
            validator's findings, the tag of the input each face came from, and
            optionally <C>prepareGpuPatches</C>'s result, which{" "}
            <C>World.addBrep</C> takes as <C>prepared</C>, so the page's thread
            doesn't repeat that work.
          </li>
          <li>
            <strong>Typed arrays move by transfer.</strong> An array that views
            part of a kernel's heap is copied, so a transfer never detaches the
            kernel's memory.
          </li>
          <li>
            <strong>A newer request supersedes the older.</strong> The old
            promise rejects with <C>KernelCancelled</C>, and the worker stops
            the old request at its next stage. A kernel call itself can't be
            interrupted, so a cancel waits for the call that is running.
          </li>
        </ul>
        <Written
          from={
            <>
              the overall plan, section 13.33 (the CSG spike), the code named
              above, and timings run for this page
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="One query interface for every representation">
        <p>
          A mesh, a B-rep and an implicit surface (an f-rep: a distance field)
          each answer the same queries through <C>GeometryQueries</C>, and every
          answer states its accuracy. A mesh is the case where the exact and
          displayed geometry are the same, so today's picks, snapping and
          measurement moved onto it first, with no change in results. F-reps are
          designed in from the start, so the interface isn't shaped only by
          triangles.
        </p>
        <Figure caption="Solid cards are built or drafted. Dashed cards are planned.">
          <Board
            label="Two layers of geometry queries"
            lanes={["Callers", "Scene layer", "Object layer"]}
            steps={LAYERS}
            edges={[
              { from: "callers", to: "scene" },
              { from: "scene", to: "mesh" },
              { from: "scene", to: "field" },
              { from: "scene", to: "server", vertical: true },
              { from: "server", to: "brep" },
            ]}
          />
        </Figure>
        <p>
          The scene layer carries rays through the reference frame tree, batches
          them and answers asynchronously, because a GPU engine reads results
          back a tick or more later. The object layer beneath it is synchronous,
          in float64, and works in the object's placed coordinates. An optional
          origin keeps the arithmetic precise far from the coordinates' origin,
          as at Earth-fixed scale.
        </p>
        <CodeBlock code={INTERFACE} language="ts" />
        <DataTable
          label="What each representation answers"
          columns={[
            { head: "Query", cell: (r) => <C>{r.query}</C> },
            { head: "Mesh (built)", cell: (r) => r.mesh },
            { head: "Distance field (drafted)", cell: (r) => r.field },
            { head: "B-rep (built)", cell: (r) => r.brep },
          ]}
          rows={QUERIES}
        />
        <ul>
          <li>
            A ray answer is a hit, a miss or unknown, never a guess. A distance
            field that runs out of steps says it couldn't decide.
          </li>
          <li>
            Every answer carries its accuracy: metres, whether it's exact, and a
            note in words. A tile's mesh carries its geometric error.
          </li>
          <li>
            Answers name what they landed on: a face, edge or vertex, with its
            feature ID, so a snap knows whether it found a corner or an edge. A
            B-rep's hit also carries (u, v).
          </li>
        </ul>

        <h3>The adapter chooses the route</h3>
        <p>
          Everything the render form and the kernels are sits below this
          interface. Picks, snapping, measurement and the scene layer see one
          interface for each object and never the split behind it. The B-rep
          adapter (
          <C>brepGeometry(form, {"{ matrix, origin, modelTolerance }"})</C> in{" "}
          <C>src/geometry/brep.ts</C>, beside <C>meshGeometry</C> and{" "}
          <C>sdfGeometry</C>) is built. It answers from the form, never from a
          mesh, and callers don't choose how: the adapter picks a route per
          surface. A kernel or a server would be more routes, and aren't built.
        </p>
        <DataTable
          label="The routes a B-rep adapter chooses between"
          columns={[
            { head: "Route", cell: (r) => <strong>{r.route}</strong> },
            { head: "Answers", cell: (r) => r.for },
            { head: "Accuracy", cell: (r) => r.exact },
            { head: "State", cell: (r) => r.state },
          ]}
          rows={ROUTES}
        />
        <p>
          A hierarchy over each face's box (analytic faces by intervals, Bézier
          faces by their control nets' hulls) is built on the first query. A
          face's trim is the tessellator's polygon, except within twice its sag
          of a pcurve, where the pcurves decide. Each answer names its domain
          point: <C>uv</C> on a face, or <C>t</C> along an edge, 0 at its start
          to 1 at its end. <C>refinePick(face, hint)</C> is the refine-a-pick
          entry: from a hint's (u, v), Newton onto the face's surface; from its
          point, the nearest point on the face; else the surface at its (u, v).
          It returns the exact position, normal and (u, v), whether that lies
          inside the trim, and the accuracy.
        </p>
        <DataTable
          label="The B-rep adapter measured on NIST's CTC-05"
          columns={[
            { head: "Query", cell: (r) => r.query },
            { head: "Time", cell: (r) => r.time, numeric: true },
          ]}
          rows={[
            { query: "rayHit", time: "0.03 to 0.06 ms" },
            { query: "closestPoint", time: "About 1.1 ms" },
            { query: "refinePick", time: "About 0.12 ms" },
            { query: "segmentDistance", time: "About 50 ms" },
            {
              query: "The first query, which builds the hierarchy",
              time: "0.13 to 0.16 s",
            },
          ]}
        />
        <p>
          CTC-05 is a real CAD part of 208 faces, imported from STEP with Open
          CASCADE. The times are warm runs in Node on a development machine and
          will vary. <C>segmentDistance</C> is the slow one: 33 closest points
          and their refinements. The GPU path never goes through the interface:
          it reads the form directly. The interface keeps{" "}
          <C>display(tolerance)</C> only as a convenience for consumers that
          want triangles, such as fallbacks, exports and tests. The mesh adapter
          serves tilesets today. The engine has no B-rep behind any adapter yet,
          so a pick on a drawn one returns its face and not an exact point.
        </p>

        <h3>Accuracy as composed terms</h3>
        <p>
          Today an answer's accuracy is one number in metres, a flag for exact,
          a note, and an optional <C>route</C>. The plan replaces it with terms,
          and the answer names the route it took: the source, the form, a mesh,
          or a server. The B-rep adapter moves toward that: its note lists the
          model tolerance (0.1 µm by default, Open CASCADE's confusion), the
          surface's representation error and the edge's tolerance, each in
          placed metres, and its <C>route</C> field says how the answer was
          found, such as closed form, cylinder, or Newton on Bézier patch. The{" "}
          <C>meters</C> figure is their sum. Both converters write a surface
          error of 0, so the only representation error today is on edges, from
          Open CASCADE's cubic approximation of curves above degree 3. The mesh
          adapter is the degenerate case, where the source, form and mesh are
          one, so its terms collapse to what it reports now. A server is one
          more route, and upgrades a provisional answer when it arrives.
        </p>
        <DataTable
          label="The terms of an answer's accuracy"
          columns={[
            { head: "Term", cell: (r) => r.term },
            { head: "How it composes", cell: (r) => r.composes },
            { head: "Comes from", cell: (r) => r.from },
          ]}
          rows={TERMS}
        />
        <p>
          <strong>Provisional decision, for the API review:</strong> carry both
          a worst-case bound and a statistical 1σ. Bounds add linearly. Sigmas
          add in quadrature, as the measure module's accuracy terms already do.
          A report shows both figures and never turns one into the other
          silently. Today the pick interpreter takes a bound as a 1σ; that would
          stop.
        </p>

        <h3>Domain points are the currency</h3>
        <p>
          A pick today answers with a position and works back to what it hit.
          The proposal in the plan (section 13.26, for review) reverses that:
          every draw path writes <em>which geometry</em>, as a domain point, and
          the position follows. A domain point is a discrete element plus
          continuous coordinates, and each representation has one.
        </p>
        <DataTable
          label="Domain points by representation"
          columns={[
            { head: "Representation", cell: (r) => r.rep },
            { head: "Domain point", cell: (r) => r.point },
          ]}
          rows={DOMAIN_POINTS}
        />
        <p>
          An embedding takes a domain point to true coordinates: exact on the
          CPU in float64, and evaluable on the GPU with a stated error.{" "}
          <em>Fields</em> are values on the domain: colours, scalars, element
          IDs, normals and displacements, as USD's primvars are, each with an
          interpolation class (constant, uniform, varying, vertex,
          face-varying). Queries, clipping and measurement apply only the
          changes to where content is, and never the ones that change how it is
          drawn:
        </p>
        <DataTable
          label="Two kinds of data, two meanings"
          columns={[
            { head: "", cell: (r) => <strong>{r.row}</strong> },
            { head: "Defined on space", cell: (r) => r.space },
            { head: "Defined on the domain", cell: (r) => r.domain },
          ]}
          rows={TWO_BY_TWO}
        />
        <p>
          What is built is the part that already exists on geometry:{" "}
          <C>EntityRef</C> names a face, edge or vertex with its feature ID, and
          a hit or closest point carries (u, v) where the geometry has them. The
          pick pass writes the face's feature ID. Writing (u, v), and refining
          it to an exact point with its accuracy as an entry beside{" "}
          <C>closestPoint</C>, is half built: <C>refinePick</C> on the B-rep
          adapter takes a pick hint, and the GPU doesn't write (u, v) yet. The
          example previews the refinement with Gauss–Newton steps in (u, v).
          Fields and the proposal's morph targets aren't built.
        </p>

        <h3>One use that crosses representations (planned)</h3>
        <p>
          Because exact geometry sits behind one interface, a question can cross
          representations and reference frames: the shortest distance between a
          3D Tiles reality mesh, as built, in its tileset's frame, and an edge
          of a design B-rep, as designed, placed from a projected or engineering
          frame. Each side states its accuracy: the mesh its tile's geometric
          error at the loaded level, the B-rep its model tolerance plus
          representation error, and the transform between the frames its own
          accuracy. The answer composes them. It would serve clearance between a
          designed bridge or pipe and scanned ground, and clashes between design
          and as-built.
        </p>
        <p>
          It needs the B-rep adapter, the tileset mesh adapter reporting each
          tile's geometric error as a term, a distance-between-two-geometries
          query (a closest pair, with an entity on each side) beside{" "}
          <C>segmentDistance</C>, and the frames layer's transform accuracy
          feeding the terms. Apart from the B-rep adapter, none of that exists,
          and the adapter has no drawn B-rep behind it yet. It is the example to
          write once one does. The <a href="#/frames">Frame tree</a> and{" "}
          <a href="#/precision">Precision and accuracy</a> tabs have the frames
          side.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.33 and the geometry-interface
              brainstorm in section 13.26, and <C>src/geometry</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Questions for the API review">
        <ul>
          <li>
            Should a server's staged answers come in as a scene-layer backend,
            as drafted, or should the object layer be asynchronous too?
          </li>
          <li>
            Should each object state its own reference frame and instant, or is
            that the scene layer's job?
          </li>
          <li>
            Stable source IDs need strings or a source table, not only a number
            and a feature ID. The form has the table, and an entity reference
            doesn't.
          </li>
          <li>
            Should accuracy become composed terms that name their route, with a
            bound and a 1σ kept apart, as provisionally decided above?
          </li>
          <li>
            Is display at a tolerance a query? The plan leans to the render
            form, with the interface keeping it only as a convenience.
          </li>
          <li>
            The client snap's search of the screen around the cursor isn't on
            the interface yet: it needs a cone or screen-space query.
          </li>
          <li>
            There's no acceleration structure yet. Queries take time in
            proportion to the triangles, as before.
          </li>
          <li>
            A refine-a-pick entry, and a closest pair across two geometries,
            aren't on the interface yet.
          </li>
        </ul>
      </Section>

      <Section title="Three ways in">
        <p>A form reaches the engine in three ways:</p>
        <ul>
          <li>
            <strong>Tiles.</strong> The draft glTF extension carries the B-rep
            beside a fallback mesh. Coarse tiles can stay plain meshes, with
            exact B-reps only at the finer levels. A tiler converts offline, and
            isn't built.
          </li>
          <li>
            <strong>From the host, with its own kernel.</strong> The application
            writes the form directly as typed arrays and loads no WebAssembly.
          </li>
          <li>
            <strong>From the host, batteries included.</strong> SMLib or Open
            CASCADE in a worker converts what an application exports. A planned{" "}
            <C>BrepSource.fromUsd</C> would convert USD BRep or NURBS the same
            way. SMLib's other jobs are healing, and surface intersection for
            sections and clashes. None of it is in the core.
          </li>
        </ul>
      </Section>

      <Section title="Drawing them">
        <p>
          Every face of a B-rep is drawn by one GPU path, built and provisional
          (<C>World.addBrep</C>). Each face becomes span records, one for each
          Bézier patch or angular piece of an analytic surface. They are diced
          for each view to an error in pixels, evaluated in the vertex stage
          from the surface's own formulas or de Casteljau, and a trimmed face is
          tested per pixel against its pcurves. The CPU tessellator remains for
          the fallback mesh, faces with a patch above degree 3, the example's
          overlays and tests. The <a href="#/tessellation">Tessellation tab</a>{" "}
          has the pipeline, the bounds, the trim test and what was measured.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.33, and{" "}
              <C>src/scene/world/brep.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Exact answers, mostly without a kernel">
        <ul>
          <li>
            <strong>Picks.</strong> The pick fragment writes the face ID, and
            the plan has it write (u, v) too. The CPU then evaluates the surface
            there in float64 with a Newton step, so a pick is exact with no
            ray-surface solve. <C>refinePick</C> is built, and the (u, v)
            readback isn't: today a pick returns the face.
          </li>
          <li>
            <strong>Closest points and ray hits.</strong> Closed form on
            analytic surfaces; subdivision and Newton steps on Bézier patches. A
            hierarchy over the faces' and patches' boxes skips most of them,
            since a net's hull holds its patch exactly. Built, synchronous, on
            the calling thread. A worker is planned.
          </li>
          <li>
            <strong>Areas, volumes and lengths.</strong> Quadrature on patches,
            or the kernel, never a sum over triangles.
          </li>
          <li>
            <strong>The kernel only for the hard parts:</strong> intersections,
            healing and conversion.
          </li>
          <li>
            <strong>A host's own service.</strong> The client answers at once
            from what it has: exact if the exact data is loaded, otherwise
            provisional, with the tessellation's error stated. It then asks the
            service, by stable entity ID, and upgrades the marker without a jump
            when the answer arrives. A moving cursor cancels stale requests.
          </li>
          <li>
            <strong>What tiles must carry for that:</strong> stable source IDs
            for elements, faces, edges and vertices, not only feature indices
            local to a tile, and a content version, so an answer about a newer
            model is noticed.
          </li>
        </ul>
        <p>
          Most of this is planned. The B-rep adapter covers closest points, ray
          hits, the distance from a segment, and the refined pick.
        </p>
      </Section>

      <Section title="Editing">
        <p>
          Modeling, undo, saving and collaboration are the application's. The
          engine is to show changing geometry fast and correctly. None of this
          is built: <C>World.addBrep</C> and <C>removeBrep</C> take whole forms.
        </p>
        <ul>
          <li>
            An edited element hides its tiled version, by stable ID across every
            tile that holds it, and draws a live version until republished tiles
            replace it.
          </li>
          <li>
            Updates go face by face: only changed patches upload, and the GPU
            re-tessellates them on the next tick.
          </li>
          <li>
            Transient geometry for drag previews and handles, with picking
            optional.
          </li>
          <li>
            Queries see the edit, in live geometry and tiles both, leaving out
            the element being dragged.
          </li>
          <li>
            Topology names come from the kernel, so a selection survives an edit
            that splits a face. Both kernels answer which input a face came
            from, which is a first step, but neither gives stable names yet.
          </li>
        </ul>
      </Section>

      <Section title="Where B-reps and vectors meet">
        <p>
          B-reps and vector rendering share most of their drawing kernels. A
          trim loop is a small glyph in (u, v), and a B-rep edge is a vector
          line with an exact source.
        </p>
        <DataTable
          label="What B-reps and vectors share"
          columns={[
            { head: "Shared piece", cell: (r) => r.piece },
            { head: "Vectors use it for", cell: (r) => r.vector },
            { head: "B-reps use it for", cell: (r) => r.brep },
          ]}
          rows={SHARED}
        />
        <p>
          Curved-surface tessellation isn't shared with vectors. It's shared
          with reprojected meshes instead.
        </p>
        <p>
          <strong>Reprojection, one rule for both.</strong> Evaluate in source
          coordinates, then place each point. Test coverage in intrinsic
          coordinates, (u, v) or the source plane, which reprojection can't
          change. A large planar face under a non-rigid reprojection isn't
          planar once placed, so it subdivides, but its coverage test doesn't
          change. Quadratic segments are made after placement, with their error
          measured there, and snaps and measurements go back to the exact
          source. Measurements name their reference frame: a distance in design
          coordinates and one on the ground differ by the projection's scale
          factor.
        </p>
        <p>
          <strong>Who sets the shared kernels.</strong> B-rep work starts first,
          but vectors set the kernels both use, because vectors are the harder
          user: coverage under dense glyphs and labels, and strokes with a
          styling language's full control. So the order is:
        </p>
        <ol>
          <li>
            B-rep work that doesn't touch the shared kernels: the spikes, the
            query interface, the render form, patch tessellation through
            placement, and exact picks, snapping and measurement.
          </li>
          <li>
            The vector design sets the shared curve, coverage and stroke
            contracts, with B-rep trims and edges as stated requirements.
          </li>
          <li>B-rep trims and edges move onto those kernels.</li>
          <li>
            Vectors build the rest: styling, labels, the columnar store that
            replaces entities, and draping.
          </li>
        </ol>
        <p>
          In practice the coverage kernel was built first, for B-rep trims:{" "}
          <C>coverage.slang</C>, written for the vector fills to share. The
          vector design's contracts are still to be set over it.
        </p>
        <Written from="the overall plan, section 13.33" on="2026-11-11" />
      </Section>

      <Section title="What's built and what's planned">
        <DataTable
          label="B-reps and the geometry interface: built and planned"
          columns={[
            { head: "Piece", cell: (r) => r.piece },
            { head: "State", cell: (r) => r.state },
            { head: "Where, and what's open", cell: (r) => r.where },
          ]}
          rows={STATUS}
        />
        <p>
          &quot;Draft&quot; and &quot;provisional&quot; mean built and working,
          ahead of an API review. Still open: the extension's name and schema;
          whether tiles store NURBS or pre-split Bézier patches (size against
          loader work); how B-rep edges meet the vector design's exact circles
          and clothoids; both kernels on real trimmed models, in speed,
          correctness and memory; Open CASCADE's licence before anything is
          distributed; the USD input path; and F-rep drawing by ray marching
          with a step count.
        </p>
      </Section>

      <Sources
        ids={[
          "usdBrep",
          "replicadOcct",
          "occtLicence",
          "occtIssue1652",
          "nistPmi",
        ]}
      />
    </Page>
  );
}
