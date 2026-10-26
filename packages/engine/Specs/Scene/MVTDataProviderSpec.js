import {
  Math as CesiumMath,
  MVTDataProvider,
  Rectangle,
  WebMercatorTilingScheme,
} from "../../index.js";

describe("Scene/MVTDataProvider", function () {
  const url = "https://example.com/tiles/{z}/{x}/{y}.pbf";

  it("creates only the root tile when loaded", async function () {
    const provider = await MVTDataProvider.fromUrl(url, {
      minZoom: 0,
      maxZoom: 14,
    });
    const tileset = provider.tileset;

    expect(tileset.statistics.numberOfTilesTotal).toBe(1);
    expect(tileset.root._children.length).toBe(0);

    provider.destroy();
  });

  it("derives the minimum zoom level when the root's children are requested", async function () {
    const provider = await MVTDataProvider.fromUrl(url, {
      minZoom: 2,
      maxZoom: 14,
    });
    const tileset = provider.tileset;

    expect(tileset.root.children.length).toBe(16);
    expect(tileset.statistics.numberOfTilesTotal).toBe(17);
    for (const tile of tileset.root.children) {
      expect(tile._contentResource.url).toMatch(/\/tiles\/2\/\d\/\d\.pbf$/);
      expect(tile._children.length).toBe(0);
    }

    provider.destroy();
  });

  it("derives the four children of a tile", async function () {
    const provider = await MVTDataProvider.fromUrl(url, {
      minZoom: 0,
      maxZoom: 14,
    });
    const tileset = provider.tileset;
    const tile = tileset.root.children[0];

    const urls = tile.children.map((child) => child._contentResource.url);
    expect(urls.length).toBe(4);
    expect(urls).toContain("https://example.com/tiles/1/0/0.pbf");
    expect(urls).toContain("https://example.com/tiles/1/1/0.pbf");
    expect(urls).toContain("https://example.com/tiles/1/0/1.pbf");
    expect(urls).toContain("https://example.com/tiles/1/1/1.pbf");
    expect(tileset.statistics.numberOfTilesTotal).toBe(6);

    provider.destroy();
  });

  it("uses Web Mercator rectangles for derived tiles", async function () {
    const provider = await MVTDataProvider.fromUrl(url, {
      minZoom: 2,
      maxZoom: 14,
    });
    const tileset = provider.tileset;
    const tilingScheme = new WebMercatorTilingScheme();

    const tile = tileset.root.children.find((child) =>
      child._contentResource.url.endsWith("/2/0/0.pbf"),
    );
    const rectangle = tile.boundingVolume.rectangle;
    expect(rectangle).toEqualEpsilon(
      tilingScheme.tileXYToRectangle(0, 0, 2),
      CesiumMath.EPSILON10,
    );
    // A split at the latitude midpoint would put this edge at 42.5 degrees.
    expect(CesiumMath.toDegrees(rectangle.south)).toEqualEpsilon(
      66.5133,
      CesiumMath.EPSILON4,
    );

    provider.destroy();
  });

  it("does not derive children below the maximum zoom level", async function () {
    const provider = await MVTDataProvider.fromUrl(url, {
      minZoom: 0,
      maxZoom: 1,
    });
    const tileset = provider.tileset;
    const tile = tileset.root.children[0].children[0];

    expect(tile.geometricError).toBe(0.0);
    expect(tile.children.length).toBe(0);

    provider.destroy();
  });

  it("derives only the children that intersect the extent", async function () {
    const provider = await MVTDataProvider.fromUrl(url, {
      minZoom: 10,
      maxZoom: 14,
      extent: Rectangle.fromDegrees(-74.1, 40.62, -74.09, 40.63),
    });
    const tileset = provider.tileset;

    expect(tileset.root.children.length).toBe(1);
    expect(tileset.root.children[0].children.length).toBe(1);

    provider.destroy();
  });
});
