import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import ImageBasedLighting from "./ImageBasedLighting.js";
import Matrix4 from "../Core/Matrix4.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import Transforms from "../Core/Transforms.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ForEach from "./GltfPipeline/ForEach.js";
import Model from "./Model.js";
import ModelInstance from "./ModelInstance.js";
import ModelUtility from "./ModelUtility.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";

const LoadState = {
  NEEDS_LOAD: 0,
  LOADING: 1,
  LOADED: 2,
  FAILED: 3,
};

/**
 * A 3D model instance collection. All instances reference the same underlying model, but have unique
 * per-instance properties like model matrix, pick id, etc.
 *
 * Instances are rendered relative-to-center and for best results instances should be positioned close to one another.
 * Otherwise there may be precision issues if, for example, instances are placed on opposite sides of the globe.
 *
 * @alias ModelInstanceCollection
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Object[]} [options.instances] An array of instances, where each instance contains a modelMatrix and optional batchId when options.batchTable is defined.
 * @param {Cesium3DTileBatchTable} [options.batchTable] The batch table of the instanced 3D Tile.
 * @param {Resource|String} [options.url] The url to the .gltf file.
 * @param {Object} [options.requestType] The request type, used for request prioritization
 * @param {Object|ArrayBuffer|Uint8Array} [options.gltf] A glTF JSON object, or a binary glTF buffer.
 * @param {Resource|String} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.dynamic=false] Hint if instance model matrices will be updated frequently.
 * @param {Boolean} [options.show=true] Determines if the collection will be shown.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each instance is pickable with {@link Scene#pick}.
 * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the collection casts or receives shadows from light sources.
 * @param {Cartesian3} [options.lightColor] The light color when shading models. When <code>undefined</code> the scene's light color is used instead.
 * @param {ImageBasedLighting} [options.imageBasedLighting] The properties for managing image-based lighting for this tileset.
 * @param {Cartesian2} [options.imageBasedLightingFactor=new Cartesian2(1.0, 1.0)] Scales diffuse and specular image-based lighting from the earth, sky, atmosphere and star skybox. Deprecated in Cesium 1.92, will be removed in Cesium 1.94.
 * @param {Number} [options.luminanceAtZenith=0.2] The sun's luminance at the zenith in kilo candela per meter squared to use for this model's procedural environment map. Deprecated in Cesium 1.92, will be removed in Cesium 1.94.
 * @param {Cartesian3[]} [options.sphericalHarmonicCoefficients] The third order spherical harmonic coefficients used for the diffuse color of image-based lighting. Deprecated in Cesium 1.92, will be removed in Cesium 1.94.
 * @param {String} [options.specularEnvironmentMaps] A URL to a KTX2 file that contains a cube map of the specular lighting and the convoluted specular mipmaps. Deprecated in Cesium 1.92, will be removed in Cesium 1.94.
 * @param {Boolean} [options.backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the glTF material's doubleSided property; when false, back face culling is disabled.
 * @param {Boolean} [options.showCreditsOnScreen=false] Whether to display the credits of this model on screen.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for the collection.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the instances in wireframe.
 * @exception {DeveloperError} Must specify either <options.gltf> or <options.url>, but not both.
 * @exception {DeveloperError} Shader program cannot be optimized for instancing. Parameters cannot have any of the following semantics: MODEL, MODELINVERSE, MODELVIEWINVERSE, MODELVIEWPROJECTIONINVERSE, MODELINVERSETRANSPOSE.
 *
 * @private
 */
