import { Cartographic, MVTDataProvider, Resource } from "../../index.js";

describe("Scene/MVTDataProvider", function () {
  function createMinimalMvtBuffer() {
    return new Uint8Array([
      0x1a, 0x12, 0x0a, 0x04, 0x74, 0x65, 0x73, 0x74, 0x12, 0x06, 0x18, 0x01,
      0x22, 0x03, 0x09, 0x00, 0x00, 0x28, 0x80, 0x20, 0x78, 0x02,
    ]).buffer;
  }

  it("creates from url template", async function () {
    const provider = await MVTDataProvider.fromUrlTemplate(
      "https://example.com/{z}/{x}/{y}.mvt",
    );
    expect(provider.urlTemplate).toBe("https://example.com/{z}/{x}/{y}.mvt");
    provider.destroy();
  });

  it("requests a tile from the template", async function () {
    const provider = await MVTDataProvider.fromUrlTemplate(
      "https://example.com/{z}/{x}/{y}.mvt?token=test",
    );
    const fetchSpy = spyOn(
      Resource.prototype,
      "fetchArrayBuffer",
    ).and.returnValue(Promise.resolve(createMinimalMvtBuffer()));

    await provider._requestTile(3, 4, 5);

    expect(fetchSpy.calls.count()).toBe(1);
    const requestResource = fetchSpy.calls.mostRecent().object;
    expect(requestResource.url).toContain("/3/4/5.mvt?token=test");
    expect(provider._tileContents.size).toBe(1);

    const content = provider._tileContents.get("3/4/5");
    expect(content.featuresLength).toBe(1);
    provider.destroy();
  });

  it("requests tiles around the camera on update", async function () {
    const provider = await MVTDataProvider.fromUrlTemplate(
      "https://example.com/{z}/{x}/{y}.mvt",
    );

    const requestSpy = spyOn(provider, "_requestTile").and.returnValue(
      Promise.resolve(),
    );

    provider.update({
      frameNumber: 1,
      camera: {
        positionCartographic: Cartographic.fromDegrees(0.0, 0.0, 1000.0),
      },
    });

    expect(requestSpy).toHaveBeenCalled();
    provider.destroy();
  });
});
