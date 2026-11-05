import type { Plugin } from "vite";
// @ts-expect-error -- a plain .mjs module, no declarations
import { compile, dependents, GENERATED } from "./slangBuild.mjs";
import { slangcPath } from "./slangTools.mjs";

/**
 * Dev: a `.slang` edit regenerates the WGSL it feeds (itself and the entry
 * sources importing it, into src/shaders/generated/), and Vite reloads
 * from that. The engine imports only the generated files, so without
 * slangc nothing breaks: edits just don't regenerate (said once).
 * CESIUM2_WEBGPU_PLAN.md §3.4, "Slang-first, for real", step 2.
 */
export function slangShaders(): Plugin {
  let warned = false;
  return {
    name: "cesium-slang-shaders",
    apply: "serve",
    configureServer(server) {
      server.watcher.on("change", (file: string) => {
        if (!file.endsWith(".slang") || file.startsWith(GENERATED)) {
          return;
        }
        const slangc = slangcPath();
        if (!slangc) {
          if (!warned) {
            warned = true;
            server.config.logger.warn(
              "[slang] no slangc (npm run setup, or SLANGC): .slang edits won't regenerate their WGSL.",
            );
          }
          return;
        }
        for (const source of dependents(file) as string[]) {
          try {
            compile(slangc, source);
            server.config.logger.info(
              `[slang] ${source.split("/src/")[1]} → generated`,
              {
                timestamp: true,
              },
            );
          } catch (e) {
            server.config.logger.error(
              `[slang] ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      });
    },
  };
}
