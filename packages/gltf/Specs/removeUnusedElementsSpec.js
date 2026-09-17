"use strict";
const Cesium = require("cesium");
const { ForEach, removeUnusedElements } = require("@gltf-pipeline/core");

const WebGLConstants = Cesium.WebGLConstants;

const gltf = {
  nodes: [
    {
      name: "skin",
      skin: 0,
      mesh: 0,
      translation: [0.0, 0.0, 0.0],
    },
    {
      name: "used",
      mesh: 0,
      children: [2, 5],
    },
    {
      name: "unused",
    },
    {
      name: "nodeWithEmptyMesh",
      mesh: 1,
    },
    {
      name: "unusedParent",
      children: [2],
    },
    {
      name: "camera",
      camera: 0,
    },
    {
      name: "light",
      extensions: {
        KHR_lights_punctual: {
          light: 0,
        },
      },
    },
  ],
  buffers: [
    {
      name: "mesh",
      byteLength: 246,
      uri: "data0.bin",
    },
    {
      name: "other",
      byteLength: 80,
      uri: "data1.bin",
    },
    {
      name: "image01",
      byteLength: 1000,
      uri: "data2.bin",
    },
    {
      image: "image2",
      byteLength: 500,
      uri: "data3.bin",
    },
  ],
  bufferViews: [
    {
      name: "positions",
      buffer: 0,
      byteOffset: 0,
      byteLength: 36,
    },
    {
      name: "normals",
      buffer: 0,
      byteOffset: 36,
      byteLength: 36,
    },
    {
      name: "texcoords",
      buffer: 0,
      byteOffset: 72,
      byteLength: 24,
    },
    {
      name: "positions-target0",
      buffer: 0,
      byteOffset: 96,
      byteLength: 36,
    },
    {
      name: "normals-target0",
      buffer: 0,
      byteOffset: 132,
      byteLength: 36,
    },
    {
      name: "positions-target1",
      buffer: 0,
      byteOffset: 168,
      byteLength: 36,
    },
    {
      name: "normals-target1",
      buffer: 0,
      byteOffset: 204,
      byteLength: 36,
    },
    {
      name: "indices",
      buffer: 0,
      byteOffset: 240,
      byteLength: 6,
    },
    {
      name: "other",
      buffer: 1,
      byteOffset: 0,
      byteLength: 80,
    },
    {
      name: "image0",
      buffer: 2,
      byteOffset: 0,
      byteLength: 500,
    },
    {
      name: "image1",
      buffer: 2,
      byteOffset: 500,
      byteLength: 500,
    },
    {
      name: "image2",
      buffer: 3,
      byteOffset: 1000,
      byteLength: 500,
    },
  ],
  accessors: [
    {
      name: "positions",
      bufferView: 0,
      byteOffset: 0,
      componentType: WebGLConstants.FLOAT,
      count: 3,
      type: "VEC3",
      min: [-1.0, -1.0, -1.0],
      max: [1.0, 1.0, 1.0],
    },
    {
      name: "normals",
      bufferView: 1,
      byteOffset: 36,
      componentType: WebGLConstants.FLOAT,
      count: 3,
      type: "VEC3",
    },
    {
      name: "texcoords",
      bufferView: 2,
      byteOffset: 72,
      componentType: WebGLConstants.FLOAT,
      count: 3,
      type: "VEC2",
    },
    {
      name: "positions-target0",
      bufferView: 3,
      byteOffset: 96,
      componentType: WebGLConstants.FLOAT,
      count: 3,
      type: "VEC3",
      min: [-1.0, -1.0, -1.0],
      max: [1.0, 1.0, 1.0],
    },
    {
      name: "normals-target0",
      bufferView: 4,
      byteOffset: 132,
      componentType: WebGLConstants.FLOAT,
      count: 3,
      type: "VEC3",
    },
    {
      name: "positions-target1",
      bufferView: 5,
      byteOffset: 168,
      componentType: WebGLConstants.FLOAT,
      count: 3,
      type: "VEC3",
      min: [-1.0, -1.0, -1.0],
      max: [1.0, 1.0, 1.0],
    },
    {
      name: "normals-target1",
      bufferView: 6,
      byteOffset: 204,
      componentType: WebGLConstants.FLOAT,
      count: 3,
      type: "VEC3",
    },
    {
      name: "indices",
      bufferView: 7,
      byteOffset: 240,
      componentType: WebGLConstants.UNSIGNED_SHORT,
      count: 3,
      type: "SCALAR",
    },
    {
      name: "bone-matrix",
      bufferView: 8,
      byteOffset: 0,
      componentType: WebGLConstants.FLOAT,
      count: 1,
      type: "MAT4",
    },
    {
      name: "times",
      bufferView: 8,
      byteOffset: 64,
      componentType: WebGLConstants.FLOAT,
      count: 1,
      type: "SCALAR",
    },
    {
      name: "translations",
      bufferView: 8,
      byteOffset: 68,
      componentType: WebGLConstants.FLOAT,
      count: 1,
      type: "VEC3",
    },
  ],
  meshes: [
    {
      name: "mesh0",
      primitives: [
        {
          attributes: {
            POSITION: 0,
            NORMAL: 1,
            TEXCOORD_0: 2,
          },
          targets: [
            {
              POSITION: 3,
              NORMAL: 4,
            },
            {
              POSITION: 5,
              NORMAL: 6,
            },
          ],
          indices: 7,
          mode: WebGLConstants.TRIANGLES,
          material: 1,
        },
      ],
    },
    {
      name: "mesh1",
      primitives: [],
    },
  ],
  cameras: [
    {
      name: "cam",
      type: "perspective",
    },
  ],
  skins: [
    {
      inverseBindMatrices: 8,
      joints: [0],
    },
  ],
  animations: [
    {
      channels: [
        {
          sampler: 0,
          target: {
            node: 0,
            path: "translation",
          },
        },
      ],
      samplers: [
        {
          input: 9,
          output: 10,
        },
      ],
    },
  ],
  textures: [
    {
      name: "texture",
      sampler: 0,
      source: 1,
    },
    {
      name: "unusedTexture",
    },
  ],
  images: [
    {
      bufferView: 9,
      mimeType: "image/png",
    },
    {
      bufferView: 10,
      mimeType: "image/png",
    },
    {
      bufferView: 11,
      mimeType: "image/png",
    },
    {
      name: "image",
      bufferView: 12,
      mimeType: "image/png",
    },
  ],
  extensions: {
    KHR_lights_punctual: {
      lights: [
        {
          name: "sun",
          type: "directional",
        },
      ],
    },
  },
  samplers: [
    {
      name: "sampler",
      magFilter: 9729,
      minFilter: 9987,
      wrapS: 33648,
      wrapt: 33648,
    },
    {
      magFilter: 9729,
      minFilter: 9987,
      wrapS: 33648,
      wrapt: 33648,
    },
  ],
  materials: [
    {
      name: "unused",
    },
    {
      name: "used",
      pbrMetallicRoughness: {
        baseColorTexture: {
          index: 0,
        },
      },
    },
  ],
  scenes: [
    {
      nodes: [2, 3],
    },
  ],
};

