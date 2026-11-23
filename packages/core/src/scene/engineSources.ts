/**
 * An engine's content sources (CS-847): the runtime of src/source/ over the
 * engine's worker pool, wake, fetch provider, clocks and views. Sources see
 * none of this; they see their `SourceHost`.
 *
 * A source's clock (CS-960 A) is its content's world's scene clock
 * (`Engine.cameras.setClock`), the one picks and camera records read: UTC
 * seconds since 1970, 0 while the world has none. Wall time is the engine's
 * (`Engine.time`), apart. Neither is stepped until CS-816's stepped clock
 * lands; a test passes its own clock to `SourceRuntime`.
 */
import { FetchProvider } from "../io/fetchProvider.ts";
import type { SourceContent } from "../source/content.ts";
import { SourceRuntime } from "../source/runtime.ts";
import type { SourceClock, SourceView } from "../source/types.ts";
import type { Engine } from "./Engine.ts";
import type { World } from "./World.ts";

/** The runtime for `engine` (`Engine.sources`). */
export function engineSources(
  engine: Engine,
  report: (message: string) => void,
): SourceRuntime {
  const clock = (content: SourceContent): SourceClock => {
    const world = content.world as World | undefined;
    return {
      seconds: (world && engine.cameras.clock(world)?.seconds) ?? 0,
      epoch: "1970-01-01T00:00:00Z",
      timeScale: "UTC",
      wallSeconds: engine.time,
      stepped: false,
    };
  };
  return new SourceRuntime({
    pool: engine.scene.workers,
    wake: () => engine.wake(),
    fetch: () => FetchProvider.default,
    clock,
    report,
    itemKeyTaken: (key) =>
      engine.worlds.some((world) => world.identities.holdsItemKey(key)),
    views: (content) => {
      // Every view that one of its shown items draws in.
      const mask = content.viewMask;
      if (mask === 0) {
        return [];
      }
      const out: SourceView[] = [];
      for (const view of engine.views) {
        if (
          view.world !== (content.world as unknown) ||
          !view.enabled ||
          (engine.viewBit(view) & mask) === 0
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
              clock(content).seconds, // scene time, as a pick's record has
            );
          },
        });
      }
      return out;
    },
  });
}
