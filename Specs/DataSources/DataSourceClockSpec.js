import { ClockRange } from "../../Source/Cesium.js";
import { ClockStep } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { DataSourceClock } from "../../Source/Cesium.js";

describe("DataSources/DataSourceClock", function () {
  it("merge assigns unassigned properties", function () {
    const source = new DataSourceClock();
    source.startTime = JulianDate.now();
    source.stopTime = JulianDate.now();
    source.currentTime = JulianDate.now();
    source.clockRange = ClockRange.CLAMPED;
    source.clockStep = ClockStep.TICK_DEPENDENT;
    source.multiplier = 1;

    const target = new DataSourceClock();
    target.merge(source);

    expect(target.startTime).toBe(source.startTime);
    expect(target.stopTime).toBe(source.stopTime);
    expect(target.currentTime).toBe(source.currentTime);
    expect(target.clockRange).toBe(source.clockRange);
    expect(target.clockStep).toBe(source.clockStep);
    expect(target.multiplier).toBe(source.multiplier);
  });

  it("merge does not assign assigned properties", function () {
    const source = new DataSourceClock();
    source.startTime = JulianDate.now();
    source.stopTime = JulianDate.now();
    source.currentTime = JulianDate.now();
    source.clockRange = ClockRange.CLAMPED;
    source.clockStep = ClockStep.TICK_DEPENDENT;
    source.multiplier = 1;

    const startTime = JulianDate.now();
    const stopTime = JulianDate.now();
    const currentTime = JulianDate.now();
    const clockRange = ClockRange.CLAMPED;
    const clockStep = ClockStep.TICK_DEPENDENT;
    const multiplier = 1;

    const target = new DataSourceClock();
    target.startTime = startTime;
    target.stopTime = stopTime;
    target.currentTime = currentTime;
    target.clockRange = clockRange;
    target.clockStep = clockStep;
    target.multiplier = multiplier;

    target.merge(source);

    expect(target.startTime).toBe(startTime);
    expect(target.stopTime).toBe(stopTime);
    expect(target.currentTime).toBe(currentTime);
    expect(target.clockRange).toBe(clockRange);
    expect(target.clockStep).toBe(clockStep);
    expect(target.multiplier).toBe(multiplier);
  });

  it("clone works", function () {
    const source = new DataSourceClock();
    source.startTime = JulianDate.now();
    source.stopTime = JulianDate.now();
    source.currentTime = JulianDate.now();
    source.clockRange = ClockRange.CLAMPED;
    source.clockStep = ClockStep.TICK_DEPENDENT;
    source.multiplier = 1;

    const result = source.clone();
    expect(result.startTime).toBe(source.startTime);
    expect(result.stopTime).toBe(source.stopTime);
    expect(result.currentTime).toBe(source.currentTime);
    expect(result.clockRange).toBe(source.clockRange);
    expect(result.clockStep).toBe(source.clockStep);
    expect(result.multiplier).toBe(source.multiplier);
  });

  it("merge throws if source undefined", function () {
    const target = new DataSourceClock();
    expect(function () {
      target.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("gets value as a clock instance", function () {
    const source = new DataSourceClock();
    source.startTime = JulianDate.now();
    source.stopTime = JulianDate.now();
    source.currentTime = JulianDate.now();
    source.clockRange = ClockRange.CLAMPED;
    source.clockStep = ClockStep.TICK_DEPENDENT;
    source.multiplier = 2;

    let clock = source.getValue();
    expect(clock.startTime).toEqual(source.startTime);
    expect(clock.stopTime).toEqual(source.stopTime);
    expect(clock.currentTime).toEqual(source.currentTime);
    expect(clock.clockRange).toEqual(source.clockRange);
    expect(clock.clockStep).toEqual(source.clockStep);
    expect(clock.multiplier).toEqual(source.multiplier);

    source.multiplier = undefined;
    source.clockStep = undefined;
    source.clockRange = undefined;

    clock = source.getValue();
    expect(clock.startTime).toEqual(source.startTime);
    expect(clock.stopTime).toEqual(source.stopTime);
    expect(clock.currentTime).toEqual(source.currentTime);
    expect(clock.clockRange).toEqual(ClockRange.UNBOUNDED);
    expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
    expect(clock.multiplier).toEqual(1.0);
  });
});
