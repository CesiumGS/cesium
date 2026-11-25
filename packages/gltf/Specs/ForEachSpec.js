import { WebGLConstants } from "@cesium/core";
import ForEach from "../Source/ForEach.js";

describe("ForEach", function () {
  const gltfAccessors = {
    accessors: [
      {
        componentType: WebGLConstants.UNSIGNED_SHORT,
        count: 3,
        type: "SCALAR",
        bufferView: 0,
      },
      {
        componentType: WebGLConstants.UNSIGNED_SHORT,
        count: 3,
        type: "SCALAR",
        bufferView: 1,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 2,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 3,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 4,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 5,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 6,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 7,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 8,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 9,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 10,
      },
      {
        componentType: WebGLConstants.FLOAT,
        count: 3,
        type: "VEC3",
        bufferView: 11,
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 2,
              NORMAL: 3,
            },
            indices: 0,
            targets: [
              {
                POSITION: 4,
                NORMAL: 5,
              },
              {
                POSITION: 6,
                NORMAL: 7,
              },
            ],
          },
        ],
      },
      {
        primitives: [
          {
            attributes: {
              POSITION: 8,
              NORMAL: 9,
            },
            indices: 1,
            targets: [
              {
                POSITION: 10,
                NORMAL: 11,
              },
            ],
          },
        ],
      },
    ],
  };

  it("loops over accessors", function () {
    ForEach.accessor(gltfAccessors, (accessor, index) => {
      expect(accessor.bufferView).toBe(index);
    });

    const returnValue = ForEach.accessor(gltfAccessors, (accessor, index) => {
      if (index === 1) {
        return accessor;
      }
    });

    expect(returnValue).toBe(gltfAccessors.accessors[1]);
  });

  it("loops over accessor with semantic", function () {
    let positionAccessorLength = 0;
    const returnValue = ForEach.accessorWithSemantic(
      gltfAccessors,
      "POSITION",
      (accessorId) => {
        expect(gltfAccessors.accessors[accessorId].bufferView).toBe(accessorId);
        positionAccessorLength++;

        if (positionAccessorLength === 5) {
          return accessorId;
        }
      },
    );
    expect(positionAccessorLength).toBe(5);
    expect(returnValue).toBe(10);
  });

  it("loops over accessors containing vertex data", function () {
    let vertexAccessorsLength = 0;
    const returnValue = ForEach.accessorContainingVertexAttributeData(
      gltfAccessors,
      (accessorId) => {
        expect(gltfAccessors.accessors[accessorId].bufferView).toBe(accessorId);
        vertexAccessorsLength++;

        if (vertexAccessorsLength === 10) {
          return accessorId;
        }
      },
    );
    expect(vertexAccessorsLength).toBe(10);
    expect(returnValue).toBe(11);
  });

  it("loops over accessors containing index data", function () {
    let indicesAccessorsLength = 0;
    const returnValue = ForEach.accessorContainingIndexData(
      gltfAccessors,
      (accessorId) => {
        expect(gltfAccessors.accessors[accessorId].bufferView).toBe(accessorId);
        indicesAccessorsLength++;

        if (indicesAccessorsLength === 2) {
          return accessorId;
        }
      },
    );
    expect(indicesAccessorsLength).toBe(2);
    expect(returnValue).toBe(1);
  });

  const gltfAnimations = {
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
          {
            sampler: 1,
            target: {
              node: 0,
              path: "translation",
            },
          },
        ],
        samplers: [
          {
            input: 0,
            output: 2,
          },
          {
            input: 1,
            output: 3,
          },
        ],
      },
      {
        channels: [
          {
            sampler: 0,
            target: {
              node: 1,
              path: "translation",
            },
          },
        ],
        samplers: [
          {
            input: 4,
            output: 5,
          },
        ],
      },
    ],
  };

  it("loops over animations", function () {
    const returnValue = ForEach.animation(
      gltfAnimations,
      (animation, index) => {
        expect(animation.channels[0].target.node).toBe(index);

        if (index === 1) {
          return animation;
        }
      },
    );

    expect(returnValue).toBe(gltfAnimations.animations[1]);
  });

  it("loops over animation channel", function () {
    const returnValue = ForEach.animationChannel(
      gltfAnimations.animations[0],
      (channel, index) => {
        expect(channel.sampler).toBe(index);

        if (index === 1) {
          return channel;
        }
      },
    );

    expect(returnValue).toBe(gltfAnimations.animations[0].channels[1]);
  });

  it("loops over animation samplers", function () {
    const returnValue = ForEach.animationSampler(
      gltfAnimations.animations[0],
      (sampler, index) => {
        expect(sampler.input).toBe(index);

        if (index === 1) {
          return sampler;
        }
      },
    );

    expect(returnValue).toBe(gltfAnimations.animations[0].samplers[1]);
  });

  it("loops over buffers", function () {
    const gltf = {
      buffers: [
        {
          uri: "0.bin",
          byteLength: 10,
        },
        {
          uri: "1.bin",
          byteLength: 10,
        },
      ],
    };
    const returnValue = ForEach.buffer(gltf, (buffer, index) => {
      expect(buffer.uri).toBe(`${index}.bin`);
      if (index === 1) {
        return buffer;
      }
    });
    expect(returnValue).toBe(gltf.buffers[1]);
  });

  it("loops over buffers (gltf 1.0)", function () {
    const gltf = {
      buffers: {
        buffer0: {
          uri: "buffer0.bin",
        },
        buffer1: {
          uri: "buffer1.bin",
        },
      },
    };
    const returnValue = ForEach.buffer(gltf, (buffer, name) => {
      expect(buffer.uri).toBe(`${name}.bin`);
      if (name === "1.bin") {
        return buffer;
      }
    });
    expect(returnValue).toBe(gltf.buffers[1]);
  });

  it("loops over buffer views", function () {
    const gltf = {
      bufferViews: [
        {
          buffer: 0,
          byteLength: 10,
        },
        {
          buffer: 1,
          byteLength: 10,
        },
      ],
    };
    const returnValue = ForEach.bufferView(gltf, (bufferView, index) => {
      expect(bufferView.buffer).toBe(index);
      if (index === 1) {
        return bufferView;
      }
    });
    expect(returnValue).toBe(gltf.bufferViews[1]);
  });

  it("loops over cameras", function () {
    const gltf = {
      cameras: [
        {
          perspective: {
            yfov: 0.0,
            znear: 0.0,
          },
        },
        {
          perspective: {
            yfov: 1.0,
            znear: 1.0,
          },
        },
      ],
    };
    const returnValue = ForEach.camera(gltf, (camera, index) => {
      expect(camera.perspective.yfov).toBe(index);
      expect(camera.perspective.znear).toBe(index);
      if (index === 1) {
        return camera;
      }
    });
    expect(returnValue).toBe(gltf.cameras[1]);
  });

  it("loops over images", function () {
    const gltf = {
      images: [
        {
          bufferView: 0,
        },
        {
          bufferView: 1,
        },
      ],
    };
    const returnValue = ForEach.image(gltf, (image, index) => {
      expect(image.bufferView).toBe(index);
      if (index === 1) {
        return image;
      }
    });
    expect(returnValue).toBe(gltf.images[1]);
  });

  it("loops over images (gltf 1.0)", function () {
    const gltf = {
      images: {
        image0: {
          uri: "image0.png",
        },
        image1: {
          uri: "image1.png",
        },
      },
    };
    const returnValue = ForEach.image(gltf, (image, name) => {
      expect(image.uri).toBe(`${name}.png`);
      if (name === "image1") {
        return image;
      }
    });
    expect(returnValue).toBe(gltf.images["image1"]);
  });

  it("loops over materials", function () {
    const gltf = {
      materials: [
        {
          emissiveTexture: 0,
        },
        {
          emissiveTexture: 1,
        },
      ],
    };
    const returnValue = ForEach.material(gltf, (material, index) => {
      expect(material.emissiveTexture).toBe(index);
      if (index === 1) {
        return material;
      }
    });
    expect(returnValue).toBe(gltf.materials[1]);
  });

  it("loops over legacy material values", function () {
    const material = {
      name: "Texture",
      values: {
        diffuse: {
          index: 0,
        },
        shininess: 256,
        specular: [0.2, 0.2, 0.2, 1],
      },
    };

    let count = 0;
    const returnValue = ForEach.materialValue(material, (value, materialId) => {
      expect(value).toBeDefined();
      count++;
      if (materialId === "specular") {
        return value;
      }
    });
    expect(count).toBe(3);
    expect(returnValue).toBe(material.values["specular"]);
  });

  it("loops over meshes", function () {
    const gltf = {
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                NORMAL: 2,
              },
            },
          ],
        },
        {
          primitives: [
            {
              attributes: {
                POSITION: 1,
                NORMAL: 3,
              },
            },
          ],
        },
      ],
    };

    const returnValue = ForEach.mesh(gltf, (mesh, index) => {
      expect(mesh.primitives[0].attributes.POSITION).toBe(index);
      if (index === 1) {
        return mesh;
      }
    });
    expect(returnValue).toBe(gltf.meshes[1]);
  });

  const gltfPrimitives = {
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 2,
            },
          },
          {
            attributes: {
              POSITION: 1,
              NORMAL: 3,
            },
          },
        ],
      },
    ],
  };

  it("loops over primitives", function () {
    const mesh = gltfPrimitives.meshes[0];
    const returnValue = ForEach.meshPrimitive(mesh, (primitive, index) => {
      expect(primitive.attributes.POSITION).toBe(index);
      if (index === 1) {
        return primitive;
      }
    });
    expect(returnValue).toBe(gltfPrimitives.meshes[0].primitives[1]);
  });

  it("loops over attributes", function () {
    const primitive = gltfPrimitives.meshes[0].primitives[0];
    const returnValue = ForEach.meshPrimitiveAttribute(
      primitive,
      (accessorId, semantic) => {
        expect(primitive.attributes[semantic]).toBe(accessorId);
        if (semantic === "NORMAL") {
          return accessorId;
        }
      },
    );
    expect(returnValue).toBe(
      gltfPrimitives.meshes[0].primitives[0].attributes["NORMAL"],
    );
  });

  const gltfTargets = {
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 4,
              NORMAL: 5,
            },
            targets: [
              {
                POSITION: 0,
                NORMAL: 2,
              },
              {
                POSITION: 1,
                NORMAL: 3,
              },
            ],
          },
        ],
      },
    ],
  };

  it("loops over targets", function () {
    const primitive = gltfTargets.meshes[0].primitives[0];
    const returnValue = ForEach.meshPrimitiveTarget(
      primitive,
      (target, index) => {
        expect(target.POSITION).toBe(index);
        if (index === 1) {
          return target;
        }
      },
    );
    expect(returnValue).toBe(gltfTargets.meshes[0].primitives[0].targets[1]);
  });

  it("loops over target attributes", function () {
    const target = gltfTargets.meshes[0].primitives[0].targets[0];
    const returnValue = ForEach.meshPrimitiveTargetAttribute(
      target,
      (accessorId, semantic) => {
        expect(target[semantic]).toBe(accessorId);
        if (semantic === "NORMAL") {
          return accessorId;
        }
      },
    );
    expect(returnValue).toBe(
      gltfTargets.meshes[0].primitives[0].targets[0]["NORMAL"],
    );
  });

  const gltfNodes = {
    nodes: [
      {
        matrix: [
          1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0,
          0.0, 1.0,
        ],
        children: [4, 5],
      },
      {
        matrix: [
          1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0,
          0.0, 1.0,
        ],
      },
      {
        matrix: [
          1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 2.0, 0.0,
          0.0, 1.0,
        ],
      },
      {
        matrix: [
          1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 3.0, 0.0,
          0.0, 1.0,
        ],
      },
      {
        matrix: [
          1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 4.0, 0.0,
          0.0, 1.0,
        ],
      },
      {
        matrix: [
          1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 5.0, 0.0,
          0.0, 1.0,
        ],
      },
    ],
    scenes: [
      {
        nodes: [0, 1, 2],
      },
      {
        nodes: [3],
      },
    ],
  };

  it("loops over nodes", function () {
    let nodesLength = 0;

    const returnValue = ForEach.node(gltfNodes, (node, index) => {
      expect(node.matrix[12]).toBe(index);
      nodesLength++;

      if (nodesLength === 6) {
        return node;
      }
    });

    expect(nodesLength).toBe(6);
    expect(returnValue).toBe(gltfNodes.nodes[5]);
  });

  it("loops over samplers", function () {
    const filters = [WebGLConstants.NEAREST, WebGLConstants.LINEAR];
    const gltf = {
      samplers: [
        {
          magFilter: filters[0],
          minFilter: filters[0],
        },
        {
          magFilter: filters[1],
          minFilter: filters[1],
        },
      ],
    };
    let count = 0;
    const returnValue = ForEach.sampler(gltf, (sampler, index) => {
      expect(sampler.magFilter).toBe(filters[index]);
      expect(sampler.minFilter).toBe(filters[index]);
      expect(index).toBe(count++);

      if (index === 1) {
        return sampler;
      }
    });

    expect(returnValue).toBe(gltf.samplers[1]);
  });

  it("loops over scenes", function () {
    const gltf = {
      scenes: [
        {
          nodes: [0],
        },
        {
          nodes: [1],
        },
      ],
    };
    const returnValue = ForEach.scene(gltf, (scene, index) => {
      expect(scene.nodes[0]).toBe(index);

      if (index === 1) {
        return scene;
      }
    });
    expect(returnValue).toBe(gltf.scenes[1]);
  });

  it("loops over each skin", function () {
    const gltf = {
      skins: [
        {
          joints: [0],
        },
        {
          joints: [1],
        },
      ],
    };
    const returnValue = ForEach.skin(gltf, (skin, index) => {
      expect(skin.joints[0]).toBe(index);

      if (index === 1) {
        return skin;
      }
    });
    expect(returnValue).toBe(gltf.skins[1]);
  });

  it("loops over each texture", function () {
    const gltf = {
      textures: [
        {
          source: 0,
        },
        {
          source: 1,
        },
      ],
    };
    const returnValue = ForEach.texture(gltf, (texture, index) => {
      expect(texture.source).toBe(index);

      if (index === 1) {
        return texture;
      }
    });
    expect(returnValue).toBe(gltf.textures[1]);
  });
});
