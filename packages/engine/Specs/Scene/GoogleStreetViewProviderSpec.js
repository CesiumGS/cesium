import GoogleStreetViewProvider from "../../Source/Scene/GoogleStreetViewProvider.js";
import EquirectangularPanorama from "../../Source/Scene/EquirectangularPanorama.js";
import DeveloperError from "../../Source/Core/DeveloperError.js";
import Resource from "../../Source/Core/Resource.js";
import Cartographic from "../../Source/Core/Cartographic.js";
import GoogleMaps from "../../Source/Core/GoogleMaps.js";
import CesiumMath from "../../Source/Core/Math.js";

describe("Scene/GoogleStreetViewProvider", function () {
  let provider;

  beforeEach(function () {
    provider = new GoogleStreetViewProvider({
      apiKey: "test-key",
      session: "test-session",
    });
  });

  afterEach(function () {
    jasmine.clock().uninstall();
  });

  it("constructs with apiKey and session", function () {
    expect(provider._key).toBe("test-key");
    expect(provider._session).toBe("test-session");
  });

  describe("fromUrl", function () {
    it("throws if apiKey is missing", async function () {
      await expectAsync(
        GoogleStreetViewProvider.fromUrl({}),
      ).toBeRejectedWithError(DeveloperError);
    });

    it("creates provider from API response", async function () {
      spyOn(Resource, "post").and.returnValue(
        Promise.resolve(JSON.stringify({ session: "new-session" })),
      );

      const result = await GoogleStreetViewProvider.fromUrl({
        apiKey: "abc",
      });

      expect(result).toBeDefined();
      expect(result._session).toBe("new-session");
      expect(result._key).toBe("abc");
    });
  });

  describe("getPanoIds", function () {
    it("requests panoIds from Google API", async function () {
      spyOn(Resource, "post").and.returnValue(
        Promise.resolve(JSON.stringify(["pano-1", "pano-2"])),
      );

      const cartographic = new Cartographic(
        CesiumMath.toRadians(10),
        CesiumMath.toRadians(20),
        0,
      );

      const panoIds = await provider.getPanoIds({ cartographic });

      expect(panoIds).toEqual(["pano-1", "pano-2"]);
      expect(Resource.post).toHaveBeenCalled();
    });
  });

  describe("getPanoIdMetadata", function () {
    it("fetches panoId metadata", async function () {
      const metadata = {
        lat: 40,
        lng: -105,
        heading: 180,
        tilt: 10,
        originalElevationAboveEgm96: 100,
      };

      spyOn(Resource, "fetch").and.returnValue(
        Promise.resolve(JSON.stringify(metadata)),
      );

      const result = await provider.getPanoIdMetadata({
        panoId: "pano-123",
      });

      expect(result).toEqual(metadata);
    });
  });

  describe("loadPanorama", function () {
    beforeEach(function () {
      // Avoid real panoId lookup
      spyOn(provider, "getPanoIds").and.returnValue(
        Promise.resolve(["pano-xyz"]),
      );

      // Avoid real Google tile requests
      spyOn(Resource, "post").and.callFake(() =>
        Promise.resolve(JSON.stringify(["pano-xyz"])),
      );

      // Fake default credit
      spyOn(GoogleMaps, "getDefaultCredit").and.returnValue("Google Credit");

      // Fake panorama construction
      spyOn(EquirectangularPanorama.prototype, "constructor");
    });

    it("creates an EquirectangularPanorama", async function () {
      const fakeTileMap = {
        "2/0/0": "a.png",
        "2/1/0": "b.png",
        "2/2/0": "c.png",
        "2/3/0": "d.png",
        "2/0/1": "e.png",
        "2/1/1": "f.png",
        "2/2/1": "g.png",
        "2/3/1": "h.png",
      };

      spyOn(
        GoogleStreetViewProvider,
        "getGoogleStreetViewTileUrls",
      ).and.returnValue(Promise.resolve(fakeTileMap));

      spyOn(GoogleStreetViewProvider, "loadBitmap").and.returnValue(
        Promise.resolve({
          width: 256,
          height: 256,
          close: jasmine.createSpy("close"),
        }),
      );

      spyOn(document, "createElement").and.callFake(() => {
        return {
          getContext: () => ({
            drawImage: jasmine.createSpy("drawImage"),
          }),
          width: 1024,
          height: 512,
        };
      });

      const cartographic = new Cartographic(
        CesiumMath.toRadians(0),
        CesiumMath.toRadians(0),
        0,
      );
      console.log("here 1");

      const panorama = await provider.loadPanorama({
        cartographic,
        zInput: 2,
        heading: 0,
        tilt: 0,
      });
      console.log("here 2");

      expect(panorama).toEqual(jasmine.any(EquirectangularPanorama));
    });
  });

  describe("loadPanoramafromPanoId", function () {
    it("loads panorama using panoId metadata", async function () {
      spyOn(provider, "getPanoIdMetadata").and.returnValue(
        Promise.resolve({
          lat: 10,
          lng: 20,
          heading: 90,
          tilt: 5,
          originalElevationAboveEgm96: 50,
        }),
      );

      spyOn(provider, "loadPanorama").and.returnValue(
        Promise.resolve("panorama-result"),
      );

      const result = await provider.loadPanoramafromPanoId({
        panoId: "pano-abc",
        zInput: 2,
      });

      expect(provider.loadPanorama).toHaveBeenCalled();
      expect(result).toBe("panorama-result");
    });
  });

  describe("GoogleStreetViewProvider static helpers", function () {
    describe("GoogleStreetViewProvider.getStreetViewTileUrls", function () {
      it("creates tile URLs for given zoom and partition", async function () {
        const tileMap =
          await GoogleStreetViewProvider.getGoogleStreetViewTileUrls({
            z: 2,
            partition: 2,
            panoId: "pano123",
            key: "api-key",
            session: "session-1",
          });

        expect(Object.keys(tileMap).length).toBe(8); // 2 * 2 * 2
        expect(tileMap["2/0/0"]).toContain(
          "https://tile.googleapis.com/v1/streetview/tiles/2/0/0",
        );
      });
    });

    describe("loadBitmap", function () {
      let originalFetch;
      let originalCreateImageBitmap;

      beforeEach(function () {
        originalFetch = window.fetch;
        originalCreateImageBitmap = window.createImageBitmap;
      });

      afterEach(function () {
        window.fetch = originalFetch;
        window.createImageBitmap = originalCreateImageBitmap;
      });

      it("returns an ImageBitmap when fetch succeeds", async function () {
        const fakeBlob = {};
        const fakeBitmap = { width: 256, height: 256 };

        window.fetch = jasmine.createSpy().and.returnValue(
          Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(fakeBlob),
          }),
        );

        window.createImageBitmap = jasmine
          .createSpy()
          .and.returnValue(Promise.resolve(fakeBitmap));

        const result = await GoogleStreetViewProvider.loadBitmap("test.png");

        expect(fetch).toHaveBeenCalled();
        expect(createImageBitmap).toHaveBeenCalledWith(fakeBlob);
        expect(result).toBe(fakeBitmap);
      });

      it("returns null when response is not ok", async function () {
        window.fetch = jasmine
          .createSpy()
          .and.returnValue(Promise.resolve({ ok: false }));

        const result = await GoogleStreetViewProvider.loadBitmap("bad.png");

        expect(result).toBeNull();
      });

      it("returns null when fetch throws", async function () {
        window.fetch = jasmine
          .createSpy()
          .and.returnValue(Promise.reject(new Error("network error")));

        const result = await GoogleStreetViewProvider.loadBitmap("error.png");

        expect(result).toBeNull();
      });
    });

    describe("stitchBitmapsFromTileMap", function () {
      let originalCreateElement;

      beforeEach(function () {
        originalCreateElement = document.createElement;

        document.createElement = jasmine.createSpy().and.callFake(() => ({
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: jasmine.createSpy("drawImage"),
          }),
        }));
      });

      afterEach(function () {
        document.createElement = originalCreateElement;
      });

      it("throws if no tiles are provided", async function () {
        await expectAsync(
          GoogleStreetViewProvider.stitchBitmapsFromTileMap({}),
        ).toBeRejectedWithError("No tiles provided");
      });

      it("throws DeveloperError if tiles have different zoom levels", async function () {
        const tileMap = {
          "2/0/0": "a.png",
          "3/0/0": "b.png",
        };

        spyOn(GoogleStreetViewProvider, "loadBitmap").and.returnValue(
          Promise.resolve({ width: 256, height: 256 }),
        );

        await expectAsync(
          GoogleStreetViewProvider.stitchBitmapsFromTileMap(tileMap),
        ).toBeRejectedWithError(DeveloperError);
      });

      it("throws DeveloperError if tiles have different dimensions", async function () {
        const tileMap = {
          "2/0/0": "a.png",
          "2/1/0": "b.png",
        };

        spyOn(GoogleStreetViewProvider, "loadBitmap").and.callFake((url) => {
          return Promise.resolve(
            url === "a.png"
              ? { width: 256, height: 256, close: jasmine.createSpy("close") }
              : { width: 128, height: 256, close: jasmine.createSpy("close") },
          );
        });

        await expectAsync(
          GoogleStreetViewProvider.stitchBitmapsFromTileMap(tileMap),
        ).toBeRejectedWithError(DeveloperError);
      });

      it("throws if no bitmaps could be loaded", async function () {
        const tileMap = {
          "2/0/0": "a.png",
          "2/1/0": "b.png",
        };

        spyOn(GoogleStreetViewProvider, "loadBitmap").and.returnValue(
          Promise.resolve(null),
        );

        await expectAsync(
          GoogleStreetViewProvider.stitchBitmapsFromTileMap(tileMap),
        ).toBeRejectedWithDeveloperError("No tiles could be loaded");
      });

      it("creates a canvas and draws all loaded bitmaps", async function () {
        const bitmap1 = {
          width: 100,
          height: 50,
          close: jasmine.createSpy("close"),
        };

        const bitmap2 = {
          width: 100,
          height: 50,
          close: jasmine.createSpy("close"),
        };

        spyOn(GoogleStreetViewProvider, "loadBitmap").and.callFake((url) => {
          return Promise.resolve(url === "a.png" ? bitmap1 : bitmap2);
        });

        const tileMap = {
          "2/0/0": "a.png",
          "2/1/0": "b.png",
        };

        const canvas =
          await GoogleStreetViewProvider.stitchBitmapsFromTileMap(tileMap);

        expect(canvas).toBeDefined();
        expect(document.createElement).toHaveBeenCalledWith("canvas");
        expect(bitmap1.close).toHaveBeenCalled();
        expect(bitmap2.close).toHaveBeenCalled();
      });

      it("creates a canvas with correct dimensions at level 1", async function () {
        const bitmap1 = {
          width: 100,
          height: 50,
          close: jasmine.createSpy("close"),
        };

        const bitmap2 = {
          width: 100,
          height: 50,
          close: jasmine.createSpy("close"),
        };

        spyOn(GoogleStreetViewProvider, "loadBitmap").and.callFake((url) => {
          return Promise.resolve(url === "a.png" ? bitmap1 : bitmap2);
        });

        const tileMap = {
          "1/0/0": "a.png",
          "1/1/0": "b.png",
        };

        const canvas =
          await GoogleStreetViewProvider.stitchBitmapsFromTileMap(tileMap);

        expect(canvas).toBeDefined();
        expect(canvas.width).toEqual(200);
        expect(canvas.height).toEqual(50);
      });

      it("creates a canvas with correct dimensions at level 2", async function () {
        const sampleBitmap = {
          width: 100,
          height: 50,
          close: jasmine.createSpy("close"),
        };

        spyOn(GoogleStreetViewProvider, "loadBitmap").and.callFake((url) => {
          return Promise.resolve(sampleBitmap);
        });

        const tileMap = {
          "2/0/0": "0.png",
          "2/1/0": "1.png",
          "2/2/0": "2.png",
          "2/3/0": "3.png",
          "2/0/1": "4.png",
          "2/1/1": "5.png",
          "2/2/1": "6.png",
          "2/3/1": "7.png",
        };

        const canvas =
          await GoogleStreetViewProvider.stitchBitmapsFromTileMap(tileMap);

        expect(canvas).toBeDefined();
        expect(sampleBitmap.close.calls.count()).toBe(8);
        expect(canvas.width).toEqual(400);
        expect(canvas.height).toEqual(100);
      });
    });
  });
});
