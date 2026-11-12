import { Board, type BoardStep } from "../diagram.tsx";
import {
  C,
  Cite,
  CodeBlock,
  DataTable,
  Figure,
  Flow,
  Note,
  Page,
  Section,
  Sources,
  Written,
} from "../parts.tsx";

const PIPELINE: BoardStep[] = [
  {
    id: "spans",
    lane: 0,
    row: 0,
    title: "Span records",
    body: (
      <>
        <C>prepareGpuPatches</C>: one 48-word record for each face and span,
        with its error constants, speeds and bounding spheres. Control nets
        follow, once each.
      </>
    ),
  },
  {
    id: "trims",
    lane: 0,
    row: 1,
    title: "Trim pieces",
    body: (
      <>
        <C>buildFaceTrim</C>: a trimmed face's loops as monotone quadratics, in
        bands of v.
      </>
    ),
  },
  {
    id: "dice",
    lane: 1,
    row: 0,
    title: "Cull, dice, arguments",
    body: (
      <>
        <C>dicePatches</C> sizes each span's grid for the view's pixels and
        lists chunks of 4 × 4 cells. <C>writePatchArgs</C> writes one indexed
        indirect draw.
      </>
    ),
  },
  {
    id: "vertex",
    lane: 2,
    row: 0,
    title: "Vertex stage",
    body: (
      <>
        <C>vsPatch</C> evaluates a chunk's 5 × 5 vertices: the surface and its
        exact normal, then the draw's placement.
      </>
    ),
  },
  {
    id: "fragment",
    lane: 2,
    row: 1,
    title: "Trim test",
    body: (
      <>
        A trimmed face's fragment tests its (u, v) against the pieces, and
        discards outside.
      </>
    ),
  },
];

const PATHS = [
  {
    path: "GPU patch draws",
    how: "Each view, in compute, to an error in pixels: half a pixel unless the draw says otherwise. Trims tested per pixel.",
    uses: (
      <>
        Every face the GPU can evaluate, in the main pass, shadows, ambient
        occlusion, picks and, for a blended material, the translucent passes,
        through <C>World.addBrep</C>.
      </>
    ),
  },
  {
    path: "CPU tessellator",
    how: (
      <>
        Once, to a chordal error in metres, on a uniform grid for each face.
        Trims by discarding cells. <C>tessellateBrep</C>.
      </>
    ),
    uses: (
      <>
        The <C>cpuFaces: &quot;trimmed&quot;</C> diagnostic of{" "}
        <C>World.addBrep</C>, which draws the trimmed faces as a CPU mesh to
        compare with the GPU's. The fallback mesh beside a b-rep in a glTF file,
        which the plan has a tiler write offline. The B-rep adapter's{" "}
        <C>display(tolerance)</C> mesh. The edge lines and overlays in the
        first-look example. The reference in tests and spikes.
      </>
    ),
  },
];

const BOUNDS = [
  {
    surface: "Plane",
    sag: "None: one cell.",
  },
  {
    surface: "Cylinder, cone",
    sag: "The sagitta of a circle of the widest radius, 2 r sin²(θ / 4), with θ a cell's width in angle. None along the ruling: one cell there.",
  },
  {
    surface: "Sphere",
    sag: "The meridian's sagitta, plus the parallel's sagitta scaled by the widest cosine of latitude.",
  },
  {
    surface: "Torus",
    sag: "The sagitta of the circle of R + r about the axis, plus that of the tube's circle r.",
  },
  {
    surface: "Rational Bézier on a cylinder, cone or sphere",
    sag: "The same, from the identity. A NURBS circle isn't uniform in angle, so θ is the patch's bounded rate in angle times the cell's width. A sphere's chord comes from the bounded speeds.",
  },
  {
    surface: "Any other rational Bézier",
    sag: "(P_ss h² + 2 P_st h k + P_tt k²) / 8, from bounds on the second derivatives.",
  },
];

const CPU_NUMBERS = [
  {
    case: "SMLib sphere, radius 1.5 m, 1 mm, before the identity bound",
    triangles: "24,000",
    time: "53 ms",
    error: "Capped at 2.1 mm",
  },
  {
    case: "The same, with the sphere's identity",
    triangles: "15,500",
    time: "44 ms",
    error: "Within 1 mm",
  },
  {
    case: "Box minus a cylinder, 1 mm",
    triangles: "7,500",
    time: "18 ms",
    error: "Within 1 mm",
  },
  {
    case: "200 analytic faces, 550 spans",
    triangles: "7,700",
    time: "19–22 ms",
    error: "The same as the GPU run's",
  },
  {
    case: "NIST CTC-05, 208 faces, 1 mm",
    triangles: "373,000",
    time: "720–770 ms",
    error: "Within 1 mm",
  },
];

