import { useId } from "react";
import { snippetText } from "../snippets.ts";
import {
  C,
  CodeBlock,
  DataTable,
  Figure,
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

const BOX_W = 230;
const BOX_H = 62;

/** A route from content across a presentation warp to the render root. */
function RouteFigure() {
  const titleId = useId();
  const boxes = [
    {
      x: 20,
      name: "Tileset anchor",
      sub: "content, in its own coordinates",
      cls: "d-box",
    },
    { x: 335, name: "ITRF", sub: "where content is", cls: "d-box" },
    {
      x: 650,
      name: "exaggerated",
      sub: "a warp frame: the render root",
      cls: "d-box d-box-accent",
    },
  ];
  return (
    <svg viewBox="0 0 900 250" role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        A route from a tileset anchor to the render root. The anchor is placed
        in ITRF by a rigid step. ITRF is joined to a reference frame called
        exaggerated by a warp, which is a presentation warp, and the camera rig
        sits on exaggerated, so it is the render root. The first two boxes are
        in true coordinates, reached without crossing a presentation warp. The
        third is drawn coordinates.
      </title>
      {[0, 1].map((i) => (
        <g key={i}>
          <path
            className="d-edge"
            strokeWidth={1.5}
            strokeDasharray={i === 1 ? "6 4" : undefined}
            d={`M${boxes[i]!.x + BOX_W} 61 H${boxes[i + 1]!.x}`}
          />
          <text
            className="d-text"
            textAnchor="middle"
            x={(boxes[i]!.x + BOX_W + boxes[i + 1]!.x) / 2}
            y={50}
          >
            {i === 0 ? "rigid" : "warp"}
          </text>
        </g>
      ))}
      {boxes.map((b) => (
        <g key={b.name}>
          <rect
            className={b.cls}
            x={b.x}
            y={30}
            width={BOX_W}
            height={BOX_H}
            rx={8}
          />
          <text className="d-title d-mono" x={b.x + 14} y={56}>
            {b.name}
          </text>
          <text className="d-text" x={b.x + 14} y={78}>
            {b.sub}
          </text>
        </g>
      ))}
      <path className="d-edge" strokeWidth={1.5} d="M20 112 V122 H565 V112" />
      <text className="d-text" x={20} y={148}>
        True coordinates: reached without crossing a presentation warp
      </text>
      <path className="d-edge" strokeWidth={1.5} d="M650 112 V122 H880 V112" />
      <text className="d-text" x={650} y={148}>
        Drawn coordinates
      </text>
      <text className="d-text d-mono" x={20} y={196}>
        Route.steps[0]: rigid, a 4×4
      </text>
      <text className="d-text d-mono" x={20} y={218}>
        Route.steps[1]: warp, forward (presentation: true)
      </text>
    </svg>
  );
}

const KINDS = [
  {
    row: "Changes",
    operation: "Where content is",
    presentation: "How it is drawn, never where it is",
  },
  {
    row: "Examples",
    operation: "A reprojection, a datum shift",
    presentation:
      "Vertical exaggeration. Planned: the 2D and 3D morph, an exploded view",
  },
  {
    row: "`Warp.presentation`",
    operation: "false",
    presentation: "true",
  },
  {
    row: "A route that crosses it",
    operation: "Is still a route to true coordinates",
    presentation:
      "Has `Route.presentation` true: its answers say where content is drawn",
  },
  {
    row: "A query that needs true coordinates",
    operation: "Carries through it",
    presentation:
      "Throws `PresentationRouteError`, naming both reference frames",
  },
];

const QUESTIONS = [
  {
    question:
      "Distances, clearance, line of sight, volumes, sections, b-rep queries",
    asked: "True coordinates, in a named reference frame",
    state:
      "Ray queries are built that way: they carry rays through coordinate-operation warps and refuse a route that crosses a presentation warp. Measurements that report true values are increment 6, not built.",
  },
  {
    question: "Which tiles to load, and how finely",
    asked: "Drawn, because the camera is where things are drawn",
    state:
      "Built (increment 3): selection runs on drawn volumes and stretches the tile's error by what the warp does.",
  },
  {
    question: "Light, shading, shadows, the length of a path through air",
    asked: "Drawn: these are geometry",
    state:
      "Built: a fragment's `positionEC` is the drawn position, and normals turn with the surface.",
  },
  {
    question: "What is under the cursor",
    asked: "A view question with a true answer",
    state:
      "Not built. A pick still reads the depth that was drawn, so it reports a drawn position. Picks by domain point are increment 5.",
  },
  {
    question:
      "A height tint, contours, height thresholds in a style, the air's density",
    asked: "Lookups keyed by height: the true height",
    state:
      "Decided in principle, not built. The owner wants a spike comparing drawn and true height first; it waits for the API review.",
  },
];

const NAMES = [
  {
    name: "`Warp`, `Route`, `RouteStep`",
    what: "The types, in `src/camera/route.ts`: a non-rigid edge, and the path of rigid and warp steps from a content reference frame to a base.",
  },
  {
    name: "`warpFrame`",
    what: "A reference frame whose edge to its parent is a warp: `warpFrame(name, parent, spec)`, with `spec` a `Warp` without its ends. Public from the `/frames` entry point, with `WarpFrame`, `WarpSpec` and `isWarpFrame`.",
  },
  {
    name: "`verticalExaggeration`, `heightOffset`, `scaleAbout`, `blendWarps`, `warpFromFunction`, `reprojectionWarp`",
    what: "Helpers that return a `WarpSpec` for `warpFrame`, with the Jacobian, the inverse and the revision done (the next section). The first five are from `/frames`, the last from `/proj`.",
  },
  {
    name: "`FrameResolver.route`",
    what: "`route(frame, base, seconds)`: rigid runs composed into one 4×4 each, and a step for every warp, `inverse` where the route runs from a warp's child back to its parent. A route that crosses no warp is one rigid step, the matrix `resolve` gives.",
  },
  {
    name: "`resolveRoute`",
    what: "The resolver's `route`, or for a resolver without one a single rigid step from `resolve`.",
  },
  {
    name: "`NonRigidRouteError`",
    what: "Thrown by `resolve`, `motion` and `frameTransform` across a warp, which has no 4×4. Ask for the route.",
  },
  {
    name: "`routeForward`, `routeInverse`, `warpInverse`",
    what: "A point carried along the route or back, in float64. A warp's own `inverse` is used at scale 1. Without one, Newton's method with the warp's Jacobian stops at 1 nm of residual, or when the step is below float64's rounding at that size.",
  },
  {
    name: "`routeRevision`, `watch`",
    what: "A route's revision counts its warps' `revision`. An application bumps it and calls `invalidate()`, and the resolver's watchers hear, so on-demand rendering wakes.",
  },
];

interface Measured {
  tile: string;
  asked: string;
  cells: string;
  error: string;
  time: string;
}

const FITS: Measured[] = [
  {
    tile: "A 10 km tile centred 7,000 m up on Everest, geometric error 100 m",
    asked: "1.56 m (geometric error ÷ 64)",
    cells: "1",
    error: "0.43 mm",
    time: "About 0.7 ms warm; the first, cold, took 6 ms",
  },
  {
    tile: "A 1,000 km tile at Everest's longitude and latitude, geometric error 50 km",
    asked: "781 m (geometric error ÷ 64)",
    cells: "4 (64 cells)",
    error: "304 m",
    time: "About 40 ms, counting the 1- and 2-cell attempts",
  },
  {
    tile: "The same tile, asked for the 1 mm floor",
    asked: "1 mm",
    cells: "8 (512 cells): the limit, so it misses",
    error: "21 m",
    time: "About 325 ms",
  },
];

const MEASURES: Array<{ check: string; result: string; where: string }> = [
  {
    check:
      "Quads anchored in ITRF, drawn in a view rooted on a ×10 height warp, at scales 0, 0.4 and 1. Each vertex is measured from the image against `routeForward` and the view's projection.",
    result:
      "Every vertex within 0.06 px. The page's limit is half a pixel plus the fit's own error in pixels. One fit per draw, however the scale moves.",
    where: "spikes/warpRoute.html, NVIDIA Lovelace GPU, 2026-11-10",
  },
  {
    check:
      "A grid under a warp with a known form, at k = 10 and then 4 (one float written, no refit): the stage's turned normal, design position and drawn position against the float64 twin, interpolated alike. The unplaced path is held to the same checks.",
    result:
      "Turned normals within 0.003° (limit 0.1°); positions within 0.03 mm (limit 0.1 mm). A placement that moves nothing shades as the unplaced draw does, within 2 levels.",
    where: "spikes/placementNormals.html, NVIDIA Lovelace GPU, 2026-11-10",
  },
  {
    check:
      "Each placement kind alone, against its CPU twin: a dual position at t = 1.5, a fitted operation, blends at t = 0.75 and −0.5.",
    result:
      "Every vertex within half a pixel, each moved by more than 5 px. The Precision tab has an older run: worst vertex 0.028 px.",
    where:
      "spikes/placement.html, NVIDIA Lovelace GPU (the older run: Apple M2)",
  },
  {
    check:
      "Four kinds of item near the pole, in one view rooted on a ×10 height warp, each's bounding box in the image against the float64 route and the view's projection: a terrain tile with `h·n̂` (exact), the same tile fitted, an anchored billboard, and a pole with `warpAt: \"anchor\"`. Then the globe, its tiles generated in a worker.",
    result:
      "All four kinds within 0.58 px at ×10 and at ×4.6 (the scale at 0.4, one float, no refit of the exact tile); the limit is 1.5 px. The globe's 4,760 tile draws were drawn exact, none pending.",
    where:
      "spikes/warpGlobe.html, run with scripts/runSpike.mjs on this machine's GPU in Edge, 2026-11-11",
  },
];

const TESTS = [
  {
    file: "warpHelpers.test.ts",
    covers:
      "Each helper's forward, Jacobian (against differences) and inverse at Earth scale, at the poles, on WGS84, a sphere, a triaxial ellipsoid and a plane; exaggeration against its definition (heights scaled, latitude and longitude kept); the numerical Jacobian's step against a small domain; blends; reprojection with a Mercator operation, a service's answer and an engineering frame; and the helpers through `warpFrame`, `route()` and `routeForward`, with `changed()` waking watchers.",
  },
  {
    file: "frameWarp.test.ts",
    covers:
      "A warp as an edge: the route's steps, rigid runs either side, a round trip to 1 µm at Earth scale both ways, `resolve` and `motion` refusing, revisions and `watch`, accuracy in quadrature, a bound-only warp stating no σ, `resolveRoute` for a resolver without `route`.",
  },
  {
    file: "warpFit.test.ts",
    covers:
      "`fitLattice` reproducing a cubic to rounding, improving with cells, stopping at the tolerance; Everest and 1,000 km tiles against 2,000 random points; `routeDisplacement`; the fit cache's budget, newest-first order, stale fits, root, eviction.",
  },
  {
    file: "warpBounds.test.ts",
    covers:
      "Random placed points inside moved spheres for lattices of 1, 2 and 4 cells and weights of two factors; weight intervals by brute force; rounding that never goes down; σ at k = 10.",
  },
  {
    file: "warpSelection.test.ts",
    covers:
      "k = 10 selecting a level deeper than k = 1; distance to the drawn volume; the error stretched by σ_max plus the fit's; 5,000 random points of a 200 km tile inside its drawn sphere; the horizon test off under a warp.",
  },
  {
    file: "warpWorld.test.ts",
    covers:
      "Anchors placed by a route's affine part; a rig whose own reference frame crosses a warp refused; draws held until fitted, stale fits kept, refits on a revision or a root change; a scale as a weight, a ranged scale writing one float and walking no draw; selection through the engine; rays through a warp.",
  },
  {
    file: "placementJacobian.test.ts",
    covers:
      "The Jacobian against central differences; cofactor normals perpendicular to placed triangles, folds included; the drawn position rebuilt from the window position and depth; the varyings' 13 locations.",
  },
  {
    file: "warpGlobe.test.ts",
    covers:
      "A terrain tile's `h·n̂` term: held a frame after its upload, then exact with no fit, and what the worker makes. An acceptance world of terrain, a tileset, a model with instances and a billboard under ×10 heights. `warpAt` on an item, both ways; the anchor's rotation from a Jacobian with its stretch dropped, for a draw and for an instance's matrix. The globe selected on drawn volumes, and asked for `h·n̂` only under a height scale on its own ellipsoid.",
  },
];

const NOT_BUILT = [
  {
    what: "Per-view terms",
    state:
      "One warp context per world, fitted for the root of the world's first view. Another view with a different root shows the first view's draws, and the engine warns once.",
  },
  {
    what: "Point sets and a `ModelPool`'s instances",
    state:
      "Drawn at their anchor's affine place, unwarped, and the engine says so once: a point set's cull reads positions a placement doesn't reach, and a pool's instances are written by the GPU, which the CPU can't move by the route. The owner's rule forced points to `\"anchor\"`; they aren't warped at all yet.",
  },
  {
    what: "Exact terrain for any warp but a height scale",
    state:
      "Terrain is exact only under a warp that declares `Warp.heightScale` on its own ellipsoid (WGS84, base height 0), through the `h·n̂` attribute. Flattening, a reprojection or any other warp is fitted per vertex like a tileset, to `max(1 mm, geometricError / 64)`.",
  },
  {
    what: "Picks by domain point",
    state:
      "A pick variant that returns the item, the primitive and barycentrics, so the true point is interpolated from the content's own vertices and needs no inverse of any warp (increment 5). Until then picks, `World.castRays` and the CPU terrain-pick fallback read undeformed bounds and the drawn depth.",
  },
  {
    what: "Measurements, snaps, and the example",
    state:
      'Measurements and snaps in true frames, with their graphics drawn through the route (increment 6), then the "Vertical exaggeration" example (increment 7): the application defines the warp frame and the rig, as in the snippet above. A drawn-distance query, named as one, is also decided.',
  },
  {
    what: "Height-keyed lookups",
    state:
      "Tints, contours and air density read the true height, which needs it at a fragment. It waits for the API review and a spike.",
  },
  {
    what: "Float32 constants, and a free scalar",
    state:
      "A lattice's constant term is added in model space before the camera-relative transform, so two large float32 numbers can cancel (the plan estimates 4 mm at a 36 km displacement). The planned fix, the order-0 term as high and low parts in the cull kernel, isn't built. Nor is the lattice rows' unused fourth component carrying a fitted scalar per tile (true height, a curved section): it is zero.",
  },
  {
    what: "Fitting off the main thread",
    state:
      "Warps are JavaScript closures, which a worker can't be sent, so fits run on the main thread within the budget.",
  },
  {
    what: "More users of drawn volumes",
    state:
      "Shadow casters' selection, the viewer's request volume, and dynamic screen-space error still use undrawn volumes. `routeSingularRange` gives [σ_min, σ_max], but nothing reads it yet: it is for the ray-march step and snap tolerances.",
  },
];

const HELPERS = [
  {
    name: "`verticalExaggeration({ factor, reference?, baseHeight?, scale? })`",
    makes:
      "Height above a reference multiplied by `factor` about `baseHeight`, along the surface's normal: latitude and longitude kept. The reference is WGS84 by default, `{ ellipsoid }`, `{ sphere: radius }` or `{ plane: { origin?, normal? } }`. `scale` is a slider: at `s` heights are multiplied by `1 + s(factor − 1)`, and the engine fits the unit displacement once.",
    jacobian:
      "Exact closed form, at any height and at the poles: `(I + hS)⁻¹(I + h′S − nnᵀ) + (dh′/dh)nnᵀ`, with `S` the surface's shape operator. Exact inverse.",
    kind: "Presentation",
  },
  {
    name: "`heightOffset(metres, { reference?, presentation?, scale? })`",
    makes:
      "A constant offset along the reference's normal, to lift content clear of terrain or sink it.",
    jacobian: "Exact, the same form with `h′ = h + metres`. Exact inverse.",
    kind: "Presentation (`presentation: false` for a real offset)",
  },
  {
    name: "`scaleAbout(point, factors, { ellipsoid?, presentation?, scale? })`",
    makes:
      "An anisotropic scale about a point on the body, along its local east, north and up: one number or three.",
    jacobian: "The matrix `E·diag(f)·Eᵀ`, constant. Exact inverse.",
    kind: "Presentation",
  },
  {
    name: "`blendWarps(a, b, t)`",
    makes:
      "`(1 − t)·a(p) + t·b(p)` of two warps between the same frames, each at its own scale. To fade one warp in from nothing, give it a `scale` instead.",
    jacobian:
      "The same blend of theirs, exact. Newton's inverse. Accuracy: the weighted sum of theirs.",
    kind: "Presentation if either is",
  },
  {
    name: "`warpFromFunction(map, { presentation, ... })`",
    makes:
      "Your own map, as a plain function from a point to a point in metres. Nothing to know about Jacobians.",
    jacobian:
      "Central differences, with a step of `(3·ε·R·L²)^(1/3)` where `L` is the domain's radius, else `|p|`: right to about 1e-10 for a map smooth on the scale of `L` (measured 4e-10 on a ×10 exaggeration at Earth scale). Newton's inverse, or the `inverse` you give.",
    kind: "You say: `presentation` is required",
  },
  {
    name: "`reprojectionWarp(operation, { parent?, areaOfInterest? })` from `/proj`",
    makes:
      "A coordinate operation (PROJ's `RecordedOperation`, any `CoordinateOperation`, a service's `ResolvedCoordinates`, or an `EngineeringFrame` with its site transform) as the edge between a design CRS's frame and the body-fixed one. The design frame is the body frame's child by default.",
    jacobian:
      "Numerical, as `warpFromFunction`; the inverse is the operation's own, exact. Accuracy is the operation's `sigma`; an operation that states none gives a warp that says its accuracy is unstated, never exact.",
    kind: "Not a presentation warp",
  },
];

export function Warps() {
  return (
    <Page
      title="Warps and routes"
      status="current"
      lede={
        <>
          Reprojecting content, drawing a design view, and exaggerating heights
          are one thing: a smooth map of space that isn't a rigid transform. 2.0
          makes it an edge of the reference frame graph, so one mechanism serves
          all three, and an application that wants vertical exaggeration defines
          a warp and moves its camera onto it. Nothing is set on any item.
        </>
      }
    >
      <Note title="How much of this is built">
        <p>
          Increments 1 to 4 of the plan are built: routes and the fitter, the
          GPU form with its Jacobian and the varying swap, drawn bounds, and the
          globe, billboards and instances under a warp, with <C>warpAt</C>. The
          last section lists what isn&apos;t. Applications make the only warps
          there are today, with the helpers below or by hand. The engine's own
          reprojections still go through the <C>Placement</C> kinds, which are
          converted to the same terms inside the engine.
        </p>
      </Note>

      <Section title="Why one model">
        <p>
          Three needs looked separate. A reprojection draws content in a
          coordinate system other than the one it was made in. A design view
          draws a region flat, in its map projection. Vertical exaggeration
          draws heights ten times as tall, the globe and terrain included. Each
          is a smooth map of space, exact where it can be, and each used to want
          its own machinery.
        </p>
        <p>
          The test of the model is the third. An application can exaggerate
          everything through the model alone, and the engine has no exaggeration
          feature: <C>verticalExaggeration</C> is a helper over the same warp an
          application could write by hand. It is one call. The snippet shows the
          helpers first, and the hand-written warp, about 25 lines with its
          Jacobian, last.
        </p>
        <CodeBlock language="ts" code={snippetText("warp.next.ts")} />
        <p>
          That snippet compiles against the real types, and{" "}
          <C>spikes/warpRoute.ts</C> draws the same setup on a GPU. The rig sits
          on the new reference frame, so it is the render root. Every mesh and
          tileset already reaches the root through the tree, so each is drawn
          exaggerated with nothing set on it. The last section says what doesn't
          yet. A slider is one float.
        </p>
        <Written
          from="the overall plan, section 13.26, and spikes/warpRoute.ts"
          on="2026-11-10"
        />
      </Section>

      <Section title="Common warps, without a Jacobian">
        <p>
          Most applications want one of a few warps and shouldn't have to know
          what a Jacobian is: the matrix of how a map stretches space, which the
          engine reads for its fits, for selection and for Newton's method. Each
          helper returns a <C>WarpSpec</C> for <C>warpFrame</C> with the
          Jacobian, the inverse, the description for reports and{" "}
          <C>presentation</C> done. Every one but <C>blendWarps</C>,{" "}
          <C>warpFromFunction</C> and <C>reprojectionWarp</C> has an exact
          closed form for both.
        </p>
        <DataTable
          label="The warp helpers"
          columns={[
            { head: "Call", cell: (r) => <Ticks text={r.name} /> },
            { head: "Makes", cell: (r) => <Ticks text={r.makes} /> },
            {
              head: "Jacobian and inverse",
              cell: (r) => <Ticks text={r.jacobian} />,
            },
            { head: "Kind", cell: (r) => <Ticks text={r.kind} /> },
          ]}
          rows={HELPERS}
        />
        <p>
          <strong>Changing one.</strong> The helpers' warps are live: setting{" "}
          <C>factor</C>, <C>baseHeight</C>, <C>metres</C>, <C>factors</C> or{" "}
          <C>t</C> calls <C>changed()</C>, which bumps the revision, so every
          route through it is refitted, and invalidates the frames built on it,
          so watchers hear. <C>warpFromFunction</C>'s function has no setter to
          catch, so call <C>changed()</C> after it starts behaving differently.
          A slider doesn't need that: give <C>scale</C> a world's{" "}
          <C>PlacementParameter</C> and it is one float.
        </p>
        <p>
          <strong>Accuracy.</strong> The exact helpers round-trip to about a
          nanometre at Earth scale (the ellipsoid's foot is solved to float64's
          rounding, finer than the 1.x algorithm's stop). A numerical Jacobian
          never changes where Newton converges, only how the engine estimates
          the warp's stretch, and its error is stated with the helper. A map
          with features smaller than its step needs a smaller <C>step</C>, a
          smaller <C>domain</C>, or the hand-written warp.
        </p>
        <Written
          from={
            <>
              <C>src/frames/warps.ts</C>, <C>src/frames/heightWarps.ts</C>,{" "}
              <C>src/proj/reprojectionWarp.ts</C> and{" "}
              <C>test/warpHelpers.test.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="True coordinates and the drawn map">
        <p>
          Two kinds of warp differ in one flag. A{" "}
          <strong>coordinate operation</strong> changes where content is. A{" "}
          <strong>presentation warp</strong> changes only where it is drawn.
          &quot;True&quot; is not a layer of the engine: it means any reference
          frame reached without crossing a presentation warp.
        </p>
        <DataTable
          label="The two kinds of warp"
          columns={[
            { head: "", cell: (r) => <Ticks text={r.row} /> },
            {
              head: "Coordinate operation",
              cell: (r) => <Ticks text={r.operation} />,
            },
            {
              head: "Presentation warp",
              cell: (r) => <Ticks text={r.presentation} />,
            },
          ]}
          rows={KINDS}
        />
        <p>
          A world's answers never change when the drawn map does. A distance
          measured on exaggerated terrain reports true heights. Rays are a world
          question, so they refuse a presentation route rather than answer in
          the wrong place. What a person points at is a view question, and its
          answer should still be a true point. Which is which decides where each
          question is asked:
        </p>
        <DataTable
          label="World questions and view questions"
          columns={[
            { head: "Question", cell: (r) => <Ticks text={r.question} /> },
            { head: "Asked in", cell: (r) => r.asked },
            { head: "Today", cell: (r) => <Ticks text={r.state} /> },
          ]}
          rows={QUESTIONS}
        />
        <p>
          The plan also rules that a design view's flattening is a change of
          chart (the render root is the engineering reference frame), not a
          presentation warp. Nothing in the code depends on that yet.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.26, <C>src/camera/route.ts</C>,{" "}
              <C>src/query/frameRays.ts</C> and <C>src/streaming/tileWarp.ts</C>
            </>
          }
          on="2026-11-10"
        />
      </Section>

      <Section title="Warps as edges, and routes">
        <Figure
          scroll
          label="A route across a presentation warp"
          caption="A tileset's content reaches the render root by a rigid step, then a warp. The rig's own reference frames must reach the root rigidly, so the rig sits on the warp frame or under it."
        >
          <RouteFigure />
        </Figure>
        <p>
          A <C>Warp</C> maps points of its <C>from</C> reference frame to its{" "}
          <C>to</C>, in metres, in float64. It has a <C>revision</C>, an
          optional <C>domain</C>, optional stated <C>accuracy</C>, an optional{" "}
          <C>inverse</C>, and a <C>forward</C> that also writes its Jacobian
          when asked (selection reads it for the warp's stretch). A route is the
          path from a content reference frame to a base, as ISO 19111's
          concatenated operation and PROJ's pipeline are.
        </p>
        <DataTable
          label="Routes and warps in the code"
          columns={[
            { head: "Name", cell: (r) => <Ticks text={r.name} /> },
            { head: "What it is", cell: (r) => <Ticks text={r.what} /> },
          ]}
          rows={NAMES}
        />
        <p>
          <strong>What a rig can do.</strong> A camera rig's own reference
          frames must reach the render root rigidly, because the root follows
          the rig. The camera layer refuses one that crosses a warp, keeps its
          last pose, and says why. Content is different: an anchor whose route
          crosses a warp is placed by the route's affine part (its rigid steps
          composed, the warps as the identity) and marked with the route, which{" "}
          <C>View.anchorRoute</C> reports. A resolver without <C>route</C> can't
          place content across a warp.
        </p>
        <p>
          <strong>Scaled warps.</strong> A warp may carry a <C>scale</C>, read
          live, and applies as <C>p + s·(forward(p) − p)</C>: the identity at 0,
          the warp as stated at 1. A world's <C>PlacementParameter</C> is one,
          and a slider writes one float. That stays one float all the way to the
          GPU when the scale is a world's parameter, and its warp is the only
          scaled one, crossed forward and followed only by rigid steps: the
          displacement is then exactly <C>s</C> times a unit displacement,
          fitted once. Any other arrangement refits when the scale changes, as a
          revision change does.
        </p>
        <Written
          from={
            <>
              <C>src/camera/route.ts</C>, <C>src/frames/warpFrame.ts</C>,{" "}
              <C>src/frames/resolver.ts</C>, <C>src/camera/CameraLayer.ts</C>,{" "}
              <C>src/scene/world/warps.ts</C> and <C>test/frameWarp.test.ts</C>
            </>
          }
          on="2026-11-10"
        />
      </Section>

      <Section title="Per-tile fits">
        <p>
          The GPU can't call a closure, so each draw under a warped anchor gets
          a fit of its route. The fitted displacement is{" "}
          <C>D(p) = A⁻¹·route(p) − p</C> in the draw's model coordinates, where{" "}
          <C>A</C> is the anchor's affine place, computed as <C>L⁻¹(q − A·p)</C>{" "}
          so that Earth-sized numbers cancel before they are scaled. It is
          fitted over the draw's bounding sphere.
        </p>
        <h3>The lattice</h3>
        <ul>
          <li>
            <C>u = (p − center) / scale</C> puts the tile in the cube from −1 to
            1.
          </li>
          <li>
            The cube is cut into <C>cells</C> per axis (1, 2, 4 or 8). A point's
            cell is <C>floor((u + 1) / 2 · cells)</C>, clamped, and its local
            coordinate <C>v</C> runs from −1 to 1 inside it. Cells run x
            fastest. A point outside the cube takes the nearest cell's
            polynomial, extrapolated.
          </li>
          <li>
            Each cell holds the 20 monomials of total degree 3 or less in{" "}
            <C>v</C>, times 3 components, in model units: coefficient{" "}
            <C>((cell · 20) + term) · 3 + axis</C>. That is <C>CubicLattice</C>,
            in <C>src/scene/warpTerms.ts</C>.
          </li>
        </ul>
        <h3>The fit, and how good it is</h3>
        <ul>
          <li>
            Each cell is fitted by Householder QR at 5 × 5 × 5 Chebyshev–Lobatto
            samples, with no normal equations.
          </li>
          <li>
            The error is measured at a denser 9 × 9 × 9 grid per cell, which
            makes it <strong>an estimate</strong>, flagged <C>estimate: true</C>
            . On 2,000 random points the worst observed error was at most 0.85
            of it, for both tiles in the table below.
          </li>
          <li>
            The tolerance is <C>max(1 mm, geometricError / 64)</C>, which is
            0.25 px at a 16 px threshold. A fit's error is a small share of the
            tile's own, so refining a tile never downloads content just to fix a
            fit, and two neighbouring fits that disagree by up to twice their
            error are half a pixel apart at most.
          </li>
          <li>
            <C>fitLattice</C> doubles the cells per axis, 1 then 2, 4 and 8,
            until the estimate meets the tolerance or the limit is reached, and
            returns the last fit so the caller sees whether it missed.
          </li>
        </ul>
        <DataTable
          label="Measured fits of vertical exaggeration by 10, WGS84 heights"
          columns={[
            { head: "Tile", cell: (r) => r.tile },
            { head: "Tolerance asked", cell: (r) => r.asked },
            { head: "Cells per axis", cell: (r) => r.cells },
            { head: "Estimated error", cell: (r) => r.error },
            { head: "Fit time", cell: (r) => r.time },
          ]}
          rows={FITS}
        />
        <p>
          A fit costs the same per cell whatever the tile: 125 samples to fit
          and 729 to check, so 854 evaluations of the route per cell. The times
          are from a Node run on a development machine and will vary. The coarse
          tile shows why a tile near the root of a globe needs a lattice: one
          cubic fits a hemisphere badly.
        </p>
        <h3>The cache, the budget, and holding hidden</h3>
        <ul>
          <li>
            <C>WarpFitCache</C> keeps a fit per draw and render root, and
            returns the stale fit while a refit is queued. It runs queued fits
            newest first within a budget, and always at least one, so a budget
            below one fit still makes progress.
          </li>
          <li>
            The engine runs it once a tick: 4 ms by default (
            <C>Engine.warpBudgetMs</C>), and it stays awake while any fit is
            pending.
          </li>
          <li>
            A draw under a warped anchor is hidden the moment it is found and
            shown at its first fit, so unwarped content never flashes. A draw
            the application hid stays hidden.
          </li>
          <li>
            A revision change, a render-root change, or a scale that isn't a
            weight refits. The old fit is drawn meanwhile.
          </li>
          <li>
            The tile's geometric error sets the tolerance, so a draw with none
            known is fitted to the 1 mm floor.
          </li>
        </ul>
        <Written
          from={
            <>
              <C>src/scene/warpFit.ts</C>, <C>src/scene/warpFitCache.ts</C>,{" "}
              <C>src/scene/world/warps.ts</C> and <C>test/warpFit.test.ts</C>,
              whose table gives the measured fits
            </>
          }
          on="2026-11-10"
        />
      </Section>

      <Section title="The GPU form">
        <p>
          One form serves every case: <C>p′ = p + Σ wᵢ·Dᵢ(p)</C> in model space,
          with at most three terms (<C>MAX_WARP_TERMS</C>).
        </p>
        <ul>
          <li>
            <strong>A term's displacement</strong> is a cubic lattice (a route's
            fit) or a vertex attribute: a glTF morph target, or a dual position,
            which holds a second position and is read as that minus the
            vertex's.
          </li>
          <li>
            <strong>A term's weight</strong> is a constant times up to two
            factors, each <C>offset + slope · parameter</C>, where a parameter
            is one float in the world's placements buffer. A scaled warp's scale
            is the weight of its unit displacement. Two factors let a weight
            such as <C>(k − 1)(1 − t)</C> follow two sliders with no refit. The
            2D morph that would use it isn't built.
          </li>
          <li>
            <strong>The route's term</strong> comes last, after the draw's own
            terms, with weight 1 or the scale parameter. It reads the undeformed
            position, so combined with a morph it is first-order.
          </li>
          <li>
            <strong>The buffer:</strong> a block per draw of float4 rows: a
            header, three rows a term, then each lattice's body, which is a row
            for its center and 1 / scale, and 20 rows a cell. One cell is 21
            rows, and the largest lattice 10,241.
          </li>
        </ul>
        <DataTable
          label="Cost per placed vertex"
          columns={[
            { head: "Case", cell: (r) => r.what },
            { head: "Row reads", cell: (r) => r.reads, numeric: true },
            {
              head: "float3 multiply-adds",
              cell: (r) => r.mads,
              numeric: true,
            },
          ]}
          rows={[
            {
              what: "A draw with no placement",
              reads: "0",
              mads: "One compare",
            },
            {
              what: "One cubic term, one cell: position only (before the Jacobian)",
              reads: "22",
              mads: "20",
            },
            {
              what: "The same, with the Jacobian",
              reads: "23",
              mads: "80, then about 44 for the normal and tangent",
            },
          ]}
        />
        <p>
          Reads dominate, so what the Jacobian adds is ALU. The CPU twin of each
          GPU function is in <C>src/scene/warpEvaluate.ts</C>, in float64 and in
          the same order of operations.
        </p>
        <h3>The Jacobian and normals</h3>
        <p>
          <C>placeVertex</C> returns the position and <C>J = I + Σ wᵢ·Jᵢ</C>. A
          lattice's derivative is analytic, chained by cells ÷ scale. The vertex
          stage turns the normal by J's cofactor matrix, <C>det(J)·J⁻ᵀ</C>, so
          no inverse is needed and a fold keeps the normal on its side, and
          turns the tangent by J, keeping its handedness. At k = 10 slopes are
          ten times as steep, so normals have to turn with the surface. A morph
          target or dual position has no derivative in space, so under one the
          normal stays as stored: on the 44 km corridor that left a dual
          position's normals 0.197° off, which a fitted lattice's turned normals
          avoid.
        </p>
        <h3>The varying swap</h3>
        <p>
          The surface stage still has 13 user locations. Two of them changed
          meaning:
        </p>
        <DataTable
          label="The varyings that changed"
          columns={[
            { head: "Location", cell: (r) => r.location },
            { head: "Carries", cell: (r) => r.carries },
            { head: "Unplaced draw", cell: (r) => r.unplaced },
            { head: "Placed draw", cell: (r) => r.placed },
          ]}
          rows={[
            {
              location: "8",
              carries: "positionMC",
              unplaced: "The mesh's position",
              placed:
                "The design position, before the placement: RenderMan's Pref, which a procedural texture can stick to",
            },
            {
              location: "4",
              carries: "The camera-relative position",
              unplaced: "Where it is drawn, bit for bit as before",
              placed:
                "The draw's transform of the design position. The drawn position is rebuilt per fragment",
            },
          ]}
        />
        <p>
          A placed draw's drawn position is rebuilt in the fragment stage from{" "}
          <C>@builtin(position)</C> and the view's rotation-only reverse-Z
          projection: <C>w · (right·x/|row0|² + up·y/|row1|² + direction)</C>
          with <C>w = near / depth</C>, about 17 multiply-adds, camera-relative
          so nothing is large. Billboards, the underlay, and the shadow and
          height-capture views (orthographic) keep the varying. Interpolating
          the design position gives each fragment the point on the content it
          is, and lighting and the air read the rebuilt drawn position.
        </p>
        <p>
          The plan calls location 4 the true position. In the code it is the
          draw's transform of the position before the whole fitted route, so it
          is true only while the route's warps are all presentation warps. A
          route is fitted whole: a coordinate operation's intermediate point
          isn't separated from the fit.
        </p>
        <p>
          <strong>Custom shaders.</strong> <C>fsInput.positionMC</C> is now the
          design position, <C>positionEC</C> the drawn one, and{" "}
          <C>vsInput.normalMC</C> the turned normal. <C>designPositionMC</C> is
          there in the vertex stage. A Slang preset that displaces in{" "}
          <C>vertexMain</C> and reads <C>positionMC</C> afterwards looks
          slightly different: carry that displacement in a named attribute.
        </p>
        <Flow
          label="One draw's life under a warp"
          steps={[
            {
              title: "The anchor is placed",
              body: (
                <>
                  The camera layer places it by the route's affine part and
                  marks it with the route.
                </>
              ),
            },
            {
              title: "The draw is found and held",
              body: <>Hidden until its first fit lands.</>,
            },
            {
              title: "A fit is queued and run",
              body: (
                <>
                  <C>fitLattice</C> over the draw's sphere, within the tick's 4
                  ms budget.
                </>
              ),
            },
            {
              title: "The term is written",
              body: (
                <>
                  A lattice of weight 1, or the scale, after the draw's own
                  terms. The draw's culling sphere is rewritten (next section).
                </>
              ),
            },
            {
              title: "The vertex stage places and turns",
              body: (
                <>
                  <C>placeVertex</C>, then the cofactor normal and the tangent.
                </>
              ),
            },
            {
              title: "The fragment stage rebuilds",
              body: (
                <>The drawn position, from the window position and depth.</>
              ),
            },
            {
              title: "A slider moves",
              body: (
                <>
                  One float. With a range declared, no refit, no bounds
                  rewritten, no draw walked.
                </>
              ),
            },
          ]}
        />
        <Written
          from={
            <>
              <C>src/shaders/placement.slang</C>,{" "}
              <C>src/shaders/surface.slang</C>,{" "}
              <C>src/scene/placementTable.ts</C>,{" "}
              <C>src/scene/warpEvaluate.ts</C> and{" "}
              <C>test/placementJacobian.test.ts</C>
            </>
          }
          on="2026-11-10"
        />
      </Section>

      <Section title="Bounds and level of detail">
        <p>
          A warp moves tiles, and the camera is where things are drawn, so
          culling and selection must ask about drawn volumes. Padding true
          bounds instead made a tile's sphere tens of kilometres too big at k =
          10 and selection too coarse.
        </p>
        <ul>
          <li>
            <strong>
              A draw's culling sphere moves, then pads by the residual.
            </strong>{" "}
            Its centre moves by Σ w̄ᵢ·Dᵢ(c), where w̄ is a weight's midpoint over
            its range. Its radius grows by Σ ωᵢ·|Dᵢ(c)| plus max|wᵢ| times each
            term's residual: a bound on how far its displacement differs from
            its value at the centre across the sphere, plus the fit's error. It
            is rounded up in float32. The cull kernel is unchanged: the record
            just carries the moved sphere. An unplaced draw's record is never
            written.
          </li>
          <li>
            <strong>Parameters declare a range.</strong>{" "}
            <C>createPlacementParameter(value, {"{ range: [min, max] }"})</C>.
            Bounds are made once over the range, so a change inside it writes
            one float and walks no draw. A value outside it throws a{" "}
            <C>RangeError</C> and keeps the old one, so a parameter never leaves
            what its bounds were made for. Without a range, each change walks
            the draws that read it.
          </li>
          <li>
            <strong>Selection on drawn volumes.</strong> A warped anchor has a{" "}
            <C>TileWarp</C> (<C>World.tileWarp</C>): the route's map brought
            back into the anchor's coordinates. A tile's volume is sampled on a
            3 × 3 × 3 grid and the image's bounding sphere padded for bulge by{" "}
            <C>(1/8)·M₂·L²</C>, with M₂ estimated from Jacobian differences. It
            is cached per map version and fit version. Distance, the frustum and
            the content volume use it.
          </li>
          <li>
            <strong>Screen-space error</strong> is geometric error × σ_max + the
            fit's error, with σ_max the largest singular value of the Jacobian
            over the samples, an estimate. A warp that stretches 10 times would
            otherwise draw terrain 10 times coarser than its error allows.
          </li>
          <li>
            <strong>The horizon test is off</strong> under a warped anchor. Its
            occluder is the true ellipsoid, which says nothing about a drawn
            Earth, and no occludee made from drawn bounds would be sound. The
            frustum and the error still cull and refine.
          </li>
        </ul>
        <DataTable
          label="Measured bounds"
          columns={[
            { head: "Case", cell: (r) => r.what },
            { head: "Result", cell: (r) => r.result },
          ]}
          rows={[
            {
              what: "A 400 m quad, 3 km up, tilted 67° to the local horizontal, k = 10",
              result:
                "Sphere grows by 2.5 km. Padded by the whole displacement it would grow by over 20 km.",
            },
            {
              what: "Selection at k = 10 against k = 1, same camera",
              result: "One level deeper.",
            },
            {
              what: "A 200 km tile at k = 10, 5,000 random warped points",
              result:
                "All inside the drawn sphere. The plan measured it 4.9% larger than the sphere from the tile's centre and 8 corners alone.",
            },
            {
              what: "σ over a volume at k = 10, from routeSingularRange",
              result: "About [1.004, 10], σ_min to σ_max.",
            },
          ]}
        />
        <p>
          The bounds are sound for the lattice as evaluated, past its cube
          included, because edge cells extrapolate. The tile's drawn volume and
          σ are estimates from samples, and say so.
        </p>
        <Written
          from={
            <>
              <C>src/scene/warpBounds.ts</C>, <C>src/streaming/tileWarp.ts</C>,{" "}
              <C>src/streaming/Stepwise.ts</C>, <C>src/streaming/Budgeted.ts</C>
              , <C>test/warpBounds.test.ts</C> and{" "}
              <C>test/warpSelection.test.ts</C>
            </>
          }
          on="2026-11-10"
        />
      </Section>

      <Section title="The globe, and content that keeps its shape">
        <p>
          Content stretches with a warp by default, which is what a reprojection
          means. A vehicle or a symbol shouldn&apos;t: a car doesn&apos;t grow
          ten times as tall because the terrain under it does. <C>warpAt</C>{" "}
          says where the route is evaluated.
        </p>
        <ul>
          <li>
            <strong>
              <C>warpAt: &quot;vertex&quot;</C>
            </strong>
            , the default: at every vertex, by the fit of the previous section.
          </li>
          <li>
            <strong>
              <C>warpAt: &quot;anchor&quot;</C>
            </strong>
            : once, at the draw&apos;s origin, in float64. The draw moves
            rigidly by the route there, with the translation and the rotation of
            the warp&apos;s Jacobian, the orthogonal factor of its polar
            decomposition. Scale and shear are dropped. A ×10 exaggeration
            leaves a car as tall as it was (the rotation is the identity), and a
            reprojection turns it with the grid&apos;s convergence without
            scaling it. With no warp in the route the result is the identity.
            The draw&apos;s term is an exact one-cell lattice, so it costs the
            vertex stage what a fit does and nothing to fit. A slider redoes it,
            since the rotation isn&apos;t linear in a scale: one route
            evaluation a draw.
          </li>
        </ul>
        <DataTable
          label="What each kind of content does under a warp"
          columns={[
            { head: "Content", cell: (r) => <Ticks text={r.what} /> },
            { head: "Evaluated", cell: (r) => <Ticks text={r.at} /> },
            { head: "How", cell: (r) => <Ticks text={r.how} /> },
          ]}
          rows={[
            {
              what: "A mesh, a tileset's tiles",
              at: '`"vertex"`, or `"anchor"` when the item asks',
              how: "`SceneItemOptions.warpAt` and a setter, which refits the loaded tiles. `World.setWarpAt(draw, at, origin?)` and `DrawOptions.warpAt` are the draw's. Give a model's draws one `origin` and the whole model moves as one. `World.drawWarpAt` says what was asked and what is drawn.",
            },
            {
              what: "A billboard",
              at: '`"anchor"`, forced',
              how: "Its anchor goes through the route and its corners stay pixels on screen.",
            },
            {
              what: "Instanced draws",
              at: '`"anchor"`, per instance, forced',
              how: "Each instance's origin goes through the route on the CPU, in slices within the frame's budget, and its matrix in the instance table is rewritten. The cull and vertex stages already read that table, so a warp costs them nothing. `World.setInstance` writes the application's matrix again, and the route moves it afresh.",
            },
            {
              what: "A point set, a `ModelPool`'s instances",
              at: "Not warped",
              how: "Drawn at their anchor's affine place. The engine says so once.",
            },
            {
              what: "The globe's terrain",
              at: '`"vertex"`, exact under a height scale',
              how: "The next paragraph.",
            },
          ]}
        />
        <h3>The globe under a warp</h3>
        <p>
          <C>Engine.addEllipsoid</C>&apos;s globe is placed like any content
          under an anchor, so its tiles are selected on drawn volumes and fitted
          per vertex, and the horizon test is off. For a vertical exaggeration
          that is wasteful, since the owner ruled that terrain keeps its (u, v,
          height). A warp may declare itself one with the{" "}
          <C>Warp.heightScale</C> marker: the radii of its reference ellipsoid,
          its factor and its base height. The helper <C>verticalExaggeration</C>{" "}
          sets it for an ellipsoid or a sphere. When the route is one
          height-scale warp followed by rigid steps, on the ellipsoid a terrain
          tile was made on (WGS84, base height 0), the tile is exaggerated
          exactly, with no fit:
        </p>
        <ul>
          <li>
            Each vertex carries <C>h·n̂</C>, its geodetic height times the
            ellipsoid&apos;s normal there, as the <C>_HEIGHT_NORMAL</C>{" "}
            attribute. The globe asks its tile source, which generates in a
            worker, for it only while the anchor&apos;s route is a height scale
            on its own ellipsoid.
          </li>
          <li>
            The route&apos;s term is that attribute times (k − 1), added to the
            vertex. The slider is one float, the term&apos;s weight, at scale 1
            or 0.4 alike.
          </li>
          <li>
            A tile without the attribute, or made on another ellipsoid, is
            fitted like a tileset&apos;s, and the draw is held until its first
            term lands.
          </li>
        </ul>
        <p>
          <strong>The spike.</strong> A terrain tile with <C>h·n̂</C>, the same
          tile fitted, an anchored billboard and a pole kept upright are drawn
          in a view rooted on a ×10 warp. Each is measured in the image against
          the float64 route: all four kinds are within 0.58 px at ×10 and at
          ×4.6, the scale at 0.4 with one float written. Then the globe&apos;s
          tiles, generated in a worker, must be drawn under the warp: 4,760 tile
          draws were drawn exact, none pending. The spike&apos;s checks run
          headless on a GPU with{" "}
          <C>node scripts/runSpike.mjs &lt;url&gt; &lt;fn&gt;</C>.
        </p>
        <Written
          from={
            <>
              <C>src/scene/warpAnchor.ts</C>, <C>src/scene/world/warps.ts</C>,{" "}
              <C>src/globe/heightNormal.ts</C>, <C>src/camera/route.ts</C>,{" "}
              <C>spikes/warpGlobe.ts</C> and <C>test/warpGlobe.test.ts</C>
            </>
          }
          on="2026-11-11"
        />
      </Section>

      <Section title="Accuracy">
        <p>
          A stated accuracy never claims more than its inputs support. Each
          stage of a route is a pair: how much it stretches an error (L) and the
          error it adds (ε). They compose as (L₂L₁, L₂ε₁ + ε₂). Selection's
          &quot;error × σ_max + the fit's&quot; is that rule for one warp. The
          engine has it in that form only; there is no general algebra in the
          code yet.
        </p>
        <DataTable
          label="What a route and a fit report"
          columns={[
            { head: "Source", cell: (r) => r.source },
            { head: "How it is stated", cell: (r) => <Ticks text={r.how} /> },
          ]}
          rows={[
            {
              source: "A warp that states a 1σ",
              how: "Its σ joins the route's accuracy in quadrature with the rigid edges', and the note names it.",
            },
            {
              source: "A warp that states only a worst-case bound",
              how: "The route's accuracy is unstated and the note names the bound: a bound is not a σ.",
            },
            {
              source: "A warp that states nothing",
              how: "Exact by definition.",
            },
            {
              source: "A fit's error",
              how: "`errorBound` and `estimate`, in `placementOf`: the lattices' errors weighted by |w|. Not part of the route's accuracy.",
            },
            {
              source: "A pick's content term",
              how: "A fit's bound is still taken as 1σ, which is conservative. The plan's provisional decision is to end that.",
            },
          ]}
        />
        <p>
          <strong>Bound or σ: both, provisionally.</strong> A worst-case bound
          comes from fits, representation error, tessellation and float32
          rounding, and composes linearly. A σ comes from the frames layer,
          surveys and ephemerides, and composes in quadrature. A report should
          show both and never convert one into the other. The warp's types
          already hold them apart. The pick interpreter's &quot;taken as
          1σ&quot; is the part that hasn't changed.
        </p>
        <Written
          from={
            <>
              <C>src/frames/resolver.ts</C>, <C>src/frames/warpFrame.ts</C>,{" "}
              <C>src/frames/placementQuery.ts</C>,{" "}
              <C>src/frames/pickInterpreter.ts</C> and the plan's owner's
              answers, section 13.26
            </>
          }
          on="2026-11-10"
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
        <h3>Clips</h3>
        <p>
          Built as increments 8a and 8b, apart from clips curved by a warp (8c,
          in progress). A clip is a world object named in a reference frame, and
          each is tested on the true point or the drawn one, whichever its frame
          reaches rigidly. The Clipping tab has how, the numbers and what&apos;s
          left.
        </p>
        <h3>Names, pending the API review</h3>
        <p>
          <C>Warp</C> (the name the owner accepted) and <C>Route</C> are in the
          code and exported from the <C>/frames</C> entry point, with{" "}
          <C>routeForward</C>, <C>routeInverse</C>, <C>warpForward</C> and{" "}
          <C>warpInverse</C>, which apply each warp at the scale in force.{" "}
          <C>resolveRoute</C> and <C>NonRigidRouteError</C> live in{" "}
          <C>src/camera/route.ts</C> and aren&apos;t exported.
          &quot;Placement&quot; is retiring as the umbrella term, since it means
          four things: <C>SceneItem.placement</C>, a per-draw <C>Placement</C>,{" "}
          <C>DesignPlacement</C>, and <C>ModelPlacement</C>. The plan proposes{" "}
          <C>Georeference</C> for <C>DesignPlacement</C> (the 3D Tiles and CAD
          term), items that attach to a reference frame and take morph-target
          weights, and <C>ModelPlacement</C> as an instance. Today's{" "}
          <C>Placement</C> kinds stay as input and are converted to terms. The
          renames wait for the review.
        </p>
        <Written
          from="the overall plan, section 13.26, and what the code has"
          on="2026-11-11"
        />
      </Section>

      <Section title="How it's verified">
        <p>
          The GPU is held to its float64 twin by spike pages, run by hand in
          Chrome on a machine with a GPU. The Node tests check what the GPU
          would be given, and run everywhere.
        </p>
        <DataTable
          label="GPU spikes"
          columns={[
            { head: "Check", cell: (r) => <Ticks text={r.check} /> },
            { head: "Result", cell: (r) => r.result },
            { head: "Where", cell: (r) => r.where },
          ]}
          rows={MEASURES}
        />
        <p>
          Numerical agreement is what these show: the GPU's float32 against the
          CPU's float64. How accurately the fit reproduces the route is the
          fit's own error, a separate figure.
        </p>
        <DataTable
          label="Node tests"
          columns={[
            { head: "Test", cell: (r) => <C>{r.file}</C> },
            { head: "Covers", cell: (r) => <Ticks text={r.covers} /> },
          ]}
          rows={TESTS}
        />
        <Written
          from={
            <>
              <C>spikes/warpRoute.ts</C>, <C>spikes/placementNormals.ts</C>,{" "}
              <C>spikes/placement.ts</C>, <C>spikes/warpGlobe.ts</C> and the
              tests above, with the measurements recorded in the plan, section
              13.26
            </>
          }
          on="2026-11-11"
        />
      </Section>
    </Page>
  );
}
