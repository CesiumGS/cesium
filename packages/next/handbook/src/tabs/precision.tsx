import { useId } from "react";
import { C, DataTable, Figure, Page, Section, Written } from "../parts.tsx";

const W = 170;
const H = 100;
const COLUMNS = [10, 205, 400, 595, 790];
const CPU_Y = 34;
const GPU_Y = 204;

function Box({
  column,
  y,
  title,
  lines,
  accent = false,
}: {
  column: number;
  y: number;
  title: string;
  lines: string[];
  accent?: boolean;
}) {
  const x = COLUMNS[column]!;
  return (
    <g>
      <rect
        className={accent ? "d-box d-box-accent" : "d-box"}
        x={x}
        y={y}
        width={W}
        height={H}
        rx={8}
      />
      <text className="d-title" x={x + 12} y={y + 24}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text className="d-text" x={x + 12} y={y + 46 + i * 18} key={line}>
          {line}
        </text>
      ))}
    </g>
  );
}

/** From float64 values on the CPU to clip space, and back for a pick. */
function Chain() {
  const id = useId();
  const head = `${id}h`;
  const marker = `url(#${CSS.escape(head)})`;
  const across = (from: number, y: number) => (
    <path
      className="d-edge"
      strokeWidth={1.5}
      markerEnd={marker}
      d={`M${COLUMNS[from]! + W} ${y + H / 2} L${COLUMNS[from + 1]! - 2} ${y + H / 2}`}
    />
  );
  return (
    <svg viewBox="0 0 970 316" role="img" aria-labelledby={id}>
      <title id={id}>
        On the CPU, in float64: the transform table, anchor placements, an eye
        per anchor, then a split into high and low parts. Only split positions,
        rotations and small values cross to the GPU. There, in float32: the
        highs subtract as integers, the small offset turns to the shading axes,
        the vertex stage adds tile-local positions, and the projection gives
        clip space. A pick reads the depth back and rebuilds the position in
        float64.
      </title>
      <defs>
        <marker
          id={head}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path className="d-head" d="M0 0 L8 4 L0 8 z" />
        </marker>
      </defs>
      <text className="d-title" x={10} y={18}>
        On the CPU, in float64
      </text>
      <text className="d-title" x={205} y={194}>
        On the GPU, in float32
      </text>
      <path
        className="d-edge"
        strokeWidth={1}
        strokeDasharray="5 4"
        d="M10 170 L960 170"
      />
      <path
        className="d-edge"
        strokeWidth={1.5}
        markerEnd={marker}
        d={`M${COLUMNS[0]! + W / 2} ${CPU_Y} L${COLUMNS[0]! + W / 2} 26 L${COLUMNS[3]! + W / 2} 26 L${COLUMNS[3]! + W / 2} ${CPU_Y - 2}`}
      />
      <text className="d-edge-label" x={385} y={21} textAnchor="middle">
        origins
      </text>
      {across(1, CPU_Y)}
      {across(2, CPU_Y)}
      <path
        className="d-edge"
        strokeWidth={1.5}
        markerEnd={marker}
        d={`M${COLUMNS[3]! + W / 2} ${CPU_Y + H} L${COLUMNS[3]! + W / 2} 152 L${COLUMNS[0]! + W / 2} 152 L${COLUMNS[0]! + W / 2} ${GPU_Y - 2}`}
      />
      <text className="d-edge-label" x={385} y={146} textAnchor="middle">
        only split positions, rotations and small values cross
      </text>
      {across(0, GPU_Y)}
      {across(1, GPU_Y)}
      {across(2, GPU_Y)}
      {across(3, GPU_Y)}
      <path
        className="d-edge"
        strokeWidth={1.5}
        markerEnd={marker}
        d={`M${COLUMNS[4]! + W / 2} ${GPU_Y} L${COLUMNS[4]! + W / 2} ${CPU_Y + H + 2}`}
      />
      <text className="d-edge-label" x={885} y={158}>
        read back
      </text>
      <Box
        column={0}
        y={CPU_Y}
        title="Transform table"
        lines={["Parent × local. Tile", "origins stay at Earth", "scale here."]}
      />
      <Box
        column={1}
        y={CPU_Y}
        title="Anchor placements"
        lines={["Set per view, each tick,", "by the camera layer."]}
      />
      <Box
        column={2}
        y={CPU_Y}
        title="Eye per anchor"
        lines={[
          "The eye in the anchor,",
          "the rotation to the",
          "view's shading axes.",
        ]}
      />
      <Box
        column={3}
        y={CPU_Y}
        title="Split"
        lines={["High: whole meters.", "Low: the small", "remainder."]}
      />
      <Box
        column={4}
        y={CPU_Y}
        title="Pick"
        lines={["z = near ÷ depth.", "Position = eye + z × ray."]}
      />
      <Box
        column={0}
        y={GPU_Y}
        accent
        title="Subtract"
        lines={["High − high as i32,", "plus low − low.", "Valid to ±2³¹ m."]}
      />
      <Box
        column={1}
        y={GPU_Y}
        title="Shading axes"
        lines={[
          "Only the small offset",
          "is rotated, never a",
          "large coordinate.",
        ]}
      />
      <Box
        column={2}
        y={GPU_Y}
        title="Vertex stage"
        lines={[
          "Offset × tile-local",
          "position, plus a small",
          "placement term.",
        ]}
      />
      <Box
        column={3}
        y={GPU_Y}
        title="Clip space"
        lines={[
          "Rotation-only view,",
          "reverse-Z projection,",
          "infinite far plane.",
        ]}
      />
      <Box
        column={4}
        y={GPU_Y}
        title="Depth"
        lines={["depth32float stores", "near ÷ distance."]}
      />
    </svg>
  );
}

