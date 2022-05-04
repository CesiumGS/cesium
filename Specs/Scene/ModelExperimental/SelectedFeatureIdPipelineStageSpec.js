import {
  combine,
  GltfLoader,
  SelectedFeatureIdPipelineStage,
  ShaderBuilder,
  ShaderDestination,
  Resource,
  ResourceCache,
  _shadersSelectedFeatureIdStageCommon,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/ModelExperimental/SelectedFeatureIdPipelineStage",
  function () {
    const buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    const boxInstanced =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
    const largeFeatureIdTexture =
      "./Data/Models/GltfLoader/LargeFeatureIdTexture/glTF/LargeFeatureIdTexture.gltf";

    let scene;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      const gltfLoadersLength = gltfLoaders.length;
      for (let i = 0; i < gltfLoadersLength; ++i) {
        const gltfLoader = gltfLoaders[i];
        if (!gltfLoader.isDestroyed()) {
          gltfLoader.destroy();
        }
      }
      gltfLoaders.length = 0;
      ResourceCache.clearForSpecs();
    });

    function createDefaultShaderBuilder() {
      const shaderBuilder = new ShaderBuilder();
      shaderBuilder.addStruct(
        SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
        SelectedFeatureIdPipelineStage.STRUCT_NAME_SELECTED_FEATURE,
        ShaderDestination.BOTH
      );
      return shaderBuilder;
    }

    function verifyFeatureStruct(shaderBuilder) {
      ShaderBuilderTester.expectHasVertexStruct(
        shaderBuilder,
        SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
        SelectedFeatureIdPipelineStage.STRUCT_NAME_SELECTED_FEATURE,
        ["    int id;", "    vec2 st;", "    vec4 color;"]
      );

      ShaderBuilderTester.expectHasFragmentStruct(
        shaderBuilder,
        SelectedFeatureIdPipelineStage.STRUCT_ID_SELECTED_FEATURE,
        SelectedFeatureIdPipelineStage.STRUCT_NAME_SELECTED_FEATURE,
        ["    int id;", "    vec2 st;", "    vec4 color;"]
      );
    }

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false,
      });
    }

    function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    function mockRenderResources(node) {
      return {
        shaderBuilder: createDefaultShaderBuilder(),
        runtimeNode: {
          node: node,
        },
        model: {
          featureIdLabel: "featureId_0",
          instanceFeatureIdLabel: "instanceFeatureId_0",
        },
        uniformMap: {},
        hasPropertyTable: false,
      };
    }

    it("selects primitive feature IDs", function () {
      return loadGltf(buildingsMetadata).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);
        renderResources.model.featureIdLabel = "featureId_1";

        SelectedFeatureIdPipelineStage.process(
          renderResources,
          primitive,
          frameState
        );

        expect(renderResources.hasPropertyTable).toBe(true);

        const shaderBuilder = renderResources.shaderBuilder;
        verifyFeatureStruct(shaderBuilder);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_ATTRIBUTE",
          "SELECTED_FEATURE_ID defaultIdsTest",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_ATTRIBUTE",
          "SELECTED_FEATURE_ID defaultIdsTest",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);
      });
    });

    it("selects feature ID texture", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);
        renderResources.model.featureIdLabel = "landCover";

        SelectedFeatureIdPipelineStage.process(
          renderResources,
          primitive,
          frameState
        );
        expect(renderResources.hasPropertyTable).toBe(true);

        const shaderBuilder = renderResources.shaderBuilder;
        verifyFeatureStruct(shaderBuilder);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_TEXTURE",
          "SELECTED_FEATURE_ID landCover",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, []);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);
      });
    });

    it("selects instance feature IDs", function () {
      return loadGltf(boxInstanced).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);
        renderResources.model.instanceFeatureIdLabel = "section";

        SelectedFeatureIdPipelineStage.process(
          renderResources,
          primitive,
          frameState
        );
        expect(renderResources.hasPropertyTable).toBe(true);

        const shaderBuilder = renderResources.shaderBuilder;
        verifyFeatureStruct(shaderBuilder);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_ATTRIBUTE",
          "SELECTED_FEATURE_ID section",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_ATTRIBUTE",
          "SELECTED_FEATURE_ID section",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);
      });
    });

    it("handles null feature ID when present", function () {
      return loadGltf(largeFeatureIdTexture).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(node);
        renderResources.model.featureIdLabel = "idsGWithNull";

        SelectedFeatureIdPipelineStage.process(
          renderResources,
          primitive,
          frameState
        );
        expect(renderResources.hasPropertyTable).toBe(true);

        const shaderBuilder = renderResources.shaderBuilder;
        verifyFeatureStruct(shaderBuilder);
        ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_NULL_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_TEXTURE",
          "SELECTED_FEATURE_ID idsGWithNull",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, []);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);

        const uniformMap = renderResources.uniformMap;
        expect(uniformMap.model_nullFeatureId()).toBe(10);
      });
    });
  },
  "WebGL"
);
