import { count, data, size, libraryEntry } from "../data.ts";
import { C, DataTable, Generated, Page, Section, Written } from "../parts.tsx";

const MILESTONES = [
  {
    work: "M0 to M4",
    what: "Foundations and spikes, GPU-driven glTF, unified streaming and 3D Tiles, the globe, visual parity",
    state: "Built",
  },
  {
    work: "Benchmark suite",
    what: "Dyno: a catalog of real scenes, run in 1.x and 2.0, with verdicts, trends and image checks",
    state: "Built, growing",
  },
  {
    work: "Custom shading, real-time tracks",
    what: "Slang as the one shader source, a linker, styled point layers up to 10 million points",
    state: "Built",
  },
  {
    work: "Frames plans 1 to 4b",
    what: "Time and ephemerides, the frame tree, measurement, engineering coordinates over PROJ, tileset placement",
    state: "Built",
  },
  {
    work: "Plan 5a",
    what: "Render space, anchors, the camera chain, the entry points and their dependency rule",
    state: "In progress",
  },
  {
    work: "Plans 5b to 5i",
    what: "The frames library, a second body, controllers, the physical sky per body, design space, the Artemis II replay, the API review",
    state: "Planned",
  },
  {
    work: "M5, M6",
    what: "Performance hardening; compute showcases such as splats and point clouds",
    state: "Open",
  },
];

export function Overview() {
  const core = libraryEntry("core");
  return (
    <Page
      title="A WebGPU engine for CesiumJS 2.0"
      status="current"
      lede={
        <>
          <C>packages/next</C> is a clean-slate, WebGPU-only engine. It is built
          as an embeddable rendering core: small at its center, with time,
          reference frames, coordinates and measurement as optional modules, and
          seams where a host application can supply its own services. It is a
          proof of concept today (version {data.meta.version}), and its public
          API is still open to change.
        </>
      }
    >
      <Section title="What it is for">
        <ul>
          <li>
            Stream 3D Tiles into a real geospatial context: a globe with terrain
            and imagery, photorealistic tiles, photogrammetry, and CAD and BIM
            tilesets.
          </li>
          <li>
            Render close to 1.x when asked to, and do better by default. 1.x is
            the visual and behavioral oracle the tests compare against, not an
            architectural template.
          </li>
          <li>
            Be measurably faster, mostly in main-thread CPU time, steady-state
            allocations, and the time from a tile's request to its appearance.
          </li>
          <li>
            Share one GPU device and one tile cache across split views, multiple
            canvases and offscreen views.
          </li>
          <li>
            Last: absorb vectors, splats, point clouds, bindless and later
            WebGPU features without another rewrite.
          </li>
        </ul>
      </Section>

      <Section title="Where it stands">
        <p>
          The package has {count(data.surface.total)} public exports across{" "}
          {data.surface.entries.length} entry points,{" "}
          {count(data.counts.testFiles)} test files, and{" "}
          {count(data.counts.slangFiles)} Slang shader modules. Its core loads
          at {size(core?.loadKb)} ({size(core?.loadGzipKb)} gzipped). A
          globe-only Viewer loads {size(data.bundles.globeOnly.main.kb)} (
          {size(data.bundles.globeOnly.main.gzipKb)} gzipped), with none of the
          data behind the reference frames' higher-accuracy level in it.
        </p>
        <Generated
          from={
            <>
              <C>api/surface.txt</C>, the import graph and the library build
            </>
          }
        />
        <DataTable
          label="Work so far and planned"
          columns={[
            { head: "Work", cell: (r) => r.work },
            { head: "What it covers", cell: (r) => r.what },
            { head: "State", cell: (r) => r.state },
          ]}
          rows={MILESTONES}
        />
        <Written from="the overall plan and the plan 5 spec" on="2026-11-08" />
      </Section>

      <Section title="What the numbers say so far">
        <ul>
          <li>
            Across the benchmark catalog against 1.x, at plan revision r38: time
            to settle 26% lower and main-thread CPU 73% lower, with no guardrail
            metric broken.
          </li>
          <li>
            100,000 moving points hold 60 fps at 1.0 ms of CPU and 3.7 ms of GPU
            per tick in the full viewer, on an NVIDIA RTX laptop GPU. 1,000,000
            hold 60 fps at 13.1 ms of GPU.
          </li>
          <li>
            These were measured before plan 5a. New baselines on the RTX machine
            will replace them; the Benchmarks tab has their place.
          </li>
        </ul>
      </Section>

      <Section title="How to read this handbook">
        <p>
          <strong>If you decide what gets built:</strong> this tab, Browser
          compatibility, Benchmarks and Spec extensions.{" "}
          <strong>If you work on 1.x:</strong> Differences from 1.x, then Public
          API, then the deep dive nearest your area.{" "}
          <strong>If you might embed the engine:</strong> System architecture,
          which lists the seams a host can fill.
        </p>
        <p>
          Each tab says how far it goes: accurate today, a sketch, or a stub.
          Each figure says whether it was generated from the repository or
          written by hand, and when. The overall plan,{" "}
          <C>CESIUM2_WEBGPU_PLAN.md</C>, holds the full reasoning behind all of
          it.
        </p>
      </Section>
    </Page>
  );
}
