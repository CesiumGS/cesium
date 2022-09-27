import {
  Clock,
  FeatureDetection,
  Iso8601,
  JulianDate,
  VideoSynchronizer,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Core/VideoSynchronizer", function () {
  //Video textures do not work on Internet Explorer
  if (FeatureDetection.isInternetExplorer()) {
    return;
  }

  function loadVideo() {
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

    return element;
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

  it("Syncs time when looping", function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();
    clock.shouldAnimate = false;
    clock.currentTime = epoch.clone();

    const element = loadVideo();
    element.loop = true;

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
    });

    return pollToPromise(function () {
      clock.tick();
      return element.currentTime === 0;
    })
      .then(function () {
        clock.currentTime = JulianDate.addSeconds(epoch, 10, clock.currentTime);
        return pollToPromise(function () {
          clock.tick();
          return element.currentTime === 10;
        });
      })
      .then(function () {
        clock.currentTime = JulianDate.addSeconds(epoch, 60, clock.currentTime);
        return pollToPromise(function () {
          clock.tick();
          return CesiumMath.equalsEpsilon(
            element.currentTime,
            60 - element.duration,
            CesiumMath.EPSILON3
          );
        });
      })
      .then(function () {
        clock.currentTime = JulianDate.addSeconds(epoch, -1, clock.currentTime);
        return pollToPromise(function () {
          clock.tick();
          return CesiumMath.equalsEpsilon(
            element.currentTime,
            element.duration - 1,
            CesiumMath.EPSILON1
          );
        });
      })
      .then(function () {
        videoSynchronizer.destroy();
      });
  });

  it("Syncs time when not looping", function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();
    clock.shouldAnimate = false;
    clock.currentTime = epoch.clone();

    const element = loadVideo();

    const videoSynchronizer = new VideoSynchronizer({
      clock: clock,
      element: element,
      epoch: epoch,
    });

    return pollToPromise(function () {
      clock.tick();
      return element.currentTime === 0;
    })
      .then(function () {
        clock.currentTime = JulianDate.addSeconds(epoch, 10, clock.currentTime);
        return pollToPromise(function () {
          clock.tick();
          return element.currentTime === 10;
        });
      })
      .then(function () {
        clock.currentTime = JulianDate.addSeconds(epoch, 60, clock.currentTime);
        return pollToPromise(function () {
          clock.tick();
          return CesiumMath.equalsEpsilon(
            element.currentTime,
            element.duration,
            CesiumMath.EPSILON3
          );
        });
      })
      .then(function () {
        clock.currentTime = JulianDate.addSeconds(epoch, -1, clock.currentTime);
        return pollToPromise(function () {
          clock.tick();
          return element.currentTime === 0;
        });
      })
      .then(function () {
        videoSynchronizer.destroy();
      });
  });

  it("Plays/pauses video based on clock", function () {
    const epoch = JulianDate.fromIso8601("2015-11-01T00:00:00Z");
    const clock = new Clock();

    // Since Chrome doesn't allow video playback without user
    // interaction, we use a mock element.
    const element = jasmine.createSpyObj("MockVideoElement", [
      "addEventListener",
      "removeEventListener",
      "play",
      "pause",
    ]);
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