const MEASURED = [
  {
    what: "Camera-relative offset, integer form",
    result:
      "0.04 µm at 1 m, 30 µm at 1 km, 3.8 mm at 100 km. Plain float32 at the same sites: 0.25 to 0.47 m.",
    kind: "Precision: what float32 arithmetic loses against the float64 value.",
    where: "Browser, M-series Mac; matches D3D12. spikes/precision.html",
  },
  {
    what: "Camera-relative offset, float form",
    result:
      "As bad as plain float32 on Metal (0.45 m at Philadelphia), because relaxed math folded the split back. This is why the integer form exists.",
    kind: "Precision: the failure the integer form fixes.",
    where: "Browser, M-series Mac. spikes/precision.html",
  },
  {
    what: "A rig on GCRF against one on ITRF, and re-rooting between them",
    result:
      "Every float of the view block within 0.125 of a float32 step of where it was. The test's limit is 1 step. Selection and terrain clip inputs agree to about 4 nm, and clamping rays exactly.",
    kind: "Numerical agreement: the routes round alike. Both use the analytic stand-in, whose ITRF states 18″, so this says nothing about accuracy.",
    where:
      "Node, with no GPU: what the GPU would be given, not what it did. test/rerooting.test.ts",
  },
  {
    what: "Per-vertex placement, GPU against its float64 twin",
    result:
      "Worst vertex 0.028 px from the twin, with placements moving vertices 7.2 to 26.3 px.",
    kind: "Numerical agreement: GPU float32 against CPU float64. How accurately the twin places a vertex is its stated errorBound, a separate figure.",
    where: "Browser, Apple M2",
  },
  {
    what: "Heights on 3D Tiles, by GPU ray casts",
    result:
      "Within 6 mm of what 1.x renders, on the points both hit. 1.x's depth precision limits this comparison.",
    kind: "Agreement with 1.x, not accuracy against the ground.",
    where: "Browser, against 1.x",
  },
  {
    what: "The analytic Moon against DE440",
    result:
      "From the Earth, within 16″ and 27 km, sampled daily over 2000 to 2050. In the Earth-fixed sky, with the analytic turn included, within 20.9″ and 36.5 km.",
    kind: "Accuracy, against the best reference the engine has.",
    where:
      "src/frames/analytic.ts, test/data/frameCatalog.test.ts, the plan 5 spec",
  },
  {
    what: "The analytic ITRF against IAU 2006/2000A with the EOP",
    result:
      "Largest sample 14.49″ over the EOP table's observed rows, 2000 to 2026. It states 18″, a bound from its parts.",
    kind: "Accuracy, against the best reference the engine has.",
    where: "src/frames/analytic.ts",
  },
];