function ModelInstanceCollection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.gltf) && !defined(options.url)) {
    throw new DeveloperError("Either options.gltf or options.url is required.");
  }

  if (defined(options.gltf) && defined(options.url)) {
    throw new DeveloperError(
      "Cannot pass in both options.gltf and options.url."
    );
  }
  //>>includeEnd('debug');

  this.show = defaultValue(options.show, true);

  this._instancingSupported = false;
  this._dynamic = defaultValue(options.dynamic, false);
  this._allowPicking = defaultValue(options.allowPicking, true);
  this._ready = false;
  this._readyPromise = defer();
  this._state = LoadState.NEEDS_LOAD;
  this._dirty = false;

  // Undocumented options
  this._cull = defaultValue(options.cull, true);
  this._opaquePass = defaultValue(options.opaquePass, Pass.OPAQUE);

  this._instances = createInstances(this, options.instances);

  // When the model instance collection is backed by an i3dm tile,
  // use its batch table resources to modify the shaders, attributes, and uniform maps.
  this._batchTable = options.batchTable;

  this._model = undefined;
  this._vertexBufferTypedArray = undefined; // Hold onto the vertex buffer contents when dynamic is true
  this._vertexBuffer = undefined;
  this._batchIdBuffer = undefined;
  this._instancedUniformsByProgram = undefined;

  this._drawCommands = [];
  this._modelCommands = undefined;

  this._renderStates = undefined;
  this._disableCullingRenderStates = undefined;

  this._boundingSphere = createBoundingSphere(this);
  this._center = Cartesian3.clone(this._boundingSphere.center);
  this._rtcTransform = new Matrix4();
  this._rtcModelView = new Matrix4(); // Holds onto uniform

  this._mode = undefined;

  this.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._modelMatrix = Matrix4.clone(this.modelMatrix);

  // Passed on to Model
  this._url = Resource.createIfNeeded(options.url);
  this._requestType = options.requestType;
  this._gltf = options.gltf;
  this._basePath = Resource.createIfNeeded(options.basePath);
  this._asynchronous = options.asynchronous;
  this._incrementallyLoadTextures = options.incrementallyLoadTextures;
  this._upAxis = options.upAxis; // Undocumented option
  this._forwardAxis = options.forwardAxis; // Undocumented option

  this.shadows = defaultValue(options.shadows, ShadowMode.ENABLED);
  this._shadows = this.shadows;

  this._pickIdLoaded = options.pickIdLoaded;

  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );
  this._debugShowBoundingVolume = false;

  this.debugWireframe = defaultValue(options.debugWireframe, false);
  this._debugWireframe = false;

  if (defined(options.imageBasedLighting)) {
    this._imageBasedLighting = options.imageBasedLighting;
    this._shouldDestroyImageBasedLighting = false;
  } else {
    // Create image-based lighting from the old constructor parameters.
    this._imageBasedLighting = new ImageBasedLighting({
      imageBasedLightingFactor: options.imageBasedLightingFactor,
      luminanceAtZenith: options.luminanceAtZenith,
      sphericalHarmonicCoefficients: options.sphericalHarmonicCoefficients,
      specularEnvironmentMaps: options.specularEnvironmentMaps,
    });
    this._shouldDestroyImageBasedLighting = true;
  }

  this.backFaceCulling = defaultValue(options.backFaceCulling, true);
  this._backFaceCulling = this.backFaceCulling;
  this.showCreditsOnScreen = defaultValue(options.showCreditsOnScreen, false);
}

Object.defineProperties(ModelInstanceCollection.prototype, {
  allowPicking: {
    get: function () {
      return this._allowPicking;
    },
  },
  length: {
    get: function () {
      return this._instances.length;
    },
  },
  activeAnimations: {
    get: function () {
      return this._model.activeAnimations;
    },
  },
  ready: {
    get: function () {
      return this._ready;
    },
  },
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
  imageBasedLighting: {
    get: function () {
      return this._imageBasedLighting;
    },
    set: function (value) {
      if (value !== this._imageBasedLighting) {
        if (
          this._shouldDestroyImageBasedLighting &&
          !this._imageBasedLighting.isDestroyed()
        ) {
          this._imageBasedLighting.destroy();
        }
        this._imageBasedLighting = value;
        this._shouldDestroyImageBasedLighting = false;
      }
    },
  },
  imageBasedLightingFactor: {
    get: function () {
      return this._imageBasedLighting.imageBasedLightingFactor;
    },
    set: function (value) {
      this._imageBasedLighting.imageBasedLightingFactor = value;
    },
  },
  luminanceAtZenith: {
    get: function () {
      return this._imageBasedLighting.luminanceAtZenith;
    },
    set: function (value) {
      this._imageBasedLighting.luminanceAtZenith = value;
    },
  },
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._imageBasedLighting.sphericalHarmonicCoefficients;
    },
    set: function (value) {
      this._imageBasedLighting.sphericalHarmonicCoefficients = value;
    },
  },
  specularEnvironmentMaps: {
    get: function () {
      return this._imageBasedLighting.specularEnvironmentMaps;
    },
    set: function (value) {
      this._imageBasedLighting.specularEnvironmentMaps = value;
    },
  },
});

function createInstances(collection, instancesOptions) {
  instancesOptions = defaultValue(instancesOptions, []);
  const length = instancesOptions.length;
  const instances = new Array(length);
  for (let i = 0; i < length; ++i) {
    const instanceOptions = instancesOptions[i];
    const modelMatrix = instanceOptions.modelMatrix;
    const instanceId = defaultValue(instanceOptions.batchId, i);
    instances[i] = new ModelInstance(collection, modelMatrix, instanceId);
  }
  return instances;
}

function createBoundingSphere(collection) {
  const instancesLength = collection.length;
  const points = new Array(instancesLength);
  for (let i = 0; i < instancesLength; ++i) {
    points[i] = Matrix4.getTranslation(
      collection._instances[i]._modelMatrix,
      new Cartesian3()
    );
  }

  return BoundingSphere.fromPoints(points);
}

const scratchCartesian = new Cartesian3();
const scratchMatrix = new Matrix4();

ModelInstanceCollection.prototype.expandBoundingSphere = function (
  instanceModelMatrix
) {
  const translation = Matrix4.getTranslation(
    instanceModelMatrix,
    scratchCartesian
  );
  BoundingSphere.expand(
    this._boundingSphere,
    translation,
    this._boundingSphere
  );
};

