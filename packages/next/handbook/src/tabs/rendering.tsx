import { Fragment } from "react";
import { data } from "../data.ts";
import { Board, Tag, useLayers, type BoardStep } from "../diagram.tsx";
import { TranslucentTerrainFlow } from "../flows.tsx";
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
import {
  BUFFERS,
  COMING,
  DECISIONS,
  EXPRESSION_FORMATS,
  IMPORTED_FORMATS,
  PASSES,
  PASS_GROUPS,
  PLANNED_PASS,
  SEAMS,
} from "../pipeline.ts";

const { passes, textures, figures } = data.pipeline;

const seamsOn = (pass: string) => SEAMS.filter((s) => s.passes.includes(pass));
const decisionsOn = (pass: string) =>
  DECISIONS.filter((d) => d.passes.includes(pass));

const seamTag = (id: string) => (
  <Tag to={`seam-${id}`} kind="seam" key={id}>
    {id}
  </Tag>
);
const decisionTag = (id: string) => (
  <Tag to={`decision-${id}`} kind="decision" key={id}>
    {id}
  </Tag>
);

const formatOf = (name: string) => {
  const texture = textures.find((t) => t.name === name);
  return (
    texture?.format ??
    IMPORTED_FORMATS[name] ??
    EXPRESSION_FORMATS[name] ??
    "not stated"
  );
};

const TICK: BoardStep[] = [
  {
    id: "due",
    lane: 0,
    title: "What's due",
    body: (
      <>
        <C>Engine.tick</C> evaluates view links and asks which views changed. If
        nothing can show a change, nothing renders and the loop can sleep.
      </>
    ),
    tags: decisionTag("D5"),
  },
  {
    id: "select",
    lane: 0,
    title: "Select tiles",
    body: (
      <>
        <C>Tileset3D.update</C>, one pass per view over a shared tree, when a
        camera moved or content streams. The Tile selection tab covers it.
      </>
    ),
    tags: seamTag("S8"),
  },
  {
    id: "decode",
    lane: 1,
    row: 2,
    title: "Fetch and decode",
    body: (
      <>
        <C>WorkerPool</C>: glTF, Draco, Basis and quantized mesh, within each
        origin's request window.
      </>
    ),
  },
  {
    id: "upload",
    lane: 0,
    row: 3,
    title: "Upload",
    body: (
      <>
        <C>uploadModel</C> and <C>placeModel</C> place content in the world's
        tables and arenas, within the engine's upload budget.
      </>
    ),
    flow: "Tile placed: the acceleration-structure hook is told.",
    tags: [seamTag("S9"), seamTag("S3")],
  },
  {
    id: "prepare",
    lane: 0,
    row: 4,
    title: "Prepare the world",
    body: (
      <>
        <C>prepareFrame</C> composes changed transforms in float64, writes
        materials, and records bundles only if batches changed.
      </>
    ),
    tags: [seamTag("S1"), seamTag("S2"), decisionTag("D2"), decisionTag("D6")],
  },
  {
    id: "write",
    lane: 0,
    row: 5,
    title: "Write each view",
    body: (
      <>
        <C>writeView</C> fills its block in a staging buffer, with an eye per
        anchor. The Precision and accuracy tab follows those values.
      </>
    ),
  },
  {
    id: "encode",
    lane: 0,
    row: 6,
    title: "Encode and submit",
    body: (
      <>
        One command encoder. <C>frame.graph.execute</C> runs per view,
        allocating nothing. Views sharing a canvas are composited after.
      </>
    ),
  },
  {
    id: "graph",
    lane: 2,
    row: 6,
    accent: true,
    title: "The frame graph, per view",
    body: (
      <>
        {passes.length} passes, charted below. Each view's cull fills that
        view's items and draw arguments.
      </>
    ),
    tags: [seamTag("S1"), seamTag("S2"), seamTag("S5"), seamTag("S7")],
  },
  {
    id: "readback",
    lane: 0,
    row: 7,
    title: "Answer later",
    body: "Picks, depth ranges and meter readings map a tick or more later, and resolve then. Nothing waits for them.",
    tags: decisionTag("D9"),
  },
  {
    id: "queries",
    lane: 0,
    row: 8,
    title: "Ray queries",
    body: (
      <>
        <C>engine.queries</C> answer outside the frame graph, from CPU
        structures for drawn terrain and a GPU cast for draws, always
        asynchronously.
      </>
    ),
    tags: seamTag("S6"),
  },
  {
    id: "cast",
    lane: 2,
    row: 8,
    title: "GPU ray cast",
    body: (
      <>
        <C>World.castRays</C>, a brute-force compute pass over the draws. It's
        one backend behind the query interface.
      </>
    ),
  },
];

