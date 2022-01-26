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
          featureIdIndex: 0,
          instanceFeatureIdIndex: 0,
        },
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
        renderResources.model.featureIdIndex = 2;

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
          "SELECTED_FEATURE_ID featureId_2",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_ATTRIBUTE",
          "SELECTED_FEATURE_ID featureId_2",
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
        renderResources.model.featureIdIndex = 0;

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
          "SELECTED_FEATURE_ID featureId_0",
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
        renderResources.model.instanceFeatureIdIndex = 1;

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
          "SELECTED_FEATURE_ID instanceFeatureId_1",
        ]);
        ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
          "HAS_SELECTED_FEATURE_ID",
          "HAS_SELECTED_FEATURE_ID_ATTRIBUTE",
          "SELECTED_FEATURE_ID instanceFeatureId_1",
        ]);
        ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);
        ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
          _shadersSelectedFeatureIdStageCommon,
        ]);
      });
    });
  },
  "WebGL"
);
