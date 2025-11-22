import { createWorldTerrainAsync, CesiumTerrainProvider } from "../../index.js";

describe("Core/createWorldTerrainAsync", function () {
  it("resolves to CesiumTerrainProvider instance with default parameters", async function () {
    const provider = await createWorldTerrainAsync();
    expect(provider).toBeInstanceOf(CesiumTerrainProvider);
    expect(provider.requestVertexNormals).toBe(false);
    expect(provider.requestWaterMask).toBe(false);
  });
});
