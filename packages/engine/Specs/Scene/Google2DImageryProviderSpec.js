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
  Google2DImageryProvider,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/Google2DImageryProvider", function () {
  beforeEach(function () {
    RequestScheduler.clearForSpecs();
    spyOn(
      Google2DImageryProvider.prototype,
      "getViewportCredits",
    ).and.returnValue(Promise.resolve(""));
  });

  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(Google2DImageryProvider).toConformToInterface(ImageryProvider);
  });

  it("fromUrl throws if key is not provided", async function () {
    await expectAsync(
      Google2DImageryProvider.fromUrl(),
    ).toBeRejectedWithDeveloperError("options.key is required.");
  });

  it("requires the session token to be specified", function () {
    expect(function () {
      return new Google2DImageryProvider({});
    }).toThrowDeveloperError();
  });

  it("requires the tileWidth to be specified", function () {
    expect(function () {
      return new Google2DImageryProvider({
        session: "a-session-token",
      });
    }).toThrowDeveloperError();
  });

  it("requires the key to be specified", function () {
    expect(function () {
      return new Google2DImageryProvider({
        session: "a-session-token",
        tileHeight: 256,
        tileWidth: 256,
      });
    }).toThrowDeveloperError();
  });

  it("fromIon throws if assetId is not provided", async function () {
    await expectAsync(
      Google2DImageryProvider.fromIon(),
    ).toBeRejectedWithDeveloperError("options.assetId is required.");
  });

  it("requestImage returns a promise for an image and loads it for cross-origin use", function () {
    const provider = new Google2DImageryProvider({
      session: "test-session-token",
      key: "test-key",
      tileWidth: 256,
      tileHeight: 256,
    });

    expect(provider.url).toEqual(
      "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=test-session-token&key=test-key",
    );
    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBe(22);
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
    const provider = new Google2DImageryProvider({
      session: "test-session-token",
      key: "test-key",
      tileWidth: 256,
      tileHeight: 256,
      rectangle: rectangle,
    });

    expect(provider.tileWidth).toEqual(256);
    expect(provider.tileHeight).toEqual(256);
    expect(provider.maximumLevel).toBe(22);
    expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    expect(provider.rectangle).toEqualEpsilon(rectangle, CesiumMath.EPSILON14);
    expect(provider.tileDiscardPolicy).toBeUndefined();

    spyOn(Resource._Implementations, "createImage").and.callFake(
      function (request, crossOrigin, deferred) {
        expect(request.url).toContain("/0/0/0");

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
    const provider = new Google2DImageryProvider({
      session: "test-session-token",
      key: "test-key",
      tileWidth: 256,
      tileHeight: 256,
      maximumLevel: 5,
    });
    expect(provider.maximumLevel).toEqual(5);
  });

  it("uses minimumLevel passed to constructor", function () {
    const provider = new Google2DImageryProvider({
      session: "test-session-token",
      key: "test-key",
      tileWidth: 256,
      tileHeight: 256,
      minimumLevel: 1,
    });
    expect(provider.minimumLevel).toEqual(1);
  });

  it("turns the supplied credit into a logo", function () {
    const creditText = "Thanks to our awesome made up source of this imagery!";
    const providerWithCredit = new Google2DImageryProvider({
      session: "test-session-token",
      key: "test-key",
      tileWidth: 256,
      tileHeight: 256,
      credit: creditText,
    });
    expect(providerWithCredit.credit.html).toEqual(creditText);
  });

  it("raises error event when image cannot be loaded", function () {
    const provider = new Google2DImageryProvider({
      session: "test-session-token",
      key: "test-key",
      tileWidth: 256,
      tileHeight: 256,
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
