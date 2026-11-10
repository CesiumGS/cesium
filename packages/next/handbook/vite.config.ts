// The handbook's build (DESIGN.md): one self-contained HTML file, so it can be
// opened from disk, attached or hosted anywhere with nothing beside it.
//
//   npm run handbook        data, typecheck, then the one file to hand out:
//                           handbook/dist/cesium-2.0-handbook-<date>-<commit>.html
//   npm run handbook:dev    the same page on a dev server (--port is yours)
import { execFile } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build, defineConfig, type Plugin } from "vite";
import { basisTranscoderEsm } from "../basisTranscoderEsm.ts";
import { skyPackGuard } from "../scripts/vitePluginSkyPack.ts";
import { findSecrets, findUnembeddedImages } from "../scripts/handbookData.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));

/** The build's stamp, from the generated data. */
const meta = () =>
  (
    JSON.parse(readFileSync(join(here, "generated/data.json"), "utf8")) as {
      meta: { commit: string; generatedAt: string; dirty: boolean };
    }
  ).meta;

/**
 * Vite fills this placeholder after this config's plugins run. A single file
 * has nothing to preload, so it stays empty.
 */
const noPreload = (code: string) =>
  code.replaceAll("__VITE_PRELOAD__", "void 0");

/**
 * Moves the built script and styles into the page, stamps it, refuses it if it
 * holds a secret or needs an image beside it, and names the file for handing out.
 */
function inlineIntoPage(): Plugin {
  return {
    name: "handbook-inline-into-page",
    enforce: "post",
    apply: "build",
    async generateBundle(_options, bundle) {
      const page = bundle["index.html"];
      if (!page || page.type !== "asset" || typeof page.source !== "string") {
        throw new Error("handbook: the build has no index.html");
      }
      let html = page.source;
      for (const [name, output] of Object.entries(bundle)) {
        if (output.type === "chunk") {
          const tag = new RegExp(
            `<script[^>]*src="[^"]*${name.replace(/^.*\//, "")}"[^>]*></script>`,
          );
          // A replacer function: `$` in the code stays literal.
          const code = noPreload(output.code).replaceAll(
            "</script",
            "<\\/script",
          );
          html = html.replace(tag, "");
          html = html.replace(
            "</body>",
            () => `<script type="module">${code}</script></body>`,
          );
          delete bundle[name];
        } else if (name.endsWith(".css")) {
          const tag = new RegExp(
            `<link[^>]*href="[^"]*${name.replace(/^.*\//, "")}"[^>]*>`,
          );
          const css = String(output.source).replaceAll("</style", "<\\/style");
          html = html.replace(tag, () => `<style>${css}</style>`);
          delete bundle[name];
        }
      }
      // Inert text until a reader starts the live view: nothing parses it.
      const engine = (await buildLiveEngine())
        .replaceAll("</script", "<\\/script")
        .replaceAll("<!--", "<\\!--");
      const reel = reelData();
      html = html.replace(
        "</body>",
        () =>
          `<script type="text/plain" id="live-engine">${engine}</script>` +
          `<script type="text/plain" id="reel-index">${reel.index}</script>` +
          `<script type="text/plain" id="reel-data">${reel.block}</script></body>`,
      );
      const { commit, generatedAt, dirty } = meta();
      html = html.replace(
        "</head>",
        `<meta name="cesium-handbook-build" content="${generatedAt} ${commit}${dirty ? " plus uncommitted changes" : ""}"></head>`,
      );
      const secrets = findSecrets(html);
      if (secrets.length > 0) {
        this.error(`the page would hold ${secrets.join(", ")}`);
      }
      const left = [
        ...Object.keys(bundle).filter((name) =>
          /\.(?:webp|png|jpe?g|gif|svg|avif)$/i.test(name),
        ),
        ...findUnembeddedImages(html),
      ];
      if (left.length > 0) {
        this.error(`the page would need images beside it: ${left.join(", ")}`);
      }
      page.source = html;
    },
    writeBundle({ dir = "dist" }) {
      const { commit, generatedAt, dirty } = meta();
      const name = `cesium-2.0-handbook-${generatedAt.slice(0, 10)}-${commit}${dirty ? "-dirty" : ""}.html`;
      renameSync(join(dir, "index.html"), join(dir, name));
      const mb = statSync(join(dir, name)).size / (1024 * 1024);
      console.log(`handbook: dist/${name}, ${mb.toFixed(2)} MB`);
    },
  };
}

/**
 * What the reel embeds, from the setup store: its imagery, the ground, the
 * model, the sky's data and a coarse cut of the corridor's tiles. One base64
 * block with an index, inert text until a reader starts the reel. It fails if
 * the data isn't there: `npm run setup`, then `node handbook/reel/fetchData.mjs`.
 */
