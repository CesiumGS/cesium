// A source whose content is what its kind receives (test/sourceSeam.test.ts,
// T4): one row, keyed "x", whose property `content` is its kind's ID, every
// query parameter of its URL but its declared credential's own, and its
// options, as JSON. So two opens give different content exactly when one of
// those differs, and a declared credential's value never changes it.
import type {
  ContentSource,
  ResolvedAsset,
  SourceHost,
  SourceKind,
  SourceTick,
} from "../../../packages/core/src/source/types.ts";
import { READ_ONLY } from "../../../packages/core/src/source/editing.ts";

/** What an echo source's row says: its kind, its query and its options. */
export function echoContent(kind: string, asset: ResolvedAsset): string {
  const own = new Set(
    Object.keys(asset.credentials?.query ?? {}).map((n) => n.toLowerCase()),
  );
  const query = [...asset.url.searchParams]
    .filter(([name]) => !own.has(name.toLowerCase()))
    .sort(([a, x], [b, y]) =>
      a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0,
    );
  const options = Object.entries(asset.options ?? {}).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return JSON.stringify([
    kind,
    `${asset.url.protocol}//${asset.url.host}${asset.url.pathname}`,
    query,
    options,
  ]);
}

export function echoKind(id: string): SourceKind {
  return {
    id,
    accepts: (asset) => asset.kind === id,
    open: (asset, host): ContentSource => {
      let written = false;
      return {
        kind: id,
        capabilities: {
          selection: "whole",
          outputs: ["features"],
          settles: true,
          pushes: false,
          write: READ_ONLY,
        },
        ready: Promise.resolve(),
        credits: [],
        update(_tick: SourceTick) {
          if (written) {
            return;
          }
          written = true;
          (host as SourceHost).sinks.features.put({
            key: "page",
            geometry: "point",
            crs: "EPSG:4978",
            count: 1,
            positions: new Float64Array(3),
            names: ["x"],
            properties: { content: [echoContent(id, asset)] },
          });
        },
        destroy() {},
      };
    },
  };
}

export default echoKind("echo");
