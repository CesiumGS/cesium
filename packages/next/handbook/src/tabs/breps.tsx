import { Board, type BoardStep } from "../diagram.tsx";
import {
  C,
  CodeBlock,
  DataTable,
  Figure,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

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
    body: "Triangles as stored, placed in float64. Tileset rays and snap occlusion run on it. Drafted.",
  },
  {
    id: "field",
    lane: 2,
    row: 1,
    title: "Distance-field adapter",
    body: "The f-rep slot: answers by sphere tracing, with a step cap. Drafted.",
  },
  {
    id: "brep",
    lane: 2,
    row: 2,
    planned: true,
    title: "B-rep adapter",
    body: "Analytic surfaces in closed form, Bézier patches by subdivision and Newton steps.",
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

const QUERIES = [
  {
    query: "bounds",
    mesh: "Box of the placed vertices",
    field: "The field's box",
    brep: "Patch hulls",
  },
  {
    query: "rayHit",
    mesh: "Nearest triangle, exact for the mesh",
    field: "Sphere tracing; unknown if it runs out of steps",
    brep: "From the pick's (u, v), one Newton step",
  },
  {
    query: "closestPoint",
    mesh: "Vertex, edge or face it lands on",
    field: "Projection along the gradient",
    brep: "Closed form, or subdivision and Newton",
  },
  {
    query: "segmentDistance",
    mesh: "Exact, for near misses",
    field: "Sampled: an upper bound",
    brep: "Subdivision",
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
    brep: "Trimmed faces, tested in (u, v)",
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

const SMLIB = [
  { what: "Size, brotli", value: "1.11 MiB (5.1 MB raw)" },
  { what: "Instantiate", value: "about 11 ms" },
  { what: "Tessellate a box, cylinder, sphere", value: "3, 7.5 and 11 ms" },
  { what: "Threads", value: "None needed, so no cross-origin isolation" },
  { what: "Needs", value: "Exceptions, and a stack of at least 4 MB" },
  { what: "OpenUSD, Boost, Python", value: "Not needed for the kernel" },
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
}`;

export function Breps() {
  return (
    <Page
      title="B-reps and geometry queries"
      status="sketch"
      lede={
        <>
          How the engine is meant to draw and query exact CAD geometry: one
          query interface for meshes, B-reps and implicit surfaces, one render
          form for B-reps, and the kernels B-reps share with vector rendering.
          The query interface is drafted; the rest is planned.
        </>
      }
    >
      <Note title="How far it goes">
        <p>
          The query interface and its mesh and distance-field adapters were
          drafted on 2026-11-09, and the render form, its builder and validator,
          and the glTF extension draft on 2026-11-10, all ahead of an API
          review, with open questions. B-reps load from glTF, but nothing draws
          them yet.
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

      <Section title="One query interface for every representation">
        <p>
          A mesh, a B-rep and an implicit surface (an f-rep: a distance field)
          each answer the same queries, and every answer states its accuracy. A
          mesh is the case where the exact and displayed geometry are the same,
          so today's picks, snapping and measurement move onto it first, with no
          change in results. F-reps are designed in from the start, so the
          interface isn't shaped only by triangles.
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
          The scene layer already exists: it carries rays through the frame
          tree, batches them and answers asynchronously, because a GPU engine
          reads results back a tick or more later. The draft adds the object
          layer beneath it. It is synchronous, in float64, and works in the
          object's placed coordinates. An optional origin keeps the arithmetic
          precise far from the coordinates' origin, as at Earth-fixed scale.
        </p>
        <CodeBlock code={INTERFACE} language="ts" />
        <DataTable
          label="What each representation answers"
          columns={[
            { head: "Query", cell: (r) => <C>{r.query}</C> },
            { head: "Mesh (drafted)", cell: (r) => r.mesh },
            { head: "Distance field (drafted)", cell: (r) => r.field },
            { head: "B-rep (planned)", cell: (r) => r.brep },
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
            feature ID, so a snap knows whether it found a corner or an edge.
          </li>
        </ul>
        <Written
          from={
            <>
              the overall plan, section 13.33, and the draft in{" "}
              <C>src/geometry</C>
            </>
          }
          on="2026-11-09"
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
            and a feature ID.
          </li>
          <li>
            Should accuracy compose with the measure module's accuracy terms,
            and is it a bound or one standard deviation?
          </li>
          <li>
            Is display at a tolerance a query, or does it belong to the render
            form?
          </li>
          <li>
            The client snap's search of the screen around the cursor isn't on
            the interface yet: it needs a cone or screen-space query.
          </li>
          <li>
            There's no acceleration structure yet. Queries take time in
            proportion to the triangles, as before.
          </li>
        </ul>
      </Section>

      <Section title="One render form, three ways in">
        <p>
          The engine defines its own B-rep form, as it takes precompiled shaders
          or compiles them at run time:
        </p>
        <ul>
          <li>
            <strong>Tiles.</strong> A draft glTF extension carries the B-rep
            beside a fallback mesh, so a client without the extension still
            draws. Coarse tiles can stay plain meshes, with exact B-reps only at
            the finer levels. A tiler converts offline.
          </li>
          <li>
            <strong>From the host, with its own kernel.</strong> The application
            writes the form directly as typed arrays and loads no WebAssembly.
          </li>
          <li>
            <strong>From the host, batteries included.</strong> USD BRep or
            NURBS converts through SMLib built to WebAssembly in a worker,
            loaded only on first use.
          </li>
        </ul>
        <p>
          The form keeps analytic surfaces as they are (plane, cylinder, cone,
          sphere, torus). NURBS are split into rational Bézier patches by the
          loader, in TypeScript, which is exact and needs no kernel. Each face
          has trim loops in its own parameter space. Face, loop, edge and vertex
          tables give each edge its exact 3D curve and its two faces. Every
          entity has a stable source ID and a tolerance, and the form has a
          content version.
        </p>
        <p>
          SMLib's jobs are conversion from what applications export, including
          surfaces that aren't NURBS, such as offsets and sweeps; healing;
          surface intersection for sections and clashes; and a reference
          tessellation to test the GPU path against. It is never in the core.
        </p>
        <DataTable
          label="SMLib in WebAssembly, measured"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Measured", cell: (r) => r.value },
          ]}
          rows={SMLIB}
        />
        <p>
          Built with Emscripten and run under Node, with no source edits. The
          timings are simple analytic solids, not real models. Its threading
          library was replaced by a short serial stand-in, so tessellation runs
          on one thread in each worker. Reading USD itself needs OpenUSD, which
          would be large to build for the browser; a small reader of our own, or
          converting offline, looks cheaper.
        </p>
        <Written
          from="the overall plan, section 13.33, Spike A result"
          on="2026-11-09"
        />
      </Section>

      <Section title="Drawing them">
        <p>
          B-reps are tessellated on the GPU for each view: edges first, patches
          by screen-space error, and trims tested per pixel. The{" "}
          <a href="#/tessellation">Tessellation tab</a> has the design and what
          a spike measured.
        </p>
      </Section>

      <Section title="Exact answers, mostly without a kernel">
        <ul>
          <li>
            <strong>Picks.</strong> The winning pick fragment writes the face ID
            and (u, v). The CPU evaluates the surface there in float64 with one
            Newton step, so a pick is exact with no ray-surface solve.
          </li>
          <li>
            <strong>Closest points and ray hits.</strong> Closed form on
            analytic surfaces; subdivision and Newton steps on Bézier patches,
            in a worker.
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
      </Section>

      <Section title="Editing">
        <p>
          Modeling, undo, saving and collaboration are the application's. The
          engine shows changing geometry fast and correctly:
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
            that splits a face.
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
        <Written from="the overall plan, section 13.33" on="2026-11-09" />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>The extension's name, and review of its schema.</li>
          <li>
            Whether tiles store NURBS or pre-split Bézier patches: size against
            loader work.
          </li>
          <li>
            How B-rep edges meet the vector design's exact circles and
            clothoids.
          </li>
          <li>SMLib on real trimmed models: speed, correctness, memory.</li>
          <li>The USD input path.</li>
          <li>F-rep drawing, by ray marching bounded by a step count.</li>
        </ul>
      </Section>
    </Page>
  );
}
