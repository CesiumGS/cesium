import { clone } from "@cesium/core";
import { I3SGeometry, Resource } from "../../index.js";

describe("Scene/I3SGeometry", function () {
  function createGeometry(material) {
    const layer = {
      resource: new Resource("https://example.com/layers/0/"),
      _data: { materialDefinitions: [material] },
    };
    const parent = {
      _layer: layer,
      _dataProvider: {},
      _nodeIndex: 0,
      _data: {
        mesh: {
          geometry: { resource: 0 },
          material: { definition: 0, resource: 42 },
        },
      },
    };
    return new I3SGeometry(parent, "geometries/0");
  }

  function generateGltf(geometry) {
    return geometry._generateGltf(
      [0],
      [{ mesh: 0 }],
      [{ primitives: [{ material: 0 }] }],
      [],
      [],
      [],
      {},
      [],
    );
  }

  it("converts shared material colors once per geometry without modifying the input", function () {
    const material = {
      pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 1] },
      emissiveFactor: [0.5, 0.5, 0.5],
      alphaMode: "mask",
    };
    const original = clone(material, true);
    const first = generateGltf(createGeometry(material));
    const second = generateGltf(createGeometry(material));

    expect(material).toEqual(original);
    expect(second.materials).toEqual(first.materials);
    expect(
      first.materials[0].pbrMetallicRoughness.baseColorFactor[0],
    ).toEqualEpsilon(0.21404114048223255, 1e-12);
    expect(first.materials[0].emissiveFactor[0]).toEqualEpsilon(
      0.21404114048223255,
      1e-12,
    );
    expect(first.materials[0].alphaMode).toBe("MASK");
  });

  it("keeps shared texture definitions unchanged when remapping their index", function () {
    const material = {
      pbrMetallicRoughness: { baseColorTexture: { textureSetDefinitionId: 0 } },
    };
    const original = clone(material, true);
    const gltf = generateGltf(createGeometry(material));

    expect(material).toEqual(original);
    expect(gltf.materials[0].pbrMetallicRoughness.baseColorTexture.index).toBe(
      0,
    );
    expect(gltf.images[0].uri).toBe(
      "https://example.com/layers/0/nodes/42/textures/0",
    );
  });

  it("accepts frozen shared material definitions", function () {
    const material = Object.freeze({
      pbrMetallicRoughness: Object.freeze({
        baseColorFactor: Object.freeze([0.5, 0.5, 0.5, 1]),
      }),
      emissiveFactor: Object.freeze([0.5, 0.5, 0.5]),
      alphaMode: "mask",
    });
    expect(function () {
      generateGltf(createGeometry(material));
    }).not.toThrow();
  });
});
