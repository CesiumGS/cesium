/**
 * An engine's content sources (CS-847): the runtime of src/source/ over the
 * engine's worker pool, wake, fetch provider, clock and views. Sources see
 * none of this; they see their `SourceHost`.
 *
 * The clock is the engine's real time until CS-816's stepped clock lands;
 * a test passes its own to `SourceRuntime`.
 */
import { FetchProvider } from "../io/fetchProvider.ts";
import { SourceRuntime } from "../source/runtime.ts";
import type { SourceView } from "../source/types.ts";
import type { Engine } from "./Engine.ts";

/** The runtime for `engine` (`Engine.sources`). */
export function engineSources(
  engine: Engine,
  report: (message: string) => void,
): SourceRuntime {
  const clock = () => ({ seconds: engine.time, stepped: false });
  return new SourceRuntime({
    pool: engine.scene.workers,
    wake: () => engine.wake(),
    fetch: () => FetchProvider.default,
    clock,
    report,
    views: (content) => {
      const item = content.item;
      if (!item) {
        return [];
      }
      const out: SourceView[] = [];
      for (const view of engine.views) {
        if (
          view.world !== (content.world as unknown) ||
          !view.enabled ||
          (engine.viewBit(view) & item.viewMask) === 0
        ) {
          continue;
        }
        out.push({
          id: engine.scene.viewIds.get(view)!,
          camera: () => {
            const rect = view.pixelRect();
            return view.camera.record(
              rect.width,
              rect.height,
              engine.cameras.root(view),
              clock().seconds,
            );
          },
        });
      }
      return out;
    },
  });
}
