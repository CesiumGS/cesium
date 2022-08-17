import addExtensionsUsed from "./addExtensionsUsed.js";
import addToArray from "./addToArray.js";
import findAccessorMinMax from "./findAccessorMinMax.js";
import ForEach from "./ForEach.js";
import getAccessorByteStride from "./getAccessorByteStride.js";
import numberOfComponentsForType from "./numberOfComponentsForType.js";
import moveTechniqueRenderStates from "./moveTechniqueRenderStates.js";
import moveTechniquesToExtension from "./moveTechniquesToExtension.js";
import removeUnusedElements from "./removeUnusedElements.js";
import updateAccessorComponentTypes from "./updateAccessorComponentTypes.js";
import removeExtension from "./removeExtension.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import clone from "../../Core/clone.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Quaternion from "../../Core/Quaternion.js";
import WebGLConstants from "../../Core/WebGLConstants.js";

const updateFunctions = {
  0.8: glTF08to10,
  "1.0": glTF10to20,
  "2.0": undefined,
};

/**
 * Update the glTF version to the latest version (2.0), or targetVersion if specified.
 * Applies changes made to the glTF spec between revisions so that the core library
 * only has to handle the latest version.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {Object} [options] Options for updating the glTF.
 * @param {String} [options.targetVersion] The glTF will be upgraded until it hits the specified version.
 * @returns {Object} The updated glTF asset.
 *
 * @private
 */
function updateVersion(gltf, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const targetVersion = options.targetVersion;
  let version = gltf.version;

  gltf.asset = defaultValue(gltf.asset, {
    version: "1.0",
  });

  gltf.asset.version = defaultValue(gltf.asset.version, "1.0");
  version = defaultValue(version, gltf.asset.version).toString();

  // Invalid version
  if (!Object.prototype.hasOwnProperty.call(updateFunctions, version)) {
    // Try truncating trailing version numbers, could be a number as well if it is 0.8
    if (defined(version)) {
      version = version.substring(0, 3);
    }
    // Default to 1.0 if it cannot be determined
    if (!Object.prototype.hasOwnProperty.call(updateFunctions, version)) {
      version = "1.0";
    }
  }

  let updateFunction = updateFunctions[version];

  while (defined(updateFunction)) {
    if (version === targetVersion) {
      break;
    }
    updateFunction(gltf, options);
    version = gltf.asset.version;
    updateFunction = updateFunctions[version];
  }

  if (!options.keepLegacyExtensions) {
    convertTechniquesToPbr(gltf);
    convertMaterialsCommonToPbr(gltf);
  }

  return gltf;
}

function updateInstanceTechniques(gltf) {
  const materials = gltf.materials;
  for (const materialId in materials) {
    if (Object.prototype.hasOwnProperty.call(materials, materialId)) {
      const material = materials[materialId];
      const instanceTechnique = material.instanceTechnique;
      if (defined(instanceTechnique)) {
        material.technique = instanceTechnique.technique;
        material.values = instanceTechnique.values;
        delete material.instanceTechnique;
      }
    }
  }
}

function setPrimitiveModes(gltf) {
  const meshes = gltf.meshes;
  for (const meshId in meshes) {
    if (Object.prototype.hasOwnProperty.call(meshes, meshId)) {
      const mesh = meshes[meshId];
      const primitives = mesh.primitives;
      if (defined(primitives)) {
        const primitivesLength = primitives.length;
        for (let i = 0; i < primitivesLength; ++i) {
          const primitive = primitives[i];
          const defaultMode = defaultValue(
            primitive.primitive,
            WebGLConstants.TRIANGLES
          );
          primitive.mode = defaultValue(primitive.mode, defaultMode);
          delete primitive.primitive;
        }
      }
    }
  }
}

function updateNodes(gltf) {
  const nodes = gltf.nodes;
  const axis = new Cartesian3();
  const quat = new Quaternion();
  for (const nodeId in nodes) {
    if (Object.prototype.hasOwnProperty.call(nodes, nodeId)) {
      const node = nodes[nodeId];
      if (defined(node.rotation)) {
        const rotation = node.rotation;
        Cartesian3.fromArray(rotation, 0, axis);
        Quaternion.fromAxisAngle(axis, rotation[3], quat);
        node.rotation = [quat.x, quat.y, quat.z, quat.w];
      }
      const instanceSkin = node.instanceSkin;
      if (defined(instanceSkin)) {
        node.skeletons = instanceSkin.skeletons;
        node.skin = instanceSkin.skin;
        node.meshes = instanceSkin.meshes;
        delete node.instanceSkin;
      }
    }
  }
}

