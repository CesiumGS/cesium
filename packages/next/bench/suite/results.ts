// @ts-expect-error -- plain ES module shared with the CLI
import { renderReport } from "./report.mjs";

/**
 * Results page (plan §16.5): lists the suite's runs from the results
 * directory (served by the dev server from outside the repo) and renders
 * the chosen one with the same report the CLI writes. Trends across runs
 * come next.
 */
const select = document.querySelector<HTMLSelectElement>("#run")!;
const frame = document.querySelector<HTMLIFrameElement>("#report")!;

async function show(name: string): Promise<void> {
  const results = await (await fetch(`/bench-results/${name}`)).json();
  frame.srcdoc = (renderReport as (r: unknown) => string)(results);
  const url = new URL(location.href);
  url.searchParams.set("run", name);
  history.replaceState(null, "", url);
}

const index = (await (await fetch("/bench-results/index.json")).json()) as {
  directory: string;
  runs: string[];
};
document.querySelector("#where")!.textContent =
  `${index.runs.length} runs in ${index.directory} (BENCH_RESULTS). ` +
  "Run the suite with node packages/next/bench/suite/cli.mjs run.";
for (const name of index.runs) {
  select.add(new Option(name.replace(/\.json$/, ""), name));
}
select.addEventListener("change", () => void show(select.value));
const wanted = new URLSearchParams(location.search).get("run");
if (wanted && index.runs.includes(wanted)) {
  select.value = wanted;
}
if (select.value) {
  void show(select.value);
}
