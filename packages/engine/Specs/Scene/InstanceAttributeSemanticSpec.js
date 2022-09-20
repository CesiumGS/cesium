import { InstanceAttributeSemantic } from "../../index.js";

describe("Scene/InstanceAttributeSemantic", function () {
  it("fromGltfSemantic", function () {
    const gltfSemantics = [
      "TRANSLATION",
      "ROTATION",
      "SCALE",
      "_FEATURE_ID_0",
      "_FEATURE_ID_1",
      "_OTHER",
    ];
    const expectedSemantics = [
      InstanceAttributeSemantic.TRANSLATION,
      InstanceAttributeSemantic.ROTATION,
      InstanceAttributeSemantic.SCALE,
      InstanceAttributeSemantic.FEATURE_ID,
      InstanceAttributeSemantic.FEATURE_ID,
      undefined,
    ];

    const semanticsLength = gltfSemantics.length;
    for (let i = 0; i < semanticsLength; ++i) {
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