function getCheckUniformSemanticFunction(
  modelSemantics,
  supportedSemantics,
  programId,
  uniformMap
) {
  return function (uniform, uniformName) {
    const semantic = uniform.semantic;
    if (defined(semantic) && modelSemantics.indexOf(semantic) > -1) {
      if (supportedSemantics.indexOf(semantic) > -1) {
        uniformMap[uniformName] = semantic;
      } else {
        throw new RuntimeError(
          `${
            "Shader program cannot be optimized for instancing. " + 'Uniform "'
          }${uniformName}" in program "${programId}" uses unsupported semantic "${semantic}"`
        );
      }
    }
  };
}

function getInstancedUniforms(collection, programId) {
  if (defined(collection._instancedUniformsByProgram)) {
    return collection._instancedUniformsByProgram[programId];
  }

  const instancedUniformsByProgram = {};
  collection._instancedUniformsByProgram = instancedUniformsByProgram;

  // When using CESIUM_RTC_MODELVIEW the CESIUM_RTC center is ignored. Instances are always rendered relative-to-center.
  const modelSemantics = [
    "MODEL",
    "MODELVIEW",
    "CESIUM_RTC_MODELVIEW",
    "MODELVIEWPROJECTION",
    "MODELINVERSE",
    "MODELVIEWINVERSE",
    "MODELVIEWPROJECTIONINVERSE",
    "MODELINVERSETRANSPOSE",
    "MODELVIEWINVERSETRANSPOSE",
  ];
  const supportedSemantics = [
    "MODELVIEW",
    "CESIUM_RTC_MODELVIEW",
    "MODELVIEWPROJECTION",
    "MODELVIEWINVERSETRANSPOSE",
  ];

  const techniques = collection._model._sourceTechniques;
  for (const techniqueId in techniques) {
    if (techniques.hasOwnProperty(techniqueId)) {
      const technique = techniques[techniqueId];
      const program = technique.program;

      // Different techniques may share the same program, skip if already processed.
      // This assumes techniques that share a program do not declare different semantics for the same uniforms.
      if (!defined(instancedUniformsByProgram[program])) {
        const uniformMap = {};
        instancedUniformsByProgram[program] = uniformMap;
        ForEach.techniqueUniform(
          technique,
          getCheckUniformSemanticFunction(
            modelSemantics,
            supportedSemantics,
            programId,
            uniformMap
          )
        );
      }
    }
  }

  return instancedUniformsByProgram[programId];
}

function getVertexShaderCallback(collection) {
  return function (vs, programId) {
    const instancedUniforms = getInstancedUniforms(collection, programId);
    const usesBatchTable = defined(collection._batchTable);

    let renamedSource = ShaderSource.replaceMain(vs, "czm_instancing_main");

    let globalVarsHeader = "";
    let globalVarsMain = "";
    for (const uniform in instancedUniforms) {
      if (instancedUniforms.hasOwnProperty(uniform)) {
        const semantic = instancedUniforms[uniform];
        let varName;
        if (semantic === "MODELVIEW" || semantic === "CESIUM_RTC_MODELVIEW") {
          varName = "czm_instanced_modelView";
        } else if (semantic === "MODELVIEWPROJECTION") {
          varName = "czm_instanced_modelViewProjection";
          globalVarsHeader += "mat4 czm_instanced_modelViewProjection;\n";
          globalVarsMain +=
            "czm_instanced_modelViewProjection = czm_projection * czm_instanced_modelView;\n";
        } else if (semantic === "MODELVIEWINVERSETRANSPOSE") {
          varName = "czm_instanced_modelViewInverseTranspose";
          globalVarsHeader += "mat3 czm_instanced_modelViewInverseTranspose;\n";
          globalVarsMain +=
            "czm_instanced_modelViewInverseTranspose = mat3(czm_instanced_modelView);\n";
        }

        // Remove the uniform declaration
        let regex = new RegExp(`uniform.*${uniform}.*`);
        renamedSource = renamedSource.replace(regex, "");

        // Replace all occurrences of the uniform with the global variable
        regex = new RegExp(`${uniform}\\b`, "g");
        renamedSource = renamedSource.replace(regex, varName);
      }
    }

    // czm_instanced_model is the model matrix of the instance relative to center
    // czm_instanced_modifiedModelView is the transform from the center to view
    // czm_instanced_nodeTransform is the local offset of the node within the model
    const uniforms =
      "uniform mat4 czm_instanced_modifiedModelView;\n" +
      "uniform mat4 czm_instanced_nodeTransform;\n";

    let batchIdAttribute;
    let pickAttribute;
    let pickVarying;

    if (usesBatchTable) {
      batchIdAttribute = "attribute float a_batchId;\n";
      pickAttribute = "";
      pickVarying = "";
    } else {
      batchIdAttribute = "";
      pickAttribute =
        "attribute vec4 pickColor;\n" + "varying vec4 v_pickColor;\n";
      pickVarying = "    v_pickColor = pickColor;\n";
    }

    let instancedSource =
      `${uniforms + globalVarsHeader}mat4 czm_instanced_modelView;\n` +
      `attribute vec4 czm_modelMatrixRow0;\n` +
      `attribute vec4 czm_modelMatrixRow1;\n` +
      `attribute vec4 czm_modelMatrixRow2;\n${batchIdAttribute}${pickAttribute}${renamedSource}void main()\n` +
      `{\n` +
      `    mat4 czm_instanced_model = mat4(czm_modelMatrixRow0.x, czm_modelMatrixRow1.x, czm_modelMatrixRow2.x, 0.0, czm_modelMatrixRow0.y, czm_modelMatrixRow1.y, czm_modelMatrixRow2.y, 0.0, czm_modelMatrixRow0.z, czm_modelMatrixRow1.z, czm_modelMatrixRow2.z, 0.0, czm_modelMatrixRow0.w, czm_modelMatrixRow1.w, czm_modelMatrixRow2.w, 1.0);\n` +
      `    czm_instanced_modelView = czm_instanced_modifiedModelView * czm_instanced_model * czm_instanced_nodeTransform;\n${globalVarsMain}    czm_instancing_main();\n${pickVarying}}\n`;

    if (usesBatchTable) {
      const gltf = collection._model.gltf;
      const diffuseAttributeOrUniformName = ModelUtility.getDiffuseAttributeOrUniform(
        gltf,
        programId
      );
      instancedSource = collection._batchTable.getVertexShaderCallback(
        true,
        "a_batchId",
        diffuseAttributeOrUniformName
      )(instancedSource);
    }

    return instancedSource;
  };
}

