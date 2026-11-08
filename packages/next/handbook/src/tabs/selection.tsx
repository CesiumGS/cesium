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
    topic: "Cancelling",
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
        <Figure caption="Solid arrows are the normal path. Dashed ones are the ways out: a request no view has touched for 30 ticks is cancelled, and eviction frees what's cold. A format the engine can't decode is marked ready and draws nothing, so refinement behaves as in 1.x.">
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
        </ul>
        <h3>Imagery</h3>
        <p>
          Each drawn terrain tile gets a slice of a texture array, composited on
          the GPU from the provider's tiles. Its level is the one whose texel
          spacing best matches the terrain tile's geometric error, as in 1.x,
          clamped to the provider's levels. Until its own slice is ready, a tile
          draws its nearest ancestor's, up to 8 levels up. Source tiles use the
          origin's request window, and a request no wanted tile needs is
          cancelled. Slices are recycled least recently used.
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
              <C>src/streaming/</C> and <C>src/globe/</C>
            </>
          }
          on="2026-11-08"
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

      <Section title="In progress, not in this build">
        <ul>
          <li>
            <strong>Presentations of a tileset:</strong> one selection with
            several draws. It's planned, and not started.
          </li>
        </ul>
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
