import {
  Cartesian3,
  ContextLimits,
  Megatexture,
  MetadataComponentType,
  RuntimeError,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe("Scene/Megatexture", function () {
  const scene = createScene();

  it("constructs", function () {
    const dimensions = new Cartesian3(16, 16, 16);
    const channelCount = 4;
    const componentType = MetadataComponentType.FLOAT32;
    const textureMemoryByteLength = 16 * 16 * 16 * 4 * 4;

    // Constructor should throw if memory is too small
    expect(function () {
      return new Megatexture(
        scene.context,
        dimensions,
        channelCount,
        componentType,
        textureMemoryByteLength / 2,
      );
    }).toThrowError(RuntimeError);

    const megatexture = new Megatexture(
      scene.context,
      dimensions,
      channelCount,
      componentType,
      textureMemoryByteLength,
    );
    expect(megatexture.channelCount).toBe(channelCount);
    expect(megatexture.componentType).toBe(componentType);
    expect(megatexture.voxelCountPerTile).toEqual(dimensions);
  });

  it("3D texture dimensions are constrained by memory limit", function () {
    const dimensions = new Cartesian3(23, 7, 13);
    const bytesPerSample = 4;
    const tileCount = 8 ** 4; // LODs 0 through 4 fully populated
    const availableTextureMemoryBytes = 16 * 1024 * 1024;

    // For consistent test results, temporarily set maximum 3D texture size
    // to a value supported on all WebGL2 devices.
    const maximum3DTextureSize = ContextLimits.maximum3DTextureSize;
    ContextLimits._maximum3DTextureSize = 256;

    const textureDimensions = Megatexture.get3DTextureDimension(
      dimensions,
      bytesPerSample,
      availableTextureMemoryBytes,
      tileCount,
    );
    const expectedDimensions = new Cartesian3(92, 224, 182);
    expect(textureDimensions).toEqual(expectedDimensions);
    const actualMemoryUsage =
      textureDimensions.x *
      textureDimensions.y *
      textureDimensions.z *
      bytesPerSample;
    expect(actualMemoryUsage).toBeLessThan(availableTextureMemoryBytes);
    expect(actualMemoryUsage).toBeGreaterThanOrEqual(
      availableTextureMemoryBytes * 0.8,
    );

    ContextLimits._maximum3DTextureSize = maximum3DTextureSize;
  });

  it("3D texture is large enough to fit the number of tiles, but not too much larger", function () {
    const dimensions = new Cartesian3(23, 7, 13);
    const bytesPerSample = 4;
    const tileCount = 8 ** 4; // LODs 0 through 4 fully populated
    const availableTextureMemoryBytes = 256 * 1024 * 1024;

    // For consistent test results, temporarily set maximum 3D texture size
    // to a value supported on all WebGL2 devices.
    const maximum3DTextureSize = ContextLimits.maximum3DTextureSize;
    ContextLimits._maximum3DTextureSize = 256;

    const textureDimensions = Megatexture.get3DTextureDimension(
      dimensions,
      bytesPerSample,
      availableTextureMemoryBytes,
      tileCount,
    );
    const expectedDimensions = new Cartesian3(184, 224, 208);
    expect(textureDimensions).toEqual(expectedDimensions);
    const maximumTileCount =
      (textureDimensions.x / dimensions.x) *
      (textureDimensions.y / dimensions.y) *
      (textureDimensions.z / dimensions.z);
    expect(maximumTileCount).toBeGreaterThanOrEqual(tileCount);
    expect(maximumTileCount).toBeLessThanOrEqual(tileCount * 1.25);

    ContextLimits._maximum3DTextureSize = maximum3DTextureSize;
  });

  it("adds data to an existing megatexture", function () {
    const dimension = 16;
    const dimensions = new Cartesian3(dimension, dimension, dimension);
    const channelCount = 4;
    const componentType = MetadataComponentType.UINT16;
    const tileSize =
      dimension ** 3 *
      channelCount *
      MetadataComponentType.getSizeInBytes(componentType);

    const megatexture = new Megatexture(
      scene.context,
      dimensions,
      channelCount,
      componentType,
    );

    const data = new Uint16Array(tileSize);
    const index = megatexture.add(data);
    expect(index).toBe(0);
  });

  it("throws if trying to add to a full megatexture", function () {
    const dimension = 16;
    const dimensions = new Cartesian3(dimension, dimension, dimension);
    const channelCount = 1;
    const componentType = MetadataComponentType.FLOAT32;
    const tileSize =
      dimension ** 3 *
      channelCount *
      MetadataComponentType.getSizeInBytes(componentType);

    // Allocate enough memory for only one tile
    const tileCount = 1;
    const textureMemoryByteLength = tileCount * tileSize;
    const megatexture = new Megatexture(
      scene.context,
      dimensions,
      channelCount,
      componentType,
      textureMemoryByteLength,
    );

    const data = new Float32Array(tileSize);
    megatexture.add(data);

    // megatexture should be full now
    expect(function () {
      return megatexture.add(data);
    }).toThrowDeveloperError();
  });

  it("removes tile from a texture", function () {
    const dimension = 16;
    const dimensions = new Cartesian3(dimension, dimension, dimension);
    const channelCount = 1;
    const componentType = MetadataComponentType.FLOAT32;
    const tileSize =
      dimension ** 3 *
      channelCount *
      MetadataComponentType.getSizeInBytes(componentType);

    // Make room for 4 tiles
    const tileCount = 4;
    const textureMemoryByteLength = tileCount * tileSize;
    const megatexture = new Megatexture(
      scene.context,
      dimensions,
      channelCount,
      componentType,
      textureMemoryByteLength,
    );

    expect(megatexture.occupiedCount).toBe(0);

    // Fill up the megatexture
    const data = new Float32Array(tileSize);
    megatexture.add(data);
    megatexture.add(data);
    const index2 = megatexture.add(data);
    megatexture.add(data);

    // megatexture should be full now
    expect(megatexture.occupiedCount).toBe(4);
    expect(function () {
      return megatexture.add(data);
    }).toThrowDeveloperError();

    // Remove one tile
    megatexture.remove(index2);

    // We should have room for another tile now
    expect(megatexture.occupiedCount).toBe(3);
    megatexture.add(data);
    expect(megatexture.occupiedCount).toBe(4);

    // Out-of-bounds index should throw an error
    expect(function () {
      megatexture.remove(-1);
    }).toThrowDeveloperError();
    expect(function () {
      megatexture.remove(4);
    }).toThrowDeveloperError();
  });

  it("destroys", function () {
    const tileCount = 4;
    const dimension = 16;
    const dimensions = new Cartesian3(dimension, dimension, dimension);
    const channelCount = 4;
    const componentType = MetadataComponentType.FLOAT32;
    const textureMemoryByteLength =
      tileCount *
      dimension ** 3 *
      channelCount *
      MetadataComponentType.getSizeInBytes(componentType);

    const megatexture = new Megatexture(
      scene.context,
      dimensions,
      channelCount,
      componentType,
      textureMemoryByteLength,
    );

    expect(megatexture.maximumTileCount).toBe(4);
    megatexture.remove(0);
    expect(megatexture.isDestroyed()).toBe(false);

    megatexture.destroy();

    expect(megatexture.isDestroyed()).toBe(true);
    expect(function () {
      return megatexture.remove(0);
    }).toThrowDeveloperError();
  });
});
