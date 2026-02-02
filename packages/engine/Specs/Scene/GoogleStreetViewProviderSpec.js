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
        Promise.resolve(
          JSON.stringify({
            panoIds: ["pano-1", "pano-2"],
          }),
        ),
      );

      const cartographic = new Cartographic(
        CesiumMath.toRadians(10),
        CesiumMath.toRadians(20),
        0,
      );

      const panoIds = await provider.getPanoIds(cartographic);

      expect(panoIds).toEqual(["pano-1", "pano-2"]);
      expect(Resource.post).toHaveBeenCalled();
    });
  });

  xdescribe("getPanoIdMetadata", function () {
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

      spyOn(GoogleStreetViewProvider, "loadBitmaps").and.callFake(
        async (tiles) =>
          tiles.map((t) => ({
            ...t,
            bitmap: {
              width: 256,
              height: 256,
              close: jasmine.createSpy("close"),
            },
          })),
      );

      spyOn(provider, "getPanoIds").and.returnValue(
        Promise.resolve(["pano-xyz"]),
      );
      spyOn(provider, "getPanoIdMetadata").and.returnValue(
        Promise.resolve({
          heading: 0,
          tilt: 0,
        })
      );
      spyOn(Resource, "post").and.returnValue(
        Promise.resolve(JSON.stringify(["pano-xyz"])),
      );
      spyOn(GoogleMaps, "getDefaultCredit").and.returnValue("Google Credit");

      spyOn(document, "createElement").and.callFake(() => ({
        getContext: () => ({ drawImage: jasmine.createSpy("drawImage") }),
        width: 1024,
        height: 512,
      }));

      const cartographic = new Cartographic(
        CesiumMath.toRadians(0),
        CesiumMath.toRadians(0),
        0,
      );

      const panorama = await provider.loadPanorama({
        cartographic,
        zoom: 2,
        heading: 0,
        tilt: 0,
      });

      expect(panorama).toEqual(jasmine.any(EquirectangularPanorama));
    });
  });

  describe("loadPanoramaFromPanoId", function () {
    it("delegates to loadPanorama with metadata-derived parameters", async function () {
      spyOn(provider, "getPanoIdMetadata").and.returnValue(
        Promise.resolve({
          lat: 10,
          lng: 20,
          heading: 90,
          tilt: 5,
          originalElevationAboveEgm96: 50,
        })
      );

      const loadPanoramaSpy = spyOn(
        provider,
        "loadPanorama"
      ).and.returnValue(Promise.resolve("panorama-result"));

      const mockPanoId = "pano-abc";
      const mockZoom = 2;

      const result = await provider.loadPanoramaFromPanoId(mockPanoId, mockZoom);

      expect(loadPanoramaSpy).toHaveBeenCalledWith({
        cartographic: jasmine.any(Cartographic),
        zoom: 2,
        heading: 90,
        tilt: -85,
        panoId: mockPanoId
      });

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

    describe("GoogleStreetViewProvider.loadBitmaps", function () {
      let originalCreateIfNeeded;

      beforeEach(function () {
        originalCreateIfNeeded = Resource.createIfNeeded;
      });

      afterEach(function () {
        Resource.createIfNeeded = originalCreateIfNeeded;
      });

      it("returns loaded tiles when fetchImage succeeds", async function () {
        const fakeBitmap = {
          width: 256,
          height: 256,
          close: jasmine.createSpy("close"),
        };

        spyOn(Resource, "createIfNeeded").and.callFake((url) => ({
          url,
          fetchImage: jasmine
            .createSpy("fetchImage")
            .and.returnValue(Promise.resolve(fakeBitmap)),
        }));

        const tiles = [
          { z: 2, x: 0, y: 0, src: "a.png" },
          { z: 2, x: 1, y: 0, src: "b.png" },
        ];

        const result = await GoogleStreetViewProvider.loadBitmaps(tiles);

        expect(result.length).toBe(2);
        expect(result[0].bitmap).toBe(fakeBitmap);
        expect(result[1].bitmap).toBe(fakeBitmap);

        expect(Resource.createIfNeeded).toHaveBeenCalledWith("a.png");
        expect(Resource.createIfNeeded).toHaveBeenCalledWith("b.png");
      });

      it("passes correct flipOptions to fetchImage", async function () {
        const fetchSpy = jasmine
          .createSpy("fetchImage")
          .and.returnValue(
            Promise.resolve({ width: 256, height: 256, close() {} }),
          );

        spyOn(Resource, "createIfNeeded").and.returnValue({
          fetchImage: fetchSpy,
        });

        const tiles = [{ src: "a.png" }];

        await GoogleStreetViewProvider.loadBitmaps(tiles);

        expect(fetchSpy).toHaveBeenCalledWith({
          flipY: false,
          skipColorSpaceConversion: true,
          preferImageBitmap: true,
        });
      });

      it("fails silently and returns an empty array when fetchImage rejects", async function () {
        spyOn(Resource, "createIfNeeded").and.returnValue({
          fetchImage: jasmine
            .createSpy("fetchImage")
            .and.returnValue(Promise.reject(new Error("network error"))),
        });

        const tiles = [{ src: "error.png" }];

        const result = await GoogleStreetViewProvider.loadBitmaps(tiles);

        expect(result).toEqual([]);
      });

      it("returns only successfully loaded tiles when some fetches fail", async function () {
        const fakeBitmap = {
          width: 256,
          height: 256,
          close: jasmine.createSpy("close"),
        };

        spyOn(Resource, "createIfNeeded").and.callFake((url) => {
          if (url === "bad.png") {
            return {
              fetchImage: jasmine
                .createSpy("fetchImage")
                .and.returnValue(Promise.reject(new Error("network error"))),
            };
          }

          return {
            fetchImage: jasmine
              .createSpy("fetchImage")
              .and.returnValue(Promise.resolve(fakeBitmap)),
          };
        });

        const tiles = [{ src: "good.png" }, { src: "bad.png" }];

        const result = await GoogleStreetViewProvider.loadBitmaps(tiles);

        expect(result.length).toBe(1);
        expect(result[0].src).toBe("good.png");
        expect(result[0].bitmap).toBe(fakeBitmap);
      });

      it("returns an empty array when given no tiles", async function () {
        const result = await GoogleStreetViewProvider.loadBitmaps([]);

        expect(result).toEqual([]);
      });
    });

    describe("GoogleStreetViewProvider.stitchBitmapsFromTileMap", function () {
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

        spyOn(GoogleStreetViewProvider, "loadBitmaps").and.callFake(
          async (tiles) => {
            return tiles.map((t) => ({
              ...t,
              bitmap: {
                width: 256,
                height: 256,
                close: jasmine.createSpy("close"),
              },
            }));
          },
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

        spyOn(GoogleStreetViewProvider, "loadBitmaps").and.callFake(
          async (tiles) => {
            return tiles.map((t) => ({
              ...t,
              bitmap: {
                width: t.src === "a.png" ? 256 : 128,
                height: 256,
                close: jasmine.createSpy("close"),
              },
            }));
          },
        );

        await expectAsync(
          GoogleStreetViewProvider.stitchBitmapsFromTileMap(tileMap),
        ).toBeRejectedWithError(DeveloperError);
      });

      it("throws if no bitmaps could be loaded", async function () {
        const tileMap = {
          "2/0/0": "a.png",
          "2/1/0": "b.png",
        };

        spyOn(GoogleStreetViewProvider, "loadBitmaps").and.returnValue(
          Promise.resolve([]),
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
        spyOn(GoogleStreetViewProvider, "loadBitmaps").and.callFake(
          async (tiles) => {
            return tiles.map((t) => ({
              ...t,
              bitmap: t.src === "a.png" ? bitmap1 : bitmap2,
            }));
          },
        );

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

        spyOn(GoogleStreetViewProvider, "loadBitmaps").and.callFake(
          async (tiles) => {
            return tiles.map((t) => ({
              ...t,
              bitmap: t.src === "a.png" ? bitmap1 : bitmap2,
            }));
          },
        );

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

        spyOn(GoogleStreetViewProvider, "loadBitmaps").and.callFake(
          async (tiles) => {
            return tiles.map((t) => ({
              ...t,
              bitmap: sampleBitmap,
            }));
          },
        );

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
