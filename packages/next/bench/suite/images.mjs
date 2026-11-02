// Image regression (plan §16.10): `cli.mjs images` captures image checks
// (a scene at points of its camera path, settled, with the benchmark's
// render settings and fixed sun), compares each with its approved
// baseline for this renderer class using FLIP, and writes a run (JSON,
// JUnit XML, Markdown) beside the results for Dyno's Images tab and CI.
// Baselines live outside the repo (renders of most catalog content may
// not be redistributed): <results>/baselines/<renderer class>/.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { sceneDatasets, unsupportedReason } from "./manifest.mjs";
import { resolveEngine } from "./engineBuilds.mjs";

/** Regression thresholds: the same engine on the same renderer class. */
export const REGRESSION = { mean: 0.01, p95: 0.05 };
/** Parity thresholds against 1.x (§4 L2). */
export const PARITY = { mean: 0.05, p95: 0.2 };

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const slug = (s) => s.replace(/[^\w@.-]+/g, "_");

/** Baselines manifest for a renderer class. */
export function readBaselines(directory) {
  const file = join(directory, "baselines.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

/** Approves an image as the baseline of its check (CLI and Dyno). */
export function approve(baselines, key, image, meta) {
  mkdirSync(baselines, { recursive: true });
  const file = `${slug(key)}.png`;
  copyFileSync(image, join(baselines, file));
  const manifest = readBaselines(baselines);
  manifest[key] = {
    file,
    sha256: sha256(readFileSync(image)),
    approvedAt: new Date().toISOString(),
    ...meta,
  };
  writeFileSync(
    join(baselines, "baselines.json"),
    JSON.stringify(manifest, null, 1),
  );
}

function git(root, args) {
  try {
    return execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const xml = (s) =>
  String(s).replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c],
  );

export async function runImages({ catalog, opts, root, directory }) {
  const pick = (list, key) =>
    opts[key]
      ? list.filter((x) => opts[key].split(",").includes(x.id))
      : undefined;
  const scenes = pick(catalog.scenes, "scenes") ?? catalog.scenes;
  // The engine under test (--engine, default the catalog's candidate)
  // and, with --parity, the reference it is scored against (--parity-engine,
  // default the catalog's baseline release). Other refs need their own
  // server, which image checks don't start: the working tree and releases.
  const noServer = () => {
    throw new Error(
      "image checks run the working tree or releases, not 2.0 at another ref",
    );
  };
  const candidate = await resolveEngine(
    opts.engine ?? catalog.engines.candidate,
    catalog,
    { cwd: root, serve: noServer },
  );
  const parity = opts.parity
    ? await resolveEngine(
        opts["parity-engine"] ?? catalog.engines.baseline,
        catalog,
        { cwd: root, serve: noServer },
      )
    : undefined;
  const scenario = catalog.scenarios.find((s) => s.id === "cold-orbit");
  const checks = scenes.flatMap((scene) =>
    (scene.checks ?? [0]).map((progress) => ({
      id: `${scene.id}@${Math.round(progress * 100)}`,
      scene,
      progress,
    })),
  );

  const { createServer } = await import("vite");
  const server = await createServer({
    root,
    configFile: join(root, "vite.config.ts"),
    cacheDir: join(root, ".vite-bench"),
    server: { port: 5194, strictPort: false, hmr: false, watch: null },
    logLevel: "error",
  });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, "");
  const { chromium } = await import("@playwright/test");
  const software = !!opts.software;
  const args = [
    "--enable-unsafe-webgpu",
    "--enable-webgpu-developer-features",
    ...(software
      ? [
          "--use-webgpu-adapter=swiftshader",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
        ]
      : ["--force_high_performance_gpu"]),
  ];
  const browser = await chromium.launch({
    headless: !process.env.BENCH_HEADED,
    channel: process.env.BENCH_CHANNEL ?? "msedge",
    args,
  });

  // The renderer class: what the baselines are valid for.
  const probe = await browser.newPage();
  await probe.goto(`${base}/bench/suite/suite.html?bench`);
  const described = await probe.evaluate(() => globalThis.describeBrowser());
  await probe.close();
  const info = described.webgpu?.info ?? {};
  const rendererClass = software
    ? "swiftshader"
    : slug(
        `${info.vendor || "gpu"}-${info.architecture || info.description || "unknown"}`,
      );
  const baselines = join(directory, "baselines", rendererClass);
  const manifest = readBaselines(baselines);

  const started = new Date();
  const stamp = started.toISOString().replace(/[:.]/g, "-");
  const out = join(directory, "images", stamp);
  mkdirSync(out, { recursive: true });

  const capture = async (config, check) => {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    let png;
    await page.exposeFunction("captureMoment", async () => {
      png = await page.locator("#view").screenshot({ type: "png" });
    });
    const cesium = config.page?.cesium;
    await page.goto(
      `${base}/bench/suite/suite.html?bench${cesium ? `&cesium=${encodeURIComponent(cesium)}` : ""}`,
    );
    const spec = {
      scene: check.scene,
      datasets: sceneDatasets(catalog, check.scene),
      scenario,
      config,
      render: catalog.render,
      unsupported: unsupportedReason(catalog, check.scene, config.engine),
    };
    const result = await page.evaluate(
      ({ spec, progress }) => globalThis.runCheck(spec, progress),
      { spec, progress: check.progress },
    );
    await context.close();
    return { result, png };
  };

  const flipPage = await browser.newPage();
  await flipPage.goto(`${base}/bench/suite/flip.html`);
  const compare = async (test, reference) =>
    flipPage.evaluate(({ test, ref }) => globalThis.processFrame(test, ref), {
      test: test.toString("base64"),
      ref: reference.toString("base64"),
    });

  const rows = [];
  for (const [i, check] of checks.entries()) {
    process.stdout.write(`[${i + 1}/${checks.length}] ${check.id}… `);
    const { result, png } = await capture(candidate, check);
    const key = `${check.id}__${candidate.id}`;
    const row = {
      id: check.id,
      key,
      scene: check.scene.id,
      title: check.scene.title,
      progress: check.progress,
      config: candidate.id,
      status: result.status,
      message: result.message,
    };
    if (result.status === "ok" && png) {
      row.image = `${slug(key)}.png`;
      writeFileSync(join(out, row.image), png);
      const approved = manifest[key];
      if (!approved || !existsSync(join(baselines, approved.file))) {
        row.status = "new";
      } else {
        const r = await compare(
          png,
          readFileSync(join(baselines, approved.file)),
        );
        row.flip = { mean: r.flip.mean, p95: r.flip.p95 };
        row.heatmap = `${slug(key)}.flip.png`;
        writeFileSync(
          join(out, row.heatmap),
          Buffer.from(r.flip.heatmap, "base64"),
        );
        row.baseline = {
          file: approved.file,
          approvedAt: approved.approvedAt,
          commit: approved.commit,
        };
        row.status =
          r.flip.mean <= REGRESSION.mean && r.flip.p95 <= REGRESSION.p95
            ? "pass"
            : "changed";
      }
      if (parity) {
        const other = await capture(parity, check);
        if (other.result.status === "ok" && other.png) {
          const r = await compare(png, other.png);
          row.parity = {
            config: parity.id,
            image: `${slug(`${check.id}__${parity.id}`)}.png`,
            heatmap: `${slug(`${check.id}__${parity.id}`)}.flip.png`,
            mean: r.flip.mean,
            p95: r.flip.p95,
            within: r.flip.mean <= PARITY.mean && r.flip.p95 <= PARITY.p95,
          };
          writeFileSync(join(out, row.parity.image), other.png);
          writeFileSync(
            join(out, row.parity.heatmap),
            Buffer.from(r.flip.heatmap, "base64"),
          );
        }
      }
      if (opts.update && (row.status === "new" || row.status === "changed")) {
        approve(baselines, key, join(out, row.image), {
          approvedBy: git(root, "config user.name") || "cli",
          commit: git(root, "rev-parse HEAD"),
          reason: opts.reason ?? "cli.mjs images --update",
        });
        row.approved = true;
      }
    }
    rows.push(row);
    console.log(
      `${row.status}${row.flip ? ` (FLIP ${row.flip.mean.toFixed(4)} mean, ${row.flip.p95.toFixed(4)} p95)` : ""}${row.parity ? ` · parity ${row.parity.mean.toFixed(3)}` : ""}${row.approved ? " · approved" : ""}`,
    );
  }
  await browser.close();
  await server.close();

  const run = {
    date: started.toISOString(),
    commit: git(root, "rev-parse HEAD"),
    subject: git(root, "log -1 --format=%s"),
    dirty: git(root, "status --porcelain").length > 0,
    rendererClass,
    software,
    thresholds: { regression: REGRESSION, parity: PARITY },
    assets: `/bench-results/images/${stamp}/`,
    baselines: `/bench-results/baselines/${rendererClass}/`,
    checks: rows,
  };
  const file = join(directory, "images", `${stamp}.json`);
  writeFileSync(file, JSON.stringify(run, null, 1));

  // CI: JUnit (one test case per check) and a Markdown summary.
  const failed = rows.filter(
    (r) => !r.approved && r.status !== "pass" && r.status !== "unsupported",
  );
  writeFileSync(
    file.replace(/\.json$/, ".junit.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="dyno-images" tests="${rows.length}" failures="${failed.length}">
${rows
  .map(
    (r) =>
      `  <testcase classname="${xml(r.config)}" name="${xml(r.id)}">${
        r.status === "unsupported"
          ? `<skipped message="${xml(r.message ?? "")}"/>`
          : r.approved || r.status === "pass"
            ? ""
            : `<failure message="${xml(r.status)}">${xml(r.flip ? `FLIP mean ${r.flip.mean}, p95 ${r.flip.p95}` : (r.message ?? "no baseline"))}</failure>`
      }</testcase>`,
  )
  .join("\n")}
</testsuite>
`,
  );
  const count = (s) => rows.filter((r) => r.status === s).length;
  writeFileSync(
    file.replace(/\.json$/, ".md"),
    `### Image checks (${rendererClass})

${count("pass")} unchanged, ${count("changed")} changed, ${count("new")} new, ${count("unsupported")} unsupported, ${count("timeout") + count("error")} failed.

| Check | Status | FLIP mean | FLIP p95 |${parity ? ` Parity vs ${parity.id} |` : ""}
| --- | --- | --- | --- |${parity ? " --- |" : ""}
${rows
  .filter((r) => r.status !== "pass")
  .map(
    (r) =>
      `| ${r.id} | ${r.status}${r.approved ? " (approved)" : ""} | ${r.flip ? r.flip.mean.toFixed(4) : "–"} | ${r.flip ? r.flip.p95.toFixed(4) : "–"} |${parity ? ` ${r.parity ? r.parity.mean.toFixed(3) : "–"} |` : ""}`,
  )
  .join("\n")}
`,
  );
  console.log(`images: ${file}`);
  return failed.length;
}
