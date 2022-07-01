import { DefaultProxy } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { HeightmapTerrainData } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Request } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { TerrainProvider } from "../../Source/Cesium.js";
import { VRTheWorldTerrainProvider } from "../../Source/Cesium.js";

describe("Core/VRTheWorldTerrainProvider", function () {
  const imageUrl = "Data/Images/Red16x16.png";

  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      if (url === imageUrl) {
        Resource._DefaultImplementations.loadWithXhr(
          url,
          responseType,
          method,
          data,
          headers,
          deferred,
          overrideMimeType
        );
        return;
      }

      setTimeout(function () {
        const parser = new DOMParser();
        const xmlString =
          '<TileMap version="1.0.0" tilemapservice="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/">' +
          "<!--  Additional data: tms_type is default  -->" +
          "<Title>Hawaii World elev</Title>" +
          "<Abstract>layer to make cesium work right</Abstract>" +
          "<SRS>EPSG:4326</SRS>" +
          '<BoundingBox minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000"/>' +
          '<Origin x="-180.000000" y="-90.000000"/>' +
          '<TileFormat width="32" height="32" mime-type="image/tif" extension="tif"/>' +
          "<TileSets>" +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/0" units-per-pixel="5.62500000000000000000" order="0"/>' +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/1" units-per-pixel="2.81250000000000000000" order="1"/>' +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/2" units-per-pixel="1.40625000000000000000" order="2"/>' +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/3" units-per-pixel="0.70312500000000000000" order="3"/>' +
          "</TileSets>" +
          "<DataExtents>" +
          '<DataExtent minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000" minlevel="0" maxlevel="9"/>' +
          '<DataExtent minx="24.999584" miny="-0.000417" maxx="30.000417" maxy="5.000417" minlevel="0" maxlevel="13"/>' +
          "</DataExtents>" +
          "</TileMap>";
        const xml = parser.parseFromString(xmlString, "text/xml");
        deferred.resolve(xml);
      }, 1);
    };
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
    Resource._Implementations.loadWithXhr =
      Resource._DefaultImplementations.loadWithXhr;
  });

  function createRequest() {
    return new Request({
      throttleByServer: true,
    });
  }

  it("conforms to TerrainProvider interface", function () {
    expect(VRTheWorldTerrainProvider).toConformToInterface(TerrainProvider);
  });

  it("constructor throws if url is not provided", function () {
    expect(function () {
      return new VRTheWorldTerrainProvider();
    }).toThrowDeveloperError();

    expect(function () {
      return new VRTheWorldTerrainProvider({});
    }).toThrowDeveloperError();
  });

  it("resolves readyPromise", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    const resource = new Resource({
      url: "made/up/url",
    });

    const provider = new VRTheWorldTerrainProvider({
      url: resource,
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("has error event", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });
    expect(provider.errorEvent).toBeDefined();
    expect(provider.errorEvent).toBe(provider.errorEvent);
  });

  it("returns reasonable geometric error for various levels", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });

    return provider.readyPromise.then(function () {
      expect(provider.getLevelMaximumGeometricError(0)).toBeGreaterThan(0.0);
      expect(provider.getLevelMaximumGeometricError(0)).toEqualEpsilon(
        provider.getLevelMaximumGeometricError(1) * 2.0,
        CesiumMath.EPSILON10
      );
      expect(provider.getLevelMaximumGeometricError(1)).toEqualEpsilon(
        provider.getLevelMaximumGeometricError(2) * 2.0,
        CesiumMath.EPSILON10
      );
    });
  });

  it("getLevelMaximumGeometricError must not be called before isReady returns true", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });

    expect(function () {
      provider.getLevelMaximumGeometricError(0);
    }).toThrowDeveloperError();
  });

  it("getTilingScheme must not be called before isReady returns true", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });

    expect(function () {
      return provider.tilingScheme;
    }).toThrowDeveloperError();
  });

  it("logo is undefined if credit is not provided", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });
    expect(provider.credit).toBeUndefined();
  });

  it("logo is defined if credit is provided", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
      credit: "thanks to our awesome made up contributors!",
    });
    expect(provider.credit).toBeDefined();
  });

  it("does not have a water mask", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });
    expect(provider.hasWaterMask).toBe(false);
  });

  it("is not ready immediately", function () {
    const provider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });
    expect(provider.ready).toBe(false);
  });

  it("raises an error if the SRS is not supported", function () {
    Resource._Implementations.loadWithXhr = function (
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    ) {
      setTimeout(function () {
        const parser = new DOMParser();
        const xmlString =
          '<TileMap version="1.0.0" tilemapservice="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/">' +
          "<!--  Additional data: tms_type is default  -->" +
          "<Title>Hawaii World elev</Title>" +
          "<Abstract>layer to make cesium work right</Abstract>" +
          "<SRS>EPSG:foo</SRS>" +
          '<BoundingBox minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000"/>' +
          '<Origin x="-180.000000" y="-90.000000"/>' +
          '<TileFormat width="32" height="32" mime-type="image/tif" extension="tif"/>' +
          "<TileSets>" +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/0" units-per-pixel="5.62500000000000000000" order="0"/>' +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/1" units-per-pixel="2.81250000000000000000" order="1"/>' +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/2" units-per-pixel="1.40625000000000000000" order="2"/>' +
          '<TileSet href="http://www.vr-theworld.com/vr-theworld/tiles/1.0.0/73/3" units-per-pixel="0.70312500000000000000" order="3"/>' +
          "</TileSets>" +
          "<DataExtents>" +
          '<DataExtent minx="-180.000000" miny="-90.000000" maxx="180.000000" maxy="90.000000" minlevel="0" maxlevel="9"/>' +
          '<DataExtent minx="24.999584" miny="-0.000417" maxx="30.000417" maxy="5.000417" minlevel="0" maxlevel="13"/>' +
          "</DataExtents>" +
          "</TileMap>";
        const xml = parser.parseFromString(xmlString, "text/xml");
        deferred.resolve(xml);
      }, 1);
    };

    const terrainProvider = new VRTheWorldTerrainProvider({
      url: "made/up/url",
    });

    let called = false;
    const errorFunction = function () {
      called = true;
    };

    terrainProvider.errorEvent.addEventListener(errorFunction);

    return terrainProvider.readyPromise.catch(() => {
      expect(called).toBe(true);
    });
  });

  describe("requestTileGeometry", function () {
    it("must not be called before isReady returns true", function () {
      const terrainProvider = new VRTheWorldTerrainProvider({
        url: "made/up/url",
        proxy: new DefaultProxy("/proxy/"),
      });

      expect(function () {
        terrainProvider.requestTileGeometry(0, 0, 0);
      }).toThrowDeveloperError();
    });

    it("provides HeightmapTerrainData", function () {
      const baseUrl = "made/up/url";

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        expect(request.url.indexOf(".tif?cesium=true")).toBeGreaterThanOrEqual(
          0
        );

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: imageUrl }),
          crossOrigin,
          deferred
        );
      };

      const terrainProvider = new VRTheWorldTerrainProvider({
        url: baseUrl,
      });

      return terrainProvider.readyPromise
        .then(function () {
          expect(terrainProvider.tilingScheme).toBeInstanceOf(
            GeographicTilingScheme
          );
          return terrainProvider.requestTileGeometry(0, 0, 0);
        })
        .then(function (loadedData) {
          expect(loadedData).toBeInstanceOf(HeightmapTerrainData);
        })
        .catch((e) => {});
    });

    it("returns undefined if too many requests are already in progress", function () {
      const baseUrl = "made/up/url";

      const deferreds = [];

      Resource._Implementations.createImage = function (
        request,
        crossOrigin,
        deferred
      ) {
        // Do nothing, so requests never complete
        deferreds.push(deferred);
      };

      const terrainProvider = new VRTheWorldTerrainProvider({
        url: baseUrl,
      });

      return terrainProvider.readyPromise.then(function () {
        const promises = [];
        let promise;
        let i;
        for (i = 0; i < RequestScheduler.maximumRequestsPerServer; ++i) {
          promise = terrainProvider
            .requestTileGeometry(0, 0, 0, createRequest())
            .catch((e) => {});
          promises.push(promise);
        }
        RequestScheduler.update();
        expect(promise).toBeDefined();

        promise = terrainProvider.requestTileGeometry(0, 0, 0, createRequest());
        expect(promise).toBeUndefined();

        for (i = 0; i < deferreds.length; ++i) {
          const deferred = deferreds[i];
          Resource._Implementations.loadImageElement(
            "Data/Images/Red16x16.png",
            false,
            deferred
          );
        }

        return Promise.all(promises);
      });
    });
  });
});
