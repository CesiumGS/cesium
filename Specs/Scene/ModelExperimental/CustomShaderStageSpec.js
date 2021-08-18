import {
  AttributeType,
  CustomShader,
  CustomShaderStage,
  LightingModel,
  ModelLightingOptions,
  ShaderBuilder,
  UniformType,
  VaryingType,
  _shadersCustomShaderStageVS,
  _shadersCustomShaderStageFS,
} from "../../../Source/Cesium.js";

describe("ModelExperimental/CustomShaderStage", function () {
  var emptyVertexShader =
    "vec3 vertexMain(VertexInput vsInput, vec3 position){ return position; }";
  var emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";

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

  it("sets defines in the shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader(),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "CUSTOM_VERTEX_SHADER",
    ]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "CUSTOM_SHADER_MODIFY_MATERIAL",
    ]);
  });

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
    };

    CustomShaderStage.process(renderResources, primitive);

    var expectedLines = [
      "varying float v_distanceFromCenter;",
      "varying mat2 v_computedMatrix;",
      "varying vec3 v_positionWC;",
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
        lightingModel: LightingModel.PBR,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(renderResources.lightingOptions.lightingModel).toBe(
      LightingModel.UNLIT
    );
    expect(renderResources.lightingOptions.customShaderLightingModel).toBe(
      LightingModel.PBR
    );
  });

  function makeAttributeRegex(type, name) {
    var declarationLine = "    " + type + " " + name + ";";
    // check that the declaration comes between the curly braces of
    // the attributes struct
    return new RegExp("struct Attributes[^}]*" + declarationLine + "[^}]*};");
  }

  function makeInitializationRegex(name, isVertex) {
    var initializationLine;
    if (isVertex) {
      initializationLine =
        "vsInput\\.attributes\\." + name + " = a_" + name + ";";
    } else {
      initializationLine =
        "fsInput\\.attributes\\." + name + " = v_" + name + ";";
    }
    return new RegExp(
      "void initializeInputStruct[^}]*" + initializationLine + "[^}]*}"
    );
  }

  it("generates shader code from built-in attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader(),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var generatedVertexLines = shaderBuilder._vertexShaderParts.shaderLines[0];
    var generatedFragmentLines =
      shaderBuilder._fragmentShaderParts.shaderLines[0];

    var positionDeclaration = makeAttributeRegex("vec3", "position");
    var normalDeclaration = makeAttributeRegex("vec3", "normal");
    var texCoordDeclaration = makeAttributeRegex("vec2", "texCoord_0");

    expect(positionDeclaration.test(generatedVertexLines)).toBe(true);
    expect(positionDeclaration.test(generatedFragmentLines)).toBe(true);
    expect(normalDeclaration.test(generatedVertexLines)).toBe(true);
    expect(normalDeclaration.test(generatedFragmentLines)).toBe(true);
    expect(texCoordDeclaration.test(generatedVertexLines)).toBe(true);
    expect(texCoordDeclaration.test(generatedFragmentLines)).toBe(true);

    var positionInitializationVS = makeInitializationRegex("position", true);
    var normalInitializationVS = makeInitializationRegex("normal", true);
    var texCoordInitializationVS = makeInitializationRegex("texCoord_0", true);
    expect(positionInitializationVS.test(generatedVertexLines)).toBe(true);
    expect(normalInitializationVS.test(generatedVertexLines)).toBe(true);
    expect(texCoordInitializationVS.test(generatedVertexLines)).toBe(true);

    var positionInitializationFS = makeInitializationRegex("position", false);
    var normalInitializationFS = makeInitializationRegex("normal", false);
    var texCoordInitializationFS = makeInitializationRegex("texCoord_0", false);
    expect(positionInitializationFS.test(generatedFragmentLines)).toBe(true);
    expect(normalInitializationFS.test(generatedFragmentLines)).toBe(true);
    expect(texCoordInitializationFS.test(generatedFragmentLines)).toBe(true);
  });

  it("generates shader code for custom attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader(),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
    };

    CustomShaderStage.process(renderResources, primitiveWithCustomAttributes);

    var generatedVertexLines = shaderBuilder._vertexShaderParts.shaderLines[0];
    var generatedFragmentLines =
      shaderBuilder._fragmentShaderParts.shaderLines[0];

    var positionDeclaration = makeAttributeRegex("vec3", "position");
    var temperatureDeclaration = makeAttributeRegex("float", "temperature");

    expect(positionDeclaration.test(generatedVertexLines)).toBe(true);
    expect(positionDeclaration.test(generatedFragmentLines)).toBe(true);
    expect(temperatureDeclaration.test(generatedVertexLines)).toBe(true);
    expect(temperatureDeclaration.test(generatedFragmentLines)).toBe(true);

    var positionInitializationVS = makeInitializationRegex("position", true);
    var temperatureInitializationVS = makeInitializationRegex(
      "temperature",
      true
    );
    expect(positionInitializationVS.test(generatedVertexLines)).toBe(true);
    expect(temperatureInitializationVS.test(generatedVertexLines)).toBe(true);

    var positionInitializationFS = makeInitializationRegex("position", false);
    var temperatureInitializationFS = makeInitializationRegex(
      "temperature",
      false
    );
    expect(positionInitializationFS.test(generatedFragmentLines)).toBe(true);
    expect(temperatureInitializationFS.test(generatedFragmentLines)).toBe(true);
  });

  it("generates the shader lines in the correct order", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: emptyFragmentShader,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    var vertexLines = shaderBuilder._vertexShaderParts.shaderLines;
    var fragmentLines = shaderBuilder._fragmentShaderParts.shaderLines;

    // if the struct Attributes declaration is present, the partial shader
    // string is the automatically-generated portion.
    var generatedCodeRegex = /struct Attributes/;

    // Check that all the parts of each shader are ordered correctly
    expect(generatedCodeRegex.test(vertexLines[0])).toBe(true);
    expect(vertexLines[1]).toEqual("#line 0");
    expect(vertexLines[2]).toBe(emptyVertexShader);
    expect(vertexLines[3]).toBe(_shadersCustomShaderStageVS);
    expect(generatedCodeRegex.test(fragmentLines[0])).toBe(true);
    expect(fragmentLines[1]).toEqual("#line 0");
    expect(fragmentLines[2]).toBe(emptyFragmentShader);
    expect(fragmentLines[3]).toBe(_shadersCustomShaderStageFS);

    // The auto-generated portion is one big string, so test that the
    // declarations are in the right order.
    var vertexDeclarationOrder = /struct Attributes(.|\n)*struct VertexInput(.|\n)*void initializeInputStruct/;
    expect(vertexDeclarationOrder.test(vertexLines[0])).toBe(true);
    var fragmentDeclarationOrder = /struct Attributes(.|\n)*struct FragmentInput(.|\n)*void initializeInputStruct/;
    expect(fragmentDeclarationOrder.test(fragmentLines[0])).toBe(true);
  });

  it("configures positions in other coordinate systems", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: emptyFragmentShader,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
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

    var fragmentLines = shaderBuilder._fragmentShaderParts.shaderLines;
    var expectedInput = [
      "struct FragmentInput",
      "{",
      "    Attributes attributes;",
      "    vec3 positionMC;",
      "    vec3 positionWC;",
      "    vec3 positionEC;",
      "};",
    ].join("\n");
    expect(new RegExp(expectedInput).test(fragmentLines[0])).toBe(true);

    var expectedInitialization = [
      "void initializeInputStruct\\(out FragmentInput fsInput\\)",
      "{",
      "   fsInput.positionMC = v_position;",
      "   fsInput.positionWC = v_positionWC;",
      "   fsInput.positionEC = v_positionEC;",
    ].join("\n");
    expect(new RegExp(expectedInitialization).test(fragmentLines[0])).toBe(
      true
    );
  });
});
