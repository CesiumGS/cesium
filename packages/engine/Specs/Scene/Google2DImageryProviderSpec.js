import {
  Math as CesiumMath,
  Rectangle,
  Request,
  RequestScheduler,
  Resource,
  // IonResource,
  // RuntimeError,
  WebMercatorTilingScheme,
  Imagery,
  ImageryLayer,
  ImageryProvider,
  ImageryState,
  // RequestErrorEvent,
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

  // xit("IonResource retryCallback fires when image request returns 401", async function () {
  //   const url = "http://foo.bar.ion.proxy.invalid";

  //   const mockEndpoint = {
  //     type: "IMAGERY",
  //     externalType: "GOOGLE_2D_MAPS",
  //     options: {
  //       url: "https://assets.ion-staging.cesium.com/proxy/1687",
  //       imageFormat: "png",
  //       tileWidth: 256,
  //       tileHeight: 256,
  //       session:
  //         "AJVsH2xF1ML3tWMQqWCOplim4IIA_2_7YwBLpXEr11UFC3jS31RQ1hX-Pn5_8Q1C_Q6Yqcg6F3Zv7JNeBWS3Q7gbDQ",
  //       key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlN2E4MDk5Mi02ZDZjLTQ0ZDgtYjZmYy00OWRmZDk1Zjk3MDYiLCJpZCI6MjUyLCJhc3NldElkIjoxNjg3LCJhc3NldHMiOnsiMTY4NyI6eyJ0eXBlIjoiSU1BR0VSWSJ9fSwiZXh0ZXJuYWwiOnsiZG9tYWluTmFtZSI6InRpbGUuZ29vZ2xlYXBpcy5jb20iLCJwb3J0Ijo0NDMsInByb3RvY29sIjoiaHR0cHMiLCJwYXRoIjoiIiwicXVlcnlzdHJpbmciOiIifSwiZXh0ZXJuYWxUeXBlIjoiR09PR0xFXzJEX01BUFMiLCJwbGFuQ29kZSI6IkNPTU1VTklUWSIsInNyYyI6IjVmMzRlMGQ3LWQwMmQtNDk2Ny05ZjEwLWEzNWY1Y2I2MDY2ZSIsImlhdCI6MTc1ODU2MjU4NSwiZXhwIjoxNzU4NTY2MTg1fQ.S2k5W-btQu2ER1kSZl5H7RLGCFWM--HYirGw2TG9mXw",
  //     },
  //     attributions: [
  //       {
  //         html: '<span><a href="https://cesium.com" target="_blank"><img src="https://assets.ion-staging.cesium.com/ion-credit.png" alt="Cesium ion"></a></span>',
  //         collapsible: false,
  //       },
  //     ],
  //   };

  //   const mockEndpointResource = {};

  //   // const endpoint = {
  //   //   type: "IMAGERY",
  //   //   url: `https://assets.cesium.com/${assetId}/tileset.json`,
  //   //   accessToken: "not_really_a_refresh_token",
  //   //   attributions: [],
  //   // };

  //   // it("constructs with expected values", function () {
  //   //   spyOn(Resource, "call").and.callThrough();

  //   //const endpointResource = IonResource._createEndpointResource(assetId);
  //   const resource = new IonResource(mockEndpoint, mockEndpointResource);

  //   console.log(resource);
  //   expect(resource).toBeInstanceOf(IonResource);

  //   //installFakeRequest({ url, mapStyle });
  //   //IonResource

  //   const provider = await Google2DImageryProvider.fromSessionToken({
  //     session: "fake-session-token",
  //     tileWidth: 256,
  //     tileHeight: 256,
  //     key: "fake-session-key",
  //     url: resource,
  //   });
  //   console.log("provider ", provider);

  //   expect(provider).toBeInstanceOf(Google2DImageryProvider);

  //   spyOn(provider._imageryProvider, "requestTile");

  //   // const requestSpy = spyOn(Resource.prototype, "fetchJson");

  //   // requestSpy.and.rejectWith(
  //   //     new RequestErrorEvent(
  //   //       401,
  //   //       JSON.stringify({
  //   //         error: { message: "failed", details: [{ code: "InvalidToken" }] },
  //   //       }),
  //   //     ),
  //   //   );
  //   // await expectAsync(
  //   //   provider.requestImage(0, 0, 0),
  //   //   ).toBeRejectedWithError(RuntimeError, /Unauthorized/);

  //   // spyOn(Resource._Implementations, "createImage").and.callFake(
  //   //   function (request, crossOrigin, deferred) {
  //   //     console.log("request ", request)
  //   //     //const error = new RequestErrorEvent(401);
  //   //     //return error;
  //   //     return deferred.resolve(new RequestErrorEvent(401));
  //   // })

  //   // function (request, crossOrigin, deferred) {
  //   //   expect(request.url).toContain("/0/0/0");

  //   //   // Just return any old image.
  //   //   Resource._DefaultImplementations.createImage(
  //   //     new Request({ url: "Data/Images/Red16x16.png" }),
  //   //     crossOrigin,
  //   //     deferred,
  //   //   );
  //   // },
  //   //;

  //   // return provider.requestImage(0, 0, 0).then(function (image) {
  //   //   expect(Resource._Implementations.createImage).toHaveBeenCalled();
  //   //   //expect(image).toBeImageOrImageBitmap();
  //   // });

  //   // const layer = new ImageryLayer(provider);

  //   // let tries = 0;
  //   // provider.errorEvent.addEventListener(function (error) {
  //   //   console.log("error event listener ", error.timesRetried)
  //   //   expect(error.timesRetried).toEqual(tries);
  //   //   ++tries;
  //   //   if (tries < 3) {
  //   //     error.retry = true;
  //   //   }
  //   //   setTimeout(function () {
  //   //     RequestScheduler.update();
  //   //   }, 1);
  //   // });

  //   // Resource._Implementations.createImage = function (
  //   //   request,
  //   //   crossOrigin,
  //   //   deferred,
  //   // ) {

  //   //   const url = request.url;
  //   //   console.log("resource createImage tries ", tries," url " , url)

  //   //   if (tries === 2) {
  //   //     // Succeed after 2 tries
  //   //     Resource._DefaultImplementations.createImage(
  //   //       new Request({ url: "Data/Images/Red16x16.png" }),
  //   //       crossOrigin,
  //   //       deferred,
  //   //     );
  //   //   } else {
  //   //     // fail
  //   //     setTimeout(function () {
  //   //       deferred.reject();
  //   //     }, 1);
  //   //   }
  //   // };

  //   // const imagery = new Imagery(layer, 0, 0, 0);
  //   // imagery.addReference();
  //   // layer._requestImagery(imagery);
  //   // RequestScheduler.update();

  //   // return pollToPromise(function () {
  //   //   console.log("poll")
  //   //   return imagery.state === ImageryState.RECEIVED;
  //   // }).then(function () {
  //   //   expect(imagery.image).toBeImageOrImageBitmap();
  //   //   expect(tries).toEqual(2);
  //   //   imagery.releaseReference();
  //   // });
  // });

  // xit("requires the mapId to be specified", function () {
  //   expect(function () {
  //     return new Google2DImageryProvider({ accessToken: "test-token" });
  //   }).toThrowDeveloperError();
  // });

  // xit("returns valid value for hasAlphaChannel", function () {
  //   const provider = new Google2DImageryProvider({
  //     accessToken: "test-token",
  //     url: "made/up/Google2D/server/",
  //     mapId: "test-id",
  //   });

  //   expect(typeof provider.hasAlphaChannel).toBe("boolean");
  // });

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

  // it("when no credit is supplied, the provider adds a default credit", function () {
  //   const provider = new Google2DImageryProvider({
  //     accessToken: "test-token",
  //     url: "made/up/Google2D/server/",
  //     mapId: "test-id",
  //   });
  //   expect(provider.credit).toBe(Google2DImageryProvider._defaultCredit);
  // });

  // it("turns the supplied credit into a logo", function () {
  //   const creditText = "Thanks to our awesome made up source of this imagery!";
  //   const providerWithCredit = new Google2DImageryProvider({
  //     accessToken: "test-token",
  //     url: "made/up/Google2D/server/",
  //     mapId: "test-id",
  //     credit: creditText,
  //   });
  //   expect(providerWithCredit.credit.html).toEqual(creditText);
  // });

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
