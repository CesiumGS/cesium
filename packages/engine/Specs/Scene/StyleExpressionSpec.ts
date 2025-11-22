import { StyleExpression } from "../../index.js";

describe("Scene/StyleExpression", function () {
  function MockFeature() {}

  MockFeature.prototype.getPropertyInherited = function (name) {
    return undefined;
  };

  it("throws", function () {
    const expression = new StyleExpression();
    const feature = new MockFeature();

    expect(function () {
      return expression.evaluate(feature);
    }).toThrowDeveloperError();

    expect(function () {
      return expression.evaluateColor(feature);
    }).toThrowDeveloperError();

    expect(function () {
      return expression.getShaderFunction("getColor()", {}, {}, "vec4");
    }).toThrowDeveloperError();

    expect(function () {
      return expression.getVariables("");
    }).toThrowDeveloperError();
  });
});
