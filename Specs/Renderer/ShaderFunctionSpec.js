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

  it("addLine adds lines to the function body", function () {
    var func = new ShaderFunction("TestStruct");
    func.addLine("v_color = a_color;");
    func.addLine("return vec3(0.0, 0.0, 1.0);");
    expect(func.body).toEqual([
      "    v_color = a_color;",
      "    return vec3(0.0, 0.0, 1.0);",
    ]);
  });

  it("addLine throws for undefined line", function () {
    var func = new ShaderFunction(signature);
    expect(function () {
      return func.addLine(undefined);
    }).toThrowDeveloperError();
  });

  it("generateGlslLines generates a struct definition", function () {
    var func = new ShaderFunction(signature);
    func.addLine("v_color = a_color;");
    func.addLine("return vec3(0.0, 0.0, 1.0);");
    expect(func.generateGlslLines()).toEqual([
      signature,
      "{",
      "    v_color = a_color;",
      "    return vec3(0.0, 0.0, 1.0);",
      "}",
    ]);
  });
});
