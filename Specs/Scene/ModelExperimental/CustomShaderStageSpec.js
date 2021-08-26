import {
  AttributeType,
  CustomShader,
  CustomShaderStage,
  LightingModel,
  ModelAlphaOptions,
  ModelLightingOptions,
  ShaderBuilder,
  UniformType,
  VaryingType,
  _shadersCustomShaderStageVS,
  _shadersCustomShaderStageFS,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/CustomShaderStage", function () {
  var primitive = {
    attributes: [
      {
        semantic: "POSITION",
        type: AttributeType.VEC3,
      },
      {
        semantic: "NORMAL",
        type: AttributeType.VEC3,
      },
      {
        semantic: "TEXCOORD",
        setIndex: 0,
        type: AttributeType.VEC2,
      },
    ],
  };

  var primitiveWithCustomAttributes = {
    attributes: [
      {
        semantic: "POSITION",
        type: AttributeType.VEC3,
      },
      {
        name: "_TEMPERATURE",
        type: AttributeType.SCALAR,
      },
    ],
  };

  var emptyVertexShader =
    "void vertexMain(VertexInput vsInput, inout vec3 position) {}";
  var emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";
  var emptyShader = new CustomShader({
    vertexShaderText: emptyVertexShader,
    fragmentShaderText: emptyFragmentShader,
  });

  it("sets defines in the shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: emptyShader,
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "USE_CUSTOM_SHADER",
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "HAS_CUSTOM_FRAGMENT_SHADER",
      "CUSTOM_SHADER_MODIFY_MATERIAL",
    ]);
  });

  // extract lines between curly braces of a struct or function. for example:
  // struct Attributes
  // {
  //   vec3 position; // <-- these lines
  //   vec3 normal;   // <--
  // }
  function betweenTheBraces(array, startLine) {
    var start = array.indexOf(startLine);
    expect(start).not.toEqual(-1);
    expect(array[start + 1]).toEqual("{");
    start = start + 2;

    // find the first }; (structs) or } (functions)
    var end = array.length;
    for (var i = start; i < array.length; i++) {
      var line = array[i];
      if (line === "}" || line === "};") {
        end = i;
        break;
      }
    }

    return array.slice(start, end);
  }

  function groupVertexShaderLines(shaderBuilder) {
    var vertexShaderLines = shaderBuilder._vertexShaderParts.shaderLines;
    var length = vertexShaderLines.length;

    var results = {
      attributeFields: [],
      initializationLines: [],
      customShaderLine: undefined,
    };

    if (length === 0) {
      return results;
    }

    if (length === 1) {
      expect(vertexShaderLines).toEqual([_shadersCustomShaderStageVS]);
      return results;
    }

    results.attributeFields = betweenTheBraces(
      vertexShaderLines,
      "struct Attributes"
    );

    // At this time, the vertex input struct is always the same so check it here
    var vertexInputLines = betweenTheBraces(
      vertexShaderLines,
      "struct VertexInput"
    );
    expect(vertexInputLines).toEqual(["    Attributes attributes;"]);

    results.initializationLines = betweenTheBraces(
      vertexShaderLines,
      "void initializeInputStruct(out VertexInput vsInput)"
    );

    // The last 3 lines will be a line number directive, the custom shader text,
    // and the static GLSL file
    expect(vertexShaderLines[length - 3]).toEqual("#line 0");
    results.customShaderLine = vertexShaderLines[length - 2];
    expect(vertexShaderLines[length - 1]).toEqual(_shadersCustomShaderStageVS);

    return results;
  }

  function groupFragmentShaderLines(shaderBuilder) {
    var fragmentShaderLines = shaderBuilder._fragmentShaderParts.shaderLines;
    var length = fragmentShaderLines.length;

    var results = {
      attributeFields: [],
      fragmentInputFields: [],
      initializationLines: [],
    };

    if (length === 0) {
      return results;
    }

    results.attributeFields = betweenTheBraces(
      fragmentShaderLines,
      "struct Attributes"
    );

    var fragmentInputFields = betweenTheBraces(
      fragmentShaderLines,
      "struct FragmentInput"
    );

    // The first line is constant, so check it here.
    expect(fragmentInputFields[0]).toEqual("    Attributes attributes;");
    fragmentInputFields.shift();
    results.fragmentInputFields = fragmentInputFields;

    results.initializationLines = betweenTheBraces(
      fragmentShaderLines,
      "void initializeInputStruct(out FragmentInput fsInput)"
    );
    return results;
  }

  it("adds uniforms from the custom shader", function () {
    var uniforms = {
      u_time: {
        type: UniformType.FLOAT,
      },
      u_enableAnimation: {
        type: UniformType.BOOL,
      },
    };
    var customShader = new CustomShader({
      uniforms: uniforms,
      vertexShaderText: emptyVertexShader,
      fragmentShaderText: emptyFragmentShader,
    });
    var model = {
      customShader: customShader,
    };
    var uniformMap = {};
    var shaderBuilder = new ShaderBuilder();

    var renderResources = {
      shaderBuilder: shaderBuilder,
      uniformMap: uniformMap,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var expectedLines = [
      "uniform bool u_enableAnimation;",
      "uniform float u_time;",
    ];

    expect(renderResources.uniformMap).toEqual(customShader.uniformMap);
    expect(shaderBuilder._vertexShaderParts.uniformLines.sort()).toEqual(
      expectedLines
    );
    expect(shaderBuilder._fragmentShaderParts.uniformLines.sort()).toEqual(
      expectedLines
    );
  });

  it("adds varying declarations from the custom shader", function () {
    var varyings = {
      v_distanceFromCenter: VaryingType.FLOAT,
      v_computedMatrix: VaryingType.MAT3,
    };
    var customShader = new CustomShader({
      vertexShaderText: emptyVertexShader,
      fragmentShaderText: emptyFragmentShader,
      varyings: varyings,
    });
    var model = {
      customShader: customShader,
    };
    var shaderBuilder = new ShaderBuilder();

    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var expectedLines = [
      "varying float v_distanceFromCenter;",
      "varying mat2 v_computedMatrix;",
    ];
    expect(shaderBuilder._vertexShaderParts.varyingLines.sort()).toEqual(
      expectedLines
    );
    expect(shaderBuilder._fragmentShaderParts.varyingLines.sort()).toEqual(
      expectedLines
    );
  });

  it("overrides the lighting model if specified in the custom shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: emptyFragmentShader,
        lightingModel: LightingModel.PBR,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(renderResources.lightingOptions.lightingModel).toBe(
      LightingModel.PBR
    );
  });

  it("generates shader code from built-in attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    vec3 normal = vsInput.attributes.normal;",
          "    vec2 texCoord = vsInput.attributes.texCoord_0;",
          "    position = vsInput.attributes.position;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    vec3 position = fsInput.attributes.position;",
          "    vec3 normal = fsInput.attributes.normal;",
          "    vec2 texCoord = fsInput.attributes.texCoord_0;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var generatedVertexLines = groupVertexShaderLines(shaderBuilder);
    var generatedFragmentLines = groupFragmentShaderLines(shaderBuilder);

    var expectedAttributes = [
      "    vec3 position;",
      "    vec3 normal;",
      "    vec2 texCoord_0;",
    ].sort();

    expect(generatedVertexLines.attributeFields.sort()).toEqual(
      expectedAttributes
    );
    expect(generatedFragmentLines.attributeFields.sort()).toEqual(
      expectedAttributes
    );

    expect(generatedFragmentLines.fragmentInputFields).toEqual([]);

    expect(generatedVertexLines.initializationLines.sort()).toEqual(
      [
        "    vsInput.attributes.position = a_position;",
        "    vsInput.attributes.normal = a_normal;",
        "    vsInput.attributes.texCoord_0 = a_texCoord_0;",
      ].sort()
    );
    expect(generatedFragmentLines.initializationLines.sort()).toEqual(
      [
        "    fsInput.attributes.position = v_position;",
        "    fsInput.attributes.normal = v_normal;",
        "    fsInput.attributes.texCoord_0 = v_texCoord_0;",
      ].sort()
    );
  });

  it("generates shader code for custom attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    float temperature = vsInput.attributes.temperature;",
          "    position = vsInput.attributes.position;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    float temperature = fsInput.attributes.temperature;",
          "    vec3 position = fsInput.attributes.position;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitiveWithCustomAttributes);

    var generatedVertexLines = groupVertexShaderLines(shaderBuilder);
    var generatedFragmentLines = groupFragmentShaderLines(shaderBuilder);

    var expectedAttributes = [
      "    vec3 position;",
      "    float temperature;",
    ].sort();

    expect(generatedVertexLines.attributeFields.sort()).toEqual(
      expectedAttributes
    );
    expect(generatedFragmentLines.attributeFields.sort()).toEqual(
      expectedAttributes
    );

    expect(generatedFragmentLines.fragmentInputFields).toEqual([]);

    expect(generatedVertexLines.initializationLines.sort()).toEqual(
      [
        "    vsInput.attributes.position = a_position;",
        "    vsInput.attributes.temperature = a_temperature;",
      ].sort()
    );
    expect(generatedFragmentLines.initializationLines.sort()).toEqual(
      [
        "    fsInput.attributes.position = v_position;",
        "    fsInput.attributes.temperature = v_temperature;",
      ].sort()
    );
  });

  it("only generates input lines for attributes that are used", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    position = 2.0 * vsInput.attributes.position - 1.0;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    float temperature = fsInput.attributes.temperature",
          "    material.diffuse = vec3(temperature / 90.0, 0.0, 0.0);",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitiveWithCustomAttributes);

    var generatedVertexLines = groupVertexShaderLines(shaderBuilder);
    var generatedFragmentLines = groupFragmentShaderLines(shaderBuilder);

    expect(generatedVertexLines.attributeFields).toEqual([
      "    vec3 position;",
    ]);
    expect(generatedVertexLines.initializationLines).toEqual([
      "    vsInput.attributes.position = a_position;",
    ]);

    expect(generatedFragmentLines.attributeFields).toEqual([
      "    float temperature;",
    ]);
    expect(generatedFragmentLines.initializationLines).toEqual([
      "    fsInput.attributes.temperature = v_temperature;",
    ]);
  });

  function isPositiveAndAscending(array) {
    var current = -1;
    for (var i = 0; i < array.length; i++) {
      if (array[i] <= current) {
        return false;
      }
      current = array[i];
    }
    return true;
  }

  it("generates the shader lines in the correct order", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: emptyShader,
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var vertexLines = shaderBuilder._vertexShaderParts.shaderLines;
    var fragmentLines = shaderBuilder._fragmentShaderParts.shaderLines;

    // Check that the vertex shader parts appear in the shader and in the
    // correct order.
    var attributesStruct = vertexLines.indexOf("struct Attributes");
    var inputStruct = vertexLines.indexOf("struct VertexInput");
    var line0 = vertexLines.indexOf("#line 0");
    var customShaderText = vertexLines.indexOf(emptyVertexShader);
    var glslFile = vertexLines.indexOf(_shadersCustomShaderStageVS);
    var lineNumbers = [
      attributesStruct,
      inputStruct,
      line0,
      customShaderText,
      glslFile,
    ];
    expect(isPositiveAndAscending(lineNumbers)).toBe(true);

    // similarly for the fragment shader.
    attributesStruct = fragmentLines.indexOf("struct Attributes");
    inputStruct = fragmentLines.indexOf("struct FragmentInput");
    line0 = fragmentLines.indexOf("#line 0");
    customShaderText = fragmentLines.indexOf(emptyFragmentShader);
    glslFile = fragmentLines.indexOf(_shadersCustomShaderStageFS);
    lineNumbers = [
      attributesStruct,
      inputStruct,
      line0,
      customShaderText,
      glslFile,
    ];
    expect(isPositiveAndAscending(lineNumbers)).toBe(true);
  });

  it("does not add positions in other coordinate systems if not needed", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: emptyShader,
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var generatedFragmentLines = groupFragmentShaderLines(shaderBuilder);
    expect(generatedFragmentLines.fragmentInputFields).toEqual([]);
  });

  it("configures positions in other coordinate systems when present in the shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = fsInput.positionMC;",
          "    material.specular = fsInput.positionWC;",
          "    material.normal = fsInput.positionEC;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    // World coordinates require an extra varying.
    var worldCoordDeclaration = "varying vec3 v_positionWC;";
    expect(
      shaderBuilder._vertexShaderParts.varyingLines.indexOf(
        worldCoordDeclaration
      )
    ).not.toBe(-1);
    expect(
      shaderBuilder._fragmentShaderParts.varyingLines.indexOf(
        worldCoordDeclaration
      )
    ).not.toBe(-1);
    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "USE_CUSTOM_SHADER",
      "COMPUTE_POSITION_WC",
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);

    var generatedFragmentLines = groupFragmentShaderLines(shaderBuilder);

    expect(generatedFragmentLines.fragmentInputFields).toEqual([
      "    vec3 positionMC;",
      "    vec3 positionWC;",
      "    vec3 positionEC;",
    ]);
    expect(generatedFragmentLines.initializationLines).toEqual([
      "    fsInput.positionMC = v_position;",
      "    fsInput.positionWC = v_positionWC;",
      "    fsInput.positionEC = v_positionEC;",
    ]);
  });

  it("infers default values for built-in attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    vec2 texCoords = vsInput.attributes.texCoord_1;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = vec3(fsInput.attributes.tangent);",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var generatedVertexLines = groupVertexShaderLines(shaderBuilder);
    var generatedFragmentLines = groupFragmentShaderLines(shaderBuilder);

    expect(generatedVertexLines.attributeFields).toEqual([
      "    vec2 texCoord_1;",
    ]);
    expect(generatedFragmentLines.attributeFields).toEqual([
      "    vec4 tangent;",
    ]);

    expect(generatedVertexLines.initializationLines).toEqual([
      "    vsInput.attributes.texCoord_1 = vec2(0.0);",
    ]);

    expect(generatedFragmentLines.initializationLines).toEqual([
      "    fsInput.attributes.tangent = vec4(1.0, 0.0, 0.0, 1.0);",
    ]);
  });

  it("handles incompatible primitives gracefully", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    vec3 texCoords = vsInput.attributes.color_0;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse *= fsInput.attributes.notAnAttribute;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    spyOn(CustomShaderStage, "_oneTimeWarning");

    CustomShaderStage.process(renderResources, primitive);

    // once for the vertex shader, once for the fragment shader
    expect(CustomShaderStage._oneTimeWarning.calls.count()).toBe(2);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([]);
  });

  it("disables vertex shader if vertexShaderText is not provided", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        fragmentShaderText: emptyFragmentShader,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      uniformMap: {},
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "HAS_CUSTOM_FRAGMENT_SHADER",
      "CUSTOM_SHADER_MODIFY_MATERIAL",
    ]);

    expect(shaderBuilder._vertexShaderParts.shaderLines).toEqual([]);
    var fragmentShaderIndex = shaderBuilder._fragmentShaderParts.shaderLines.indexOf(
      emptyFragmentShader
    );
    expect(fragmentShaderIndex).not.toBe(-1);
  });

  it("disables fragment shader if fragmentShaderText is not provided", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "USE_CUSTOM_SHADER",
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([]);

    var vertexShaderIndex = shaderBuilder._vertexShaderParts.shaderLines.indexOf(
      emptyVertexShader
    );
    expect(vertexShaderIndex).not.toBe(-1);
    expect(shaderBuilder._fragmentShaderParts.shaderLines).toEqual([]);
  });

  it("disables custom shader if neither fragmentShaderText nor vertexShaderText are provided", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader(),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
    };

    CustomShaderStage.process(renderResources, primitive);

    // Essentially the shader stage is skipped, so nothing should be updated
    expect(shaderBuilder).toEqual(new ShaderBuilder());
    expect(renderResources.uniformMap).toEqual({});
    expect(renderResources.lightingOptions).toEqual(new ModelLightingOptions());
  });

  it("handles fragment-only custom shader that computes positionWC", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = fsInput.positionWC;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    // World coordinates require an extra varying.
    var worldCoordDeclaration = "varying vec3 v_positionWC;";
    expect(
      shaderBuilder._vertexShaderParts.varyingLines.indexOf(
        worldCoordDeclaration
      )
    ).not.toBe(-1);
    expect(
      shaderBuilder._fragmentShaderParts.varyingLines.indexOf(
        worldCoordDeclaration
      )
    ).not.toBe(-1);
    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "USE_CUSTOM_SHADER",
      "COMPUTE_POSITION_WC",
    ]);

    var generatedFragmentLines = groupFragmentShaderLines(shaderBuilder);

    expect(generatedFragmentLines.fragmentInputFields).toEqual([
      "    vec3 positionWC;",
    ]);
    expect(generatedFragmentLines.initializationLines).toEqual([
      "    fsInput.positionWC = v_positionWC;",
    ]);
  });
});
