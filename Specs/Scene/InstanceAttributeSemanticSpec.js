import { InstanceAttributeSemantic } from "../../Source/Cesium.js";

describe("Scene/InstanceAttributeSemantic", function () {
  it("fromGltfSemantic", function () {
    var gltfSemantics = [
      "TRANSLATION",
      "ROTATION",
      "SCALE",
      "_FEATURE_ID_0",
      "_FEATURE_ID_1",
      "_OTHER",
    ];
    var expectedSemantics = [
      InstanceAttributeSemantic.TRANSLATION,
      InstanceAttributeSemantic.ROTATION,
      InstanceAttributeSemantic.SCALE,
      InstanceAttributeSemantic.FEATURE_ID,
      InstanceAttributeSemantic.FEATURE_ID,
      undefined,
    ];

    var semanticsLength = gltfSemantics.length;
    for (var i = 0; i < semanticsLength; ++i) {
      expect(
        InstanceAttributeSemantic.fromGltfSemantic(
          gltfSemantics[i],
          expectedSemantics[i]
        )
      ).toBe(expectedSemantics[i]);
    }
  });

  it("fromGltfSemantic throws if gltfSemantic is undefined", function () {
    expect(function () {
      InstanceAttributeSemantic.fromGltfSemantic(undefined);
    }).toThrowDeveloperError();
  });
});
