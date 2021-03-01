import { SingleTileProjectedImageryProvider } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { ProjectedImageryTilingScheme } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";
import { Imagery } from "../../Source/Cesium.js";
import { ImageryLayer } from "../../Source/Cesium.js";
import { ImageryProvider } from "../../Source/Cesium.js";
import { ImageryState } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("Core/SingleTileProjectedImageryProvider", function () {
  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(SingleTileProjectedImageryProvider).toConformToInterface(
      ImageryProvider
    );
  });

  it("resolves readyPromise", function () {
    var provider = new SingleTileProjectedImageryProvider({
      url: "Data/Images/Red16x16.png",
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("resolves readyPromise with Resource", function () {
    var resource = new Resource({
      url: "Data/Images/Red16x16.png",
    });

    var provider = new SingleTileProjectedImageryProvider({
      url: resource,
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    return provider.readyPromise.then(function (result) {
      expect(result).toBe(true);
      expect(provider.ready).toBe(true);
    });
  });

  it("rejects readyPromise on error", function () {
    var provider = new SingleTileProjectedImageryProvider({
      url: "invalid.image.url",
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    return provider.readyPromise
      .then(function () {
        fail("should not resolve");
      })
      .otherwise(function (e) {
        expect(provider.ready).toBe(false);
        expect(e.message).toContain(provider.url);
      });
  });

  it("returns valid value for hasAlphaChannel", function () {
    var provider = new SingleTileProjectedImageryProvider({
      url: "Data/Images/Red16x16.png",
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(typeof provider.hasAlphaChannel).toBe("boolean");
    });
  });

  it("properties are gettable", function () {
    var url = "Data/Images/Red16x16.png";
    var webMercatorRectangle = new Rectangle(-1.0, -1.0, 1.0, 1.0);
    var webMercatorProjection = new WebMercatorProjection();
    var geographicRectangle = Rectangle.approximateCartographicExtents({
      projectedRectangle: webMercatorRectangle,
      mapProjection: webMercatorProjection,
    });

    var credit = "hi";
    var provider = new SingleTileProjectedImageryProvider({
      url: url,
      projectedRectangle: webMercatorRectangle,
      mapProjection: webMercatorProjection,
      credit: credit,
    });

    expect(provider.url).toEqual(url);
    expect(provider.rectangle).toEqual(geographicRectangle);
    expect(provider.hasAlphaChannel).toEqual(true);

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme).toBeInstanceOf(
        ProjectedImageryTilingScheme
      );
      expect(provider.tilingScheme.rectangle).toEqual(geographicRectangle);
      expect(provider.tileWidth).toEqual(16);
      expect(provider.tileHeight).toEqual(16);
      expect(provider.maximumLevel).toEqual(0);
      expect(provider.tileDiscardPolicy).toBeUndefined();
    });
  });

  it("can use a custom ellipsoid", function () {
    var ellipsoid = new Ellipsoid(1, 2, 3);
    var provider = new SingleTileProjectedImageryProvider({
      url: "Data/Images/Red16x16.png",
      ellipsoid: ellipsoid,
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
    });
  });

  it("requests the single image immediately upon construction", function () {
    var imageUrl = "Data/Images/Red16x16.png";

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      url,
      crossOrigin,
      deferred
    ) {
      expect(url).toEqual(imageUrl);
      Resource._DefaultImplementations.createImage(url, crossOrigin, deferred);
    });

    var provider = new SingleTileProjectedImageryProvider({
      url: imageUrl,
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    expect(Resource._Implementations.createImage).toHaveBeenCalled();

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      return when(provider.requestImage(0, 0, 0), function (image) {
        expect(image).toBeInstanceOf(Image);
      });
    });
  });

  it("turns the supplied credit into a logo", function () {
    var provider = new SingleTileProjectedImageryProvider({
      url: "Data/Images/Red16x16.png",
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      expect(provider.credit).toBeUndefined();

      var providerWithCredit = new SingleTileProjectedImageryProvider({
        url: "Data/Images/Red16x16.png",
        projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
        mapProjection: new WebMercatorProjection(),
        credit: "Thanks to our awesome made up source of this imagery!",
      });

      return pollToPromise(function () {
        return providerWithCredit.ready;
      }).then(function () {
        expect(providerWithCredit.credit).toBeDefined();
      });
    });
  });

  it("raises error event when image cannot be loaded", function () {
    var provider = new SingleTileProjectedImageryProvider({
      url: "made/up/url",
      projectedRectangle: new Rectangle(-1.0, -1.0, 1.0, 1.0),
      mapProjection: new WebMercatorProjection(),
    });

    var layer = new ImageryLayer(provider);

    var tries = 0;
    provider.errorEvent.addEventListener(function (error) {
      expect(error.timesRetried).toEqual(tries);
      ++tries;
      if (tries < 3) {
        error.retry = true;
      }
    });

    Resource._Implementations.createImage = function (
      url,
      crossOrigin,
      deferred
    ) {
      if (tries === 2) {
        // Succeed after 2 tries
        Resource._DefaultImplementations.createImage(
          "Data/Images/Red16x16.png",
          crossOrigin,
          deferred
        );
      } else {
        // fail
        setTimeout(function () {
          deferred.reject();
        }, 1);
      }
    };

    return pollToPromise(function () {
      return provider.ready;
    }).then(function () {
      var imagery = new Imagery(layer, 0, 0, 0);
      imagery.addReference();
      layer._requestImagery(imagery);

      return pollToPromise(function () {
        return imagery.state === ImageryState.RECEIVED;
      }).then(function () {
        expect(imagery.image).toBeInstanceOf(Image);
        expect(tries).toEqual(2);
        imagery.releaseReference();
      });
    });
  });
});
