import {
  Cesium3DTilesetTraversal,
  Cesium3DTilesetBaseTraversal,
} from "../../index.js";

describe("Scene/Cesium3DTilesetBaseTraversal", function () {
  it("conforms to Cesium3DTilesetTraversal interface", function () {
    expect(Cesium3DTilesetBaseTraversal).toConformToInterface(
      Cesium3DTilesetTraversal
    );
  });
});
