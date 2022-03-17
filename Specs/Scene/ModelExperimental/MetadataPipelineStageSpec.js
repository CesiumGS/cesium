import {
  combine,
  GltfLoader,
  MetadataPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/ModelExperimental/MetadataPipelineStage",
  function () {
    const boxTexturedBinary =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
    const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";

    let scene;
    const gltfLoaders = [];
    const resources = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function cleanup(resourcesArray) {
      for (let i = 0; i < resourcesArray.length; i++) {
        const resource = resourcesArray[i];
        if (!resource.isDestroyed()) {
          resource.destroy();
        }
      }
      resourcesArray.length = 0;
    }

    afterEach(function () {
      cleanup(resources);
      cleanup(gltfLoaders);
      ResourceCache.clearForSpecs();
    });

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    function mockRenderResources(components) {
      return {
        shaderBuilder: new ShaderBuilder(),
        model: {
          featureMetadata: components.featureMetadata,
        },
        uniformMap: {},
      };
    }

    it("Handles primitives without metadata gracefully", function () {
      return loadGltf(boxTexturedBinary).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[1];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(components);

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          []
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          []
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, []);

        expect(renderResources.uniformMap).toEqual({});
      });
    });

    it("Adds property textures to the shader", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const frameState = scene.frameState;
        const renderResources = mockRenderResources(components);

        MetadataPipelineStage.process(renderResources, primitive, frameState);

        const shaderBuilder = renderResources.shaderBuilder;
        ShaderBuilderTester.expectHasVertexStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_VS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentStruct(
          shaderBuilder,
          MetadataPipelineStage.STRUCT_ID_METADATA_FS,
          MetadataPipelineStage.STRUCT_NAME_METADATA,
          ["    float vegetationDensity;"]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_VS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          []
        );
        ShaderBuilderTester.expectHasFragmentFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_INITIALIZE_METADATA_FS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_INITIALIZE_METADATA,
          [
            "    metadata.vegetationDensity = texture2D(u_propertyTexture_0, attributes.texCoord_0).r;",
          ]
        );
        ShaderBuilderTester.expectHasVertexFunction(
          shaderBuilder,
          MetadataPipelineStage.FUNCTION_ID_SET_METADATA_VARYINGS,
          MetadataPipelineStage.FUNCTION_SIGNATURE_SET_METADATA_VARYINGS,
          []
        );
        ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, []);
        ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
          "uniform sampler2D u_propertyTexture_0;",
        ]);

        const uniformMap = renderResources.uniformMap;
        const propertyTexture0 = components.featureMetadata.getPropertyTexture(
          0
        );
        expect(uniformMap.u_propertyTexture_0()).toBe(propertyTexture0.texture);
      });
    });
  },
  "WebGL"
);