function updateAnimations(gltf) {
  const animations = gltf.animations;
  const accessors = gltf.accessors;
  const bufferViews = gltf.bufferViews;
  const buffers = gltf.buffers;
  const updatedAccessors = {};
  const axis = new Cartesian3();
  const quat = new Quaternion();
  for (const animationId in animations) {
    if (Object.prototype.hasOwnProperty.call(animations, animationId)) {
      const animation = animations[animationId];
      const channels = animation.channels;
      const parameters = animation.parameters;
      const samplers = animation.samplers;
      if (defined(channels)) {
        const channelsLength = channels.length;
        for (let i = 0; i < channelsLength; ++i) {
          const channel = channels[i];
          if (channel.target.path === "rotation") {
            const accessorId = parameters[samplers[channel.sampler].output];
            if (defined(updatedAccessors[accessorId])) {
              continue;
            }
            updatedAccessors[accessorId] = true;
            const accessor = accessors[accessorId];
            const bufferView = bufferViews[accessor.bufferView];
            const buffer = buffers[bufferView.buffer];
            const source = buffer.extras._pipeline.source;
            const byteOffset =
              source.byteOffset + bufferView.byteOffset + accessor.byteOffset;
            const componentType = accessor.componentType;
            const count = accessor.count;
            const componentsLength = numberOfComponentsForType(accessor.type);
            const length = accessor.count * componentsLength;
            const typedArray = ComponentDatatype.createArrayBufferView(
              componentType,
              source.buffer,
              byteOffset,
              length
            );

            for (let j = 0; j < count; j++) {
              const offset = j * componentsLength;
              Cartesian3.unpack(typedArray, offset, axis);
              const angle = typedArray[offset + 3];
              Quaternion.fromAxisAngle(axis, angle, quat);
              Quaternion.pack(quat, typedArray, offset);
            }
          }
        }
      }
    }
  }
}

function removeTechniquePasses(gltf) {
  const techniques = gltf.techniques;
  for (const techniqueId in techniques) {
    if (Object.prototype.hasOwnProperty.call(techniques, techniqueId)) {
      const technique = techniques[techniqueId];
      const passes = technique.passes;
      if (defined(passes)) {
        const passName = defaultValue(technique.pass, "defaultPass");
        if (Object.prototype.hasOwnProperty.call(passes, passName)) {
          const pass = passes[passName];
          const instanceProgram = pass.instanceProgram;
          technique.attributes = defaultValue(
            technique.attributes,
            instanceProgram.attributes
          );
          technique.program = defaultValue(
            technique.program,
            instanceProgram.program
          );
          technique.uniforms = defaultValue(
            technique.uniforms,
            instanceProgram.uniforms
          );
          technique.states = defaultValue(technique.states, pass.states);
        }
        delete technique.passes;
        delete technique.pass;
      }
    }
  }
}

function glTF08to10(gltf) {
  if (!defined(gltf.asset)) {
    gltf.asset = {};
  }
  const asset = gltf.asset;
  asset.version = "1.0";
  // Profile should be an object, not a string
  if (typeof asset.profile === "string") {
    const split = asset.profile.split(" ");
    asset.profile = {
      api: split[0],
      version: split[1],
    };
  } else {
    asset.profile = {};
  }

  // Version property should be in asset, not on the root element
  if (defined(gltf.version)) {
    delete gltf.version;
  }
  // material.instanceTechnique properties should be directly on the material
  updateInstanceTechniques(gltf);
  // primitive.primitive should be primitive.mode
  setPrimitiveModes(gltf);
  // Node rotation should be quaternion, not axis-angle
  // node.instanceSkin is deprecated
  updateNodes(gltf);
  // Animations that target rotations should be quaternion, not axis-angle
  updateAnimations(gltf);
  // technique.pass and techniques.passes are deprecated
  removeTechniquePasses(gltf);
  // gltf.allExtensions -> extensionsUsed
  if (defined(gltf.allExtensions)) {
    gltf.extensionsUsed = gltf.allExtensions;
    delete gltf.allExtensions;
  }
  // gltf.lights -> khrMaterialsCommon.lights
  if (defined(gltf.lights)) {
    const extensions = defaultValue(gltf.extensions, {});
    gltf.extensions = extensions;
    const materialsCommon = defaultValue(extensions.KHR_materials_common, {});
    extensions.KHR_materials_common = materialsCommon;
    materialsCommon.lights = gltf.lights;
    delete gltf.lights;
    addExtensionsUsed(gltf, "KHR_materials_common");
  }
}

function removeAnimationSamplersIndirection(gltf) {
  const animations = gltf.animations;
  for (const animationId in animations) {
    if (Object.prototype.hasOwnProperty.call(animations, animationId)) {
      const animation = animations[animationId];
      const parameters = animation.parameters;
      if (defined(parameters)) {
        const samplers = animation.samplers;
        for (const samplerId in samplers) {
          if (Object.prototype.hasOwnProperty.call(samplers, samplerId)) {
            const sampler = samplers[samplerId];
            sampler.input = parameters[sampler.input];
            sampler.output = parameters[sampler.output];
          }
        }
        delete animation.parameters;
      }
    }
  }
}

