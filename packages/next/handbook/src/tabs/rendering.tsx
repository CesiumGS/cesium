import {
  C,
  DataTable,
  Figure,
  Flow,
  Page,
  Section,
  Written,
} from "../parts.tsx";

const SEAMS = [
  {
    seam: "Per-draw constants",
    test: "test/seams.test.ts and neighbours",
    later: "Immediates replace an emulation",
  },
  {
    seam: "Draw arguments",
    test: "test/seams.test.ts and neighbours",
    later: "Multi-draw indirect",
  },
  {
    seam: "Geometry submission",
    test: "test/seams.test.ts and neighbours",
    later: "A mesh-shader backend",
  },
  {
    seam: "Bindless resources",
    test: "test/bindless.test.ts",
    later: "Resource tables",
  },
  {
    seam: "Ray queries",
    test: "test/seams.test.ts and neighbours",
    later: "Hardware ray queries",
  },
];

export function Rendering() {
  return (
    <Page
      title="Rendering"
      status="sketch"
      lede={
        <>
          GPU-driven from the start. Draws live in tables mirrored to GPU
          storage buffers, compute prepares and culls them per view, and the
          main thread mostly doesn't touch them in steady state. One device
          serves every view.
        </>
      }
    >
      <Section title="Engine, worlds and views">
        <Figure caption="One device, so geometry, textures, pipelines and the tile cache are shared. 1.x duplicates them per viewer.">
          <div className="nest">
            <div className="nest-title">Engine</div>
            <div>
              One GPU device, pipeline cache, content cache, request scheduler
              and worker pool
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

      <Section title="A view's passes, in order">
        <Flow
          label="Passes per view"
          steps={[
            {
              title: "Uploads",
              body: "Imagery into array-cache slices, and compute mip generation, within a per-tick budget.",
            },
            {
              title: "Draw prep and cull",
              body: "Compute: camera-relative offsets, frustum and horizon culling.",
            },
            {
              title: "Opaque",
              body: "Globe, then 3D Tiles. HDR color, a feature-ID target, reverse-Z depth, MSAA 4×.",
            },
            {
              title: "Sky and atmosphere",
              body: "After opaque. Fog and atmosphere linearize the depth.",
            },
            {
              title: "Translucent",
              body: "A compute compositor over per-pixel lists, shared with Gaussian splats.",
            },
            {
              title: "Resolve and post",
              body: "Exposure, tonemapping and FXAA.",
            },
            {
              title: "Readback",
              body: "Picks and height queries answer through promises, as mapAsync takes a tick or more.",
            },
          ]}
        />
        <p>
          Passes declare what they read and write. The frame graph (
          <C>FrameGraph</C>) sorts them and allocates transient targets per
          view, which also makes passes an extension point.
        </p>
      </Section>

      <Section title="Precision">
        <p>
          Vertex shaders see only small numbers: positions relative to the
          camera. The obvious way to compute them, subtracting split high and
          low parts in floating point, failed on Metal. On an M-series Mac the
          error read the same as plain float32 (0.25 to 0.47 m), because relaxed
          math folded the split back together.
        </p>
        <p>
          So the high part is whole meters, and shaders subtract the highs as{" "}
          <C>i32</C>. No float reassociation can touch that. It is one path on
          every machine, not a Metal branch, and valid to ±2³¹ m.
        </p>
      </Section>

      <Section title="Limits and capacities">
        <p>
          Binding counts are code, so they're designed to the spec's defaults
          and checked by a test: only the variant on the developer's machine
          would ever get tested otherwise. Capacities are data, so they grow
          toward the device's limits and press on the residency budget when
          full. The Browser compatibility tab shows what devices report.
        </p>
      </Section>

      <Section title="Streaming and selection">
        <p>
          3D Tiles and terrain share one tile table, one selection framework,
          one request scheduler and one content cache with an engine-wide
          budget. Decoding runs in workers, and the main thread only uploads,
          within a budget. Selection is pluggable:
        </p>
        <ul>
          <li>
            <C>Stepwise</C> reproduces 1.x selection, for fair comparisons and
            deterministic parity tests.
          </li>
          <li>
            <C>Budgeted</C>, the default, keeps 1.x's proven heuristics and adds
            benefit-over-cost refinement, multi-view priority, stability and
            prefetch along the camera's motion.
          </li>
        </ul>
      </Section>

      <Section title="One seam per GPU concern">
        <DataTable
          label="Rendering seams"
          columns={[
            { head: "Seam", cell: (r) => r.seam },
            { head: "Bypass test", cell: (r) => <C>{r.test}</C> },
            { head: "What it's ready for", cell: (r) => r.later },
          ]}
          rows={SEAMS}
        />
        <Written
          from="the overall plan, sections 3.1 to 3.7, and AGENTS.md"
          on="2026-11-08"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>The draw record, its tables and the transform table.</li>
          <li>Translucency: lists, compositing and their cost.</li>
          <li>
            Lighting and atmosphere, which the overall plan's section 4.2 covers
            at length.
          </li>
          <li>Device loss and recovery, and rendering on demand.</li>
        </ul>
      </Section>
    </Page>
  );
}