const PICK_TERMS = [
  {
    term: "Footprint",
    kind: "Precision limit: the pixel's resolution",
    size: "One CSS pixel across at the hit: distance × 2 tan(fov ÷ 2) ÷ height",
    why: "The pick reads the pixel's center, which may be this far from where the click was meant.",
  },
  {
    term: "Depth",
    kind: "Precision limit: float32 rounding",
    size: "Half a float32 step of the stored depth, along the ray",
    why: "Only the stored value's rounding is counted, not the GPU's arithmetic before it.",
  },
  {
    term: "Content",
    kind: "Accuracy",
    size: "A placement's display error, or a fitted operation's stated bound",
    why: "How far the content is drawn from where its design says it is. A hosted placement's reprojection is the host's to state.",
  },
  {
    term: "Reference frame",
    kind: "Accuracy",
    size: "Each edge up to the nearest catalog reference frame, as it states itself",
    why: "A spacecraft's covariance counts. Catalog-to-catalog edges don't, because they move the point and its reference frame together.",
  },
];

const STATED = [
  {
    frame: "GCRF, EARTH_ICRF, MOON_ICRF",
    precise: "0.01 m: DE440's Earth-Moon fit to lunar laser ranging",
    standIn:
      "About 2.2 million km as absolute positions, with the Sun placed at the barycenter. The Moon from the Earth alone is within 16″ and 27 km",
  },
  {
    frame: "HCRS",
    precise: "Not stated: no absolute accuracy is published for it",
    standIn: "2.2 million km, stated conservatively",
  },
  {
    frame: "ITRF",
    precise:
      "From the EOP table: UT1 35 µs and polar motion 0.1 mas when measured, growing when predicted",
    standIn:
      "18″ (0.005°), a bound from its parts. The largest sampled over 2000 to 2026 is 14.49″",
  },
  {
    frame: "MOON_ME",
    precise: "Not stated: DE440 publishes no uncertainty for its libration",
    standIn: "21″ from the lunar PCK's axes",
  },
  {
    frame: "EME2000, MOON_PA",
    precise: "Exact by definition: adopted constants",
    standIn: "No stand-in: the same constants",
  },
];

const OLD_NEW = [
  {
    topic: "Positions near the eye",
    old: "Relative to eye, per vertex: EncodedCartesian3 splits at multiples of 65,536 m, and czm_translateRelativeToEye subtracts high and low in float32. Its own documentation gives the low part 7 fraction bits.",
    next: "Per transform, in a compute kernel. Highs are whole meters and subtract as integers, so lows stay small and no float sum can fold them together.",
  },
  {
    topic: "Tiles and models",
    old: "Relative to center: the CPU multiplies view by model in float64, and the shader gets the result. Globe tiles do this with u_modifiedModelView and a tile's rtc. Models read CESIUM_RTC.",
    next: "The same idea, one level up: a transform table in float64, and tile-local float32 positions. The matrix is built once per draw item in compute, and draws under an anchor upload once.",
  },
  {
    topic: "Depth",
    old: "Logarithmic depth on by default (Scene.defaultLogDepthBuffer). Scenes split into several frustums by a far-to-near ratio: 10⁹ with log depth, 1,000 without.",
    next: "One pass: reverse-Z in depth32float with an infinite far plane and no frustum splitting.",
  },
];

