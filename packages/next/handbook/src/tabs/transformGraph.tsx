import { useId } from "react";
import { Sec, OnThisPage, useSectionLinks } from "../anchors.tsx";
import { snippetText } from "../snippets.ts";
import {
  C,
  CodeBlock,
  DataTable,
  Figure,
  Flow,
  Note,
  Page,
  Written,
} from "../parts.tsx";
import { Explorer, TourNotes } from "../transformGraph/Explorer.tsx";

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

// A section's id must not be a scene's (`#/transform-graph/<scene>`).
const SECTIONS = [
  { id: "model", title: "The model" },
  { id: "why", title: "Why one tree" },
  { id: "api", title: "The API as built" },
  { id: "compiler", title: "The compiler" },
  { id: "queries", title: "Queries" },
  { id: "example", title: "The exaggeration example" },
  { id: "views", title: "Per-view routes" },
  { id: "bounds", title: "Bounds and tessellation" },
  { id: "numbers", title: "Measured" },
  { id: "limits", title: "Limits and follow-ups" },
  { id: "tour", title: "A 2D tour" },
] as const;

interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  sub: string;
  kind: "root" | "smooth" | "affine" | "content";
  parent?: string;
}

const BOX_H = 54;

const BOXES: Box[] = [
  { id: "ITRF", x: 360, y: 16, w: 180, sub: "the root", kind: "root" },
  {
    id: "Earth content",
    x: 20,
    y: 120,
    w: 230,
    sub: "smooth: heights × k",
    kind: "smooth",
    parent: "ITRF",
  },
  {
    id: "Camera",
    x: 290,
    y: 120,
    w: 120,
    sub: "drawn at ITRF",
    kind: "content",
    parent: "ITRF",
  },
  {
    id: "Satellite",
    x: 450,
    y: 120,
    w: 150,
    sub: "placed at ITRF",
    kind: "content",
    parent: "ITRF",
  },
  {
    id: "MOON_ME",
    x: 650,
    y: 120,
    w: 150,
    sub: "affine: ephemeris",
    kind: "affine",
    parent: "ITRF",
  },
  {
    id: "Terrain",
    x: 20,
    y: 235,
    w: 70,
    sub: "",
    kind: "content",
    parent: "Earth content",
  },
  {
    id: "Buildings",
    x: 100,
    y: 235,
    w: 80,
    sub: "",
    kind: "content",
    parent: "Earth content",
  },
  {
    id: "Models",
    x: 190,
    y: 235,
    w: 70,
    sub: "",
    kind: "content",
    parent: "Earth content",
  },
  {
    id: "Moon mesh",
    x: 650,
    y: 235,
    w: 150,
    sub: "",
    kind: "content",
    parent: "MOON_ME",
  },
];

/** A deformer over the Earth's content: what sits under it is warped, and the Moon is not. */
function GraphFigure() {
  const titleId = useId();
  const byId = new Map(BOXES.map((b) => [b.id, b]));
  return (
    <svg viewBox="0 0 900 330" role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        A transform graph. ITRF is the root. Under it are a smooth node called
        Earth content, which multiplies heights, the camera, a satellite, and
        the affine node MOON_ME. Terrain, buildings and models sit under Earth
        content and are drawn exaggerated. The satellite, placed at ITRF, and
        the Moon mesh, under MOON_ME, are not.
      </title>
      {BOXES.filter((b) => b.parent).map((b) => {
        const p = byId.get(b.parent!)!;
        const x1 = p.x + p.w / 2;
        const y1 = p.y + BOX_H;
        const x2 = b.x + b.w / 2;
        const y2 = b.y;
        const mid = (y1 + y2) / 2;
        return (
          <path
            key={b.id}
            className="d-edge"
            strokeWidth={b.kind === "smooth" ? 3 : 1.5}
            strokeDasharray={b.kind === "content" ? "5 4" : undefined}
            d={`M${x1} ${y1} C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`}
          />
        );
      })}
      {BOXES.map((b) => (
        <g key={b.id}>
          <rect
            className={
              b.kind === "smooth"
                ? "d-box d-box-accent"
                : b.kind === "content"
                  ? "d-box-plain"
                  : "d-box"
            }
            x={b.x}
            y={b.y}
            width={b.w}
            height={BOX_H}
            rx={8}
          />
          <text
            className="d-title d-mono"
            x={b.x + 10}
            y={b.y + (b.sub ? 23 : 32)}
          >
            {b.id}
          </text>
          {b.sub ? (
            <text className="d-text" x={b.x + 10} y={b.y + 42}>
              {b.sub}
            </text>
          ) : null}
        </g>
      ))}
      <text className="d-text" x={20} y={320}>
        Heavy edge: smooth. Thin: affine. Dashed: content, placed at the node
        above it.
      </text>
    </svg>
  );
}

const EDGES = [
  {
    kind: "Affine",
    edge: "A 4×4, constant or a function of time",
    api: "Every reference frame of the catalogue (`Frame`)",
    cost: "Runs of them collapse into one float64 matrix; no pipeline change",
  },
  {
    kind: "Smooth",
    edge: "A differentiable function of the node's coordinates and named parameters (time, a slider, data), with an optional exact inverse and a declared accuracy",
    api: "`smoothFrame(name, parent, spec)`",
    cost: "Compiled into the draw's vertex stage, or fitted when the compiler can't take it",
  },
  {
    kind: "Switch",
    edge: "One of the other two, chosen by view",
    api: "`switchFrame(name, parent, { byView, default })`",
    cost: "One program per shape of route, so views that differ in shape are drawn by twins",
  },
];

