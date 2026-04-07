import {
  estimateSpzMemoryBytes,
  getSpzInfoFromGltf,
} from "../../Source/Scene/GltfSpzLoader.js";

describe("Scene/GltfSpzLoader", function () {
  it("derives point count and spherical harmonics degree from glTF JSON", function () {
    const gltf = {
      accessors: [
        {
          count: 4913000,
        },
      ],
    };

    const primitive = {
      attributes: {
        POSITION: 0,
        _SH_DEGREE_1_COEF_0: 1,
        _SH_DEGREE_3_COEF_0: 2,
      },
    };

    expect(getSpzInfoFromGltf(gltf, primitive)).toEqual({
      numPoints: 4913000,
      shDegree: 3,
    });
  });

  it("returns undefined when glTF metadata needed for the estimate is missing", function () {
    const gltf = {
      accessors: [],
    };

    const primitive = {
      attributes: {},
    };

    expect(getSpzInfoFromGltf(gltf, primitive)).toBeUndefined();
  });

  it("estimates SPZ decode memory usage", function () {
    expect(estimateSpzMemoryBytes(4913000, 3)).toBe(2318936000);
  });
});
