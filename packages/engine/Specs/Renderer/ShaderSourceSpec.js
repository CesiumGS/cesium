import { ShaderSource } from "../../index.js";

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

  it("creates cache key for empty shader", function () {
    const source = new ShaderSource();
    expect(source.getCacheKey()).toBe(":undefined:true:");
  });

  it("creates cache key", function () {
    const source = new ShaderSource({
      defines: ["A", "B", "C"],
      sources: ["void main() { gl_FragColor = vec4(1.0); }"],
      pickColorQualifier: "varying",
      includeBuiltIns: false,
    });

    expect(source.getCacheKey()).toBe(
      "A,B,C:varying:false:void main() { gl_FragColor = vec4(1.0); }"
    );
  });

  it("uses sorted list of defines in cache key", function () {
    const defines1 = ["A", "B", "C"];
    const defines2 = ["B", "C", "A"];

    const source1 = new ShaderSource({ defines: defines1 });
    const source2 = new ShaderSource({ defines: defines2 });
    const key1 = source1.getCacheKey();
    expect(key1).toBe(source2.getCacheKey());
    expect(key1).toBe("A,B,C:undefined:true:");
  });

  it("cache key includes all sources", function () {
    const source = new ShaderSource({
      sources: [
        "vec4 getColor() { return vec4(1.0, 0.0, 0.0, 1.0); }",
        "void main() { gl_fragColor = getColor(); }",
      ],
    });

    expect(source.getCacheKey()).toBe(
      ":undefined:true:vec4 getColor() { return vec4(1.0, 0.0, 0.0, 1.0); }\nvoid main() { gl_fragColor = getColor(); }"
    );
  });
});