function getFragmentShaderCallback(collection) {
  return function (fs, programId) {
    const batchTable = collection._batchTable;
    if (defined(batchTable)) {
      const gltf = collection._model.gltf;
      const diffuseAttributeOrUniformName = ModelUtility.getDiffuseAttributeOrUniform(
        gltf,
        programId
      );
      fs = batchTable.getFragmentShaderCallback(
        true,
        diffuseAttributeOrUniformName,
        false
      )(fs);
    } else {
      fs = `varying vec4 v_pickColor;\n${fs}`;
    }
    return fs;
  };
}

function createModifiedModelView(collection, context) {
  return function () {
    return Matrix4.multiply(
      context.uniformState.view,
      collection._rtcTransform,
      collection._rtcModelView
    );
  };
}

function createNodeTransformFunction(node) {
  return function () {
    return node.computedMatrix;
  };
}

function getUniformMapCallback(collection, context) {
  return function (uniformMap, programId, node) {
    uniformMap = clone(uniformMap);
    uniformMap.czm_instanced_modifiedModelView = createModifiedModelView(
      collection,
      context
    );
    uniformMap.czm_instanced_nodeTransform = createNodeTransformFunction(node);

    // Remove instanced uniforms from the uniform map
    const instancedUniforms = getInstancedUniforms(collection, programId);
    for (const uniform in instancedUniforms) {
      if (instancedUniforms.hasOwnProperty(uniform)) {
        delete uniformMap[uniform];
      }
    }

    if (defined(collection._batchTable)) {
      uniformMap = collection._batchTable.getUniformMapCallback()(uniformMap);
    }

    return uniformMap;
  };
}

function getVertexShaderNonInstancedCallback(collection) {
  return function (vs, programId) {
    if (defined(collection._batchTable)) {
      const gltf = collection._model.gltf;
      const diffuseAttributeOrUniformName = ModelUtility.getDiffuseAttributeOrUniform(
        gltf,
        programId
      );
      vs = collection._batchTable.getVertexShaderCallback(
        true,
        "a_batchId",
        diffuseAttributeOrUniformName
      )(vs);
      // Treat a_batchId as a uniform rather than a vertex attribute
      vs = `uniform float a_batchId\n;${vs}`;
    }
    return vs;
  };
}

function getFragmentShaderNonInstancedCallback(collection) {
  return function (fs, programId) {
    const batchTable = collection._batchTable;
    if (defined(batchTable)) {
      const gltf = collection._model.gltf;
      const diffuseAttributeOrUniformName = ModelUtility.getDiffuseAttributeOrUniform(
        gltf,
        programId
      );
      fs = batchTable.getFragmentShaderCallback(
        true,
        diffuseAttributeOrUniformName,
        false
      )(fs);
    } else {
      fs = `uniform vec4 czm_pickColor;\n${fs}`;
    }
    return fs;
  };
}

function getUniformMapNonInstancedCallback(collection) {
  return function (uniformMap) {
    if (defined(collection._batchTable)) {
      uniformMap = collection._batchTable.getUniformMapCallback()(uniformMap);
    }

    return uniformMap;
  };
}

