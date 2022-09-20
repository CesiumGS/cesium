import { ShaderFunction } from "../../index.js";

describe("Renderer/ShaderFunction", function () {
  const signature = "vec3 testFunction(vec3 position)";
  it("constructs", function () {
    const func = new ShaderFunction(signature);
    expect(func.signature).toEqual(signature);
    expect(func.body).toEqual([]);
  });

  it("addLines throws without lines", function () {
    const func = new ShaderFunction("TestFunction");
    expect(function () {
      return func.addLines();
    }).toThrowDeveloperError();
  });

  it("addLines throws for invalid lines", function () {
    const func = new ShaderFunction("TestFunction");
    expect(function () {
      return func.addLines(100);
    }).toThrowDeveloperError();
  });

  it("addLines adds lines to the function body", function () {
    const func = new ShaderFunction("TestFunction");
    func.addLines(["v_color = a_color;", "return vec3(0.0, 0.0, 1.0);"]);
    expect(func.body).toEqual([
      "    v_color = a_color;",
      "    return vec3(0.0, 0.0, 1.0);",
    ]);
  });

  it("addLines accepts a single string", function () {
    const func = new ShaderFunction("TestFunction");
    func.addLines("v_color = a_color;");
    expect(func.body).toEqual(["    v_color = a_color;"]);
  });

  it("generateGlslLines generates a function", function () {
    const func = new ShaderFunction(signature);
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
