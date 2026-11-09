import { useId } from "react";
import { Board, type BoardStep } from "../diagram.tsx";
import {
  C,
  DataTable,
  Figure,
  Generated,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";
import type { Camera } from "../../../src/scene/Camera.ts";
import {
  createShadowCascades,
  fitShadowCascades,
  shadowRange,
  SHADOW_CASCADES,
  SHADOW_SIZE,
} from "../../../src/scene/shadows.ts";

const TICK: BoardStep[] = [
  {
    id: "light",
    lane: 0,
    row: 0,
    title: "Choose the light",
    body: (
      <>
        The sun while it's up, or at night the Moon when it's up. With neither,
        or with <C>View.shadows</C> off, the rest of this is skipped.
      </>
    ),
  },
  {
    id: "range",
    lane: 0,
    row: 1,
    title: "Settle the depth range",
    body: (
      <>
        <C>shadowRange</C> takes the last reading, adds room for motion, rounds
        it, and widens at once but narrows slowly.
      </>
    ),
  },
  {
    id: "fit",
    lane: 0,
    row: 2,
    title: "Fit four cascades",
    body: (
      <>
        <C>fitShadowCascades</C> gives each a slice of the view, a sphere around
        it, and a box from the sun, snapped to a texel grid fixed on the ground.
      </>
    ),
  },
  {
    id: "blocks",
    lane: 0,
    row: 3,
    title: "Write a view block per cascade",
    body: (
      <>
        Each has the cascade's matrix and culling planes, and the view's own
        bit, so it sees what that view draws and the casters it selected. They
        wait in <C>cascadeStaging</C>.
      </>
    ),
  },
  {
    id: "copy",
    lane: 1,
    row: 0,
    title: "Copy the cascade's block in",
    body: "To the current view buffer, so the cull and the draw that follow see the cascade as if it were the view.",
  },
  {
    id: "cull",
    lane: 1,
    row: 1,
    title: "Cull again",
    body: (
      <>
        The same compute kernel, with no point sets:{" "}
        <C>encodeCull(enc, undefined, false)</C>. It rewrites the items and draw
        arguments for this cascade.
      </>
    ),
  },
  {
    id: "draw",
    lane: 1,
    row: 2,
    title: "Draw the casters' depth",
    body: (
      <>
        One bundle, <C>World.shadowBundle()</C>, runs for all four, into this
        cascade's layer of a <C>depth32float</C> array.
      </>
    ),
  },
  {
    id: "viewcull",
    lane: 1,
    row: 3,
    title: "Then the view's own cull",
    body: "The later cull pass rewrites the items and draw arguments again, for the view.",
  },
  {
    id: "receive",
    lane: 2,
    row: 0,
    title: "Surfaces read the cascades",
    rows: 2,
    body: (
      <>
        In the opaque and translucent passes, <C>sunShadow</C> picks a cascade
        by distance along the view, filters a 5 × 5 tent of comparisons, blends
        into the next cascade over the last tenth, and fades out toward the far
        distance. It scales direct light only.
      </>
    ),
  },
  {
    id: "depthrange",
    lane: 2,
    row: 2,
    title: "Read the depth shown",
    rows: 2,
    body: (
      <>
        The <C>depth-range</C> pass samples 128 × 128 points of the view's depth
        for the nearest and farthest surface. The reading maps a tick or so
        later, and one is in flight at a time. It feeds a later tick's range.
      </>
    ),
  },
];

function ShadowTick() {
  return (
    <Board
      label="One tick of shadows"
      lanes={[
        "On the CPU, for each view",
        "The shadows pass, once per cascade",
        "Later in the same tick",
      ]}
      steps={TICK}
      edges={[
        { from: "light", to: "range", vertical: true },
        { from: "range", to: "fit", vertical: true },
        { from: "fit", to: "blocks", vertical: true },
        { from: "copy", to: "cull", vertical: true },
        { from: "cull", to: "draw", vertical: true },
        { from: "draw", to: "viewcull", vertical: true },
        { from: "receive", to: "depthrange", vertical: true },
      ]}
    />
  );
}

/** Metres, as a reader would say them. */
function distance(m: number) {
  const digits = (x: number) =>
    x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
  if (m >= 1000) {
    return `${digits(m / 1000)} km`;
  }
  if (m >= 1) {
    return `${digits(m)} m`;
  }
  return `${digits(m * 100)} cm`;
}

const FOVY = Math.PI / 3;
const ASPECT = 16 / 9;

/** What the engine's own fit gives for one camera. */
function fit(height: number, shown?: { near: number; far: number }) {
  const out = createShadowCascades();
  const camera = {
    near: 1,
    fovy: () => FOVY,
    direction: [0, 1, 0],
    position: [0, 0, 6_378_137],
  } as unknown as Camera;
  const range = shadowRange(undefined, shown);
  fitShadowCascades(out, camera, ASPECT, [0.6, 0, 0.8], height, range);
  const far = out.far;
  const near = Math.min(Math.max(camera.near, 1, range?.near ?? 0), far / 4);
  return {
    near,
    far,
    cascades: Array.from({ length: SHADOW_CASCADES }, (_, i) => ({
      from: i === 0 ? near : out.splits[i - 1]!,
      to: out.splits[i]!,
      texel: out.texels[i]!,
    })),
  };
}

const AXIS_MIN = 1;
const AXIS_MAX = 150_000;
const at = (m: number) =>
  (100 * Math.log(Math.max(m, AXIS_MIN) / AXIS_MIN)) /
  Math.log(AXIS_MAX / AXIS_MIN);

const SCENES = [
  { name: "2 m up, before any reading", height: 2 },
  {
    name: "2 m up, showing 12 to 80 m",
    height: 2,
    shown: { near: 12, far: 80 },
  },
  { name: "100 m up, before any reading", height: 100 },
  { name: "1 km up, before any reading", height: 1000 },
  {
    name: "1 km up, showing 900 m to 6 km",
    height: 1000,
    shown: { near: 900, far: 6000 },
  },
  { name: "10 km up, before any reading", height: 10_000 },
];

function CascadeReach() {
  return (
    <div className="reach">
      <div className="reach-axis" aria-hidden="true">
        {[1, 10, 100, 1000, 10_000, 100_000].map((m) => (
          <span key={m} style={{ insetInlineStart: `${at(m)}%` }}>
            {m >= 1000 ? `${m / 1000} km` : `${m} m`}
          </span>
        ))}
      </div>
      {SCENES.map((scene) => {
        const f = fit(scene.height, scene.shown);
        return (
          <section className="reach-row" key={scene.name}>
            <h3>{scene.name}</h3>
            <div className="reach-bar" aria-hidden="true">
              {f.cascades.map((c, i) => (
                <span
                  className={`reach-c${i}`}
                  key={i}
                  style={{
                    insetInlineStart: `${at(c.from)}%`,
                    inlineSize: `${at(c.to) - at(c.from)}%`,
                  }}
                />
              ))}
            </div>
            <ol className="reach-list">
              {f.cascades.map((c, i) => (
                <li key={i}>
                  <span
                    className={`reach-swatch reach-c${i}`}
                    aria-hidden="true"
                  />
                  To {distance(c.to)}, with a {distance(c.texel)} texel
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** Seen from above, with the sun toward the top of the drawing. */
function CascadeBox() {
  const titleId = useId();
  return (
    <svg viewBox="0 0 900 470" role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        Seen from above. A camera looks right along a wedge. One cascade's
        sphere holds a slice of that wedge, and its box runs up from the sphere
        toward the sun. A hill inside the wedge casts a shadow. A hill up-sun of
        the wedge is off screen but inside the box, so a budgeted tileset
        selects it as a caster when it has room, and its shadow falls into the
        view.
      </title>
      <path className="d-box" d="M50 330 L580 213 L580 447 Z" strokeWidth={1} />
      <rect
        className="d-box-accent"
        x={275}
        y={20}
        width={250}
        height={435}
        fillOpacity={0.35}
        strokeWidth={1.5}
      />
      <circle
        className="d-box-plain"
        cx={400}
        cy={330}
        r={125}
        strokeWidth={1.5}
      />
      <path className="d-edge" strokeWidth={1} d="M320 271 V389" />
      <path className="d-edge" strokeWidth={1} d="M480 235 V425" />

      <rect className="d-shadow" x={352} y={300} width={36} height={70} />
      <ellipse className="d-hill" cx={370} cy={292} rx={22} ry={16} />
      <rect className="d-shadow" x={428} y={120} width={44} height={190} />
      <ellipse className="d-hill" cx={450} cy={108} rx={28} ry={20} />

      <circle className="d-head" cx={50} cy={330} r={5} />
      <text className="d-title" x={36} y={362}>
        Camera
      </text>
      <text className="d-text" x={510} y={336}>
        The view
      </text>
      <text className="d-text" x={345} y={420}>
        One cascade's slice
      </text>

      <path
        className="d-edge"
        strokeWidth={1.5}
        d="M250 90 V30 M244 40 L250 30 L256 40"
      />
      <text className="d-text" x={245} y={110} textAnchor="end">
        Toward the sun
      </text>

      <path className="d-edge" strokeWidth={1} d="M480 108 H600" />
      <text className="d-title" x={608} y={100}>
        A hill off screen
      </text>
      <text className="d-text" x={608} y={120}>
        In the box, so a budgeted tileset selects
      </text>
      <text className="d-text" x={608} y={138}>
        it as a caster when it has room.
      </text>

      <path className="d-edge" strokeWidth={1} d="M525 40 H600" />
      <text className="d-title" x={608} y={36}>
        The cascade's box
      </text>
      <text className="d-text" x={608} y={56}>
        One sphere across, and at least 30 km past it
      </text>
      <text className="d-text" x={608} y={74}>
        toward the sun (not to scale).
      </text>

      <path className="d-edge" strokeWidth={1} d="M348 288 L255 250" />
      <text className="d-title" x={245} y={206} textAnchor="end">
        A hill in view
      </text>
      <text className="d-text" x={245} y={226} textAnchor="end">
        Selected and in the box,
      </text>
      <text className="d-text" x={245} y={244} textAnchor="end">
        so it casts.
      </text>

      <path className="d-edge" strokeWidth={1} d="M504 400 H600" />
      <text className="d-title" x={608} y={396}>
        The cascade's sphere
      </text>
      <text className="d-text" x={608} y={416}>
        Holds the slice however the camera turns,
      </text>
      <text className="d-text" x={608} y={434}>
        so its texel size doesn't change as it does.
      </text>
    </svg>
  );
}

const WHAT_CASTS: [string, string][] = [
  ["Opaque triangles and instances", "Cast."],
  [
    "Cut-out surfaces",
    "Cast what's drawn, by the same alpha cutoff (shadowFs).",
  ],
  ["Blended surfaces", "Only their parts at opacity 0.999 and up."],
  ["Translucent terrain", "None inside its region, as glass."],
  ["Clipped terrain", "Nothing inside the clip."],
  [
    "A coarse tile kept while its children load",
    "Only outside the children's boxes, so it doesn't shadow what's drawn beside it.",
  ],
  [
    "A translucent scene item",
    "None: it draws only in the translucent passes, on screen or off.",
  ],
  ["Point sets", "None: the shadow pass's cull leaves them out."],
  ["Billboards and lines", "None: they aren't in the casters' bundle."],
  [
    "Tiles off screen",
    "Those a budgeted 3D tileset selects as casters, below. Stepwise and terrain select none.",
  ],
];

const CASTER_COSTS: { what: string; figure: string; measured: string }[] = [
  {
    what: "The selection walk",
    figure: "2.75 ms",
    measured:
      "The median of four 95th percentiles, on Google's tileset at 150 m.",
  },
  {
    what: "Bytes casters hold",
    figure: "2.09 and 2.45 times the view's",
    measured:
      "One photogrammetry tileset, with a 4 GiB cache. Other content hasn't been measured.",
  },
  {
    what: "A return after more than 60 s, with a full cache",
    figure: "A third to under half of the view's requests",
    measured:
      "Reloads of what casters took in the meantime, on a cache that casters off would have kept.",
  },
];

const COMPARE: [string, string, string][] = [
  ["Cascades", "4 (or 1)", `${SHADOW_CASCADES}`],
  ["Size of each", "2048 px by default", `${SHADOW_SIZE} px`],
  [
    "How far shadows reach",
    "maximumDistance, 5000 m by default",
    "20 times the camera's height, 200 m to 150 km, narrowed to the depth shown",
  ],
  [
    "Splits",
    "Logarithmic and uniform blended, lambda 0.9",
    "The same blend, lambda 0.9, over the depth range",
  ],
  ["Filtering", "softShadows, off by default", "A 5 × 5 tent, always"],
  [
    "On by default",
    "No: options.shadows is false",
    "No in the engine; the Viewer turns them on",
  ],
  [
    "Tiles off screen",
    "Only tiles the camera selected cast",
    "A budgeted tileset selects casters. Stepwise keeps 1.x's behaviour",
  ],
];

export function Shadows() {
  return (
    <Page
      title="Shadows"
      status="current"
      lede={
        <>
          One light casts: the sun, or at night the Moon. It casts into four
          cascades of one depth array, each fitted to a slice of what the view
          shows. They're off by default in the engine, and the Viewer turns them
          on.
        </>
      }
    >
      <Section title="One tick">
        <Figure caption="Each view repeats this, and they share one shadow map, which each rewrites before it draws. The Rendering tab shows where the passes sit among the rest.">
          <ShadowTick />
        </Figure>
        <Written
          from={
            <>
              <C>src/scene/Engine.ts</C>, <C>src/scene/shadows.ts</C> and{" "}
              <C>src/shaders/depthRange.slang</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="Fitting the cascades">
        <p>
          Two things set how far shadows reach. The camera's height sets the
          longest they can go: 20 times that height, at least 200 m and at most
          150 km. So a camera on a street gets fine cascades and a mountain view
          gets long ones.
        </p>
        <p>
          The depth range then narrows it to what the view shows, so texels go
          where the surfaces are. This follows the splits of Lauritzen, Salvi
          and Lefohn's sample distribution shadow maps. The reading gets room
          for the camera's motion, a fifth nearer and a quarter farther, in
          steps of a quarter octave. It widens at once, and narrows only when
          it's a step and a half too wide, so the splits don't wobble.
        </p>
        <p>
          Splits blend logarithmic and uniform at 0.9, which is Zhang et al.'s
          practical scheme. Two more choices keep the edges still. Each cascade
          is a sphere, so its size doesn't change as the camera turns. And its
          centre snaps to a grid of texels in absolute light coordinates, so the
          grid stays on the ground as the camera moves. A cascade's texel size
          comes from the sphere, so it gives up some resolution for that.
        </p>
        <Figure caption="Each bar is one camera on one log scale, with the camera at the left end. Computed when this page was built, by the engine's own shadowRange and fitShadowCascades, for a 60° vertical view at 16:9.">
          <CascadeReach />
        </Figure>
        <Generated from={<C>src/scene/shadows.ts</C>} />
      </Section>

      <Section title="What each cascade draws">
        <p>
          A cascade draws what its view draws, and that view's casters off
          screen. Its block carries the view's bit, so the cull passes only
          those, and tests them against the box's four sides and its far side.
          Toward the sun, the depth range bounds it, at least 30 km past the
          sphere, for casters such as mountains at a low sun.
        </p>
        <Figure
          scroll
          label="A cascade's sphere and box, seen from above"
          caption="Seen from above, with one of the four cascades. A schematic, not to scale."
        >
          <CascadeBox />
        </Figure>
        <p>
          The casters' bundle is recorded once, and stays current with the
          view's own. Its pipelines write depth only, with a depth bias
          (constant 2, slope 1.5, negative under reverse-Z), and those with no
          alpha to test use a fragment stage that only applies clips. Batches no
          view draws are left out of it.
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="What casts a shadow"
        >
          <table className="seams">
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">What it casts</th>
              </tr>
            </thead>
            <tbody>
              {WHAT_CASTS.map(([what, casts]) => (
                <tr key={what}>
                  <th scope="row">{what}</th>
                  <td>{casts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Written
          from={
            <>
              <C>recordBundle</C> in <C>src/scene/World.ts</C>, and{" "}
              <C>shadowFs</C> and <C>shadowPlaceholderFs</C> in{" "}
              <C>src/shaders/surface.slang</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="Off-screen casters">
        <p>
          Selection follows the camera, so a tile behind it, toward the sun,
          isn't selected though its shadow falls in view. So a budgeted 3D
          tileset looks for casters too, after every view's walk.
        </p>
        <Note title="What's been checked">
          <p>
            One case has been checked by eye: shadows in the station model, from
            inside it. No other real content has been judged, and the GPU cost
            of casters remains unmeasured.
          </p>
        </Note>
        <h3>Which tiles cast</h3>
        <p>
          A caster is a tile the view doesn't draw, inside the cascades' boxes
          and inside a rectangle in light space around every receiver: each tile
          the view draws in this tileset, in the world's others and on the
          globe. With nothing drawn yet there are no casters. If a receiver
          stands in another anchor's coordinates, only the boxes limit them, up
          to 50 km past a cascade's sphere toward the light.
        </p>
        <h3>How much room they get</h3>
        <p>
          There's one cache budget, and casters have no share of it. What views
          use this tick is never evicted. Casters get free bytes first: the
          cache, less what views use, less cold tiles that a view may come back
          to. Only then do they get a cold tile's room, once it's stale.
        </p>
        <p>
          A cold tile counts as stale after 8 s without a view. A view returning
          after a longer absence makes that twice its absence, up to 60 s. So
          the worst a view pays is one return after each longer absence, until
          60 s, and past that every return can cost reloads. The cap is chosen:
          without it, casters would get less room for longer after each long
          return. Eviction takes casters that aren't casting first, then cold
          tiles as it would with casters off, then stale ones for casters.
        </p>
        <h3>Coarsening before dropping</h3>
        <p>
          Off screen, a tile refines at <C>casterErrorScale</C> times the
          threshold, 2 by default. If those don't fit, the walk uses the finest
          of 2, 4, 8 and 16 times that scale whose casters do, leaving out any
          tile too large to fit at all. If none fits, the nearest of the
          coarsest are admitted while their bytes fit. What isn't admitted isn't
          requested and doesn't cast. While a caster loads, its nearest loaded
          ancestor casts for it, unless that ancestor is drawn on screen.
        </p>
        <h3>Giving way to views</h3>
        <p>
          Casters come last in the request band, the upload queue and the
          in-flight slots. A view's request that finds its origin's window full
          cancels a caster in flight. They stop loading when a world pool is
          past 75% full, or while another tileset's view tile waits for
          capacity. A still view doesn't count as loading because of them.
        </p>
        <h3>Who sees them</h3>
        <p>
          A draw record has a <C>casterMask</C> beside its view mask. Only a
          cascade's cull reads it, as <C>viewMask | casterMask</C>. Picks, ray
          casts, depth ranges, translucency and the drawn-tile stats read the
          view mask, so they never see a caster. A batch that only cascades draw
          is in the shadow bundle alone.
        </p>
        <p>
          Each opaque scene item of a tileset casts from off screen too. The
          bytes are counted once, as items share their tiles.
        </p>
        <h3>What it costs</h3>
        <DataTable
          label="Measured costs of off-screen casters"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Figure", cell: (r) => r.figure },
            { head: "What it measured", cell: (r) => r.measured },
          ]}
          rows={CASTER_COSTS}
        />
        <p>The GPU time casters add hasn't been measured.</p>
        <p className="provenance">
          From the engine's <C>lod</C> bench, as the commits and the code's own
          comment record them. They aren't in this page's generated results, and
          none has been addressed yet.
        </p>
        <Written
          from={
            <>
              <C>src/streaming/Tileset3D.ts</C>,{" "}
              <C>src/streaming/Budgeted.ts</C>, <C>src/scene/shadows.ts</C> and{" "}
              <C>src/shaders/cullTables.slang</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="Filtering">
        <p>
          A surface finds its cascade by its distance along the view. It moves
          along its geometric normal by two of that cascade's texels first, so
          surfaces at grazing angles to the light don't shadow themselves. Then
          it takes nine bilinear comparisons, weighted to make a 5 × 5 tent, for
          a smooth edge about four texels wide.
        </p>
        <p>
          Over the last tenth of a cascade, it blends into the next, since their
          texels differ in size and a seam would show. From 85% of the far
          distance, shadows fade out to nothing. The result scales direct light
          only, so ambient light and the environment carry on in shadow.
        </p>
      </Section>

      <Section title="What's limited today">
        <ul>
          <li>
            <strong>Off-screen casters share the cache.</strong> With little
            room they coarsen, then drop, so a shadow from off screen can be
            coarse or missing. Stepwise and terrain select none.
          </li>
          <li>
            <strong>Reach.</strong> Past the far distance there are no shadows,
            and that distance is at most 150 km.
          </li>
          <li>
            <strong>A late depth reading.</strong> It arrives a tick or so after
            it was taken. If the camera moves further than the room allowed for,
            surfaces outside the range may have no shadow until a new reading
            maps.
          </li>
          <li>
            <strong>One light.</strong> Only the sun or the Moon casts. Punctual
            lights don't.
          </li>
          <li>
            <strong>Cost.</strong> Each shadowed view adds four culls and four
            depth passes per tick. The benchmarks don't report it on its own
            yet.
          </li>
        </ul>
      </Section>

      <Section title="Compared with 1.x">
        <p>
          There are no parity figures for shadows. The engine's parity tests
          compare with 1.x scenes that draw none, so they run with shadows off,
          and nothing has measured the two against each other. What can be
          compared is what each one is set up to do.
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="Shadow settings in 1.x and 2.0"
        >
          <table className="seams">
            <thead>
              <tr>
                <th scope="col">Setting</th>
                <th scope="col">1.x</th>
                <th scope="col">2.0</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([what, one, two]) => (
                <tr key={what}>
                  <th scope="row">{what}</th>
                  <td>{one}</td>
                  <td>{two}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Written
          from={
            <>
              <C>packages/engine/Source/Scene/ShadowMap.js</C> and{" "}
              <C>src/scene/View.ts</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>
    </Page>
  );
}