function objectToArray(object, mapping) {
  const array = [];
  for (const id in object) {
    if (Object.prototype.hasOwnProperty.call(object, id)) {
      const value = object[id];
      mapping[id] = array.length;
      array.push(value);
      if (!defined(value.name)) {
        value.name = id;
      }
    }
  }
  return array;
}

function objectsToArrays(gltf) {
  let i;
  const globalMapping = {
    accessors: {},
    animations: {},
    buffers: {},
    bufferViews: {},
    cameras: {},
    images: {},
    materials: {},
    meshes: {},
    nodes: {},
    programs: {},
    samplers: {},
    scenes: {},
    shaders: {},
    skins: {},
    textures: {},
    techniques: {},
  };

  // Map joint names to id names
  let jointName;
  const jointNameToId = {};
  const nodes = gltf.nodes;
  for (const id in nodes) {
    if (Object.prototype.hasOwnProperty.call(nodes, id)) {
      jointName = nodes[id].jointName;
      if (defined(jointName)) {
        jointNameToId[jointName] = id;
      }
    }
  }

  // Convert top level objects to arrays
  for (const topLevelId in gltf) {
    if (
      Object.prototype.hasOwnProperty.call(gltf, topLevelId) &&
      defined(globalMapping[topLevelId])
    ) {
      const objectMapping = {};
      const object = gltf[topLevelId];
      gltf[topLevelId] = objectToArray(object, objectMapping);
      globalMapping[topLevelId] = objectMapping;
    }
  }

  // Remap joint names to array indexes
  for (jointName in jointNameToId) {
    if (Object.prototype.hasOwnProperty.call(jointNameToId, jointName)) {
      jointNameToId[jointName] = globalMapping.nodes[jointNameToId[jointName]];
    }
  }

  // Fix references
  if (defined(gltf.scene)) {
    gltf.scene = globalMapping.scenes[gltf.scene];
  }
  ForEach.bufferView(gltf, function (bufferView) {
    if (defined(bufferView.buffer)) {
      bufferView.buffer = globalMapping.buffers[bufferView.buffer];
    }
  });
  ForEach.accessor(gltf, function (accessor) {
    if (defined(accessor.bufferView)) {
      accessor.bufferView = globalMapping.bufferViews[accessor.bufferView];
    }
  });
  ForEach.shader(gltf, function (shader) {
    const extensions = shader.extensions;
    if (defined(extensions)) {
      const binaryGltf = extensions.KHR_binary_glTF;
      if (defined(binaryGltf)) {
        shader.bufferView = globalMapping.bufferViews[binaryGltf.bufferView];
        delete extensions.KHR_binary_glTF;
      }
      if (Object.keys(extensions).length === 0) {
        delete shader.extensions;
      }
    }
  });
  ForEach.program(gltf, function (program) {
    if (defined(program.vertexShader)) {
      program.vertexShader = globalMapping.shaders[program.vertexShader];
    }
    if (defined(program.fragmentShader)) {
      program.fragmentShader = globalMapping.shaders[program.fragmentShader];
    }
  });
  ForEach.technique(gltf, function (technique) {
    if (defined(technique.program)) {
      technique.program = globalMapping.programs[technique.program];
    }
    ForEach.techniqueParameter(technique, function (parameter) {
      if (defined(parameter.node)) {
        parameter.node = globalMapping.nodes[parameter.node];
      }
      const value = parameter.value;
      if (typeof value === "string") {
        parameter.value = {
          index: globalMapping.textures[value],
        };
      }
    });
  });
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      if (defined(primitive.indices)) {
        primitive.indices = globalMapping.accessors[primitive.indices];
      }
      ForEach.meshPrimitiveAttribute(
        primitive,
        function (accessorId, semantic) {
          primitive.attributes[semantic] = globalMapping.accessors[accessorId];
        }
      );
      if (defined(primitive.material)) {
        primitive.material = globalMapping.materials[primitive.material];
      }
    });
  });
  ForEach.node(gltf, function (node) {
    let children = node.children;
    if (defined(children)) {
      const childrenLength = children.length;
      for (i = 0; i < childrenLength; ++i) {
        children[i] = globalMapping.nodes[children[i]];
      }
    }
    if (defined(node.meshes)) {
      // Split out meshes on nodes
      const meshes = node.meshes;
      const meshesLength = meshes.length;
      if (meshesLength > 0) {
        node.mesh = globalMapping.meshes[meshes[0]];
        for (i = 1; i < meshesLength; ++i) {
          const meshNode = {
            mesh: globalMapping.meshes[meshes[i]],
          };
          const meshNodeId = addToArray(gltf.nodes, meshNode);
          if (!defined(children)) {
            children = [];
            node.children = children;
          }
          children.push(meshNodeId);
        }
      }
      delete node.meshes;
    }
    if (defined(node.camera)) {
      node.camera = globalMapping.cameras[node.camera];
    }
    if (defined(node.skin)) {
      node.skin = globalMapping.skins[node.skin];
    }
    if (defined(node.skeletons)) {
      // Assign skeletons to skins
      const skeletons = node.skeletons;
      const skeletonsLength = skeletons.length;
      if (skeletonsLength > 0 && defined(node.skin)) {
        const skin = gltf.skins[node.skin];
        skin.skeleton = globalMapping.nodes[skeletons[0]];
      }
      delete node.skeletons;
    }
    if (defined(node.jointName)) {
      delete node.jointName;
    }
  });
  ForEach.skin(gltf, function (skin) {
    if (defined(skin.inverseBindMatrices)) {
      skin.inverseBindMatrices =
        globalMapping.accessors[skin.inverseBindMatrices];
    }
    const jointNames = skin.jointNames;
    if (defined(jointNames)) {
      const joints = [];
      const jointNamesLength = jointNames.length;
      for (i = 0; i < jointNamesLength; ++i) {
        joints[i] = jointNameToId[jointNames[i]];
      }
      skin.joints = joints;
      delete skin.jointNames;
    }
  });
  ForEach.scene(gltf, function (scene) {
    const sceneNodes = scene.nodes;
    if (defined(sceneNodes)) {
      const sceneNodesLength = sceneNodes.length;
      for (i = 0; i < sceneNodesLength; ++i) {
        sceneNodes[i] = globalMapping.nodes[sceneNodes[i]];
      }
    }
  });
  ForEach.animation(gltf, function (animation) {
    const samplerMapping = {};
    animation.samplers = objectToArray(animation.samplers, samplerMapping);
    ForEach.animationSampler(animation, function (sampler) {
      sampler.input = globalMapping.accessors[sampler.input];
      sampler.output = globalMapping.accessors[sampler.output];
    });
    ForEach.animationChannel(animation, function (channel) {
      channel.sampler = samplerMapping[channel.sampler];
      const target = channel.target;
      if (defined(target)) {
        target.node = globalMapping.nodes[target.id];
        delete target.id;
      }
    });
  });
  ForEach.material(gltf, function (material) {
    if (defined(material.technique)) {
      material.technique = globalMapping.techniques[material.technique];
    }
    ForEach.materialValue(material, function (value, name) {
      if (typeof value === "string") {
        material.values[name] = {
          index: globalMapping.textures[value],
        };
      }
    });
    const extensions = material.extensions;
    if (defined(extensions)) {
      const materialsCommon = extensions.KHR_materials_common;
      if (defined(materialsCommon) && defined(materialsCommon.values)) {
        ForEach.materialValue(materialsCommon, function (value, name) {
          if (typeof value === "string") {
            materialsCommon.values[name] = {
              index: globalMapping.textures[value],
            };
          }
        });
      }
    }
  });
  ForEach.image(gltf, function (image) {
    const extensions = image.extensions;
    if (defined(extensions)) {
      const binaryGltf = extensions.KHR_binary_glTF;
      if (defined(binaryGltf)) {
        image.bufferView = globalMapping.bufferViews[binaryGltf.bufferView];
        image.mimeType = binaryGltf.mimeType;
        delete extensions.KHR_binary_glTF;
      }
      if (Object.keys(extensions).length === 0) {
        delete image.extensions;
      }
    }
  });
  ForEach.texture(gltf, function (texture) {
    if (defined(texture.sampler)) {
      texture.sampler = globalMapping.samplers[texture.sampler];
    }
    if (defined(texture.source)) {
      texture.source = globalMapping.images[texture.source];
    }
  });
}