function reelData(): { index: string; block: string } {
  const root =
    process.env.FRAMES_DATA_DIR ?? join(homedir(), ".cesium-bench/frames");
  const store = join(dirname(root), "handbook-reel");
  const parts: { path: string; bytes: Buffer }[] = [];
  const add = (path: string, bytes: Buffer) => parts.push({ path, bytes });
  const walk = (folder: string) => {
    for (const entry of readdirSync(join(store, folder), {
      withFileTypes: true,
    })) {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
      } else {
        add(path, readFileSync(join(store, path)));
      }
    }
  };
  if (!existsSync(join(store, "dem.json"))) {
    throw new Error(
      `handbook: no reel data in ${store}: run node handbook/reel/fetchData.mjs`,
    );
  }
  walk("day");
  walk("night");
  add("dem.json", readFileSync(join(store, "dem.json")));
  add("dem.f32", readFileSync(join(store, "dem.f32")));
  add("ToyCar.glb", readFileSync(join(store, "ToyCar.glb")));
  add("planets.pack", readFileSync(join(root, "planets-de440-2000-2050.pack")));
  add("moon.pack", readFileSync(join(root, "moon-pa-de440-2000-2050.pack")));
  add("EOP-All.csv", readFileSync(join(root, "EOP-All.csv")));

  // The corridor down to a level that reads well from a kilometre away.
  const corridor = join(root, "design-globe-dual/corridor");
  const description = JSON.parse(
    readFileSync(join(corridor, "tileset.json"), "utf8"),
  ) as {
    extensionsUsed?: string[];
    extensions?: Record<string, unknown>;
    root: ReelNode;
  };
  description.extensionsUsed = ["CESIUM_dual_position"];
  description.extensions = {
    CESIUM_dual_position: description.extensions?.CESIUM_dual_position,
  };
  const prune = (node: ReelNode, depth: number) => {
    if (node.content) {
      add(
        `corridor/${node.content.uri}`,
        readFileSync(join(corridor, node.content.uri)),
      );
    }
    if (depth >= REEL_DEPTH) {
      delete node.children;
    } else {
      for (const child of node.children ?? []) {
        prune(child, depth + 1);
      }
    }
  };
  prune(description.root, 0);
  add("corridor/tileset.json", Buffer.from(JSON.stringify(description)));
  const answers = JSON.parse(
    readFileSync(join(root, "design-globe-dual/answers.json"), "utf8"),
  ) as {
    points: {
      station: number;
      offset: number;
      bodyFixed: number[];
      displayError: number;
      geodetic: { longitude: number; latitude: number };
    }[];
  };
  add(
    "corridor/points.json",
    Buffer.from(
      JSON.stringify(
        answers.points
          .filter((p) => p.offset === 0)
          .map((p) => ({
            s: p.station,
            lon: (p.geodetic.longitude * 180) / Math.PI,
            lat: (p.geodetic.latitude * 180) / Math.PI,
            p: p.bodyFixed,
            e: p.displayError,
          })),
      ),
    ),
  );

  let offset = 0;
  const index: Record<string, [number, number]> = {};
  for (const part of parts) {
    index[part.path] = [offset, part.bytes.length];
    offset += part.bytes.length;
  }
  return {
    index: JSON.stringify(index),
    block: Buffer.concat(parts.map((p) => p.bytes)).toString("base64"),
  };
}

interface ReelNode {
  content?: { uri: string };
  children?: ReelNode[];
}

/** The tree's levels the reel takes: its root holds the first level's content. */
const REEL_DEPTH = 4;

/**
 * Swaps two engine modules for the live view's: its workers, which a page
 * opened from disk can't start, and its Slang compiler, which it doesn't use.
 */
function liveViewModules(): Plugin {
  return {
    name: "handbook-live-view-modules",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer?.includes("/src/")) {
        return null;
      }
      if (/\/WorkerPool\.ts$/.test(source)) {
        return join(here, "viewer/workerPool.ts");
      }
      if (/\/slang\.ts$/.test(source)) {
        return join(here, "viewer/slang.ts");
      }
      return null;
    },
  };
}

/** The live view's engine, as one module's text, built apart from the page. */
async function buildLiveEngine(): Promise<string> {
  const result = await build({
    configFile: false,
    root: here,
    envDir: false,
    publicDir: false,
    logLevel: "warn",
    plugins: [liveViewModules(), basisTranscoderEsm(), skyPackGuard()],
    build: {
      write: false,
      target: "es2023",
      assetsInlineLimit: 100_000_000,
      modulePreload: false,
      rollupOptions: {
        input: join(here, "viewer/main.ts"),
        preserveEntrySignatures: "strict",
        output: { format: "es", codeSplitting: false },
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const chunk = outputs
    .flatMap((o) => ("output" in o ? o.output : []))
    .find((o) => o.type === "chunk");
  if (!chunk || chunk.type !== "chunk") {
    throw new Error("handbook: the live engine didn't build");
  }
  return noPreload(chunk.code);
}

/**
 * Keeps the generated data current in development. Vite restarts this server
 * when the data script changes, since this file imports it, so the data is
 * regenerated at each start and arrives over hot reload.
 */
function regenerateData(): Plugin {
  return {
    name: "handbook-regenerate-data",
    apply: "serve",
    configureServer(server) {
      execFile(
        process.execPath,
        [join(here, "../scripts/handbookData.mjs"), "--no-bundles"],
        (error) => {
          if (error) {
            server.config.logger.error(
              `handbook: the data didn't regenerate: ${error.message}`,
            );
          }
        },
      );
    },
  };
}

export default defineConfig({
  root: here,
  // Its own cache: a dev server sharing the default one replaces the other's
  // bundled dependencies, and that server's pages then fail with a 504.
  cacheDir: join(here, "../node_modules/.vite-handbook"),
  base: "./",
  // No env file reaches this build: the page is for handing out.
  envDir: false,
  publicDir: false,
  plugins: [
    liveViewModules(),
    skyPackGuard(),
    inlineIntoPage(),
    regenerateData(),
  ],
  server: { host: "127.0.0.1", strictPort: true },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2023",
    // Everything in the one file.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { codeSplitting: false } },
  },
});
