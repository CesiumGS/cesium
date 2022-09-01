import {
  combine,
  GltfLoader,
  ModelStatistics,
  PrimitiveStatisticsPipelineStage,
  Resource,
  ResourceCache,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe(
  "Scene/Model/PrimitiveStatisticsPipelineStage",
  function () {
    const animatedMorphCube =
      "./Data/Models/glTF-2.0/AnimatedMorphCube/glTF/AnimatedMorphCube.gltf";
    const boomBox = "./Data/Models/PBR/BoomBox/BoomBox.gltf";
    const boomBoxSpecularGlossiness =
      "./Data/Models/PBR/BoomBoxSpecularGlossiness/BoomBox.gltf";
    const boxTextured =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const boxTexturedBinary =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const boxWithPrimitiveOutline =
      "./Data/Models/glTF-2.0/BoxWithPrimitiveOutline/glTF/BoxWithPrimitiveOutline.gltf";
    const buildingsMetadata =
      "./Data/Models/glTF-2.0/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const microcosm = "./Data/Models/glTF-2.0/Microcosm/glTF/microcosm.gltf";
    const pointCloudRGB =
      "./Data/Models/glTF-2.0/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";
    const pointCloudWithPropertyAttributes =
      "./Data/Models/glTF-2.0/PointCloudWithPropertyAttributes/glTF/PointCloudWithPropertyAttributes.gltf";
    const simplePropertyTexture =
      "./Data/Models/glTF-2.0/SimplePropertyTexture/glTF/SimplePropertyTexture.gltf";
    const triangle = "./Data/Models/glTF-2.0/Triangle/glTF/Triangle.gltf";
    const triangleWithoutIndices =
      "./Data/Models/glTF-2.0/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf";
    const triangleStrip =
      "./Data/Models/glTF-2.0/TriangleStrip/glTF/TriangleStrip.gltf";
    const triangleFan =
      "./Data/Models/glTF-2.0/TriangleFan/glTF/TriangleFan.gltf";

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

    function mockModel(components) {
      return {
        structuralMetadata: components.structuralMetadata,
      };
    }

    function mockRenderResources(components) {
      return {
        model: {
          statistics: new ModelStatistics(),
          structuralMetadata: components.structuralMetadata,
        },
        runtimePrimitive: {},
      };
    }

    it("counts memory for a model", function () {
      return loadGltf(boxTextured).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const renderResources = mockRenderResources(components);

        PrimitiveStatisticsPipelineStage.process(renderResources, primitive);

        const statistics = renderResources.model.statistics;

        const attributes = primitive.attributes;
        let expectedGeometryLength = 0;

        // Positions and normals share a buffer
        expectedGeometryLength += attributes[0].buffer.sizeInBytes;

        // Texture coordinates
        expectedGeometryLength += attributes[2].buffer.sizeInBytes;

        // Indices
        expectedGeometryLength += primitive.indices.buffer.sizeInBytes;

        const material = primitive.material;
        const metallicRoughness = material.metallicRoughness;

        const expectedTexturesLength =
          metallicRoughness.baseColorTexture.texture.sizeInBytes;

        expect(statistics.pointsLength).toBe(0);
        expect(statistics.trianglesLength).toBe(12);
        expect(statistics.geometryByteLength).toBe(expectedGeometryLength);
        expect(statistics.texturesByteLength).toBe(expectedTexturesLength);
        expect(statistics.propertyTablesByteLength).toBe(0);
      });
    });

    it("_countGeometry computes memory usage for a triangle mesh", function () {
      return loadGltf(boxTextured).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];

        PrimitiveStatisticsPipelineStage._countGeometry(statistics, primitive);

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
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        PrimitiveStatisticsPipelineStage._countGeometry(statistics, primitive);

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
        loadAttributesFor2D: true,
        loadIndicesForWireframe: true,
      };

      return loadGltf(boxTextured, options).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];

        PrimitiveStatisticsPipelineStage._countGeometry(statistics, primitive);

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
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        PrimitiveStatisticsPipelineStage._countGeometry(statistics, primitive);

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
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        PrimitiveStatisticsPipelineStage._countGeometry(statistics, primitive);

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

    it("_countGeometry computes memory usage for triangle fan", function () {
      return loadGltf(triangleFan).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        PrimitiveStatisticsPipelineStage._countGeometry(statistics, primitive);

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

    it("_countGeometry computes memory usage for CESIUM_primitive_outline", function () {
      return loadGltf(boxWithPrimitiveOutline).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const [node] = components.nodes;
        const [primitive] = node.primitives;

        PrimitiveStatisticsPipelineStage._countGeometry(statistics, primitive);

        expect(statistics.pointsLength).toBe(0);
        // 6 faces * 2 triangles
        expect(statistics.trianglesLength).toBe(12);

        // Positions, normals and texture coordinates
        const attributes = primitive.attributes;
        // Count the attributes
        let expectedLength = 0;
        const attributesLength = attributes.length;
        for (let i = 0; i < attributesLength; i++) {
          expectedLength += attributes[i].buffer.sizeInBytes;
        }

        // generated outline coordinates
        expectedLength += primitive.outlineCoordinates.buffer.sizeInBytes;

        // Indices
        expectedLength += primitive.indices.buffer.sizeInBytes;

        expect(statistics.geometryByteLength).toBe(expectedLength);
      });
    });

    it("_countPositions2D does not update count if 2D positions were not computed", function () {
      const statistics = new ModelStatistics();

      const mockRuntimePrimitive = {
        positionBuffer2D: undefined,
      };

      PrimitiveStatisticsPipelineStage._count2DPositions(
        statistics,
        mockRuntimePrimitive
      );

      expect(statistics.geometryByteLength).toBe(0);
    });

    it("_countPositions2D updates count if 2D positions exist", function () {
      return loadGltf(boxTextured, {
        loadAttributesFor2D: true,
      }).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[1].primitives[0];
        const positionAttribute = primitive.attributes[1];

        const mockRuntimePrimitive = {
          positionBuffer2D: {
            sizeInBytes: positionAttribute.typedArray.byteLength,
          },
        };

        // Simulate how the 2D stage unlinks the typed array. In practice, this
        // array may still be referenced by the loader so the statistics stage
        // will count it.
        positionAttribute.typedArray = undefined;

        PrimitiveStatisticsPipelineStage._count2DPositions(
          statistics,
          mockRuntimePrimitive
        );

        // This stage intentionally counts the GPU + CPU copies of the 2D
        // positions
        const positions2D = mockRuntimePrimitive.positionBuffer2D;
        expect(statistics.geometryByteLength).toBe(2 * positions2D.sizeInBytes);
      });
    });

    it("_countMorphTargetAttributes updates memory statistics", function () {
      return loadGltf(animatedMorphCube).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        PrimitiveStatisticsPipelineStage._countMorphTargetAttributes(
          statistics,
          primitive
        );

        let totalSize = 0;
        const morphTargets = primitive.morphTargets;
        const morphTargetsLength = morphTargets.length;
        for (let i = 0; i < morphTargetsLength; i++) {
          const attributes = morphTargets[i].attributes;
          const attributesLength = attributes.length;
          for (let j = 0; j < attributesLength; j++) {
            totalSize += attributes[j].buffer.sizeInBytes;
          }
        }

        expect(statistics.geometryByteLength).toBe(totalSize);
      });
    });

    it("_countMaterialTextures does not update memory if there is no material", function () {
      return loadGltf(triangle).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];
        const statistics = new ModelStatistics();

        PrimitiveStatisticsPipelineStage._countMaterialTextures(
          statistics,
          primitive.material
        );

        expect(statistics.texturesByteLength).toBe(0);
      });
    });

    it("_countMaterialTextures updates memory statistics for metallic roughness", function () {
      return loadGltf(boomBox).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const primitive = components.nodes[0].primitives[0];

        const material = primitive.material;
        const metallicRoughness = material.metallicRoughness;
        const statistics = new ModelStatistics();

        PrimitiveStatisticsPipelineStage._countMaterialTextures(
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
        const statistics = new ModelStatistics();

        PrimitiveStatisticsPipelineStage._countMaterialTextures(
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

    it("_countFeatureIdTextures counts feature ID textures", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const node = components.nodes[0];
        const primitive = node.primitives[0];
        const statistics = new ModelStatistics();

        PrimitiveStatisticsPipelineStage._countFeatureIdTextures(
          statistics,
          primitive.featureIds
        );

        const featureIdTexture = primitive.featureIds[0];
        expect(statistics.geometryByteLength).toBe(0);
        expect(statistics.texturesByteLength).toBe(
          featureIdTexture.textureReader.texture.sizeInBytes
        );
      });
    });

    it("_countBinaryMetadata does not update statistics for primitive without metadata", function () {
      return loadGltf(boxTexturedBinary).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const model = mockModel(components);

        PrimitiveStatisticsPipelineStage._countBinaryMetadata(
          statistics,
          model
        );

        expect(statistics.geometryByteLength).toBe(0);
      });
    });

    it("_countBinaryMetadata updates statistics for property tables", function () {
      return loadGltf(buildingsMetadata).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const model = mockModel(components);

        PrimitiveStatisticsPipelineStage._countBinaryMetadata(
          statistics,
          model
        );

        const structuralMetadata = model.structuralMetadata;
        const propertyTable = structuralMetadata.getPropertyTable(0);

        expect(statistics.propertyTablesByteLength).toBe(
          propertyTable.byteLength
        );
      });
    });

    it("_countBinaryMetadata does not update statistics for property attributes", function () {
      return loadGltf(pointCloudWithPropertyAttributes).then(function (
        gltfLoader
      ) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const model = mockModel(components);

        PrimitiveStatisticsPipelineStage._countBinaryMetadata(
          statistics,
          model
        );

        expect(statistics.geometryByteLength).toBe(0);
      });
    });

    it("_countBinaryMetadata updates statistics for propertyTextures", function () {
      return loadGltf(simplePropertyTexture).then(function (gltfLoader) {
        const statistics = new ModelStatistics();
        const components = gltfLoader.components;
        const model = mockModel(components);

        PrimitiveStatisticsPipelineStage._countBinaryMetadata(
          statistics,
          model
        );

        // everything shares the same texture, so the memory is only counted
        // once.
        const structuralMetadata = model.structuralMetadata;
        const propertyTexture1 = structuralMetadata.getPropertyTexture(0);
        const property = propertyTexture1.getProperty("insideTemperature");
        const textureSize = property.textureReader.texture.sizeInBytes;

        expect(statistics.texturesByteLength).toBe(textureSize);
      });
    });
  },
  "WebGL"
);