function removeAnimationSamplerNames(gltf) {
  ForEach.animation(gltf, function (animation) {
    ForEach.animationSampler(animation, function (sampler) {
      delete sampler.name;
    });
  });
}

function removeEmptyArrays(gltf) {
  for (const topLevelId in gltf) {
    if (Object.prototype.hasOwnProperty.call(gltf, topLevelId)) {
      const array = gltf[topLevelId];
      if (Array.isArray(array) && array.length === 0) {
        delete gltf[topLevelId];
      }
    }
  }
  ForEach.node(gltf, function (node) {
    if (defined(node.children) && node.children.length === 0) {
      delete node.children;
    }
  });
}

function stripAsset(gltf) {
  const asset = gltf.asset;
  delete asset.profile;
  delete asset.premultipliedAlpha;
}

const knownExtensions = {
  CESIUM_RTC: true,
  KHR_materials_common: true,
  WEB3D_quantized_attributes: true,
};
function requireKnownExtensions(gltf) {
  const extensionsUsed = gltf.extensionsUsed;
  gltf.extensionsRequired = defaultValue(gltf.extensionsRequired, []);
  if (defined(extensionsUsed)) {
    const extensionsUsedLength = extensionsUsed.length;
    for (let i = 0; i < extensionsUsedLength; ++i) {
      const extension = extensionsUsed[i];
      if (defined(knownExtensions[extension])) {
        gltf.extensionsRequired.push(extension);
      }
    }
  }
}

