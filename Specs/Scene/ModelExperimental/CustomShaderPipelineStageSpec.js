import {
  AlphaMode,
  AttributeType,
  CustomShader,
  CustomShaderPipelineStage,
  LightingModel,
  ModelAlphaOptions,
  ModelLightingOptions,
  Pass,
  ShaderBuilder,
  UniformType,
  VaryingType,
  _shadersCustomShaderStageVS,
  _shadersCustomShaderStageFS,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/CustomShaderPipelineStage", function () {
  const primitive = {
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

  const primitiveWithCustomAttributes = {
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

  const primitiveWithColorAttributes = {
    attributes: [
      {
        semantic: "POSITION",
        type: AttributeType.VEC3,
      },
      {
        semantic: "COLOR",
        setIndex: 0,
        type: AttributeType.VEC3,
      },
      {
        semantic: "COLOR",
        setIndex: 1,
        type: AttributeType.VEC4,
      },
    ],
  };

  const emptyVertexShader =
    "void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {}";
  const emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";
  const emptyShader = new CustomShader({
    vertexShaderText: emptyVertexShader,
    fragmentShaderText: emptyFragmentShader,
  });

  it("sets defines in the shader", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: emptyShader,
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CUSTOM_FRAGMENT_SHADER",
      "CUSTOM_SHADER_MODIFY_MATERIAL",
    ]);
  });

  it("adds uniforms from the custom shader", function () {
    const uniforms = {
      u_time: {
        type: UniformType.FLOAT,
      },
      u_enableAnimation: {
        type: UniformType.BOOL,
      },
    };
    const customShader = new CustomShader({
      uniforms: uniforms,
      vertexShaderText: emptyVertexShader,
      fragmentShaderText: emptyFragmentShader,
    });
    const model = {
      customShader: customShader,
    };
    const uniformMap = {};
    const shaderBuilder = new ShaderBuilder();

    const renderResources = {
      shaderBuilder: shaderBuilder,
      uniformMap: uniformMap,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
      "uniform bool u_enableAnimation;",
      "uniform float u_time;",
    ]);

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform bool u_enableAnimation;",
      "uniform float u_time;",
    ]);

    expect(renderResources.uniformMap).toEqual(customShader.uniformMap);
  });

  it("adds varying declarations from the custom shader", function () {
    const varyings = {
      v_distanceFromCenter: VaryingType.FLOAT,
      v_computedMatrix: VaryingType.MAT3,
    };
    const customShader = new CustomShader({
      vertexShaderText: emptyVertexShader,
      fragmentShaderText: emptyFragmentShader,
      varyings: varyings,
    });
    const model = {
      customShader: customShader,
    };
    const shaderBuilder = new ShaderBuilder();

    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
      "varying float v_distanceFromCenter;",
      "varying mat2 v_computedMatrix;",
    ]);
  });

  it("overrides the lighting model if specified in the custom shader", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: emptyFragmentShader,
        lightingModel: LightingModel.PBR,
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(renderResources.lightingOptions.lightingModel).toBe(
      LightingModel.PBR
    );
  });

  it("sets alpha options", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: emptyFragmentShader,
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(renderResources.alphaOptions.pass).not.toBeDefined();
    expect(renderResources.alphaOptions.alphaMode).toBe(AlphaMode.OPAQUE);
  });

  it("sets alpha options for translucent custom shader", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: emptyFragmentShader,
        isTranslucent: true,
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);
    expect(renderResources.alphaOptions.alphaMode).toBe(AlphaMode.BLEND);
  });

  it("unlit and translucency work even if no shader code is present", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        lightingModel: LightingModel.PBR,
        isTranslucent: true,
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(renderResources.alphaOptions.pass).toBe(Pass.TRANSLUCENT);
    expect(renderResources.alphaOptions.alphaMode).toBe(AlphaMode.BLEND);

    expect(renderResources.lightingOptions.lightingModel).toBe(
      LightingModel.PBR
    );

    // the shader code proper gets optimized out
    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, []);
    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, []);
  });

  it("generates shader code from built-in attributes", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput)",
          "{",
          "    vec3 normalMC = vsInput.attributes.normalMC;",
          "    vec2 texCoord = vsInput.attributes.texCoord_0;",
          "    vsOutput.positionMC = vsInput.attributes.positionMC;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    vec3 positionMC = fsInput.attributes.positionMC;",
          "    vec3 normalEC = fsInput.attributes.normalEC;",
          "    vec2 texCoord = fsInput.attributes.texCoord_0;",
          "}",
        ].join("\n"),
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_VS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 positionMC;", "    vec3 normalMC;", "    vec2 texCoord_0;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 positionMC;", "    vec3 normalEC;", "    vec2 texCoord_0;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_VERTEX_INPUT,
      "VertexInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_VS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_VS,
      [
        "    vsInput.attributes.positionMC = attributes.positionMC;",
        "    vsInput.attributes.normalMC = attributes.normalMC;",
        "    vsInput.attributes.texCoord_0 = attributes.texCoord_0;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_FS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_FS,
      [
        "    fsInput.attributes.positionMC = attributes.positionMC;",
        "    fsInput.attributes.normalEC = attributes.normalEC;",
        "    fsInput.attributes.texCoord_0 = attributes.texCoord_0;",
      ]
    );
  });

  it("generates shader code for custom attributes", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput)",
          "{",
          "    float temperature = vsInput.attributes.temperature;",
          "    positionMC = vsInput.attributes.positionMC;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    float temperature = fsInput.attributes.temperature;",
          "    vec3 positionMC = fsInput.attributes.positionMC;",
          "}",
        ].join("\n"),
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(
      renderResources,
      primitiveWithCustomAttributes
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_VS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 positionMC;", "    float temperature;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 positionMC;", "    float temperature;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_VERTEX_INPUT,
      "VertexInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_VS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_VS,
      [
        "    vsInput.attributes.positionMC = attributes.positionMC;",
        "    vsInput.attributes.temperature = attributes.temperature;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_FS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_FS,
      [
        "    fsInput.attributes.positionMC = attributes.positionMC;",
        "    fsInput.attributes.temperature = attributes.temperature;",
      ]
    );
  });

  it("treats COLOR attributes as vec4", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        varyings: {
          v_color: VaryingType.FLOAT,
          v_computedMatrix: VaryingType.MAT3,
        },
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput)",
          "{",
          "    vec4 color += vsInput.attributes.color_0 + vsInput.attributes.color_1;",
          "}",
        ],
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    vec4 color += fsInput.attributes.color_0 + fsInput.attributes.color_1;",
          "}",
        ],
      }),
    };

    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(
      renderResources,
      primitiveWithColorAttributes
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_VS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec4 color_0;", "    vec4 color_1;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec4 color_0;", "    vec4 color_1;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_VERTEX_INPUT,
      "VertexInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_VS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_VS,
      [
        "    vsInput.attributes.color_0 = attributes.color_0;",
        "    vsInput.attributes.color_1 = attributes.color_1;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_FS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_FS,
      [
        "    fsInput.attributes.color_0 = attributes.color_0;",
        "    fsInput.attributes.color_1 = attributes.color_1;",
      ]
    );
  });

  it("only generates input lines for attributes that are used", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput)",
          "{",
          "    vsOutput.positionMC = 2.0 * vsInput.attributes.positionMC - 1.0;",
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
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(
      renderResources,
      primitiveWithCustomAttributes
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_VS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 positionMC;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    float temperature;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_VERTEX_INPUT,
      "VertexInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_VS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_VS,
      ["    vsInput.attributes.positionMC = attributes.positionMC;"]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_FS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_FS,
      ["    fsInput.attributes.temperature = attributes.temperature;"]
    );
  });

  it("generates the shader lines in the correct order", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: emptyShader,
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.structIds).toEqual([
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_VS,
      CustomShaderPipelineStage.STRUCT_ID_VERTEX_INPUT,
    ]);
    expect(shaderBuilder._fragmentShaderParts.structIds).toEqual([
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
    ]);

    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
      "#line 0",
      emptyVertexShader,
      _shadersCustomShaderStageVS,
    ]);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      "#line 0",
      emptyFragmentShader,
      _shadersCustomShaderStageFS,
    ]);
  });

  it("does not add positions in other coordinate systems if not needed", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: emptyShader,
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );
  });

  it("configures positions in other coordinate systems when present in the shader", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = fsInput.attributes.positionMC;",
          "    material.specular = fsInput.attributes.positionWC;",
          "    material.normal = fsInput.attributes.positionEC;",
          "}",
        ].join("\n"),
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "COMPUTE_POSITION_WC",
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_VS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      []
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 positionMC;", "    vec3 positionWC;", "    vec3 positionEC;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_VERTEX_INPUT,
      "VertexInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_VS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_VS,
      []
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_FS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_FS,
      [
        "    fsInput.attributes.positionMC = attributes.positionMC;",
        "    fsInput.attributes.positionWC = attributes.positionWC;",
        "    fsInput.attributes.positionEC = attributes.positionEC;",
      ]
    );
  });

  it("infers default values for built-in attributes", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput)",
          "{",
          "    vec2 texCoords = vsInput.attributes.texCoord_1;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = vec3(fsInput.attributes.tangentEC);",
          "}",
        ].join("\n"),
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_VS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec2 texCoord_1;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 tangentEC;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_VERTEX_INPUT,
      "VertexInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_VS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_VS,
      ["    vsInput.attributes.texCoord_1 = vec2(0.0);"]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_FS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_FS,
      ["    fsInput.attributes.tangentEC = vec3(1.0, 0.0, 0.0);"]
    );
  });

  it("handles incompatible primitives gracefully", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput)",
          "{",
          "    vec3 texCoords = vsInput.attributes.notAnAttribute;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse *= fsInput.attributes.alsoNotAnAttribute;",
          "}",
        ].join("\n"),
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    spyOn(CustomShaderPipelineStage, "_oneTimeWarning");

    CustomShaderPipelineStage.process(renderResources, primitive);

    // once for the vertex shader, once for the fragment shader
    expect(CustomShaderPipelineStage._oneTimeWarning.calls.count()).toBe(2);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([]);
  });

  it("disables vertex shader if vertexShaderText is not provided", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        fragmentShaderText: emptyFragmentShader,
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      uniformMap: {},
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "HAS_CUSTOM_FRAGMENT_SHADER",
      "CUSTOM_SHADER_MODIFY_MATERIAL",
    ]);

    expect(shaderBuilder._vertexShaderParts.shaderLines).toEqual([]);
    const fragmentShaderIndex = shaderBuilder._fragmentShaderParts.shaderLines.indexOf(
      emptyFragmentShader
    );
    expect(fragmentShaderIndex).not.toBe(-1);
  });

  it("disables fragment shader if fragmentShaderText is not provided", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([]);

    const vertexShaderIndex = shaderBuilder._vertexShaderParts.shaderLines.indexOf(
      emptyVertexShader
    );
    expect(vertexShaderIndex).not.toBe(-1);
    expect(shaderBuilder._fragmentShaderParts.shaderLines).toEqual([]);
  });

  it("disables custom shader if neither fragmentShaderText nor vertexShaderText are provided", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader(),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    // Essentially the shader stage is skipped, so nothing should be updated
    expect(shaderBuilder).toEqual(new ShaderBuilder());
    expect(renderResources.uniformMap).toEqual({});
    expect(renderResources.lightingOptions).toEqual(new ModelLightingOptions());
  });

  it("handles fragment-only custom shader that computes positionWC", function () {
    const shaderBuilder = new ShaderBuilder();
    const model = {
      customShader: new CustomShader({
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = fsInput.attributes.positionWC;",
          "}",
        ].join("\n"),
      }),
    };
    const renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderPipelineStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "COMPUTE_POSITION_WC",
    ]);

    expect(shaderBuilder._vertexShaderParts.structIds).toEqual([]);
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_ATTRIBUTES_FS,
      CustomShaderPipelineStage.STRUCT_NAME_ATTRIBUTES,
      ["    vec3 positionWC;"]
    );

    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      CustomShaderPipelineStage.STRUCT_ID_FRAGMENT_INPUT,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    FeatureIds featureIds;",
        "    Metadata metadata;",
      ]
    );

    expect(shaderBuilder._vertexShaderParts.functionIds).toEqual([]);
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      CustomShaderPipelineStage.FUNCTION_ID_INITIALIZE_INPUT_STRUCT_FS,
      CustomShaderPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_INPUT_STRUCT_FS,
      ["    fsInput.attributes.positionWC = attributes.positionWC;"]
    );
  });
});
