import {
  combine,
  GltfLoader,
  Matrix4,
  ModelExperimentalStatistics,
  NodeStatisticsPipelineStage,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/NodeStatisticsPipelineStage", function () {
  const boxTextured =
    "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
  const boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
  const boxInstancedTranslationMinMax =
    "./Data/Models/GltfLoader/BoxInstancedTranslationWithMinMax/glTF/box-instanced-translation-min-max.gltf";

  let scene;
  const gltfLoaders = [];

  beforeAll(function () {
    scene = createScene();
    // This is set to true to guarantee that buffers / typed arrays
    // are loaded in as expected for instanced models. If this is false,
    // instanced attributes will always load in as typed arrays, which
    // will cause several tests to fail.
    scene.context._instancedArrays = true;
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
      model: {
        sceneGraph: {
          components: components,
          computedModelMatrix: Matrix4.IDENTITY,
        },
        statistics: new ModelExperimentalStatistics(),
      },
      runtimeNode: {
        computedTransform: Matrix4.IDENTITY,
      },
    };
  }

  it("does not update statistics for a non-instanced model", function () {
    return loadGltf(boxTextured).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[1];
      const renderResources = mockRenderResources(components);

      NodeStatisticsPipelineStage.process(renderResources, node);

      const statistics = renderResources.model.statistics;

      expect(statistics.pointsLength).toBe(0);
      expect(statistics.trianglesLength).toBe(0);
      expect(statistics.geometryByteLength).toBe(0);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics.propertyTablesByteLength).toBe(0);
    });
  });

  it("updates statistics for an instanced model", function () {
    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const node = components.nodes[0];
      const renderResources = mockRenderResources(components);

      NodeStatisticsPipelineStage.process(renderResources, node);

      const statistics = renderResources.model.statistics;

      // Model contains four translated instances:
      // 4 vec3s * 3 floats/vec3 * 4 bytes/float = 48
      const expectedByteLength = 48;

      expect(statistics.pointsLength).toBe(0);
      expect(statistics.trianglesLength).toBe(0);
      expect(statistics.geometryByteLength).toBe(expectedByteLength);
      expect(statistics.texturesByteLength).toBe(0);
      expect(statistics.propertyTablesByteLength).toBe(0);
    });
  });

  it("_countInstancingAttributes does not count attributes without buffers", function () {
    // This model contains instanced rotations, so the transformation
    // attributes will be loaded in as packed typed arrays only.
    // Feature IDs are also only loaded as packed typed arrays.
    return loadGltf(boxInstanced).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const node = components.nodes[0];

      NodeStatisticsPipelineStage._countInstancingAttributes(
        statistics,
        node.instances
      );

      expect(statistics.geometryByteLength).toBe(0);
    });
  });

  it("_countInstancingAttributes counts attributes with buffers", function () {
    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const node = components.nodes[0];

      NodeStatisticsPipelineStage._countInstancingAttributes(
        statistics,
        node.instances
      );

      // Model contains four translated instances:
      // 4 instances * 3 floats * 4 bytes per float
      const expectedByteLength = 4 * 12;

      expect(statistics.geometryByteLength).toBe(expectedByteLength);
    });
  });

  it("_countInstancing2DBuffers counts instancing transform buffer for 2D", function () {
    return loadGltf(boxInstanced).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const mockRuntimeNode = {
        instancingTransformsBuffer2D: {
          // Matrices are stored as 3 vec4s, so this is
          // 4 matrices * 12 floats/matrix * 4 bytes/float = 192
          sizeInBytes: 192,
        },
      };

      NodeStatisticsPipelineStage._countInstancing2DBuffers(
        statistics,
        mockRuntimeNode
      );

      const transformsBuffer2D = mockRuntimeNode.instancingTransformsBuffer2D;
      expect(statistics.geometryByteLength).toBe(
        transformsBuffer2D.sizeInBytes
      );
    });
  });

  it("_countInstancing2DBuffers counts instancing translation buffer for 2D", function () {
    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const mockRuntimeNode = {
        instancingTranslationBuffer2D: {
          // Model contains four translated instances:
          // 4 instances * 3 floats * 4 bytes per float
          sizeInBytes: 48,
        },
      };

      NodeStatisticsPipelineStage._countInstancing2DBuffers(
        statistics,
        mockRuntimeNode
      );

      const translationBuffer2D = mockRuntimeNode.instancingTranslationBuffer2D;
      expect(statistics.geometryByteLength).toBe(
        translationBuffer2D.sizeInBytes
      );
    });
  });
});