function removeBufferType(gltf) {
  ForEach.buffer(gltf, function (buffer) {
    delete buffer.type;
  });
}

function removeTextureProperties(gltf) {
  ForEach.texture(gltf, function (texture) {
    delete texture.format;
    delete texture.internalFormat;
    delete texture.target;
    delete texture.type;
  });
}

function requireAttributeSetIndex(gltf) {
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      ForEach.meshPrimitiveAttribute(
        primitive,
        function (accessorId, semantic) {
          if (semantic === "TEXCOORD") {
            primitive.attributes.TEXCOORD_0 = accessorId;
          } else if (semantic === "COLOR") {
            primitive.attributes.COLOR_0 = accessorId;
          }
        }
      );
      delete primitive.attributes.TEXCOORD;
      delete primitive.attributes.COLOR;
    });
  });
  ForEach.technique(gltf, function (technique) {
    ForEach.techniqueParameter(technique, function (parameter) {
      const semantic = parameter.semantic;
      if (defined(semantic)) {
        if (semantic === "TEXCOORD") {
          parameter.semantic = "TEXCOORD_0";
        } else if (semantic === "COLOR") {
          parameter.semantic = "COLOR_0";
        }
      }
    });
  });
}

const knownSemantics = {
  POSITION: true,
  NORMAL: true,
  TANGENT: true,
};
const indexedSemantics = {
  COLOR: "COLOR",
  JOINT: "JOINTS",
  JOINTS: "JOINTS",
  TEXCOORD: "TEXCOORD",
  WEIGHT: "WEIGHTS",
  WEIGHTS: "WEIGHTS",
};
function underscoreApplicationSpecificSemantics(gltf) {
  const mappedSemantics = {};
  ForEach.mesh(gltf, function (mesh) {
    ForEach.meshPrimitive(mesh, function (primitive) {
      /*eslint-disable no-unused-vars*/
      ForEach.meshPrimitiveAttribute(
        primitive,
        function (accessorId, semantic) {
          if (semantic.charAt(0) !== "_") {
            const setIndex = semantic.search(/_[0-9]+/g);
            let strippedSemantic = semantic;
            let suffix = "_0";
            if (setIndex >= 0) {
              strippedSemantic = semantic.substring(0, setIndex);
              suffix = semantic.substring(setIndex);
            }
            let newSemantic;
            const indexedSemantic = indexedSemantics[strippedSemantic];
            if (defined(indexedSemantic)) {
              newSemantic = indexedSemantic + suffix;
              mappedSemantics[semantic] = newSemantic;
            } else if (!defined(knownSemantics[strippedSemantic])) {
              newSemantic = `_${semantic}`;
              mappedSemantics[semantic] = newSemantic;
            }
          }
        }
      );
      for (const semantic in mappedSemantics) {
        if (Object.prototype.hasOwnProperty.call(mappedSemantics, semantic)) {
          const mappedSemantic = mappedSemantics[semantic];
          const accessorId = primitive.attributes[semantic];
          if (defined(accessorId)) {
            delete primitive.attributes[semantic];
            primitive.attributes[mappedSemantic] = accessorId;
          }
        }
      }
    });
  });
  ForEach.technique(gltf, function (technique) {
    ForEach.techniqueParameter(technique, function (parameter) {
      const mappedSemantic = mappedSemantics[parameter.semantic];
      if (defined(mappedSemantic)) {
        parameter.semantic = mappedSemantic;
      }
    });
  });
}

function clampCameraParameters(gltf) {
  ForEach.camera(gltf, function (camera) {
    const perspective = camera.perspective;
    if (defined(perspective)) {
      const aspectRatio = perspective.aspectRatio;
      if (defined(aspectRatio) && aspectRatio === 0.0) {
        delete perspective.aspectRatio;
      }
      const yfov = perspective.yfov;
      if (defined(yfov) && yfov === 0.0) {
        perspective.yfov = 1.0;
      }
    }
  });
}

function computeAccessorByteStride(gltf, accessor) {
  return defined(accessor.byteStride) && accessor.byteStride !== 0
    ? accessor.byteStride
    : getAccessorByteStride(gltf, accessor);
}

