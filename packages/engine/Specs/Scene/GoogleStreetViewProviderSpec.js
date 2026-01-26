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
      // Stub internal helpers by monkey-patching globals
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

      const panorama = await provider.loadPanorama({
        cartographic,
        zInput: 2,
        heading: 0,
        tilt: 0,
      });

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
});
