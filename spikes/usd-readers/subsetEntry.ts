// The subset reader as one module, the way the other two readers arrive
// (one file a worker imports): serve.mjs bundles this with esbuild. It
// opens a stage from files in memory and returns its records. Spike code
// for CS-900; not part of @cesium/next.

import {
  loadLayers,
  quoted,
  Stage,
  type AssetIo,
} from "../usd-subset/compose.ts";
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
    describe: () => {
      // The composition's errors, in OpenUSD's words (a layer that fails
      // only when composed is named there); a root that doesn't open has
      // no composition to report from.
      const rootError = layers.get(root)?.error;
      return subsetRecords(stage, prim, [
        ...(rootError
          ? [
              `Could not open root layer @${quoted(root)}@: ${quoted(rootError)}.`,
            ]
          : []),
        ...stage.errors,
      ]);
    },
  };
}
