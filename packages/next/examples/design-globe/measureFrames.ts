// The frame data the measure tool's `measure` needs (plan 4b Task 19): the
// Earth orientation and the leap seconds, for the accuracy statement, from
// the viewer's own frame data or else the store's (about 5 MB), reported as
// a loading item: missing data gives the setup command, an error Retry.
import type {
  DesignPoint,
  EngineeringFrame,
} from "../../src/engineering/EngineeringFrame.ts";
import { loadFrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames, type Frames } from "../../src/frames/frames.ts";
import { measure, type Measurement } from "../../src/measure/measure.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { LeapSeconds } from "../../src/time/leapSeconds.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { LoadEvent } from "./page.ts";

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
  /** `measure` between two design points of `frame`, at the clock's time. */
  measure(
    frame: EngineeringFrame,
    a: DesignPoint,
    b: DesignPoint,
  ): Measurement | undefined;
}

export function createMeasureFrames(deps: MeasureFramesDeps): MeasureFrames {
  let frames: { frames: Frames; leap: LeapSeconds } | undefined;
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
        const given = await deps.viewer.frameData;
        const data =
          given ??
          (await loadFrameData("/frames-data/", (file, received, total) =>
            deps.report({
              type: "progress",
              id,
              file,
              received,
              ...(total !== undefined && { total }),
            }),
          ));
        if (deps.disposed()) {
          return;
        }
        frames = { frames: createFrames(data), leap: data.leapSeconds };
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
  ): Measurement | undefined {
    if (frames === undefined) {
      return undefined;
    }
    const alignment = frame.alignments[0]?.name;
    try {
      return measure(
        a,
        b,
        Instant.fromUtc(deps.viewer.clock.time, frames.leap),
        frames.frames,
        { signal: false, ...(alignment !== undefined && { alignment }) },
      );
    } catch (error) {
      console.warn(
        `design globe: measure failed (${error instanceof Error ? error.message : String(error)})`,
      );
      return undefined;
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
