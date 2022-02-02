import { buildModuleUrl } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { Iau2006XysData } from "../../Source/Cesium.js";
import { Iau2006XysSample } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("Core/Iau2006XysData", function () {
  let xys;

  beforeEach(function () {
    xys = new Iau2006XysData();
  });

  it("returns undefined initially", function () {
    expect(xys.computeXysRadians(2442398, 1234.56)).toBeUndefined();
  });

  it("eventually returns an answer", function () {
    return pollToPromise(function () {
      return defined(xys.computeXysRadians(2442398, 1234.56));
    }).then(function () {
      // Once the data file has been downloaded, later requests
      // within the same chunk return an answer.
      expect(xys.computeXysRadians(2442399, 777.77)).toBeDefined();
    });
  });

  it("returns the same answer as STK Components", function () {
    let result;
    return pollToPromise(function () {
      result = xys.computeXysRadians(2442399, 777.77);
      return defined(result);
    }).then(function () {
      expect(result).toEqual(
        new Iau2006XysSample(
          -0.0024019733101066816,
          -0.000024843279494458311,
          -0.000000016941747917421229
        )
      );
    });
  });

  it("returns undefined prior to the XYS table epoch", function () {
    expect(xys.computeXysRadians(2442395, 0.0)).toBeUndefined();
  });

  it("returns undefined after the last XYS table sample", function () {
    expect(xys.computeXysRadians(2442396 + 27427, 0.0)).toBeUndefined();
  });

  it("allows configuring xysFileUrlTemplate", function () {
    xys = new Iau2006XysData({
      // this should be the same location as the default, but specifying the value
      // takes the code through a different code path.
      xysFileUrlTemplate: buildModuleUrl(
        "Assets/IAU2006_XYS/IAU2006_XYS_{0}.json"
      ),
    });

    return pollToPromise(function () {
      return defined(xys.computeXysRadians(2442398, 1234.56));
    });
  });
});
