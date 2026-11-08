// The frame data the measure tool's `measure` needs (plan 4b Task 19): the
// Earth orientation and the leap seconds, for the accuracy statement, from
// the viewer's catalog (`viewer.frames.tree()`; plan 5a's call 45; about 5 MB
// from the store), reported as a loading item: missing data gives the setup
// command, an error Retry.
import type {
  DesignPoint,
  EngineeringFrame,
} from "../../src/engineering/EngineeringFrame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { measure, type Measurement } from "../../src/measure/measure.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { Viewer } from "@cesium/next/widgets";
import type { LoadEvent } from "./page.ts";

/** A `measure` that ran: its result, or why it failed. */
export type MeasureOutcome =
  | { readonly m: Measurement; readonly error?: undefined }
  | { readonly m?: undefined; readonly error: string };

export interface MeasureFramesDeps {
  readonly viewer: Viewer;
  report(event: LoadEvent): void;
  disposed(): boolean;
  /** The frame data is in: measure again. */
  loaded(): void;
  /** It failed (reported, with Retry). */
  failed(): void;
}

export interface MeasureFrames {
  load(): Promise<void>;
  /** Loads again after a failure. */
  retry(): void;
  loaded(): boolean;
  /** Why it failed, if it did. */
  failed(): string | undefined;
  /**
   * `measure` between two design points of `frame`, at the clock's time:
   * its result, or why it failed; undefined until the frame data is in.
   */
  measure(
    frame: EngineeringFrame,
    a: DesignPoint,
    b: DesignPoint,
  ): MeasureOutcome | undefined;
}

export function createMeasureFrames(deps: MeasureFramesDeps): MeasureFrames {
  let frames: Frames | undefined;
  let framesLoad: Promise<void> | undefined;
  let framesFailed: string | undefined;
  function loadFrames(): Promise<void> {
    framesLoad ??= (async () => {
      const id = "frames";
      deps.report({
        type: "start",
        id,
        label: "Earth orientation and leap seconds, for measure",
      });
      try {
        const off = deps.viewer.frames.events.on("progress", (p) =>
          deps.report({
            type: "progress",
            id,
            file: p.item,
            received: p.received,
            ...(p.total !== undefined && { total: p.total }),
          }),
        );
        let tree: Frames;
        try {
          tree = await deps.viewer.frames.tree();
        } finally {
          off();
        }
        if (deps.disposed()) {
          return;
        }
        frames = tree;
        framesFailed = undefined;
        deps.report({ type: "ready", id });
        deps.loaded();
      } catch (error) {
        if (deps.disposed()) {
          return;
        }
        framesLoad = undefined;
        framesFailed = error instanceof Error ? error.message : String(error);
        deps.report({
          type: /404|manifest|not found/i.test(framesFailed)
            ? "missing"
            : "error",
          id,
          detail: framesFailed,
          ...(/404|manifest|not found/i.test(framesFailed) && {
            command: "npm run setup",
          }),
        });
        deps.failed();
      }
    })();
    return framesLoad;
  }

  /** `measure` between two design points of `frame`, at the clock's time. */
  function measureDesign(
    frame: EngineeringFrame,
    a: DesignPoint,
    b: DesignPoint,
  ): MeasureOutcome | undefined {
    if (frames === undefined) {
      return undefined;
    }
    const alignment = frame.alignments[0]?.name;
    try {
      return {
        m: measure(
          a,
          b,
          Instant.fromUtc(deps.viewer.clock.time, frames.data.leapSeconds),
          frames,
          { signal: false, ...(alignment !== undefined && { alignment }) },
        ),
      };
    } catch (error) {
      // Shown where the measurement would be, with Retry: never swallowed.
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  return {
    load: loadFrames,
    retry() {
      if (framesFailed !== undefined) {
        void loadFrames();
      }
    },
    loaded: () => frames !== undefined,
    failed: () => framesFailed,
    measure: measureDesign,
  };
}
