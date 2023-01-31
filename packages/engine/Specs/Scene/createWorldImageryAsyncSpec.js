import { createWorldImageryAsync, IonImageryProvider } from "../../index.js";

describe("Core/createWorldImageryAsync", function () {
  it("resolves to IonImageryProvider instance with default parameters", async function () {
    const provider = await createWorldImageryAsync();
    expect(provider).toBeInstanceOf(IonImageryProvider);
    expect(provider.assetId).toBe(2);
  });
});
