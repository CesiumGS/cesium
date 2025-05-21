import {
  Cesium3DTilesetMostDetailedTraversal,
  Cesium3DTilesetTraversal,
} from "../../index.js";

describe("Scene/Cesium3DTilesetMostDetailedTraversal", function () {
  it("conforms to Cesium3DTilesetTraversal interface", function () {
    expect(Cesium3DTilesetMostDetailedTraversal).toConformToInterface(
      Cesium3DTilesetTraversal,
    );
  });
});
