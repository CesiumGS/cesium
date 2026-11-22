// The subset reader as one module, the way the other two readers arrive
// (one file a worker imports): serve.mjs bundles this with esbuild. It
// opens a stage from files in memory and returns its records. Spike code
// for CS-900; not part of @cesium/next.

import { loadLayers, Stage, type AssetIo } from "../usd-subset/compose.ts";
import type { StageRecord } from "./facts.ts";
import { subsetRecords } from "./subsetRecords.ts";

/** A composed stage, and how to describe it once timing is done. */
export interface Opened {
  describe(): StageRecord;
}

export async function open(
  files: ReadonlyMap<string, Uint8Array>,
  root: string,
): Promise<Opened> {
  const io: AssetIo = {
    read: (p) => Promise.resolve(files.get(p)),
    exists: (p) => Promise.resolve(files.has(p)),
  };
  const layers = await loadLayers(root, io);
  const stage = new Stage(layers, root);
  const prim = stage.compose();
  return {
    describe: () =>
      subsetRecords(
        stage,
        prim,
        [...layers.values()]
          .filter((l) => l.error)
          .map((l) => `${l.id}: ${l.error}`),
      ),
  };
}
