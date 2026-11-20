import { useId } from "react";
import { count, day, referenceAdapter } from "../data.ts";
import { TileLifecycle } from "../flows.tsx";
import {
  C,
  CodeBlock,
  DataTable,
  Figure,
  Flow,
  Generated,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

/** Which levels each policy requests on one path from the root to the frontier. */
function LevelLadder() {
  const id = useId();
  const rowHeight = 30;
  const levels = [0, 1, 2, 3, 4, 5, 6, 7];
  const budgeted: Record<number, string> = {
    0: "base",
    3: "intermediate",
    6: "intermediate",
    7: "frontier",
  };
  const cell = (
    x: number,
    level: number,
    requested: boolean,
    label: string,
  ) => (
    <g key={`${x}-${level}`}>
      <rect
        className={requested ? "d-box d-box-accent" : "d-box-plain"}
        x={x}
        y={34 + level * rowHeight}
        width={150}
        height={rowHeight - 6}
        rx={4}
      />
      <text
        className="d-text"
        x={x + 75}
        y={34 + level * rowHeight + 16}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 470 280" role="img" aria-labelledby={id}>
      <title id={id}>
        On one path to level 7, Stepwise requests all eight levels. Budgeted
        requests level 0 as a base, levels 3 and 6 as intermediates, and level 7
        as the frontier, and skips the rest.
      </title>
      <text className="d-title" x={150} y={20}>
        Stepwise
      </text>
      <text className="d-title" x={310} y={20}>
        Budgeted
      </text>
      {levels.map((level) => (
        <g key={level}>
          <text
            className="d-text"
            x={10}
            y={34 + level * rowHeight + 16}
          >{`Level ${level}`}</text>
          {cell(90, level, true, "requested")}
          {cell(
            250,
            level,
            budgeted[level] !== undefined,
            budgeted[level] ?? "skipped",
          )}
        </g>
      ))}
    </svg>
  );
}

/** A REPLACE region as its children arrive, with mixed LOD. */
function MixedLod() {
  const id = useId();
  const size = 58;
  const panel = (
    x: number,
    title: string,
    arrived: boolean[],
    lines: string[],
  ) => (
    <g key={title}>
      <text className="d-title" x={x} y={18}>
        {title}
      </text>
      {arrived.map((here, i) => (
        <g key={i}>
          <rect
            className={here ? "d-box d-box-accent" : "d-box"}
            x={x + (i % 2) * (size + 3)}
            y={30 + Math.floor(i / 2) * (size + 3)}
            width={size}
            height={size}
            rx={3}
          />
          <text
            className="d-text"
            x={x + (i % 2) * (size + 3) + size / 2}
            y={30 + Math.floor(i / 2) * (size + 3) + size / 2 + 4}
            textAnchor="middle"
          >
            {here ? "child" : "parent"}
          </text>
        </g>
      ))}
      {lines.map((line, i) => (
        <text className="d-text" x={x} y={176 + i * 17} key={line}>
          {line}
        </text>
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 660 216" role="img" aria-labelledby={id}>
      <title id={id}>
        Three stages of a region refining. First the parent draws all of it.
        Then arrived children draw and the parent fills only the missing
        quadrants, clipped to them. Finally all children draw and the parent
        leaves.
      </title>
      {panel(
        10,
        "Requested",
        [false, false, false, false],
        ["The parent draws the", "whole region."],
      )}
      {panel(
        235,
        "Arriving",
        [true, false, true, true],
        ["Children draw. The parent", "fills only what's missing."],
      )}
      {panel(
        460,
        "Complete",
        [true, true, true, true],
        ["The children draw, and", "the parent leaves."],
      )}
    </svg>
  );
}

/** The cache's byte levels, and what each does. */
function CacheBar() {
  const id = useId();
  const zones = [
    {
      x: 10,
      w: 300,
      title: "Under the budget",
      lines: ["No eviction.", "Threshold relaxes ÷ 1.02", "per tick."],
    },
    {
      x: 318,
      w: 300,
      title: "Over the budget",
      lines: [
        "Evict coldest first, spread over",
        "ticks. Uploads continue, for",
        "content in use.",
      ],
    },
    {
      x: 626,
      w: 164,
      title: "Over the limit",
      lines: ["Uploads stop.", "Threshold × 1.02", "while content waits."],
    },
  ];
  return (
    <svg viewBox="0 0 800 150" role="img" aria-labelledby={id}>
      <title id={id}>
        Three zones of cache use. Under the budget nothing is evicted and the
        threshold relaxes. Over the budget the coldest tiles are evicted. Over
        the budget plus overflow, uploads stop and the threshold rises while
        content waits.
      </title>
      {zones.map((z, i) => (
        <g key={z.title}>
          <rect
            className={i === 2 ? "d-box d-box-accent" : "d-box"}
            x={z.x}
            y={12}
            width={z.w}
            height={108}
            rx={6}
          />
          <text className="d-title" x={z.x + 12} y={36}>
            {z.title}
          </text>
          {z.lines.map((line, k) => (
            <text className="d-text" x={z.x + 12} y={60 + k * 18} key={line}>
              {line}
            </text>
          ))}
        </g>
      ))}
      <text className="d-text" x={314} y={140} textAnchor="middle">
        budget, 512 MiB
      </text>
      <text className="d-text" x={622} y={140} textAnchor="middle">
        limit: budget + 512 MiB overflow
      </text>
    </svg>
  );
}

const POLICIES = [
  {
    topic: "What it's for",
    stepwise:
      "Reproducing 1.x's selection exactly, for fair comparisons and parity tests",
    budgeted: "Getting a good image sooner with fewer bytes. The default",
  },
  {
    topic: "How it refines",
    stepwise: "One level at a time, loading each on the way down",
    budgeted:
      "Requests the frontier directly, with a coarse base and an intermediate level past 2 skipped",
  },
  {
    topic: "What draws meanwhile",
    stepwise: "A parent until its children load",
    budgeted:
      "Arrived children, with the parent clipped to the holes where children partition it",
  },
  {
    topic: "Off-screen children of a REPLACE parent",
    stepwise: "Loaded and waited for, as in 1.x",
    budgeted:
      "Not waited for. Prefetched only ahead of steady motion, at the lowest priority",
  },
  {
    topic: "Horizon",
    stepwise: "Only the globe culls by it, as in 1.x",
    budgeted:
      "3D Tiles too: content past the ellipsoid's horizon is neither drawn nor fetched",
  },
];

const BANDS = [
  {
    band: "Base",
    when: "Nothing is loaded or requested above this tile",
    order: "Nearest first",
  },
  {
    band: "Intermediate",
    when: "More than skipLevels (2) levels below loaded content, and worth loading",
    order: "Nearest first",
  },
  {
    band: "Frontier",
    when: "The tile that meets the threshold, and worth loading",
    order:
      "Grouped by the region it will replace, nearest region first, so regions finish one at a time",
  },
  {
    band: "Prefetch",
    when: "Just outside the view, ahead of steady motion, at 2 × the threshold",
    order:
      "Nearest first, and only with no visible request in flight or waiting",
  },
  {
    band: "Caster",
    when: "Off screen, and may shadow what a view draws (the Shadows tab)",
    order: "After everything else, and only with room",
  },
];

const WINDOW = [
  {
    stage: "Seed",
    what: "16 until a response reports its protocol, then at most 6 on HTTP/1.1 and at least 24 on HTTP/2 or 3",
  },
  {
    stage: "Startup",
    what: "Double each second while throughput grows 25%. On the first stall, go back to the last good window",
  },
  {
    stage: "Step down",
    what: "Shrink while throughput stays within 5% of the best seen. Less queueing means the nearest tiles arrive first",
  },
  {
    stage: "Hold and probe",
    what: "Too small: step back up and hold 6 periods, then probe upward in case the link got faster",
  },
  {
    stage: "Limits",
    what: "2 to 128 requests, 6 on HTTP/1.1. It holds while 32 decoded contents wait for upload, because then the network isn't the bottleneck",
  },
];

const EXIT_CHECK = [
  {
    content: "Google Midtown",
    link: "fast",
    flip: "0.129 → 0.053",
    delta: "−0.077 ± 0.014",
    mb: "69.1 → 40.7",
    verdict: "better",
  },
  {
    content: "Google Midtown",
    link: "slow",
    flip: "0.127 → 0.096",
    delta: "−0.031 ± 0.005",
    mb: "69.1 → 40.7",
    verdict: "better",
  },
  {
    content: "Aerometrex SF",
    link: "fast",
    flip: "0.064 → 0.015",
    delta: "−0.049 ± 0.016",
    mb: "6.1 → 1.4",
    verdict: "better",
  },
  {
    content: "Aerometrex SF",
    link: "slow",
    flip: "0.093 → 0.023",
    delta: "−0.070 ± 0.003",
    mb: "6.1 → 1.4",
    verdict: "better",
  },
  {
    content: "OSM Philadelphia",
    link: "fast",
    flip: "0.096 → 0.006",
    delta: "−0.090 ± 0.037",
    mb: "11.3 → 11.3",
    verdict: "better",
  },
  {
    content: "OSM Philadelphia",
    link: "slow",
    flip: "0.136 → 0.124",
    delta: "−0.012 ± 0.011",
    mb: "11.3 → 11.3",
    verdict: "better",
  },
  {
    content: "BIM design model",
    link: "fast",
    flip: "0.015 → 0.000",
    delta: "−0.015 ± 0.002",
    mb: "62.6 → 37.4",
    verdict: "better",
  },
  {
    content: "BIM design model",
    link: "slow",
    flip: "0.019 → 0.011",
    delta: "−0.009 ± 0.002",
    mb: "62.6 → 37.4",
    verdict: "better",
  },
  {
    content: "AEC design + site",
    link: "fast",
    flip: "0.006 → 0.010",
    delta: "+0.004 ± 0.003",
    mb: "12.5 → 12.5",
    verdict: "fail",
  },
  {
    content: "AEC design + site",
    link: "slow",
    flip: "0.016 → 0.021",
    delta: "+0.005 ± 0.006",
    mb: "12.5 → 12.5",
    verdict: "pass",
  },
];

const OLD_NEW = [
  {
    topic: "Requests at once",
    old: "18 per tileset",
    next: "A window per origin, shared by its tilesets, that adapts to the link",
  },
  {
    topic: "Canceling",
    old: "Those not touched this tick",
    next: "Those untouched by any view for 30 ticks, which absorbs jitter",
  },
  {
    topic: "Loading in motion",
    old: "cullRequestsWhileMoving: 60 ticks' travel against the tile's diameter",
    next: "A tile's time on screen against the median load time of recent content",
  },
  {
    topic: "A tileset with no top-level geometricError",
    old: "Computes NaN and never skips the root. Stepwise copies this",
    next: "Budgeted refines from the root's error, and never hides the tileset",
  },
  {
    topic: "A visible parent whose children are all culled by children-bounds",
    old: "Selects the coarse parent: SSE 446 near the Brooklyn Bridge, 30 × the threshold. Stepwise copies this",
    next: "Budgeted treats a region with no visible children as empty",
  },
];

export function Selection() {
  const reference = referenceAdapter();
  const parity = reference?.selection;
  return (
    <Page
      title="Tile selection"
      status="sketch"
      lede={
        <>
          Each tick, for each view, the engine decides which tiles to draw and
          which to fetch. 3D Tiles and terrain go through the same machinery,
          and the default policy gets to a good image with fewer bytes than
          loading every level on the way down.
        </>
      }
    >
      <Section title="How a view picks tiles">
        <p>
          A tile's <strong>screen-space error</strong> is how many pixels its
          geometric error would span at its distance:
        </p>
        <CodeBlock
          language="text"
          code="sse = error × height ÷ (distance × 2 tan(fovy ÷ 2))"
        />
        <p>
          A tile refines while its error is above the threshold: 16 pixels for
          3D Tiles and 2 for terrain, as in 1.x. Dynamic screen-space error
          lowers it for distant tiles, by up to 24 pixels, the way fog would
          hide them, with a density of 2 × 10⁻⁴ from the camera's height.
          Terrain turns that off, and lowers it by up to 2 pixels only while fog
          is drawn.
        </p>
        <p>
          How refinement treats a parent comes from the tileset.{" "}
          <strong>REPLACE</strong> children stand in for their parent, so the
          parent leaves once its visible children can draw. <strong>ADD</strong>{" "}
          children draw in addition to it, so the parent stays.
        </p>
      </Section>

      <Section title="Two policies, and why">
        <p>
          <C>Stepwise</C> is 1.x's traversal, kept so that comparisons with 1.x
          are fair. Parity at 100% means any difference in a benchmark comes
          from the renderer, not from which tiles were drawn. <C>Budgeted</C> is
          the default, and shares 1.x's visibility, distance and screen-space
          error while replacing the rules for refining.
        </p>
        <Figure
          scroll
          label="Levels requested per policy"
          caption="One path to a tile at level 7, with nothing loaded yet. Stepwise fetches every level. Budgeted fetches a base, then an intermediate after every 2 levels skipped, then the frontier, so a region improves in steps."
        >
          <div className="figure-narrow">
            <LevelLadder />
          </div>
        </Figure>
        <DataTable
          label="The two policies"
          columns={[
            { head: "", cell: (r) => <strong>{r.topic}</strong> },
            { head: "Stepwise", cell: (r) => r.stepwise },
            { head: "Budgeted", cell: (r) => r.budgeted },
          ]}
          rows={POLICIES}
        />
        <Note title="What the name doesn't mean yet">
          <p>
            Despite its name, <C>Budgeted</C> doesn't yet choose tiles by
            benefit per byte. That budget-driven refinement, multi-view priority
            and view weights are planned work in the overall plan, sections 13.3
            and 13.4.
          </p>
        </Note>
      </Section>

      <Section title="Refining without holes">
        <p>
          A loaded ancestor stays on screen until the visible frontier under it
          has loaded. Where a tile's children partition its volume, as in
          photogrammetry and terrain, finer content draws as it arrives, and the
          parent fills only what's missing, clipped per fragment at its true
          depth.
        </p>
        <Figure
          scroll
          label="A region refining with mixed LOD"
          caption="Mixed LOD in a tile with four children. Where children overlap, as in design models, the region swaps at once instead, because their coarse tiles drop whole elements."
        >
          <MixedLod />
        </Figure>
        <ul>
          <li>
            <strong>Holding:</strong> when a newly visible neighbor is still
            loading, finer tiles already drawn stay, rather than the region
            collapsing to a near-root tile. This applies only while at most half
            of the region's visible children are missing.
          </li>
          <li>
            <strong>Zooming out:</strong> finer content still in the cache keeps
            drawing until the coarser tile arrives.
          </li>
          <li>
            <strong>Free detail is off:</strong> finer cached content isn't
            drawn once the coarser tile is here. Otherwise a still view would
            depend on where the camera had been.
          </li>
          <li>
            <strong>Placeholders are clipped only to exact holes:</strong> each
            cover says whether its holes are exact, meaning that nothing else
            draws in them. A placeholder never covers a tile that is drawn. The
            inexact cases are an ADD tile with drawn children, the frontier, and
            a REPLACE parent with an inexact child. The fallback for missing
            children uses only children that drew nothing; the others add their
            own exact holes. Where no exact hole can be made, there is no
            placeholder, and the hold or stand-in branch runs. Placeholders clip
            in the true frame, so mixed LOD works under any placement or
            curvilinear map, including tilesets that move vertices.
          </li>
        </ul>
      </Section>

      <Section title="Several views, one tree">
        <p>
          Selection is one pass per view over one shared tile tree, not a single
          merged selection. Per-view state lives on each tile. What's shared is
          what follows:
        </p>
        <ul>
          <li>
            <strong>Drawing:</strong> a tile that any view selected keeps a bit
            per view, and only a tile whose bits changed touches its draw
            records.
          </li>
          <li>
            <strong>Requests:</strong> a tile wanted by several views is
            requested once, at the most urgent view's priority and purpose.
          </li>
          <li>
            <strong>Cache:</strong> a tile touched by any view stays, so one
            view can't evict what another is drawing.
          </li>
          <li>
            <strong>Inputs:</strong> each view's selection inputs are made once
            per update, per anchor with tilesets, not per tileset.
          </li>
        </ul>
        <h3>Several items, one selection</h3>
        <p>
          A tileset can be drawn by several scene items, and they share one
          tree, one selection and one cache. An item adds draws, not tiles, so
          its tiles load once. A view draws an item's tile only where selection
          chose that tile for the view too, and a view no item shows selects and
          fetches nothing. With no items at all, a tileset selects nothing and
          sleeps, and its tiles stay cached until eviction.
        </p>
        <p>
          A tile's bounds grow by the farthest any item can move its vertices,
          so a tile drawn away from where it was written stays selected. A
          hidden item doesn't pad them, and each draw is still culled by its own
          item's bounds. While vertices can move, tiles swap whole, never as
          clipped placeholders. The first opaque item to draw a tile carries its
          ground and collision flags, so removing an item doesn't drop content
          from height queries. The Scene representation tab shows how these fit.
        </p>
        <h3>Under a transform graph</h3>
        <p>
          When a deformer sits over a tileset's content (vertical exaggeration,
          say), selection tests a tile where it draws, not where it was written.
          The <a href="#/transform-graph">Transform graph</a> tab says how
          routes are built. What selection does with one:
        </p>
        <ul>
          <li>
            <strong>Drawn bounds per tile:</strong> a tile's volume is carried
            through its anchor's route into a bounding sphere, with the
            Jacobian's largest stretch and the fit's error added to its
            geometric error. They are made once per route and kept on the tile.
          </li>
          <li>
            <strong>Ranged-scale buckets:</strong> a parameter that declares a
            range, such as an exaggeration slider, is bounded in 16 buckets over
            it (a parameter with no range, in 64 to the unit). A route that is
            affine in its one scale rebounds from what the first bounds kept,
            with no map evaluated, so dragging a slider across a bucket remakes
            no tile's bounds from scratch.
          </li>
          <li>
            <strong>Per-view route bounds:</strong> each view selects on its own
            route's drawn bounds. Views whose routes differ in structure, as
            behind a switch node, are drawn through twins of the draws, and a
            tile keeps drawn volumes for the route last asked and three others,
            so views asking in turn remake nothing. A view whose route crosses
            no curvilinear node selects on the plain bounds.
          </li>
          <li>
            <strong>Fits are stepped and budgeted:</strong> a route that can't
            be compiled is fitted per tile, a slice at a time within the frame's
            budget, so a ×10 exaggeration over thousands of tiles doesn't stall
            a tick. A re-root that leaves the route's shape unchanged refits
            nothing.
          </li>
        </ul>
        <Note title="Bounds from a Taylor model are not used yet">
          <p>
            The graph can bound a tile by interval evaluation of the compiled
            function (a first-order Taylor model). On geodetic routes it came
            out 5 to 28 times looser than sampling, because the unrolled
            foot-point iteration swells the intervals, so selection still
            samples. Bounding the converged map instead is task 9 of the
            transform graph plan.
          </p>
        </Note>
        <h3>When nothing has changed</h3>
        <p>
          A tileset's update runs only if a camera moved, something global
          changed, or the tileset is still <C>active</C>: a request is in
          flight, content waits for upload or a request slot, its tree or
          imagery is still building, it changed in the last few ticks, or the
          raised threshold is still relaxing. Otherwise selection is skipped
          entirely, and on-demand rendering lets the engine loop sleep.
        </p>
      </Section>

      <Section title="A tile, from request to resident">
        <p>
          Content has four states in code: <C>unloaded</C>, <C>loading</C>,{" "}
          <C>ready</C> and <C>failed</C>. Two more stages matter between them,
          though the state doesn't change: waiting for a slot, and waiting to
          upload.
        </p>
        <Figure caption="Solid arrows are the normal path. Dashed ones are the ways out: a request no view has touched for 30 ticks is canceled, and eviction frees what's cold. A format the engine can't decode is marked ready and draws nothing, so refinement behaves as in 1.x.">
          <TileLifecycle />
        </Figure>
      </Section>

      <Section title="What happens in a tick">
        <Flow
          label="A tileset's update, in order"
          steps={[
            {
              title: "Select",
              body: "One pass per view. Selected tiles get view bits, and every tile visited is marked touched.",
            },
            {
              title: "Cancel",
              body: "Abort a request no view has touched for 30 ticks.",
            },
            {
              title: "Request",
              body: "Sort by priority, then depth. Take slots from each origin's window until it's full.",
            },
            {
              title: "Upload",
              body: "Place decoded content, within the tileset's limit and the engine's budget.",
            },
            {
              title: "Imagery",
              body: "For terrain: slices for drawn and waiting tiles, nearest first, then tiles still loading.",
            },
            {
              title: "Evict",
              body: "Coldest first, never a tile touched in this tick.",
            },
          ]}
        />
      </Section>

      <Section title="Request order and limits">
        <p>Priority is a band plus a distance. Lower bands always go first:</p>
        <DataTable
          label="Request priority bands"
          columns={[
            { head: "Band", cell: (r) => <strong>{r.band}</strong> },
            { head: "When", cell: (r) => r.when },
            { head: "Order within it", cell: (r) => r.order },
          ]}
          rows={BANDS}
        />
        <p>
          <strong>Worth loading:</strong> while the camera moves, a tile is
          requested only if it will stay on screen longer than a typical load.
          The engine compares the field of view over how fast the tile crosses
          it against the median load time of recent content. What's drawn stays
          until the camera slows.
        </p>
        <p>
          A tile's content origin is worked out once and kept on the tile, as
          request order asks it of every wanted tile each tick. When an origin's
          window is full, a view's request yields a shadow caster in flight
          there, once per origin per pass, so a pass with nothing to yield
          doesn't rescan every tile in flight.
        </p>
        <h3>The request window</h3>
        <p>
          Each origin has one window, shared by every tileset on it. It looks
          for the smallest window that keeps the throughput, without latency
          measurements, so it works where servers hide them. A tileset created
          with <C>maximumRequests</C> pins it instead, for parity runs.
        </p>
        <DataTable
          label="How the request window adapts"
          columns={[
            { head: "Stage", cell: (r) => <strong>{r.stage}</strong> },
            { head: "What it does", cell: (r) => r.what },
          ]}
          rows={WINDOW}
        />
        <h3>Upload budgets</h3>
        <p>
          Uploads share the GPU queue with rendering. All tilesets share a
          budget in bytes per 60 Hz tick: it starts at 2 MiB, moves between 512
          KiB and 32 MiB, grows while ticks arrive on time and it's used up, and
          halves when a tick arrives late. At least one upload always goes, so
          loading never stops, and the first tileset rotates so none starves.
          Each tileset also uploads at most 8 contents a tick, and all of them
          share 4 ms a tick for building external tilesets' trees.
        </p>
      </Section>

      <Section title="The cache">
        <p>
          Each tileset has its own byte budget, 512 MiB by default as in 1.x,
          plus 512 MiB of overflow for content in use. A tile's bytes count its
          GPU content, about 800 bytes per draw for its table rows, and about 2
          KB for its objects. Without those overheads, the ellipsoid's small
          tiles filled the transform table before reaching the budget.
        </p>
        <Figure
          scroll
          label="Cache levels"
          caption="What each level of cache use does. The threshold is the screen-space error above which a tile refines: raising it asks for coarser content, so the cache can recover under pressure."
        >
          <CacheBar />
        </Figure>
        <ul>
          <li>
            <strong>Eviction order:</strong> least recently touched first, and
            in load order within a tick. The order is kept as tiles are touched,
            so eviction costs what it evicts rather than sorting every loaded
            tile. It never takes a tile touched in this tick.
          </li>
          <li>
            <strong>Spread over ticks:</strong> after a camera jump everything
            shown before becomes evictable at once. So each tick evicts up to
            twice the upload budget, or whatever is over the limit if that's
            more.
          </li>
          <li>
            <strong>World pools:</strong> a world's tables can fill before bytes
            do. At 90% of any pool's capacity, the tileset evicts as if over
            budget, up to 8 tiles a tick. An upload that fails on capacity goes
            back to the front of the queue, and if nothing could be freed it
            retries after 30 ticks. The threshold rises only when bytes are over
            budget too, so a pool that fills under the byte budget doesn't yet
            ask for coarser content.
          </li>
        </ul>
      </Section>

      <Section title="Terrain and imagery">
        <p>
          Terrain is an ordinary tile source: quantized-mesh in a geographic
          quadtree, with two tiles at level 0, using the same selection,
          requests, cache and view bits as 3D Tiles.{" "}
          <C>GlobeBudgetedSelection</C> differs in a few ways:
        </p>
        <ul>
          <li>
            A tile's children are created as it's visited, where availability is
            known, so terrain can skip levels rather than loading one per round
            trip. The bare ellipsoid has every tile, so it expands within 4 ms a
            pass.
          </li>
          <li>
            Loaded terrain draws once it has imagery. Until then the finer tiles
            or the ancestor already drawn stay, because a tile drawn untextured
            flashed gray.
          </li>
          <li>
            Free detail stays off for a further reason: an imagery provider's
            levels can be different captures, so a still view would change with
            where the camera had been.
          </li>
          <li>
            A terrain tile's refit, its deviation from its parent's surface (the
            error that selection propagates), is measured in the decode worker.
            The request carries the parent's heights, and the decoded tile comes
            back with the deviation. The page only propagates errors. Pairs the
            worker couldn't measure take at most 2 ms of each 16 ms on the page,
            and the rest queue. Before this, the refit ran on the main thread
            and took about 7 s of a 25 s load in the vertical exaggeration
            example at ×10.
          </li>
        </ul>
        <h3>Imagery</h3>
        <p>
          Each drawn terrain tile gets a slice of a texture array, composited on
          the GPU from the provider's tiles. Its level is the one whose texel
          spacing best matches the terrain tile's geometric error, as in 1.x,
          clamped to the provider's levels. Until its own slice is ready, a tile
          draws its nearest ancestor's, up to 8 levels up. Source tiles use the
          origin's request window, and a request no wanted tile needs is
          canceled. Slices are recycled least recently used.
        </p>
        <h3>Past the last data level</h3>
        <ul>
          <li>
            <strong>Terrain with no data below:</strong> under <C>Budgeted</C>,
            a loaded leaf the view wants finer gets four children, while the
            imagery has finer levels. Each child's mesh is the nearest data
            tile's, clipped to it in a worker, so it draws with imagery of its
            own level. Without this, imagery stopped where the terrain data did:
            Cesium World Terrain ends at level 13 over Amsterdam's polders, so
            Bing drew at about 12 m a texel at every range.
          </li>
          <li>
            <strong>Some quadrants without data:</strong> they upsample the same
            way, in place of a stand-in that took the nearest ancestor's
            imagery. Where imagery has no finer level, the nearest tile with
            data draws them, clipped to them.
          </li>
          <li>
            <strong>Skirts:</strong> an upsampled tile's edges on its data
            tile's boundary hang that tile's skirt, to hide its cracks. Its
            inner edges come from one clip of one mesh, so they hang only what
            their own level's error asks.
          </li>
          <li>
            <strong>What upsampling doesn't add:</strong> no height data, so its
            accuracy stays the data tile's. Rays read an upsampled tile at its
            data tile's level and error.
          </li>
          <li>
            <strong>
              Under <C>Stepwise</C>:
            </strong>{" "}
            a leaf gets four placeholder children with no content of their own,
            so its selection matches 1.x. They draw from the tile with data,
            whose bounds are less tight than 1.x's upsampled ones.
          </li>
          <li>
            <strong>Imagery:</strong> a level past the provider's maximum uses
            the maximum, so texels stretch. Where the provider has no tile, its
            nearest ancestor with imagery supplies it, as in 1.x.
          </li>
        </ul>
        <Note title="Known gaps">
          <ul>
            <li>
              Upsampling asks only whether the provider has finer levels at all,
              so it doesn't stop where the imagery runs out locally.
            </li>
            <li>
              Once a data tile has been evicted, each upsampled child fetches it
              again.
            </li>
            <li>
              Imagery slices sit outside the tileset's byte budget, which counts
              tile content only.
            </li>
          </ul>
        </Note>
        <Written
          from={
            <>
              <C>src/streaming/</C>, <C>src/globe/</C> and the transform graph
              plan's task 5 and per-view routes notes
            </>
          }
          on="2026-11-12"
        />
      </Section>

      <Section title="Level of detail under a curvilinear map">
        <p>
          A curvilinear map that stretches content changes what an error looks
          like on screen. A vertical exaggeration of 10 shows a tile's geometric
          error ten times taller. Selection measures a tile's error as drawn, so
          it multiplies the error by the stretch s of the curvilinear map under
          the tile. Four rules keep that honest and cheap. They came from
          watching the vertical exaggeration example at ×10 in the Zermatt view,
          where terrain draws fell from 8,487 during loading toward what the
          near field needs.
        </p>
        <ul>
          <li>
            <strong>The error exponent α.</strong> <C>View.lodExponent</C>, in
            [0, 1] with a default of 0.3 (<C>DEFAULT_LOD_EXPONENT</C>), makes
            the error s<sup>α</sup> times the geometric error instead of s times
            it. At 1 the error is as drawn, with the most tiles. At 0 it's
            measured as if affine, as 1.x does: far fewer tiles, and the error
            on screen is s times the threshold. A curvilinear map's own{" "}
            <C>CurvilinearMap.lodExponent</C> wins over the view's. The owner
            chose 0.3 on 2026-11-13 from a second sweep (0 to 1, at ×1, ×4 and
            ×10, in the valley and Zermatt close views, after the culling fixes
            below). At ×4 and ×10, α 0.25 and 0.5 differed from the exact image
            (α 1) by less than the run-to-run noise, about 2% of pixels, with a
            quarter to a fifth of α 1's terrain tiles: 471 and 760 tiles against
            2,161 in the valley at ×4, and GPU time of 70 and 90 ms against 146
            on that Mac. α 0 was visibly coarser at ×4 (4.1% of pixels). Only
            static frames were compared; popping in motion was not measured. The
            sweep is <C>scripts/alphaSweep.mjs</C>, and the example has a slider
            and a <C>&amp;alpha=</C> switch.
          </li>
          <li>
            <strong>Exact drawn height ranges.</strong> A tile's bound under a
            height scale uses the scale's exact value, not the range of its
            bucket, and the volumes are made again for each value. With the
            range 9.44 to 10, a 13 m tile had a 619 m sphere and the camera
            counted as inside 979 tiles. The volumes reach the tips of the
            skirts, and a plain height scale has an exact slope.
          </li>
          <li>
            <strong>Upsampled tiles take no curvilinear map stretch.</strong>{" "}
            Past the data's last level a tile is its parent's surface, cut
            smaller. Refining it adds no geometry, so the stretched part of its
            error counts only where refining can add some. Elsewhere the error
            is unstretched, as imagery isn't stretched vertically.
          </li>
          <li>
            <strong>Distance to the drawn surface.</strong> Cull volumes include
            skirts, so a bound never misses geometry. Selection measures
            distance to the surface alone, without them. An upsampled tile hangs
            its data tile's skirt depth only on edges at that tile's boundary.
          </li>
        </ul>
        <p>
          The globe's stepwise selection honors the exponent too, and the debug
          view <C>"stretch"</C> shows the factor each tile used. Request
          priority follows the error that is showing, so the largest visible
          errors close first.
        </p>
        <Written
          from="the transform-graph plan, task 12 and its notes on what the ×10 views showed, and test/lodExponent.test.ts"
          on="2026-11-13"
        />
      </Section>

      <Section title="Culling what can't be seen">
        <p>
          Three mechanisms skip what is hidden, at three places: selection,
          requests and the draw. They share one idea, an occluder that answers
          only when it can prove a bound hidden.
        </p>
        <h3>Occluders</h3>
        <p>
          An <C>Occluder</C> answers <C>hidden(bound, view)</C>: true only when
          it proves it. A bound is hidden if any occluder in the view's list
          says so, and selection, the request scheduler and the draw cull all
          ask the same list. There are two kinds.
        </p>
        <ul>
          <li>
            <strong>Analytic occluders</strong> run on the CPU with no delay and
            can cull what was never loaded. The first is the body occluder,
            which does horizon culling under a curvilinear map. The ellipsoid
            test it replaces was off under any curvilinear map. The body
            occluder instead fits a shell inside the terrain that is drawn, so
            it holds under any curvilinear map, with no flag for one. It is
            sound only for a closed, opaque drawn surface with the camera
            outside it; with a translucent globe or clip holes it is off.
          </li>
          <li>
            <strong>The depth pyramid</strong> is the image occluder: the view's
            own drawn depth, a tick late. It proves hidden on the GPU. Its CPU
            verdicts come from another camera, so selection uses them only where
            nothing drawn is removed.
          </li>
        </ul>
        <h3>The horizon occluder as a job</h3>
        <p>
          The shell is bounded by the drawn terrain: a min-hierarchy of tile
          bounds, exact once heights are resident. A tile without resident
          heights is bounded by the nearest loaded ancestor's exact minimum,
          less its geometric error stretched by the curvilinear map, so there is
          no sampled estimate. Skirts are left out of the occluder's bounds. The
          radius is the largest sound one, found by bisection over the cap
          facing the camera, so no global bound is needed. Only that cap has to
          enclose it.
        </p>
        <p>
          The work is a resumable, budgeted job. Under a curvilinear map with
          occluders it needs base levels 0 to 2 resident, and only then, for
          curvilinear views. It yields, taking about 1 ms of a tick. A first
          version loaded levels 0 to 4 for every globe (682 tiles) and walked
          cold for 236 ms.
        </p>
        <h3>Two-phase culling of draws</h3>
        <p>
          The opaque pass was geometry-bound at ×10, with thousands of terrain
          tiles behind valley walls. Each view now skips the draws its own depth
          hides. The first phase tests what the frustum keeps against the
          pyramid of the view's last tick, seen from that tick's camera. What it
          hides goes to a retest list. The first phase's depth builds this
          tick's pyramid, and the second phase draws the listed items that
          pyramid shows. A wrong first verdict costs time and never the image.
        </p>
        <ul>
          <li>
            <strong>Which draws:</strong> opaque triangles in the engine's own
            pipelines. Never blended material, lines, points, patches,
            billboards or custom shaders. Not in views with clips, with direct
            submission, or in an engine with no depth prepass.
          </li>
          <li>
            <strong>Where it runs:</strong> the first phase rides inside the
            depth prepass when ambient occlusion is on, and the pyramid is built
            once a tick, from one sample a pixel. That cut culling's GPU cost at
            ×1 from +0.45 ms to +0.02 ms, in a 1718 × 1406 view on an Apple
            laptop, with no draws to cull. Without the prepass, the first phase
            has a pass of its own.
          </li>
          <li>
            <strong>
              Measured, in the Zermatt view at ×10 with coarsening off:
            </strong>{" "}
            6,856 of 7,205 draw items and 82% of 4.83 million triangles are left
            out, and the opaque pass takes 57 to 67 ms against 145 to 220 ms.
            Frozen, the image is the same with culling on or off, bit for bit.
          </li>
          <li>
            <strong>Switch:</strong> <C>View.occlusionCulling</C>, beside{" "}
            <C>View.occlusionFeedback</C>, on by default. An <C>"auto"</C> mode
            was weighed and deferred.
          </li>
        </ul>
        <h3>Coarsening tiles hidden long</h3>
        <p>
          Hidden tiles used to keep the refinement they reached while loading.
          Now a refined tile hidden for 2 s, over two results in a row, may
          coarsen to itself. What hides it is drawn by tiles that are seen, so
          its coarser content changes no depth in front of it, and the feedback
          cannot flip as an earlier version did. It refines again with the first
          result that sees it, and may not coarsen that way for 10 s. An idle
          view wakes when the earliest such tile may coarsen. The cost is that
          rounding a ridge shows the coarse tile until its children load, which
          are usually still resident. In the same view, the drawn set falls from
          7,194 tiles to about 410, and triangles from 4.83 million to 1.01
          million.
        </p>
        <p className="provenance">
          Still open: the cost of tile queries beyond the cap of 8,192 per tick,
          which may explain verdicts flipping in a still view.
        </p>
        <Written
          from="the transform-graph plan, fix 7 and its notes on occlusion unified, and the commits that built them"
          on="2026-11-13"
        />
      </Section>

      <Section title="Where it differs from 1.x">
        <DataTable
          label="Selection in 1.x and 2.0"
          columns={[
            { head: "", cell: (r) => <strong>{r.topic}</strong> },
            { head: "1.x", cell: (r) => r.old },
            { head: "2.0", cell: (r) => r.next },
          ]}
          rows={OLD_NEW}
        />
        <h3>Stepwise against 1.x: agreement on which tiles</h3>
        <p>
          This measures whether both engines select the same tiles once settled,
          as Jaccard similarity, with 100% meaning the same set. It's agreement
          with 1.x, including its bugs, not a measure of image quality.
        </p>
        {parity ? (
          <>
            <p>
              On {reference?.adapter}, last run {day(parity.lastDate)}:{" "}
              {count(parity.comparisons)} comparisons across{" "}
              {count(parity.tilesets)} tilesets, {count(parity.exact)} at 100%,
              with a worst of {(parity.worst * 100).toFixed(1)}%.
            </p>
            <Generated from={<C>bench/results</C>} />
          </>
        ) : null}
        <ul>
          <li>
            At plan revision r16: 100% on 36 view comparisons over 9 public
            tilesets, and on 3 CAD tilesets in 4 views each.
          </li>
          <li>
            OSM Buildings and Google Photorealistic 3D Tiles (22 to 164 tiles
            per view, 4 views at once): 100%, at revisions r17 and r18.
          </li>
          <li>
            Terrain: 100% on 6 cameras, with and without fog, with no imagery,
            at revision r24.
          </li>
        </ul>
        <h3>Budgeted against Stepwise: image quality and bytes</h3>
        <p>
          This is the L1′ exit check, at revision r38. FLIP is image error
          against a target, <C>Stepwise</C> settled at the default screen-space
          error, sampled every 100 ms through the move. Lower is closer to the
          target, so this measures accuracy against a reference, not agreement
          between policies. MB is bytes downloaded, with three repetitions per
          cell. A cell passes where <C>Budgeted</C>'s FLIP is no worse by more
          than the margin, at no more bytes, and is better where it's lower by
          more than the margin. The margin is 0.002 plus twice the standard
          error, which allows for how repeatable the measurement is: a throttled
          jump into OSM ranged from 0.29 to 0.44 for either policy.
        </p>
        <DataTable
          label="L1′ exit check"
          columns={[
            { head: "Content", cell: (r) => r.content },
            { head: "Link", cell: (r) => r.link },
            {
              head: "FLIP, Stepwise → Budgeted",
              numeric: true,
              cell: (r) => r.flip,
            },
            {
              head: "Difference ± margin",
              numeric: true,
              cell: (r) => r.delta,
            },
            {
              head: "MB, Stepwise → Budgeted",
              numeric: true,
              cell: (r) => r.mb,
            },
            { head: "Verdict", cell: (r) => r.verdict },
          ]}
          rows={EXIT_CHECK}
        />
        <p>
          Nine of ten cells pass, and eight are better. The AEC scene is the one
          gap, about +0.004 to +0.005 on either link, and which link fails
          changes between runs: it sits at the margin. Settling was as fast or
          faster everywhere: Google took 2.3 s against 4.1 s on the fast link,
          and 23.0 s against 35.8 s throttled.
        </p>
        <h3>Other measurements</h3>
        <ul>
          <li>
            <strong>
              2.0 against CesiumJS 1.x, across the benchmark catalog, r38:
            </strong>{" "}
            time to settle 26% lower and main-thread CPU 73% lower, with no
            guardrail metric broken. These compare whole engines, not selection
            alone.
          </li>
          <li>
            <strong>Quality in motion, NYC, lower is better, r38:</strong> 0.008
            against 1.x's 0.030, for 25.9 MB against 24.7 MB of flight bytes.
          </li>
          <li>
            <strong>
              Quality in motion, Google, with free detail removed, r38:
            </strong>{" "}
            0.046 down to 0.020, against 1.x's 0.026.
          </li>
          <li>
            <strong>
              Request window, jump into Midtown, time-averaged FLIP, r23:
            </strong>{" "}
            on a 20 Mbit/s link, 0.225 with 18 requests and 0.251 adaptive,
            against 0.274 for 1.x. On a fast link, 0.189 adaptive against 0.278.
            The adaptive window is best on fast links and second on slow ones,
            and tuning it there is planned.
          </li>
        </ul>
        <p className="provenance">
          These predate plan 5a, and some of them predate later changes to
          selection. The RTX baseline will restate them.
        </p>
        <Written
          from="the overall plan, sections 8, 12, 13 and M2"
          on="2026-11-08"
        />
      </Section>

      <Section title="Seeing the selection: debug views">
        <p>
          <C>View.debug</C> turns the opaque pass into a diagnostic: flat colors
          in place of lighting, with depth kept, for terrain and 3D Tiles alike.
          Off costs one uniform read a fragment.
        </p>
        <ul>
          <li>
            <C>"level"</C>: each tile by its level in its tree, in eight
            color-blind-safe colors that repeat.
          </li>
          <li>
            <C>"tiles"</C>: each tile its own color, with terrain tiles' edges
            darkened.
          </li>
          <li>
            <C>"error"</C>: each tile's screen-space error as a multiple of the
            threshold. Over 1 is detail the view still wants.
          </li>
          <li>
            <C>"state"</C>: drawn, mixed-level placeholder, stand-in for finer
            tiles still loading, or held back by occlusion.
          </li>
          <li>
            <C>"stretch"</C>: how much the curvilinear map under a tile
            stretches its error, the factor selection used.
          </li>
          <li>
            <C>"skirts"</C> (<C>&amp;debug=skirts</C>): terrain skirt fragments
            in magenta, with everything else shaded as normal. It works under
            any curvilinear map.
          </li>
        </ul>
        <p>
          <C>View.debugLegend()</C> returns what the colors mean, for an
          application to draw. The numbers are the first debug view's selection.
          Translucent content, points and lines keep their colors. There is no
          wireframe mode: only b-reps have one.
        </p>
        <Written
          from="the transform-graph plan, task 12, fix 8"
          on="2026-11-13"
        />
      </Section>

      <Section title="Transitions: terrain geomorphing and imagery cross-fade">
        <p>
          A terrain tile replacing a coarser one used to jump to its own
          surface. Under a vertical exaggeration the jump is magnified, and
          while loading coarse stand-ins sit beside finer neighbors. Each
          terrain tile now carries, per vertex, the surface height of the
          nearest ancestor that was drawn, at the same (u, v): the ancestor
          mesh's height interpolated on its triangles, the lookup the error
          refit already makes. A level-skipping selection still eases. From the
          tile's first drawn tick, the vertex stage moves each vertex from that
          height to its own, with a smoothstep, before any curvilinear map: a
          height profile lifts the height it is at now.
        </p>
        <ul>
          <li>
            <C>View.lodTransitions</C> is <C>"morph"</C> (the default) or{" "}
            <C>"pop"</C>. Pop is the old behavior: no per-vertex data is read,
            and a draw costs one record word compared with zero.
          </li>
          <li>
            <strong>Duration:</strong> at least 8 frames, and not under 0.3 s or
            over 1 s. The engine works it out once a render from the smoothed
            interval between renders, and writes it into the view block, so both
            stages read it in place of a constant. A transition running when it
            changes may jump slightly. Tilesets and the globe's imagery end
            theirs by the same number.
          </li>
          <li>
            <strong>Imagery cross-fade:</strong> when a drawn tile's imagery
            changes from one picture to another, in morph mode, the fragment
            stage blends the old and the new over that same duration. The draw
            record keeps its 176 bytes. A slice a fade leaves isn't recycled
            until the fade ends.
          </li>
          <li>
            <strong>The first load pops, by design.</strong> A tile morphs only
            if a coarser ancestor was drawn before it. The first terrain does
            not rise from the bare ellipsoid: a trial of that read as the camera
            moving, and the owner preferred the pop.
          </li>
          <li>
            Coarsening pops: the children leave at once. Morphing out would keep
            them alive after the selection drops them, and isn't built (the plan
            below covers it). Normals keep the mesh's own. 3D Tiles content pops
            too.
          </li>
          <li>
            The loop keeps ticking while a tile morphs or fades (the wake reason{" "}
            <C>"morph"</C>) and sleeps once all are done.
          </li>
        </ul>
        <Written
          from="the transform-graph plan, task 12, fix 8, and test/geomorph.test.ts"
          on="2026-11-13"
        />
      </Section>

      <Section title="Open at ×10: two findings">
        <ul>
          <li>
            <strong>
              The streaks on cliffs are a shadow artifact, most likely shadow
              acne.
            </strong>{" "}
            At vertical exaggeration ×10 in the Zermatt close view, dark
            straight bands cross the cliffs. They are not skirts: with{" "}
            <C>"skirts"</C> on, the streaked cliffs show no magenta. They aren't
            stretched imagery, whose streaks would be soft and run down the fall
            line. With shadows off, or the sun off, the bands vanish; ambient
            occlusion off changes nothing; at ×4 they are fainter, and at ×1
            absent. They form a regular grid seen at an angle, which real ridge
            shadows wouldn't: the shadow map's texel grid projected onto a wall
            the sun grazes, where the bias is too small. The suspects are the
            receiver's normal offset, which may not use the drawn (curvilinear)
            normal, and a slope-scaled bias that doesn't see the wall's drawn
            slope. The check is a sweep of both at ×10 with a tint by cascade.
          </li>
          <li>
            <strong>
              At α = 1, selection runs away under a steep curvilinear map.
            </strong>{" "}
            Valley ×10 reached 9,546 terrain tiles and 23,512 imagery requests,
            still rising after 120 s. Valley ×4 made 14,559 imagery requests
            against 2,117 at α 0.75. An exact as-drawn error should converge, so
            something about the stretched error or the imagery choice under it
            diverges. The cause isn't found. The new default of 0.3 stays clear
            of it, but the cause is still to be tracked down.
          </li>
        </ul>
        <Written
          from="the transform-graph plan, task 12 and its notes on the ×10 views"
          on="2026-11-13"
        />
      </Section>

      <Section title="Planned: transitions both ways (CS-14)">
        <p>
          Reviewed by the owner, not built. The goal is that nothing pops when a
          level of detail changes, except the very first load. Today terrain
          morphs in and imagery cross-fades when they refine, and coarsening and
          3D Tiles content pop. The plan's decisions:
        </p>
        <ul>
          <li>
            <strong>Terrain morphs back when it coarsens.</strong> Deselected
            children stay drawn for one transition and morph to the replacing
            tile's surface, today's morph reversed, while their imagery fades to
            its texels. Then they swap unseen. It is neither a dither nor a
            distance-driven morph, which stays an option if the measurements
            ask.
          </li>
          <li>
            <strong>3D Tiles content dithers both ways.</strong> Replaced
            content fades out and its replacement in, with mixed-level boxes.
            Added children fade in. A tileset's first content pops, like
            terrain's first load. The fades dither in every pass (opaque,
            translucent and shadow) with complementary masks. Picks and height
            queries see only the destination.
          </li>
          <li>
            <strong>One setting.</strong> <C>View.lodTransitions</C> becomes{" "}
            <C>"smooth" | "pop"</C>, and a tileset or globe layer may set its
            own. A view's <C>"pop"</C> wins everywhere, for A/B and parity runs.
            One duration serves every transition.
          </li>
          <li>
            <strong>A signed word and one clock.</strong> The record's morph
            word becomes a signed start time: positive coming in, negative
            leaving. A reversal restarts the tile at the progress it showed, so
            it doesn't jump. The clock's epoch is rebased on the CPU so that
            long sessions keep small shader times.
          </li>
          <li>
            <strong>Bounded memory.</strong> Leaving tiles are held at most one
            transition. If the cache is over budget by more than what's leaving,
            new coarsening transitions pop, and the stats say so. Multi-level
            coarsening goes one level at a time, and is skipped for tiles off
            screen or hidden, or when the swap's error is under half a pixel.
          </li>
        </ul>
        <Written
          from="the LOD transitions plan, project CS-14 (CS-121 to CS-133)"
          on="2026-11-13"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>How selection behaves with several tilesets on one origin.</li>
          <li>Height queries, and how their sample requests join the bands.</li>
          <li>Refreshed figures from the RTX baseline, per scene.</li>
        </ul>
      </Section>
    </Page>
  );
}
