import { ShaderFunction } from "../../Source/Cesium.js";

describe("Renderer/ShaderFunction", function () {
  var signature = "vec3 testFunction(vec3 position)";
  it("constructs", function () {
    var func = new ShaderFunction(signature);
    expect(func.signature).toEqual(signature);
    expect(func.body).toEqual([]);
  });

  it("constructor throws for undefined name", function () {
    expect(function () {
      return new ShaderFunction(undefined);
    }).toThrowDeveloperError();
  });

  it("addLines adds lines to the function body", function () {
    var func = new ShaderFunction("TestStruct");
    func.addLines(["v_color = a_color;", "return vec3(0.0, 0.0, 1.0);"]);
    expect(func.body).toEqual([
      "    v_color = a_color;",
      "    return vec3(0.0, 0.0, 1.0);",
    ]);
  });

  it("addLines throws for undefined lines", function () {
    var func = new ShaderFunction(signature);
    expect(function () {
      return func.addLines(undefined);
    }).toThrowDeveloperError();
  });

  it("generateGlslLines generates a function", function () {
    var func = new ShaderFunction(signature);
    func.addLines(["v_color = a_color;", "return vec3(0.0, 0.0, 1.0);"]);
    expect(func.generateGlslLines()).toEqual([
      signature,
      "{",
      "    v_color = a_color;",
      "    return vec3(0.0, 0.0, 1.0);",
      "}",
    ]);
  });
});
