import {
  Cartesian3,
  Cesium3DTilesVoxelProvider,
  Ellipsoid,
  Math as CesiumMath,
  Matrix4,
  MetadataComponentType,
  MetadataType,
  ResourceCache,
  VoxelProvider,
  VoxelShapeType,
} from "../../index.js";

describe("Scene/Cesium3DTilesVoxelProvider", function () {
  afterEach(function () {
    ResourceCache.clearForSpecs();
  });

  it("conforms to VoxelProvider interface", function () {
    expect(Cesium3DTilesVoxelProvider).toConformToInterface(VoxelProvider);
  });

  it("constructor works", function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json";
    const provider = new Cesium3DTilesVoxelProvider({
      url: url,
    });

    expect(provider).toBeDefined();

    return provider.readyPromise.then(function () {
      expect(provider).toBeDefined();
      expect(provider.globalTransform).toEqual(Matrix4.IDENTITY);
      expect(provider.shapeTransform).toEqualEpsilon(
        Matrix4.fromScale(Ellipsoid.WGS84.radii),
        CesiumMath.EPSILON10
      );
      expect(provider.shape).toEqual(VoxelShapeType.ELLIPSOID);
      expect(provider.minBounds).toEqual(new Cartesian3(0.0, 0.0, -1.0));
      expect(provider.maxBounds).toEqual(new Cartesian3(1.0, 1.0, 0.0));
      expect(provider.dimensions).toEqual(new Cartesian3(2, 2, 2));
      expect(provider.paddingBefore).toBeUndefined();
      expect(provider.paddingAfter).toBeUndefined();
      expect(provider.names).toEqual(["a"]);
      expect(provider.types).toEqual([MetadataType.SCALAR]);
      expect(provider.componentTypes).toEqual([MetadataComponentType.FLOAT32]);
      expect(provider.minimumValues).toEqual([[0]]);
      expect(provider.maximumValues).toEqual([[1]]);
    });
  });

  it("fromUrl creates a voxel provider", async function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);

    expect(provider).toBeInstanceOf(Cesium3DTilesVoxelProvider);
    expect(provider.globalTransform).toEqual(Matrix4.IDENTITY);
    expect(provider.shapeTransform).toEqualEpsilon(
      Matrix4.fromScale(Ellipsoid.WGS84.radii),
      CesiumMath.EPSILON10
    );
    expect(provider.shape).toEqual(VoxelShapeType.ELLIPSOID);
    expect(provider.minBounds).toEqual(new Cartesian3(0.0, 0.0, -1.0));
    expect(provider.maxBounds).toEqual(new Cartesian3(1.0, 1.0, 0.0));
    expect(provider.dimensions).toEqual(new Cartesian3(2, 2, 2));
    expect(provider.paddingBefore).toBeUndefined();
    expect(provider.paddingAfter).toBeUndefined();
    expect(provider.names).toEqual(["a"]);
    expect(provider.types).toEqual([MetadataType.SCALAR]);
    expect(provider.componentTypes).toEqual([MetadataComponentType.FLOAT32]);
    expect(provider.minimumValues).toEqual([[0]]);
    expect(provider.maximumValues).toEqual([[1]]);
  });

  it("requestData works for root tile", async function () {
    const url = "./Data/Cesium3DTiles/Voxel/VoxelEllipsoid3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);

    const data = await provider.requestData();
    expect(data.length).toEqual(1);

    const dimensions = provider.dimensions;
    const voxelCount = dimensions.x * dimensions.y * dimensions.z;
    const componentCount = MetadataType.getComponentCount(provider.types[0]);
    const expectedLength = voxelCount * componentCount;
    expect(data[0].length).toEqual(expectedLength);
  });

  it("requestData loads multiple attributes correctly", async function () {
    const url =
      "./Data/Cesium3DTiles/Voxel/VoxelMultiAttribute3DTiles/tileset.json";
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(url);

    const data = await provider.requestData();
    expect(data.length).toBe(3);
    expect(data[0][0]).toBe(0.0);
    expect(data[1][0]).toBe(0.5);
    expect(data[2][0]).toBe(1.0);
  });
});
