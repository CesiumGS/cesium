import {
  count,
  data,
  day,
  referenceAdapter,
  type AdapterResults,
  type BenchRow,
} from "../data.ts";
import {
  C,
  CodeBlock,
  DataTable,
  Figure,
  Generated,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

const num = (row: BenchRow | undefined, key: string): number | undefined => {
  const v = row?.[key];
  return typeof v === "number" ? v : undefined;
};

const ms = (v: number | undefined) =>
  v === undefined
    ? "not measured"
    : `${v < 10 ? v.toFixed(1) : v.toFixed(0)} ms`;

/** Rows of a suite in the baseline run, 1.x beside 2.0 by draw count. */
function drawScaling(a: AdapterResults) {
  const rows = a.baseline.filter((r) => r.suite === "draw scaling");
  const draws = [...new Set(rows.map((r) => Number(r.draws)))].sort(
    (x, y) => x - y,
  );
  return draws.map((d) => {
    const at = rows.filter((r) => Number(r.draws) === d);
    return {
      draws: d,
      old: at.find((r) => String(r.engine).startsWith("1.x")),
      next: at.find((r) => String(r.engine).startsWith("2.0")),
    };
  });
}

function CpuBars({ a }: { a: AdapterResults }) {
  const groups = drawScaling(a);
  const max = Math.max(
    ...groups.flatMap((g) => [
      num(g.old, "cpu/frame ms") ?? 0,
      num(g.next, "cpu/frame ms") ?? 0,
    ]),
  );
  const bar = (label: string, value: number | undefined, alt: boolean) => (
    <div className="bar-row" key={label}>
      <span>{label}</span>
      <span className="bar-track">
        <span
          className={alt ? "bar alt" : "bar"}
          style={{ inlineSize: `${((value ?? 0) / max) * 70}%` }}
        />
        <span className="bar-value">{ms(value)}</span>
      </span>
    </div>
  );
  return (
    <div className="bars">
      <div className="legend" aria-hidden="true">
        <span>
          <i className="alt" />
          1.x WebGL
        </span>
        <span>
          <i />
          2.0 WebGPU
        </span>
      </div>
      {groups.map((g) => (
        <div key={g.draws}>
          <div className="bar-group">{count(g.draws)} draws</div>
          {bar("1.x WebGL", num(g.old, "cpu/frame ms"), true)}
          {bar("2.0 WebGPU", num(g.next, "cpu/frame ms"), false)}
        </div>
      ))}
    </div>
  );
}

const TARGETS = [
  { metric: "Main-thread CPU per tick", target: "3× lower or better than 1.x" },
  { metric: "Steady-state allocations", target: "None" },
  { metric: "Time to full detail", target: "2× faster or better than 1.x" },
  { metric: "GPU time", target: "Equal to 1.x or lower" },
  { metric: "Memory with N views", target: "Well under N times one view" },
];

const COMMANDS = `# The engine suites: one JSON file per run, in bench/results.
node bench/run.mjs baseline alloc hitch instances lod selection

# The scene catalog, 1.x against 2.0, for Dyno's verdicts and trends.
node bench/suite/cli.mjs run --tier full --note "RTX baseline"

# Then refresh this page.
npm run handbook`;

export function Benchmarks() {
  const reference = referenceAdapter();
  const suites = reference
    ? Object.entries(reference.suites).sort(([a], [b]) => a.localeCompare(b))
    : [];
  return (
    <Page
      title="Benchmarks"
      status="sketch"
      lede={
        <>
          Two kinds of runs feed this tab: the engine suites in{" "}
          <C>bench/results</C>, and Dyno's scene catalog, which runs real
          content in 1.x and 2.0 side by side. Each result records its GPU, so
          numbers from different machines never mix.
        </>
      }
    >
      <Section title="The RTX baseline">
        {data.bench.baselines.length > 0 ? (
          <DataTable
            label="Baseline runs"
            columns={[
              { head: "File", cell: (r) => <C>{r.name}</C> },
              { head: "Date", cell: (r) => (r.date ? day(r.date) : "no date") },
              { head: "Note", cell: (r) => r.note ?? "" },
            ]}
            rows={data.bench.baselines}
          />
        ) : (
          <Note title="No baseline recorded yet">
            <p>
              Baselines will run on the RTX machine. Its results below predate
              plan 5a, so they show the shape of the data rather than today's
              engine. To record one, run these on that machine, and put the
              catalog run's results file in <C>handbook/baselines/</C>:
            </p>
          </Note>
        )}
        <CodeBlock language="shell" code={COMMANDS} />
      </Section>

      {reference ? (
        <Section title={`Last results on ${reference.adapter}`}>
          <Figure
            caption={`Main-thread CPU per tick, shorter is better. From the baseline suite, last run ${day(
              suites.find(([s]) => s === "baseline")?.[1].lastDate ??
                reference.lastDate,
            )}.`}
          >
            <CpuBars a={reference} />
          </Figure>
          <DataTable
            label="Draw scaling"
            columns={[
              { head: "Draws", numeric: true, cell: (r) => count(r.draws) },
              {
                head: "CPU per tick, 1.x",
                numeric: true,
                cell: (r) => ms(num(r.old, "cpu/frame ms")),
              },
              {
                head: "CPU per tick, 2.0",
                numeric: true,
                cell: (r) => ms(num(r.next, "cpu/frame ms")),
              },
              {
                head: "API calls per tick, 1.x",
                numeric: true,
                cell: (r) => count(num(r.old, "API calls/frame") ?? 0),
              },
              {
                head: "API calls per tick, 2.0",
                numeric: true,
                cell: (r) => count(num(r.next, "API calls/frame") ?? 0),
              },
              {
                head: "First render, 1.x",
                numeric: true,
                cell: (r) => ms(num(r.old, "first frame ms")),
              },
              {
                head: "First render, 2.0",
                numeric: true,
                cell: (r) => ms(num(r.next, "first frame ms")),
              },
            ]}
            rows={drawScaling(reference)}
          />
          <p>
            These timings have 0.1 ms resolution, so a 2.0 figure near that size
            says "under about a tenth of a millisecond", not a precise ratio.
          </p>
          <h3>Every suite on this machine</h3>
          <DataTable
            label="Suites on the reference machine"
            columns={[
              { head: "Suite", cell: ([s]) => <C>{s}</C> },
              { head: "Last run", cell: ([, v]) => day(v.lastDate) },
              { head: "Runs", numeric: true, cell: ([, v]) => v.runs },
              { head: "Rows", numeric: true, cell: ([, v]) => v.rows },
            ]}
            rows={suites}
          />
          <Generated from={<C>bench/results</C>} />
        </Section>
      ) : null}

      <Section title="Other machines">
        <DataTable
          label="Results per GPU"
          columns={[
            { head: "GPU", cell: (r) => r.adapter },
            { head: "Runs", numeric: true, cell: (r) => r.runs },
            { head: "First run", cell: (r) => day(r.firstDate) },
            { head: "Last run", cell: (r) => day(r.lastDate) },
            {
              head: "Checks passing",
              numeric: true,
              cell: (r) => {
                const all = Object.values(r.suites);
                const pass = all.reduce((n, s) => n + s.pass, 0);
                const fail = all.reduce((n, s) => n + s.fail, 0);
                return pass + fail > 0
                  ? `${pass} of ${pass + fail}`
                  : "no pass/fail rows";
              },
            },
            {
              head: "Bytes allocated per tick",
              numeric: true,
              cell: (r) => {
                const row = r.alloc[0];
                const bytes = num(row, "bytesPerFrame");
                return bytes === undefined
                  ? "not measured"
                  : `${count(bytes)} at ${count(num(row, "draws") ?? 0)} draws`;
              },
            },
          ]}
          rows={data.bench.adapters}
        />
        <p>
          The allocation target is none in steady state, and these runs don't
          meet it. The Apple run is from plan 5a's work in progress, and its
          largest sites are in the anchor code. This is a figure to watch, and
          it isn't yet understood across machines.
        </p>
      </Section>

      <Section title="How we measure">
        <p>
          Scripted camera paths run in 1.x and 2.0, cold and warm, in Playwright
          and Chromium with WebGPU. A run records CPU and GPU time per tick,
          JS-to-GPU calls, bytes allocated, tiles per second to visible, time to
          full detail, GPU memory and long tasks. Image checks use FLIP against
          a target. Dyno turns repeated runs into verdicts with declared primary
          and guardrail metrics.
        </p>
        <DataTable
          label="Performance targets"
          columns={[
            { head: "Metric", cell: (r) => r.metric },
            { head: "Target", cell: (r) => r.target },
          ]}
          rows={TARGETS}
        />
        <Written from="the overall plan, sections 5 and 16" on="2026-11-08" />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>
            The scene catalog's verdicts, per scene, from the RTX baseline.
          </li>
          <li>Trends over time, once there's more than one baseline.</li>
          <li>Multi-view memory against the N-views target.</li>
        </ul>
      </Section>
    </Page>
  );
}
