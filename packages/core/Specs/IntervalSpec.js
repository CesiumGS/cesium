import { Interval } from "../../index.js";

describe("Core/Interval", function () {
  it("constructs without arguments", function () {
    const interval = new Interval();
    expect(interval.start).toEqual(0.0);
    expect(interval.stop).toEqual(0.0);
  });

  it("constructs with arguments", function () {
    const start = 1.0;
    const stop = 2.0;
    const interval = new Interval(start, stop);
    expect(interval.start).toEqual(start);
    expect(interval.stop).toEqual(stop);
  });
});
