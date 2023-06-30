import {
  Ellipsoid,
  GeographicTilingScheme,
  Rectangle,
  Request,
  Resource,
  RuntimeError,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
  SingleTileImageryProvider,
} from "../../index.js";

import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/SingleTileImageryProvider", function () {
  afterEach(function () {
    Resource._Implementations.createImage =
      Resource._DefaultImplementations.createImage;
  });

  it("conforms to ImageryProvider interface", function () {
    expect(SingleTileImageryProvider).toConformToInterface(ImageryProvider);
  });

  it("constructor throws without url", async function () {
    expect(() => new SingleTileImageryProvider()).toThrowDeveloperError();
  });

  it("constructor throws without tile height and tile width", async function () {
    expect(
      () =>
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
          tileWidth: 16,
        })
    ).toThrowDeveloperError();

    expect(
      () =>
        new SingleTileImageryProvider({
          url: "Data/Images/Red16x16.png",
          tileHeight: 16,
        })
    ).toThrowDeveloperError();
  });

  it("fromUrl throws without url", async function () {
    await expectAsync(
      SingleTileImageryProvider.fromUrl()
    ).toBeRejectedWithDeveloperError();
  });

  it("fromUrl resolves to created provider", async function () {
    const provider = await SingleTileImageryProvider.fromUrl(
      "Data/Images/Red16x16.png"
    );
    expect(provider).toBeInstanceOf(SingleTileImageryProvider);
  });

  it("fromUrl with Resource resolves to created provider", async function () {
    const resource = new Resource({
      url: "Data/Images/Red16x16.png",
    });

    const provider = await SingleTileImageryProvider.fromUrl(resource);
    expect(provider).toBeInstanceOf(SingleTileImageryProvider);
  });

  it("fromUrl throws on failed request", async function () {
    await expectAsync(
      SingleTileImageryProvider.fromUrl("invalid.image.url")
    ).toBeRejectedWithError(
      RuntimeError,
      "Failed to load image invalid.image.url"
    );
  });

  it("returns valid value for hasAlphaChannel", async function () {
    const provider = await SingleTileImageryProvider.fromUrl(
      "Data/Images/Red16x16.png"
    );

    expect(typeof provider.hasAlphaChannel).toBe("boolean");
  });

  it("properties are gettable", async function () {
    const url = "Data/Images/Red16x16.png";
    const rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
    const credit = "hi";
    const provider = await SingleTileImageryProvider.fromUrl(url, {
      rectangle: rectangle,
      credit: credit,
    });

    expect(provider.url).toEqual(url);
    expect(provider.rectangle).toEqual(rectangle);
    expect(provider.hasAlphaChannel).toEqual(true);

    expect(provider.tilingScheme).toBeInstanceOf(GeographicTilingScheme);
    expect(provider.tilingScheme.rectangle).toEqual(rectangle);
    expect(provider.tileWidth).toEqual(16);
    expect(provider.tileHeight).toEqual(16);
    expect(provider.maximumLevel).toEqual(0);
    expect(provider.tileDiscardPolicy).toBeUndefined();
  });

  it("can use a custom ellipsoid", async function () {
    const ellipsoid = new Ellipsoid(1, 2, 3);
    const provider = await SingleTileImageryProvider.fromUrl(
      "Data/Images/Red16x16.png",
      {
        ellipsoid: ellipsoid,
      }
    );

    expect(provider.tilingScheme.ellipsoid).toEqual(ellipsoid);
  });

  it("requests the single image immediately upon construction", async function () {
    const imageUrl = "Data/Images/Red16x16.png";

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const url = request.url;
      expect(url).toEqual(imageUrl);
      Resource._DefaultImplementations.createImage(
        request,
        crossOrigin,
        deferred
      );
    });

    const provider = await SingleTileImageryProvider.fromUrl(imageUrl);

    expect(Resource._Implementations.createImage).toHaveBeenCalled();

    const image = await Promise.resolve(provider.requestImage(0, 0, 0));
    expect(image).toBeImageOrImageBitmap();
  });

  it("lazy loads image when constructed with tile height and tile width", async function () {
    const imageUrl = "Data/Images/Red16x16.png";

    spyOn(Resource._Implementations, "createImage").and.callFake(function (
      request,
      crossOrigin,
      deferred
    ) {
      const url = request.url;
      expect(url).toEqual(imageUrl);
      Resource._DefaultImplementations.createImage(
        request,
        crossOrigin,
        deferred
      );
    });

    const provider = new SingleTileImageryProvider({
      url: imageUrl,
      tileHeight: 16,
      tileWidth: 16,
    });

    expect(Resource._Implementations.createImage).not.toHaveBeenCalled();

    const image = await Promise.resolve(provider.requestImage(0, 0, 0));
    expect(image).toBeImageOrImageBitmap();
    expect(Resource._Implementations.createImage).toHaveBeenCalled();
  });

  it("turns the supplied credit into a logo", async function () {
    const provider = await SingleTileImageryProvider.fromUrl(
      "Data/Images/Red16x16.png"
    );

    expect(provider.credit).toBeUndefined();

    const providerWithCredit = await SingleTileImageryProvider.fromUrl(
      "Data/Images/Red16x16.png",
      {
        credit: "Thanks to our awesome made up source of this imagery!",
      }
    );

    expect(providerWithCredit.credit).toBeDefined();
  });

  it("raises error event when image cannot be loaded", function () {
    const provider = new SingleTileImageryProvider({
      url: "made/up/url",
      tileHeight: 16,
      tileWidth: 16,
    });

    const layer = new ImageryLayer(provider);

    let tries = 0;
    provider.errorEvent.addEventListener(function (error) {
      expect(error.timesRetried).toEqual(tries);
      ++tries;
      if (tries < 3) {
        error.retry = true;
      }
    });

    Resource._Implementations.createImage = function (
      request,
      crossOrigin,
      deferred
    ) {
      if (tries === 2) {
        // Succeed after 2 tries
        Resource._DefaultImplementations.createImage(
          new Request({ url: "Data/Images/Red16x16.png" }),
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

    const imagery = new Imagery(layer, 0, 0, 0);
    imagery.addReference();
    layer._requestImagery(imagery);

    return pollToPromise(function () {
      return imagery.state === ImageryState.RECEIVED;
    }).then(function () {
      expect(imagery.image).toBeImageOrImageBitmap();
      expect(tries).toEqual(2);
      imagery.releaseReference();
    });
  });
});
