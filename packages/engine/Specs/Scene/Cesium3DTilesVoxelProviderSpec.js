import {
  Cartesian3,
  Ellipsoid,
  Math as CesiumMath,
  Matrix4,
  RuntimeError,
  clone,
} from "@cesium/core";
import {
  Cesium3DTilesVoxelProvider,
  MetadataComponentType,
  MetadataType,
  Resource,
  ResourceCache,
  VoxelProvider,
  VoxelShapeType,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/Cesium3DTilesVoxelProvider", function () {
  let scene;

  beforeEach(async function () {
    scene = createScene();
  });

  afterEach(function () {
    scene.destroyForSpecs();
    ResourceCache.clearForSpecs();
  });

  it("conforms to VoxelProvider interface", function () {
    expect(Cesium3DTilesVoxelProvider).toConformToInterface(VoxelProvider);
  });

  it("fromUrl creates a voxel provider", async function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);

    expect(provider).toBeInstanceOf(Cesium3DTilesVoxelProvider);
    expect(provider.globalTransform).toEqual(Matrix4.IDENTITY);
    expect(provider.shapeTransform).toEqualEpsilon(
      Matrix4.fromScale(Ellipsoid.WGS84.radii),
      CesiumMath.EPSILON10,
    );
    expect(provider.shape).toEqual(VoxelShapeType.ELLIPSOID);
    expect(provider.minBounds).toEqual(new Cartesian3(0.0, 0.0, -1.0));
    expect(provider.maxBounds).toEqual(new Cartesian3(1.0, 1.0, 500000.0));
    expect(provider.dimensions).toEqual(new Cartesian3(2, 2, 2));
    expect(provider.paddingBefore).toEqual(Cartesian3.ZERO);
    expect(provider.paddingAfter).toEqual(Cartesian3.ZERO);
    expect(provider.names).toEqual(["a"]);
    expect(provider.types).toEqual([MetadataType.SCALAR]);
    expect(provider.componentTypes).toEqual([MetadataComponentType.FLOAT32]);
    expect(provider.minimumValues).toEqual([[0]]);
    expect(provider.maximumValues).toEqual([[1]]);
  });

  describe("fromUrl validates the metadata schema", function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json";
    let validTilesetJson;

    beforeAll(async function () {
      validTilesetJson = await Resource.fetchJson({ url });
    });

    function createTilesetJson(schemaClasses) {
      const tilesetJson = clone(validTilesetJson, true);
      delete tilesetJson.schemaUri;
      // The statistics only describe property "a" from the original schema
      delete tilesetJson.statistics;
      tilesetJson.schema = { id: "voxel", classes: schemaClasses };
      return tilesetJson;
    }

    // The test data only has valid schemas, so replace the fetched tileset
    // JSON with one whose schema exercises the error handling
    function fromTilesetJson(tilesetJson) {
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve(tilesetJson),
      );
      return Cesium3DTilesVoxelProvider.fromUrl(url);
    }

    it("accepts supported types and component types", async function () {
      const tilesetJson = createTilesetJson({
        voxel: {
          properties: {
            a: { type: "SCALAR", componentType: "UINT8" },
            b: { type: "VEC2", componentType: "FLOAT32" },
            c: { type: "VEC3", componentType: "FLOAT64" },
            d: { type: "VEC4", componentType: "FLOAT32" },
          },
        },
      });
      const provider = await fromTilesetJson(tilesetJson);
      expect(provider.types).toEqual([
        MetadataType.SCALAR,
        MetadataType.VEC2,
        MetadataType.VEC3,
        MetadataType.VEC4,
      ]);
    });

    it("throws if the voxel class is missing", async function () {
      const tilesetJson = createTilesetJson({});
      await expectAsync(fromTilesetJson(tilesetJson)).toBeRejectedWithError(
        RuntimeError,
        "Tileset does not contain any voxel metadata properties.",
      );
    });

    it("throws if the voxel class has no properties", async function () {
      const tilesetJson = createTilesetJson({ voxel: { properties: {} } });
      await expectAsync(fromTilesetJson(tilesetJson)).toBeRejectedWithError(
        RuntimeError,
        "Tileset does not contain any voxel metadata properties.",
      );
    });

    it("throws for an unsupported matrix type", async function () {
      const tilesetJson = createTilesetJson({
        voxel: {
          properties: { a: { type: "MAT3", componentType: "FLOAT32" } },
        },
      });
      await expectAsync(fromTilesetJson(tilesetJson)).toBeRejectedWithError(
        RuntimeError,
        /Unsupported voxel metadata type MAT3/,
      );
    });

    it("throws for an unsupported non-numeric type", async function () {
      const tilesetJson = createTilesetJson({
        voxel: { properties: { a: { type: "BOOLEAN" } } },
      });
      await expectAsync(fromTilesetJson(tilesetJson)).toBeRejectedWithError(
        RuntimeError,
        /Unsupported voxel metadata type BOOLEAN/,
      );
    });

    it("throws for an unsupported component type", async function () {
      const tilesetJson = createTilesetJson({
        voxel: {
          properties: { a: { type: "SCALAR", componentType: "INT16" } },
        },
      });
      await expectAsync(fromTilesetJson(tilesetJson)).toBeRejectedWithError(
        RuntimeError,
        /Unsupported voxel metadata component type INT16/,
      );
    });
  });

  it("requestData works for root tile of ellipsoid tileset", async function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);
    const primitive = { provider };

    const content = await provider.requestData({
      frameState: scene.frameState,
    });

    await pollToPromise(function () {
      scene.renderForSpecs();
      content.update(primitive, scene.frameState);
      return content.ready;
    });

    const { metadata } = content;
    expect(metadata.length).toEqual(1);

    const { x, y, z } = provider.dimensions;
    const voxelCount = x * y * z;
    const componentCount = MetadataType.getComponentCount(provider.types[0]);
    const expectedLength = voxelCount * componentCount;
    expect(metadata[0].length).toEqual(expectedLength);
  });

  it("requestData works for root tile of box tileset", async function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelBox3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);
    const primitive = { provider };

    const content = await provider.requestData({
      frameState: scene.frameState,
    });

    await pollToPromise(function () {
      scene.renderForSpecs();
      content.update(primitive, scene.frameState);
      return content.ready;
    });

    const { metadata } = content;
    expect(metadata.length).toEqual(1);

    const { x, y, z } = provider.dimensions;
    const voxelCount = x * y * z;
    const componentCount = MetadataType.getComponentCount(provider.types[0]);
    const expectedLength = voxelCount * componentCount;
    expect(metadata[0].length).toEqual(expectedLength);
  });

  it("requestData works for root tile of cylinder tileset", async function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelCylinder3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);
    const primitive = { provider };

    const content = await provider.requestData({
      frameState: scene.frameState,
    });

    await pollToPromise(function () {
      scene.renderForSpecs();
      content.update(primitive, scene.frameState);
      return content.ready;
    });

    const { metadata } = content;
    expect(metadata.length).toEqual(1);

    const { x, y, z } = provider.dimensions;
    const voxelCount = x * y * z;
    const componentCount = MetadataType.getComponentCount(provider.types[0]);
    const expectedLength = voxelCount * componentCount;
    expect(metadata[0].length).toEqual(expectedLength);
  });

  it("requestData loads multiple attributes correctly", async function () {
    const url =
      "./Data/Cesium3DTiles/Voxel/VoxelMultiAttribute3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);
    const primitive = { provider };

    const content = await provider.requestData({
      frameState: scene.frameState,
    });

    await pollToPromise(function () {
      scene.renderForSpecs();
      content.update(primitive, scene.frameState);
      return content.ready;
    });

    const { metadata } = content;
    expect(metadata.length).toBe(3);
    expect(metadata[0][0]).toBe(0.0);
    expect(metadata[1][0]).toBe(0.5);
    expect(metadata[2][0]).toBe(1.0);
  });
});
