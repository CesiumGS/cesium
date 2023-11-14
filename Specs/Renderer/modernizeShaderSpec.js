import { modernizeShader } from "../../Source/Cesium.js";

describe("Renderer/modernizeShader", function () {
  it("adds version string", function () {
    const simple =
      "#define OUTPUT_DECLARATION \n" + "void main() \n" + "{ \n" + "} \n";
    const output = modernizeShader(simple, true);
    const expected = "#version 300 es\n#define WEBGL_2";
    expect(output.startsWith(expected)).toBe(true);
  });

  it("replace existing version string", function () {
    const simple =
      "#version 200 es" +
      "#define OUTPUT_DECLARATION \n" +
      "void main() \n" +
      "{ \n" +
      "} \n";
    const output = modernizeShader(simple, true);
    const expected = "#version 300 es\n#define WEBGL_2";
    expect(output.startsWith(expected)).toBe(true);
  });

  it("removes extensions", function () {
    const extensions =
      "#define OUTPUT_DECLARATION \n" +
      "#extension GL_EXT_draw_buffers : enable \n" +
      "void main() \n" +
      "{ \n" +
      "} \n";
    const output = modernizeShader(extensions, true);
    const notExpected = "#extension GL_EXT_draw_buffers : enable \n";
    expect(output).not.toContain(notExpected);
  });

  it("replace extension macro check with WEBGL_2", function () {
    const extensions =
      "#define OUTPUT_DECLARATION \n" +
      "#extension GL_EXT_draw_buffers : enable \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef GL_EXT_draw_buffers\n" +
      "    #endif //GL_EXT_draw_buffers\n" +
      "    #if defined(GL_EXT_draw_buffers)\n" +
      "    #endif //GL_EXT_draw_buffers\n" +
      "} \n";
    const output = modernizeShader(extensions, true);
    const notExpected = "#extension GL_EXT_draw_buffers : enable \n";
    const expected =
      "    #ifdef WEBGL_2\n" +
      "    #endif //WEBGL_2\n" +
      "    #if defined(WEBGL_2)\n" +
      "    #endif //WEBGL_2\n";
    expect(output).not.toContain(notExpected);
    expect(output).toContain(expected);
  });

  it("throws exception if no output declaration", function () {
    const noOutputDeclaration = "void main() \n" + "{ \n" + "} \n";
    const runFunc = function () {
      modernizeShader(noOutputDeclaration, true);
    };
    expect(runFunc).toThrowDeveloperError();
  });

  it("creates layout qualifier for gl_FragColor", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "void main() \n" +
      "{ \n" +
      "    gl_FragColor = vec4(0.0); \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected = "layout(location = 0) out vec4 czm_fragColor;";
    expect(output).toContain(expected);
  });

  it("creates layout qualifier for gl_FragData", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "void main() \n" +
      "{ \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected = "layout(location = 0) out vec4 czm_out0;";
    expect(output).toContain(expected);
  });

  it("creates layout qualifier for MRT", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#extension GL_EXT_draw_buffers : enable \n" +
      "void main() \n" +
      "{ \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    gl_FragData[1] = vec4(1.0); \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected0 = "layout(location = 0) out vec4 czm_out0;";
    const expected1 = "layout(location = 1) out vec4 czm_out1;";
    expect(output).toContain(expected0);
    expect(output).toContain(expected1);
  });

  it("does not create layout qualifier for reserved word lookalike variables", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "uniform sampler2D example; \n" +
      "void main() \n" +
      "{ \n" +
      "    vec4 gl_FragData_ = vec4(0.0); \n" +
      "    vec4 a_gl_FragData = vec4(0.0); \n" +
      "    vec2 thisIsNotAGoodNameForAtexture2D = vec2(0.0); \n" +
      "    vec4 gl_FragColor = texture2D(example, thisIsNotAGoodNameForAtexture2D); \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expectedBadName = "vec2 thisIsNotAGoodNameForAtexture2D";
    const expectedVariable = "vec4 a_gl_FragData = vec4(0.0);";
    const expectedTextureCall =
      "texture(example, thisIsNotAGoodNameForAtexture2D)";
    const notExpectedLayout = "layout(location = 0) out czm_out";
    expect(output).toContain(expectedBadName);
    expect(output).toContain(expectedVariable);
    expect(output).toContain(expectedTextureCall);
    expect(output).not.toContain(notExpectedLayout);
  });

  it("creates layout qualifier with swizzle", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#extension GL_EXT_draw_buffers : enable \n" +
      "void main() \n" +
      "{ \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    gl_FragData[1].xyz = vec3(1.0); \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected0 = "layout(location = 0) out vec4 czm_out0;";
    const expected1 = "layout(location = 1) out vec4 czm_out1;";
    expect(output).toContain(expected0);
    expect(output).toContain(expected1);
  });

  it("removes old functions/variables from fragment shader", function () {
    const old_fragment =
      "#define OUTPUT_DECLARATION \n" +
      "#extension GL_EXT_draw_buffers : enable \n" +
      "uniform sampler2D example; \n" +
      "uniform sampler2D exampleCube; \n" +
      "uniform sampler2D example3D; \n" +
      "varying vec2 v_textureCoordinates; \n" +
      "void main() \n" +
      "{ \n" +
      "    gl_FragData[0] = texture2D(example, v_textureCoordinates); \n" +
      "    gl_FragData[1] = textureCube(exampleCube, v_textureCoordinates); \n" +
      "    gl_FragData[2] = texture3D(example3D, v_textureCoordinates); \n" +
      "    gl_FragDepthEXT = 0.0; \n" +
      "} \n";

    const output = modernizeShader(old_fragment, true);

    const expectedDepth = "gl_FragDepth = 0.0;";
    const expectedTexture2D = "texture(example, v_textureCoordinates);";
    const expectedTextureCube = "texture(exampleCube, v_textureCoordinates);";
    const expectedTexture3D = "texture(example3D, v_textureCoordinates);";
    const expectedIn = "in vec2 v_textureCoordinates;";

    const notExpectedDepth = "gl_FragDepthEXT = 0.0;";
    const notExpectedTexture2D = "texture2D(example, v_textureCoordinates);";
    const notExpectedTextureCube =
      "textureCube(exampleCube, v_textureCoordinates);";
    const notExpectedTexture3D = "texture3D(example3D, v_textureCoordinates);";
    const notExpectedVarying = "varying vec2 v_textureCoordinates;";

    expect(output).toContain(expectedDepth);
    expect(output).toContain(expectedTexture2D);
    expect(output).toContain(expectedTextureCube);
    expect(output).toContain(expectedTexture3D);
    expect(output).toContain(expectedIn);

    expect(output).not.toContain(notExpectedDepth);
    expect(output).not.toContain(notExpectedTexture2D);
    expect(output).not.toContain(notExpectedTextureCube);
    expect(output).not.toContain(notExpectedTexture3D);
    expect(output).not.toContain(notExpectedVarying);
  });

  it("removes old functions/variables from vertex shader", function () {
    const old_vertex =
      "#define OUTPUT_DECLARATION \n" +
      "attribute vec4 position; \n" +
      "varying vec4 varyingVariable; \n" +
      "void main() \n" +
      "{ \n" +
      "    gl_Position = position; \n" +
      "    varyingVariable = position.wzyx; \n" +
      "} \n";

    const output = modernizeShader(old_vertex, false);

    const expectedOut = "out vec4 varyingVariable;";
    const expectedIn = "in vec4 position;";

    const notExpectedAttribute = "attribute vec4 varyingVariable;";
    const notExpectedVarying = "varying vec2 varyingVariable;";

    expect(output).toContain(expectedOut);
    expect(output).toContain(expectedIn);

    expect(output).not.toContain(notExpectedAttribute);
    expect(output).not.toContain(notExpectedVarying);
  });

  it("creates single layout qualifier under single branch, single condition", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#define EXAMPLE_BRANCH \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    #endif //EXAMPLE_BRANCH \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif";
    expect(output).toContain(expected);
  });

  it("creates multiple layout qualifiers under single branch, single condition", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#define EXAMPLE_BRANCH \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    gl_FragData[1] = vec4(1.0); \n" +
      "    #endif //EXAMPLE_BRANCH \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected0 =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif";
    const expected1 =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 1) out vec4 czm_out1;\n#endif";
    expect(output).toContain(expected0);
    expect(output).toContain(expected1);
  });

  it("creates multiple layout qualifiers under multiple branches, single condition (cancels)", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#define EXAMPLE_BRANCH \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    gl_FragData[1] = vec4(1.0); \n" +
      "    #endif //EXAMPLE_BRANCH \n" +
      "    #ifndef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    gl_FragData[1] = vec4(1.0); \n" +
      "    #endif //!EXAMPLE_BRANCH \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const notExpected =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif";
    expect(output).not.toContain(notExpected);
  });

  it("creates single layout qualifier under multiple branches, multiple conditions (cancels)", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#define EXAMPLE_BRANCH \n" +
      "#define EXAMPLE_BRANCH1 \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    #endif //EXAMPLE_BRANCH \n" +
      "    #ifdef EXAMPLE_BRANCH1 \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    #endif //EXAMPLE_BRANCH1 \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const notExpected =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif";
    expect(output).not.toContain(notExpected);
  });

  it("creates multiple layout qualifiers under multiple branches, multiple conditions (cascades)", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#define EXAMPLE_BRANCH \n" +
      "#define EXAMPLE_BRANCH1 \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    #ifdef EXAMPLE_BRANCH1 \n" +
      "    gl_FragData[1] = vec4(1.0); \n" +
      "    #endif //EXAMPLE_BRANCH1 \n" +
      "    #endif //EXAMPLE_BRANCH \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected0 =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif";
    const expected1 = /#ifdef (EXAMPLE_BRANCH|EXAMPLE_BRANCH1)\s*\n\s*#ifdef (EXAMPLE_BRANCH1|EXAMPLE_BRANCH)\s*\n\s*layout\(location = 1\) out vec4 czm_out1;/g;
    const containsExpected0 = expected1.test(output);
    expect(output).toContain(expected0);
    expect(containsExpected0).toBe(true);
  });

  it("creates single layout qualifier under multiple branches, single condition (else)", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#define EXAMPLE_BRANCH \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    #else \n" +
      "    gl_FragData[0] = vec4(1.0); \n" +
      "    #endif //EXAMPLE_BRANCH \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const notExpected =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif";
    expect(output).not.toContain(notExpected);
  });

  it("creates branched layout qualifiers for gl_FragColor and gl_FragData", function () {
    const noQualifiers =
      "#define OUTPUT_DECLARATION \n" +
      "#define EXAMPLE_BRANCH \n" +
      "void main() \n" +
      "{ \n" +
      "    #ifdef EXAMPLE_BRANCH \n" +
      "    gl_FragData[0] = vec4(0.0); \n" +
      "    #else \n" +
      "    gl_FragColor = vec4(1.0); \n" +
      "    #endif //EXAMPLE_BRANCH \n" +
      "} \n";
    const output = modernizeShader(noQualifiers, true);
    const expected0 =
      "#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif";
    const expected1 =
      "#ifndef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_fragColor;\n#endif";
    expect(output).toContain(expected0);
    expect(output).toContain(expected1);
  });
});
