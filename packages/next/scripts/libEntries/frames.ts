// The library build's entry for `@cesium/next/frames`: the frames entry point
// under another module, so that `src/frames/index.ts` is not an entry itself.
//
// A bundler puts a module in the chunk of the entry points that reach it. The
// widgets import `attachSky`, `createFrameCatalog` and the rest from the
// frames entry point, and when `src/frames/index.ts` is itself an entry it
// can't be skipped, so everything it re-exports counts as reached from the
// widgets: the IAU series, the DAF reader and trajectories shared a chunk
// with the analytic catalog and loaded with the page. Behind this file the
// index is a re-export module only, and the widgets link to the modules that
// declare what they use. This entry still exports exactly the index's names.
export * from "../../src/frames/index.ts";
