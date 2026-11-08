// The handbook's build (DESIGN.md): one self-contained HTML file, so it can be
// opened from disk, attached or hosted anywhere with nothing beside it.
//
//   npm run handbook        data, typecheck, then the one file to hand out:
//                           handbook/dist/cesium-2.0-handbook-<date>-<commit>.html
//   npm run handbook:dev    the same page on a dev server (--port is yours)
import { readFileSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { findSecrets } from "../scripts/handbookData.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));

/** The build's stamp, from the generated data. */
const meta = () =>
  (
    JSON.parse(readFileSync(join(here, "generated/data.json"), "utf8")) as {
      meta: { commit: string; generatedAt: string; dirty: boolean };
    }
  ).meta;

/**
 * Moves the built script and styles into the page, stamps it, refuses it if it
 * holds a secret, and names the file for handing out.
 */
function inlineIntoPage(): Plugin {
  return {
    name: "handbook-inline-into-page",
    enforce: "post",
    apply: "build",
    generateBundle(_options, bundle) {
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
          const code = output.code.replaceAll("</script", "<\\/script");
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
      const { commit, generatedAt, dirty } = meta();
      html = html.replace(
        "</head>",
        `<meta name="cesium-handbook-build" content="${generatedAt} ${commit}${dirty ? " plus uncommitted changes" : ""}"></head>`,
      );
      const secrets = findSecrets(html);
      if (secrets.length > 0) {
        this.error(`the page would hold ${secrets.join(", ")}`);
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

export default defineConfig({
  root: here,
  // Its own cache: a dev server sharing the default one replaces the other's
  // bundled dependencies, and that server's pages then fail with a 504.
  cacheDir: join(here, "../node_modules/.vite-handbook"),
  base: "./",
  // No env file reaches this build: the page is for handing out.
  envDir: false,
  publicDir: false,
  plugins: [inlineIntoPage()],
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
