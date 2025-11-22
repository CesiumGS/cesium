import {
  createWorldBathymetryAsync,
  CesiumTerrainProvider,
} from "../../index.js";

describe("Core/createWorldBathymetryAsync", function () {
  it("resolves to CesiumTerrainProvider instance with default parameters", async function () {
    const provider = await createWorldBathymetryAsync();
    expect(provider).toBeInstanceOf(CesiumTerrainProvider);
    expect(provider.requestVertexNormals).toBe(false);
  });
});
