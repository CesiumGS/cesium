import { Cartesian4 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { ConditionsExpression } from "../../Source/Cesium.js";

describe("Scene/ConditionsExpression", function () {
  function MockFeature(value) {
    this._value = value;
  }

  MockFeature.prototype.getPropertyInherited = function () {
    return this._value;
  };

  const jsonExp = {
    conditions: [
      ["${Height} > 100", 'color("blue")'],
      ["${Height} > 50", 'color("red")'],
      ["true", 'color("lime")'],
    ],
  };

  const defines = {
    halfHeight: "${Height}/2",
    quarterHeight: "${Height}/4",
  };

  const jsonExpWithDefines = {
    conditions: [
      ["${halfHeight} > 50 && ${halfHeight} < 100", 'color("blue")'],
      ["${quarterHeight} > 50 && ${quarterHeight} < 52", 'color("red")'],
      ["true", 'color("lime")'],
    ],
  };

  const jsonExpMultipleVariables = {
    conditions: [
      ["${Height} > 100", "${FloorColor}"],
      ["${Height} > 50", "${FloorColor} * 0.5"],
      ["true", 'color("lime")'],
    ],
  };

  it("constructs", function () {
    const expression = new ConditionsExpression(jsonExp);
    expect(expression.conditionsExpression).toEqual(jsonExp);
  });

  it("evaluates conditional", function () {
    const expression = new ConditionsExpression(jsonExp);
    expect(expression.evaluateColor(new MockFeature(101))).toEqual(Color.BLUE);
    expect(expression.evaluateColor(new MockFeature(52))).toEqual(Color.RED);
    expect(expression.evaluateColor(new MockFeature(3))).toEqual(Color.LIME);
  });

  it("evaluates conditional with defines", function () {
    const expression = new ConditionsExpression(jsonExpWithDefines, defines);
    expect(expression.evaluateColor(new MockFeature(101))).toEqual(Color.BLUE);
    expect(expression.evaluateColor(new MockFeature(52))).toEqual(Color.LIME);
    expect(expression.evaluateColor(new MockFeature(3))).toEqual(Color.LIME);
  });

  it("evaluate takes result argument", function () {
    const result = new Cartesian4();
    const expression = new ConditionsExpression(
      jsonExpWithDefines,
      defines,
      result
    );
    const value = expression.evaluate(new MockFeature(101), result);
    expect(value).toEqual(new Cartesian4(0.0, 0.0, 1.0, 1.0));
    expect(value).toBe(result);
  });

  it("evaluate takes a color result argument", function () {
    const result = new Color();
    const expression = new ConditionsExpression(
      jsonExpWithDefines,
      defines,
      result
    );
    const value = expression.evaluate(new MockFeature(101), result);
    expect(value).toEqual(Color.BLUE);
    expect(value).toBe(result);
  });

  it("constructs and evaluates empty conditional", function () {
    const expression = new ConditionsExpression({
      conditions: [],
    });
    expect(expression._conditions).toEqual([]);
    expect(expression.evaluate(new MockFeature(101))).toEqual(undefined);
    expect(expression.evaluate(new MockFeature(52))).toEqual(undefined);
    expect(expression.evaluate(new MockFeature(3))).toEqual(undefined);
  });

  it("constructs and evaluates empty", function () {
    const expression = new ConditionsExpression([]);
    expect(expression._conditions).toEqual(undefined);
    expect(expression.evaluate(new MockFeature(101))).toEqual(undefined);
    expect(expression.evaluate(new MockFeature(52))).toEqual(undefined);
    expect(expression.evaluate(new MockFeature(3))).toEqual(undefined);
  });

  it("gets shader function", function () {
    const expression = new ConditionsExpression(jsonExp);
    const variableSubstitutionMap = {
      Height: "a_height",
    };
    const shaderFunction = expression.getShaderFunction(
      "getColor()",
      variableSubstitutionMap,
      {},
      "vec4"
    );
    const expected =
      "vec4 getColor()\n" +
      "{\n" +
      "    if ((a_height > 100.0))\n" +
      "    {\n" +
      "        return vec4(vec3(0.0, 0.0, 1.0), 1.0);\n" +
      "    }\n" +
      "    else if ((a_height > 50.0))\n" +
      "    {\n" +
      "        return vec4(vec3(1.0, 0.0, 0.0), 1.0);\n" +
      "    }\n" +
      "    else if (true)\n" +
      "    {\n" +
      "        return vec4(vec3(0.0, 1.0, 0.0), 1.0);\n" +
      "    }\n" +
      "    return vec4(1.0);\n" +
      "}\n";
    expect(shaderFunction).toEqual(expected);
  });

  it("return undefined shader function when there are no conditions", function () {
    const expression = new ConditionsExpression([]);
    const shaderFunction = expression.getShaderFunction(
      "getColor",
      {},
      {},
      "vec4"
    );
    expect(shaderFunction).toBeUndefined();
  });

  it("gets variables", function () {
    const expression = new ConditionsExpression(jsonExpMultipleVariables);
    const variables = expression.getVariables();
    expect(variables.sort()).toEqual(["FloorColor", "Height"]);
  });

  it("getVariables returns empty array when there are no conditions", function () {
    const expression = new ConditionsExpression([]);
    const variables = expression.getVariables();
    expect(variables).toEqual([]);
  });
});