function getVertexBufferTypedArray(collection) {
  const instances = collection._instances;
  const instancesLength = collection.length;
  const collectionCenter = collection._center;
  const vertexSizeInFloats = 12;

  let bufferData = collection._vertexBufferTypedArray;
  if (!defined(bufferData)) {
    bufferData = new Float32Array(instancesLength * vertexSizeInFloats);
  }
  if (collection._dynamic) {
    // Hold onto the buffer data so we don't have to allocate new memory every frame.
    collection._vertexBufferTypedArray = bufferData;
  }

  for (let i = 0; i < instancesLength; ++i) {
    const modelMatrix = instances[i]._modelMatrix;

    // Instance matrix is relative to center
    const instanceMatrix = Matrix4.clone(modelMatrix, scratchMatrix);
    instanceMatrix[12] -= collectionCenter.x;
    instanceMatrix[13] -= collectionCenter.y;
    instanceMatrix[14] -= collectionCenter.z;

    const offset = i * vertexSizeInFloats;

    // First three rows of the model matrix
    bufferData[offset + 0] = instanceMatrix[0];
    bufferData[offset + 1] = instanceMatrix[4];
    bufferData[offset + 2] = instanceMatrix[8];
    bufferData[offset + 3] = instanceMatrix[12];
    bufferData[offset + 4] = instanceMatrix[1];
    bufferData[offset + 5] = instanceMatrix[5];
    bufferData[offset + 6] = instanceMatrix[9];
    bufferData[offset + 7] = instanceMatrix[13];
    bufferData[offset + 8] = instanceMatrix[2];
    bufferData[offset + 9] = instanceMatrix[6];
    bufferData[offset + 10] = instanceMatrix[10];
    bufferData[offset + 11] = instanceMatrix[14];
  }

  return bufferData;
}

function createVertexBuffer(collection, context) {
  let i;
  const instances = collection._instances;
  const instancesLength = collection.length;
  const dynamic = collection._dynamic;
  const usesBatchTable = defined(collection._batchTable);

  if (usesBatchTable) {
    const batchIdBufferData = new Uint16Array(instancesLength);
    for (i = 0; i < instancesLength; ++i) {
      batchIdBufferData[i] = instances[i]._instanceId;
    }
    collection._batchIdBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: batchIdBufferData,
      usage: BufferUsage.STATIC_DRAW,
    });
  }

  if (!usesBatchTable) {
    const pickIdBuffer = new Uint8Array(instancesLength * 4);
    for (i = 0; i < instancesLength; ++i) {
      const pickId = collection._pickIds[i];
      const pickColor = pickId.color;
      const offset = i * 4;
      pickIdBuffer[offset] = Color.floatToByte(pickColor.red);
      pickIdBuffer[offset + 1] = Color.floatToByte(pickColor.green);
      pickIdBuffer[offset + 2] = Color.floatToByte(pickColor.blue);
      pickIdBuffer[offset + 3] = Color.floatToByte(pickColor.alpha);
    }
    collection._pickIdBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: pickIdBuffer,
      usage: BufferUsage.STATIC_DRAW,
    });
  }

  const vertexBufferTypedArray = getVertexBufferTypedArray(collection);
  collection._vertexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: vertexBufferTypedArray,
    usage: dynamic ? BufferUsage.STREAM_DRAW : BufferUsage.STATIC_DRAW,
  });
}

function updateVertexBuffer(collection) {
  const vertexBufferTypedArray = getVertexBufferTypedArray(collection);
  collection._vertexBuffer.copyFromArrayView(vertexBufferTypedArray);
}

function createPickIds(collection, context) {
  // PERFORMANCE_IDEA: we could skip the pick buffer completely by allocating
  // a continuous range of pickIds and then converting the base pickId + batchId
  // to RGBA in the shader.  The only consider is precision issues, which might
  // not be an issue in WebGL 2.
  const instances = collection._instances;
  const instancesLength = instances.length;
  const pickIds = new Array(instancesLength);
  for (let i = 0; i < instancesLength; ++i) {
    pickIds[i] = context.createPickId(instances[i]);
  }
  return pickIds;
}

