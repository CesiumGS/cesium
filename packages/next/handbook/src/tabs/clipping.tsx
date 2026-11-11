import { snippetText } from "../snippets.ts";
import {
  C,
  CodeBlock,
  DataTable,
  Flow,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

/** Text where `backticked` names are code. */
function Ticks({ text }: { text: string }) {
  return (
    <>
      {text
        .split("`")
        .map((part, i) => (i % 2 === 1 ? <C key={i}>{part}</C> : part))}
    </>
  );
}

const SPACES = [
  {
    scene: "No warp",
    named: "Any reference frame reached by a rigid route",
    tested: "The true point, which is also the drawn one",
    why: "One point, so the choice makes no difference.",
  },
  {
    scene:
      "A presentation warp, such as ×10 exaggeration, with the rig on its reference frame",
    named: "ITRF, or any frame on the content's side",
    tested: "The true point",
    why: "The set's route to the content's true side is rigid, and location 4 is the true position when every warp crossed is a presentation warp.",
  },
  {
    scene: "The same scene",
    named: "The warp's own reference frame, or any frame drawn with it",
    tested: "The drawn point, rebuilt per fragment",
    why: "The route to the content's true side crosses the warp, but the route to the render root is rigid.",
  },
  {
    scene:
      "A reprojection (a coordinate operation) between the content and the render root",
    named: "A frame on the render root's side",
    tested: "The drawn point, which here is the true one",
    why: "An operation moves where content is, so the drawn point is where it truly is. Location 4 isn't the true position across one.",
  },
  {
    scene: "The same scene",
    named: "A frame on the content's side",
    tested: "A fitted signed distance, per draw",
    why: "Rigid on neither side, so the clip is a curved surface in the content's own coordinates (increment 8c). Its distance is evaluated in float64 and fitted as a lattice.",
  },
];

const TOWER = [
  {
    clip: "A plane named in ITRF, 1 m above the ground",
    space: "True point",
    measured: "Row 287",
    route: "Row 287.9 (1 m true is 10 m drawn)",
    other: "Row 345, if it were tested on the drawn point",
  },
  {
    clip: "A plane named in the drawn reference frame, 12 m up",
    space: "Drawn point",
    measured: "Row 275",
    route: "Row 275.1 (12 m drawn is 1.2 m true)",
    other: "Not applicable",
  },
];

const SHAPES = [
  {
    shape: "`plane`",
    inside:
      "The side the normal points away from: `n · (p − point) ≤ 0`. The normal's length doesn't matter.",
    rows: "2",
    cost: "One dot product and a compare.",
  },
  {
    shape: "`box`",
    inside:
      "The oriented box about `center`, with `axes` (the reference frame's own by default) and `halfExtents`.",
    rows: "4",
    cost: "Three dot products, each already scaled by its half extent, and a max of absolute values.",
  },
  {
    shape: "`polygon`",
    inside:
      "The prism over `ring` (x and y in the reference frame, any winding, closed implicitly), between `zRange` (unbounded by default). Concave is fine. The extrusion is along the reference frame's z axis: name a local reference frame for another direction.",
    rows: "5 + ⌈n / 2⌉ for n vertices",
    cost: "Three dot products, a z test, and an even-odd count over the ring: two vertex reads per edge, and a divide where an edge crosses.",
  },
];

const LIMITS = [
  {
    what: "Clips in a world",
    limit: "32",
    why: "The bits of `View.clipMask`. `MAX_WORLD_CLIPS`.",
  },
  {
    what: "Sets a view uses",
    limit: "8",
    why: "`MAX_CLIP_SETS`. A mask naming more throws a `RangeError`.",
  },
  {
    what: "Shapes in a set",
    limit: "16",
    why: "`MAX_CLIP_SHAPES`.",
  },
  {
    what: "Vertices of one polygon",
    limit: "128",
    why: "`MAX_CLIP_POLYGON_VERTICES`.",
  },
  {
    what: "Table rows one set may take",
    limit: "480",
    why: "So any eight sets fit: 8 × 480 + 9 header rows is under 4,096.",
  },
  {
    what: "A view's table",
    limit: "4,096 rows (64 KiB)",
    why: "`CLIP_TABLE_ROWS`: one storage buffer of float4 rows, written once a tick.",
  },
];

const COMBINING = [
  {
    row: "`union` (the default)",
    inside: "In any shape",
    kept: "Keep `inside` (the default): what is in any shape. Keep `outside`: what is in none.",
  },
  {
    row: "`intersection`",
    inside: "In every shape",
    kept: "Keep `inside`: what is in all of them, as a box made of planes is. Keep `outside`: what is outside at least one.",
  },
];

const PIPELINES = [
  {
    pass: "Colour (opaque and translucent), depth, shadow casters, ambient occlusion's prepass",
    state:
      "Made on first use by a view with clips: the same module with `clipsOn` set (pipeline constant 1). Their draw bundles are remade as `clippedBundle(kind)`.",
  },
  {
    pass: "Picks",
    state:
      'The pick variant has its clipped form too (`clippedBundle("pick")`), so a pick discards what the drawn image does.',
  },
  {
    pass: "A view that hasn't opted in, in the same world",
    state:
      "Keeps the unclipped pipelines and their early depth. Nothing about it changes when another view's clips do.",
  },
  {
    pass: "`warmClipped()`",
    state:
      "Makes every clipped variant now, so no tick draws uncut while one compiles. The spike calls it first.",
  },
];

const METHODS = [
  {
    surface: "Plane",
    how: "`plane ∩ plane = line`",
    exact: "Exact",
    note: "A plane parallel to the face and on it is coincident: nudged (below).",
  },
  {
    surface: "Cylinder",
    how: "Across the axis: `plane ∩ cylinder = ellipse`. Parallel to the axis: two lines.",
    exact: "Exact",
    note: "The ellipse is in rational quadratic arcs of at most a quarter turn.",
  },
  {
    surface: "Sphere",
    how: "`plane ∩ sphere = circle`",
    exact: "Exact",
    note: "",
  },
  {
    surface: "Cone",
    how: "Square to the axis: a circle at that height.",
    exact: "Exact",
    note: "",
  },
  {
    surface: "Cone, oblique",
    how: "Marched on the surface's (u, v) grid, then fitted in cubics.",
    exact: "Within the tolerance",
    note: "Every crossing of a grid edge is found exactly, then refined onto the surface by Newton's method.",
  },
  {
    surface: "Torus",
    how: "Square to the axis: two circles.",
    exact: "Exact",
    note: "",
  },
  {
    surface: "Torus, oblique",
    how: "Marched and fitted, as the oblique cone is.",
    exact: "Within the tolerance",
    note: "A quartic. Steep cuts through the tube give closed loops.",
  },
  {
    surface: "Bézier patches (NURBS, SMLib's form)",
    how: "Marched on the patch's grid, then fitted.",
    exact: "Within the tolerance",
    note: "Every face of an SMLib solid is of this kind.",
  },
];

const NUMBERS = [
  {
    what: "Section tolerance",
    value:
      "The greater of 1e-7 m and 1e-5 of the solid's size (the diagonal of its vertices' box)",
    note: "How far a fitted curve may be from the surface. Lines, circles and ellipses are exact, so they report 0. The tests ask for 1e-6 m, and the fitted curves stay under it.",
  },
  {
    what: "B-rep cap bias",
    value: "2e-5 of the solid's size, at least 1e-6 m",
    note: "How far inside what the clip keeps a cap lies. It moves the cap's plane, and each limit plane of a box, against its own outward normal.",
  },
  {
    what: "Mesh cap bias",
    value: "1e-6 m",
    note: "The same idea, with a size that isn't known for a set of tiles.",
  },
  {
    what: "Nudge",
    value: "1e-6 of the solid's size",
    note: "When a plane lies on a face or an edge, the section moves this far into the solid, so it has a loop to cap. The report counts `nudged`.",
  },
  {
    what: "Cap form's edge tolerance",
    value: "8 × the section tolerance",
    note: "What the b-rep builder records on the cap's edges and vertices.",
  },
  {
    what: "Mesh join (snap) distance",
    value:
      "The greatest of 1% of the largest geometric error among the tiles, 1e-6 of the largest tile, and 1e-9 m",
    note: "Segment ends within it are one point. Pass `snap` to change it.",
  },
  {
    what: "Near-miss report",
    value: "An open chain's end within 100 snaps of another's",
    note: "Probably tiles at different levels of detail that haven't met.",
  },
  {
    what: "Triangulation shortfall",
    value: "More than 1% of a loop's area uncovered",
    note: "Counted in the report. A well-formed loop covers exactly.",
  },
  {
    what: "Scheduler",
    value: "At least 100 ms between rebuilds of one cap; 4 ms a tick",
    note: "A drag rebuilds a few times a second, and the last position always lands. A rebuild that has started may run past 4 ms, as one section isn't split.",
  },
];

const MESH_STEPS = [
  {
    title: "Cut each tile",
    body: (
      <p>
        One pass over the tile's triangles, on the CPU. A triangle the plane
        crosses gives one directed segment in the plane&apos;s (u, v), with the
        solid&apos;s inside on its left, keyed by the element ID of its first
        vertex. Both triangles at an edge compute the crossing from the
        lower-numbered end, so they agree bit for bit.
      </p>
    ),
    aside:
      "Cached per tile, plane and revision; only a changed tile is cut again.",
  },
  {
    title: "Join across tiles",
    body: (
      <p>
        Segments of one element, from every loaded tile, are joined end to end
        where their ends are within the snap distance. A solid often spans
        several tiles, so the loop closes only when all of them have been cut.
      </p>
    ),
    aside:
      "Right-most turn at a junction, so the loops of a pinched section stay apart.",
  },
  {
    title: "Nest and fill",
    body: (
      <p>
        Closed loops are nested into outer loops and holes, cut by the other
        sides of a clip box, and triangulated: holes are bridged to the outer
        ring and ears are cut. A loop that runs clockwise is an inside-out mesh:
        it is turned over, and the report says so.
      </p>
    ),
    aside:
      "Checked on a concave L, a square with two holes, and a circle of a thousand points with a hole.",
  },
  {
    title: "Draw",
    body: (
      <p>
        The caps are one triangle mesh and the open chains one line mesh, added
        as draws in the world. A chain that doesn&apos;t close is drawn as a
        section line in orange, never filled, and the report counts it.
      </p>
    ),
    aside:
      "Rebuilt when the clip or a tile changes, within the scheduler's budget.",
  },
];

const SPACE_STEPS = [
  {
    title: "True point",
    body: (
      <p>
        The set&apos;s route to the view&apos;s body anchor (where the
        content&apos;s true coordinates are) is rigid, and the content reaches
        the render root across presentation warps only. The set is tested on
        fragment location 4, the draw&apos;s transform of the design position.
      </p>
    ),
    aside:
      "Exact per fragment, and the camera moving changes nothing about it.",
  },
  {
    title: "Drawn point",
    body: (
      <p>
        Otherwise, the set&apos;s route to the render root is rigid. A placed
        draw rebuilds its drawn position per fragment from the window position
        and the depth, in about 17 multiply-adds. An unplaced draw reads it from
        location 4 as it is.
      </p>
    ),
    aside: "Rebuilt only when some set in the table is tested there.",
  },
  {
    title: "Curved",
    body: (
      <p>
        Neither route is rigid, so the clip is a curved surface in the scene.
        Per draw, the CPU evaluates its signed distance in float64 and fits it
        as a scalar cubic lattice. The vertex stage evaluates the lattice and
        the fragment stage discards above zero.
      </p>
    ),
    aside: "Increment 8c, built. The section on curved clips has the limits.",
  },
];

const NOT_BUILT = [
  {
    what: "Curved clips on billboards, points and instances",
    state:
      "Curved clips (increment 8c) cut meshes, b-rep patches and tiles. A draw with no per-vertex placement, which is a billboard, a point set or an instanced draw, is cut by the true or drawn tests only, and the engine says so once.",
  },
  {
    what: "More than one curved field per world",
    state:
      "A draw's `.w` channel holds one scalar. One view's curved sets combine by max, and views that use different curved sets share the first one's field: the others are reported.",
  },
  {
    what: "A curved clip that moves, and a warp scaled after the fit",
    state:
      "Moving a curved clip refits every draw it cuts, within the per-frame budget, so a drag shows a stale field until the refit lands. A warp-scale change after the fit isn't followed until something else triggers a refit.",
  },
  {
    what: "Room for a carrier",
    state:
      "A draw already at 3 warp terms with no lattice has nowhere to put the field and is left uncut, and the engine says so once.",
  },
  {
    what: "Exemptions",
    state:
      "Content that a clip leaves alone, such as terrain left whole, is the styling language's: run-time data by element ID. The table's set rows keep a reserved word for it (`CLIP_SET_EXEMPT`). There is no list per clip, and no per-draw switch.",
  },
  {
    what: "Terrain regions as clip shapes",
    state:
      "`TerrainClips` (a globe's `terrain.addRegion`) still has its own mechanism, in the shader's `clipBoxes` beside this table. Folding it into `ClipShape` isn't done: it carries translucency, holes, pick stops and `sampleHeight` semantics that a clip shape doesn't.",
  },
  {
    what: "A compute section pass for meshes",
    state:
      "Mesh caps are cut on the CPU, one pass per tile. A compute pass would need each tile's buffers and a readback of the segments, and the join across tiles is CPU anyway. It can go behind the same `TileSection`.",
  },
  {
    what: "Caps for polygons and for several shapes",
    state:
      "`capPlanes` handles a set of planes, or one box. A set with a polygon, or with several boxes, has boundaries that plane-by-plane caps can't say, so it makes no cap and the report says why.",
  },
  {
    what: "Caps tied to clips and tilesets",
    state:
      "`BrepCaps` and `MeshCaps` are made by the application, which gives each the clip set and, for a mesh, each tile (`setTile`). Nothing yet makes them when `world.addClip` is called or when a tileset loads a tile.",
  },
  {
    what: "Hatching and element styling of caps",
    state:
      "The styling language's planar fill (plan section 13.27). A cap has a flat colour and a feature ID per element, and `style` is the hook.",
  },
  {
    what: "A section view from a plane, and printing to scale",
    state:
      "An orthographic camera looking at the cut (plan 5d) leads to it. Not built.",
  },
  {
    what: "Drawn-space sets in shadow cascades",
    state:
      "A shadow cascade's or a height capture's view is orthographic with a window of its own, so it keeps the varying: a set named in a drawn reference frame is tested on the true point there. The two agree without a warp.",
  },
  {
    what: "A GPU timing of the fragment test",
    state:
      "Not measured. The reads per fragment above are counted from the shader.",
  },
];

const SPIKES = [
  {
    check: "Clips against float64 (spikes/clips.ts)",
    result: "10 of 10",
    detail:
      "A wall cut by a plane and a window cut by a box; an L-shaped polygon seen from above; the ×10 tower cut by planes named in ITRF and in the drawn reference frame; a capped cylinder (patch draws, trimmed faces and a CPU mesh); a pick through a clipped region; a view that hasn't opted in; and no GPU validation error. Every pixel clear of a boundary is as float64 classifies it.",
  },
  {
    check: "Caps against float64 (spikes/caps.ts)",
    result: "7 of 7",
    detail:
      "A capped cylinder, whose cap fills the section's ellipse and follows the clip when it moves; a block with a bore, whose hole stays open; a closed mesh, whose cap fills the section; an open L-shaped wall, which gets a section line and no cap; a closed mesh split across two tiles, whose cap closes; and no GPU validation error.",
  },
  {
    check: "Curved clips against float64 (spikes/curvedClips.ts)",
    result: "7 of 7",
    detail:
      "A wavy plane across a 24 m plate, fitted to 4.6 cm, about half a pixel; a box window whose kinks fit to 1.49 m; the ×10 plate cut on its true surface.",
  },
];

const TESTS = [
  {
    file: "test/curvedClips.test.ts",
    covers:
      "The set's signed distance in float64; the fit's stated error, which refines with cells; a plane in a design frame under a reprojection planned as curved and cutting a large tile along the bent surface; the field in the rows' `.w` channel as the vertex stage reads it, on a route's lattice or a carrier; the table's row; a moved or removed clip; differing views reported and one view's sets combined by max; and `clipFilter` routing in float64.",
  },
  {
    file: "test/clips.test.ts",
    covers:
      "Shapes, validation, combining and keeping; the table against float64 far from the origin; which space a set is tested in, for no warp, a presentation warp and a reprojection; the view's mask and a view without clips; and the queries, with ray, closest point and segment distance passing over what is removed, and points routed into each set's reference frame.",
  },
  {
    file: "test/queryClips.test.ts",
    covers:
      "The ray queries with clips: the default for a query with and without a view, a view's sets, a set of its own and none, and `\"view\"` refused without a view; the terrain's first kept hit, and clear when the clips remove every hit; the draw cast re-casting from behind each removed hit, only the rays still searching, and refusing a ray through endless removed surfaces; a tileset's geometry; the distance field's ray; and a view's clip changes counted in the query's revision.",
  },
  {
    file: "test/caps.test.ts",
    covers:
      "`capPlanes` for planes, boxes and what it refuses; the bias; `BrepCaps` (a cap a hair inside, facing the right way, six for a clip box, following the form's placement, replaced when the clip moves); the scheduler's throttle and budget; `MeshCaps`' cache and budget; and the style hook.",
  },
  {
    file: "test/brepSection.test.ts, brepSectionSurfaces.test.ts, brepSectionQueries.test.ts",
    covers:
      "Sections of a box, a capped cylinder, a sphere, a box with a bore, a cone frustum, a torus and cylinders of NURBS patches: areas, exact circle edges, nudged planes, limits cut curved sections, and a fitted error under 1e-6 m. The cap form tessellates to the cap's area, is hit by a ray on the solid's part of the plane and missed through the bore.",
  },
  {
    file: "test/meshCaps.test.ts",
    covers:
      "A closed box in one tile and across two; an open mesh as a chain; two elements; an inner box turned inside out as a hole; limits; tiles that nearly meet joining within their geometric error and staying open without it; an inside-out mesh; and the triangulator.",
  },
  {
    file: "test/data/brepSection.test.ts (`npm run test:data`)",
    covers:
      "NIST's CTC-05, a real CAD part of 208 faces, through Open CASCADE: caps through it along each axis and aslant close and validate, and the middle ones match a ray oracle to about 0.3% (the test allows 1%). SMLib's sphere, torus, cone frustum and box minus a cylinder against their analytic sections.",
  },
];

export function Clipping() {
  return (
    <Page
      title="Clipping"
      status="current"
      lede={
        <>
          A section through a site cuts everything in it: terrain, a mesh
          tileset, a b-rep. A clip is a world object named in a reference frame,
          and each view chooses which clips to cut with. Each clip is tested per
          fragment on the point where its reference frame is exact, so a cut
          named in true coordinates stays at its true height when the scene is
          drawn with its heights exaggerated. Caps close the cut.
        </>
      }
    >
      <Note title="How much of this is built">
        <p>
          Increment 8a (world clips), 8b (caps) and 8c (curved clips, cut along
          a fitted signed distance) are built. The last section lists what is
          missing.
        </p>
      </Note>

      <Section title="Why a clip is a world object">
        <p>
          1.x sets clipping planes on a tileset, a model or the globe, so a
          section through federated content is one plane per object, each kept
          in step by the application. In 2.0 a clip belongs to the world. One
          section cuts every tileset, mesh, b-rep and the terrain in it, and
          moves with the reference frame it is named in.
        </p>
        <p>
          A view opts in by mask: <C>View.clipMask</C>, or{" "}
          <C>view.setClips([clip])</C>. A plan view and a section view of the
          same world can differ in what they cut, and the content is drawn once.
          A world holds 32 clips, a view uses 8 and a set takes 16 shapes. They
          share one storage buffer, so changing a shape writes rows and
          recompiles nothing.
        </p>
        <p>
          A clip per item, which 1.x has, can be added later if a need appears.
          The owner decided this on 2026-11-10.
        </p>
        <CodeBlock language="ts" code={snippetText("clip.next.ts")} />
        <p>That snippet compiles against the real types.</p>
        <Written
          from="the overall plan, section 13.26, and src/scene/world/clips.ts"
          on="2026-11-11"
        />
      </Section>

      <Section title="Where a clip is tested">
        <p>
          A warp can separate where content is from where it is drawn (see the
          Warps and routes tab). A clip named in one reference frame has to cut
          in the right place for both. Each set picks one of three, per view and
          per tick, from the rigidity of its routes. The CPU places the set in
          the view&apos;s shading axes, camera-relative, in float64, so the
          fragment stage reads small float32 numbers near the camera.
        </p>
        <Flow label="Which point a set is tested on" steps={SPACE_STEPS} />
        <DataTable
          label="Where each kind of scene tests a clip"
          columns={[
            { head: "Scene", cell: (r) => <Ticks text={r.scene} /> },
            { head: "Clip named in", cell: (r) => <Ticks text={r.named} /> },
            { head: "Tested on", cell: (r) => <Ticks text={r.tested} /> },
            { head: "Because", cell: (r) => <Ticks text={r.why} /> },
          ]}
          rows={SPACES}
        />
        <p>
          The spike&apos;s tower stands under a ×10 height warp, drawn in a 512
          × 512 image. A plane at 1 m named in ITRF cuts the tower at 10 m as
          drawn. Tested on the drawn point instead, it would cut at 1 m as
          drawn, far lower in the image.
        </p>
        <DataTable
          label="The ×10 tower, measured on the GPU"
          columns={[
            { head: "Clip", cell: (r) => r.clip },
            { head: "Tested on", cell: (r) => r.space },
            { head: "Cut, image row", cell: (r) => r.measured, numeric: true },
            { head: "Float64's route says", cell: (r) => r.route },
            { head: "The other point", cell: (r) => r.other },
          ]}
          rows={TOWER}
        />
        <p>
          Both land within a pixel of the route, which the spike requires (1.5
          px). A set that can&apos;t be placed for a view, because its reference
          frame is unavailable, is left out of that view&apos;s table for the
          tick and reported once through the engine&apos;s error channel. A set
          that is rigid on neither side is curved, and is cut as below.
        </p>
        <Written
          from="src/scene/world/clips.ts (planClip), src/render/view/clipTable.ts, test/clips.test.ts and spikes/clips.ts"
          on="2026-11-11"
        />
      </Section>

      <Section title="Shapes and combining">
        <p>
          A clip set holds shapes in one reference frame. Any frame will do,
          presentation frames included: a plane drawn in a design view stays
          where the user drew it when the scene is warped into another.
        </p>
        <DataTable
          label="The three shapes"
          columns={[
            { head: "Shape", cell: (r) => <Ticks text={r.shape} /> },
            { head: "Its inside", cell: (r) => <Ticks text={r.inside} /> },
            { head: "Table rows", cell: (r) => r.rows },
            { head: "Per fragment", cell: (r) => <Ticks text={r.cost} /> },
          ]}
          rows={SHAPES}
        />
        <p>
          The set says how its shapes make one region and which side of it is
          kept. A fragment is drawn when every set the view uses keeps it.
        </p>
        <DataTable
          label="Combining and keeping"
          columns={[
            { head: "`combine`", cell: (r) => <Ticks text={r.row} /> },
            { head: "The region is", cell: (r) => r.inside },
            { head: "What is kept", cell: (r) => <Ticks text={r.kept} /> },
          ]}
          rows={COMBINING}
        />
        <p>The most the table holds:</p>
        <DataTable
          label="Limits of a clip table"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Limit", cell: (r) => r.limit, numeric: true },
            { head: "Note", cell: (r) => <Ticks text={r.why} /> },
          ]}
          rows={LIMITS}
        />
        <p>
          A set the table can&apos;t hold throws a <C>RangeError</C> that names
          what is wrong, when it is added.
        </p>
        <Written
          from="src/scene/world/clips.ts and test/clips.test.ts"
          on="2026-11-11"
        />
      </Section>

      <Section title="The fragment test">
        <p>
          Every fragment stage that writes colour, depth, a shadow, the
          ambient-occlusion prepass or a pick runs one loop over the view&apos;s
          table, and discards what a set removes. Every loop has a constant
          bound and every row index is clamped, so no clip configuration
          compiles a shader.
        </p>
        <p>
          A fragment reads row 0 (the number of sets, and whether any is tested
          on the drawn point), then each set&apos;s row and its shapes. A
          one-plane set reads 4 float4 rows, and a one-box set 6. They are the
          same rows for every fragment of a draw. The drawn point is rebuilt
          only if a set needs it. The first set that removes the fragment ends
          the loop.
        </p>
        <p>
          The float32 test is held to the CPU&apos;s float64 one by a twin of
          the shader (<C>tableKeeps</C>), which the tests compare far from the
          origin, and by the spike on the GPU. No GPU timing of the test is
          recorded yet.
        </p>
        <Written
          from="src/shaders/surface.slang (clipsKeep) and test/clips.test.ts"
          on="2026-11-11"
        />
      </Section>

      <Section title="Pipelines">
        <p>
          A view without clips keeps the pipelines it had, with the clip test
          compiled out, and so keeps early depth. A pipeline of a view with
          clips tests before it writes depth, so it doesn&apos;t. The clipped
          variant of each is made the first time a view uses a clip, and nothing
          recompiles when a clip&apos;s shapes change.
        </p>
        <DataTable
          label="The clipped pipelines"
          columns={[
            { head: "Where", cell: (r) => <Ticks text={r.pass} /> },
            { head: "State", cell: (r) => <Ticks text={r.state} /> },
          ]}
          rows={PIPELINES}
        />
        <p>
          Each view writes its own table into a buffer of its own, and its first
          pass copies it into the shared buffer the clipped pipelines read.
        </p>
        <Written
          from="src/scene/RenderContext.ts, src/render/world/bundles.ts and src/render/view/clipTable.ts"
          on="2026-11-11"
        />
      </Section>

      <Section title="Queries and picks">
        <p>
          What is cut away is not an answer. A pick reads the pick variant,
          which makes the same test as the drawn image and only for the view
          that opted in, so a pick through a cut hits what is behind it.
        </p>
        <p>
          The geometry queries take a <C>clips</C> filter, which{" "}
          <C>engine.clipFilter(view, {"{ clips }"})</C> builds from the
          view&apos;s sets (<C>&quot;view&quot;</C>, the default), a{" "}
          <C>ClipSet</C> or a list, or <C>&quot;none&quot;</C>. It tests points
          in float64, routing each into each set&apos;s own reference frame at
          the scene time: by the matrix for a rigid route, by the route&apos;s
          forward map across a warp. A query without a filter applies no clips,
          which is what a world question such as a distance, a clearance or a
          line of sight wants.
        </p>
        <p>
          Every ray backend takes the same option. <C>RayQuery.clips</C> is a{" "}
          <C>ClipsOption</C>: <C>&quot;view&quot;</C>, a <C>ClipSet</C> or list,
          or <C>&quot;none&quot;</C>. It defaults to <C>&quot;view&quot;</C>{" "}
          when the query names a view (picks and snaps) and to{" "}
          <C>&quot;none&quot;</C> when it doesn&apos;t, which suits a world
          question. The tileset, terrain and draw targets honor it. A
          body&apos;s ellipsoid and an impostor are no drawn surface and ignore
          it.
        </p>
        <ul>
          <li>
            A ray passes over a hit that the clips remove and goes on, a
            b-rep&apos;s included.
          </li>
          <li>
            The terrain&apos;s march goes past a removed hit. A terrain that the
            clips remove entirely answers &quot;unknown&quot;.
          </li>
          <li>
            The GPU draw cast casts again from just behind a removed hit, at
            most 256 times for a ray, skipping 1 mm (or a millionth of the
            distance). A kept surface closer than that behind a removed one is
            passed over, and a ray that crosses more than 256 removed surfaces
            is an error.
          </li>
          <li>
            <C>sdfGeometry.rayHit</C> marches past removed hits.{" "}
            <C>closestPoint</C> and <C>segmentDistance</C> on a signed distance
            field still ignore clips.
          </li>
          <li>A standing query answers again when the clips change.</li>
          <li>
            The closest point is the nearest kept one. On a partly clipped face
            it is found within a sixteenth of the face&apos;s size for a mesh,
            or among the face&apos;s own nearest points for a b-rep, and the
            answer says it isn&apos;t exact.
          </li>
          <li>A segment&apos;s distance counts only what is kept.</li>
        </ul>
        <Written
          from="src/scene/world/clips.ts (clipFilter), src/scene/world/rays.ts, src/query/queries.ts, src/globe/terrainRay.ts, src/geometry/sdf.ts, src/geometry/query.ts and test/clips.test.ts, queryClips.test.ts"
          on="2026-11-11"
        />
      </Section>

      <Section title="Curved clips">
        <p>
          A set whose reference frame reaches neither the content&apos;s true
          side nor the render root rigidly is curved: in the content&apos;s own
          coordinates its surface bends with the warp. A plane named in a design
          frame cuts the true surface of an exaggerated tile, wherever that is
          drawn.
        </p>
        <ul>
          <li>
            <strong>Evaluated in float64.</strong> Per draw, a point goes from
            the model to its anchor, along the route, into the set&apos;s frame,
            where the set&apos;s signed distance is exact.
          </li>
          <li>
            <strong>Fitted as a lattice.</strong> That distance is fitted as a
            scalar cubic lattice, in the placement rows&apos; free <C>.w</C>. A
            draw with no lattice gets a carrier lattice of weight 0, with at
            most 4 cells per axis.
          </li>
          <li>
            <strong>Vertex, then fragment.</strong> The vertex stage evaluates
            the lattice and passes the value in <C>airTransmittance.w</C>, which
            takes no extra location. The fragment stage discards above 0. Picks
            share it, and <C>clipFilter</C> routes in float64.
          </li>
        </ul>
        <p>
          The limits: a world has one curved field, so one view&apos;s curved
          sets combine by max and differing views are reported. Moving a curved
          clip refits every draw it cuts within the per-frame budget. A warp
          scaled after the fit isn&apos;t followed. Billboards, points and
          instances aren&apos;t cut. A draw already at 3 terms with no lattice
          has no room for a carrier. A draw is uncut until its field lands.
        </p>
        <Written
          from="src/scene/world/curvedClips.ts, src/scene/warpFit.ts, src/shaders/placement.slang and test/curvedClips.test.ts"
          on="2026-11-11"
        />
      </Section>

      <Section title="Caps">
        <p>
          A clip removes content fragment by fragment, so a solid cut open looks
          hollow. A cap is the surface that closes the cut. What a cap is made
          from depends on what the content is.
        </p>
        <h3>B-reps: exact</h3>
        <p>
          <C>sectionBrep</C> cuts every face of the solid by each plane and
          builds planar faces on the plane. A face&apos;s section curve is found
          in closed form where there is one. The curve is cut at the exact
          points where the plane crosses the face&apos;s edges, and a piece is
          kept when its midpoint is inside the face&apos;s trim. Pieces are
          turned so the solid&apos;s inside is on the left, joined into loops,
          cut by the other sides of a clip box, and nested into outer loops and
          holes. Outer loops run counter-clockwise in the plane&apos;s (u, v),
          and holes clockwise.
        </p>
        <DataTable
          label="How each surface kind is cut by a plane"
          columns={[
            { head: "Surface", cell: (r) => r.surface },
            { head: "Section", cell: (r) => <Ticks text={r.how} /> },
            { head: "Accuracy", cell: (r) => r.exact },
            { head: "Note", cell: (r) => <Ticks text={r.note} /> },
          ]}
          rows={METHODS}
        />
        <p>
          The cap form is a b-rep of its own, drawn through <C>addBrep</C>. It
          is diced per view with per-pixel trims as any form is, and it can be
          queried and picked: a ray hits it on the solid&apos;s part of the
          plane and passes through a bore. Accuracy and the bias are separate
          things:
        </p>
        <DataTable
          label="Tolerances and numbers of caps"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Value", cell: (r) => r.value },
            { head: "Means", cell: (r) => <Ticks text={r.note} /> },
          ]}
          rows={NUMBERS}
        />
        <Note title="The bias, and what the owner decided">
          <p>
            A cap lies on the clip&apos;s own plane, so a per-fragment test of
            that plane would drop half of it to rounding. The owner&apos;s call
            was to leave the cap out of its own clip. That needs a per-draw
            exemption, and exemptions are the styling language&apos;s, which
            isn&apos;t built. So each cap lies a hair inside the kept side
            instead, and the clip that made it doesn&apos;t remove it. The cap
            sits at most the bias inside the cut. When exemptions land, the bias
            can go.
          </p>
        </Note>
        <h3>Meshes: geometry from the triangles</h3>
        <p>
          Content may be open meshes with no solid behind them, so a mesh cap is
          built from the triangles. Its accuracy is the mesh&apos;s: as good as
          its geometric error.
        </p>
        <Flow label="How a mesh cap is made" steps={MESH_STEPS} />
        <p>
          <strong>Open chains.</strong> A section that doesn&apos;t close is not
          filled. A wall, a curtain or a mesh with a gap gives a chain, and the
          chain is drawn as a line. The report says how many closed and how many
          didn&apos;t.
        </p>
        <p>
          <strong>Gaps between levels of detail.</strong> Tiles at different
          levels of detail may not meet, so a loop can stay open until the tiles
          settle. The join tolerance follows the tiles&apos; geometric error,
          and the report counts open chains whose ends are within 100 snaps of
          another&apos;s as near misses. Until the tiles meet, the section is
          drawn as a line.
        </p>
        <h3>Which clips get caps</h3>
        <p>
          <C>capPlanes</C> turns a set into the planes its kept region is
          bounded by: a set of planes, or one box (six planes). Each
          plane&apos;s cap is the section by it, limited to where it bounds what
          is kept. With shapes combined by intersection that is inside the other
          planes&apos; half-spaces, and by union it is outside them. Whether the
          kept side is the inside or the outside sets the cap&apos;s outward
          normal. A clip box inside a solid gives six caps.
        </p>
        <h3>Rebuilding</h3>
        <p>
          <C>CapScheduler</C> rebuilds caps within a budget. A cap is rebuilt
          when its clip changes, no more than once in 100 ms for one cap, so a
          dragged plane leaves its cap a few times a second and the last
          position always lands. The new draws are in place before the old are
          removed, so no tick is without a cap. Mesh caps cut tiles within the
          budget, and draw when every tile has its cut.
        </p>
        <h3>Styling</h3>
        <p>
          Cap styling is the styling language&apos;s, by planar fill (plan
          section 13.27). Today a cap has a default flat colour (a warm grey,
          linear RGBA 0.78, 0.74, 0.68), a section line is orange, a mesh cap
          carries a feature ID per element, and <C>style</C> is the hook: a
          function from the cap&apos;s kind and feature to a colour, called
          where the language will say how a cap looks. Without a result the
          default stands.
        </p>
        <Written
          from="src/brep/section*.ts, src/scene/world/caps.ts, meshCaps.ts and clips.ts (capPlanes), with the tests below"
          on="2026-11-11"
        />
      </Section>

      <Section title="What isn't built yet">
        <DataTable
          label="Not built"
          columns={[
            { head: "What", cell: (r) => <strong>{r.what}</strong> },
            { head: "State", cell: (r) => <Ticks text={r.state} /> },
          ]}
          rows={NOT_BUILT}
        />
        <Written
          from="the overall plan, section 13.26, and what the code has"
          on="2026-11-11"
        />
      </Section>

      <Section title="How it's verified">
        <p>
          The GPU is held to float64 by spike pages, run by hand in Chrome or
          headless on a machine with a GPU (<C>node scripts/runSpike.mjs</C>).
          Each compares every pixel clear of a boundary with what float64 says
          the clip keeps there. Coverage across an edge is not a classification,
          so pixels within 1 px of a boundary are left out.
        </p>
        <DataTable
          label="GPU spikes"
          columns={[
            { head: "Check", cell: (r) => r.check },
            { head: "Result", cell: (r) => r.result },
            { head: "Cases", cell: (r) => r.detail },
          ]}
          rows={SPIKES}
        />
        <p>
          The Node tests run everywhere. The last needs the setup store&apos;s
          Open CASCADE build, SMLib and the STEP samples.
        </p>
        <DataTable
          label="Node tests"
          columns={[
            { head: "Test", cell: (r) => <C>{r.file}</C> },
            { head: "Covers", cell: (r) => <Ticks text={r.covers} /> },
          ]}
          rows={TESTS}
        />
        <p>
          The ray oracle sums the lengths inside the solid along 400 lines
          across the cap&apos;s box, from the b-rep adapter&apos;s exact ray
          hits. It shares no code with the section, so agreement is evidence
          about the cap, not an arithmetic twin agreeing with itself.
        </p>
        <Written
          from="spikes/clips.ts, spikes/caps.ts, the tests above, and the measurements in the plan, section 13.26"
          on="2026-11-11"
        />
      </Section>
    </Page>
  );
}
