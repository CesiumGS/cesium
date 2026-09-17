"use strict";
const fsExtra = require("fs-extra");
const Cesium = require("cesium");
const path = require("path");
const { readResources } = require("@gltf-pipeline/lib");
const {
  ForEach,
  numberOfComponentsForType,
  updateVersion,
} = require("@gltf-pipeline/core");

const Cartesian3 = Cesium.Cartesian3;
const CesiumMath = Cesium.Math;
const Quaternion = Cesium.Quaternion;
const WebGLConstants = Cesium.WebGLConstants;

const gltf1Techniques = "specs/data/1.0/box/box.gltf";
const gltf1TechniquesTextured =
  "specs/data/1.0/box-textured-embedded/box-textured-embedded.gltf";
const gltf1MaterialsCommon =
  "specs/data/1.0/box-materials-common/box-materials-common.gltf";
const gltf1MaterialsCommonTextured =
  "specs/data/1.0/box-textured-materials-common/box-textured-materials-common.gltf";
const gltf2TechniquesTextured =
  "specs/data/2.0/box-techniques-embedded/box-techniques-embedded.gltf";

describe("updateVersion", () => {
  it("defaults to 1.0 if gltf has no version", () => {
    const gltf = {};
    updateVersion(gltf, {
      targetVersion: "1.0",
    });
    expect(gltf.asset.version).toEqual("1.0");
  });

  it("updates empty glTF with version from 0.8 to 2.0", () => {
    const gltf = {
      version: "0.8",
    };
    updateVersion(gltf);
    expect(gltf.version).toBeUndefined();
    expect(gltf.asset.version).toEqual("2.0");
  });

  it("updates empty glTF with version 1.0 to 2.0", () => {
    const gltf = {
      asset: {
        version: "1.0",
      },
    };
    updateVersion(gltf);
    expect(gltf.asset.version).toEqual("2.0");
  });

  it("updates a glTF with non-standard version to 2.0", () => {
    const gltf = {
      asset: {
        version: "1.0.1",
      },
    };
    updateVersion(gltf);
    expect(gltf.asset.version).toEqual("2.0");
  });

  it("updates glTF from 0.8 to 1.0", async () => {
    const times = [0.0, 1.0];
    const axisA = new Cartesian3(0.0, 0.0, 1.0);
    const axisB = new Cartesian3(0.0, 1.0, 0.0);
    const angleA = 0.0;
    const angleB = 0.5;
    const quatA = Quaternion.fromAxisAngle(axisA, angleA);
    const quatB = Quaternion.fromAxisAngle(axisB, angleB);

    const originalBuffer = Buffer.from(
      new Float32Array([
        times[0],
        times[1],
        axisA.x,
        axisA.y,
        axisA.z,
        angleA,
        axisB.x,
        axisB.y,
        axisB.z,
        angleB,
      ]).buffer,
    );
    const expectedBuffer = Buffer.from(
      new Float32Array([
        times[0],
        times[1],
        quatA.x,
        quatA.y,
        quatA.z,
        quatA.w,
        quatB.x,
        quatB.y,
        quatB.z,
        quatB.w,
      ]).buffer,
    );

    const dataUri = `data:application/octet-stream;base64,${originalBuffer.toString(
      "base64",
    )}`;

    const gltf = {
      version: "0.8",
      asset: {
        profile: "WebGL 1.0",
      },
      allExtensions: ["extension"],
      lights: {
        someLight: true,
      },
      buffers: {
        buffer: {
          uri: dataUri,
        },
      },
      bufferViews: {
        bufferViewTime: {
          buffer: "buffer",
          byteLength: 8,
          byteOffset: 0,
        },
        bufferViewRotation: {
          buffer: "buffer",
          byteLength: 32,
          byteOffset: 8,
        },
      },
      accessors: {
        accessorTime: {
          bufferView: "bufferViewTime",
          byteOffset: 0,
          byteStride: 0,
          componentType: WebGLConstants.FLOAT,
          count: 2,
          type: "SCALAR",
        },
        accessorRotation: {
          bufferView: "bufferViewRotation",
          byteOffset: 0,
          byteStride: 0,
          componentType: WebGLConstants.FLOAT,
          count: 2,
          type: "VEC4",
        },
      },
      animations: {
        animationNode: {
          channels: [
            {
              sampler: "sampler",
              target: {
                id: "node",
                path: "rotation",
              },
            },
          ],
          count: 2,
          parameters: {
            time: "accessorTime",
            rotation: "accessorRotation",
          },
          samplers: {
            sampler: {
              input: "time",
              interpolation: "LINEAR",
              output: "rotation",
            },
          },
        },
        animationNodeOther: {
          channels: [
            {
              sampler: "sampler",
              target: {
                id: "nodeOther",
                path: "rotation",
              },
            },
          ],
          count: 2,
          parameters: {
            time: "accessorTime",
            rotation: "accessorRotation",
          },
          samplers: {
            sampler: {
              input: "time",
              interpolation: "LINEAR",
              output: "rotation",
            },
          },
        },
      },
      materials: {
        material: {
          instanceTechnique: {
            technique: "technique",
            values: {
              ambient: [0.0, 0.0, 0.0, 1.0],
            },
          },
        },
      },
      meshes: {
        mesh: {
          primitives: [
            {
              primitive: WebGLConstants.TRIANGLES,
            },
          ],
        },
      },
      nodes: {
        node: {
          rotation: [0.0, 0.0, 1.0, 0.0],
          instanceSkin: {
            skeletons: ["skeleton"],
            skin: "skin",
            meshes: ["mesh"],
          },
        },
        nodeOther: {
          rotation: [0.0, 0.0, 1.0, 0.0],
        },
      },
      techniques: {
        technique: {
          pass: "pass",
          passes: {
            pass: {
              instanceProgram: {
                attributes: {
                  attribute: "TEST_ATTRIBUTE",
                },
                program: "program",
                uniforms: {
                  uniform: "TEST_UNIFORM",
                },
              },
              states: ["TEST_STATE"],
            },
          },
        },
      },
    };

    await readResources(gltf);
    updateVersion(gltf, {
      targetVersion: "1.0",
      keepLegacyExtensions: true,
    });

    // Asset updates: version set to 1.0, profile split into object
    expect(gltf.asset.version).toEqual("1.0");
    expect(gltf.asset.profile).toEqual({
      api: "WebGL",
      version: "1.0",
    });

    // Top-level version removed
    expect(gltf.version).toBeUndefined();

    // allExtensions renamed to extensionsUsed
    // gltf.lights moved to KHR_materials_common extension
    expect(gltf.extensionsUsed).toEqual(["extension", "KHR_materials_common"]);
    expect(gltf.allExtensions).toBeUndefined();
    expect(gltf.extensions.KHR_materials_common.lights).toEqual({
      someLight: true,
    });

    // material.instanceTechnique properties moved onto the material directly
    const material = gltf.materials.material;
    expect(material.technique).toEqual("technique");
    expect(material.values).toEqual({
      ambient: [0.0, 0.0, 0.0, 1.0],
    });

    // primitive.primitive renamed to primitive.mode
    const primitive = gltf.meshes.mesh.primitives[0];
    expect(primitive.primitive).toBeUndefined();
    expect(primitive.mode).toEqual(WebGLConstants.TRIANGLES);

    // node.instanceSkin is split into node.skeletons, node.skin, and node.meshes
    const node = gltf.nodes.node;
    expect(node.skeletons).toEqual(["skeleton"]);
    expect(node.skin).toEqual("skin");
    expect(node.meshes).toEqual(["mesh"]);

    // Node rotation converted from axis-angle to quaternion
    expect(node.rotation).toEqual([0.0, 0.0, 0.0, 1.0]);

    // Technique pass and passes removed
    const technique = gltf.techniques.technique;
    expect(technique.pass).toBeUndefined();
    expect(technique.passes).toBeUndefined();
    expect(technique.attributes).toEqual({
      attribute: "TEST_ATTRIBUTE",
    });
    expect(technique.program).toEqual("program");
    expect(technique.uniforms).toEqual({
      uniform: "TEST_UNIFORM",
    });
    expect(technique.states).toEqual(["TEST_STATE"]);

    // Animation rotations converted from axis-angle to quaternion
    const buffer = gltf.buffers.buffer.extras._pipeline.source;
    expect(buffer.equals(expectedBuffer)).toBe(true);
  });

  function getNodeByName(gltf, name) {
    return ForEach.node(gltf, (node) => {
      if (node.name === name) {
        return node;
      }
    });
  }

  function getBufferViewByName(gltf, name) {
    return ForEach.bufferView(gltf, (bufferView) => {
      if (bufferView.name === name) {
        return bufferView;
      }
    });
  }

  it("updates glTF from 1.0 to 2.0", async () => {
    const applicationSpecificBuffer = Buffer.from(
      new Int16Array([-2, 1, 0, 1, 2, 3]).buffer,
    );
    const positionBuffer = Buffer.from(new Float32Array(9).fill(1.0).buffer);
    const normalBuffer = Buffer.from(new Float32Array(9).fill(2.0).buffer);
    const texcoordBuffer = Buffer.from(new Float32Array(6).fill(3.0).buffer);
    const source = Buffer.concat([
      applicationSpecificBuffer,
      positionBuffer,
      normalBuffer,
      texcoordBuffer,
    ]);

    const dataUri = `data:application/octet-stream;base64,${source.toString(
      "base64",
    )}`;

    const gltf = {
      asset: {
        profile: {
          api: "WebGL",
          version: "1.0.3",
        },
        version: "1.0",
      },
      animations: {
        animation: {
          samplers: {
            sampler: {
              input: "INPUT",
              output: "OUTPUT",
            },
          },
          parameters: {
            INPUT: "accessor_input",
            OUTPUT: "accessor_output",
          },
        },
      },
      extensionsUsed: [
        "KHR_materials_common",
        "WEB3D_quantized_attributes",
        "UNKOWN_EXTENSION",
      ],
      extensions: {
        KHR_materials_common: {
          lights: {
            directionalLight: {
              directional: {
                color: [1, 0, 0],
              },
              type: "directional",
            },
          },
        },
      },
      meshes: {
        mesh: {
          primitives: [
            {
              attributes: {
                POSITION: "accessor_position",
                NORMAL: "accessor_normal",
                TEXCOORD: "accessor_texcoord",
                COLOR: "accessor_color",
                JOINT: "accessor_joint",
                WEIGHT: "accessor_weight",
                APPLICATIONSPECIFIC: "accessor",
                _TEMPERATURE: "accessor_temperature",
              },
              indices: "accessor_indices",
            },
          ],
        },
      },
      materials: {
        material: {
          technique: "technique",
          values: {
            lightAttenuation: 2.0,
          },
        },
      },
      techniques: {
        technique: {
          states: {
            enable: [
              WebGLConstants.SCISSOR_TEST,
              WebGLConstants.BLEND,
              WebGLConstants.CULL_FACE,
            ],
            functions: {
              blendColor: [-1.0, 0.0, 0.0, 2.0],
              blendEquationSeparate: [
                WebGLConstants.FUNC_SUBTRACT,
                WebGLConstants.FUNC_SUBTRACT,
              ],
              depthRange: [1.0, -1.0],
              scissor: [0.0, 0.0, 0.0, 0.0],
            },
          },
          attributes: {
            a_application: "application",
            a_joints: "joints",
            a_weights: "weights",
          },
          uniforms: {
            u_lightAttenuation: "lightAttenuation",
            u_texcoord: "texcoord",
            u_color: "color",
            u_application: "application",
            u_jointMatrix: "jointMatrix",
          },
          parameters: {
            lightAttenuation: {
              value: 1.0,
            },
            texcoord: {
              semantic: "TEXCOORD",
            },
            color: {
              semantic: "COLOR",
            },
            joints: {
              semantic: "JOINT",
            },
            weights: {
              semantic: "WEIGHT",
            },
            application: {
              semantic: "APPLICATIONSPECIFIC",
              count: 1,
              value: 2,
            },
            jointMatrix: {
              semantic: "JOINTMATRIX",
              count: 2,
            },
          },
          program: "program_0",
        },
      },
      accessors: {
        accessor: {
          byteOffset: 0,
          bufferView: "bufferView",
          componentType: WebGLConstants.SHORT,
          count: 6,
          type: "SCALAR",
        },
        accessor_indices: {
          componentType: WebGLConstants.UNSIGNED_INT,
          count: 3,
          type: "SCALAR",
        },
        accessor_input: {
          componentType: WebGLConstants.FLOAT,
          count: 1,
          type: "SCALAR",
        },
        accessor_output: {
          componentType: WebGLConstants.FLOAT,
          count: 1,
          type: "VEC3",
        },
        accessor_position: {
          bufferView: "bufferViewAttributes",
          byteOffset: 0,
          componentType: WebGLConstants.FLOAT,
          count: 3,
          type: "VEC3",
        },
        accessor_normal: {
          bufferView: "bufferViewAttributes",
          byteOffset: 42,
          componentType: WebGLConstants.BYTE,
          count: 3,
          type: "VEC2",
        },
        accessor_texcoord: {
          bufferView: "bufferViewAttributes",
          byteOffset: 50,
          componentType: WebGLConstants.BYTE,
          count: 3,
          type: "VEC2",
        },
        accessor_color: {
          componentType: WebGLConstants.FLOAT,
          count: 3,
          type: "VEC3",
        },
        accessor_joint: {
          componentType: WebGLConstants.FLOAT,
          count: 1,
          type: "SCALAR",
        },
        accessor_weight: {
          componentType: WebGLConstants.FLOAT,
          count: 1,
          type: "SCALAR",
        },
        accessor_temperature: {
          componentType: WebGLConstants.FLOAT,
          count: 2,
          type: "SCALAR",
        },
      },
      bufferViews: {
        bufferView: {
          buffer: "buffer",
          byteOffset: 0,
        },
        bufferViewAttributes: {
          buffer: "buffer",
          byteOffset: 12,
        },
      },
      buffers: {
        buffer: {
          type: "arraybuffer",
          uri: dataUri,
        },
      },
      cameras: {
        camera: {
          perspective: {
            aspectRatio: 0.0,
            yfov: 0.0,
          },
        },
      },
      nodes: {
        rootTransform: {
          children: ["skeletonNode", "meshNode"],
          matrix: [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        },
        skeletonNode: {},
        meshNode: {
          skin: "someSkin",
          skeletons: ["skeletonNode"],
        },
        nodeWithoutChildren: {
          children: [],
          camera: 0,
        },
        nonEmptyNodeParent: {
          children: ["emptyNode"],
          scale: [1, 2, 3],
        },
        emptyNodeParent: {
          children: ["emptyNode"],
        },
        emptyNode: {
          children: [],
          matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        },
        lightNode: {
          extensions: {
            KHR_materials_common: {
              light: "directionalLight",
            },
          },
        },
      },
      programs: {
        program_0: {
          attributes: ["a_application", "a_joints", "a_weights"],
          fragmentShader: "fs",
          vertexShader: "vs",
        },
      },
      samplers: [],
      scene: "defaultScene",
      scenes: {
        defaultScene: {
          nodes: ["rootTransform", "emptyNodeParent", "lightNode"],
        },
      },
      shaders: {
        fs: {
          type: 35632,
          uri: "data:,",
        },
        vs: {
          type: 35633,
          uri: "data:,",
        },
      },
      skins: {
        someSkin: {},
      },
      textures: [
        {
          source: 0,
          format: WebGLConstants.RGBA,
          internalFormat: WebGLConstants.RGBA,
          target: WebGLConstants.TEXTURE_2D,
          type: WebGLConstants.UNSIGNED_BYTE,
        },
      ],
      glExtensionsUsed: ["OES_element_index_uint"],
    };

    await readResources(gltf);
    updateVersion(gltf, {
      keepLegacyExtensions: true,
    });

    // Asset updates: version set to 2.0, profile removed
    expect(gltf.asset.version).toEqual("2.0");
    expect(gltf.asset.profile).toBeUndefined();

    // Extensions used become extensions required
    const extensionsUsed = gltf.extensionsUsed;
    expect(extensionsUsed).toEqual([
      "KHR_materials_common",
      "WEB3D_quantized_attributes",
      "UNKOWN_EXTENSION",
      "KHR_blend",
      "KHR_techniques_webgl",
    ]);
    const extensionsRequired = gltf.extensionsRequired;
    expect(extensionsRequired).toEqual([
      "KHR_materials_common",
      "WEB3D_quantized_attributes",
      "KHR_techniques_webgl",
    ]);

    // animation.parameters removed
    const animation = gltf.animations[0];
    const sampler = animation.samplers[0];
    expect(sampler.name).toBeUndefined();
    expect(sampler.input).toEqual(2);
    expect(sampler.output).toEqual(3);
    expect(animation.parameters).toBeUndefined();

    // Empty arrays removed
    expect(gltf.samplers).toBeUndefined();
    expect(getNodeByName(gltf, "nodeWithoutChildren").children).toBeUndefined();

    // Empty nodes removed
    expect(getNodeByName(gltf, "nonEmptyNodeParent")).toBeDefined();
    expect(getNodeByName(gltf, "emptyNodeParent")).toBeUndefined();
    expect(getNodeByName(gltf, "emptyNode")).toBeUndefined();
    expect(getNodeByName(gltf, "lightNode")).toBeDefined();
    expect(gltf.scenes[0].nodes.length).toBe(2);

    // Expect material values to be moved to material KHR_techniques_webgl extension
    const material = gltf.materials[0];
    expect(
      material.extensions.KHR_techniques_webgl.values.u_lightAttenuation,
    ).toEqual(2);

    // Expect material parameters to be updated
    expect(material.doubleSided).toBeUndefined();
    expect(material.alphaMode).toBe("BLEND");

    // Expect technique blending to be moved to material KHR_blend extension
    const materialBlending = material.extensions.KHR_blend;
    expect(materialBlending).toBeDefined();
    expect(materialBlending.blendEquation).toEqual([
      WebGLConstants.FUNC_SUBTRACT,
      WebGLConstants.FUNC_SUBTRACT,
    ]);
    expect(materialBlending.blendFactors).toEqual([
      WebGLConstants.ONE,
      WebGLConstants.ZERO,
      WebGLConstants.ONE,
      WebGLConstants.ZERO,
    ]);

    // Expect techniques to be moved to asset KHR_techniques_webgl extension
    const technique = gltf.extensions.KHR_techniques_webgl.techniques[0];
    expect(technique.uniforms.u_lightAttenuation.value).toEqual(1.0);
    expect(technique.attributes.a_application.value).toBeUndefined();

    // TEXCOORD and COLOR are now TEXCOORD_0 and COLOR_0
    const primitive = gltf.meshes[0].primitives[0];
    expect(technique.uniforms.u_texcoord.semantic).toEqual("TEXCOORD_0");
    expect(technique.uniforms.u_color.semantic).toEqual("COLOR_0");
    expect(primitive.attributes.TEXCOORD).toBeUndefined();
    expect(primitive.attributes.TEXCOORD_0).toEqual(6);
    expect(primitive.attributes.COLOR).toBeUndefined();
    expect(primitive.attributes.COLOR_0).toEqual(7);

    // JOINT is now JOINTS_0 and WEIGHT is not WEIGHTS_0
    expect(technique.attributes.a_joints.semantic).toEqual("JOINTS_0");
    expect(technique.attributes.a_weights.semantic).toEqual("WEIGHTS_0");
    expect(primitive.attributes.JOINT).toBeUndefined();
    expect(primitive.attributes.JOINTS_0).toEqual(8);
    expect(primitive.attributes.WEIGHT).toBeUndefined();
    expect(primitive.attributes.WEIGHTS_0).toEqual(9);

    // Underscore added to application specific attributes
    expect(technique.attributes.a_application.semantic).toEqual(
      "_APPLICATIONSPECIFIC",
    );
    expect(primitive.attributes.APPLICATIONSPECIFIC).toBeUndefined();
    expect(primitive.attributes._APPLICATIONSPECIFIC).toEqual(0);
    expect(primitive.attributes._TEMPERATURE).toEqual(10);

    // JOINTS_0 has converted component type
    expect(gltf.accessors[8].componentType).toBe(WebGLConstants.UNSIGNED_SHORT);

    // Clamp camera parameters
    const camera = gltf.cameras[0];
    expect(camera.perspective.aspectRatio).toBeUndefined();
    expect(camera.perspective.yfov).toEqual(1.0);

    // Sets byteLength for buffers and bufferViews
    const buffer = gltf.buffers[0];
    expect(buffer.type).toBeUndefined();
    expect(buffer.byteLength).toEqual(source.length);

    const bufferView = getBufferViewByName(gltf, "bufferView");
    expect(bufferView.byteLength).toEqual(12);

    // Min and max are added to all POSITION accessors
    ForEach.accessorWithSemantic(gltf, "POSITION", (accessorId) => {
      const accessor = gltf.accessors[accessorId];
      expect(accessor.min.length).toEqual(
        numberOfComponentsForType(accessor.type),
      );
      expect(accessor.max.length).toEqual(
        numberOfComponentsForType(accessor.type),
      );
    });

    // Min and max are added to all animation sampler input accessors
    ForEach.animation(gltf, (animation) => {
      ForEach.animationSampler(animation, (sampler) => {
        const accessor = gltf.accessors[sampler.input];
        expect(accessor.min.length).toEqual(
          numberOfComponentsForType(accessor.type),
        );
        expect(accessor.max.length).toEqual(
          numberOfComponentsForType(accessor.type),
        );
      });
    });

    // byteStride moved from accessor to bufferView
    const positionAccessor = gltf.accessors[primitive.attributes.POSITION];
    const normalAccessor = gltf.accessors[primitive.attributes.NORMAL];
    const texcoordAccessor = gltf.accessors[primitive.attributes.TEXCOORD_0];
    const positionBufferView = gltf.bufferViews[positionAccessor.bufferView];
    const texcoordBufferView = gltf.bufferViews[texcoordAccessor.bufferView];
    expect(positionAccessor.bufferView).toBe(1);
    expect(normalAccessor.bufferView).toBe(2);
    expect(texcoordAccessor.bufferView).toBe(2);
    expect(positionBufferView.byteLength).toBe(36);
    expect(positionBufferView.byteOffset).toBe(12); // First unrelated buffer view is 12 bytes
    expect(positionBufferView.byteStride).toBe(12);
    expect(texcoordBufferView.byteLength).toBe(50 - 42 + 6); // Padding to next buffer view
    expect(texcoordBufferView.byteOffset).toBe(42 + 12); // Byte offset of previous accessor plus byte length
    expect(texcoordBufferView.byteStride).toBe(2);
    expect(positionAccessor.byteStride).toBeUndefined();
    expect(normalAccessor.byteStride).toBeUndefined();
    expect(texcoordAccessor.byteStride).toBeUndefined();

    // glExtensionsUsed removed
    expect(gltf.glExtensionsUsed).toBeUndefined();
    expect(
      gltf.extensions.KHR_techniques_webgl.programs[0].glExtensions,
    ).toEqual(["OES_element_index_uint"]);
  });

  it("updates glTF 1.0 techniques to PBR materials", async () => {
    const gltf = fsExtra.readJsonSync(gltf1Techniques);
    await readResources(gltf);
    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness.roughnessFactor).toBe(1.0);
    expect(material.pbrMetallicRoughness.metallicFactor).toBe(0.0);
    expect(
      CesiumMath.equalsEpsilon(
        material.pbrMetallicRoughness.baseColorFactor[0],
        0.6038273388553378, // Original 0.8 before srgb -> linear conversion
        Cesium.Math.EPSILON9,
      ),
    ).toBe(true);
    expect(material.pbrMetallicRoughness.baseColorFactor[1]).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorFactor[2]).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorFactor[3]).toBe(1.0);

    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toBeUndefined();
    expect(material.extensions).toBeUndefined();
  });

  it("updates glTF 1.0 techniques with textures to PBR materials", async () => {
    const gltf = fsExtra.readJsonSync(gltf1TechniquesTextured);
    await readResources(gltf);
    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness.roughnessFactor).toBe(1.0);
    expect(material.pbrMetallicRoughness.metallicFactor).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorTexture.index).toBe(0);
  });

  it("updates glTF 1.0 with KHR_materials_common to PBR materials", async () => {
    const gltf = fsExtra.readJsonSync(gltf1MaterialsCommon);
    await readResources(gltf, {
      resourceDirectory: path.dirname(gltf1MaterialsCommon),
    });
    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness.roughnessFactor).toBe(1.0);
    expect(material.pbrMetallicRoughness.metallicFactor).toBe(0.0);
    expect(
      CesiumMath.equalsEpsilon(
        material.pbrMetallicRoughness.baseColorFactor[0],
        0.6038273388553378, // Original 0.8 before srgb -> linear conversion
        Cesium.Math.EPSILON9,
      ),
    ).toBe(true);
    expect(material.pbrMetallicRoughness.baseColorFactor[1]).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorFactor[2]).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorFactor[3]).toBe(1.0);
    expect(material.doubleSided).toBe(false);
    expect(material.alphaMode).toBe("OPAQUE");

    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toBeUndefined();
    expect(material.extensions).toBeUndefined();
  });

  it("updates glTF 1.0 with KHR_materials_common with textures to PBR materials", async () => {
    const gltf = fsExtra.readJsonSync(gltf1MaterialsCommonTextured);
    await readResources(gltf, {
      resourceDirectory: path.dirname(gltf1MaterialsCommonTextured),
    });
    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness.roughnessFactor).toBe(1.0);
    expect(material.pbrMetallicRoughness.metallicFactor).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorTexture.index).toBe(0);
    expect(material.doubleSided).toBe(false);
    expect(material.alphaMode).toBe("OPAQUE");
  });

  it("updates glTF 1.0 with KHR_materials_common with CONSTANT technique to PBR materials", async () => {
    const gltf = fsExtra.readJsonSync(gltf1MaterialsCommon);
    await readResources(gltf, {
      resourceDirectory: path.dirname(gltf1MaterialsCommon),
    });

    const materialsCommon =
      gltf.materials["Effect-Red"].extensions.KHR_materials_common;
    materialsCommon.technique = "CONSTANT";
    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.extensions.KHR_materials_unlit).toBeDefined();
    expect(gltf.extensionsUsed.indexOf("KHR_materials_unlit") !== -1);
  });

  it("updates glTF 1.0 with KHR_materials_common with CONSTANT technique to PBR materials using emissive as the base color texture when diffuse is not present", async () => {
    const gltf = fsExtra.readJsonSync(gltf1MaterialsCommonTextured);
    await readResources(gltf, {
      resourceDirectory: path.dirname(gltf1MaterialsCommonTextured),
    });

    const materialsCommon =
      gltf.materials["Effect-Texture"].extensions.KHR_materials_common;
    // Move the 'diffuse' texture definition into 'emission', and expect
    // this to show up as the base color texture after the update
    materialsCommon.values.emission = materialsCommon.values.diffuse;
    delete materialsCommon.values.diffuse;
    materialsCommon.technique = "CONSTANT";
    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness.baseColorTexture).toBeDefined();
    expect(material.extensions.KHR_materials_unlit).toBeDefined();
    expect(gltf.extensionsUsed.indexOf("KHR_materials_unlit") !== -1);
  });

  it("updates glTF 1.0 with KHR_materials_common with other values to PBR materials", async () => {
    const gltf = fsExtra.readJsonSync(gltf1MaterialsCommon);
    await readResources(gltf, {
      resourceDirectory: path.dirname(gltf1MaterialsCommon),
    });

    const materialsCommon =
      gltf.materials["Effect-Red"].extensions.KHR_materials_common;

    materialsCommon.doubleSided = true;
    materialsCommon.transparent = true;
    materialsCommon.values.ambient = [0.2, 0.2, 0.2, 1.0];
    materialsCommon.values.emission = [0.2, 0.2, 0.2, 1.0];
    materialsCommon.values.transparency = 0.5;

    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.emissiveFactor).toEqual([0.2, 0.2, 0.2]);
    expect(material.doubleSided).toBe(true);
    expect(material.alphaMode).toBe("BLEND");
    expect(material.pbrMetallicRoughness.baseColorFactor[3]).toBe(0.5);
  });

  it("updates glTF 2.0 with KHR_techniques_webgl to PBR materials", async () => {
    const gltf = fsExtra.readJsonSync(gltf2TechniquesTextured);
    await readResources(gltf);
    updateVersion(gltf);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness.roughnessFactor).toBe(1.0);
    expect(material.pbrMetallicRoughness.metallicFactor).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorTexture.index).toBe(0);

    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toBeUndefined();
    expect(material.extensions).toBeUndefined();
  });

  it("creates a PBR material from KHR_techniques_webgl with a custom diffuse texture name", async () => {
    const gltf = fsExtra.readJsonSync(gltf2TechniquesTextured);
    await readResources(gltf);

    const options = {
      baseColorTextureNames: ["u_diffuse"],
    };
    updateVersion(gltf, options);

    expect(gltf.materials.length).toBe(1);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness.roughnessFactor).toBe(1.0);
    expect(material.pbrMetallicRoughness.metallicFactor).toBe(0.0);
    expect(material.pbrMetallicRoughness.baseColorTexture.index).toBe(0);

    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toBeUndefined();
  });

  it("does not create a PBR material from KHR_techniques_webgl when the diffuse texture name is unknown", async () => {
    const gltf = fsExtra.readJsonSync(gltf2TechniquesTextured);
    await readResources(gltf);

    const options = {
      baseColorTextureNames: ["NOT_u_diffuse"],
    };
    updateVersion(gltf, options);

    expect(gltf.materials.length).toBe(1);

    const material = gltf.materials[0];
    expect(material.pbrMetallicRoughness).toBeUndefined();
    expect(material.extensions).toBeUndefined();

    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toBeUndefined();
  });
});