function createModel(collection, context) {
  const instancingSupported = collection._instancingSupported;
  const usesBatchTable = defined(collection._batchTable);
  const allowPicking = collection._allowPicking;

  const modelOptions = {
    url: collection._url,
    requestType: collection._requestType,
    gltf: collection._gltf,
    basePath: collection._basePath,
    shadows: collection._shadows,
    cacheKey: undefined,
    asynchronous: collection._asynchronous,
    allowPicking: allowPicking,
    incrementallyLoadTextures: collection._incrementallyLoadTextures,
    upAxis: collection._upAxis,
    forwardAxis: collection._forwardAxis,
    precreatedAttributes: undefined,
    vertexShaderLoaded: undefined,
    fragmentShaderLoaded: undefined,
    uniformMapLoaded: undefined,
    pickIdLoaded: collection._pickIdLoaded,
    ignoreCommands: true,
    opaquePass: collection._opaquePass,
    imageBasedLighting: collection._imageBasedLighting,
    showOutline: collection.showOutline,
    showCreditsOnScreen: collection.showCreditsOnScreen,
  };

  if (!usesBatchTable) {
    collection._pickIds = createPickIds(collection, context);
  }

  if (instancingSupported) {
    createVertexBuffer(collection, context);

    const vertexSizeInFloats = 12;
    const componentSizeInBytes = ComponentDatatype.getSizeInBytes(
      ComponentDatatype.FLOAT
    );

    const instancedAttributes = {
      czm_modelMatrixRow0: {
        index: 0, // updated in Model
        vertexBuffer: collection._vertexBuffer,
        componentsPerAttribute: 4,
        componentDatatype: ComponentDatatype.FLOAT,
        normalize: false,
        offsetInBytes: 0,
        strideInBytes: componentSizeInBytes * vertexSizeInFloats,
        instanceDivisor: 1,
      },
      czm_modelMatrixRow1: {
        index: 0, // updated in Model
        vertexBuffer: collection._vertexBuffer,
        componentsPerAttribute: 4,
        componentDatatype: ComponentDatatype.FLOAT,
        normalize: false,
        offsetInBytes: componentSizeInBytes * 4,
        strideInBytes: componentSizeInBytes * vertexSizeInFloats,
        instanceDivisor: 1,
      },
      czm_modelMatrixRow2: {
        index: 0, // updated in Model
        vertexBuffer: collection._vertexBuffer,
        componentsPerAttribute: 4,
        componentDatatype: ComponentDatatype.FLOAT,
        normalize: false,
        offsetInBytes: componentSizeInBytes * 8,
        strideInBytes: componentSizeInBytes * vertexSizeInFloats,
        instanceDivisor: 1,
      },
    };

    // When using a batch table, add a batch id attribute
    if (usesBatchTable) {
      instancedAttributes.a_batchId = {
        index: 0, // updated in Model
        vertexBuffer: collection._batchIdBuffer,
        componentsPerAttribute: 1,
        componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
        normalize: false,
        offsetInBytes: 0,
        strideInBytes: 0,
        instanceDivisor: 1,
      };
    }

    if (!usesBatchTable) {
      instancedAttributes.pickColor = {
        index: 0, // updated in Model
        vertexBuffer: collection._pickIdBuffer,
        componentsPerAttribute: 4,
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        normalize: true,
        offsetInBytes: 0,
        strideInBytes: 0,
        instanceDivisor: 1,
      };
    }

    modelOptions.precreatedAttributes = instancedAttributes;
    modelOptions.vertexShaderLoaded = getVertexShaderCallback(collection);
    modelOptions.fragmentShaderLoaded = getFragmentShaderCallback(collection);
    modelOptions.uniformMapLoaded = getUniformMapCallback(collection, context);

    if (defined(collection._url)) {
      modelOptions.cacheKey = `${collection._url.getUrlComponent()}#instanced`;
    }
  } else {
    modelOptions.vertexShaderLoaded = getVertexShaderNonInstancedCallback(
      collection
    );
    modelOptions.fragmentShaderLoaded = getFragmentShaderNonInstancedCallback(
      collection
    );
    modelOptions.uniformMapLoaded = getUniformMapNonInstancedCallback(
      collection,
      context
    );
  }

  if (defined(collection._url)) {
    collection._model = Model.fromGltf(modelOptions);
  } else {
    collection._model = new Model(modelOptions);
  }
}

function updateWireframe(collection, force) {
  if (collection._debugWireframe !== collection.debugWireframe || force) {
    collection._debugWireframe = collection.debugWireframe;

    // This assumes the original primitive was TRIANGLES and that the triangles
    // are connected for the wireframe to look perfect.
    const primitiveType = collection.debugWireframe
      ? PrimitiveType.LINES
      : PrimitiveType.TRIANGLES;
    const commands = collection._drawCommands;
    const length = commands.length;
    for (let i = 0; i < length; ++i) {
      commands[i].primitiveType = primitiveType;
    }
  }
}

function getDisableCullingRenderState(renderState) {
  const rs = clone(renderState, true);
  rs.cull.enabled = false;
  return RenderState.fromCache(rs);
}

function updateBackFaceCulling(collection, force) {
  if (collection._backFaceCulling !== collection.backFaceCulling || force) {
    collection._backFaceCulling = collection.backFaceCulling;

    const commands = collection._drawCommands;
    const length = commands.length;
    let i;

    if (!defined(collection._disableCullingRenderStates)) {
      collection._disableCullingRenderStates = new Array(length);
      collection._renderStates = new Array(length);
      for (i = 0; i < length; ++i) {
        const renderState = commands[i].renderState;
        const derivedRenderState = getDisableCullingRenderState(renderState);
        collection._disableCullingRenderStates[i] = derivedRenderState;
        collection._renderStates[i] = renderState;
      }
    }

    for (i = 0; i < length; ++i) {
      commands[i].renderState = collection._backFaceCulling
        ? collection._renderStates[i]
        : collection._disableCullingRenderStates[i];
    }
  }
}

