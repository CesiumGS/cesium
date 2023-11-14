import { ShaderSource } from "../../Source/Cesium.js";

describe("Renderer/ShaderSource", function () {
  const mockContext = {
    webgl2: false,
  };

  it("combines #defines", function () {
    const source = new ShaderSource({
      defines: ["A", "B", ""],
    });

    const shaderText = source.createCombinedVertexShader(mockContext);
    expect(shaderText).toContain("#define A");
    expect(shaderText).toContain("#define B");
    expect(shaderText.match(/#define/g).length).toEqual(2);
  });

  it("combines sources", function () {
    const source = new ShaderSource({
      sources: ["void func() {}", "void main() {}"],
    });
    const shaderText = source.createCombinedVertexShader(mockContext);
    expect(shaderText).toContain("#line 0\nvoid func() {}");
    expect(shaderText).toContain("#line 0\nvoid main() {}");
  });

  it("combines #defines and sources", function () {
    const source = new ShaderSource({
      defines: ["A", "B", ""],
      sources: ["void func() {}", "void main() {}"],
    });
    const shaderText = source.createCombinedVertexShader(mockContext);
    expect(shaderText).toContain("#define A");
    expect(shaderText).toContain("#define B");
    expect(shaderText.match(/#define/g).length).toEqual(2);
    expect(shaderText).toContain("#line 0\nvoid func() {}");
    expect(shaderText).toContain("#line 0\nvoid main() {}");
  });

  it("creates a pick shader with a uniform", function () {
    const source = new ShaderSource({
      sources: ["void main() { gl_FragColor = vec4(1.0); }"],
      pickColorQualifier: "uniform",
    });
    const shaderText = source.createCombinedVertexShader(mockContext);
    expect(shaderText).toContain("uniform vec4 czm_pickColor;");
    expect(shaderText).toContain("gl_FragColor = czm_pickColor;");
  });

  it("creates a pick shader with a varying", function () {
    const source = new ShaderSource({
      sources: ["void main() { gl_FragColor = vec4(1.0); }"],
      pickColorQualifier: "varying",
    });
    const shaderText = source.createCombinedVertexShader(mockContext);
    expect(shaderText).toContain("varying vec4 czm_pickColor;");
    expect(shaderText).toContain("gl_FragColor = czm_pickColor;");
  });

  it("throws with invalid qualifier", function () {
    expect(function () {
      return new ShaderSource({
        pickColorQualifier: "const",
      });
    }).toThrowDeveloperError();
  });

  it("combines #version to shader", function () {
    const source = new ShaderSource({
      sources: ["#version 300 es\nvoid main() {gl_FragColor = vec4(1.0); }"],
    });
    const shaderText = source.createCombinedVertexShader(mockContext);
    expect(shaderText).toStartWith("#version 300 es\n");
  });

  it("clones", function () {
    const source = new ShaderSource({
      defines: ["A"],
      sources: ["void main() { gl_FragColor = vec4(1.0); }"],
      pickColorQualifier: "varying",
      includeBuiltIns: false,
    });
    const clone = source.clone();
    expect(clone.defines).toBeDefined();
    expect(clone.defines.length).toEqual(1);
    expect(clone.defines[0]).toEqual(source.defines[0]);
    expect(clone.sources).toBeDefined();
    expect(clone.sources.length).toEqual(1);
    expect(clone.sources[0]).toEqual(source.sources[0]);
    expect(clone.pickColorQualifier).toEqual(source.pickColorQualifier);
    expect(clone.includeBuiltIns).toEqual(source.includeBuiltIns);
  });
});