const TICK_EDGES = [
  { from: "due", to: "select" },
  { from: "select", to: "decode", label: "requests" },
  { from: "decode", to: "upload", label: "decoded content" },
  { from: "upload", to: "prepare" },
  { from: "prepare", to: "write" },
  { from: "write", to: "encode" },
  { from: "encode", to: "graph", label: "command buffer" },
  { from: "graph", to: "readback", label: "mapped buffers", vertical: true },
  { from: "queries", to: "cast" },
];

const HAND_COLUMNS = new Set<string>(BUFFERS);

/**
 * The frame graph: passes down, in the order they run, and what each reads
 * and writes across. Texture columns are generated from the source; buffer
 * columns are by hand, as the graph doesn't track buffers.
 */
function FrameGraphChart() {
  const { shown, controls } = useLayers(["Seams", "Decisions", "Buffers"]);
  const order = passes.map((p) => p.name);
  const columns = [
    ...textures.map((t) => t.name),
    ...(shown("Buffers") ? BUFFERS : []),
  ];
  const uses = (pass: string, column: string) => {
    const generated = passes.find((p) => p.name === pass);
    const note = PASSES[pass];
    const read = HAND_COLUMNS.has(column)
      ? note?.reads?.includes(column)
      : generated?.reads.includes(column);
    const write = HAND_COLUMNS.has(column)
      ? note?.writes?.includes(column)
      : generated?.writes.includes(column);
    return { read: read === true, write: write === true };
  };
  // Between a column's first and last use, a line shows it's alive.
  const lifetime = new Map(
    columns.map((column) => {
      const used = order
        .map((pass, i) => {
          const u = uses(pass, column);
          return u.read || u.write ? i : -1;
        })
        .filter((i) => i >= 0);
      return [column, [Math.min(...used), Math.max(...used)] as const];
    }),
  );
  const startsBuffers = (i: number) =>
    i > 0 &&
    HAND_COLUMNS.has(columns[i]!) &&
    !HAND_COLUMNS.has(columns[i - 1]!);
  const groups = [
    ...PASS_GROUPS,
    ...(order.some((p) => !PASSES[p]) ? ["Not yet described"] : []),
  ];
  return (
    <>
      {controls}
      <div
        className="graph-wrap"
        tabIndex={0}
        role="group"
        aria-label="The frame graph, passes against what they read and write"
      >
        <table className="graph">
          <thead>
            <tr>
              <th className="graph-pass" scope="col">
                Pass, in order
              </th>
              {columns.map((column, i) => (
                <th
                  scope="col"
                  className={startsBuffers(i) ? "graph-split" : undefined}
                  key={column}
                >
                  <div
                    className={
                      HAND_COLUMNS.has(column)
                        ? "graph-col graph-col-hand"
                        : "graph-col"
                    }
                  >
                    {column}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group}>
                <tr>
                  <th
                    className="graph-group"
                    colSpan={columns.length + 1}
                    scope="colgroup"
                  >
                    {group}
                  </th>
                </tr>
                {passes
                  .filter(
                    (p) =>
                      (PASSES[p.name]?.group ?? "Not yet described") === group,
                  )
                  .map((p) => {
                    const row = order.indexOf(p.name);
                    const seams = shown("Seams") ? seamsOn(p.name) : [];
                    const decisions = shown("Decisions")
                      ? decisionsOn(p.name)
                      : [];
                    return (
                      <Fragment key={p.name}>
                        <tr>
                          <th className="graph-pass" scope="row">
                            <span className="graph-pass-name">{p.name}</span>
                            <span className="graph-pass-kind">
                              {PASSES[p.name]?.kind}
                            </span>
                            {seams.length + decisions.length > 0 ? (
                              <div className="tags">
                                {seams.map((s) => seamTag(s.id))}
                                {decisions.map((d) => decisionTag(d.id))}
                              </div>
                            ) : null}
                          </th>
                          {columns.map((column, i) => {
                            const { read, write } = uses(p.name, column);
                            const [first, last] = lifetime.get(column)!;
                            const live = row >= first && row <= last;
                            return (
                              <td
                                className={[
                                  "graph-cell",
                                  live ? "live" : "",
                                  startsBuffers(i) ? "graph-split" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                key={column}
                              >
                                {read || write ? (
                                  <span
                                    className={
                                      write ? "graph-mark writes" : "graph-mark"
                                    }
                                    title={`${p.name} ${
                                      read && write
                                        ? "reads and writes"
                                        : write
                                          ? "writes"
                                          : "reads"
                                    } ${column}`}
                                  >
                                    {read && write ? "RW" : write ? "W" : "R"}
                                  </span>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                        {p.name === PLANNED_PASS.after ? (
                          <tr className="graph-planned">
                            <th className="graph-pass" scope="row">
                              <span className="graph-pass-name">
                                {PLANNED_PASS.name}
                              </span>
                              <span className="graph-pass-kind">
                                {PLANNED_PASS.kind}
                              </span>
                              {shown("Seams") ? (
                                <div className="tags">
                                  {PLANNED_PASS.seams.map(seamTag)}
                                </div>
                              ) : null}
                            </th>
                            {columns.map((column, i) => {
                              const write =
                                PLANNED_PASS.writes.includes(column);
                              const read = PLANNED_PASS.reads.includes(column);
                              return (
                                <td
                                  className={
                                    startsBuffers(i)
                                      ? "graph-cell graph-split"
                                      : "graph-cell"
                                  }
                                  key={column}
                                >
                                  {read || write ? (
                                    <span
                                      className="graph-mark"
                                      title={`Not built: it would ${write ? "write" : "read"} ${column}`}
                                    >
                                      {write ? "W" : "R"}
                                    </span>
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const list = (names: readonly string[] | undefined) =>
  names && names.length > 0 ? names.join(", ") : "none";

export function Rendering() {
  const f = figures;
  const n = (v: number) => v.toLocaleString("en-US");
  const FIGURES = [
    {
      what: "Draw record",
      value: `${f.drawRecordBytes} bytes`,
      kind: "Layout, generated. 148 bytes used, padded to WGSL's 16-byte alignment",
    },
    {
      what: "Transform, with its split origin",
      value: `${f.transformBytes} bytes`,
      kind: "Layout, generated",
    },
    {
      what: "Instance",
      value: `${f.instanceBytes} bytes`,
      kind: "Layout, generated",
    },
    {
      what: "Draw item",
      value: `${f.drawItemBytes} bytes`,
      kind: "Layout, generated",
    },
    {
      what: "Material",
      value: `${f.materialBytes} bytes`,
      kind: "Layout, generated",
    },
    {
      what: "Indirect arguments",
      value: `${f.indirectBytes} bytes`,
      kind: "Layout, generated",
    },
    {
      what: "View block",
      value: `${n(f.viewBytes)} bytes, with ${f.maxAnchors} anchor eyes at ${f.anchorEyeBytes} bytes each`,
      kind: "Layout, generated",
    },
    { what: "MSAA", value: `${f.sampleCount} ×`, kind: "Setting, generated" },
    {
      what: "Shadow map",
      value: `${f.shadowCascades} cascades of ${n(f.shadowSize)} × ${n(f.shadowSize)}, depth32float`,
      kind: "Setting, generated",
    },
    {
      what: "Light froxels",
      value: f.clusters.join(" × "),
      kind: "Setting, generated",
    },
    {
      what: "Upload budget, all tilesets",
      value: "Starts at 2 MiB per 60 Hz tick, moves between 512 KiB and 32 MiB",
      kind: "Setting, adaptive",
    },
    {
      what: "Building external tilesets' trees",
      value: "4 ms per 60 Hz tick",
      kind: "Setting",
    },
    {
      what: "CPU per tick with bundles",
      value: "0.6 to 0.9 ms, flat from 1,000 to 20,000 draws",
      kind: "Timing at M0",
    },
    {
      what: "Indirect against direct draws, 20,000 draws",
      value:
        "GPU in the pass 8.67 ms against 4.37 ms, on an Intel iGPU. About 30 ns per indirect call on NVIDIA",
      kind: "Timing at M0",
    },
    {
      what: "Opaque pass with depth first",
      value:
        "6.9 ms against 10.0 with 576 spots; 4.3 against 6.4 without lights",
      kind: "Timing at r44, lower Manhattan by night",
    },
    {
      what: "Ambient occlusion",
      value:
        "Prepass about 0.1 ms, trace about 0.2 ms, blur about 0.35 ms, at 2.6 megapixels",
      kind: "Timing, a synthetic city",
    },
  ];
  return (
    <Page
      title="Rendering"
      status="sketch"
      lede={
        <>
          GPU-driven from the start. Draws live in tables mirrored to GPU
          storage buffers, compute prepares and culls them per view, and the
          main thread mostly doesn't touch them in steady state. One device
          serves every view. This tab shows the big pieces in order, what flows
          between them, where each seam is, and why each choice was made.
        </>
      }
    >
      <Section title="One tick, end to end">
        <Figure caption="Work on three timelines. The tags name the seams (S) and decisions (D) listed further down: select one to go to its entry.">
          <Board
            label="One tick across the main thread, workers and the GPU"
            lanes={["Main thread", "Workers", "GPU"]}
            steps={TICK}
            edges={TICK_EDGES}
          />
        </Figure>
        <Written from="src/scene/Engine.ts and World.ts" on="2026-11-08" />
      </Section>

      <Section title="The frame graph, pass by pass">
        <p>
          Passes run top to bottom, and each row shows what that pass reads (R)
          and writes (W). A line joins a resource's first and last use. The
          graph allocates transient targets from these declarations and returns
          them after their last use, so later passes can alias them. It tracks
          textures, and passes that touch only buffers declare a side effect
          instead, so the buffer columns are written by hand.
        </p>
        <Figure caption="Scroll sideways on a narrow screen: the pass names stay in place. Texture columns come from the source. Buffer columns, after the divider, are hand-written.">
          <FrameGraphChart />
        </Figure>
        <Generated
          from={
            <>
              each <C>graph.addPass</C> and <C>graph.createTexture</C> under{" "}
              <C>src/</C>
            </>
          }
        />
        <Note title="Coming, not in this build">
          <ul>
            {COMING.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Note>
        <h3>Targets and their formats</h3>
        <DataTable
          label="Frame graph targets"
          columns={[
            { head: "Target", cell: (r) => <C>{r.name}</C> },
            { head: "Format", cell: (r) => formatOf(r.name) },
            {
              head: "Samples",
              cell: (r) =>
                r.multisampled ||
                r.name === "featureId.msaa" ||
                r.name === "depth.msaa"
                  ? `${f.sampleCount} ×`
                  : "1",
            },
            {
              head: "Written by",
              cell: (r) =>
                list(
                  passes
                    .filter((p) => p.writes.includes(r.name))
                    .map((p) => p.name),
                ),
            },
            {
              head: "Read by",
              cell: (r) =>
                list(
                  passes
                    .filter((p) => p.reads.includes(r.name))
                    .map((p) => p.name),
                ),
            },
          ]}
          rows={textures}
        />
        <p className="provenance">
          Formats of the imported targets and those a device chooses are
          hand-written; the rest are generated. The feature-ID and depth targets
          are imported so they outlast a tick: a view that isn't rendering can
          still serve a pick from them.
        </p>
      </Section>

      <Section title="What each pass does">
        {passes.map((p) => {
          const note = PASSES[p.name];
          return (
            <details className="pass-entry" key={p.name}>
              <summary>
                <span className="pass-entry-name">{p.name}</span>
                {note?.summary ?? "Not yet described."}
              </summary>
              {note ? (
                <dl>
                  <dt>Runs as</dt>
                  <dd>{note.kind}</dd>
                  <dt>What it does</dt>
                  <dd>{note.detail}</dd>
                  {note.skipped ? (
                    <>
                      <dt>Does nothing</dt>
                      <dd>{note.skipped}</dd>
                    </>
                  ) : null}
                  <dt>Reads</dt>
                  <dd>{list([...p.reads, ...(note.reads ?? [])])}</dd>
                  <dt>Writes</dt>
                  <dd>{list([...p.writes, ...(note.writes ?? [])])}</dd>
                </dl>
              ) : null}
            </details>
          );
        })}
      </Section>

      <Section title="Where the seams are">
        <p>
          A seam is one place every caller goes through, so a later WebGPU
          feature or a host's own service replaces what's behind it, not the
          call sites. A seam is laid only where it costs nothing today. Each is
          guarded: a test fails if code goes around it.
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="Seams"
        >
          <table className="seams">
            <thead>
              <tr>
                <th scope="col">Seam</th>
                <th scope="col">In the code</th>
                <th scope="col">Today</th>
                <th scope="col">Ready for</th>
                <th scope="col">Guarded by</th>
              </tr>
            </thead>
            <tbody>
              {SEAMS.map((s) => (
                <tr id={`seam-${s.id}`} tabIndex={-1} key={s.id}>
                  <th scope="row">
                    <span className="seam-id">{s.id}</span> {s.name}
                    {s.passes.length > 0 ? (
                      <div className="seam-passes">
                        On {s.passes.join(", ")}
                      </div>
                    ) : null}
                  </th>
                  <td>
                    {s.code.map((c) => (
                      <div key={c.name}>
                        <C>{c.name}</C>
                      </div>
                    ))}
                  </td>
                  <td>{s.today}</td>
                  <td>{s.readyFor}</td>
                  <td>
                    {s.guards.map((g) => (
                      <div className="seam-guard" key={g.title}>
                        <C>{g.file}</C>: "{g.title}"
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="provenance">
          The test titles and code names are checked against the repository on
          each build, which warns about any that have gone.
        </p>
      </Section>

      <Section title="The decisions behind it">
        <p>
          Each records what was chosen, and what it was instead of and why,
          where the plans say. Where they don't, that part is left out rather
          than guessed.
        </p>
        <div className="decisions">
          {DECISIONS.map((d) => (
            <section
              className="decision"
              id={`decision-${d.id}`}
              tabIndex={-1}
              key={d.id}
            >
              <h3>
                {d.id}: {d.title}
              </h3>
              <dl>
                <dt>Chosen</dt>
                <dd>{d.chosen}</dd>
                {d.insteadOf ? (
                  <>
                    <dt>Instead of</dt>
                    <dd>{d.insteadOf}</dd>
                  </>
                ) : null}
                {d.why ? (
                  <>
                    <dt>Why</dt>
                    <dd>{d.why}</dd>
                  </>
                ) : null}
                <dt>Source</dt>
                <dd>{d.source}</dd>
              </dl>
            </section>
          ))}
        </div>
      </Section>

      <Section title="Sizes, settings and timings">
        <p>
          Sizes and settings are facts of the code. Timings are single
          measurements at the stated point, so they show scale, and none is a
          statement of accuracy. Plan 5a has changed the pipeline since most of
          them.
        </p>
        <DataTable
          label="Sizes, settings and timings"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Value", cell: (r) => r.value },
            { head: "What this is", cell: (r) => r.kind },
          ]}
          rows={FIGURES}
        />
        <Generated
          from={
            <>
              <C>src/render/generated/layouts.ts</C> and the constants named
              above
            </>
          }
        />
      </Section>

      <Section title="Engine, worlds and views">
        <Figure caption="One device, so geometry, textures, pipelines and the tile cache are shared. 1.x duplicates them per viewer.">
          <div className="nest">
            <div className="nest-title">Engine</div>
            <div>
              One GPU device, pipeline cache, request scheduler and worker pool
            </div>
            <div className="nest-row">
              <div>
                <div className="nest-title">World</div>
                Terrain, imagery, tilesets, lights, atmosphere. Views can share
                it.
              </div>
              <div>
                <div className="nest-title">View</div>
                Camera, target, viewport, layer mask, render settings. A target
                is a canvas, part of a canvas, or an offscreen texture.
              </div>
            </div>
          </div>
        </Figure>
      </Section>

      <Section title="Translucent terrain">
        <p>
          The globe's terrain can draw at an opacity inside a region, or
          everywhere, so that what lies under the ground shows through it in
          place. It adds no pass. The blended tiles go through the split every
          blended surface already goes through. At opacity 0.999 the terrain
          moves between the opaque pass and the blended passes: its shadows,
          ambient occlusion and depth stop there, so a fade steps in lighting at
          that opacity.
        </p>
        <Figure caption="Tiles a region doesn't touch draw exactly as they would without it. A tile it does touch keeps its own draws and swaps only their material.">
          <TranslucentTerrainFlow />
        </Figure>
        <div
          className="table-wrap"
          tabIndex={0}
          role="group"
          aria-label="What translucent terrain changes"
        >
          <table className="seams">
            <thead>
              <tr>
                <th scope="col">For</th>
                <th scope="col">Inside a translucent region</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Shadows</th>
                <td>
                  It casts none, as glass: below the opaque cutoff, the casters'
                  fragment stage discards it.
                </td>
              </tr>
              <tr>
                <th scope="row">Heights and clamping</th>
                <td>
                  Still ground. Height captures draw it opaque (<C>heightFs</C>
                  ), and terrain rays and lines of sight are unaffected. Clips
                  still apply.
                </td>
              </tr>
              <tr>
                <th scope="row">Picks</th>
                <td>
                  Stop at it as at opaque terrain, unless <C>pickThrough</C> is
                  set. The opaque pass a pick reads doesn't hold it, so a pick
                  that may stop at it also traces the drawn terrain on the CPU,
                  in the same tick, over the region's reach.
                </td>
              </tr>
              <tr>
                <th scope="row">The draw record</th>
                <td>
                  <C>skirtStart</C> took the record from 144 bytes, which was
                  full, to 160.
                </td>
              </tr>
              <tr>
                <th scope="row">Limits</th>
                <td>
                  32 slots and one edge budget, shared by all regions.
                  "everywhere" holds one of those slots while below 1.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Written
          from={
            <>
              <C>src/streaming/Tileset3D.ts</C>, <C>src/globe/terrainClip.ts</C>{" "}
              and <C>src/shaders/surface.slang</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="Precision and limits">
        <p>
          Vertex shaders see only small numbers: positions relative to the
          camera, from a subtraction in the cull kernel that no float
          reassociation can touch. The Precision and accuracy tab follows this
          from float64 on the CPU through to what a pick can claim.
        </p>
        <p>
          Binding counts are code, so they're designed to the spec's defaults
          and checked by a test: only the variant on the developer's machine
          would ever get tested otherwise. Capacities are data, so they grow
          toward the device's limits and press on the residency budget when
          full. The Browser compatibility tab shows what devices report.
        </p>
      </Section>

      <Section title="Still to write">
        <ul>
          <li>The draw record field by field, and the transform table.</li>
          <li>
            Lighting and atmosphere, which the overall plan's section 4.2 covers
            at length.
          </li>
          <li>Device loss and recovery.</li>
        </ul>
      </Section>
    </Page>
  );
}