function requireByteLength(gltf) {
  ForEach.buffer(gltf, function (buffer) {
    if (!defined(buffer.byteLength)) {
      buffer.byteLength = buffer.extras._pipeline.source.length;
    }
  });
  ForEach.accessor(gltf, function (accessor) {
    const bufferViewId = accessor.bufferView;
    if (defined(bufferViewId)) {
      const bufferView = gltf.bufferViews[bufferViewId];
      const accessorByteStride = computeAccessorByteStride(gltf, accessor);
      const accessorByteEnd =
        accessor.byteOffset + accessor.count * accessorByteStride;
      bufferView.byteLength = Math.max(
        defaultValue(bufferView.byteLength, 0),
        accessorByteEnd
      );
    }
  });
}

function moveByteStrideToBufferView(gltf) {
  let i;
  let j;
  let bufferView;
  const bufferViews = gltf.bufferViews;

  const bufferViewHasVertexAttributes = {};
  ForEach.accessorContainingVertexAttributeData(gltf, function (accessorId) {
    const accessor = gltf.accessors[accessorId];
    if (defined(accessor.bufferView)) {
      bufferViewHasVertexAttributes[accessor.bufferView] = true;
    }
  });

  // Map buffer views to a list of accessors
  const bufferViewMap = {};
  ForEach.accessor(gltf, function (accessor) {
    if (defined(accessor.bufferView)) {
      bufferViewMap[accessor.bufferView] = defaultValue(
        bufferViewMap[accessor.bufferView],
        []
      );
      bufferViewMap[accessor.bufferView].push(accessor);
    }
  });

  // Split accessors with different byte strides
  for (const bufferViewId in bufferViewMap) {
    if (Object.prototype.hasOwnProperty.call(bufferViewMap, bufferViewId)) {
      bufferView = bufferViews[bufferViewId];
      const accessors = bufferViewMap[bufferViewId];
      accessors.sort(function (a, b) {
        return a.byteOffset - b.byteOffset;
      });
      let currentByteOffset = 0;
      let currentIndex = 0;
      const accessorsLength = accessors.length;
      for (i = 0; i < accessorsLength; ++i) {
        let accessor = accessors[i];
        const accessorByteStride = computeAccessorByteStride(gltf, accessor);
        const accessorByteOffset = accessor.byteOffset;
        const accessorByteLength = accessor.count * accessorByteStride;
        delete accessor.byteStride;

        const hasNextAccessor = i < accessorsLength - 1;
        const nextAccessorByteStride = hasNextAccessor
          ? computeAccessorByteStride(gltf, accessors[i + 1])
          : undefined;
        if (accessorByteStride !== nextAccessorByteStride) {
          const newBufferView = clone(bufferView, true);
          if (bufferViewHasVertexAttributes[bufferViewId]) {
            newBufferView.byteStride = accessorByteStride;
          }
          newBufferView.byteOffset += currentByteOffset;
          newBufferView.byteLength =
            accessorByteOffset + accessorByteLength - currentByteOffset;
          const newBufferViewId = addToArray(bufferViews, newBufferView);
          for (j = currentIndex; j <= i; ++j) {
            accessor = accessors[j];
            accessor.bufferView = newBufferViewId;
            accessor.byteOffset = accessor.byteOffset - currentByteOffset;
          }
          // Set current byte offset to next accessor's byte offset
          currentByteOffset = hasNextAccessor
            ? accessors[i + 1].byteOffset
            : undefined;
          currentIndex = i + 1;
        }
      }
    }
  }

  // Remove unused buffer views
  removeUnusedElements(gltf, ["accessor", "bufferView", "buffer"]);
}

function requirePositionAccessorMinMax(gltf) {
  ForEach.accessorWithSemantic(gltf, "POSITION", function (accessorId) {
    const accessor = gltf.accessors[accessorId];
    if (!defined(accessor.min) || !defined(accessor.max)) {
      const minMax = findAccessorMinMax(gltf, accessor);
      accessor.min = minMax.min;
      accessor.max = minMax.max;
    }
  });
}

function isNodeEmpty(node) {
  return (
    (!defined(node.children) || node.children.length === 0) &&
    (!defined(node.meshes) || node.meshes.length === 0) &&
    !defined(node.camera) &&
    !defined(node.skin) &&
    !defined(node.skeletons) &&
    !defined(node.jointName) &&
    (!defined(node.translation) ||
      Cartesian3.fromArray(node.translation).equals(Cartesian3.ZERO)) &&
    (!defined(node.scale) ||
      Cartesian3.fromArray(node.scale).equals(new Cartesian3(1.0, 1.0, 1.0))) &&
    (!defined(node.rotation) ||
      Cartesian4.fromArray(node.rotation).equals(
        new Cartesian4(0.0, 0.0, 0.0, 1.0)
      )) &&
    (!defined(node.matrix) ||
      Matrix4.fromColumnMajorArray(node.matrix).equals(Matrix4.IDENTITY)) &&
    !defined(node.extensions) &&
    !defined(node.extras)
  );
}