const CONSTANTS = [
  {
    surface: "Cylinder, cone",
    d: "w / 8, 0, 0",
    note: "w is the widest radius in the span: a cone's larger end.",
  },
  {
    surface: "Sphere",
    d: "r cos φ / 8, 0, r / 8",
    note: "φ is the latitude in the span nearest the equator.",
  },
  {
    surface: "Torus",
    d: "(R + r) / 8, 0, r / 8",
    note: "",
  },
  {
    surface: "Rational Bézier on a cylinder or cone",
    d: "w a² / 8, 2 w a b / 8, w b² / 8",
    note: "w is the radius, and a and b the patch's rates in angle per unit u and v.",
  },
  {
    surface: "Rational Bézier on a sphere",
    d: "k a², 2 k c, k b²",
    note: "a, b and c are the bounded speeds and their dot product per unit. k bounds the chord's sag from the span's whole chord.",
  },
  {
    surface: "Any other rational Bézier",
    d: "P_ss / 8, 2 P_st / 8, P_tt / 8",
    note: "Per unit parameter squared, so each is divided by the patch's widths. Bounds hold for any positive weights.",
  },
];

const TOLERANCES = [
  {
    which: "Model",
    what: "How exact the source claims to be: an edge's or vertex's gap, 1e-6 m as built.",
    enters:
      "A floor for the trims' fit: a trim piece is fitted to the larger of the face's least edge tolerance and the display tolerance. Nowhere in the dicing.",
  },
  {
    which: "Representation",
    what: "How far the form's surface is from the source's. A NURBS split into Bézier patches has none. A surface that was approximated carries it as surfaceError.",
    enters:
      "The CPU's stated error adds it. The GPU keeps it on the span, outside the display error, and never dices to it.",
  },
  {
    which: "Display",
    what: "Pixels, for one view.",
    enters:
      "The dice's target (0.5 px by default, errorPixels), and the trims' fit: 1e-4 of a face's size, a tenth of a pixel on a face that fills a thousand pixels. The CPU tessellator's tolerance, in metres, is the same kind.",
  },
];

const BEFORE_AFTER = [
  {
    what: "Vertex invocations, 200 faces and 5,150 cells",
    before: "211,200 (41 a cell)",
    after: "18,750 (3.6 a cell)",
  },
  {
    what: "GPU frame, the same 200 faces",
    before: "0.74 ms",
    after: "0.12 ms (cull 0.011, dice 0.009, opaque 0.10)",
  },
  {
    what: "CTC-05's GPU time, at 1.3 radii",
    before: "0.60 ms",
    after: "0.10–0.13 ms",
  },
  {
    what: "CTC-05's trim pieces",
    before: "5,624",
    after: "3,531",
  },
  {
    what: "CTC-05's trim time",
    before: "157 ms",
    after: "53 ms",
  },
  {
    what: "CTC-05's busiest band",
    before: "66 pieces, bands at most 64",
    after: "27 pieces, bands up to 256",
  },
  {
    what: "The plate's pieces and bands",
    before: "54 pieces in 64 bands",
    after: "22 pieces in 32 bands",
  },
  {
    what: "Span preparation, 200 analytic faces",
    before: "24 ms",
    after: "9 ms",
  },
  {
    what: "Span and trim preparation, CTC-05",
    before: "180–240 ms",
    after: "115–120 ms",
  },
];

