// Visits examples in order in headless Edge, then takes a heap snapshot and
// prints the shortest retaining paths of objects whose name matches
// `--match` (default detached canvases), to find what survives an example's
// teardown. `node scripts/retainers.mjs --ids a,b,c --match "Detached
// HTMLCanvasElement" [--max 3] [--depth 40]` with the dev server running.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const ids = option("ids", "brep-first-look,csg,brep-first-look").split(",");
const match = new RegExp(option("match", "^Detached HTMLCanvasElement"));
const max = Number(option("max", 3));
const exclude = option("exclude", "")
  ? new RegExp(option("exclude", ""))
  : undefined;
const base = option("base", "http://127.0.0.1:5190");

const browser = await chromium.launch({
  headless: true,
  channel: process.env.BENCH_CHANNEL ?? "msedge",
  args: ["--enable-unsafe-webgpu", "--enable-webgpu-developer-features"],
});
let text;
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  await page.goto(`${base}/#/examples`);
  await page.waitForSelector(".examples-gallery");
  for (const id of ids) {
    await page.evaluate(
      ([next]) => {
        globalThis.__prev =
          globalThis.dynoExamplesViewer &&
          new WeakRef(globalThis.dynoExamplesViewer);
        location.hash = `#/examples/${next}`;
      },
      [id],
    );
    await page.waitForFunction(
      () =>
        globalThis.dynoExamplesViewer &&
        globalThis.dynoExamplesViewer !== globalThis.__prev?.deref() &&
        !document.querySelector(".examples-loading"),
      undefined,
      { timeout: 120_000, polling: 50 },
    );
    await page.waitForTimeout(2500);
  }
  if (args.includes("--list")) {
    await page.evaluate(() => {
      location.hash = "#/examples";
    });
    await page.waitForSelector(".examples-gallery");
    await page.waitForTimeout(2500);
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const chunks = [];
  cdp.on("HeapProfiler.addHeapSnapshotChunk", (e) => chunks.push(e.chunk));
  await cdp.send("HeapProfiler.takeHeapSnapshot", {
    reportProgress: false,
    captureNumericValue: false,
  });
  text = chunks.join("");
} finally {
  await browser.close();
}
const snap = JSON.parse(text);
const { meta } = snap.snapshot;
const nodeFields = meta.node_fields;
const edgeFields = meta.edge_fields;
const NF = nodeFields.length;
const EF = edgeFields.length;
const nType = nodeFields.indexOf("type");
const nName = nodeFields.indexOf("name");
const nEdges = nodeFields.indexOf("edge_count");
const eType = edgeFields.indexOf("type");
const eName = edgeFields.indexOf("name_or_index");
const eTo = edgeFields.indexOf("to_node");
const nodeTypes = meta.node_types[0];
const edgeTypes = meta.edge_types[0];
const { nodes, edges, strings } = snap;
const count = nodes.length / NF;
const firstEdge = new Uint32Array(count + 1);
for (let i = 0; i < count; i++) {
  firstEdge[i + 1] = firstEdge[i] + nodes[i * NF + nEdges];
}
const name = (i) => strings[nodes[i * NF + nName]];
const type = (i) => nodeTypes[nodes[i * NF + nType]];
const parent = new Int32Array(count).fill(-1);
const via = new Array(count);
parent[0] = 0;
const queue = [0];
for (let q = 0; q < queue.length; q++) {
  const n = queue[q];
  for (let e = firstEdge[n]; e < firstEdge[n + 1]; e++) {
    const t = edgeTypes[edges[e * EF + eType]];
    if (t === "weak" || t === "shortcut") {
      continue;
    }
    const to = edges[e * EF + eTo] / NF;
    if (parent[to] >= 0) {
      continue;
    }
    parent[to] = n;
    const key = edges[e * EF + eName];
    via[to] = t === "element" || t === "hidden" ? `[${key}]` : strings[key];
    queue.push(to);
  }
}
const found = [];
for (let i = 0; i < count; i++) {
  if (
    match.test(name(i)) &&
    parent[i] >= 0 &&
    (args.includes("--any") || type(i) === option("type", "object"))
  ) {
    found.push(i);
  }
}
console.log(`${found.length} node(s) match ${match}`);
for (const i of found.slice(0, max)) {
  const path = [];
  for (let n = i, d = 0; n !== 0 && d < Number(option("depth", 40)); d++) {
    path.push(`${via[n]} -> ${name(n).slice(0, 60)} (${type(n)})`);
    n = parent[n];
  }
  if (args.includes("--compact")) {
    const line = path
      .reverse()
      .slice(4)
      .map((p) => p.replace(/ \(object\)$/, ""))
      .join(" | ");
    if (!exclude || !exclude.test(line)) {
      console.log(line);
    }
    continue;
  }
  console.log(`\n${path.reverse().join("\n")}`);
}