function deleteNode(gltf, nodeId) {
  // Remove from list of nodes in scene
  ForEach.scene(gltf, function (scene) {
    const sceneNodes = scene.nodes;
    if (defined(sceneNodes)) {
      const sceneNodesLength = sceneNodes.length;
      for (let i = sceneNodesLength; i >= 0; --i) {
        if (sceneNodes[i] === nodeId) {
          sceneNodes.splice(i, 1);
          return;
        }
      }
    }
  });

  // Remove parent node's reference to this node, and delete the parent if also empty
  ForEach.node(gltf, function (parentNode, parentNodeId) {
    if (defined(parentNode.children)) {
      const index = parentNode.children.indexOf(nodeId);
      if (index > -1) {
        parentNode.children.splice(index, 1);

        if (isNodeEmpty(parentNode)) {
          deleteNode(gltf, parentNodeId);
        }
      }
    }
  });

  delete gltf.nodes[nodeId];
}

function removeEmptyNodes(gltf) {
  ForEach.node(gltf, function (node, nodeId) {
    if (isNodeEmpty(node)) {
      deleteNode(gltf, nodeId);
    }
  });

  return gltf;
}

function requireAnimationAccessorMinMax(gltf) {
  ForEach.animation(gltf, function (animation) {
    ForEach.animationSampler(animation, function (sampler) {
      const accessor = gltf.accessors[sampler.input];
      if (!defined(accessor.min) || !defined(accessor.max)) {
        const minMax = findAccessorMinMax(gltf, accessor);
        accessor.min = minMax.min;
        accessor.max = minMax.max;
      }
    });
  });
}

function validatePresentAccessorMinMax(gltf) {
  ForEach.accessor(gltf, function (accessor) {
    if (defined(accessor.min) || defined(accessor.max)) {
      const minMax = findAccessorMinMax(gltf, accessor);
      if (defined(accessor.min)) {
        accessor.min = minMax.min;
      }
      if (defined(accessor.max)) {
        accessor.max = minMax.max;
      }
    }
  });
}

function glTF10to20(gltf) {
  gltf.asset = defaultValue(gltf.asset, {});
  gltf.asset.version = "2.0";
  // material.instanceTechnique properties should be directly on the material. instanceTechnique is a gltf 0.8 property but is seen in some 1.0 models.
  updateInstanceTechniques(gltf);
  // animation.samplers now refers directly to accessors and animation.parameters should be removed
  removeAnimationSamplersIndirection(gltf);
  // Remove empty nodes and re-assign referencing indices
  removeEmptyNodes(gltf);
  // Top-level objects are now arrays referenced by index instead of id
  objectsToArrays(gltf);
  // Animation.sampler objects cannot have names
  removeAnimationSamplerNames(gltf);
  // asset.profile no longer exists
  stripAsset(gltf);
  // Move known extensions from extensionsUsed to extensionsRequired
  requireKnownExtensions(gltf);
  // bufferView.byteLength and buffer.byteLength are required
  requireByteLength(gltf);
  // byteStride moved from accessor to bufferView
  moveByteStrideToBufferView(gltf);
  // accessor.min and accessor.max must be defined for accessors containing POSITION attributes
  requirePositionAccessorMinMax(gltf);
  // An animation sampler's input accessor must have min and max properties defined
  requireAnimationAccessorMinMax(gltf);
  // When an acccessor has a min- or max, then it is recomputed, to capture the actual
  // value, and not use the (possibly imprecise) value from the input
  validatePresentAccessorMinMax(gltf);
  // buffer.type is unnecessary and should be removed
  removeBufferType(gltf);
  // Remove format, internalFormat, target, and type
  removeTextureProperties(gltf);
  // TEXCOORD and COLOR attributes must be written with a set index (TEXCOORD_#)
  requireAttributeSetIndex(gltf);
  // Add underscores to application-specific parameters
  underscoreApplicationSpecificSemantics(gltf);
  // Accessors referenced by JOINTS_0 and WEIGHTS_0 attributes must have correct component types
  updateAccessorComponentTypes(gltf);
  // Clamp camera parameters
  clampCameraParameters(gltf);
  // Move legacy technique render states to material properties and add KHR_blend extension blending functions
  moveTechniqueRenderStates(gltf);
  // Add material techniques to KHR_techniques_webgl extension, removing shaders, programs, and techniques
  moveTechniquesToExtension(gltf);
  // Remove empty arrays
  removeEmptyArrays(gltf);
}

