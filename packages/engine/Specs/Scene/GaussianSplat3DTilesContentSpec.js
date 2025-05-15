import GaussianSplat3DTilesContent from "../../Source/Scene/GaussianSplat3DTilesContent.js";
import DeveloperError from "../../Source/Core/DeveloperError.js";
import Resource from "../../Source/Core/Resource.js";
import GltfLoader from "../../Source/Scene/GltfLoader.js";

describe("Scene/GaussianSplat3DTilesContent", function () {
  let tileset, tile, resource, loader;

  beforeEach(function () {
    tileset = {};
    tile = {};
    resource = new Resource({
      url: "./Data/Cesium3DTiles/GaussianSplats/synthetic/0/0.gltf",
    });
    loader = new GltfLoader();
  });

  it("initializes properties correctly", function () {
    const content = new GaussianSplat3DTilesContent(
      loader,
      tileset,
      tile,
      resource,
    );

    expect(content._tileset).toBe(tileset);
    expect(content._tile).toEqual(tile);
    expect(content._resource).toEqual(resource);
    expect(content._loader).toEqual(loader);
    expect(content._ready).toBe(false);
  });

  it("throws an error when calling fromGltf on an instance", function () {
    const content = new GaussianSplat3DTilesContent(
      loader,
      tileset,
      tile,
      resource,
    );

    expect(() => content.fromGltf()).to.throw(DeveloperError);
  });

  it("returns correct default property values", function () {
    const content = new GaussianSplat3DTilesContent(
      loader,
      tileset,
      tile,
      resource,
    );

    expect(content.featuresLength).toEqual(0);
    expect(content.isTilesetContent).toBe(true);
    expect(content.is3DTileContent).toBe(true);
    expect(content.pointsLength).toBeUndefined();
    expect(content.trianglesLength).toEqual(0);
    expect(content.geometryByteLength).toEqual(0);
    expect(content.texturesByteLength).toEqual(0);
    expect(content.innerContents).toBeUndefined();
    expect(content.ready).toBeFalse();
    expect(content.tileset).toEqual(tileset);
    expect(content.tile).toEqual(tile);
    expect(content.url).toEqual(resource.getUrlComponent(true));
    expect(content.metadata).toBeUndefined();
    expect(content.group).toBeUndefined();
  });

  it("sets metadata and group properties", function () {
    const content = new GaussianSplat3DTilesContent(
      loader,
      tileset,
      tile,
      resource,
    );

    content.metadata = { key: "value" };
    content.group = { id: 1 };

    expect(content.group).to.deep.equal({ id: 1 });
  });

  it("creates a new instance using fromGltf static method", async function () {
    const gltf = { asset: {} };
    const content = await GaussianSplat3DTilesContent.fromGltf(
      tileset,
      tile,
      resource,
      gltf,
    );

    expect(content).to.be.instanceOf(GaussianSplat3DTilesContent);
    expect(content._tileset).toEqual(tileset);
    expect(content._tile).toEqual(tile);
    expect(content._resource).toEqual(resource);
  });

  it("handles loader errors in fromGltf", async function () {
    loader.load.rejects(new Error("Loader error"));

    try {
      await GaussianSplat3DTilesContent.fromGltf(tileset, tile, resource, {});
      throw new Error("Expected error was not thrown");
    } catch (error) {
      expect(error.message).to.equal("Failed to load glTF: Loader error");
    }
  });

  it("updates and sets ready state", function () {
    const frameState = { afterRender: [] };
    const content = new GaussianSplat3DTilesContent(
      loader,
      tileset,
      tile,
      resource,
    );

    loader.process.returns(true);
    loader.components = {
      scene: {
        nodes: [
          {
            primitives: [{ attributes: [{ count: 10 }] }],
          },
        ],
      },
    };

    content.update(null, frameState);

    expect(content._ready).toBeTrue();
    expect(content.pointsLength).toEqual(10);
  });

  it("destroys without errors", function () {
    const content = new GaussianSplat3DTilesContent(
      loader,
      tileset,
      tile,
      resource,
    );

    expect(() => content.destroy()).not.toThrow();
  });
});
