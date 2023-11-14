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
      "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json"
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
      propertyStatisticsFields
    );

    // Check for Statistics struct
    const statisticsFields = ["    PropertyStatistics_a a;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "Statistics",
      "Statistics",
      statisticsFields
    );

    // Check for Metadata struct
    const metadataFields = ["    Statistics statistics;", "    float a;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "Metadata",
      "Metadata",
      metadataFields
    );

    // Check for VoxelProperty structs
    const voxelPropertyFields = [
      "    vec3 partialDerivativeLocal;",
      "    vec3 partialDerivativeWorld;",
      "    vec3 partialDerivativeView;",
      "    vec3 partialDerivativeValid;",
    ];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "VoxelProperty_a",
      "VoxelProperty_a",
      voxelPropertyFields
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
    ];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "Voxel",
      "Voxel",
      voxelFields
    );

    // Check for FragmentInput struct
    const fragmentInputFields = ["    Metadata metadata;", "    Voxel voxel;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "FragmentInput",
      "FragmentInput",
      fragmentInputFields
    );

    // Check for Properties struct
    const propertiesFields = ["    float a;"];
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      "Properties",
      "Properties",
      propertiesFields
    );

    // Check clearProperties function
    // Check sumProperties function
    // Check scaleProperties function
    // Check mixProperties function
    // Check copyPropertiesToMetadata function
    // Check setStatistics function
    // Check getPropertiesFromMegatextureAtUv function
  });
});
