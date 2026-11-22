// A load whose signal is already aborted leaves no rejected promise that
// nobody observes (CS-743). The manifest read starts before the abort is
// noticed; its rejection has to be handled even though the caller's wait
// never reaches it. An unobserved rejection makes `npm test` exit 1, and in
// a page it is an "Uncaught (in promise)" error.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadFrameManifest,
  loadFrameRoles,
  loadFrameRolesWith,
} from "../packages/next/src/ephemeris/frameRoles.ts";
import { loadFrameData } from "../packages/next/src/ephemeris/loadFrameData.ts";
import { sharedProviderLoad } from "../packages/next/src/frames/sharedLoads.ts";
import { nextTask } from "./frameStore.ts";

/** Unhandled rejections reported while `run` and the tasks after it settle. */
async function unhandledDuring(run: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const listener = (reason: unknown) => {
    seen.push(reason);
  };
  process.on("unhandledRejection", listener);
  try {
    await run();
    // Node reports an unhandled rejection once the microtasks have drained.
    await nextTask();
    await nextTask();
  } finally {
    process.off("unhandledRejection", listener);
  }
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a load with a signal that is already aborted", () => {
  const reason = new Error("stop");

  function stubFetch() {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("loadFrameRoles rejects with the reason, fetching nothing, and leaves nothing unobserved", async () => {
    const fetchMock = stubFetch();
    let error: unknown;
    const unhandled = await unhandledDuring(async () => {
      error = await loadFrameRoles("/frames-data/", ["eop"], {
        signal: AbortSignal.abort(reason),
      }).catch((e: unknown) => e);
    });
    expect(error).toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  it("loadFrameData rejects with the reason, fetching nothing, and leaves nothing unobserved", async () => {
    const fetchMock = stubFetch();
    let error: unknown;
    const unhandled = await unhandledDuring(async () => {
      error = await loadFrameData("/frames-data/", {
        signal: AbortSignal.abort(reason),
      }).catch((e: unknown) => e);
    });
    expect(error).toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  it("loadFrameRolesWith leaves a failed manifest observed, and rejects with the reason", async () => {
    stubFetch();
    const manifestFailure = new Error("manifest failed");
    // The manifest load is the loader's: it fails on its own, here, while
    // the caller's wait is already over.
    let error: unknown;
    const unhandled = await unhandledDuring(async () => {
      error = await loadFrameRolesWith(
        Promise.reject(manifestFailure),
        ["eop"],
        {
          signal: AbortSignal.abort(reason),
        },
      ).catch((e: unknown) => e);
    });
    expect(error).toBe(reason);
    expect(unhandled).toEqual([]);
  });

  it("the shared load rejects with the reason, starting no load and no fetch", async () => {
    const fetchMock = stubFetch();
    const load = vi.fn(async () => 1);
    let error: unknown;
    const unhandled = await unhandledDuring(async () => {
      try {
        await sharedProviderLoad(
          "test",
          "/frames-data/",
          AbortSignal.abort(reason),
          undefined,
          load,
        );
      } catch (e) {
        error = e;
      }
    });
    expect(error).toBe(reason);
    expect(load).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(unhandled).toEqual([]);
  });

  it("loadFrameManifest, given the same signal, rejects with the reason", async () => {
    const fetchMock = stubFetch();
    const error = await loadFrameManifest(
      "/frames-data/",
      AbortSignal.abort(reason),
    ).catch((e: unknown) => e);
    expect(error).toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