describe("removeUnusedElements", () => {
  delete gltf.animations;
  delete gltf.skins;
  gltf.meshes[0].primitives[0].targets.splice(0, 1);
  gltf.images.splice(1, 2);
  removeUnusedElements(gltf);

  const remainingAccessorNames = [
    "positions",
    "normals",
    "texcoords",
    "positions-target1",
    "normals-target1",
    "indices",
  ];
  const remainingAcessorBufferViewIds = [0, 1, 2, 3, 4, 5];
  const remainingBufferViewNames = [
    "positions",
    "normals",
    "texcoords",
    "positions-target1",
    "normals-target1",
    "indices",
    "image0",
  ];
  const remainingBufferViewBufferIds = [0, 0, 0, 0, 0, 0, 1];

  const remaining = {
    nodes: ["skin", "used", "camera", "light"],
    cameras: ["cam"],
    meshes: ["mesh0"],
    buffers: ["mesh", "image01"],
    lights: ["sun"],
    materials: ["used"],
    textures: ["texture"],
    images: ["image"],
    samplers: ["sampler"],
  };

  it("correctly removes/keeps accessors", () => {
    expect(gltf.accessors.length).toBe(remainingAccessorNames.length);

    ForEach.accessor(gltf, (accessor, index) => {
      expect(accessor.name).toBe(remainingAccessorNames[index]);
      expect(accessor.bufferView).toBe(remainingAcessorBufferViewIds[index]);
    });
  });

  it("correctly removes/keeps bufferViews", () => {
    expect(gltf.bufferViews.length).toBe(remainingBufferViewNames.length);

    ForEach.bufferView(gltf, (bufferView, index) => {
      expect(bufferView.name).toBe(remainingBufferViewNames[index]);
      expect(bufferView.buffer).toBe(remainingBufferViewBufferIds[index]);
    });
  });

  [
    "materials",
    "nodes",
    "cameras",
    "meshes",
    "buffers",
    "textures",
    "images",
    "samplers",
  ].forEach((k) => {
    it(`correctly removes/keeps ${k}`, () => {
      expect(Object.keys(gltf)).toContain(k);
      expect(gltf[k].length).toBe(remaining[k].length);

      // Check that at least the remaining elements are present
      ForEach.topLevel(gltf, k, (element) => {
        expect(remaining[k]).toContain(element.name);
      });

      // Check that all the elements should actually remain
      remaining[k].forEach((name) => {
        expect(gltf[k].map((x) => x.name)).toContain(name);
      });
    });
  });

  it("correctly removes/keeps lights", () => {
    expect(Object.keys(gltf)).toContain("extensions");
    expect(Object.keys(gltf.extensions)).toContain("KHR_lights_punctual");
    expect(Object.keys(gltf.extensions.KHR_lights_punctual)).toContain(
      "lights",
    );

    expect(gltf.extensions.KHR_lights_punctual.lights.length).toBe(
      remaining.lights.length,
    );

    gltf.extensions.KHR_lights_punctual.lights.forEach((element, index) => {
      expect(remaining["lights"]).toContain(element.name);
    });
  });

  it("keeps ancestor nodes of used nodes", () => {
    const gltf = {
      nodes: [
        {
          name: "skeleton-root",
          skin: 0,
          mesh: 0,
          translation: [0.0, 0.0, 0.0],
        },
        {
          name: "joint-parent",
          translation: [0.0, 0.0, 0.0],
          children: [2],
        },
        {
          name: "joint",
          translation: [0.0, 0.0, 0.0],
        },
        {
          name: "unused",
        },
      ],
      buffers: [
        {
          name: "mesh",
          byteLength: 246,
          uri: "data0.bin",
        },
        {
          name: "other",
          byteLength: 80,
          uri: "data1.bin",
        },
      ],
      bufferViews: [
        {
          name: "positions",
          buffer: 0,
          byteOffset: 0,
          byteLength: 36,
        },
        {
          name: "indices",
          buffer: 0,
          byteOffset: 240,
          byteLength: 6,
        },
      ],
      accessors: [
        {
          name: "positions",
          bufferView: 0,
          byteOffset: 0,
          componentType: WebGLConstants.FLOAT,
          count: 3,
          type: "VEC3",
          min: [-1.0, -1.0, -1.0],
          max: [1.0, 1.0, 1.0],
        },
        {
          name: "indices",
          bufferView: 7,
          byteOffset: 240,
          componentType: WebGLConstants.UNSIGNED_SHORT,
          count: 3,
          type: "SCALAR",
        },
      ],
      meshes: [
        {
          name: "mesh0",
          primitives: [
            {
              attributes: {
                POSITION: 0,
              },
              indices: 1,
              mode: WebGLConstants.TRIANGLES,
            },
          ],
        },
      ],
      skins: [
        {
          skeleton: 0,
          joints: [0, 2],
        },
      ],
      scenes: [
        {
          nodes: [0],
        },
      ],
    };

    removeUnusedElements(gltf);

    expect(gltf.nodes.length).toEqual(3);
  });

  it("does not decrement a meshopt buffer index below the removed buffer", () => {
    const gltf = {
      buffers: [
        { name: "compressed", byteLength: 100 },
        { name: "fallback", byteLength: 100 },
        { name: "unused", byteLength: 100 },
      ],
      bufferViews: [
        {
          name: "meshopt",
          buffer: 1,
          byteOffset: 0,
          byteLength: 100,
          extensions: {
            KHR_meshopt_compression: {
              buffer: 0,
              byteOffset: 0,
              byteLength: 50,
              byteStride: 4,
              mode: "ATTRIBUTES",
              count: 25,
            },
          },
        },
      ],
      extensionsUsed: ["KHR_meshopt_compression"],
    };

    removeUnusedElements(gltf, ["buffer"]);

    // The unused buffer (index 2) is removed. The compressed buffer (index 0)
    // is below the removed index, so its reference must not be decremented.
    expect(gltf.buffers.length).toBe(2);
    expect(gltf.bufferViews[0].extensions.KHR_meshopt_compression.buffer).toBe(
      0,
    );
    expect(gltf.bufferViews[0].buffer).toBe(1);
  });
});

