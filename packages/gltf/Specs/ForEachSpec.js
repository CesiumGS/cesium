"use strict";
const Cesium = require("cesium");
const { ForEach } = require("@gltf-pipeline/core");

const WebGLConstants = Cesium.WebGLConstants;

describe("ForEach", () => {
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

  it("loops over accessors", () => {
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

  it("loops over accessor with semantic", () => {
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

  it("loops over accessors containing vertex data", () => {
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

  it("loops over accessors containing index data", () => {
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

  it("loops over animations", () => {
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

  it("loops over animation channel", () => {
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

  it("loops over animation samplers", () => {
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

  it("loops over buffers", () => {
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

  it("loops over buffers (gltf 1.0)", () => {
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

  it("loops over buffer views", () => {
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

  it("loops over cameras", () => {
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

  it("loops over images", () => {
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

  it("loops over images (gltf 1.0)", () => {
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

  it("loops over materials", () => {
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

  it("loops over material values", () => {
    const material = {
      name: "Texture",
      extensions: {
        KHR_techniques_webgl: {
          technique: 0,
          values: {
            u_diffuse: {
              index: 0,
            },
            u_shininess: 256,
            u_specular: [0.2, 0.2, 0.2, 1],
          },
        },
      },
    };

    let count = 0;
    const returnValue = ForEach.materialValue(
      material,
      (value, uniformName) => {
        expect(value).toBeDefined();
        expect(uniformName.indexOf("u_")).toBe(0);
        count++;
        if (uniformName === "u_specular") {
          return value;
        }
      },
    );
    expect(count).toBe(3);
    expect(returnValue).toBe(
      material.extensions.KHR_techniques_webgl.values["u_specular"],
    );
  });

  it("loops over legacy material values", () => {
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

  it("loops over meshes", () => {
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

  it("loops over primitives", () => {
    const mesh = gltfPrimitives.meshes[0];
    const returnValue = ForEach.meshPrimitive(mesh, (primitive, index) => {
      expect(primitive.attributes.POSITION).toBe(index);
      if (index === 1) {
        return primitive;
      }
    });
    expect(returnValue).toBe(gltfPrimitives.meshes[0].primitives[1]);
  });

  it("loops over attributes", () => {
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

  it("loops over targets", () => {
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

  it("loops over target attributes", () => {
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

  it("loops over nodes", () => {
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

  it("loops over nodes in tree", () => {
    let nodesInTree = 0;

    const returnValue = ForEach.nodeInTree(
      gltfNodes,
      gltfNodes.scenes[0].nodes,
      (node, index) => {
        expect(node.matrix[12]).toBe(index);
        nodesInTree++;

        if (nodesInTree === 5) {
          return node;
        }
      },
    );

    expect(nodesInTree).toBe(5);
    expect(returnValue).toBe(gltfNodes.nodes[2]);
  });

  it("loops over nodes in scene", () => {
    let nodesInScene0 = 0;
    let nodesInScene1 = 0;

    ForEach.nodeInScene(gltfNodes, gltfNodes.scenes[0], (node, index) => {
      expect(node.matrix[12]).toBe(index);
      nodesInScene0++;
    });
    const returnValue = ForEach.nodeInScene(
      gltfNodes,
      gltfNodes.scenes[1],
      (node, index) => {
        expect(node.matrix[12]).toBe(index);
        nodesInScene1++;

        if (nodesInScene1 === 1) {
          return node;
        }
      },
    );

    expect(nodesInScene0).toBe(5);
    expect(nodesInScene1).toBe(1);
    expect(returnValue).toBe(gltfNodes.nodes[3]);
  });

  it("loops over samplers", () => {
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

  it("loops over scenes", () => {
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

  it("loops over shaders (gltf 1.0)", () => {
    const gltf = {
      shaders: {
        vert: {
          type: WebGLConstants.VERTEX_SHADER,
          uri: "vert.glsl",
        },
        frag: {
          type: WebGLConstants.FRAGMENT_SHADER,
          uri: "frag.glsl",
        },
      },
    };
    const returnValue = ForEach.shader(gltf, (shader, name) => {
      expect(shader.uri).toBe(`${name}.glsl`);

      if (name === "frag") {
        return shader;
      }
    });

    expect(returnValue).toBe(gltf.shaders["frag"]);
  });

  it("loops over KHR_techniques_webgl shaders (gltf 2.0)", () => {
    let gltf = {
      extensions: {
        KHR_techniques_webgl: {
          shaders: [
            {
              type: WebGLConstants.FRAGMENT_SHADER,
              name: "BoxTextured0FS",
              uri: "BoxTextured0FS.glsl",
            },
            {
              type: WebGLConstants.VERTEX_SHADER,
              name: "BoxTextured0VS",
              uri: "BoxTextured0VS.glsl",
            },
          ],
        },
      },
      extensionsUsed: ["KHR_techniques_webgl"],
    };

    let count = 0;
    const returnValue = ForEach.shader(gltf, (shader) => {
      expect(shader.uri).toBe(`${shader.name}.glsl`);
      count++;

      if (count === 2) {
        return shader;
      }
    });
    expect(count).toBe(2);
    expect(returnValue).toBe(gltf.extensions.KHR_techniques_webgl.shaders[1]);

    gltf = {};

    count = 0;
    ForEach.shader(gltf, () => {
      count++;
    });
    expect(count).toBe(0);
  });

  it("loops over KHR_techniques_webgl programs (gltf 2.0)", () => {
    let gltf = {
      extensions: {
        KHR_techniques_webgl: {
          programs: [
            {
              name: "program_0",
              fragmentShader: 0,
              vertexShader: 1,
            },
            {
              name: "program_1",
              fragmentShader: 2,
              vertexShader: 3,
            },
          ],
        },
      },
      extensionsUsed: ["KHR_techniques_webgl"],
    };

    let count = 0;
    const returnValue = ForEach.program(gltf, (program) => {
      expect(program.fragmentShader).toBeDefined();
      expect(program.vertexShader).toBeDefined();
      count++;

      if (count === 2) {
        return program;
      }
    });
    expect(count).toBe(2);
    expect(returnValue).toBe(gltf.extensions.KHR_techniques_webgl.programs[1]);

    gltf = {};

    count = 0;
    ForEach.program(gltf, () => {
      count++;
    });
    expect(count).toBe(0);
  });

  it("loops over legacy programs (gltf 1.0)", () => {
    const gltf = {
      programs: {
        program_0: {
          fragmentShader: 0,
          vertexShader: 1,
        },
        program_1: {
          fragmentShader: 2,
          vertexShader: 3,
        },
      },
    };

    let count = 0;
    const returnValue = ForEach.program(gltf, (program) => {
      expect(program.fragmentShader).toBeDefined();
      expect(program.vertexShader).toBeDefined();
      count++;

      if (count === 2) {
        return program;
      }
    });
    expect(count).toBe(2);
    expect(returnValue).toBe(gltf.programs["program_1"]);
  });

  it("loops over KHR_techniques_webgl techniques (gltf 2.0)", () => {
    let gltf = {
      extensions: {
        KHR_techniques_webgl: {
          techniques: [
            {
              name: "technique0",
              program: 0,
              attributes: {},
              uniforms: {},
            },
            {
              name: "technique1",
              program: 1,
              attributes: {},
              uniforms: {},
            },
          ],
        },
      },
      extensionsUsed: ["KHR_techniques_webgl"],
    };

    let count = 0;
    const returnValue = ForEach.technique(gltf, (technique, index) => {
      expect(technique.name).toBe(`technique${index}`);
      count++;

      if (count === 2) {
        return technique;
      }
    });
    expect(count).toBe(2);
    expect(returnValue).toBe(
      gltf.extensions.KHR_techniques_webgl.techniques[1],
    );

    gltf = {};

    count = 0;
    ForEach.technique(gltf, () => {
      count++;
    });
    expect(count).toBe(0);
  });

  it("loops over legacy techniques (gltf 1.0)", () => {
    const gltf = {
      techniques: {
        technique0: {
          program: 0,
          attributes: {},
          uniforms: {},
        },
        technique1: {
          program: 1,
          attributes: {},
          uniforms: {},
        },
      },
    };

    let count = 0;
    const returnValue = ForEach.technique(gltf, (technique) => {
      expect(technique.program).toBeDefined();
      count++;

      if (count === 2) {
        return technique;
      }
    });
    expect(count).toBe(2);
    expect(returnValue).toBe(gltf.techniques["technique1"]);
  });

  it("loops over technique attributes", () => {
    const technique = {
      name: "technique0",
      program: 0,
      attributes: {
        a_normal: {
          semantic: "NORMAL",
        },
        a_position: {
          semantic: "POSITION",
        },
        a_texcoord0: {
          semantic: "TEXCOORD_0",
        },
      },
      uniforms: {},
    };

    let count = 0;
    const returnValue = ForEach.techniqueAttribute(
      technique,
      (attribute, attributeName) => {
        expect(attribute.semantic).toBeDefined();
        expect(attributeName.indexOf("a_")).toBe(0);
        count++;

        if (count === 3) {
          return attribute;
        }
      },
    );

    expect(count).toBe(3);
    expect(returnValue).toBe(technique.attributes["a_texcoord0"]);
  });

  it("loops over legacy technique attributes", () => {
    const technique = {
      name: "technique0",
      program: 0,
      parameters: {},
      attributes: {
        a_normal: "normal",
        a_position: "position",
        a_texcoord0: "texcoord0",
      },
      uniforms: {},
    };

    let count = 0;
    const returnValue = ForEach.techniqueAttribute(
      technique,
      (parameterName, attributeName) => {
        expect(parameterName).toBe(attributeName.substring(2));
        count++;

        if (count === 3) {
          return parameterName;
        }
      },
    );

    expect(count).toBe(3);
    expect(returnValue).toBe(technique.attributes["a_texcoord0"]);
  });

  it("loops over technique uniforms", () => {
    const technique = {
      name: "technique0",
      program: 0,
      attributes: {},
      uniforms: {
        u_diffuse: {
          type: WebGLConstants.SAMPLER_2D,
        },
        u_modelViewMatrix: {
          type: WebGLConstants.FLOAT_MAT4,
          semantic: "MODELVIEW",
        },
        u_normalMatrix: {
          type: WebGLConstants.FLOAT_MAT3,
          semantic: "MODELVIEWINVERSETRANSPOSE",
        },
      },
    };

    let count = 0;
    const returnValue = ForEach.techniqueUniform(
      technique,
      (uniform, uniformName) => {
        expect(uniform.type).toBeDefined();
        expect(uniformName.indexOf("u_")).toBe(0);
        count++;

        if (count === 3) {
          return uniform;
        }
      },
    );

    expect(count).toBe(3);
    expect(returnValue).toBe(technique.uniforms["u_normalMatrix"]);
  });

  it("loops over legacy technique uniforms", () => {
    const technique = {
      name: "technique0",
      program: 0,
      parameters: {},
      attributes: {},
      uniforms: {
        u_diffuse: "diffuse",
        u_modelViewMatrix: "modelViewMatrix",
        u_normalMatrix: "normalMatrix",
      },
    };

    let count = 0;
    const returnValue = ForEach.techniqueUniform(
      technique,
      (parameterName, uniformName) => {
        expect(parameterName).toBe(uniformName.substring(2));
        count++;

        if (count === 3) {
          return parameterName;
        }
      },
    );

    expect(count).toBe(3);
    expect(returnValue).toBe(technique.uniforms["u_normalMatrix"]);
  });

  it("loops over legacy technique parameters", () => {
    const technique = {
      name: "technique0",
      program: 0,
      attributes: {},
      uniforms: {},
      parameters: {
        diffuse: {
          type: WebGLConstants.SAMPLER_2D,
        },
        modelViewMatrix: {
          semantic: "MODELVIEW",
          type: WebGLConstants.FLOAT_MAT4,
        },
        normal: {
          semantic: "NORMAL",
          type: WebGLConstants.FLOAT_VEC3,
        },
      },
    };

    let count = 0;
    const returnValue = ForEach.techniqueParameter(
      technique,
      (parameter, parameterName) => {
        expect(parameter.type).toBeDefined();
        expect(parameterName).toBeDefined();
        count++;

        if (count === 3) {
          return parameter;
        }
      },
    );

    expect(count).toBe(3);
    expect(returnValue).toBe(technique.parameters["normal"]);
  });

  it("loops over each skin", () => {
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

  it("loops over each texture", () => {
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
