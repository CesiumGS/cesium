import type { FrameData } from "../ephemeris/loadFrameData.ts";
import { createSkyState, skyState, type SkyState } from "./sky.ts";

/**
 * The sky for one frames data (or none): `skyState` with the data held and
 * the last answer memoised by time. Changing the data drops the memo, so the
 * next `at` is computed from the new data even at the same instant.
 */
export class FrameSky {
  private data_: FrameData | undefined;
  private readonly state = createSkyState();
  private ms = Number.NaN;

  /** The data the sky is computed from; `undefined` is the analytic models. */
  get data(): FrameData | undefined {
    return this.data_;
  }

  /** Use `data` from the next `at` on; `undefined` returns to the analytic sky. */
  setData(data: FrameData | undefined): void {
    this.data_ = data;
    this.ms = Number.NaN;
  }

  /**
   * The sky at UTC `ms`. The returned state is shared: it is refilled by the
   * next call that has a different time or data.
   */
  at(ms: number): SkyState {
    if (ms !== this.ms) {
      skyState(ms, this.data_, this.state);
      this.ms = ms;
    }
    return this.state;
  }
}