function updateShowBoundingVolume(collection, force) {
  if (
    collection.debugShowBoundingVolume !==
      collection._debugShowBoundingVolume ||
    force
  ) {
    collection._debugShowBoundingVolume = collection.debugShowBoundingVolume;

    const commands = collection._drawCommands;
    const length = commands.length;
    for (let i = 0; i < length; ++i) {
      commands[i].debugShowBoundingVolume = collection.debugShowBoundingVolume;
    }
  }
}

function createCommands(collection, drawCommands) {
  const commandsLength = drawCommands.length;
  const instancesLength = collection.length;
  const boundingSphere = collection._boundingSphere;
  const cull = collection._cull;

  for (let i = 0; i < commandsLength; ++i) {
    const drawCommand = DrawCommand.shallowClone(drawCommands[i]);
    drawCommand.instanceCount = instancesLength;
    drawCommand.boundingVolume = boundingSphere;
    drawCommand.cull = cull;
    if (defined(collection._batchTable)) {
      drawCommand.pickId = collection._batchTable.getPickId();
    } else {
      drawCommand.pickId = "v_pickColor";
    }
    collection._drawCommands.push(drawCommand);
  }
}

function createBatchIdFunction(batchId) {
  return function () {
    return batchId;
  };
}

function createPickColorFunction(color) {
  return function () {
    return color;
  };
}

function createCommandsNonInstanced(collection, drawCommands) {
  // When instancing is disabled, create commands for every instance.
  const instances = collection._instances;
  const commandsLength = drawCommands.length;
  const instancesLength = collection.length;
  const batchTable = collection._batchTable;
  const usesBatchTable = defined(batchTable);
  const cull = collection._cull;

  for (let i = 0; i < commandsLength; ++i) {
    for (let j = 0; j < instancesLength; ++j) {
      const drawCommand = DrawCommand.shallowClone(drawCommands[i]);
      drawCommand.modelMatrix = new Matrix4(); // Updated in updateCommandsNonInstanced
      drawCommand.boundingVolume = new BoundingSphere(); // Updated in updateCommandsNonInstanced
      drawCommand.cull = cull;
      drawCommand.uniformMap = clone(drawCommand.uniformMap);
      if (usesBatchTable) {
        drawCommand.uniformMap.a_batchId = createBatchIdFunction(
          instances[j]._instanceId
        );
      } else {
        const pickId = collection._pickIds[j];
        drawCommand.uniformMap.czm_pickColor = createPickColorFunction(
          pickId.color
        );
      }
      collection._drawCommands.push(drawCommand);
    }
  }
}

function updateCommandsNonInstanced(collection) {
  const modelCommands = collection._modelCommands;
  const commandsLength = modelCommands.length;
  const instancesLength = collection.length;
  const collectionTransform = collection._rtcTransform;
  const collectionCenter = collection._center;

  for (let i = 0; i < commandsLength; ++i) {
    const modelCommand = modelCommands[i];
    for (let j = 0; j < instancesLength; ++j) {
      const commandIndex = i * instancesLength + j;
      const drawCommand = collection._drawCommands[commandIndex];
      let instanceMatrix = Matrix4.clone(
        collection._instances[j]._modelMatrix,
        scratchMatrix
      );
      instanceMatrix[12] -= collectionCenter.x;
      instanceMatrix[13] -= collectionCenter.y;
      instanceMatrix[14] -= collectionCenter.z;
      instanceMatrix = Matrix4.multiply(
        collectionTransform,
        instanceMatrix,
        scratchMatrix
      );
      const nodeMatrix = modelCommand.modelMatrix;
      const modelMatrix = drawCommand.modelMatrix;
      Matrix4.multiply(instanceMatrix, nodeMatrix, modelMatrix);

      const nodeBoundingSphere = modelCommand.boundingVolume;
      const boundingSphere = drawCommand.boundingVolume;
      BoundingSphere.transform(
        nodeBoundingSphere,
        instanceMatrix,
        boundingSphere
      );
    }
  }
}

function getModelCommands(model) {
  const nodeCommands = model._nodeCommands;
  const length = nodeCommands.length;

  const drawCommands = [];

  for (let i = 0; i < length; ++i) {
    const nc = nodeCommands[i];
    if (nc.show) {
      drawCommands.push(nc.command);
    }
  }

  return drawCommands;
}

function commandsDirty(model) {
  const nodeCommands = model._nodeCommands;
  const length = nodeCommands.length;

  let commandsDirty = false;

  for (let i = 0; i < length; i++) {
    const nc = nodeCommands[i];
    if (nc.command.dirty) {
      nc.command.dirty = false;
      commandsDirty = true;
    }
  }
  return commandsDirty;
}

function generateModelCommands(modelInstanceCollection, instancingSupported) {
  modelInstanceCollection._drawCommands = [];

  const modelCommands = getModelCommands(modelInstanceCollection._model);
  if (instancingSupported) {
    createCommands(modelInstanceCollection, modelCommands);
  } else {
    createCommandsNonInstanced(modelInstanceCollection, modelCommands);
    updateCommandsNonInstanced(modelInstanceCollection);
  }
}

