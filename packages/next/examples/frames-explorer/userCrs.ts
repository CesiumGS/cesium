// "Try your own" (R18): an ion asset on the globe for context, and the
// bound-CRS checks on the user's WKT2 in the worker, queued with the
// catalog's runs. The token goes to the viewer's tileset request only;
// every message is scrubbed of it.
import type { StressResult } from "./tests.ts";
import type { UserCrsView } from "./panel/model.ts";
import { isAbort, messageOf, type PageCore } from "./page.ts";
import type { RunQueue } from "./runQueue.ts";

export interface UserCrs {
  view(): UserCrsView;
  results(): readonly StressResult[];
  /** Fetches ion asset `id` onto the globe. */
  showAsset(id: string): Promise<void>;
  /** Runs the bound-CRS checks on `wkt2`, after any run going on. */
  run(wkt2: string): Promise<void>;
  dispose(): void;
}

export function createUserCrs(deps: {
  core: Pick<
    PageCore,
    "viewer" | "client" | "invalidate" | "disposed" | "scrub"
  >;
  runs: RunQueue;
  token: string | undefined;
  /** The deep link's iModel, if any. */
  imodel: string | undefined;
  camera: {
    /** An asset fetch starts: a token for `frameIfStill`. */
    ask(): number;
    /** Frames the asset with `zoom` if no flight or view picked since `token` owns the camera. */
    frameIfStill(token: number, zoom: () => void): void;
  };
  /** The results changed: the links' known results follow (R15). */
  updateKnown(): void;
}): UserCrs {
  const { viewer, client, invalidate, disposed, scrub } = deps.core;
  const { token } = deps;
  let userResults: StressResult[] = [];
  let userCrs: UserCrsView =
    deps.imodel !== undefined
      ? { state: "idle", id: deps.imodel }
      : { state: "idle" };
  let assetTileset: Awaited<ReturnType<typeof viewer.addTileset>> | undefined;

  async function showAsset(id: string): Promise<void> {
    if (token === undefined || !/^\d{1,12}$/.test(id)) {
      return;
    }
    // Framed on arrival only if nothing has moved the camera meanwhile.
    const asked = deps.camera.ask();
    userCrs = { state: "fetching", id };
    invalidate();
    try {
      if (assetTileset) {
        viewer.remove(assetTileset);
        assetTileset = undefined;
      }
      const tileset = await viewer.addTileset({
        ion: Number(id),
        accessToken: token,
      });
      if (disposed()) {
        return;
      }
      assetTileset = tileset;
      // On the Earth's surface: the globe controls, unless a flight or a
      // view picked since owns the camera and its controls.
      deps.camera.frameIfStill(asked, () => viewer.zoomTo(tileset));
      userCrs = {
        state: "noCrs",
        id,
        message: `Asset ${id} is on the globe for context. ion has no CRS for it: its tileset is already placed in Earth-fixed coordinates, and neither ion's metadata nor the tileset names the CRS it came from.`,
      };
    } catch (error) {
      if (disposed()) {
        return;
      }
      userCrs = {
        state: "error",
        id,
        message: `Asset ${id} didn't load: ${scrub(messageOf(error))}`,
      };
    }
    invalidate();
  }

  /** "Try your own" waits for any run going on, as the catalog's runs do. */
  function run(wkt2: string): Promise<void> {
    userCrs = { ...userCrs, state: "running" };
    invalidate();
    return deps.runs.run(() => runNow(wkt2));
  }

  async function runNow(wkt2: string): Promise<void> {
    if (disposed()) {
      return;
    }
    userResults = [];
    invalidate();
    try {
      const out: StressResult[] = [];
      await client.userCrs(wkt2, "Your CRS", (r) => {
        out.push(r);
      });
      if (disposed()) {
        return;
      }
      userResults = out;
      const name = /^\s*\w+\s*\[\s*"([^"]{1,120})"/.exec(wkt2)?.[1];
      userCrs = {
        ...userCrs,
        state: "done",
        ...(name !== undefined && { crsName: name }),
      };
      deps.updateKnown();
    } catch (error) {
      if (isAbort(error) || disposed()) {
        return;
      }
      userCrs = {
        ...userCrs,
        state: "error",
        message: `The checks didn't run: ${scrub(messageOf(error))}`,
      };
    }
    invalidate();
  }

  return {
    view: () => userCrs,
    results: () => userResults,
    showAsset,
    run,
    dispose: () => {
      if (assetTileset) {
        viewer.remove(assetTileset);
      }
    },
  };
}
