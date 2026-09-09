import { MVTDataProvider } from "../../index.js";

describe("Scene/MVTDataProvider", function () {
  it("forwards vectorZIndex to the generated tileset", function () {
    const provider = new MVTDataProvider("http://example.com/{z}/{x}/{y}.pbf", {
      vectorZIndex: 5,
    });

    expect(provider._createTilesetLoadOptions().vectorZIndex).toBe(5);
  });
});