const PRIOR = [
  {
    art: "Scene graphs (OpenSceneGraph, USD)",
    has: "A tree of matrices, switch nodes with camera masks, variant sets",
    takes:
      "The tree, placement by position in it, and the switch for per-view structure",
    differs: "Their edges are affine, so nothing in them can deform",
  },
  {
    art: "Deformers and FFD (Maya, 3ds Max space warps; Sederberg and Parry, 1986)",
    has: "Bend, twist, taper and lattice deformers applied to an object's vertices",
    takes: "The family, and “warp” as the friendly word",
    differs:
      "They deform one object's mesh. Here normals, picks, measurements, accuracy and tile selection follow from the one definition",
  },
  {
    art: "Space warps in solid modelling (ACIS)",
    has: "A smooth map applied to a whole solid, not to a mesh of it",
    takes: "The idea that a map of space is an operation on exact geometry",
    differs:
      "How exact b-rep geometry crosses a smooth node is the B-reps tab's question, not settled here",
  },
  {
    art: "Unreal's World Position Offset and Large World Coordinates",
    has: "A material moves vertices; LWC keeps a position as a tile and a float offset",
    takes: "LWC's split: a per-draw centre constant plus a float32 residual",
    differs:
      "WPO leaves normals and picks to the author. Here the centre is a double-float (df64) value, and J gives the normals",
  },
  {
    art: "PROJ pipelines and ISO 19111 concatenated operations",
    has: "A chain of steps, each with a forward and an inverse and a stated accuracy",
    takes: "A route is such a chain, with inverse steps and per-step accuracy",
    differs:
      "PROJ is float64 on the CPU with no derivatives. A route here also runs on the GPU and has a Jacobian",
  },
  {
    art: "JAX-style tracing",
    has: "Write a function once, get its derivatives and a compiled form by transforming a program",
    takes: "One definition gives the value, J, H, intervals and WGSL",
    differs:
      "JavaScript has no operator overloading to trace through, so the engine parses the function's source. That is why the subset is restricted",
  },
];

const NAMES = [
  {
    name: "`smoothFrame(name, parent, spec)`",
    what: "A node whose edge maps its own coordinates up to its parent's. `spec` is a `SmoothFrameSpec`: `forward` (with an optional Jacobian), an optional `inverse`, a `revision` the application owns, `accuracy`, a `scale` for a slider, a `description`. Content under the node keeps its own coordinates and is drawn through the edge.",
  },
  {
    name: "`switchFrame(name, parent, { byView, default })`",
    what: 'A node whose edge is chosen per view: a smooth spec for each view, or `"identity"`. A route asked without a view can\'t cross it.',
  },
  {
    name: "`FramesResolver.bindAnchor(anchor, frame)`",
    what: "Places content: an anchor bound to a node. Everything under the anchor (a globe, a tileset given `TilesetOptions.anchor`, models, pins) is placed in that node. The default anchor is the Earth's.",
  },
  {
    name: "`World.createPlacementParameter(value, { range })`, `View.setParameter(parameter, value)`",
    what: "A slider is one float. A view can hold its own value (`undefined` follows the world's again), and `View.parameterValue` reads it. A declared range lets bounds be made once, so a change inside it walks no draw; a value outside it throws a `RangeError`.",
  },
  {
    name: "`verticalExaggeration`, `heightOffset`",
    what: "Live helpers for a smooth frame, with exact Jacobians and inverses at any height and at the poles. `verticalExaggeration({ factor, ceiling, band, scale })` lifts by a constant above its ceiling, so a satellite is moved, not stretched. Setting `factor` says the edge changed.",
  },
  {
    name: "`liveEdge(edge, options)`",
    what: "A built-in edge as the live spec a smooth frame takes: `setParams` by name, a `scale` for a slider (with the edge's `identity`, the parameter values at which it does nothing), a `sigma` for accuracy, and a domain.",
  },
  {
    name: "`fromFunction(fn, options)`",
    what: "Your own map as restricted JavaScript. `compiled` says whether it parsed to the IR, `fitReason` why not, `setParams` changes its parameters.",
  },
  {
    name: "`FrameResolver.route(frame, base, seconds)`",
    what: "The steps from content to the render root: one matrix for each rigid run, a step for each smooth edge, forward going up and inverse going down. `resolve` and `frameTransform` across a smooth edge throw `NonRigidRouteError`: there is no 4×4 to give.",
  },
];

const BUILTINS = [
  {
    family: "Generic",
    names:
      "`scaleAbout`, `scaleAlongAxes`, `bump`, `bend`, `twist`, `taper`, `lattice` (free-form deformation), `radialDistortion` (Brown–Conrady), `corridorUnroll`, `velocityModel`, `blend`",
    notes:
      "Space warps in the 3ds Max sense, plus a lens, an alignment unrolled into a strip, and a 1D time-to-depth model.",
  },
  {
    family: "Geo",
    names: "`verticalExaggeration`, `heightOffset`, `flatten`",
    notes:
      "Height-based maps of a body's ellipsoid, with a ceiling and band for the lift.",
  },
  {
    family: "Projections",
    names:
      "`utm`, `transverseMercator`, `lambertConformalConic`, `webMercator` and the `…ToGeographic` inverses; `geographicToGeocentric`, `geocentricToGeographic`",
    notes:
      "Each inverse carries its own IR source, so content authored in a projected CRS compiles. The Georeferencing tab has them in use.",
  },
];

const ACCEPTED = [
  {
    accepted:
      "An arrow function, `function` expression or method with `(p, params)` or `(p, params, out)`",
    refused: "Free variables other than `Math`; `this`; `new`",
  },
  {
    accepted:
      "`p[0]`, `p.x`, `const [x, y, z] = p`; `params.name`, `const { a, b } = params`",
    refused: "Calls to anything but `Math.*`; nested functions",
  },
  {
    accepted:
      "`const`/`let` locals, `if`/`else` and ternaries (both sides built, merged with `select`), `for` with constant bounds (unrolled)",
    refused:
      "Object literals, strings, templates, spread, `typeof`, `try`, optional chaining",
  },
  {
    accepted:
      "`+ - * / **`, comparisons, `&& || !`, `Math.PI`, and `Math.abs sqrt exp log sin cos tan atan atan2 asin acos sinh cosh tanh floor ceil sign min max pow hypot` among others",
    refused:
      "`%`, bitwise operators, `while`, `break`, `continue`, loops with a data-dependent bound",
  },
  {
    accepted:
      "Three-element array literals; `out[i] = …; return out`; the forms minifiers write (`Math.pow` for `**`, `void 0`, `!0`)",
    refused: "Assignment to `p`, `params` or `out` themselves",
  },
];

