// A Vite module runner for setup's design-globe generator (plan 4b Task 14).
// The generator imports the library's TypeScript, and Node's type stripping
// can't load all of it: the frames layer uses parameter properties, and
// `geographiclib-geodesic` is CommonJS that Node can't give named exports
// for. Vite transforms the TypeScript, as the dev server and Vitest do, and
// the CommonJS package is served through a small ES module that `require`s
// it. Nothing is written to disk (no dependency optimization).
import { createRequire } from "node:module";
import { createRunnableDevEnvironment, resolveConfig } from "vite";

/** CommonJS packages the library imports by name. */
const COMMONJS = ["geographiclib-geodesic"];
const PREFIX = "\0commonjs:";

/**
 * A runner over `root` (the package): `import(path)` loads a module and its
 * TypeScript imports; `close()` ends it. Keep it open while the imported
 * code runs: it loads Node built-ins on demand through the runner.
 *
 * @param {string} root
 * @returns {Promise<{ import(path: string): Promise<any>, close(): Promise<void> }>}
 */
export async function moduleRunner(root) {
  const require = createRequire(import.meta.url);
  const commonjs = {
    name: "design-tiles-commonjs",
    enforce: "pre",
    resolveId(id) {
      return COMMONJS.includes(id) ? `${PREFIX}${id}` : undefined;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) {
        return undefined;
      }
      const name = id.slice(PREFIX.length);
      const exported = Object.keys(require(name)).filter((key) =>
        /^[A-Za-z_$][\w$]*$/.test(key),
      );
      return [
        `import { createRequire } from "node:module";`,
        `const pkg = createRequire(${JSON.stringify(import.meta.url)})(${JSON.stringify(name)});`,
        `export default pkg;`,
        ...exported.map((key) => `export const ${key} = pkg.${key};`),
      ].join("\n");
    },
  };
  const config = await resolveConfig(
    {
      configFile: false,
      envDir: false,
      root,
      logLevel: "warn",
      plugins: [commonjs],
      optimizeDeps: { noDiscovery: true, include: [] },
      environments: {
        designTiles: {
          consumer: "server",
          dev: { moduleRunnerTransform: true },
          optimizeDeps: { noDiscovery: true, include: [] },
          resolve: {
            external: true,
            noExternal: COMMONJS,
            mainFields: [],
            conditions: ["node"],
          },
        },
      },
    },
    "serve",
  );
  const environment = createRunnableDevEnvironment("designTiles", config, {
    runnerOptions: { hmr: { logger: false } },
    hot: false,
  });
  await environment.init();
  return {
    import: (path) => environment.runner.import(path),
    close: () => environment.close(),
  };
}
