import { Iau2000Orientation } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeStandard } from "../../Source/Cesium.js";

describe("Core/Iau2000Orientation", function () {
  it("compute moon", function () {
    const date = new JulianDate(2451545.0, -32.184, TimeStandard.TAI);
    const param = Iau2000Orientation.ComputeMoon(date);

    // expected results taken from STK Components:
    //    Iau2000Orientation.ComputeMoon(TimeConstants.J2000);
    const expectedRightAscension = 4.6575460830237914;
    const expectedDeclination = 1.1456533675897986;
    const expectedRotation = 0.71899299269222972;
    const expectedRotationRate = 0.0000026518066425764541;

    expect(param.rightAscension).toEqual(expectedRightAscension);
    expect(param.declination).toEqual(expectedDeclination);
    expect(param.rotation).toEqual(expectedRotation);
    expect(param.rotationRate).toEqual(expectedRotationRate);
  });
});