const PATHS = [
  {
    route: "Affine edges only",
    path: "One matrix. No pipeline, no centre constant",
    why: "Nothing smooth is crossed",
  },
  {
    route:
      "Smooth edges going up, each with IR (a built-in, or a function in the subset)",
    path: "Compiled: one pipeline per route shape, a centre constant per draw, a float32 residual per vertex",
    why: "The common case, and where the accuracy and speed below were measured",
  },
  {
    route: "A smooth edge crossed downward (a camera below a node)",
    path: "Fitted per tile, as a cubic lattice",
    why: "Routes through an inverse step don't compile yet (follow-up 11)",
  },
  {
    route: "A function outside the subset, or one with no source",
    path: "Fitted per tile; Jacobian by central differences",
    why: "`FunctionWarp.fitReason` names the construct that was refused",
  },
  {
    route: "The globe's terrain under an exaggeration of its own ellipsoid",
    path: "Exact: each vertex carries h·n̂, and the term is that attribute times (k − 1)",
    why: "Terrain keeps its (u, v, height), and a slider is one float with no refit",
  },
  {
    route: "Billboards, instanced draws and b-rep patch draws",
    path: "Billboards and instances go through the route at their own origin, on the CPU",
    why: "None has a per-view twin: all three are drawn by the first group's route in every view (follow-up 10)",
  },
];

const FITS = [
  {
    tile: "A 10 km tile 7,000 m up on Everest, geometric error 100 m",
    asked: "1.56 m",
    cells: "1",
    error: "0.43 mm",
    time: "About 0.7 ms warm",
  },
  {
    tile: "A 1,000 km tile at Everest's longitude and latitude, geometric error 50 km",
    asked: "781 m",
    cells: "4 (64 cells)",
    error: "304 m",
    time: "About 40 ms",
  },
  {
    tile: "The same tile, asked for the 1 mm floor",
    asked: "1 mm",
    cells: "8 (512 cells): the limit, so it misses",
    error: "21 m",
    time: "About 325 ms",
  },
];

const TAYLOR = [
  {
    case: "A twist, up to 10 km boxes; a lens, up to 10 m",
    result: "Conservative, and within 1.1× of sampling's radius",
  },
  {
    case: "Exaggeration and UTM, 100 m to 10 km",
    result: "5× to 28× sampling's radius (3× to 6× with 4³ cells)",
  },
  {
    case: "The same at 100 km",
    result: "Refused: the intervals swell without bound",
  },
];

const MEASURES = [
  {
    check:
      "The compiler against float64: the vertex stage's position from a draw's centre constant and float32 residual",
    result:
      "×10 lift within 2.6, 3.3 and 9.1 mm on 1, 2 and 8 km tiles; nested UTM 0.58 mm; twist 0.59 mm; a lens 0.003 mm. Normals within 3e-5°.",
    where: "spikes/transformGraph.html, commit dfb2b88dde",
  },
  {
    check: "The same spike's cost, one million vertices",
    result:
      "0.06 to 0.96 ms of GPU time for the routes above. A nested UTM route's exact normals cost 36 ms; the linear normals the compiler picks for heavy steps cost 5.9 ms.",
    where: "spikes/transformGraph.html, commit 23c7b191be",
  },
  {
    check:
      "The df64 centre pass, for a parameter that doesn't separate (a moving centre, a time-varying field)",
    result: "About 4 µs for 1,024 draws.",
    where: "the compiler's GPU spike, plan section 13.37",
  },
  {
    check:
      "The vertical exaggeration example under the compiler: how many draws are compiled and how many fitted",
    result:
      "81 draws compiled, 6 fitted. Compiling route pipelines one at a time cut the longest task from 1.23–1.62 s to 0.78–1.03 s; what is left is warped tile bounds in selection.",
    where: "the example, commits 23c7b191be and 811ed8814a",
  },
  {
    check:
      "Each built-in's TS forward against its IR, and published worked examples",
    result: "Agree to 1e-9; the TM and LCC examples reproduce.",
    where: "test/transformsParity.test.ts, commit a3c59bda7b",
  },
  {
    check:
      "Three views of one world: ×10, the true place, and a 60 m lift, each box measured in its view against its own route",
    result: "Every box within 1.5 px; the twins released with their views.",
    where: "spikes/warpViews.ts, commit e94e2ee653",
  },
  {
    check:
      "Subdividing a 50 km tile under ×10 exaggeration (the tessellation spike)",
    result:
      "Two triangles at 10 km take n = 36 (2,592 sub-triangles) and fall from 102 px of chord error to 0.08 px; 128 triangles take n = 5. A lens across ±50°: n = 64 (the cap) and n = 15.",
    where: "spikes/routeTessellation.ts, commit e242b4609b",
  },
];

const FOLLOW_UPS = [
  {
    task: "9: the IR and the built-ins",
    limit:
      "The IR has no arrays, no data-dependent loops, and no `atanh`, `asinh`, `%` or `expm1`. The lattice, corridor and flatten sources are generated per shape, so a new polygon or lattice is a new pipeline; the ellipsoid foot is five unrolled Newton steps.",
    fix: "Array parameters (uniforms or storage, so one pipeline serves every polygon of a kind), bounded loops with an early exit (Newton solves become IR, with AD through the implicit-function theorem), and the missing ops. Per family: flatten measured in a gnomonic frame, corridors from C¹ alignments (lines, arcs, clothoids), a `valid` range for each parameter (a bend's inverse needs |θ| < π), and the TM Jacobian from AD.",
  },
  {
    task: "10: per-view routes without twins",
    limit:
      "Billboards, instanced draws and b-rep patch draws get no twin. A ray query with no view sees both a draw and its twin. A view whose route differs only in a draw's record data shows its group's first view. A 14 m slab at ×10 on the compiled route is drawn 3.6 px off, which predates the twins.",
    fix: "Choose the program per (draw, view): a block of centre constants per route group, and each view's bundle binds that group's pipeline. One draw then serves every view, of every kind, and `variants.ts` goes. The 3.6 px is checked against float64 first.",
  },
  {
    task: "11: the camera branch",
    limit:
      "A lens on the camera: streaming tilesets through it draw nothing (selection goes through a map with z ≤ 0); moving the camera re-derives every draw's route at 250 to 400 ms a tick; routes through a smooth step's inverse don't compile.",
    fix: "An “eye step”: a per-view smooth step after the view matrix, evaluated in the vertex stage from uniforms alone, needing no float64 centre because camera-space numbers are small. Selection uses the route without it, padded by its largest displacement at each depth. Partial work is saved to resume from.",
  },
];