describe("removes unused materials, textures, images, samplers", () => {
  it("removes unused materials", () => {
    const gltf = {
      materials: [
        {
          name: "0",
        },
        {
          name: "1",
        },
        {
          name: "2",
        },
        {
          name: "3",
        },
        {
          name: "4",
        },
        {
          name: "5",
        },
      ],
      meshes: [
        {
          primitives: [
            {
              material: 0,
            },
          ],
        },
        {
          primitives: [
            {
              material: 2,
            },
            {
              material: 3,
            },
          ],
        },
      ],
    };

    removeUnusedElements(gltf, ["material", "texture", "sampler", "image"]);

    expect(gltf.materials.length).toEqual(3);
    expect(gltf.materials[0].name).toEqual("0");
    expect(gltf.materials[1].name).toEqual("2");
    expect(gltf.materials[2].name).toEqual("3");
    expect(gltf.meshes[0].primitives[0].material).toEqual(0);
    expect(gltf.meshes[1].primitives[0].material).toEqual(1);
    expect(gltf.meshes[1].primitives[1].material).toEqual(2);
  });

  it("removes unused textures", () => {
    const gltf = {
      textures: [
        {
          name: "0",
        },
        {
          name: "1",
        },
        {
          name: "2",
        },
        {
          name: "3",
        },
        {
          name: "4",
        },
      ],
      materials: [
        {
          occlusionTexture: {
            index: 0,
          },
          normalTexture: {
            index: 2,
          },
        },
        {
          extensions: {
            KHR_techniques_webgl: {
              values: {
                diffuse: {
                  index: 3,
                },
              },
            },
          },
        },
      ],
      meshes: [
        {
          primitives: [
            {
              material: 0,
            },
            {
              material: 1,
            },
          ],
        },
      ],
    };

    removeUnusedElements(gltf, ["material", "texture", "sampler", "image"]);

    expect(gltf.textures.length).toEqual(3);
    expect(gltf.textures[0].name).toEqual("0");
    expect(gltf.textures[1].name).toEqual("2");
    expect(gltf.textures[2].name).toEqual("3");
    expect(gltf.materials[0].occlusionTexture.index).toEqual(0);
    expect(gltf.materials[0].normalTexture.index).toEqual(1);
    expect(
      gltf.materials[1].extensions.KHR_techniques_webgl.values.diffuse.index,
    ).toEqual(2);
  });

  it("removes unused images", () => {
    const gltf = {
      images: [
        {
          name: "0",
        },
        {
          name: "1",
        },
        {
          name: "2",
        },
        {
          name: "3",
        },
        {
          name: "4",
        },
        {
          name: "5",
        },
        {
          name: "6",
        },
      ],
      textures: [
        {
          source: 1,
        },
        {
          extensions: {
            EXT_texture_webp: {
              source: 5,
            },
          },
        },
        {
          extensions: {
            KHR_texture_basisu: {
              source: 6,
            },
          },
        },
      ],
      materials: [
        {
          occlusionTexture: {
            index: 0,
          },
          normalTexture: {
            index: 1,
          },
          emissiveTexture: {
            index: 2,
          },
        },
      ],
      meshes: [
        {
          primitives: [
            {
              material: 0,
            },
          ],
        },
      ],
    };

    removeUnusedElements(gltf, ["material", "texture", "sampler", "image"]);

    expect(gltf.images.length).toEqual(3);
    expect(gltf.images[0].name).toEqual("1");
    expect(gltf.images[1].name).toEqual("5");
    expect(gltf.images[2].name).toEqual("6");
    expect(gltf.textures[0].source).toEqual(0);
    expect(gltf.textures[1].extensions.EXT_texture_webp.source).toEqual(1);
    expect(gltf.textures[2].extensions.KHR_texture_basisu.source).toEqual(2);
  });

  it("removes unused samplers", () => {
    const gltf = {
      samplers: [
        {
          name: "0",
        },
        {
          name: "1",
        },
        {
          name: "2",
        },
        {
          name: "3",
        },
        {
          name: "4",
        },
      ],
      textures: [
        {
          sampler: 2,
        },
        {
          sampler: 3,
        },
        {
          // no sampler defined
        },
      ],
      materials: [
        {
          occlusionTexture: {
            index: 0,
          },
          normalTexture: {
            index: 1,
          },
          emissiveTexture: {
            index: 2,
          },
        },
      ],
      meshes: [
        {
          primitives: [
            {
              material: 0,
            },
          ],
        },
      ],
    };

    removeUnusedElements(gltf, ["material", "texture", "sampler", "image"]);

    expect(gltf.samplers.length).toEqual(2);
    expect(gltf.samplers[0].name).toEqual("2");
    expect(gltf.samplers[1].name).toEqual("3");
    expect(gltf.textures[0].sampler).toEqual(0);
    expect(gltf.textures[1].sampler).toEqual(1);
    expect(gltf.textures[2].sampler).toBeUndefined();
  });

  it("removed elements propagate", () => {
    const gltf = {
      samplers: [
        {
          name: "sampler0",
        },
        {
          name: "sampler1",
        },
      ],
      images: [
        {
          name: "image0",
        },
        {
          name: "image1",
        },
      ],
      textures: [
        {
          name: "texture0",
          source: 0,
          sampler: 0,
        },
        {
          name: "texture1",
          source: 1,
          sampler: 1,
        },
      ],
      materials: [
        {
          name: "material0",
          normalTexture: {
            index: 0,
          },
        },
        {
          name: "material1",
          normalTexture: {
            index: 1,
          },
        },
      ],
      meshes: [
        {
          primitives: [
            {
              material: 1,
            },
          ],
        },
      ],
    };

    removeUnusedElements(gltf, ["material", "texture", "sampler", "image"]);

    expect(gltf.materials.length).toEqual(1);
    expect(gltf.textures.length).toEqual(1);
    expect(gltf.images.length).toEqual(1);
    expect(gltf.samplers.length).toEqual(1);

    expect(gltf.materials[0].name).toEqual("material1");
    expect(gltf.textures[0].name).toEqual("texture1");
    expect(gltf.images[0].name).toEqual("image1");
    expect(gltf.samplers[0].name).toEqual("sampler1");

    expect(gltf.materials[0].normalTexture.index).toEqual(0);
    expect(gltf.textures[0].source).toEqual(0);
    expect(gltf.textures[0].sampler).toEqual(0);
  });

  it("does not remove EXT_mesh_gpu_instancing accessors", () => {
    const gltf = {
      accessors: [
        {
          name: "0",
        },
        {
          name: "T",
        },
        {
          name: "R",
        },
        {
          name: "S",
        },
        {
          name: "1",
        },
      ],
      nodes: [
        {
          extensions: {
            EXT_mesh_gpu_instancing: {
              attributes: {
                TRANSLATION: 1,
                ROTATION: 2,
                SCALE: 3,
              },
            },
          },
        },
      ],
      extensionsUsed: ["EXT_mesh_gpu_instancing"],
    };

    removeUnusedElements(gltf, ["accessor"]);

    expect(gltf.accessors.length).toEqual(3);
    expect(gltf.accessors[0].name).toEqual("T");
    expect(gltf.accessors[1].name).toEqual("R");
    expect(gltf.accessors[2].name).toEqual("S");
  });

  it("does not remove CESIUM_primitive_outline accessors", () => {
    const gltf = {
      accessors: [
        {
          name: "unused",
        },
        {
          name: "position",
        },
        {
          name: "outlineIndices",
        },
        {
          name: "normal",
        },
        {
          name: "indices",
        },
        {
          name: "unused",
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 1,
                NORMAL: 3,
              },
              indices: 4,
              extensions: {
                CESIUM_primitive_outline: {
                  indices: 2,
                },
              },
            },
          ],
        },
      ],
      nodes: [
        {
          mesh: 0,
        },
      ],
      extensionsUsed: ["CESIUM_primitive_outline"],
    };

    removeUnusedElements(gltf, ["accessor"]);

    expect(gltf.accessors.length).toEqual(4);
    expect(gltf.accessors[0].name).toEqual("position");
    expect(gltf.accessors[1].name).toEqual("outlineIndices");
    expect(gltf.accessors[2].name).toEqual("normal");
    expect(gltf.accessors[3].name).toEqual("indices");

    expect(
      gltf.meshes[0].primitives[0].extensions.CESIUM_primitive_outline.indices,
    ).toEqual(1);
  });

  it("does not remove EXT_feature_metadata buffer views and textures", () => {
    const gltf = {
      asset: {
        version: "2.0",
      },
      extensionsUsed: ["EXT_feature_metadata"],
      extensions: {
        EXT_feature_metadata: {
          schema: {
            classes: {
              vegetation: {
                properties: {
                  vegetationDensity: {
                    type: "UINT8",
                    normalized: true,
                  },
                },
              },
              landCover: {
                properties: {
                  name: {
                    type: "STRING",
                  },
                  color: {
                    type: "ARRAY",
                    componentType: "UINT8",
                  },
                },
              },
            },
          },
          featureTables: {
            landCoverTable: {
              class: "landCover",
              count: 256,
              properties: {
                name: {
                  bufferView: 4,
                  stringOffsetBufferView: 5,
                },
                color: {
                  bufferView: 6,
                  arrayOffsetBufferView: 7,
                },
              },
            },
          },
          featureTextures: {
            vegetationTexture: {
              class: "vegetation",
              properties: {
                vegetationDensity: {
                  texture: {
                    index: 1,
                    texCoord: 0,
                  },
                  channels: "r",
                },
              },
            },
          },
        },
      },
      scene: 0,
      scenes: [
        {
          nodes: [0],
        },
      ],
      nodes: [
        {
          mesh: 0,
        },
      ],
      materials: [
        {
          doubleSided: true,
          name: "Photogrammetry",
          pbrMetallicRoughness: {
            baseColorTexture: {
              index: 0,
              texCoord: 1,
            },
            metallicFactor: 0,
            roughnessFactor: 0.5,
          },
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                TEXCOORD_0: 1,
                TEXCOORD_1: 2,
              },
              indices: 3,
              material: 0,
              extensions: {
                EXT_feature_metadata: {
                  featureIdTextures: [
                    {
                      featureTable: "landCoverTable",
                      featureIds: {
                        texture: {
                          texCoord: 0,
                          index: 2,
                        },
                        channels: "r",
                      },
                    },
                  ],
                  featureTextures: ["vegetationTexture"],
                },
              },
            },
          ],
        },
      ],
      textures: [
        {
          name: "Photogrammetry Texture",
          source: 0,
        },
        {
          name: "Vegetation Texture",
          source: 1,
        },
        {
          name: "Land Cover Texture",
          source: 2,
        },
      ],
      images: [
        {
          name: "Photogrammetry",
          uri: "photogrammetry.jpg",
        },
        {
          name: "Vegetation",
          uri: "vegetation.jpg",
        },
        {
          name: "Land Cover",
          uri: "land-cover.png",
        },
      ],
      accessors: [
        {
          name: "Positions",
          bufferView: 0,
          componentType: 5126,
          count: 1830,
          max: [50.01457214355469, 19.920944213867188, 50.0020866394043],
          min: [-50.00897979736328, -16.473196029663086, -50.006893157958984],
          type: "VEC3",
        },
        {
          name: "Ortho UVs",
          bufferView: 1,
          componentType: 5126,
          count: 1830,
          type: "VEC2",
        },
        {
          name: "Photogrammetry UVs",
          bufferView: 2,
          componentType: 5126,
          count: 1830,
          type: "VEC2",
        },
        {
          name: "Indices",
          bufferView: 3,
          componentType: 5123,
          count: 5964,
          type: "SCALAR",
        },
      ],
      bufferViews: [
        {
          name: "Positions",
          buffer: 0,
          byteLength: 21960,
          byteOffset: 0,
        },
        {
          name: "Ortho UVs",
          buffer: 0,
          byteLength: 14640,
          byteOffset: 21960,
        },
        {
          name: "Photogrammetry UVs",
          buffer: 0,
          byteLength: 14640,
          byteOffset: 36600,
        },
        {
          name: "Indices",
          buffer: 0,
          byteLength: 11928,
          byteOffset: 51240,
        },
        {
          name: "Land Cover Name",
          buffer: 1,
          byteLength: 1546,
          byteOffset: 768,
        },
        {
          name: "Land Cover String Offsets",
          buffer: 1,
          byteLength: 1028,
          byteOffset: 2320,
        },
        {
          name: "Land Cover Color",
          buffer: 1,
          byteLength: 768,
          byteOffset: 0,
        },
        {
          name: "Land Cover Color Offsets",
          buffer: 1,
          byteLength: 1028,
          byteOffset: 3352,
        },
      ],
      buffers: [
        {
          name: "Geometry Buffer",
          byteLength: 63168,
          uri: "microcosm.bin",
        },
        {
          name: "Metadata Buffer",
          byteLength: 4384,
          uri: "microcosm-metadata.bin",
        },
      ],
    };

    // Delete parts of the glTF that are not related to EXT_feature_metadata
    delete gltf.meshes[0].primitives[0].attributes.POSITION;
    delete gltf.materials[0].pbrMetallicRoughness.baseColorTexture;

    removeUnusedElements(gltf, ["accessor", "bufferView", "texture", "image"]);

    expect(gltf.bufferViews.length).toBe(7);
    expect(gltf.textures.length).toBe(2);
    expect(gltf.images.length).toBe(2);
  });

  it("does not remove EXT_mesh_features and EXT_structural_metadata buffer views and textures", () => {
    const gltf = {
      asset: {
        version: "2.0",
      },
      extensionsUsed: ["EXT_mesh_features", "EXT_structural_metadata"],
      extensions: {
        EXT_structural_metadata: {
          schema: {
            classes: {
              vegetation: {
                properties: {
                  vegetationDensity: {
                    type: "SCALAR",
                    componentType: "UINT8",
                    normalized: true,
                  },
                },
              },
              landCover: {
                properties: {
                  name: {
                    type: "STRING",
                  },
                  color: {
                    type: "SCALAR",
                    componentType: "UINT8",
                    array: true,
                  },
                },
              },
            },
          },
          propertyTables: [
            {
              class: "landCover",
              count: 256,
              properties: {
                name: {
                  values: 4,
                  stringOffsets: 5,
                },
                color: {
                  values: 6,
                  arrayOffsets: 7,
                },
              },
            },
          ],
          propertyTextures: [
            {
              class: "vegetation",
              properties: {
                vegetationDensity: {
                  index: 1,
                  texCoord: 0,
                  channels: [0],
                },
              },
            },
          ],
        },
      },
      scene: 0,
      scenes: [
        {
          nodes: [0],
        },
      ],
      nodes: [
        {
          mesh: 0,
        },
      ],
      materials: [
        {
          doubleSided: true,
          name: "Photogrammetry",
          pbrMetallicRoughness: {
            baseColorTexture: {
              index: 0,
              texCoord: 1,
            },
            metallicFactor: 0,
            roughnessFactor: 0.5,
          },
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                TEXCOORD_0: 1,
                TEXCOORD_1: 2,
              },
              indices: 3,
              material: 0,
              extensions: {
                EXT_mesh_features: {
                  featureIds: [
                    {
                      featureCount: 10,
                      texture: {
                        index: 2,
                        texCoord: 0,
                        channels: [0],
                      },
                      propertyTable: 0,
                    },
                  ],
                },
                EXT_structural_metadata: {
                  propertyTextures: [0],
                },
              },
            },
          ],
        },
      ],
      textures: [
        {
          name: "Photogrammetry Texture",
          source: 0,
        },
        {
          name: "Vegetation Texture",
          source: 1,
        },
        {
          name: "Land Cover Texture",
          source: 2,
        },
      ],
      images: [
        {
          name: "Photogrammetry",
          uri: "photogrammetry.jpg",
        },
        {
          name: "Vegetation",
          uri: "vegetation.jpg",
        },
        {
          name: "Land Cover",
          uri: "land-cover.png",
        },
      ],
      accessors: [
        {
          name: "Positions",
          bufferView: 0,
          componentType: 5126,
          count: 1830,
          max: [50.01457214355469, 19.920944213867188, 50.0020866394043],
          min: [-50.00897979736328, -16.473196029663086, -50.006893157958984],
          type: "VEC3",
        },
        {
          name: "Ortho UVs",
          bufferView: 1,
          componentType: 5126,
          count: 1830,
          type: "VEC2",
        },
        {
          name: "Photogrammetry UVs",
          bufferView: 2,
          componentType: 5126,
          count: 1830,
          type: "VEC2",
        },
        {
          name: "Indices",
          bufferView: 3,
          componentType: 5123,
          count: 5964,
          type: "SCALAR",
        },
      ],
      bufferViews: [
        {
          name: "Positions",
          buffer: 0,
          byteLength: 21960,
          byteOffset: 0,
        },
        {
          name: "Ortho UVs",
          buffer: 0,
          byteLength: 14640,
          byteOffset: 21960,
        },
        {
          name: "Photogrammetry UVs",
          buffer: 0,
          byteLength: 14640,
          byteOffset: 36600,
        },
        {
          name: "Indices",
          buffer: 0,
          byteLength: 11928,
          byteOffset: 51240,
        },
        {
          name: "Land Cover Name",
          buffer: 1,
          byteLength: 1546,
          byteOffset: 768,
        },
        {
          name: "Land Cover String Offsets",
          buffer: 1,
          byteLength: 1028,
          byteOffset: 2320,
        },
        {
          name: "Land Cover Color",
          buffer: 1,
          byteLength: 768,
          byteOffset: 0,
        },
        {
          name: "Land Cover Color Offsets",
          buffer: 1,
          byteLength: 1028,
          byteOffset: 3352,
        },
      ],
      buffers: [
        {
          name: "Geometry Buffer",
          byteLength: 63168,
          uri: "microcosm.bin",
        },
        {
          name: "Metadata Buffer",
          byteLength: 4384,
          uri: "microcosm-metadata.bin",
        },
      ],
    };

    // Delete parts of the glTF that are not related to EXT_mesh_features and EXT_structural_metadata
    delete gltf.meshes[0].primitives[0].attributes.POSITION;
    delete gltf.materials[0].pbrMetallicRoughness.baseColorTexture;

    removeUnusedElements(gltf, ["accessor", "bufferView", "texture", "image"]);

    expect(gltf.bufferViews.length).toBe(7);
    expect(gltf.textures.length).toBe(2);
    expect(gltf.images.length).toBe(2);
  });

  it("keeps KHR_materials_transmission.transmissionTexture", function () {
    const gltf = {
      materials: [
        {
          extensions: {
            KHR_materials_transmission: {
              transmissionTexture: { index: 1 },
            },
          },
        },
      ],
      textures: [
        { source: 0, sampler: 0 },
        { source: 1, sampler: 0 },
      ],
      images: [{ name: "img0" }, { name: "img1" }],
      samplers: [{}],
      meshes: [
        {
          primitives: [
            {
              material: 0,
            },
          ],
        },
      ],
    };

    const origTransmissionImageName = gltf.images[gltf.textures[1].source].name;

    removeUnusedElements(gltf, ["texture", "sampler", "image"]);

    expect(gltf.textures.length).toBe(1);

    const newIdx =
      gltf.materials[0].extensions.KHR_materials_transmission
        .transmissionTexture.index;
    expect(gltf.images[gltf.textures[newIdx].source].name).toBe(
      origTransmissionImageName,
    );
  });

  it("keeps pbr baseColor and KHR_materials_transmission textures", function () {
    const gltf = {
      materials: [
        {
          pbrMetallicRoughness: {
            baseColorTexture: { index: 3 },
          },
          extensions: {
            KHR_materials_transmission: {
              transmissionTexture: { index: 2 },
            },
          },
        },
      ],
      textures: [
        { source: 0, sampler: 0 },
        { source: 1, sampler: 0 },
        { source: 2, sampler: 0 },
        { source: 3, sampler: 0 },
      ],
      images: [
        { name: "img0" },
        { name: "img1" },
        { name: "img2" },
        { name: "img3" },
      ],
      samplers: [{}],
      meshes: [
        {
          primitives: [
            {
              material: 0,
            },
          ],
        },
      ],
    };

    const origTransmissionImageName = gltf.images[gltf.textures[2].source].name;
    const origBaseColorImageName = gltf.images[gltf.textures[3].source].name;

    removeUnusedElements(gltf, ["texture", "sampler", "image"]);

    expect(gltf.textures.length).toBe(2);

    const mat = gltf.materials[0];
    const newTransmissionIdx =
      mat.extensions.KHR_materials_transmission.transmissionTexture.index;
    const newBaseColorIdx = mat.pbrMetallicRoughness.baseColorTexture.index;

    expect(gltf.images[gltf.textures[newTransmissionIdx].source].name).toBe(
      origTransmissionImageName,
    );
    expect(gltf.images[gltf.textures[newBaseColorIdx].source].name).toBe(
      origBaseColorImageName,
    );

    expect(newTransmissionIdx).not.toBe(newBaseColorIdx);
  });
});
