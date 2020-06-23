import { LagrangePolynomialApproximation } from "../../Source/Cesium.js";

describe("Core/LagrangePolynomialApproximation", function () {
  //The results of these specs were validated against STK Components
  //an aerospace SDK available from Analytical Graphics. www.agi.com/components/

  var xTable = [0, 60, 120, 180, 240, 300, 360, 420];
  var yTable = [
    13378137.0,
    0.0,
    0,
    13374128.3576279,
    327475.593690065,
    0,
    13362104.8328212,
    654754.936954423,
    0,
    13342073.6310691,
    981641.896976832,
    0,
    13314046.7567223,
    1307940.57608951,
    0,
    13278041.005799,
    1633455.42917117,
    0,
    13234077.9559193,
    1957991.38083385,
    0,
    13182183.953374,
    2281353.94232816,
    0,
  ];

  var x = 100.0;

  it("interpolation produces correct results.", function () {
    var result = LagrangePolynomialApproximation.interpolateOrderZero(
      x,
      xTable,
      yTable,
      3
    );
    var expectedResult = [13367002.870928623, 545695.7388100647, 0];
    expect(result).toEqualEpsilon(expectedResult, 1e-15);
  });

  it("interpolation produces correct results with a result parameter", function () {
    var result = new Array(3);
    var returnedResult = LagrangePolynomialApproximation.interpolateOrderZero(
      x,
      xTable,
      yTable,
      3,
      result
    );
    var expectedResult = [13367002.870928623, 545695.7388100647, 0];
    expect(result).toBe(returnedResult);
    expect(result).toEqualEpsilon(expectedResult, 1e-15);
  });

  it("getRequiredDataPoints should be 1 more than degree, except for 0, which requires 2", function () {
    expect(LagrangePolynomialApproximation.getRequiredDataPoints(0)).toEqual(2);
    expect(LagrangePolynomialApproximation.getRequiredDataPoints(1)).toEqual(2);
    expect(LagrangePolynomialApproximation.getRequiredDataPoints(2)).toEqual(3);
    expect(LagrangePolynomialApproximation.getRequiredDataPoints(3)).toEqual(4);
  });
});
