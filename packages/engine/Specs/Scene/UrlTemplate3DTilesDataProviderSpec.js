import {
  getAbsoluteUri,
  Rectangle,
  UrlTemplate3DTilesDataProvider,
} from "../../index.js";
import { getTileCoordinates } from "../../Source/Scene/UrlTemplate3DTilesDataProvider.js";

class TestProvider extends UrlTemplate3DTilesDataProvider {
  _createCodec() {
    return {
      contentType: "test",
      createContent: function () {},
    };
  }
}

describe("Scene/UrlTemplate3DTilesDataProvider", function () {
  const template = "http://example.invalid/{z}/{x}/{y}.bin";

  it("constructor sets the URL template and defaults", function () {
    const provider = new UrlTemplate3DTilesDataProvider(template);
    expect(provider.urlTemplate).toBe(template);
    expect(provider.resource).toBeDefined();
    expect(provider.extent).toBeUndefined();
    expect(provider.show).toBe(true);
    expect(provider.style).toBeUndefined();
    expect(provider.tileset).toBeUndefined();
  });

  it("constructor clones the extent option", function () {
    const extent = new Rectangle(0.1, 0.2, 0.3, 0.4);
    const provider = new UrlTemplate3DTilesDataProvider(template, {
      extent: extent,
    });
    expect(provider.extent).toEqual(extent);
    expect(provider.extent).not.toBe(extent);
  });

  it("keeps a style assigned before the tileset is created", function () {
    const provider = new UrlTemplate3DTilesDataProvider(template);
    const style = { fake: "style" };
    provider.style = style;
    expect(provider.style).toBe(style);
  });

  it("fromUrl generates a tileset with embedded tile coordinates", async function () {
    const provider = await TestProvider.fromUrl(template, { maxZoom: 1 });

    const tileset = provider.tileset;
    expect(tileset).toBeDefined();
    expect(tileset._runtimeContentCodec.contentType).toBe("test");

    // The root is a synthetic wrapper without content; its single child is
    // the zoom-0 tile.
    const root = tileset.root;
    expect(root.children.length).toBe(1);

    const zoomZeroTile = root.children[0];
    expect(getTileCoordinates(zoomZeroTile)).toEqual({
      tileZ: 0,
      tileX: 0,
      tileY: 0,
    });

    expect(zoomZeroTile.children.length).toBe(4);
    for (const child of zoomZeroTile.children) {
      const coordinates = getTileCoordinates(child);
      expect(coordinates.tileZ).toBe(1);
      expect(coordinates.tileX).toBeGreaterThanOrEqual(0);
      expect(coordinates.tileX).toBeLessThan(2);
      expect(coordinates.tileY).toBeGreaterThanOrEqual(0);
      expect(coordinates.tileY).toBeLessThan(2);
    }

    provider.destroy();
    expect(provider.isDestroyed()).toBe(true);
  });

  it("fromUrl absolutizes relative URL templates so content URIs do not resolve against the blob tileset URL", async function () {
    const provider = await TestProvider.fromUrl("tiles/{z}/{x}/{y}.bin", {
      maxZoom: 0,
    });

    const zoomZeroTile = provider.tileset.root.children[0];
    const contentUrl = zoomZeroTile._contentResource.url;
    expect(contentUrl).not.toContain("blob:");
    expect(contentUrl).toContain("/tiles/0/0/0.bin");
    expect(contentUrl).toStartWith(getAbsoluteUri("tiles/"));

    provider.destroy();
  });

  it("fromUrl supports {z}/{y}/{x} template order (e.g. ArcGIS) with correct tile coordinates", async function () {
    const provider = await TestProvider.fromUrl(
      "http://example.invalid/{z}/{y}/{x}.bin",
      { maxZoom: 1 },
    );

    const zoomZeroTile = provider.tileset.root.children[0];
    expect(zoomZeroTile._contentResource.url).toContain("/0/0/0.bin");

    // Tile coordinates come from tileset extras, not from parsing the URL,
    // so they must be correct regardless of the x/y order in the template.
    for (const child of zoomZeroTile.children) {
      const { tileZ, tileX, tileY } = getTileCoordinates(child);
      expect(tileZ).toBe(1);
      expect(child._contentResource.url).toContain(
        `/${tileZ}/${tileY}/${tileX}.bin`,
      );
    }

    provider.destroy();
  });

  it("getTileCoordinates falls back to 0/0/0 for tiles without embedded coordinates", function () {
    expect(getTileCoordinates({ extras: undefined })).toEqual({
      tileZ: 0,
      tileX: 0,
      tileY: 0,
    });
    expect(getTileCoordinates({ extras: {} })).toEqual({
      tileZ: 0,
      tileX: 0,
      tileY: 0,
    });
  });
});
