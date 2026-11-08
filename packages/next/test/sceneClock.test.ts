// The scene clock interface (plan 5a Task 7): what the camera layer and the
// animation core read of the time library's Clock.
import { expect, it } from "vitest";
import type { SceneClock } from "../src/core/sceneClock.ts";
import { Clock, Instant, LeapSeconds } from "../src/time/index.ts";

const start = Date.UTC(2026, 3, 2);

it("Clock is a SceneClock", () => {
  const clock: SceneClock = new Clock({ time: start, rate: 60 });
  expect(clock.seconds).toBe(start / 1000);
  expect(clock.rate).toBe(60);
  expect(clock.paused).toBe(true);
  expect(clock.change).toBe("steady");
});

it("says how time last changed", () => {
  const clock = new Clock({ time: start, rate: 60 });
  clock.mode = "playing";
  expect(clock.paused).toBe(false);
  clock.tick(0);
  clock.tick(16);
  expect(clock.change).toBe("steady");
  clock.time = 0;
  expect(clock.change).toBe("jump");
  clock.rate = -60;
  clock.tick(32);
  clock.tick(48);
  expect(clock.change).toBe("reverse");
  clock.rate = 60;
  clock.tick(64);
  expect(clock.change).toBe("steady");
  clock.mode = "paused";
  clock.mode = "live";
  expect(clock.change).toBe("jump");
});

it("turns scene seconds into an Instant through its leap table", () => {
  const clock = new Clock({ time: start });
  const s = start / 1000 + 0.5;
  expect(clock.instant(s).tt).toBe(
    Instant.fromUtc(s * 1000, LeapSeconds.builtIn()).tt,
  );
  expect(clock.instant().tt).toBe(
    Instant.fromUtc(start, LeapSeconds.builtIn()).tt,
  );
  const table = LeapSeconds.fromIers(
    "#File expires on 28 December 2099\n57754 1 1 2017 37\n",
  );
  clock.leapSeconds = table;
  expect(clock.leapSeconds).toBe(table);
});

it("watch calls once per change and its remover stops it", () => {
  const clock = new Clock({ time: start, mode: "playing" });
  let calls = 0;
  const stop = clock.watch(() => calls++);
  clock.tick(0);
  clock.tick(16);
  clock.time = 5;
  expect(calls).toBe(2);
  stop();
  clock.time = 6;
  expect(calls).toBe(2);
});
