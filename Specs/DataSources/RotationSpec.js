import {
  JulianDate,
  Rotation,
  SampledProperty,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createPackableSpecs from "../createPackableSpecs.js";

describe("DataSources/Rotation", function () {
  it("Interpolates towards the closest angle.", function () {
    const time1 = JulianDate.fromIso8601("2010-05-07T00:00:00");
    const time2 = JulianDate.fromIso8601("2010-05-07T00:01:00");
    const time3 = JulianDate.fromIso8601("2010-05-07T00:02:00");
    const time4 = JulianDate.fromIso8601("2010-05-07T00:03:00");
    const time5 = JulianDate.fromIso8601("2010-05-07T00:04:00");

    const property = new SampledProperty(Rotation);
    property.addSample(time1, 0);
    property.addSample(time3, CesiumMath.toRadians(350));
    property.addSample(time5, CesiumMath.toRadians(10));

    expect(property.getValue(time2)).toEqual(CesiumMath.toRadians(355));
    expect(property.getValue(time4)).toEqual(0);
  });

  createPackableSpecs(Rotation, 1, [1]);
});
