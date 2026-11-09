import { count, data, day, size, libraryEntry } from "../data.ts";
import { Costs } from "../costs.tsx";
import { GoalList } from "../goals.tsx";
import { Reel } from "../reel.tsx";
import {
  C,
  CodeBlock,
  DataTable,
  Generated,
  Page,
  Section,
  Written,
} from "../parts.tsx";

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

const CLONE =
  "git clone --branch cesium-2.0-webgpu-poc https://github.com/CesiumGS/cesium.git";

const QUICK_START = `cd cesium
npm install
npm run setup --workspace @cesium/next
npm run dev --workspace @cesium/next`;

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
      <Section title="Quick start: run Dyno">
        <p>
          Dyno is the app for measuring and exploring the engine. You need Node
          24 or later and a browser with WebGPU. The engine is on the{" "}
          <C>cesium-2.0-webgpu-poc</C> branch of the{" "}
          <a href="https://github.com/CesiumGS/cesium/tree/cesium-2.0-webgpu-poc">
            CesiumGS/cesium
          </a>{" "}
          repository:
        </p>
        <CodeBlock language="shell" code={CLONE} />
        <p>
          Then run these from the repository root. You don't need to go into{" "}
          <C>packages/next</C>, because <C>--workspace</C> does that:
        </p>
        <CodeBlock language="shell" code={QUICK_START} />
        <p>
          You only need <C>setup</C> once per machine. It fetches the tools and
          builds this repository's 1.x if that build is missing. When the server
          is up, open <a href="http://127.0.0.1:5190">http://127.0.0.1:5190</a>.
        </p>
        <p>
          To load your own Cesium ion content, paste your token into{" "}
          <strong>ion token</strong> at the foot of Dyno's side rail. Without
          one, the evaluation token reaches public assets only. More on the{" "}
          <a href="#/dyno">Dyno</a> tab.
        </p>
      </Section>

      <Section title="See it run">
        <p>
          This is the engine, live, from inside this one file, in five short
          chapters. It starts only when you ask, and it stops when it's out of
          view. Take the camera at any point: drag, or use the arrow keys.
        </p>
        <Reel />
        <p className="provenance">
          Everything it draws is embedded here, which is why this file is about
          96 MB: nothing is fetched, and no token is used. So it has limits. Its
          imagery is tiles baked for this page, finest around one valley, and
          the ground is flat outside that valley. The corridor is cut down to
          its coarser levels, and the road is made up. It decodes on the main
          thread, because a page opened from disk can't start the engine's
          workers. The timings are what your machine did just now, not a
          benchmark. For the full experience, with real content and both
          engines, run <a href="#/dyno">Dyno</a>.
        </p>
        <p className="provenance">
          Run from a file on disk in Chrome 156 and Edge 157 on an Apple M2. It
          can't start yet in WebKit 27.2: its shader compiler rejects one of the
          engine's kernels. Firefox 157 offered no GPU adapter on that machine.
          Where it can't run, you see pictures of each chapter and a note saying
          why.
        </p>
      </Section>

      <Section title="What it's aiming for">
        <p>
          Fourteen targets. Each has a state today, and opens to show where 1.x
          stands, what 2.0 has, and the tab that goes deeper. 1.x is the visual
          and behavioural reference the tests compare against, not an
          architectural template, and the differences below come from when and
          for what each was designed.
        </p>
        <GoalList />
        <Written
          from="the overall plan, sections 1, 2, 8, 10 and 14, the plan 5 spec, 1.x's source, and generated data"
          on="2026-11-08"
        />
      </Section>

      <Section title="What it costs">
        <Costs />
        <div className="open-question">
          <h3>An open question: the real cost of reaching production</h3>
          <p>
            How do evolving AI-driven development workflows change the real time
            and money costs here? Nobody has that answer yet, and this is an
            invitation to discuss it, not a conclusion.
          </p>
          <p>
            The prototype was developed with heavy use of coding agents, under
            human direction. From git, <C>packages/next</C> has{" "}
            {count(data.history.commits)} commits between{" "}
            {day(data.history.firstDate)} and {day(data.history.lastDate)}, of
            which {count(data.history.withAgent)} name a coding agent as
            co-author, and {count(data.counts.testFiles)} test files. That pace
            may not predict the cost of production.
          </p>
          <p>Whatever the tooling, going to production involves:</p>
          <ul>
            <li>the API review (plan 5i) and documentation</li>
            <li>1.x parity gaps, migration, and a migration guide</li>
            <li>the plan's open performance and compute milestones (M5, M6)</li>
            <li>browser reach, and testing on real hardware</li>
            <li>a security review, and licensing, including of data</li>
            <li>human review capacity</li>
            <li>long-term maintenance, and who owns it</li>
            <li>how community contribution works</li>
          </ul>
          <p>Questions to discuss:</p>
          <ul>
            <li>
              Which of these does the tooling change, and which does it leave as
              they are?
            </li>
            <li>
              How much human review does production code need, and how would we
              know it's enough?
            </li>
            <li>What does maintaining this code take, years from now?</li>
            <li>
              How does the community contribute to, and trust, code written this
              way?
            </li>
            <li>
              What should be measured from here, so that any later estimate
              rests on evidence?
            </li>
          </ul>
        </div>
        <Written
          from="the overall plan, sections 3 and 13.17 and its milestones, the plan 5 spec, the code and git"
          on="2026-11-08"
        />
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
            to settle 26% lower and main-thread CPU 73% lower. That run failed
            two guardrails, later fixed, and the rerun of those scenes passes.
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
