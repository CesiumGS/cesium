// The handbook's build (DESIGN.md): one self-contained HTML file, so it can be
// opened from disk, attached or hosted anywhere with nothing beside it.
//
//   npm run handbook        data, typecheck, then handbook/dist/index.html
//   npm run handbook:dev    the same page on a dev server (--port is yours)
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Moves the built script and styles into the page. */
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
      page.source = html;
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
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