function updateShadows(collection, force) {
  if (collection.shadows !== collection._shadows || force) {
    collection._shadows = collection.shadows;

    const castShadows = ShadowMode.castShadows(collection.shadows);
    const receiveShadows = ShadowMode.receiveShadows(collection.shadows);

    const drawCommands = collection._drawCommands;
    const length = drawCommands.length;
    for (let i = 0; i < length; ++i) {
      const drawCommand = drawCommands[i];
      drawCommand.castShadows = castShadows;
      drawCommand.receiveShadows = receiveShadows;
    }
  }
}

ModelInstanceCollection.prototype.update = function (frameState) {
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  if (!this.show) {
    return;
  }

  if (this.length === 0) {
    return;
  }

  const context = frameState.context;

  if (this._state === LoadState.NEEDS_LOAD) {
    this._state = LoadState.LOADING;
    this._instancingSupported = context.instancedArrays;
    createModel(this, context);
    const that = this;
    this._model.readyPromise.catch(function (error) {
      that._state = LoadState.FAILED;
      that._readyPromise.reject(error);
    });
  }

  const instancingSupported = this._instancingSupported;
  const model = this._model;

  model.imageBasedLighting = this._imageBasedLighting;
  model.showCreditsOnScreen = this.showCreditsOnScreen;

  model.update(frameState);

  if (model.ready && this._state === LoadState.LOADING) {
    this._state = LoadState.LOADED;
    this._ready = true;

    // Expand bounding volume to fit the radius of the loaded model including the model's offset from the center
    const modelRadius =
      model.boundingSphere.radius +
      Cartesian3.magnitude(model.boundingSphere.center);
    this._boundingSphere.radius += modelRadius;
    this._modelCommands = getModelCommands(model);

    generateModelCommands(this, instancingSupported);

    this._readyPromise.resolve(this);
    return;
  }

  if (this._state !== LoadState.LOADED) {
    return;
  }

  const modeChanged = frameState.mode !== this._mode;
  const modelMatrix = this.modelMatrix;
  const modelMatrixChanged = !Matrix4.equals(this._modelMatrix, modelMatrix);

  if (modeChanged || modelMatrixChanged) {
    this._mode = frameState.mode;
    Matrix4.clone(modelMatrix, this._modelMatrix);
    let rtcTransform = Matrix4.multiplyByTranslation(
      this._modelMatrix,
      this._center,
      this._rtcTransform
    );
    if (this._mode !== SceneMode.SCENE3D) {
      rtcTransform = Transforms.basisTo2D(
        frameState.mapProjection,
        rtcTransform,
        rtcTransform
      );
    }
    Matrix4.getTranslation(rtcTransform, this._boundingSphere.center);
  }

  if (instancingSupported && this._dirty) {
    // If at least one instance has moved assume the collection is now dynamic
    this._dynamic = true;
    this._dirty = false;

    // PERFORMANCE_IDEA: only update dirty sub-sections instead of the whole collection
    updateVertexBuffer(this);
  }

  // If the model was set to rebuild shaders during update, rebuild instanced commands.
  const modelCommandsDirty = commandsDirty(model);
  if (modelCommandsDirty) {
    generateModelCommands(this, instancingSupported);
  }

  // If any node changes due to an animation, update the commands. This could be inefficient if the model is
  // composed of many nodes and only one changes, however it is probably fine in the general use case.
  // Only applies when instancing is disabled. The instanced shader automatically handles node transformations.
  if (
    !instancingSupported &&
    (model.dirty || this._dirty || modeChanged || modelMatrixChanged)
  ) {
    updateCommandsNonInstanced(this);
  }

  updateShadows(this, modelCommandsDirty);
  updateWireframe(this, modelCommandsDirty);
  updateBackFaceCulling(this, modelCommandsDirty);
  updateShowBoundingVolume(this, modelCommandsDirty);

  const passes = frameState.passes;
  if (!passes.render && !passes.pick) {
    return;
  }

  const commandList = frameState.commandList;
  const commands = this._drawCommands;
  const commandsLength = commands.length;

  for (let i = 0; i < commandsLength; ++i) {
    commandList.push(commands[i]);
  }
};

ModelInstanceCollection.prototype.isDestroyed = function () {
  return false;
};

ModelInstanceCollection.prototype.destroy = function () {
  this._model = this._model && this._model.destroy();

  const pickIds = this._pickIds;
  if (defined(pickIds)) {
    const length = pickIds.length;
    for (let i = 0; i < length; ++i) {
      pickIds[i].destroy();
    }
  }

  if (
    this._shouldDestroyImageBasedLighting &&
    !this._imageBasedLighting.isDestroyed()
  ) {
    this._imageBasedLighting.destroy();
  }
  this._imageBasedLighting = undefined;

  return destroyObject(this);
};
export default ModelInstanceCollection;
