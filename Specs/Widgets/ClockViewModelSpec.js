import { Clock } from "../../Source/Cesium.js";
import { ClockRange } from "../../Source/Cesium.js";
import { ClockStep } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { ClockViewModel } from "../../Source/Cesium.js";

describe("Widgets/ClockViewModel", function () {
  it("default constructor creates a clock", function () {
    const clockViewModel = new ClockViewModel();
    expect(clockViewModel.clock).toBeDefined();
  });

  it("constructor sets expected properties", function () {
    const clock = new Clock();
    clock.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
    clock.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
    clock.currentTime = JulianDate.fromIso8601("2012-01-01T12:00:00");
    clock.multiplier = 1;
    clock.clockStep = ClockStep.TICK_DEPENDENT;
    clock.clockRange = ClockRange.UNBOUNDED;
    clock.shouldAnimate = false;

    const clockViewModel = new ClockViewModel(clock);
    expect(clockViewModel.clock).toBe(clock);
    expect(clockViewModel.startTime).toEqual(clock.startTime);
    expect(clockViewModel.stopTime).toEqual(clock.stopTime);
    expect(clockViewModel.currentTime).toEqual(clock.currentTime);
    expect(clockViewModel.multiplier).toEqual(clock.multiplier);
    expect(clockViewModel.clockStep).toEqual(clock.clockStep);
    expect(clockViewModel.clockRange).toEqual(clock.clockRange);
    expect(clockViewModel.systemTime).toBeDefined();
    expect(clockViewModel.shouldAnimate).toEqual(false);
  });

  it("observables are updated from the clock", function () {
    const clock = new Clock();
    clock.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
    clock.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
    clock.currentTime = JulianDate.fromIso8601("2012-01-01T12:00:00");
    clock.multiplier = 1;
    clock.clockStep = ClockStep.TICK_DEPENDENT;
    clock.clockRange = ClockRange.UNBOUNDED;
    clock.shouldAnimate = false;

    const clockViewModel = new ClockViewModel(clock);
    expect(clockViewModel.clock).toBe(clock);
    expect(clockViewModel.startTime).toEqual(clock.startTime);
    expect(clockViewModel.stopTime).toEqual(clock.stopTime);
    expect(clockViewModel.currentTime).toEqual(clock.currentTime);
    expect(clockViewModel.multiplier).toEqual(clock.multiplier);
    expect(clockViewModel.clockStep).toEqual(clock.clockStep);
    expect(clockViewModel.clockRange).toEqual(clock.clockRange);
    expect(clockViewModel.shouldAnimate).toEqual(clock.shouldAnimate);
    expect(clockViewModel.systemTime).toBeDefined();

    clock.startTime = JulianDate.fromIso8601("2013-01-01T00:00:00");
    clock.stopTime = JulianDate.fromIso8601("2013-01-02T00:00:00");
    clock.currentTime = JulianDate.fromIso8601("2013-01-01T12:00:00");
    clock.multiplier = 2;
    clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    clock.clockRange = ClockRange.CLAMPED;
    clock.shouldAnimate = true;

    expect(clockViewModel.startTime).not.toEqual(clock.startTime);
    expect(clockViewModel.stopTime).not.toEqual(clock.stopTime);
    expect(clockViewModel.currentTime).not.toEqual(clock.currentTime);
    expect(clockViewModel.multiplier).not.toEqual(clock.multiplier);
    expect(clockViewModel.clockStep).not.toEqual(clock.clockStep);
    expect(clockViewModel.clockRange).not.toEqual(clock.clockRange);
    expect(clockViewModel.shouldAnimate).not.toEqual(clock.shouldAnimate);

    clock.tick();

    expect(clockViewModel.startTime).toEqual(clock.startTime);
    expect(clockViewModel.stopTime).toEqual(clock.stopTime);
    expect(clockViewModel.currentTime).toEqual(clock.currentTime);
    expect(clockViewModel.multiplier).toEqual(clock.multiplier);
    expect(clockViewModel.clockStep).toEqual(clock.clockStep);
    expect(clockViewModel.clockRange).toEqual(clock.clockRange);
    expect(clockViewModel.shouldAnimate).toEqual(clock.shouldAnimate);
  });
});
