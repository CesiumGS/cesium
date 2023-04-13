import {
  Cesium3DTilesetTraversal,
  Cesium3DTilesetSkipTraversal,
} from "../../index.js";

describe("Scene/Cesium3DTilesetSkipTraversal", function () {
  it("conforms to Cesium3DTilesetTraversal interface", function () {
    expect(Cesium3DTilesetSkipTraversal).toConformToInterface(
      Cesium3DTilesetTraversal
    );
  });
});