const ALSO = [
  {
    what: "Tessellation is a spike",
    state:
      "`curvatureOver` and `subdivisionFor` give n per triangle and `spikes/routeTessellation.ts` runs the compute pass and indirect draw. Not wired: a mesh draw needs its own batch kind, every pass needs a vertex entry that decodes (triangle, n, sub-triangle), attributes need interpolating, and per-edge levels are needed, since one level per triangle leaves cracks between neighbours of different n.",
  },
  {
    what: "Selection keeps sampling",
    state:
      "Taylor bounds are conservative but loose on geodetic routes. Interval Hessians over a foot-point iteration need affine arithmetic to be useful.",
  },
  {
    what: "Fitting runs on the main thread",
    state:
      "A fitted function is a JavaScript closure, which a worker can't be sent. Fits run within a 4 ms budget a tick (`Engine.warpBudgetMs`).",
  },
  {
    what: "Exact sums rely on operation order",
    state:
      "The exact centre sum was checked on NVIDIA under D3D12 only, and df64 also needs the shader compiler to keep the order of float operations. A platform that reassociates, as Dawn's relaxed math does on Apple GPUs, can lose the centre's extra accuracy.",
  },
  {
    what: "The same content twice in one view",
    state:
      "An inset or a before-and-after wants instancing: a reference node. Later.",
  },
];

