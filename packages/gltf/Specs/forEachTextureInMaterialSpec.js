import { forEachTextureInMaterial } from "../index.js";

describe("forEachTextureInMaterial", function () {
  it("throws without material", function () {
    expect(function () {
      forEachTextureInMaterial(undefined, function () {});
    }).toThrowDeveloperError();
  });

  it("throws without handler", function () {
    expect(function () {
      forEachTextureInMaterial({}, undefined);
    }).toThrowDeveloperError();
  });

  it("does nothing for a material with no textures", function () {
    const material = {};
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([]);
  });

  it("iterates over pbrMetallicRoughness textures", function () {
    const baseColorTexture = { index: 0 };
    const metallicRoughnessTexture = { index: 1 };
    const material = {
      pbrMetallicRoughness: {
        baseColorTexture: baseColorTexture,
        metallicRoughnessTexture: metallicRoughnessTexture,
      },
    };
    const visited = [];
    forEachTextureInMaterial(material, function (index, textureInfo) {
      visited.push({ index: index, textureInfo: textureInfo });
    });
    expect(visited).toEqual([
      { index: 0, textureInfo: baseColorTexture },
      { index: 1, textureInfo: metallicRoughnessTexture },
    ]);
  });

  it("iterates over KHR_materials_pbrSpecularGlossiness textures", function () {
    const material = {
      extensions: {
        KHR_materials_pbrSpecularGlossiness: {
          diffuseTexture: { index: 0 },
          specularGlossinessTexture: { index: 1 },
        },
      },
    };
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([0, 1]);
  });

  it("iterates over KHR_materials_specular textures", function () {
    const material = {
      extensions: {
        KHR_materials_specular: {
          specularTexture: { index: 0 },
          specularColorTexture: { index: 1 },
        },
      },
    };
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([0, 1]);
  });

  it("iterates over KHR_materials_transmission texture", function () {
    const material = {
      extensions: {
        KHR_materials_transmission: {
          transmissionTexture: { index: 0 },
        },
      },
    };
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([0]);
  });

  it("iterates over KHR_materials_common texture values", function () {
    const material = {
      extensions: {
        KHR_materials_common: {
          values: {
            diffuse: { index: 0 },
            ambient: { index: 1 },
            emission: { index: 2 },
            specular: { index: 3 },
          },
        },
      },
    };
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([0, 1, 2, 3]);
  });

  it("ignores non-texture KHR_materials_common values", function () {
    const material = {
      extensions: {
        KHR_materials_common: {
          values: {
            diffuse: [1.0, 0.0, 0.0, 1.0],
          },
        },
      },
    };
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([]);
  });

  it("iterates over KHR_techniques_webgl material values that are textures", function () {
    const material = {
      extensions: {
        KHR_techniques_webgl: {
          values: {
            u_diffuse: { index: 2 },
            u_shininess: 256,
          },
        },
      },
    };
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([2]);
  });

  it("iterates over top-level textures", function () {
    const material = {
      emissiveTexture: { index: 0 },
      normalTexture: { index: 1 },
      occlusionTexture: { index: 2 },
    };
    const indices = [];
    forEachTextureInMaterial(material, function (index) {
      indices.push(index);
    });
    expect(indices).toEqual([0, 1, 2]);
  });

  it("stops iterating and returns a value when the handler returns one", function () {
    const metallicRoughnessTexture = { index: 1 };
    const material = {
      pbrMetallicRoughness: {
        baseColorTexture: { index: 0 },
        metallicRoughnessTexture: metallicRoughnessTexture,
      },
      emissiveTexture: { index: 2 },
    };
    const visited = [];
    const returnValue = forEachTextureInMaterial(
      material,
      function (index, textureInfo) {
        visited.push(index);
        if (index === 1) {
          return textureInfo;
        }
      },
    );
    expect(visited).toEqual([0, 1]);
    expect(returnValue).toBe(metallicRoughnessTexture);
  });
});
