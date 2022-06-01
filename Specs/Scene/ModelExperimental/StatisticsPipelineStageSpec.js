import {
  combine,
  GltfLoader,
  ModelExperimentalStatistics,
  StatisticsPipelineStage,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/StatisticsPipelineStage", function () {
  const boomBox = "./Data/Models/PBR/BoomBox/BoomBox.gltf";
  const boomBoxSpecularGlossiness =
    "./Data/Models/PBR/BoomBoxSpecularGlossiness/BoomBox.gltf";
  const boxTextured =
    "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
  const pointCloudRGB =
    "./Data/Models/GltfLoader/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";
  const triangleWithoutIndices =
    "./Data/Models/GltfLoader/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf";
  const triangleStrip =
    "./Data/Models/GltfLoader/TriangleStrip/glTF/TriangleStrip.gltf";
  const triangleFan =
    "./Data/Models/GltfLoader/TriangleFan/glTF/TriangleFan.gltf";

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

  it("counts memory for a model", function () {});

  it("_countGeometry computes memory usage for a triangle mesh", function () {
    return loadGltf(boxTextured).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const primitive = components.nodes[1].primitives[0];

      StatisticsPipelineStage._countGeometry(statistics, primitive);

      expect(statistics.pointsLength).toBe(0);
      // 6 faces * 2 triangles
      expect(statistics.trianglesLength).toBe(12);

      const attributes = primitive.attributes;
      let expectedLength = 0;

      // Positions and normals share a buffer
      expectedLength += attributes[0].buffer.sizeInBytes;

      // Texture coordinates
      expectedLength += attributes[2].buffer.sizeInBytes;

      // Indices
      expectedLength += primitive.indices.buffer.sizeInBytes;

      expect(statistics.geometryByteLength).toBe(expectedLength);
    });
  });

  it("_countGeometry computes memory usage for triangle mesh without indices", function () {
    return loadGltf(triangleWithoutIndices).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      StatisticsPipelineStage._countGeometry(statistics, primitive);

      expect(statistics.pointsLength).toBe(0);
      // 1 triangle
      expect(statistics.trianglesLength).toBe(1);

      const attributes = primitive.attributes;
      let expectedLength = 0;

      // Positions
      expectedLength += attributes[0].buffer.sizeInBytes;

      expect(statistics.geometryByteLength).toBe(expectedLength);
    });
  });

  it("_countGeometry computes memory usage correctly for attributes with CPU copy", function () {
    // This will create a copy of both the positions and indices on the CPU
    const options = {
      loadPositionsFor2D: true,
      loadIndicesForWireframe: true,
    };

    return loadGltf(boxTextured, options).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const primitive = components.nodes[1].primitives[0];

      StatisticsPipelineStage._countGeometry(statistics, primitive);

      expect(statistics.pointsLength).toBe(0);
      // 6 faces * 2 triangles
      expect(statistics.trianglesLength).toBe(12);

      const attributes = primitive.attributes;
      let expectedLength = 0;

      // A CPU copy of the positions is made
      expectedLength += 2 * attributes[0].buffer.sizeInBytes;

      // Normals are stored on the GPU only
      expectedLength += attributes[1].buffer.sizeInBytes;

      // Texture coordinates
      expectedLength += attributes[2].buffer.sizeInBytes;

      // indices
      expectedLength += 2 * primitive.indices.buffer.sizeInBytes;

      expect(statistics.geometryByteLength).toBe(expectedLength);
    });
  });

  it("_countGeometry computes memory usage for point cloud", function () {
    return loadGltf(pointCloudRGB).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      StatisticsPipelineStage._countGeometry(statistics, primitive);

      expect(statistics.pointsLength).toBe(2500);
      expect(statistics.trianglesLength).toBe(0);

      const attributes = primitive.attributes;
      let expectedLength = 0;

      // Positions and colors share a buffer
      expectedLength += attributes[0].buffer.sizeInBytes;

      expect(statistics.geometryByteLength).toBe(expectedLength);
    });
  });

  it("_countGeometry computes memory usage for triangle strip", function () {
    return loadGltf(triangleStrip).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      StatisticsPipelineStage._countGeometry(statistics, primitive);

      expect(statistics.pointsLength).toBe(0);
      // 1 face * 2 triangles
      expect(statistics.trianglesLength).toBe(2);

      const attributes = primitive.attributes;
      let expectedLength = 0;

      // Positions
      expectedLength += attributes[0].buffer.sizeInBytes;

      // Indices
      expectedLength += primitive.indices.buffer.sizeInBytes;

      expect(statistics.geometryByteLength).toBe(expectedLength);
    });
  });

  it("_countGeometry Computes memory usage for triangle fan", function () {
    return loadGltf(triangleFan).then(function (gltfLoader) {
      const statistics = new ModelExperimentalStatistics();
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      StatisticsPipelineStage._countGeometry(statistics, primitive);

      expect(statistics.pointsLength).toBe(0);
      // 1 face * 2 triangles
      expect(statistics.trianglesLength).toBe(2);

      const attributes = primitive.attributes;
      let expectedLength = 0;

      // Positions
      expectedLength += attributes[0].buffer.sizeInBytes;

      // Indices
      expectedLength += primitive.indices.buffer.sizeInBytes;

      expect(statistics.geometryByteLength).toBe(expectedLength);
    });
  });

  it("_countMaterialTextures updates memory statistics for metallic roughness", function () {
    return loadGltf(boomBox).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      const material = primitive.material;
      const metallicRoughness = material.metallicRoughness;
      const statistics = new ModelExperimentalStatistics();

      StatisticsPipelineStage._countMaterialTextures(
        statistics,
        primitive.material
      );

      const totalTextureSize =
        material.emissiveTexture.texture.sizeInBytes +
        material.normalTexture.texture.sizeInBytes +
        material.occlusionTexture.texture.sizeInBytes +
        metallicRoughness.baseColorTexture.texture.sizeInBytes;
      // metallic roughness texture is the same image file as the base
      // color texture so it is not counted
      expect(statistics.texturesByteLength).toBe(totalTextureSize);
    });
  });

  it("_countMaterialTextures updates memory statistics for specular glossiness", function () {
    return loadGltf(boomBoxSpecularGlossiness).then(function (gltfLoader) {
      const components = gltfLoader.components;
      const primitive = components.nodes[0].primitives[0];

      const material = primitive.material;
      const specularGlossiness = material.specularGlossiness;
      const statistics = new ModelExperimentalStatistics();

      StatisticsPipelineStage._countMaterialTextures(
        statistics,
        primitive.material
      );

      const totalTextureSize =
        material.emissiveTexture.texture.sizeInBytes +
        material.normalTexture.texture.sizeInBytes +
        material.occlusionTexture.texture.sizeInBytes +
        specularGlossiness.diffuseTexture.texture.sizeInBytes +
        specularGlossiness.specularGlossinessTexture.texture.sizeInBytes;

      expect(statistics.texturesByteLength).toBe(totalTextureSize);
    });
  });
});
