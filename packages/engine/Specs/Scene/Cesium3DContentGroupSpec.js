import { Cesium3DContentGroup } from "../../index.js";

describe("Scene/Cesium3DContentGroup", function () {
  const mockMetadata = {};

  it("constructs", function () {
    const group = new Cesium3DContentGroup({
      metadata: mockMetadata,
    });
    expect(group.metadata).toBe(mockMetadata);
  });

  it("throws without metadata", function () {
    expect(function () {
      return new Cesium3DContentGroup({
        metadata: undefined,
      });
    }).toThrowDeveloperError();
  });
});
