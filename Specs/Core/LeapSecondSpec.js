import { JulianDate } from "../../Source/Cesium.js";
import { LeapSecond } from "../../Source/Cesium.js";

describe("Core/LeapSecond", function () {
  it("default constructor sets expected values", function () {
    const leapSecond = new LeapSecond();
    expect(leapSecond.julianDate).toBeUndefined();
    expect(leapSecond.offset).toBeUndefined();
  });

  it("constructor sets expected values", function () {
    const date = new JulianDate();
    const offset = 12;
    const leapSecond = new LeapSecond(date, offset);
    expect(leapSecond.julianDate).toEqual(date);
    expect(leapSecond.offset).toEqual(offset);
  });
});
