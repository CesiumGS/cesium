import GoogleStreetViewCubeMapPanoramaProvider from "../../Source/Scene/GoogleStreetViewCubeMapPanoramaProvider.js";
import Cartographic from "../../Source/Core/Cartographic.js";
import CubeMapPanorama from "../../Source/Scene/CubeMapPanorama.js";
import PanoramaProvider from "../../Source/Scene/PanoramaProvider.js";

describe("Scene/GoogleStreetViewCubeMapPanoramaProvider", function () {
  let provider;

  beforeEach(function () {
    provider = new GoogleStreetViewCubeMapPanoramaProvider({
      apiKey: "test-key",
      url: "https://example.com/",
      tileSize: 512,
    });
  });

  it("conforms to PanoramaProvider interface", function () {
    expect(GoogleStreetViewCubeMapPanoramaProvider).toConformToInterface(
      PanoramaProvider,
    );
  });

  it("constructs with apiKey", function () {
    expect(provider._key).toBe("test-key");
    expect(provider._tileSize).toBe(512);
  });

  it("defaults tileSize to 600", function () {
    const p = new GoogleStreetViewCubeMapPanoramaProvider({
      apiKey: "test-key",
    });
    expect(p._tileSize).toBe(600);
  });

  it("fromUrl throws without apiKey", async function () {
    await expectAsync(
      GoogleStreetViewCubeMapPanoramaProvider.fromUrl({}),
    ).toBeRejectedWithDeveloperError();
  });

  it("fromUrl creates provider", async function () {
    const result = await GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
      apiKey: "abc",
    });

    expect(result).toBeInstanceOf(GoogleStreetViewCubeMapPanoramaProvider);
  });

  it("getNearestPanoId throws without position", async function () {
    await expectAsync(
      provider.getNearestPanoId(),
    ).toBeRejectedWithDeveloperError();
  });

  it("getNearestPanoId returns parsed pano data", async function () {
    const mockResponse = {
      status: "OK",
      pano_id: "pano123",
      location: {
        lat: 10,
        lng: 20,
      },
    };

    spyOn(provider._metadataResource, "getDerivedResource").and.returnValue({
      fetchJson: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve(mockResponse)),
    });

    const position = Cartographic.fromDegrees(20, 10);

    const result = await provider.getNearestPanoId(position);

    expect(result.panoId).toBe("pano123");
    expect(result.latitude).toBe(10);
    expect(result.longitude).toBe(20);
  });

  it("getNearestPanoId throws on non-OK status", async function () {
    spyOn(provider._metadataResource, "getDerivedResource").and.returnValue({
      fetchJson: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve({ status: "ZERO_RESULTS" })),
    });

    const position = Cartographic.fromDegrees(0, 0);

    await expectAsync(
      provider.getNearestPanoId(position),
    ).toBeRejectedWithDeveloperError();
  });

  it("getPanoIdMetadata returns metadata", async function () {
    const mockResponse = {
      status: "OK",
      location: { lat: 1, lng: 2 },
    };

    spyOn(provider._metadataResource, "getDerivedResource").and.returnValue({
      fetchJson: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve(mockResponse)),
    });

    const result = await provider.getPanoIdMetadata("abc");

    expect(result.location.lat).toBe(1);
  });

  it("getPanoIdMetadata throws on error status", async function () {
    spyOn(provider._metadataResource, "getDerivedResource").and.returnValue({
      fetchJson: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve({ status: "INVALID_REQUEST" })),
    });

    await expectAsync(
      provider.getPanoIdMetadata("abc"),
    ).toBeRejectedWithDeveloperError();
  });

  it("_buildFaceUrl builds url with query params", function () {
    const derivedSpy = jasmine.createSpy().and.returnValue({
      url: "https://example.com/?size=512x512&pano=test",
    });

    spyOn(provider._baseResource, "getDerivedResource").and.callFake(
      derivedSpy,
    );

    const url = provider._buildFaceUrl({
      heading: 0,
      pitch: 0,
      tileSizeString: "512x512",
      panoId: "test",
      signature: undefined,
    });

    expect(provider._baseResource.getDerivedResource).toHaveBeenCalledWith({
      queryParameters: {
        size: "512x512",
        pano: "test",
        heading: 0,
        pitch: 0,
        key: "test-key",
      },
    });

    expect(url).toContain("example.com");
  });

  it("_buildFaceUrl includes signature when defined", function () {
    const getDerivedSpy = spyOn(
      provider._baseResource,
      "getDerivedResource",
    ).and.returnValue({
      url: "https://example.com/",
    });

    provider._buildFaceUrl({
      heading: 90,
      pitch: 10,
      tileSizeString: "512x512",
      panoId: "abc",
      signature: "mysignature",
    });

    expect(getDerivedSpy).toHaveBeenCalledWith({
      queryParameters: {
        size: "512x512",
        pano: "abc",
        heading: 90,
        pitch: 10,
        key: "test-key",
        signature: "mysignature",
      },
    });
  });

  it("loadPanorama throws without cartographic", async function () {
    await expectAsync(
      provider.loadPanorama({}),
    ).toBeRejectedWithDeveloperError();
  });

  it("loadPanorama builds CubeMapPanorama", async function () {
    spyOn(provider, "_buildFaceUrl").and.returnValue(
      "https://example.com/image.jpg",
    );

    spyOn(CubeMapPanorama.prototype, "constructor");

    const cartographic = Cartographic.fromDegrees(20, 10);

    const panorama = await provider.loadPanorama({
      cartographic,
      panoId: "abc",
    });

    expect(panorama).toBeDefined();
  });

  it("loadPanorama calls getNearestPanoId if panoId not provided", async function () {
    spyOn(provider, "getNearestPanoId").and.returnValue(
      Promise.resolve({ panoId: "abc" }),
    );

    spyOn(provider, "_buildFaceUrl").and.returnValue(
      "https://example.com/image.jpg",
    );

    const cartographic = Cartographic.fromDegrees(20, 10);

    await provider.loadPanorama({
      cartographic,
    });

    expect(provider.getNearestPanoId).toHaveBeenCalled();
  });

  it("_parseMetadata converts to cartographic", function () {
    const metadata = {
      location: {
        lat: 10,
        lng: 20,
      },
    };

    const result =
      GoogleStreetViewCubeMapPanoramaProvider._parseMetadata(metadata);

    expect(result.cartographic.latitude).toBeDefined();
  });
});
