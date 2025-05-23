import {
  Cesium3DTilesVoxelProvider,
  VoxelPrimitive,
  VoxelRenderResources,
  processVoxelProperties,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import ShaderBuilderTester from "../../../../Specs/ShaderBuilderTester.js";

describe("Scene/processVoxelProperties", function () {
  let scene;
  let provider;

  beforeAll(async function () {
    scene = createScene();

    provider = await Cesium3DTilesVoxelProvider.fromUrl(
      "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json",
    );
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("adds shader defines and structs", async function () {
    const primitive = new VoxelPrimitive({ provider });
    primitive.update(scene.frameState);

    const renderResources = new VoxelRenderResources(primitive);
    processVoxelProperties(renderResources, primitive);

    const { shaderBuilder } = renderResources;

    // Check fragment shader defines
    // ShaderBuilderTest.expectHasFragmentDefines would check defines from
    // previous stages, so just check the relevant lines directly
    ShaderBuilderTester.expectFragmentLinesContains(shaderBuilder, [
      "#define METADATA_COUNT 1",
      "#define STATISTICS",
    ]);

    // Check for PropertyStatistics structs
    const propertyStatisticsFields = ["    float min;", "    float max;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "PropertyStatistics_a",
      "PropertyStatistics_a",
      propertyStatisticsFields,
    );

    // Check for MetadataStatistics struct
    const metadataStatisticsFields = ["    PropertyStatistics_a a;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "MetadataStatistics",
      "MetadataStatistics",
      metadataStatisticsFields,
    );

    // Check for Metadata struct
    const metadataFields = ["    float a;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "Metadata",
      "Metadata",
      metadataFields,
    );

    // Check for Voxel struct
    const voxelFields = [
      "    VoxelProperty_a a;",
      "    vec3 positionEC;",
      "    vec3 positionUv;",
      "    vec3 positionShapeUv;",
      "    vec3 positionUvLocal;",
      "    vec3 surfaceNormal;",
      "    vec3 viewDirUv;",
      "    vec3 viewDirWorld;",
      "    float travelDistance;",
      "    int stepCount;",
      "    int sampleIndex;",
      "    int tileIndex;",
      "    float distanceToDepthBuffer;",
    ];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "Voxel",
      "Voxel",
      voxelFields,
    );

    // Check for FragmentInput struct
    const fragmentInputFields = [
      "    MetadataStatistics metadataStatistics;",
      "    Metadata metadata;",
      "    Voxel voxel;",
    ];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "FragmentInput",
      "FragmentInput",
      fragmentInputFields,
    );

    // Check for Properties struct
    const propertiesFields = ["    float a;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "Properties",
      "Properties",
      propertiesFields,
    );

    // Check clearProperties function
    ShaderBuilderTester.expectHasFragmentFunctionUnordered(
      shaderBuilder,
      "clearProperties",
      "Properties clearProperties()",
      [
        "    Properties properties;",
        "    properties.a = float(0.0);",
        "    return properties;",
      ],
    );

    // Check sumProperties function
    ShaderBuilderTester.expectHasFragmentFunctionUnordered(
      shaderBuilder,
      "sumProperties",
      "Properties sumProperties(Properties propertiesA, Properties propertiesB)",
      [
        "    Properties properties;",
        "    properties.a = propertiesA.a + propertiesB.a;",
        "    return properties;",
      ],
    );

    // Check scaleProperties function
    ShaderBuilderTester.expectHasFragmentFunctionUnordered(
      shaderBuilder,
      "scaleProperties",
      "Properties scaleProperties(Properties properties, float scale)",
      [
        "    Properties scaledProperties = properties;",
        "    scaledProperties.a *= scale;",
        "    return scaledProperties;",
      ],
    );

    // Check mixProperties function
    ShaderBuilderTester.expectHasFragmentFunctionUnordered(
      shaderBuilder,
      "mixProperties",
      "Properties mixProperties(Properties propertiesA, Properties propertiesB, float mixFactor)",
      [
        "    Properties properties;",
        "    properties.a = mix(propertiesA.a, propertiesB.a, mixFactor);",
        "    return properties;",
      ],
    );

    // Check copyPropertiesToMetadata function
    ShaderBuilderTester.expectHasFragmentFunctionUnordered(
      shaderBuilder,
      "copyPropertiesToMetadata",
      "void copyPropertiesToMetadata(in Properties properties, inout Metadata metadata)",
      ["    metadata.a = properties.a;"],
    );

    // Check setStatistics function
    ShaderBuilderTester.expectHasFragmentFunctionUnordered(
      shaderBuilder,
      "setStatistics",
      "void setStatistics(inout MetadataStatistics metadataStatistics)",
      [
        "    metadataStatistics.a.min = 0.0;",
        "    metadataStatistics.a.max = 1.0;",
      ],
    );

    // Check getPropertiesFromMegatextureAtUv function
    ShaderBuilderTester.expectHasFragmentFunctionUnordered(
      shaderBuilder,
      "getPropertiesFromMegatextureAtUv",
      "Properties getPropertiesFromMegatextureAtUv(vec2 texcoord)",
      [
        "    Properties properties;",
        "    properties.a = texture(u_megatextureTextures[0], texcoord).r;",
        "    return properties;",
      ],
    );
  });
});