const CTC = [
  {
    what: "Faces drawn",
    gpu: "208 of 208",
    cpu: "208",
  },
  {
    what: "Work before drawing, once",
    gpu: "115–120 ms: spans and trims",
    cpu: "720–770 ms: the grids, to 1 mm",
  },
  {
    what: "GPU time, at 1.3 radii",
    gpu: "0.10–0.13 ms",
    cpu: "0.47 ms",
  },
  {
    what: "Triangles",
    gpu: "Per view, to half a pixel; not recorded for this part",
    cpu: "373,000 at 1 mm",
  },
  {
    what: "Where a trim meets a curve",
    gpu: "Clean edge, cut per pixel",
    cpu: "A sawtooth, one cell wide",
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

const CHECKS = [
  {
    where: "spikes/brepPatches.html",
    checks:
      "An analytic cylinder, a sphere's span, a weighted rational patch and a weighted patch of degree 5 × 4 (the wide path), each at 20 m and 5.5 m, read back as bytes the fragment stage writes: every interior pixel's point against the true surface. The counts against the CPU twin. No uncovered pixel inside a face's silhouette. A warped patch against the twin. Shadows, ambient occlusion and picks raise no GPU error.",
    result:
      "Within 0.32 px of the surface (target 0.5 px); the 5 × 4 patch within 0.055 px. Counts match, no cracks, the warp matches.",
  },
  {
    where: "spikes/brepTrims.html (runBrepTrims)",
    checks:
      "Each pixel's classification against the CPU's, on a plate with round, rectangular and triangular holes, a cylinder drilled across and a trimmed B-spline face. Closed solids for pinholes along seams: a box minus a cylinder, the same from Open CASCADE, and CTC-05. Shadows, ambient occlusion and picks. The times against tessellateBrep.",
    result:
      "17 of 17 checks pass, in about 30 s headless on an NVIDIA RTX 3000 Ada, among them CTC-05: 208 of 208 faces on the GPU, with no pinholes at three distances. The gallery draws 39 of 39 faces on the GPU.",
  },
  {
    where: "test/brepGpuPatches.test.ts",
    checks:
      "Records for each surface kind. The error constants against dense sampling of the true surface, including weights that aren't 1 and a sphere's pole. The counts keep the target, put the same cells on a boundary two spans share, and grow under a placement's curvature. The winding of a diced span.",
    result: "Offline, no GPU.",
  },
  {
    where: "test/brepGpuTrims.test.ts",
    checks:
      "The float64 twin of the fragment's test against the CPU's classification, away from the boundary. The dilation's reach. Tolerances. The loop closing straight pieces. That skipping the dilation's taps never changes an answer.",
    result: "Offline, no GPU.",
  },
  {
    where: "test/brepTessellateBounds.test.ts",
    checks:
      "Every CPU triangle sampled densely against the true cylinder, sphere, cone, torus and free-form patches with weights that aren't 1, within the stated error. The Bernstein bounds against exact on a quadratic arc.",
    result: "Offline.",
  },
  {
    where: "test/brepPatchDraws.test.ts, test/patchLayout.test.ts",
    checks:
      "World.addBrep's draws and pipelines, and that the shaders read the span, trim and chunk words where the TypeScript writes them.",
    result: "Offline.",
  },
];

const FORMULA = `error(n_u, n_v)  <=  C_u / n_u²  +  C_uv / (n_u n_v)  +  C_v / n_v²     metres
C_u = D_u (u width)²    C_uv = D_uv (u width)(v width)    C_v = D_v (v width)²`;

const DICE = `pixels = rows · scale / depth        pixels per model metre, at the face's nearest point
error  = target / pixels             metres a cell may leave
D_u / ρ_u²  +  D_uv / (ρ_u ρ_v)  +  D_v / ρ_v²  <=  error      ρ: cells per unit of u and v
n_u = clamp(ceil(ρ_u · u width), 1, 64)    n_v likewise`;

export function Tessellation() {
  return (
    <Page
      title="Tessellation"
      status="current"
      lede={
        <>
          A b-rep is drawn by one GPU path for every face: span records diced
          each view to an error in pixels, evaluated in the vertex stage, with
          trims tested per pixel. A CPU tessellator is still there for the
          fallback mesh, for mesh queries and for tests. This tab says what the
          code does, the bounds it rests on, and what has been measured.
        </>
      }
    >
      <Note title="How much of this is built">
        <p>
          The GPU path is built for every face whose patches are of degree 1 to
          7 (<C>MAX_GPU_DEGREE</C>), and has run on one GPU, an NVIDIA RTX 3000
          Ada, through the lab&apos;s spikes. Only a face with nothing to draw
          is <C>unsupported</C>. There is no CPU mesh in drawing, apart from the{" "}
          <C>cpuFaces: &quot;trimmed&quot;</C> diagnostic. The call is
          provisional and internal, ahead of the API review.
        </p>
        <p>
          Only b-reps are diced. The plan has one engine serving meshes under a
          route too. A spike subdivides a mesh by the route&apos;s height (see
          Meshes the engine didn&apos;t generate), but it isn&apos;t wired in,
          so no mesh is subdivided in the engine today, and the last sections
          list what else isn&apos;t built. A b-rep in a glTF file is read, but
          the model path doesn&apos;t draw it: a host gives the form to{" "}
          <C>World.addBrep</C>.
        </p>
      </Note>

      <Section title="Two paths, and what each is for">
        <p>
          The CPU tessellator was first, and drew everything. It cost too much
          and drew trims badly. NIST's CTC-05 part, a real CAD model of 208
          faces, takes it 720 to 770 ms and 373,000 triangles at 1 mm, and a
          planar face shows a sawtooth wherever its trim meets a curve, because
          the trim is a cell being kept or dropped. The GPU path replaced it in
          the drawing, so the engine no longer needs a mesh to draw a b-rep.
        </p>
        <DataTable
          label="The two tessellation paths"
          columns={[
            { head: "Path", cell: (r) => r.path },
            { head: "How it chooses and cuts", cell: (r) => r.how },
            { head: "What uses it", cell: (r) => r.uses },
          ]}
          rows={PATHS}
        />
        <p>
          The CPU path takes metres in the source's units. The GPU path takes
          pixels, for each view. That is why they aren't one function with two
          settings: the CPU can't know the view.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.33, <C>src/scene/world/brep.ts</C>{" "}
              and <C>src/brep/tessellate.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="The pipeline">
        <Figure caption="Every box is built. The CPU work happens when the form is added, and the rest every view.">
          <Board
            label="The GPU tessellation pipeline"
            lanes={[
              "On the CPU, when added",
              "On the GPU, each view, in compute",
              "On the GPU, in the draw",
            ]}
            steps={PIPELINE}
            edges={[
              { from: "spans", to: "dice" },
              { from: "dice", to: "vertex" },
              { from: "vertex", to: "fragment", vertical: true },
              { from: "trims", to: "fragment" },
            ]}
          />
        </Figure>
        <p>
          A solid is two patch draws: the faces whose trim is their whole
          rectangle in (u, v), and the faces with a trim. They run through
          different pipelines, so the first keeps early depth. Each draw has its
          own chunk list and one indirect draw, so the CPU needn't wait to learn
          how many triangles a view made.
        </p>
      </Section>

      <Section title="The CPU tessellator">
        <p>
          Each face's (u, v) domain, from <C>faceTrim</C>, is cut into one
          uniform grid. The grid is the one with the fewest cells whose error
          bound is within the tolerance, with at most 128 cells a side. A
          trimmed face gets at least 48 a side so its trim reads. The bounds are
          sound, not estimates: tests sample every triangle densely against the
          true surface.
        </p>
        <DataTable
          label="What a cell leaves, by surface"
          columns={[
            { head: "Surface", cell: (r) => r.surface },
            { head: "Chordal error of a cell", cell: (r) => r.sag },
          ]}
          rows={BOUNDS}
        />
        <p>
          The bounds on a rational patch are the part that took care. A point of
          a patch is a convex combination of its control points, and the
          Bernstein coefficients of a polynomial bound it. Speed, second
          derivative and angular rate about an axis are each a ratio of
          polynomials, and the ratio of a numerator's coefficients to a
          denominator's bounds it for any positive weights. Each bound is the
          largest over 2 × 2 sub-patches by de Casteljau, since the bounds
          tighten as a patch is cut. A patch that reaches an identity's axis has
          no positive denominator, so it takes the net bound instead.
        </p>
        <p>
          A trim is the even-odd rule over the loops' polygons: a triangle whose
          centre is outside is dropped. The edge lines drawn on top hide the
          jagged line this leaves. A grid can't do better than its cell, which
          is the sawtooth. The mesh states the error it can leave: the
          tolerance, or more where the grid cap binds, plus a surface's
          representation error.
        </p>
        <DataTable
          label="The CPU tessellator, measured"
          columns={[
            { head: "Case", cell: (r) => r.case },
            { head: "Triangles", numeric: true, cell: (r) => r.triangles },
            { head: "Time", numeric: true, cell: (r) => r.time },
            { head: "Error", cell: (r) => r.error },
          ]}
          rows={CPU_NUMBERS}
        />
        <p>
          The identity matters most for a NURBS cylinder: the net bound spent
          cells along its straight rulings, where the identity needs one.
        </p>
        <Written
          from={
            <>
              <C>src/brep/tessellate.ts</C>, <C>src/brep/bounds.ts</C>,{" "}
              <C>test/brepTessellateBounds.test.ts</C> and the overall plan,
              section 13.33
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="The GPU path: span records and error constants">
        <p>
          A <em>span</em> is the part of one Bézier patch, or of one angular
          piece of an analytic surface (cut at quarter turns), under the face's
          rectangle: the bounding rectangle of its loops' pcurves, from their
          control-point hulls. <C>prepareGpuPatches</C> writes one record of 48
          words for each face and span. It holds the kind, the frame or the
          control net's place, the rectangle, two bounding spheres (the span's
          and its face's), the face's densities and speeds, and a trim word. The
          nets follow the records, once each, and then the trim data. All of it
          goes into the draw's range of the slab's arena, and the shaders read
          it from there. The GPU evaluates up to degree 7 in each direction.
        </p>
        <p>
          A grid of <em>n_u</em> × <em>n_v</em> cells over a span stays within a
          sum of three terms of the surface, in model space and before any
          placement:
        </p>
        <CodeBlock language="text" code={FORMULA} />
        <p>
          The constants <em>D</em> are the CPU bounds above, per unit of
          parameter, with the cell's height and width split out. They are the
          largest over the face's spans.
        </p>
        <DataTable
          label="The error constants"
          columns={[
            { head: "Surface", cell: (r) => r.surface },
            { head: "D_u, D_uv, D_v", cell: (r) => r.d },
            { head: "Note", cell: (r) => r.note },
          ]}
          rows={CONSTANTS}
        />
        <p>
          Where an identity's bound fails, as for a patch that reaches the axis,
          the span takes the net bound instead. A failed speed bound becomes a
          huge finite number, so the cell cap takes over.
        </p>
        <Written
          from={
            <>
              <C>src/brep/gpuPatches.ts</C>, <C>src/shaders/patch.slang</C> and{" "}
              <C>test/brepGpuPatches.test.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Dicing, for each view">
        <p>
          After the cull, <C>dicePatches</C> runs one thread for each span of
          each visible patch draw. The CPU twin, <C>diceCounts</C>, is the same
          arithmetic, and the spike checks the GPU's counts against it.
        </p>
        <Flow
          label="What a span's thread does"
          steps={[
            {
              title: "Skip what's out of view",
              body: (
                <>
                  The span's sphere against the frustum. A draw under a
                  placement isn't skipped: a route moves what the sphere bounds.
                </>
              ),
            },
            {
              title: "Pixels for a metre",
              body: (
                <>
                  From the view's projection rows and the depth of the{" "}
                  <em>face's</em> nearest point, the same for every span of the
                  face. A perspective and an orthographic view alike: the depth
                  is the clip w, which an orthographic projection holds at 1.
                </>
              ),
            },
            {
              title: "Cells for a unit",
              body: (
                <>
                  Solve for <em>ρ_u</em> and <em>ρ_v</em> so the error stays
                  within the target. The terms that aren't zero share it
                  equally, and the cross term's share raises both rates if it
                  needs more.
                </>
              ),
            },
            {
              title: "Round and chunk",
              body: (
                <>
                  Round up to 1 to 64 cells a side. Cut the span into chunks of
                  4 × 4 cells, and append each to the draw's list with an atomic
                  count.
                </>
              ),
            },
            {
              title: "Write the arguments",
              body: (
                <>
                  <C>writePatchArgs</C>: one indexed indirect draw of 96 indices
                  for each chunk, with the chunk count. A draw that the cull
                  dropped has none.
                </>
              ),
            },
          ]}
        />
        <CodeBlock language="text" code={DICE} />
        <p>
          <strong>No cracks between spans.</strong> A boundary two spans of a
          face share runs along one parameter, where both have the same extent
          and the same cells for each unit, since every span takes the face's
          densities and the face's nearest distance. A grid line's position is
          the rectangle's start plus a fraction of its width, exact at the end,
          so both spans put the same floats there. The spike checks that no
          pixel inside a silhouette is left uncovered. Between <em>faces</em>,
          nothing is shared: see Direct trimming, and the last section.
        </p>
        <p>
          <strong>Chunks with shared vertices.</strong> A chunk of 4 × 4 cells
          is 5 × 5 vertices over a static 16-bit index buffer, so a vertex is
          evaluated once for the cells around it. The first design drew
          non-indexed 8 × 8 chunks. A span averages about 9 cells, so most of a
          chunk was degenerate and each grid point was evaluated six times. A
          reversed face is the grid mirrored along u, so the same indices face
          outward, and columns and rows past a span's counts repeat its last
          line, whose cells have no area.
        </p>
        <p>
          <strong>Under a placement.</strong> A route (a vertical exaggeration,
          a reprojection) moves the surface after it is evaluated, and the error
          is measured in the placed space. The CPU bounds the placement for each
          draw: its Jacobian's norm <em>J</em> and its second derivative's bound{" "}
          <em>K</em>. The dice takes <em>D′ = J·D + K·speed² / 8</em>, term by
          term, with the speeds in each parameter from the record. A term with
          no derivative bound, such as an attribute, pushes the count to the
          cap.
        </p>
        <p>
          <strong>Limits.</strong> A span has at most 64 cells a side, and a
          draw lists at most 65,536 chunks by default (<C>maxChunks</C>, a
          million cells). Past that the error exceeds the target without a
          message, and the stats show chunks asked for and drawn apart. Unlike
          the CPU mesh, the GPU path doesn't state the error it achieved.
        </p>
        <Written
          from={
            <>
              <C>src/shaders/dice.slang</C>, <C>src/brep/gpuPatches.ts</C>,{" "}
              <C>src/scene/world/patches.ts</C> and{" "}
              <C>test/brepGpuPatches.test.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Evaluating in the vertex stage">
        <p>
          <C>vsPatch</C> takes a chunk's record, span and cell origin, and a
          vertex's place in the chunk, and finds its (u, v) from the span's
          rectangle. It goes through the same <C>vertexOut</C> as every other
          draw, so the draw's placement and the Jacobian's normal turn apply.
        </p>
        <ul>
          <li>
            <strong>Analytic surfaces</strong> use their formulas (plane,
            cylinder, cone, sphere, torus), with the normal in closed form. Its
            scalar factor, a radius or a cosine, keeps its sign, so the normal
            follows the surface through a negative one.
          </li>
          <li>
            <strong>Rational Béziers</strong> read their net from the arena and
            run de Casteljau on the homogeneous coordinates, (xw, yw, zw, w),
            along s in each row and then along t. Up to degree 3 in both
            directions, the cubic path copies the net into a 16-point array, and
            costs one compare per vertex to choose it. Above 3, up to 7 (
            <C>MAX_GPU_DEGREE</C>), a wide path reads the arena one row at a
            time, holding a row&apos;s 8 points and the rows&apos; values and
            derivatives, never a 64-point copy. The same passes give the first
            derivatives, and the quotient rule makes them the surface&apos;s.
            The normal is the exact ∂u × ∂v. At a pole, where one derivative
            vanishes, it is taken a thousandth of the way toward the span&apos;s
            middle.
          </li>
          <li>
            <strong>The varyings.</strong> The face is the vertex's feature. The
            UV varying carries (u, v) less the rectangle's corner, so a float32
            holds it however far the face's parameters are from zero. The trim
            data's offset rides in the instance ids beside the feature.
          </li>
        </ul>
        <p>
          The float64 twin, <C>evaluateSpan</C>, is what the spike compares each
          pixel with. A shared test checks that the shader's words and the
          TypeScript's records agree.
        </p>
        <Written
          from={
            <>
              <C>src/shaders/patch.slang</C>, <C>src/shaders/surface.slang</C>{" "}
              and <C>test/patchLayout.test.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Direct trimming">
        <p>
          A trimmed face is diced over its whole rectangle, and the fragment
          stage decides each pixel is inside the trim or not, from the face's
          own pcurves in (u, v). It is Slug's glyph method (
          <Cite id="lengyelSlug" />
          ): horizontal bands, quadratic pieces, and a winding number from a
          ray. Here the ray runs along +u and the bands are in v. The kernel is{" "}
          <C>coverage.slang</C>, written for the vector fills to share.
        </p>
        <Flow
          label="From a pcurve to a pixel"
          steps={[
            {
              title: "Close the loop",
              body: (
                <>
                  Where one use doesn't end where the next starts, to the
                  float32 the shader reads, a straight piece joins them, as the
                  CPU's polygon does. A ray's count never depends on a gap.
                </>
              ),
            },
            {
              title: "Cut at the extrema of v",
              body: (
                <>
                  Each pcurve, a rational Bézier of degree 1 to 3, becomes parts
                  that are monotone in v. A horizontal part crosses no ray and
                  is dropped.
                </>
              ),
            },
            {
              title: "Fit a quadratic",
              body: (
                <>
                  A non-rational quadratic through each part's ends and middle,
                  halving the part until the quadratic is within the tolerance
                  of the curve at 7 parameters.
                </>
              ),
            },
            {
              title: "Sort into bands",
              body: (
                <>
                  Up to 256 bands split the rectangle's v. Each lists the pieces
                  that overlap it, longest reach in u first. Bands double while
                  the mean list is over 1.5 pieces. A band no piece overlaps
                  holds one winding.
                </>
              ),
            },
            {
              title: "Count crossings",
              body: (
                <>
                  A fragment reads its band, solves one quadratic a piece in
                  closed form, and adds a sign where the crossing is beyond it
                  in u. It stops at the first piece whose reach falls short.
                </>
              ),
            },
            {
              title: "Dilate by half a pixel",
              body: (
                <>
                  Keep a point inside, or within half a pixel of the boundary,
                  so seams between faces close.
                </>
              ),
            },
          ]}
        />
        <p>
          <strong>The half-open rule.</strong> A piece is stored rising in v,
          with a sign, and crosses the ray at <em>v</em> when{" "}
          <em>y0 ≤ v &lt; y2</em>. A ray through a vertex counts one of the two
          pieces that meet there. Through a local extremum it counts none or
          both, with opposite signs. No special cases are needed, and the count
          is the winding number.
        </p>
        <p>
          <strong>The tolerance.</strong> A piece may stray from the pcurve by
          the larger of the face's least edge tolerance (the model's) and{" "}
          <C>DISPLAY_TRIM_TOLERANCE</C>, 1e-4 of the face's size. In (u, v) that
          is divided by the hypotenuse of the face's speeds, and never below
          2e-7 of the rectangle's side, which float32 can't hold. A face whose
          busiest band lists over 16 pieces is fitted again at four times the
          tolerance, up to twice. Drawing needs no better, as a pick is refined
          exactly from the surface. At the model's tolerance a round hole was
          about 66 pieces.
        </p>
        <p>
          <strong>Dilation against seams.</strong> Neighbouring faces trim along
          their own pcurve images of the same edge, so they meet within the
          edge's tolerance plus the tessellation error, and a pinhole can open
          between them. The fragment keeps a point whose winding isn't zero, or
          whose nearest crossing along u is within half a pixel (<C>fwidth</C>
          of the (u, v) varying, halved), or whose winding at half a pixel above
          or below isn't zero. The test is plus-shaped: it keeps an outside
          point within 0.7 of that reach in any direction, and none beyond 1.4.
          The two taps along v are skipped where no piece in reach could change
          them. On a plate that fills a 3840 × 2160 view, the opaque pass takes
          0.67 ms with the skip and 0.73 ms without.
        </p>
        <p>
          <strong>Pipelines.</strong> The faces with a trim are a draw of their
          own, with ten pipelines (opaque, depth, shadow, height and prepass,
          each one- and double-sided) whose fragment stages test and discard.
          The complete faces' ten have no fragment test, so they keep early
          depth. After a depth prepass the opaque pass doesn't repeat the test:
          only the fragments that survived reach it, at equal depth.
        </p>
        <p>
          <strong>Picks.</strong> A pick reads the feature target, which holds
          the face, and the depth, which a discarded fragment leaves unwritten.
          A pick through a hole finds the face behind it, and one on the
          material finds the face, as the spike checks. The pick variant also
          writes (u, v), and the CPU evaluates the surface there in float64 (
          <C>refinePick</C>), so a pick on a patch draw is exact. The B-reps tab
          has it.
        </p>
        <p>
          <strong>Prior art.</strong> Guthe and others trimmed and tessellated
          NURBS on the GPU (<Cite id="gutheTrimming" />
          ). Schollmeyer and Fröhlich trimmed NURBS directly in the pixel stage
          (
          <Cite id="schollmeyerDirect" />
          ), and went on to anti-aliased trimming of large NURBS models (
          <Cite id="schollmeyerAntiAliased" />
          ). Lengyel's Slug (<Cite id="lengyelSlug" />) is the bands and
          winding, for glyphs. This is Slug's test over pcurve pieces, with a
          dilation instead of anti-aliasing. The papers weren't re-read for this
          page.
        </p>
        <Written
          from={
            <>
              <C>src/brep/gpuTrims.ts</C>, <C>src/shaders/coverage.slang</C>,{" "}
              <C>src/shaders/surface.slang</C>, <C>test/brepGpuTrims.test.ts</C>{" "}
              and the overall plan, section 13.33
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Translucent, wireframe and edges">
        <ul>
          <li>
            <strong>Translucent.</strong> A patch draw with a blended material
            draws in both translucency methods, and as a clip's ghost, with its
            per-pixel trims, reading the view&apos;s diced chunks. It leaves the
            opaque, depth, prepass, shadow and pick bundles, so it casts no
            shadow and a pick passes through it.
          </li>
          <li>
            <strong>The tessellation, shown.</strong>{" "}
            <C>World.setPatchDisplay(draw, display)</C> draws the dice
            grid&apos;s cell edges and diagonals, iso lines in (u, v) or flat
            shading from the patch fragment stage. They follow every view&apos;s
            dice as the camera moves, so what a view diced is what you see. It
            replaced a wireframe made on the CPU.
          </li>
          <li>
            <strong>Edges.</strong> A b-rep&apos;s edges are the exact curves,
            not a line pushed along a face&apos;s normal. The line pipeline
            pulls them toward the camera in clip depth alone (1 + 4e-3, in{" "}
            <C>vsLines</C>), and its depth test is greater-or-equal, so an edge
            wins over the face it lies on and a line over a line of the same
            depth shows as the later one.
          </li>
          <li>
            <strong>Readiness.</strong> <C>engine.whenReady(view)</C> resolves
            after a frame in which every patch draw was diced and none used a
            stand-in.
          </li>
        </ul>
        <Written
          from={
            <>
              <C>src/scene/world/patches.ts</C>, <C>src/shaders/patch.slang</C>{" "}
              and the B-reps tab
            </>
          }
          on="2026-11-12"
        />
      </Section>

      <Section title="Three tolerances, never mixed">
        <p>
          The plan keeps three tolerances apart. Tessellation touches all three,
          in different places.
        </p>
        <DataTable
          label="The three tolerances"
          columns={[
            { head: "Tolerance", cell: (r) => r.which },
            { head: "What it is", cell: (r) => r.what },
            { head: "Where tessellation uses it", cell: (r) => r.enters },
          ]}
          rows={TOLERANCES}
        />
        <p>
          The plan's rule: a measured answer, such as a snap or a distance,
          states the model tolerance plus the representation error. A display
          tolerance enters an answer only when it comes from a mesh, and then it
          is provisional and says so. Drawing is never the measurement.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.33 (the brainstorm on modeling and
              render geometry), <C>src/brep/gpuTrims.ts</C> and{" "}
              <C>src/brep/tessellate.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="What has been measured">
        <p>
          All on one machine, with an NVIDIA RTX 3000 Ada (Lovelace), except the
          first spike. The first run of the GPU path was correct and slow, and a
          performance pass followed.
        </p>
        <ul>
          <li>
            As first built (part 2), the gallery's frame took 10–12 ms of GPU
            time and 33–50 ms of CPU, where the CPU path took about 1 ms of
            each. Preparing CTC-05 took 1.5 s.
          </li>
          <li>
            The pass fixed the vertex count, the trims' size and the CPU
            preparation, below. The gallery's CPU time after the pass isn't in
            the plan.
          </li>
          <li>
            A cold first run in a page takes two to three times as long as the
            preparation figures below.
          </li>
        </ul>
        <DataTable
          label="Before and after the performance pass"
          columns={[
            { head: "Measure", cell: (r) => r.what },
            { head: "Before", cell: (r) => r.before },
            { head: "After", cell: (r) => r.after },
          ]}
          rows={BEFORE_AFTER}
        />
        <p>
          The busiest band didn't fall from a looser tolerance: it is a face
          with many holes, and each hole costs a band two pieces at least. The
          finer bands did it.
        </p>
        <DataTable
          label="NIST CTC-05 on the GPU path and the CPU tessellator"
          columns={[
            { head: "Measure", cell: (r) => r.what },
            { head: "GPU path", cell: (r) => r.gpu },
            { head: "CPU tessellator", cell: (r) => r.cpu },
          ]}
          rows={CTC}
        />
        <p>
          The mesh is triangles made in advance, so its time has no dicing in
          it. The GPU path's frame for the 200 analytic faces does: 0.12 ms,
          against the mesh's 0.18 ms, with 0.011 ms of it the cull and 0.009 ms
          the dice.
        </p>
        <DataTable
          label="What the spikes and tests check"
          columns={[
            { head: "Where", cell: (r) => <C>{r.where}</C> },
            { head: "What it checks", cell: (r) => r.checks },
            { head: "Result", cell: (r) => r.result },
          ]}
          rows={CHECKS}
        />
        <p>
          The first spike came before any of this was in the engine. One
          rational bicubic NURBS face, 100 m across, with 3 × 3 spans, one
          control point of weight 2, and a circular hole, was drawn in Chrome on
          an Apple GPU. The grid density came from a bound on the net's second
          differences, with a target of 0.5 px, and the error was measured
          against 512 × 512 exact evaluations a span.
        </p>
        <DataTable
          label="The first spike: one trimmed NURBS face on the GPU"
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
        <p>
          That bound was never exceeded, but at 150 m it had almost no margin
          with a weight of 2. That is why the engine's bounds are Bernstein
          bounds that hold for any positive weights. SMLib tessellated the same
          face to the same tolerance in 209 triangles, with 0.498 px error, in
          9.6 ms; building and trimming the face took about 270 ms more, in
          WebAssembly on one thread under Node.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.33 (Part 1's cost, the performance
              pass and Spike B), <C>spikes/brepPatches.ts</C>,{" "}
              <C>spikes/brepTrims.ts</C> and the tests
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Meshes the engine didn't generate">
        <p>
          A flat face of edge <em>d</em> sags below the curved Earth by about{" "}
          <em>d</em>²/8<em>R</em> at its middle: 2 cm for 1 km, and 2 m for 10
          km. For reprojected models the engine didn't generate, the plan's
          answer is to state a rule and measure. The producer declares a chord
          tolerance, and a tile that declares none has its largest face's sag
          measured and stated as its display error. Picks and snaps on it carry
          that as an accuracy term. Diced patches under a placement handle the
          same bend for b-reps; nothing in the engine does for a mesh yet.
        </p>
        <p>
          A spike (<C>spikes/routeTessellation.ts</C>) shows how. Where a mesh
          is drawn under a smooth route, the route&apos;s own bend sets how
          finely each triangle is cut: <C>curvatureOver</C> takes the second
          derivative bound M₂ from the route&apos;s Jacobian by differences (the
          autodiff Hessian at Earth scale is rounding noise), and{" "}
          <C>subdivisionFor</C> gives n = ⌈√(M₂L²/8 / tolerance)⌉ for a triangle
          of edge L. A compute pass and an indirect draw, in the pattern of{" "}
          <C>dice.slang</C>, subdivide. A 50 km tile under ×10 exaggeration,
          seen from 10 km, comes to 0.08 px of error against 102 px
          unsubdivided; its two triangles take n = 36 (2,592 sub-triangles), and
          128 triangles take n = 5.
        </p>
        <p>
          It isn&apos;t wired in. A mesh draw needs a batch kind of its own, a
          vertex entry in every pass&apos;s pipeline (depth, shadow, pick) that
          decodes the triangle, n and the sub-triangle, and attribute
          interpolation. It also needs per-edge levels from each edge&apos;s
          length: one level for a triangle leaves cracks between neighbours of
          different n. The transform-graph plan lists these as its tessellation
          follow-ups, tasks 9 and 10.
        </p>
        <Written
          from="the plan 5 spec, section 13.4, and section 13.37"
          on="2026-11-12"
        />
      </Section>

      <Section title="Not yet">
        <ul>
          <li>
            <strong>Anti-aliased trim edges.</strong> The test is hard, with a
            half-pixel dilation, so a trim edge is as smooth as the pixel grid
            allows and no smoother. The edge lines draw over it. Schollmeyer and
            Fröhlich's 2019 work (<Cite id="schollmeyerAntiAliased" />) is the
            plan's reference for the real thing.
          </li>
          <li>
            <strong>Stitching to shared edge samples.</strong> Faces don't share
            their edge's samples. The plan judges the dilation and the edge
            lines enough for drawing, and the spike's solids show no pinholes.
            The edges drawn on top are the exact curves, polylines that the line
            pipeline pulls forward in depth; the engine still doesn't tessellate
            an edge once for both faces, as the earlier design had it.
          </li>
          <li>
            <strong>The stats readback.</strong> A draw is now marked once the
            dice has run for it, which <C>engine.whenReady</C> relies on. The
            first-look example once read &quot;nothing diced in this view&quot;
            while CTC-05 drew 208 of 208 faces; <C>World.readPatchStats</C> was
            reading a view or frame the dice hadn&apos;t run for.
          </li>
          <li>
            <strong>Worker-side import.</strong> <C>World.addBrep</C> prepares
            spans and trims on the calling thread unless it is handed the
            result: 115 to 120 ms for CTC-05, and two to three times that cold.
            The kernel worker's protocol can run the same preparation beside the
            conversion (<C>prepareGpuPatches</C>), and{" "}
            <C>BrepOptions.prepared</C> takes it, which saves the main thread
            most of that time. A form edited on the page, or from a host that
            runs no kernel worker, still prepares on the calling thread, and
            every edit repacks the whole form, which the CSG edit loop will
            feel.
          </li>
          <li>
            <strong>The b-rep adapter behind a drawn b-rep.</strong> The b-rep
            adapter (<C>brepGeometry</C>) exists and answers from a form, but
            nothing wires it to <C>World.addBrep</C>. The CPU tessellator
            doesn't feed the mesh adapter for a drawn b-rep: only tileset rays
            and the client snap's occlusion test use the mesh adapter, so a pick
            on a drawn b-rep gives a face and no (u, v). The B-reps tab has the
            adapter.
          </li>
          <li>
            <strong>The wide path's measurements.</strong> One patch of degree 5
            × 4, weighted, within 0.055 px of the surface. Nothing times it
            against the cubic path, and no Open CASCADE or SMLib solid with
            patches of degree 4 or more is in the spike.
          </li>
          <li>
            <strong>Reprojected meshes.</strong> Nothing in the engine
            subdivides an ordinary mesh. The route-driven spike does it in a
            compute pass and an indirect draw, but it needs per-edge levels and
            an entry in each pass&apos;s pipeline before it is wired in.
          </li>
          <li>
            <strong>Other GPUs.</strong> Every figure here is from one NVIDIA
            GPU, except the first spike's, from an Apple GPU in Chrome.
          </li>
        </ul>
        <Written
          from="the overall plan, section 13.33 (the follow-ups), and what the code has"
          on="2026-11-11"
        />
      </Section>
      <Sources
        ids={[
          "gutheTrimming",
          "schollmeyerDirect",
          "schollmeyerAntiAliased",
          "lengyelSlug",
        ]}
      />
    </Page>
  );
}
