import { StyleExpression } from "../../Source/Cesium.js";

describe("Scene/StyleExpression", function () {
  function MockFeature() {}

  MockFeature.prototype.getPropertyInherited = function (name) {
    return undefined;
  };

  it("throws", function () {
    var expression = new StyleExpression();
    var feature = new MockFeature();

    expect(function () {
      return expression.evaluate(feature);
    }).toThrowDeveloperError();

    expect(function () {
      return expression.evaluateColor(feature);
    }).toThrowDeveloperError();
  });
});