// It's not possible to upgrade glTF 1.0 shaders to 2.0 PBR materials in a generic way,
// but we can look for certain uniform names that are commonly found in glTF 1.0 assets
// and create PBR materials out of those.
const baseColorTextureNames = ["u_tex", "u_diffuse"];
const baseColorFactorNames = ["u_diffuse"];

function initializePbrMaterial(material) {
  material.pbrMetallicRoughness = defined(material.pbrMetallicRoughness)
    ? material.pbrMetallicRoughness
    : {};

  material.pbrMetallicRoughness.roughnessFactor = 1.0;
  material.pbrMetallicRoughness.metallicFactor = 0.0;
}

function isTexture(value) {
  return defined(value.index);
}

function isVec4(value) {
  return Array.isArray(value) && value.length === 4;
}

function srgbToLinear(srgb) {
  const linear = new Array(4);
  linear[3] = srgb[3];

  for (let i = 0; i < 3; i++) {
    const c = srgb[i];
    if (c <= 0.04045) {
      // eslint-disable-next-line no-loss-of-precision
      linear[i] = srgb[i] * 0.07739938080495356037151702786378;
    } else {
      linear[i] = Math.pow(
        // eslint-disable-next-line no-loss-of-precision
        (c + 0.055) * 0.94786729857819905213270142180095,
        2.4
      );
    }
  }

  return linear;
}

function convertTechniquesToPbr(gltf) {
  // Future work: convert other values like emissive, specular, etc. Only handling diffuse right now.
  ForEach.material(gltf, function (material) {
    ForEach.materialValue(material, function (value, name) {
      if (baseColorTextureNames.indexOf(name) !== -1 && isTexture(value)) {
        initializePbrMaterial(material);
        material.pbrMetallicRoughness.baseColorTexture = value;
      } else if (baseColorFactorNames.indexOf(name) !== -1 && isVec4(value)) {
        initializePbrMaterial(material);
        material.pbrMetallicRoughness.baseColorFactor = srgbToLinear(value);
      }
    });
  });

  removeExtension(gltf, "KHR_techniques_webgl");
  removeExtension(gltf, "KHR_blend");
}

function convertMaterialsCommonToPbr(gltf) {
  // Future work: convert KHR_materials_common lights to KHR_lights_punctual
  ForEach.material(gltf, function (material) {
    const materialsCommon = defaultValue(
      material.extensions,
      defaultValue.EMPTY_OBJECT
    ).KHR_materials_common;

    if (defined(materialsCommon)) {
      const technique = materialsCommon.technique;
      if (technique === "CONSTANT") {
        // Add the KHR_materials_unlit extension
        addExtensionsUsed(gltf, "KHR_materials_unlit");
        material.extensions = defined(material.extensions)
          ? material.extensions
          : {};
        material.extensions["KHR_materials_unlit"] = {};
      }

      const values = defined(materialsCommon.values)
        ? materialsCommon.values
        : {};

      const ambient = values.ambient;
      const diffuse = values.diffuse;
      const emission = values.emission;
      const transparency = values.transparency;

      // These actually exist on the extension object, not the values object despite what's shown in the spec
      const doubleSided = materialsCommon.doubleSided;
      const transparent = materialsCommon.transparent;

      // Ignore specular and shininess for now because the conversion to PBR
      // isn't straightforward and depends on the technique
      initializePbrMaterial(material);

      if (defined(ambient)) {
        if (isVec4(ambient)) {
          material.emissiveFactor = ambient.slice(0, 3);
        } else if (isTexture(ambient)) {
          material.emissiveTexture = ambient;
        }
      }

      if (defined(diffuse)) {
        if (isVec4(diffuse)) {
          material.pbrMetallicRoughness.baseColorFactor = srgbToLinear(diffuse);
        } else if (isTexture(diffuse)) {
          material.pbrMetallicRoughness.baseColorTexture = diffuse;
        }
      }

      if (defined(doubleSided)) {
        material.doubleSided = doubleSided;
      }

      if (defined(emission)) {
        if (isVec4(emission)) {
          material.emissiveFactor = emission.slice(0, 3);
        } else if (isTexture(emission)) {
          material.emissiveTexture = emission;
        }
      }

      if (defined(transparency)) {
        if (defined(material.pbrMetallicRoughness.baseColorFactor)) {
          material.pbrMetallicRoughness.baseColorFactor[3] *= transparency;
        } else {
          material.pbrMetallicRoughness.baseColorFactor = [
            1,
            1,
            1,
            transparency,
          ];
        }
      }

      if (defined(transparent)) {
        material.alphaMode = transparent ? "BLEND" : "OPAQUE";
      }
    }
  });

  removeExtension(gltf, "KHR_materials_common");
}

export default updateVersion;
