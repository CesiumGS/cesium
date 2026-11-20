// What a person is told when a store `npm run setup` (or `npm run sky --
// build`) filled was built in an older format (scripts/dataFormats.mjs):
//  - the dev server prints one line for each at start-up and serves the list
//    at `/data-status.json`, which Dyno shows with its problems;
//  - a data test (`npm run test:data`) whose dataset is out of date is
//    replaced by one skipped test named with the same sentence, so the run
//    reports "out of date: run `npm run setup`" for it, not a failure of the
//    change under test. A dataset that is missing still fails, as it did.
import { basename } from "node:path";
import type { Plugin } from "vitest/config";
import { datasetStatuses, outOfDateReason } from "./dataStatus.mjs";

/** A data test file: `test/data/<name>.test.ts`. */
const DATA_TEST = /[\\/]test[\\/]data[\\/][^\\/]+\.test\.ts$/;

/** The dev server's list and notice, and the skipped data tests. */
export function dataStatus(options: { notify: boolean }): Plugin {
  const stale = () =>
    datasetStatuses().filter((status) => status.state === "outOfDate");
  return {
    name: "data-status",
    enforce: "pre",
    configResolved() {
      if (!options.notify) {
        return;
      }
      for (const status of stale()) {
        console.warn((status as { message: string }).message);
      }
    },
    configureServer(server) {
      server.middlewares.use("/data-status.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(datasetStatuses()));
      });
    },
    // Vitest caches transformed modules by their source: a test file's result
    // depends on the stores too, so they are part of its cache key.
    configureVitest({ defineCacheKeyGenerator }) {
      defineCacheKeyGenerator(({ id, sourceCode }) =>
        DATA_TEST.test(id.split("?")[0]!)
          ? `data-status:${outOfDateReason(sourceCode, stale()) ?? "current"}`
          : undefined,
      );
    },
    transform(code, id) {
      const file = id.split("?")[0]!;
      if (!DATA_TEST.test(file)) {
        return undefined;
      }
      const reason = outOfDateReason(code, stale());
      if (reason === undefined) {
        return undefined;
      }
      return {
        code: `import { describe, it } from "vitest";
describe(${JSON.stringify(basename(file))}, () => {
  it.skip(${JSON.stringify(reason)}, () => {});
});
`,
        map: null,
      };
    },
  };
}
