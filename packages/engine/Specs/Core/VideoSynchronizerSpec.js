import { Clock, Iso8601, JulianDate, Math as CesiumMath } from "@cesium/core";
import { VideoSynchronizer } from "../../index.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Core/VideoSynchronizer", function () {
  // Creates a video element and waits until it has data for the current frame.
  async function loadVideo() {
    const element = document.createElement("video");
    let source = document.createElement("source");
    source.setAttribute("src", "Data/Videos/big-buck-bunny-trailer-small.webm");
    source.setAttribute("type", "video/webm");
    element.appendChild(source);

    source = document.createElement("source");
    source.setAttribute("src", "Data/Videos/big-buck-bunny-trailer-small.mp4");
    source.setAttribute("type", "video/mp4");
    element.appendChild(source);

    source = document.createElement("source");
    source.setAttribute("src", "Data/Videos/big-buck-bunny-trailer-small.mov");
    source.setAttribute("type", "video/quicktime");
    element.appendChild(source);

    await pollToPromise(function () {
      return element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    });
    return element;
  }

  // Ticks the clock for the given time, and returns the smallest and largest
  // video times seen during the ticks.
  async function tickFor(clock, element, milliseconds) {
    const end = performance.now() + milliseconds;
    let minimumTime = element.currentTime;
    let maximumTime = element.currentTime;
    await pollToPromise(function () {
      clock.tick();
      minimumTime = Math.min(minimumTime, element.currentTime);
      maximumTime = Math.max(maximumTime, element.currentTime);
      return performance.now() > end;
    });
    return { minimumTime, maximumTime };
  }

  it("Can default construct", function () {
    const videoSynchronizer = new VideoSynchronizer();

    expect(videoSynchronizer.clock).not.toBeDefined();
    expect(videoSynchronizer.element).not.toBeDefined();
    expect(videoSynchronizer.epoch).toBe(Iso8601.MINIMUM_VALUE);
    expect(videoSynchronizer.tolerance).toBe(1.0);
    expect(videoSynchronizer.isDestroyed()).toBe(false);
    expect(videoSynchronizer.destroy()).not.toBeDefined();
    expect(videoSynchronizer.isDestroyed()).toBe(true);
  });

  it("Can construct with options", function () {
    const clock = new Clock();
    const element = document.createElement("video");
    const epoch = new JulianDate();
    const tolerance = 0.15;

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
      tolerance: tolerance,
    });

    expect(videoSynchronizer.clock).toBe(clock);
    expect(videoSynchronizer.element).toBe(element);
    expect(videoSynchronizer.epoch).toBe(epoch);
    expect(videoSynchronizer.tolerance).toBe(tolerance);
    expect(videoSynchronizer.isDestroyed()).toBe(false);
    expect(videoSynchronizer.destroy()).not.toBeDefined();
    expect(videoSynchronizer.isDestroyed()).toBe(true);
  });

  it("Syncs time when looping", async function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();
    clock.shouldAnimate = false;
    clock.currentTime = epoch.clone();

    const element = await loadVideo();
    element.loop = true;

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
    });

    await pollToPromise(function () {
      clock.tick();
      return element.currentTime === 0;
    });

    clock.currentTime = JulianDate.addSeconds(epoch, 10, clock.currentTime);
    await pollToPromise(function () {
      clock.tick();
      return element.currentTime === 10;
    });

    clock.currentTime = JulianDate.addSeconds(epoch, 60, clock.currentTime);
    await pollToPromise(function () {
      clock.tick();
      return CesiumMath.equalsEpsilon(
        element.currentTime,
        60 - element.duration,
        CesiumMath.EPSILON3,
      );
    });

    clock.currentTime = JulianDate.addSeconds(epoch, -1, clock.currentTime);
    await pollToPromise(function () {
      clock.tick();
      return CesiumMath.equalsEpsilon(
        element.currentTime,
        element.duration - 1,
        CesiumMath.EPSILON3,
      );
    });

    videoSynchronizer.destroy();
  });

  it("Syncs time when not looping", async function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();
    clock.shouldAnimate = false;
    clock.currentTime = epoch.clone();

    const element = await loadVideo();

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
    });

    await pollToPromise(function () {
      clock.tick();
      return element.currentTime === 0;
    });

    clock.currentTime = JulianDate.addSeconds(epoch, 10, clock.currentTime);
    await pollToPromise(function () {
      clock.tick();
      return element.currentTime === 10;
    });

    clock.currentTime = JulianDate.addSeconds(epoch, 60, clock.currentTime);
    await pollToPromise(function () {
      clock.tick();
      return CesiumMath.equalsEpsilon(
        element.currentTime,
        element.duration,
        CesiumMath.EPSILON3,
      );
    });

    clock.currentTime = JulianDate.addSeconds(epoch, -1, clock.currentTime);
    await pollToPromise(function () {
      clock.tick();
      return element.currentTime === 0;
    });

    videoSynchronizer.destroy();
  });

  it("Holds a video that does not loop on its last frame after the clock passes its end", async function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();
    clock.shouldAnimate = true;
    clock.currentTime = JulianDate.addSeconds(epoch, 60, new JulianDate());

    const element = await loadVideo();
    element.muted = true;

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
    });

    await pollToPromise(function () {
      clock.tick();
      return CesiumMath.equalsEpsilon(
        element.currentTime,
        element.duration,
        CesiumMath.EPSILON3,
      );
    });

    const { minimumTime } = await tickFor(clock, element, 500);
    expect(minimumTime).toEqualEpsilon(element.duration, CesiumMath.EPSILON3);
    expect(element.paused).toBe(true);

    videoSynchronizer.destroy();
  });

  it("Holds a video that does not loop on its first frame before the clock reaches its start", async function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();
    clock.shouldAnimate = true;
    clock.currentTime = JulianDate.addSeconds(epoch, -60, new JulianDate());

    const element = await loadVideo();
    element.muted = true;

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
    });

    const { maximumTime } = await tickFor(clock, element, 500);
    expect(maximumTime).toBe(0);
    expect(element.paused).toBe(true);

    videoSynchronizer.destroy();
  });

  it("Plays/pauses video based on clock", function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();
    clock.currentTime = epoch.clone();

    // Since Chrome doesn't allow video playback without user
    // interaction, we use a mock element.
    const element = jasmine.createSpyObj("MockVideoElement", [
      "addEventListener",
      "removeEventListener",
      "play",
      "pause",
    ]);
    element.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
    element.duration = 10.0;
    element.currentTime = 0.0;
    element.paused = false;
    element.play.and.callFake(function () {
      this.paused = false;
    });
    element.pause.and.callFake(function () {
      this.paused = true;
    });

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
    });

    clock.shouldAnimate = false;
    clock.tick();
    expect(element.pause.calls.count()).toEqual(1);

    clock.shouldAnimate = true;
    clock.tick();
    expect(element.play.calls.count()).toEqual(1);

    clock.shouldAnimate = false;
    clock.tick();
    expect(element.pause.calls.count()).toEqual(2);

    videoSynchronizer.destroy();
  });
});
