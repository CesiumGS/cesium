import {
  Math as CesiumMath,
  Rectangle,
  Request,
  RequestScheduler,
  Resource,
  WebMercatorTilingScheme,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
  Azure2DImageryProvider,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/Azure2DImageryProvider", function () {
  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(Azure2DImageryProvider).toConformToInterface(ImageryProvider);
  });

  it("requires the subscription key to be specified", function () {
    expect(function () {
      return new Azure2DImageryProvider({
        tilesetId: "a-tileset-id",
      });
    }).toThrowDeveloperError("options.subscriptionKey is required.");
  });

  it("requires tilesetId to be specified", function () {
    expect(function () {
      return new Azure2DImageryProvider({
        subscriptionKey: "a-subscription-key",
      });
    }).toThrowDeveloperError("options.tilesetId is required.");
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    const provider = new Azure2DImageryProvider({
      subscriptionKey: "test-subscriptionKey",
      tilesetId: "a-tileset-id",
    });

    expect(provider.url).toEqual(
      "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=a-tileset-id&zoom={z}&x={x}&y={y}&subscription-key=test-subscriptionKey",
    );
    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBe(19);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);

    spyOn(Resource._Implementations, "createImage").and.callFake(
      function (request, crossOrigin, deferred) {
        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
        );
      },
    );

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("rectangle passed to constructor does not affect tile numbering", function () {
    const rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
    const provider = new Azure2DImageryProvider({
      subscriptionKey: "test-subscriptionKey",
      tilesetId: "a-tileset-id",
      rectangle: rectangle,
    });

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBe(19);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqualEpsilon(rectangle, CesiumMath.EPSILON14);
    expect(provider.tileDiscardPolicy).toBeUndefined();

    spyOn(Resource._Implementations, "createImage").and.callFake(
      function (request, crossOrigin, deferred) {
        expect(request.url).toContain("zoom=0&x=0&y=0");

        // Just return any old image.
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
        );
      },
    );

    return provider.requestImage(0, 0, 0).then(function (image) {
      expect(Resource._Implementations.createImage).toHaveBeenCalled();
      expect(image).toBeImageOrImageBitmap();
    });
  });

  it("uses maximumLevel passed to constructor", function () {
    const provider = new Azure2DImageryProvider({
      subscriptionKey: "test-subscriptionKey",
      tilesetId: "a-tileset-id",
      maximumLevel: 5,
    });
    expect(provider.maximumLevel).toEqual(5);
  });

  it("uses minimumLevel passed to constructor", function () {
    const provider = new Azure2DImageryProvider({
      subscriptionKey: "test-subscriptionKey",
      tilesetId: "a-tileset-id",
      minimumLevel: 1,
    });
    expect(provider.minimumLevel).toEqual(1);
  });

  it("turns the supplied credit into a logo", function () {
    const creditText = "Thanks to our awesome made up source of this imagery!";
    const providerWithCredit = new Azure2DImageryProvider({
      subscriptionKey: "test-subscriptionKey",
      tilesetId: "a-tileset-id",
      credit: creditText,
    });
    expect(providerWithCredit.credit.html).toEqual(creditText);
  });

  it("raises error event when image cannot be loaded", function () {
    const provider = new Azure2DImageryProvider({
      subscriptionKey: "test-subscriptionKey",
      tilesetId: "a-tileset-id",
    });

    const layer = new ImageryLayer(provider);

    let tries = 0;
    provider.errorEvent.addEventListener(function (error) {
      expect(error.timesRetried).toEqual(tries);
      ++tries;
      if (tries < 3) {
        error.retry = true;
      }
      setTimeout(function () {
        RequestScheduler.update();
      }, 1);
    });

    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred,
    ) {
      if (tries === 2) {
        // Succeed after 2 tries
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
          crossOrigin,
          deferred,
        );
      } else {
        // fail
        setTimeout(function () {
          deferred.reject();
        }, 1);
      }
    };

    const imagery = new Imagery(layer, 0, 0, 0);
    imagery.addReference();
    layer._requestImagery(imagery);
    RequestScheduler.update();

    return pollToPromise(function () {
      return imagery.state === ImageryState.RECEIVED;
    }).then(function () {
      expect(imagery.image).toBeImageOrImageBitmap();
      expect(tries).toEqual(2);
      imagery.releaseReference();
    });
  });
});