export function Precision() {
  return (
    <Page
      title="Precision and accuracy"
      status="current"
      lede={
        <>
          float32 can't represent an Earth-scale coordinate more finely than
          about half a meter, and an engine that spans Earth to Moon has further
          to go. So large numbers stay in float64 on the CPU, and the GPU only
          sees small values relative to the camera. That settles precision. It
          doesn't make a value true, so each answer also states its accuracy.
        </>
      }
    >
      <Section title="Two words, kept apart">
        <ul>
          <li>
            <strong>Precision</strong> is how finely a value can be represented
            or repeated: a float32 or float64 step, the resolution of a split
            position, the depth buffer's step. Rounding is a matter of
            precision.
          </li>
          <li>
            <strong>Accuracy</strong> is how close a value is to the truth, or
            to the best reference there is: an ephemeris against DE440, a
            stand-in's error, a stated ±, the figure composed for a pick.
          </li>
          <li>
            <strong>Numerical agreement</strong> is two computations of one
            thing giving the same answer, such as the GPU and its CPU twin. It
            shows that rounding is under control. It doesn't show that either is
            true.
          </li>
        </ul>
        <p>
          A value can be very precise and still inaccurate. The analytic Moon's
          position is a float64 with a step of about 60 nm at the Moon's
          distance, and it's within about 27 km of DE440. Precision can also cap
          accuracy: a pick's position can't be known better than the depth it
          was read from.
        </p>
        <p>
          One name in the code crosses this line. The catalog's <C>Precision</C>{" "}
          type, with its levels <C>"analytic"</C> and <C>"precise"</C>, chooses
          which model and data answer, so what it sets is accuracy. Values are
          float64 either way. The name is a candidate for the API review in
          sub-plan 5i. This handbook calls them levels.
        </p>
      </Section>

      <Section title="Precision: the chain, end to end">
        <Figure
          scroll
          label="Precision chain"
          caption="The dashed line is the one boundary. Above it, nothing is rounded to float32. Below it, nothing large exists: the highlighted subtraction is the only place large coordinates meet the camera."
        >
          <Chain />
        </Figure>
        <p>
          <strong>The rules:</strong> float64 on the CPU throughout. The GPU
          sees only camera-relative values. Nothing large is ever rotated in
          float32. Any per-vertex placement keeps its large offsets split, and
          evaluates only small tile-local terms in float32.
        </p>
        <Written
          from="the plan 5 spec, sections 4 and 7.4, and the source"
          on="2026-11-08"
        />
      </Section>

      <Section title="Splitting and subtracting">
        <p>
          <C>splitVec3</C> divides each float64 coordinate into a float32 pair:
          a high of whole meters, and a low that is the remainder. Shaders hold
          a <C>SplitPosition</C> whose parts are private. It can do only two
          things: take a <C>difference</C>, or give an <C>approximate</C> value
          for a direction from the Earth's center or an altitude. Misusing the
          parts is a compile error.
        </p>
        <p>
          The difference subtracts the highs as integers:{" "}
          <C>float3(int3(hi) - int3(b.hi)) + (lo - b.lo)</C>. Integers can't be
          reassociated with floats, which matters because Dawn compiles with
          relaxed math on Apple GPUs. It's one path on every machine, not a
          Metal branch, and costs a few integer operations per draw item rather
          than per vertex. A 32-bit integer of meters reaches ±2³¹ m, about 2.1
          million km, which covers Earth to Moon at about 384,000 km.
        </p>
        <p>
          An anchor further than that from the eye hides its draws in that view,
          rather than drawing them in the wrong place.
        </p>
      </Section>

      <Section title="Transforms, anchors and an eye per anchor">
        <p>
          The transform table composes parent × local in float64. Each GPU entry
          is a split origin plus a float32 rotation-scale, so content's own
          vertices stay small and tile-local.
        </p>
        <p>
          Bodies, engineering frames and trajectories each hang under an anchor.
          The core places the camera in each anchor, not each anchor in render
          space. <C>computeAnchorEyes</C> works out in float64, per view and
          anchor, the eye in the anchor's coordinates and the rotation to the
          view's shading axes. The GPU reads them as <C>AnchorEye</C>, and{" "}
          <C>relativeMatrix</C> in <C>cullTables.slang</C> turns a transform
          into a camera-relative matrix: subtract first, then rotate the small
          result.
        </p>
        <p>
          A rig that rotates, such as one on GCRF, costs only the anchors'
          recomputation each tick, because draws keep their anchor-relative
          transforms. With every anchor at the identity, each float the GPU
          reads is what it was before anchors existed.
        </p>
      </Section>

      <Section title="Depth">
        <p>
          Depth is 32-bit float with reverse-Z and an infinite far plane, so a
          stored depth is near ÷ distance. The near plane is a fixed 0.1 m,
          since in this arrangement depth precision doesn't depend on it. There
          is one pass, with no splitting of the view into several frustums.
        </p>
        <p>
          Half a float32 step of that depth is a precision limit of 3 to 6 parts
          in 100 million of the distance: 0.03 to 0.06 mm at 1 km, 3 to 6 mm at
          100 km, and 11 to 23 m at the Moon's distance. The bare ellipsoid
          draws with its depth scaled by 2⁻⁶⁴, behind everything, and picks undo
          the scale.
        </p>
      </Section>

      <Section title="Per-vertex placements">
        <p>
          A placement moves a vertex beyond what its draw's transform does: a
          second position mixed by a parameter, a fitted operation, or a blend
          of two. A fitted operation is a polynomial of order 3 or less in
          tile-local coordinates normalized by the tile's radius, so its inputs
          are never larger than about 1.
        </p>
        <ul>
          <li>
            <strong>Two evaluations, in numerical agreement:</strong> in Slang
            for drawing, and in a float64 twin in <C>src/scene/placement.ts</C>{" "}
            for picks, bounds and culling.
          </li>
          <li>
            <strong>Its accuracy:</strong> a fitted operation states{" "}
            <C>errorBound</C>, in meters, against the coordinate operation it
            was fitted to. A dual position states none.
          </li>
          <li>
            <strong>Its reach:</strong> every placement states{" "}
            <C>maxDisplacement</C>, and the draw's bounds grow by that much. A
            fitted operation's <C>secondDerivativeBound</C> bounds how far its
            curve departs from the flat triangles between vertices.
          </li>
          <li>
            <strong>What's refused:</strong> a non-finite parameter,
            coefficient, center, scale or bound, or a number finite in float64
            that float32 can't hold. It throws a <C>RangeError</C> naming the
            value, and is never drawn in the wrong place.
          </li>
        </ul>
      </Section>

      <Section title="Picks">
        <p>
          A pick reads a depth back from the GPU, then rebuilds the position on
          the CPU in float64, from the camera as it was at the pick's tick:{" "}
          <C>z = near ÷ depth</C>, then the eye plus <C>z</C> along the pixel's
          ray. Because it reads the depth that was drawn, a pick agrees with any
          placement. Being a float64 says nothing about how well the point is
          known, so the pick states that separately.
        </p>
        <p>
          With the frames module, <C>createFramesPickInterpreter</C> tags the
          point with its reference frame and composes its accuracy from these
          terms, 1σ, as a root sum square. The composed figure is an accuracy.
          Two of its terms are precision limits feeding into it:
        </p>
        <DataTable
          label="Terms of a pick's accuracy"
          columns={[
            { head: "Term", cell: (r) => <strong>{r.term}</strong> },
            { head: "Kind", cell: (r) => r.kind },
            { head: "Its size", cell: (r) => r.size },
            { head: "What it means", cell: (r) => r.why },
          ]}
          rows={PICK_TERMS}
        />
        <p>
          For scale: at 1 km with a 60° vertical field of view on a 1,000 px
          view, the footprint is about 1.15 m and the depth term 0.03 to 0.06
          mm. Of the two precision limits, the pixel binds long before the depth
          buffer does.
        </p>
        <p>
          The result names what it leaves out, including the GPU's float32
          arithmetic before the depth was stored, correlations between terms,
          the content's own error against the world, and the coordinate
          operation's own accuracy behind design coordinates.
        </p>
      </Section>

      <Section title="Time">
        <p>
          <C>Instant</C> holds TT seconds past J2000 in one float64. TT is
          uniform, where the clock's UTC milliseconds jump at leap seconds.
          Converting from UTC subtracts the large epoch in integer milliseconds
          first, so the offset costs no precision. TDB, which SPICE calls ET, is
          computed from TT and differs by under 2 ms; <C>fromTdb</C> gets back
          the same value or one within a float64 step.
        </p>
        <p>
          Its precision floor is that float64's step: 2.4 × 10⁻⁷ s near 2050.
          One step is about 0.1 mm of Earth rotation at the surface, 7 mm in
          positions relative to the solar system's barycenter, and 0.2 mm from
          Earth to Moon. All are well below the overall plan's 1 m goal, and a
          two-part <C>Instant</C> is the fix if a later plan needs more. These
          are precision limits: how accurate a position is depends on its
          ephemeris, below, not on this step.
        </p>
      </Section>

      <Section title="Reference-frame accuracy">
        <p>
          All of this is accuracy: every value here is a float64, whichever
          column it comes from. Each edge of the frame tree states what it can
          claim, 1σ. A stand-in's figure is the largest error measured against
          the full data, rounded up, or for ITRF a bound from its parts.
        </p>
        <DataTable
          label="Stated accuracy of reference frames"
          columns={[
            { head: "Reference frame", cell: (r) => <C>{r.frame}</C> },
            {
              head: 'With its full data, level "precise"',
              cell: (r) => r.precise,
            },
            {
              head: 'On its stand-in, level "analytic"',
              cell: (r) => r.standIn,
            },
          ]}
          rows={STATED}
        />
        <p>
          <C>pointAccuracy</C> composes these along a route, and these rules
          keep the answer from claiming more than its inputs support:
        </p>
        <ul>
          <li>
            A figure is never 0, NaN or negative: the constructor throws, naming
            the reference frame. Exact by definition is its own stated answer.
          </li>
          <li>
            An edge that states nothing makes the total unbounded. It's named in
            the result and never dropped.
          </li>
          <li>
            A rotation error becomes meters through the lever arm, the point's
            distance from that edge's origin. That's an upper bound, as the
            figure names no axis.
          </li>
          <li>
            Terms combine as a root sum square, taken as independent.
            Correlations and error ellipsoids aren't modelled, and the result
            says so.
          </li>
          <li>
            Each figure's <C>note</C> says where it comes from. A fit to ranges
            isn't presented as an orientation accuracy, for example.
          </li>
        </ul>
        <Written
          from={
            <>
              <C>src/frames/frameAccuracy.ts</C>, <C>analytic.ts</C> and{" "}
              <C>pointAccuracy.ts</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="What's been measured">
        <p>
          Each row says what kind of result it is. Most are precision or
          numerical agreement, which aren't accuracy against the truth.
        </p>
        <DataTable
          label="Measured results"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Result", cell: (r) => r.result },
            { head: "What it shows", cell: (r) => r.kind },
            { head: "How", cell: (r) => r.where },
          ]}
          rows={MEASURED}
        />
        <h3>What a one-step change looks like on Metal</h3>
        <p>
          WGSL doesn't fix the order of a float sum, and Metal's compiler, as
          Dawn invokes it, reassociates. One parity row showed this directly.
          Adding a rotation by the anchor's axes to the cull kernel, which is
          exact with identity axes and changed no input, moved an instanced
          draw: the compiler now sums its translation in the written order. In
          14 of 75 components (13 of 25 instances), the result moved by one
          float32 step, 3.6 to 22 µm at 40 to 380 m. One MSAA sample flipped,
          changing one edge pixel, and the row's FLIP went from 0.015940 to
          0.015948.
        </p>
        <p>
          Neither order loses precision worth acting on: both stay within about
          one step of the exact float32 sum, and neither WGSL nor Metal promises
          either. So any kernel change can move results by a step on Metal. The
          working rule is to compare against the previous commit as well as a
          base commit, and explain any pixel difference before accepting it.
        </p>
        <h3>What keeps the precision this way</h3>
        <ul>
          <li>
            <C>test/precision.test.ts</C> fails on arithmetic on split values
            outside the allowed helpers.
          </li>
          <li>
            The browser's precision page has a bound of 1.5 × 10⁻⁷ × distance +
            1 µm, and fails past it on each platform it runs on.
          </li>
          <li>
            <C>test/rerooting.test.ts</C> holds the view block to one float32
            step across a change of root.
          </li>
        </ul>
        <Written
          from="the overall plan, sections 3.3 and 13.9, plan 5a's reports and the tests"
          on="2026-11-08"
        />
      </Section>

      <Section title="How precision differs from 1.x">
        <DataTable
          label="Precision in 1.x and 2.0"
          columns={[
            { head: "Topic", cell: (r) => r.topic },
            { head: "1.x", cell: (r) => r.old },
            { head: "2.0", cell: (r) => r.next },
          ]}
          rows={OLD_NEW}
        />
        <Written
          from={
            <>
              1.x's source: <C>EncodedCartesian3.js</C>,{" "}
              <C>translateRelativeToEye.glsl</C>, <C>UniformState.js</C>,{" "}
              <C>GlobeSurfaceTileProvider.js</C>, <C>View.js</C> and{" "}
              <C>Scene.js</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>
            The same accounting for rays, once 5b's rays through the tree land.
          </li>
          <li>
            The Moon at close range, measured, once 5c puts a second body in one
            world.
          </li>
          <li>Precision on a D3D12 and Vulkan run of today's kernels.</li>
          <li>Measured accuracy against SPICE and NGS fixtures, per route.</li>
        </ul>
      </Section>
    </Page>
  );
}