export function TransformGraph() {
  useSectionLinks(
    "transform-graph",
    SECTIONS.map((s) => s.id),
  );
  return (
    <Page
      title="Transform graph"
      status="current"
      lede={
        <>
          One tree of nodes places everything: content, cameras and lights. Each
          node&apos;s edge to its parent is a matrix or a smooth function, and
          where something sits decides what is warped. A reprojection, a
          vertical exaggeration, a plan-and-profile sheet and a camera lens are
          the same mechanism. See it on real data in the{" "}
          <a href="/examples/transform-graph/">Transform graph example</a> and
          the{" "}
          <a href="/examples/vertical-exaggeration/">
            Vertical exaggeration example
          </a>
          .
        </>
      }
    >
      <OnThisPage tab="transform-graph" items={SECTIONS} />

      <Note title="How much of this is built">
        <p>
          Tasks 1 to 8 of the transform graph plan are built, and so is the
          per-view work that followed (6b): the graph and routes, the IR with
          its parser, autodiff and intervals, the built-ins, the compiler and
          its renderer back end, queries through routes, smooth frames and
          per-view parameters, switch frames with twins, public exports, and the
          gallery example. The built-ins and queries are exported from the core
          entry point and <C>/frames</C>. What isn&apos;t: the IR&apos;s arrays
          and loops (task 9), per-view routes without twins (10), the camera
          branch (11), and tessellation, which is a spike. The last sections
          have them.
        </p>
      </Note>

      <Sec id="model" title="The model">
        <p>
          A transform graph is a tree. Each node has one edge to its parent, and
          the edge is one of three kinds:
        </p>
        <DataTable
          label="The three kinds of edge"
          columns={[
            { head: "Edge", cell: (r) => <strong>{r.kind}</strong> },
            { head: "What it is", cell: (r) => r.edge },
            { head: "In the API", cell: (r) => <Ticks text={r.api} /> },
            { head: "Cost", cell: (r) => r.cost },
          ]}
          rows={EDGES}
        />
        <p>
          <strong>Placement.</strong> Content, cameras and lights sit at nodes.
          A point of some content is carried from its node up to the lowest
          common ancestor of that node and the camera&apos;s, through each
          edge&apos;s forward function, then down to the camera&apos;s node
          through the inverses. That is its <strong>route</strong>. Where
          content sits is the only thing that decides what is warped: a deformer
          over the Earth&apos;s content warps the terrain and the buildings, and
          the Moon in the same world is untouched. Put the camera under the
          deformer instead and the rest of the world is warped, not the Earth
          (scene 2 of the tour below).
        </p>
        <Figure
          scroll
          label="A transform graph"
          caption="A deformer over the Earth's content. The camera is at ITRF, so what it sees of each thing is decided by where that thing is placed: the terrain, buildings and models under the smooth node are drawn exaggerated, and the satellite and the Moon are not."
        >
          <GraphFigure />
        </Figure>
        <p>
          <strong>What the graph doesn&apos;t say.</strong> It encodes no
          meaning. Which CRS a tileset is in, what a design view is, what
          &quot;true&quot; is: those sit above it, in the{" "}
          <a href="#/georeferencing">Georeferencing tab</a>. Four modules split
          the work: <C>transform</C> (the graph, the compiler and IR, autodiff,
          routes, accuracy; core, with no geo knowledge), <C>frames</C> (the
          reference-frame catalogue, which feeds the graph), <C>georeference</C>{" "}
          (CRSs, reprojection, the height maps) and <C>transforms</C> (the
          generic built-ins).
        </p>
        <Written
          from="the overall plan, section 13.37, and src/transform/graph.ts and route.ts"
          on="2026-11-12"
        />
      </Sec>

      <Sec id="why" title="Why one tree">
        <p>
          Three needs looked separate. A reprojection draws content in a
          coordinate system other than the one it was made in. A design view
          draws a region flat. Vertical exaggeration draws heights ten times as
          tall. Each is a smooth map of space that is locally invertible where
          content is, and each wanted its own machinery. Treating them as nodes
          of one tree gives one compiler, one set of queries and one answer to
          &quot;what is warped&quot;: whatever is placed below the node.
        </p>
        <p>
          A tree rather than a general graph, because every view then sees a
          tree, so a pixel&apos;s route and its pick are unambiguous. Two views
          that need different structure get a switch node; a DAG would add
          nothing the switch doesn&apos;t, and would make &quot;which route did
          this pixel take&quot; depend on more than the view.
        </p>
        <DataTable
          label="Prior art"
          columns={[
            { head: "Prior art", cell: (r) => <strong>{r.art}</strong> },
            { head: "What it has", cell: (r) => r.has },
            { head: "What the graph takes", cell: (r) => r.takes },
            { head: "Where it differs", cell: (r) => r.differs },
          ]}
          rows={PRIOR}
        />
        <Written
          from="the overall plan, sections 13.37 and 13.38"
          on="2026-11-12"
        />
      </Sec>

      <Sec id="api" title="The API as built">
        <p>
          Nodes are made with the frames module: a smooth node is a <C>Frame</C>{" "}
          whose edge is a function. The names, then a snippet that compiles
          against the real types.
        </p>
        <DataTable
          label="The transform graph's API"
          columns={[
            { head: "Name", cell: (r) => <Ticks text={r.name} /> },
            { head: "What it is", cell: (r) => <Ticks text={r.what} /> },
          ]}
          rows={NAMES}
        />
        <CodeBlock language="ts" code={snippetText("transform.next.ts")} />
        <p>
          The snippet compiles (<C>tsc -p handbook</C>), and the gallery example
          builds each of its scenes the same way, with nothing it keeps
          privately: it imports only public entry points.
        </p>

        <h3>The built-ins</h3>
        <p>
          Most applications never write a function. Each built-in is written
          once as a descriptor: a float64 TypeScript forward with its analytic
          Jacobian, the restricted-JS source the compiler parses, and the
          parameters the output is linear in. Each also has a Slang{" "}
          <C>[Differentiable]</C> version, whose derivative comes from{" "}
          <C>fwd_diff</C>. A parity test holds the TS and the IR to 1e-9 and
          checks the projections against published worked examples.
        </p>
        <DataTable
          label="The built-in smooth transforms"
          columns={[
            { head: "Family", cell: (r) => <strong>{r.family}</strong> },
            { head: "Names", cell: (r) => <Ticks text={r.names} /> },
            { head: "Notes", cell: (r) => r.notes },
          ]}
          rows={BUILTINS}
        />

        <h3>Your own function, and its rules</h3>
        <p>
          <C>fromFunction</C> takes a plain function from a point and named
          parameters to a point in metres. The function <em>is</em> the CPU
          path, called as it is. For the GPU and the derivatives the engine
          reads its source (<C>Function.prototype.toString</C>) and parses it,
          without evaluating it, into the IR. A function outside the subset
          isn&apos;t rejected: it still works, fitted, and the error names the
          construct, with its line and column.
        </p>
        <DataTable
          label="What the restricted JavaScript accepts and refuses"
          columns={[
            { head: "Accepted", cell: (r) => <Ticks text={r.accepted} /> },
            { head: "Refused", cell: (r) => <Ticks text={r.refused} /> },
          ]}
          rows={ACCEPTED}
        />
        <ul>
          <li>
            <strong>CSP.</strong> Nothing is evaluated: no <C>eval</C>, no{" "}
            <C>new Function</C>. A page under a Content Security Policy without{" "}
            <C>unsafe-eval</C> can use it.
          </li>
          <li>
            <strong>Minifiers.</strong> The subset is what minifiers write from
            such code: <C>Math.pow</C> for <C>**</C>, <C>void 0</C>, <C>!0</C>.
            A test minifies sample functions with esbuild and checks they still
            parse. The rule that keeps it true is purity: a function reads its
            parameters and <C>Math</C>, and nothing else. A name from an outer
            scope would be renamed by a minifier, and so is refused; pass it as
            a parameter. Keep the function self-contained, since a bundler that
            hoists or inlines a helper out of it would break the parse (the fit
            would still draw it).
          </li>
          <li>
            <strong>Parameters are explicit inputs</strong>, never closures:
            time, a slider, data. <C>setParams</C> changes them by name.{" "}
            <C>separable</C> says which the output is linear in, which stay
            uniforms.
          </li>
          <li>
            <strong>
              <C>liveEdge</C>
            </strong>{" "}
            is the other half: a built-in edge, changeable, and a slider float
            through its <C>scale</C>.
          </li>
        </ul>
        <p>
          A builder, or another way to write a function, comes later, as a
          second front end to the same IR; the plan&apos;s section 13.38 is the
          brainstorm on how far the language should go.
        </p>
        <Written
          from={
            <>
              <C>src/frames/smoothFrame.ts</C>, <C>src/transforms/</C>,{" "}
              <C>src/georeference/</C>, <C>src/transform/parse.ts</C> and{" "}
              <C>api/surface.txt</C>
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="compiler" title="The compiler">
        <p>
          The GPU can&apos;t call a closure, and float32 can&apos;t hold a
          position on the Earth to a millimetre. The compiler solves both for a
          route. For each route <em>shape</em> (the node kinds and the
          switch&apos;s choices, without their values) it emits one fused WGSL
          function, <C>transformPoint</C>.
        </p>
        <Flow
          label="From a function to a drawn vertex"
          steps={[
            {
              title: "A function becomes IR",
              body: (
                <>
                  A built-in carries its source; <C>fromFunction</C>&apos;s is
                  parsed. The IR is a hash-consed scalar program of about 25 ops
                  on scalars and vec3: arithmetic, <C>select</C>,{" "}
                  <C>sqrt exp log pow</C>, the trig and hyperbolic functions,{" "}
                  <C>floor fract clamp mix smoothstep</C>, and dot, cross,
                  length and normalize.
                </>
              ),
            },
            {
              title: "Autodiff",
              body: (
                <>
                  Forward mode on the IR gives J (three dual lanes), H (forward
                  over forward) and the derivative with respect to each
                  parameter, as IR programs, checked against differences.
                  Interval evaluation bounds a function over a box of positions
                  and parameter ranges.
                </>
              ),
            },
            {
              title: "A centre constant, per draw",
              body: (
                <>
                  A vertex is an offset δ from its draw&apos;s centre c, so the
                  route is F(c + δ) = F(c) + [F(c + δ) − F(c)]. F(c) is held as
                  float32 high and low parts, from float64 on the CPU or from a
                  df64 compute pass.
                </>
              ),
            },
            {
              title: "An exact residual, per vertex",
              body: (
                <>
                  The bracket is evaluated in float32 by a rule for each op that
                  gives the change from its operands&apos; changes and centre
                  values with no subtraction of nearly equal numbers (
                  <C>Δ(ab) = a_c·Δb + b_c·Δa + Δa·Δb</C>,{" "}
                  <C>Δ log a = log1p(Δa / a_c)</C>). A position 6.4e6 m from the
                  origin, or a UTM easting, keeps its millimetres. Affine runs
                  collapse to a float32 3×3 on δ.
                </>
              ),
            },
            {
              title: "Normals from the Jacobian",
              body: (
                <>
                  The route&apos;s J is the product of the edges&apos;, each
                  from autodiff. The normal turns by its cofactor, det(J)·J⁻ᵀ,
                  which needs no inverse and keeps a fold&apos;s normal on its
                  side; the tangent turns by J. For a heavy route the compiler
                  picks linear normals instead of the exact ones.
                </>
              ),
            },
            {
              title: "A pipeline per shape",
              body: (
                <>
                  Pipelines are keyed by shape and material variant, linked like
                  custom shaders, and compiled one at a time. The depth, shadow,
                  height, pick and line passes link a position-only module with
                  no Jacobian.
                </>
              ),
            },
          ]}
        />
        <p>
          <strong>Parameters</strong> enter in one of two ways. A parameter the
          output is affine in, declared <C>separable</C> (an exaggeration&apos;s
          factor), stays a uniform in the residual, and a slider writes uniforms
          only. Any other (a moving centre, a time-varying field) makes the
          draws&apos; centre constants dynamic: each frame a compute pass
          evaluates the function in df64 at every draw&apos;s centre, about 4 µs
          for 1,024 draws. Selection&apos;s bounds don&apos;t come from the
          compiler (see Bounds and tessellation).
        </p>
        <p>
          <strong>Why not a Taylor polynomial</strong> per draw? The residual
          rules are exact algebra, so a draw of any size is as accurate as
          float32 allows relative to its own offsets, kinks included, with no
          truncation to choose by draw size. A Taylor form stays an option for
          the normals, whose exact Jacobian is the costly part of a nested
          route.
        </p>

        <h3>What takes which path</h3>
        <DataTable
          label="Which path a route takes"
          columns={[
            { head: "Route", cell: (r) => <Ticks text={r.route} /> },
            { head: "Path", cell: (r) => <Ticks text={r.path} /> },
            { head: "Why", cell: (r) => <Ticks text={r.why} /> },
          ]}
          rows={PATHS}
        />

        <h3>Fits, the fallback</h3>
        <p>
          For a route the compiler refuses, each draw gets a fit of its route:{" "}
          <C>D(p) = A⁻¹·route(p) − p</C> over its bounding sphere, as a cubic
          lattice of 1, 2, 4 or 8 cells an axis (20 monomials a cell, fitted by
          Householder QR at Chebyshev–Lobatto samples, its error estimated on a
          denser grid). The tolerance is <C>max(1 mm, geometricError / 64)</C>,
          0.25 px at a 16 px threshold. A draw under a fitted route is held
          hidden until its first fit, so unwarped content never flashes, and
          fits run newest first within a budget, 4 ms a tick.
        </p>
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
          The coarse tile shows why one cubic fits a hemisphere badly, and why a
          function the compiler can take is better compiled than fitted.
        </p>
        <Written
          from={
            <>
              <C>src/transform/compile.ts</C>, <C>residual.ts</C>,{" "}
              <C>df64Wgsl.ts</C>, <C>src/scene/world/routes.ts</C>,{" "}
              <C>src/scene/warpFit.ts</C> and the commit messages of tasks 2 to
              4
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="queries" title="Queries: true and drawn are named nodes">
        <p>
          The CPU evaluates the same functions in float64 for everything that
          asks a question. A measurement is taken <em>in a named node</em>, from
          a point of its own node, never from where it was drawn. &quot;True
          &quot; and &quot;drawn&quot; are just two nodes: the content&apos;s
          own, and the camera&apos;s.
        </p>
        <DataTable
          label="Queries through routes"
          columns={[
            { head: "Call", cell: (r) => <Ticks text={r.call} /> },
            { head: "What it does", cell: (r) => <Ticks text={r.does} /> },
          ]}
          rows={[
            {
              call: "`pointIn(point, node, { view, seconds })`",
              does: "Carries a point of one node to another, in float64, with the route, its Jacobian, its stretch [σ_min, σ_max] and the accuracy it can claim.",
            },
            {
              call: "`measureIn(points, node, options)`",
              does: "Distance, polyline length, the length of the images of straight segments (a straight line of the content is a curve where a smooth edge is crossed), and area, in a node. In the content's node it is a true measurement; in the camera's, a drawn one.",
            },
            {
              call: '`pickIn(pick, "true" | "drawn" | node | Frame)` from `/frames`',
              does: "A core pick in any node. A pick carries the content's own point where it can (a triangle's barycentrics, a b-rep face's (u, v)), so true is exact with no inverse of a smooth edge; otherwise it is the drawn position through the route's inverse, marked provisional.",
            },
            {
              call: "`accuracyAlong(route, point, σ)`",
              does: "Σ_out = J Σ Jᵀ, plus each smooth node's declared σ, with J chained edge by edge. Affine edges' figures come from `FrameGraph.accuracy`, which agrees with `pointAccuracy`.",
            },
            {
              call: "`graphOfFrames(catalog, resolver)` from `/frames`",
              does: "The catalogue's tree as a graph: each `Frame` an affine node, each smooth frame a smooth node, so any frame can be a target.",
            },
          ]}
        />
        <CodeBlock language="ts" code={snippetText("queries.next.ts")} />
        <h3>Normals, and the bound against the σ</h3>
        <p>
          A smooth edge that stretches unevenly has to turn normals with the
          surface: at ×10, slopes are ten times as steep. The cofactor of J
          (det(J)·J⁻ᵀ) does it, and the same J gives the local distortion the
          tour draws as Tissot ellipses.
        </p>
        <p>
          A stated accuracy never claims more than its inputs support.
          Provisionally two kinds are kept apart and never converted: a
          worst-case <em>bound</em> (from fits, representation error,
          tessellation, float32 rounding), which composes linearly, and a{" "}
          <em>σ</em> (from the frames layer, surveys, ephemerides), which
          composes in quadrature. A smooth node that states a σ joins the
          route&apos;s accuracy; one that states only a bound leaves it
          unstated, naming the bound; one that states nothing is exact by
          definition.
        </p>
        <h3>Clips</h3>
        <p>
          A clip set is placed at a node, so <C>ClipSet.frame</C> may be one.
          Where its route to the content is rigid, the test is a matrix. Where
          it crosses a smooth edge, <C>planClip</C> says &quot;curved&quot; and
          the clip is cut along a signed distance fitted per draw, from the
          route <C>nodeResolver</C> gives. The Clipping tab has how and what is
          left.
        </p>
        <Written
          from={
            <>
              <C>src/transform/queries.ts</C>, <C>accuracy.ts</C>,{" "}
              <C>src/frames/pickIn.ts</C>, <C>graphOfFrames.ts</C> and{" "}
              <C>src/scene/world/nodeResolver.ts</C>
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="example" title="The exaggeration example">
        <p>
          The <a href="/examples/vertical-exaggeration/">example</a> is the
          model&apos;s test: an application can exaggerate everything through
          the graph, and the engine has no exaggeration feature.{" "}
          <C>verticalExaggeration</C> is a helper over the same smooth node an
          application could write by hand (the snippet above ends with one). The
          Earth&apos;s anchor is bound to a node under ITRF, so terrain, the
          buildings, models and pins keep their true coordinates and are drawn
          through it. The camera stays at ITRF.
        </p>
        <ul>
          <li>
            <strong>The slider is one float</strong>, and the camera is a pose
            in the render space: it stays where it is while the ground rises
            toward it. The globe&apos;s controller lifts it only where the drawn
            ground would cover it.
          </li>
          <li>
            <strong>Terrain is exact.</strong> Each vertex carries <C>h·n̂</C>,
            its geodetic height times the ellipsoid&apos;s normal, and the
            node&apos;s term is that times (k − 1): no fit, and no refit as the
            slider moves, at ×4.6 or ×10.
          </li>
          <li>
            <strong>Heights stay true.</strong> A pick and a measurement report
            true heights at ×1 to ×10. Shading that looks up by height (a colour
            ramp, a contour, the air&apos;s density) can read the true height
            through the route or the drawn one; the example&apos;s &quot;Height
            visuals&quot; puts the two side by side.
          </li>
          <li>
            <strong>Content that keeps its shape.</strong> A car should not grow
            ten times as tall because the terrain under it does.{" "}
            <C>warpAt: &quot;anchor&quot;</C> evaluates the route once at the
            draw&apos;s origin, in float64, and moves the draw rigidly by the
            translation and the rotation of J&apos;s polar factor, dropping
            scale and shear. Billboards and instances always work this way.
          </li>
        </ul>
        <Written
          from={
            <>
              the overall plan, sections 13.26 and 13.37,{" "}
              <C>examples/vertical-exaggeration</C> and{" "}
              <C>src/scene/warpAnchor.ts</C>
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="views" title="Per-view routes">
        <p>
          One view&apos;s content can be seen under different transforms in two
          ways, and the owner decided to stay with a tree for both.
        </p>
        <ul>
          <li>
            <strong>Same structure, different strengths</strong> (view A at ×10,
            view B at ×1): a per-view parameter, <C>View.setParameter</C>. It is
            a per-view uniform, so the cost is nothing.
          </li>
          <li>
            <strong>Different structures</strong> (view A exaggerated, view B a
            plan-and-profile sheet): a <strong>switch node</strong> whose edge
            is chosen per view, as a USD variant set or OpenSceneGraph&apos;s
            switch with camera masks is. Every view still sees a tree. True
            frames below the switch are unaffected.
          </li>
          <li>
            <strong>The same content twice in one view</strong>: instancing,
            later.
          </li>
        </ul>
        <h3>Twins</h3>
        <p>
          A draw has one program and one record, so when views reach an anchor
          by routes of different shape, they are grouped by shape (the smooth
          edges crossed, in order and direction, by identity), and each group
          past the first gets a <strong>twin</strong> of each mesh draw its
          views show.
        </p>
        <ul>
          <li>
            The first group that crosses a smooth edge keeps the source draws. A
            twin is routed as an anchor of its own, so its fits, its compiled
            program, its bounds and the terrain&apos;s exact term all follow
            that group&apos;s route.
          </li>
          <li>
            Masks the owner set are kept and narrowed to each group&apos;s
            views, so one anchor&apos;s draws never draw twice in a view. A twin
            follows its source each tick and is released when its group&apos;s
            last view goes or changes shape.
          </li>
          <li>
            A pick in any view resolves to the source draw, carried through{" "}
            <em>that view&apos;s</em> route. Tile selection runs on each
            view&apos;s own drawn bounds.
          </li>
          <li>
            One shape for every view, the common case, adds no draw and touches
            no mask.
          </li>
        </ul>
        <p>
          <strong>Limits.</strong> Billboards, instanced draws and patch draws
          have no twin and are drawn by the first group&apos;s route in every
          view, and the engine says so once. A ray query with no view sees a
          draw and its twin. A twin costs a draw record and its share of the
          draw table for each tile a second group shows. A view that differs
          only in a draw&apos;s record data (a rigid step before the last smooth
          one) shows its group&apos;s first view. Follow-up 10 removes the twins
          by choosing the program per (draw, view). Checked by{" "}
          <C>test/warpViewVariants.test.ts</C> and a spike: three views of one
          world, each box within 1.5 px of its own route.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.37,{" "}
              <C>src/scene/world/variants.ts</C> and <C>View.setParameter</C>
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="bounds" title="Bounds and tessellation">
        <p>
          Culling and tile selection ask about <em>drawn</em> volumes, since the
          camera is where things are drawn. Padding true bounds instead made a
          tile&apos;s sphere tens of kilometres too big at ×10, and selection
          too coarse.
        </p>
        <ul>
          <li>
            <strong>Selection samples.</strong> A warped tile&apos;s volume is
            sampled on a 3 × 3 × 3 grid and the image&apos;s sphere padded for
            bulge by <C>(1/8)·M₂·L²</C>, with M₂ from Jacobian differences. The
            tile&apos;s geometric error is stretched by σ_max, the largest
            singular value of J. A ranged parameter is bounded per bucket (16
            over the range), so selection follows the value a slider is at.
          </li>
          <li>
            <strong>The horizon test is off</strong> under a warped anchor. Its
            occluder is the true ellipsoid, which says nothing about a drawn
            Earth.
          </li>
        </ul>
        <p>
          <strong>Taylor bounds were tried, and don&apos;t win.</strong>{" "}
          <C>taylorBounds</C> is a first-order Taylor model, F(c) + J(c)·δ with
          a remainder from the Hessian program&apos;s intervals (or J&apos;s for
          a function with a kink). It is conservative everywhere it was tested,
          and tight where the function is simple, but loose on geodetic routes.
          The unrolled foot-point iteration&apos;s intervals swell even over a
          100 m box: J over it comes out as [−3, 9] for a true 5.1. So selection
          keeps sampling, and <C>taylorBounds</C> stays for routes with no
          nested iterations. Interval Hessians over geodetic functions would
          need affine arithmetic.
        </p>
        <DataTable
          label="Taylor bounds against sampling"
          columns={[
            { head: "Case", cell: (r) => r.case },
            { head: "Result", cell: (r) => r.result },
          ]}
          rows={TAYLOR}
        />
        <p>
          <strong>Tessellation is a spike.</strong> A straight edge of the
          content is a curve once a smooth edge is crossed, and a triangle that
          spans one sags from its chord by about L²·‖H‖/8. The spike gives each
          triangle n = ⌈√(M₂L²/8 / tolerance)⌉ (<C>curvatureOver</C> takes M₂
          from the route&apos;s Jacobian by differences, because the AD Hessian
          at Earth scale is rounding noise; <C>subdivisionFor</C> gives n) and
          runs the subdivision as a compute pass with an indirect draw, as the
          b-rep dicing does. A 50 km tile under ×10 at 10 km: two triangles take
          n = 36 and fall from 102 px of chord error to 0.08 px; 128 triangles
          take n = 5. It is not wired into drawing: what&apos;s missing is in
          the last section.
        </p>
        <Written
          from={
            <>
              <C>src/scene/warpBounds.ts</C>, <C>src/streaming/tileWarp.ts</C>,{" "}
              <C>src/transform/taylorBounds.ts</C>, <C>curvature.ts</C> and the
              plan, section 13.37, &quot;Queries through routes&quot;
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="numbers" title="Measured">
        <p>
          The GPU is held to its float64 twin by spike pages, and the Node tests
          check what the GPU is given. These numbers are from the commits that
          built each part.
        </p>
        <DataTable
          label="Measured numbers"
          columns={[
            { head: "Check", cell: (r) => <Ticks text={r.check} /> },
            { head: "Result", cell: (r) => r.result },
            { head: "Where", cell: (r) => r.where },
          ]}
          rows={MEASURES}
        />
        <p>
          These show numerical agreement: the GPU&apos;s float32 against the
          CPU&apos;s float64. A fit&apos;s own error, where one is used, is a
          separate figure.
        </p>
        <Written
          from="the commit messages of transform graph tasks 2 to 8 and the plan, section 13.37"
          on="2026-11-12"
        />
      </Sec>

      <Sec id="limits" title="Limits and follow-ups">
        <p>
          The owner asked for the three follow-ups to be planned, not started.
          Each names a limit and a general fix, rather than a patch.
        </p>
        <DataTable
          label="Follow-ups"
          columns={[
            { head: "Task", cell: (r) => <strong>{r.task}</strong> },
            { head: "Limit", cell: (r) => <Ticks text={r.limit} /> },
            { head: "General fix", cell: (r) => <Ticks text={r.fix} /> },
          ]}
          rows={FOLLOW_UPS}
        />
        <DataTable
          label="Other limits"
          columns={[
            { head: "What", cell: (r) => <strong>{r.what}</strong> },
            { head: "State", cell: (r) => <Ticks text={r.state} /> },
          ]}
          rows={ALSO}
        />
        <Written
          from="docs/superpowers/plans/2026-11-12-transform-graph.md, tasks 9 to 11, and the plan, section 13.37"
          on="2026-11-12"
        />
      </Sec>

      <Sec id="tour" title="A 2D tour">
        <p>
          Seven small 2D pictures of the model, drawn by its own arithmetic.
          Pick a scene, drag a slider, then move content or the camera to
          another node with the checkboxes and watch the picture and the route
          change. Thin grey edges in the tree are affine; bold purple ones are
          smooth. Units in the Earth scenes are schematic: the planet is drawn
          small and its relief large, so that k is visible. The{" "}
          <a href="/examples/transform-graph/">gallery example</a> is the same
          idea in 3D, on real data.
        </p>
        <Figure
          scroll={false}
          caption={
            <>
              The picture is one route per piece of content, evaluated in
              float64 from the graph on the right, J and H by forward-mode
              automatic differentiation in two variables (
              <C>handbook/src/transformGraph</C>). The route of the content
              chosen above the picture is highlighted in the tree and in the
              picture.
            </>
          }
        >
          <Explorer />
        </Figure>
        <h3>Reading the pictures</h3>
        <TourNotes />
        <p>
          The tour is 2D cross-sections, so the 3 × 3 case, inverses that fold
          (a strong lens), and the cost of picking through a Newton solve are
          not shown.
        </p>
      </Sec>
    </Page>
  );
}
