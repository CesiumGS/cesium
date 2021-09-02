import arraySlice from "../Core/arraySlice.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import RuntimeError from "../Core/RuntimeError.js";
import Transforms from "../Core/Transforms.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import addDefaults from "./GltfPipeline/addDefaults.js";
import ForEach from "./GltfPipeline/ForEach.js";
import getAccessorByteStride from "./GltfPipeline/getAccessorByteStride.js";
import numberOfComponentsForType from "./GltfPipeline/numberOfComponentsForType.js";
import parseGlb from "./GltfPipeline/parseGlb.js";
import updateVersion from "./GltfPipeline/updateVersion.js";
import when from "../ThirdParty/when.js";
import Axis from "./Axis.js";
import ModelLoadResources from "./ModelLoadResources.js";
import ModelUtility from "./ModelUtility.js";
import processModelMaterialsCommon from "./processModelMaterialsCommon.js";
import processPbrMaterials from "./processPbrMaterials.js";
import SceneMode from "./SceneMode.js";
import Vector3DTileBatch from "./Vector3DTileBatch.js";
import Vector3DTilePrimitive from "./Vector3DTilePrimitive.js";

var boundingSphereCartesian3Scratch = new Cartesian3();

var ModelState = ModelUtility.ModelState;

///////////////////////////////////////////////////////////////////////////

/**
 * A 3D model for classifying other 3D assets based on glTF, the runtime 3D asset format.
 * This is a special case when a model of a 3D tileset becomes a classifier when setting {@link Cesium3DTileset#classificationType}.
 *
 * @alias ClassificationModel
 * @constructor
 *
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {ArrayBuffer|Uint8Array} options.gltf A binary glTF buffer.
 * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
 * @param {ClassificationType} [options.classificationType] What this model will classify.
 *
 * @exception {RuntimeError} Only binary glTF is supported.
 * @exception {RuntimeError} Buffer data must be embedded in the binary glTF.
 * @exception {RuntimeError} Only one node is supported for classification and it must have a mesh.
 * @exception {RuntimeError} Only one mesh is supported when using b3dm for classification.
 * @exception {RuntimeError} Only one primitive per mesh is supported when using b3dm for classification.
 * @exception {RuntimeError} The mesh must have a position attribute.
 * @exception {RuntimeError} The mesh must have a batch id attribute.
 */
function ClassificationModel(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var gltf = options.gltf;
  if (gltf instanceof ArrayBuffer) {
    gltf = new Uint8Array(gltf);
  }

  if (gltf instanceof Uint8Array) {
    // Parse and update binary glTF
    gltf = parseGlb(gltf);
    updateVersion(gltf);
    addDefaults(gltf);
    processModelMaterialsCommon(gltf);
    processPbrMaterials(gltf);
  } else {
    throw new RuntimeError("Only binary glTF is supported as a classifier.");
  }

  ForEach.buffer(gltf, function (buffer) {
    if (!defined(buffer.extras._pipeline.source)) {
      throw new RuntimeError(
        "Buffer data must be embedded in the binary gltf."
      );
    }
  });

  var gltfNodes = gltf.nodes;
  var gltfMeshes = gltf.meshes;

  var gltfNode = gltfNodes[0];
  var meshId = gltfNode.mesh;
  if (gltfNodes.length !== 1 || !defined(meshId)) {
    throw new RuntimeError(
      "Only one node is supported for classification and it must have a mesh."
    );
  }

  if (gltfMeshes.length !== 1) {
    throw new RuntimeError(
      "Only one mesh is supported when using b3dm for classification."
    );
  }

  var gltfPrimitives = gltfMeshes[0].primitives;
  if (gltfPrimitives.length !== 1) {
    throw new RuntimeError(
      "Only one primitive per mesh is supported when using b3dm for classification."
    );
  }

  var gltfPositionAttribute = gltfPrimitives[0].attributes.POSITION;
  if (!defined(gltfPositionAttribute)) {
    throw new RuntimeError("The mesh must have a position attribute.");
  }

  var gltfBatchIdAttribute = gltfPrimitives[0].attributes._BATCHID;
  if (!defined(gltfBatchIdAttribute)) {
    throw new RuntimeError("The mesh must have a batch id attribute.");
  }

  this._gltf = gltf;

  /**
   * Determines if the model primitive will be shown.
   *
   * @type {Boolean}
   *
   * @default true
   */
  this.show = defaultValue(options.show, true);

  /**
   * The 4x4 transformation matrix that transforms the model from model to world coordinates.
   * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
   * Local reference frames can be used by providing a different transformation matrix, like that returned
   * by {@link Transforms.eastNorthUpToFixedFrame}.
   *
   * @type {Matrix4}
   *
   * @default {@link Matrix4.IDENTITY}
   *
   * @example
   * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
   * m.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
   */
  this.modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );
  this._modelMatrix = Matrix4.clone(this.modelMatrix);

  this._ready = false;
  this._readyPromise = when.defer();

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the model.  A glTF primitive corresponds
   * to one draw command.  A glTF mesh has an array of primitives, often of length one.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );
  this._debugShowBoundingVolume = false;

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the model in wireframe.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugWireframe = defaultValue(options.debugWireframe, false);
  this._debugWireframe = false;

  this._classificationType = options.classificationType;

  // Undocumented options
  this._vertexShaderLoaded = options.vertexShaderLoaded;
  this._classificationShaderLoaded = options.classificationShaderLoaded;
  this._uniformMapLoaded = options.uniformMapLoaded;
  this._pickIdLoaded = options.pickIdLoaded;
  this._ignoreCommands = defaultValue(options.ignoreCommands, false);
  this._upAxis = defaultValue(options.upAxis, Axis.Y);
  this._batchTable = options.batchTable;

  this._computedModelMatrix = new Matrix4(); // Derived from modelMatrix and axis
  this._initialRadius = undefined; // Radius without model's scale property, model-matrix scale, animations, or skins
  this._boundingSphere = undefined;
  this._scaledBoundingSphere = new BoundingSphere();
  this._state = ModelState.NEEDS_LOAD;
  this._loadResources = undefined;

  this._mode = undefined;
  this._dirty = false; // true when the model was transformed this frame

  this._nodeMatrix = new Matrix4();
  this._primitive = undefined;

  this._extensionsUsed = undefined; // Cached used glTF extensions
  this._extensionsRequired = undefined; // Cached required glTF extensions
  this._quantizedUniforms = undefined; // Quantized uniforms for WEB3D_quantized_attributes

  this._buffers = {};
  this._vertexArray = undefined;
  this._shaderProgram = undefined;
  this._uniformMap = undefined;

  this._geometryByteLength = 0;
  this._trianglesLength = 0;

  // CESIUM_RTC extension
  this._rtcCenter = undefined; // reference to either 3D or 2D
  this._rtcCenterEye = undefined; // in eye coordinates
  this._rtcCenter3D = undefined; // in world coordinates
  this._rtcCenter2D = undefined; // in projected world coordinates
}

Object.defineProperties(ClassificationModel.prototype, {
  /**
   * The object for the glTF JSON, including properties with default values omitted
   * from the JSON provided to this model.
   *
   * @memberof ClassificationModel.prototype
   *
   * @type {Object}
   * @readonly
   *
   * @default undefined
   */
  gltf: {
    get: function () {
      return this._gltf;
    },
  },

  /**
   * The model's bounding sphere in its local coordinate system.
   *
   * @memberof ClassificationModel.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @default undefined
   *
   * @exception {DeveloperError} The model is not loaded.  Use ClassificationModel.readyPromise or wait for ClassificationModel.ready to be true.
   *
   * @example
   * // Center in WGS84 coordinates
   * var center = Cesium.Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cesium.Cartesian3());
   */
  boundingSphere: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (this._state !== ModelState.LOADED) {
        throw new DeveloperError(
          "The model is not loaded.  Use ClassificationModel.readyPromise or wait for ClassificationModel.ready to be true."
        );
      }
      //>>includeEnd('debug');

      var modelMatrix = this.modelMatrix;
      var nonUniformScale = Matrix4.getScale(
        modelMatrix,
        boundingSphereCartesian3Scratch
      );

      var scaledBoundingSphere = this._scaledBoundingSphere;
      scaledBoundingSphere.center = Cartesian3.multiplyComponents(
        this._boundingSphere.center,
        nonUniformScale,
        scaledBoundingSphere.center
      );
      scaledBoundingSphere.radius =
        Cartesian3.maximumComponent(nonUniformScale) * this._initialRadius;

      if (defined(this._rtcCenter)) {
        Cartesian3.add(
          this._rtcCenter,
          scaledBoundingSphere.center,
          scaledBoundingSphere.center
        );
      }

      return scaledBoundingSphere;
    },
  },

  /**
   * When <code>true</code>, this model is ready to render, i.e., the external binary, image,
   * and shader files were downloaded and the WebGL resources were created.  This is set to
   * <code>true</code> right before {@link ClassificationModel#readyPromise} is resolved.
   *
   * @memberof ClassificationModel.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets the promise that will be resolved when this model is ready to render, i.e., when the external binary, image,
   * and shader files were downloaded and the WebGL resources were created.
   * <p>
   * This promise is resolved at the end of the frame before the first frame the model is rendered in.
   * </p>
   *
   * @memberof ClassificationModel.prototype
   * @type {Promise.<ClassificationModel>}
   * @readonly
   *
   * @see ClassificationModel#ready
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Returns true if the model was transformed this frame
   *
   * @memberof ClassificationModel.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  dirty: {
    get: function () {
      return this._dirty;
    },
  },

  /**
   * Returns an object with all of the glTF extensions used.
   *
   * @memberof ClassificationModel.prototype
   *
   * @type {Object}
   * @readonly
   */
  extensionsUsed: {
    get: function () {
      if (!defined(this._extensionsUsed)) {
        this._extensionsUsed = ModelUtility.getUsedExtensions(this.gltf);
      }
      return this._extensionsUsed;
    },
  },

  /**
   * Returns an object with all of the glTF extensions required.
   *
   * @memberof ClassificationModel.prototype
   *
   * @type {Object}
   * @readonly
   */
  extensionsRequired: {
    get: function () {
      if (!defined(this._extensionsRequired)) {
        this._extensionsRequired = ModelUtility.getRequiredExtensions(
          this.gltf
        );
      }
      return this._extensionsRequired;
    },
  },

  /**
   * Gets the model's up-axis.
   * By default models are y-up according to the glTF spec, however geo-referenced models will typically be z-up.
   *
   * @memberof ClassificationModel.prototype
   *
   * @type {Number}
   * @default Axis.Y
   * @readonly
   *
   * @private
   */
  upAxis: {
    get: function () {
      return this._upAxis;
    },
  },

  /**
   * Gets the model's triangle count.
   *
   * @private
   */
  trianglesLength: {
    get: function () {
      return this._trianglesLength;
    },
  },

  /**
   * Gets the model's geometry memory in bytes. This includes all vertex and index buffers.
   *
   * @private
   */
  geometryByteLength: {
    get: function () {
      return this._geometryByteLength;
    },
  },

  /**
   * Gets the model's texture memory in bytes.
   *
   * @private
   */
  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Gets the model's classification type.
   * @memberof ClassificationModel.prototype
   * @type {ClassificationType}
   */
  classificationType: {
    get: function () {
      return this._classificationType;
    },
  },
});

///////////////////////////////////////////////////////////////////////////

function addBuffersToLoadResources(model) {
  var gltf = model.gltf;
  var loadResources = model._loadResources;
  ForEach.buffer(gltf, function (buffer, id) {
    loadResources.buffers[id] = buffer.extras._pipeline.source;
  });
}

function parseBufferViews(model) {
  var bufferViews = model.gltf.bufferViews;

  var vertexBuffersToCreate = model._loadResources.vertexBuffersToCreate;

  // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
  ForEach.bufferView(model.gltf, function (bufferView, id) {
    if (bufferView.target === WebGLConstants.ARRAY_BUFFER) {
      vertexBuffersToCreate.enqueue(id);
    }
  });

  var indexBuffersToCreate = model._loadResources.indexBuffersToCreate;
  var indexBufferIds = {};

  // The Cesium Renderer requires knowing the datatype for an index buffer
  // at creation type, which is not part of the glTF bufferview so loop
  // through glTF accessors to create the bufferview's index buffer.
  ForEach.accessor(model.gltf, function (accessor) {
    var bufferViewId = accessor.bufferView;
    var bufferView = bufferViews[bufferViewId];

    if (
      bufferView.target === WebGLConstants.ELEMENT_ARRAY_BUFFER &&
      !defined(indexBufferIds[bufferViewId])
    ) {
      indexBufferIds[bufferViewId] = true;
      indexBuffersToCreate.enqueue({
        id: bufferViewId,
        componentType: accessor.componentType,
      });
    }
  });
}

function createVertexBuffer(bufferViewId, model) {
  var loadResources = model._loadResources;
  var bufferViews = model.gltf.bufferViews;
  var bufferView = bufferViews[bufferViewId];
  var vertexBuffer = loadResources.getBuffer(bufferView);
  model._buffers[bufferViewId] = vertexBuffer;
  model._geometryByteLength += vertexBuffer.byteLength;
}

function createIndexBuffer(bufferViewId, componentType, model) {
  var loadResources = model._loadResources;
  var bufferViews = model.gltf.bufferViews;
  var bufferView = bufferViews[bufferViewId];
  var indexBuffer = {
    typedArray: loadResources.getBuffer(bufferView),
    indexDatatype: componentType,
  };
  model._buffers[bufferViewId] = indexBuffer;
  model._geometryByteLength += indexBuffer.typedArray.byteLength;
}

function createBuffers(model) {
  var loadResources = model._loadResources;

  if (loadResources.pendingBufferLoads !== 0) {
    return;
  }

  var vertexBuffersToCreate = loadResources.vertexBuffersToCreate;
  var indexBuffersToCreate = loadResources.indexBuffersToCreate;

  while (vertexBuffersToCreate.length > 0) {
    createVertexBuffer(vertexBuffersToCreate.dequeue(), model);
  }

  while (indexBuffersToCreate.length > 0) {
    var i = indexBuffersToCreate.dequeue();
    createIndexBuffer(i.id, i.componentType, model);
  }
}

function modifyShaderForQuantizedAttributes(shader, model) {
  var primitive = model.gltf.meshes[0].primitives[0];
  var result = ModelUtility.modifyShaderForQuantizedAttributes(
    model.gltf,
    primitive,
    shader
  );
  model._quantizedUniforms = result.uniforms;
  return result.shader;
}

function modifyShader(shader, callback) {
  if (defined(callback)) {
    shader = callback(shader);
  }
  return shader;
}

function createProgram(model) {
  var gltf = model.gltf;

  var positionName = ModelUtility.getAttributeOrUniformBySemantic(
    gltf,
    "POSITION"
  );
  var batchIdName = ModelUtility.getAttributeOrUniformBySemantic(
    gltf,
    "_BATCHID"
  );

  var attributeLocations = {};
  attributeLocations[positionName] = 0;
  attributeLocations[batchIdName] = 1;

  var modelViewProjectionName = ModelUtility.getAttributeOrUniformBySemantic(
    gltf,
    "MODELVIEWPROJECTION"
  );

  var uniformDecl;
  var toClip;

  if (!defined(modelViewProjectionName)) {
    var projectionName = ModelUtility.getAttributeOrUniformBySemantic(
      gltf,
      "PROJECTION"
    );
    var modelViewName = ModelUtility.getAttributeOrUniformBySemantic(
      gltf,
      "MODELVIEW"
    );
    if (!defined(modelViewName)) {
      modelViewName = ModelUtility.getAttributeOrUniformBySemantic(
        gltf,
        "CESIUM_RTC_MODELVIEW"
      );
    }

    uniformDecl =
      "uniform mat4 " +
      modelViewName +
      ";\n" +
      "uniform mat4 " +
      projectionName +
      ";\n";
    toClip =
      projectionName +
      " * " +
      modelViewName +
      " * vec4(" +
      positionName +
      ", 1.0)";
  } else {
    uniformDecl = "uniform mat4 " + modelViewProjectionName + ";\n";
    toClip = modelViewProjectionName + " * vec4(" + positionName + ", 1.0)";
  }

  var computePosition = "    vec4 positionInClipCoords = " + toClip + ";\n";

  var vs =
    "attribute vec3 " +
    positionName +
    ";\n" +
    "attribute float " +
    batchIdName +
    ";\n" +
    uniformDecl +
    "void main() {\n" +
    computePosition +
    "    gl_Position = czm_depthClamp(positionInClipCoords);\n" +
    "}\n";
  var fs =
    "#ifdef GL_EXT_frag_depth\n" +
    "#extension GL_EXT_frag_depth : enable\n" +
    "#endif\n" +
    "void main() \n" +
    "{ \n" +
    "    gl_FragColor = vec4(1.0); \n" +
    "    czm_writeDepthClamp();\n" +
    "}\n";

  if (model.extensionsUsed.WEB3D_quantized_attributes) {
    vs = modifyShaderForQuantizedAttributes(vs, model);
  }

  var drawVS = modifyShader(vs, model._vertexShaderLoaded);
  var drawFS = modifyShader(fs, model._classificationShaderLoaded);

  model._shaderProgram = {
    vertexShaderSource: drawVS,
    fragmentShaderSource: drawFS,
    attributeLocations: attributeLocations,
  };
}

function getAttributeLocations() {
  return {
    POSITION: 0,
    _BATCHID: 1,
  };
}

function createVertexArray(model) {
  var loadResources = model._loadResources;
  if (!loadResources.finishedBuffersCreation() || defined(model._vertexArray)) {
    return;
  }

  var rendererBuffers = model._buffers;
  var gltf = model.gltf;
  var accessors = gltf.accessors;
  var meshes = gltf.meshes;
  var primitives = meshes[0].primitives;

  var primitive = primitives[0];
  var attributeLocations = getAttributeLocations();
  var attributes = {};
  ForEach.meshPrimitiveAttribute(primitive, function (
    accessorId,
    attributeName
  ) {
    // Skip if the attribute is not used by the material, e.g., because the asset
    // was exported with an attribute that wasn't used and the asset wasn't optimized.
    var attributeLocation = attributeLocations[attributeName];
    if (defined(attributeLocation)) {
      var a = accessors[accessorId];
      attributes[attributeName] = {
        index: attributeLocation,
        vertexBuffer: rendererBuffers[a.bufferView],
        componentsPerAttribute: numberOfComponentsForType(a.type),
        componentDatatype: a.componentType,
        offsetInBytes: a.byteOffset,
        strideInBytes: getAccessorByteStride(gltf, a),
      };
    }
  });

  var indexBuffer;
  if (defined(primitive.indices)) {
    var accessor = accessors[primitive.indices];
    indexBuffer = rendererBuffers[accessor.bufferView];
  }
  model._vertexArray = {
    attributes: attributes,
    indexBuffer: indexBuffer,
  };
}

var gltfSemanticUniforms = {
  PROJECTION: function (uniformState, model) {
    return ModelUtility.getGltfSemanticUniforms().PROJECTION(
      uniformState,
      model
    );
  },
  MODELVIEW: function (uniformState, model) {
    return ModelUtility.getGltfSemanticUniforms().MODELVIEW(
      uniformState,
      model
    );
  },
  CESIUM_RTC_MODELVIEW: function (uniformState, model) {
    return ModelUtility.getGltfSemanticUniforms().CESIUM_RTC_MODELVIEW(
      uniformState,
      model
    );
  },
  MODELVIEWPROJECTION: function (uniformState, model) {
    return ModelUtility.getGltfSemanticUniforms().MODELVIEWPROJECTION(
      uniformState,
      model
    );
  },
};

function createUniformMap(model, context) {
  if (defined(model._uniformMap)) {
    return;
  }

  var uniformMap = {};
  ForEach.technique(model.gltf, function (technique) {
    ForEach.techniqueUniform(technique, function (uniform, uniformName) {
      if (
        !defined(uniform.semantic) ||
        !defined(gltfSemanticUniforms[uniform.semantic])
      ) {
        return;
      }

      uniformMap[uniformName] = gltfSemanticUniforms[uniform.semantic](
        context.uniformState,
        model
      );
    });
  });

  model._uniformMap = uniformMap;
}

function createUniformsForQuantizedAttributes(model, primitive) {
  return ModelUtility.createUniformsForQuantizedAttributes(
    model.gltf,
    primitive,
    model._quantizedUniforms
  );
}

function triangleCountFromPrimitiveIndices(primitive, indicesCount) {
  switch (primitive.mode) {
    case PrimitiveType.TRIANGLES:
      return indicesCount / 3;
    case PrimitiveType.TRIANGLE_STRIP:
    case PrimitiveType.TRIANGLE_FAN:
      return Math.max(indicesCount - 2, 0);
    default:
      return 0;
  }
}

function createPrimitive(model) {
  var batchTable = model._batchTable;

  var uniformMap = model._uniformMap;
  var vertexArray = model._vertexArray;

  var gltf = model.gltf;
  var accessors = gltf.accessors;
  var gltfMeshes = gltf.meshes;
  var primitive = gltfMeshes[0].primitives[0];
  var ix = accessors[primitive.indices];

  var positionAccessor = primitive.attributes.POSITION;
  var minMax = ModelUtility.getAccessorMinMax(gltf, positionAccessor);
  var boundingSphere = BoundingSphere.fromCornerPoints(
    Cartesian3.fromArray(minMax.min),
    Cartesian3.fromArray(minMax.max)
  );

  var offset;
  var count;
  if (defined(ix)) {
    count = ix.count;
    offset = ix.byteOffset / IndexDatatype.getSizeInBytes(ix.componentType); // glTF has offset in bytes.  Cesium has offsets in indices
  } else {
    var positions = accessors[primitive.attributes.POSITION];
    count = positions.count;
    offset = 0;
  }

  // Update model triangle count using number of indices
  model._trianglesLength += triangleCountFromPrimitiveIndices(primitive, count);

  // Allow callback to modify the uniformMap
  if (defined(model._uniformMapLoaded)) {
    uniformMap = model._uniformMapLoaded(uniformMap);
  }

  // Add uniforms for decoding quantized attributes if used
  if (model.extensionsUsed.WEB3D_quantized_attributes) {
    var quantizedUniformMap = createUniformsForQuantizedAttributes(
      model,
      primitive
    );
    uniformMap = combine(uniformMap, quantizedUniformMap);
  }

  var attribute = vertexArray.attributes.POSITION;
  var componentDatatype = attribute.componentDatatype;
  var typedArray = attribute.vertexBuffer;
  var byteOffset = typedArray.byteOffset;
  var bufferLength =
    typedArray.byteLength / ComponentDatatype.getSizeInBytes(componentDatatype);
  var positionsBuffer = ComponentDatatype.createArrayBufferView(
    componentDatatype,
    typedArray.buffer,
    byteOffset,
    bufferLength
  );

  attribute = vertexArray.attributes._BATCHID;
  componentDatatype = attribute.componentDatatype;
  typedArray = attribute.vertexBuffer;
  byteOffset = typedArray.byteOffset;
  bufferLength =
    typedArray.byteLength / ComponentDatatype.getSizeInBytes(componentDatatype);
  var vertexBatchIds = ComponentDatatype.createArrayBufferView(
    componentDatatype,
    typedArray.buffer,
    byteOffset,
    bufferLength
  );

  var buffer = vertexArray.indexBuffer.typedArray;
  var indices;
  if (vertexArray.indexBuffer.indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
    indices = new Uint16Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength / Uint16Array.BYTES_PER_ELEMENT
    );
  } else {
    indices = new Uint32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength / Uint32Array.BYTES_PER_ELEMENT
    );
  }

  positionsBuffer = arraySlice(positionsBuffer);
  vertexBatchIds = arraySlice(vertexBatchIds);
  indices = arraySlice(indices, offset, offset + count);

  var batchIds = [];
  var indexCounts = [];
  var indexOffsets = [];
  var batchedIndices = [];

  var currentId = vertexBatchIds[indices[0]];
  batchIds.push(currentId);
  indexOffsets.push(0);

  var batchId;
  var indexOffset;
  var indexCount;
  var indicesLength = indices.length;
  for (var j = 1; j < indicesLength; ++j) {
    batchId = vertexBatchIds[indices[j]];
    if (batchId !== currentId) {
      indexOffset = indexOffsets[indexOffsets.length - 1];
      indexCount = j - indexOffset;

      batchIds.push(batchId);
      indexCounts.push(indexCount);
      indexOffsets.push(j);

      batchedIndices.push(
        new Vector3DTileBatch({
          offset: indexOffset,
          count: indexCount,
          batchIds: [currentId],
          color: Color.WHITE,
        })
      );

      currentId = batchId;
    }
  }

  indexOffset = indexOffsets[indexOffsets.length - 1];
  indexCount = indicesLength - indexOffset;

  indexCounts.push(indexCount);
  batchedIndices.push(
    new Vector3DTileBatch({
      offset: indexOffset,
      count: indexCount,
      batchIds: [currentId],
      color: Color.WHITE,
    })
  );

  var shader = model._shaderProgram;
  var vertexShaderSource = shader.vertexShaderSource;
  var fragmentShaderSource = shader.fragmentShaderSource;
  var attributeLocations = shader.attributeLocations;
  var pickId = defined(model._pickIdLoaded) ? model._pickIdLoaded() : undefined;

  model._primitive = new Vector3DTilePrimitive({
    classificationType: model._classificationType,
    positions: positionsBuffer,
    indices: indices,
    indexOffsets: indexOffsets,
    indexCounts: indexCounts,
    batchIds: batchIds,
    vertexBatchIds: vertexBatchIds,
    batchedIndices: batchedIndices,
    batchTable: batchTable,
    boundingVolume: new BoundingSphere(), // updated in update()
    _vertexShaderSource: vertexShaderSource,
    _fragmentShaderSource: fragmentShaderSource,
    _attributeLocations: attributeLocations,
    _uniformMap: uniformMap,
    _pickId: pickId,
    _modelMatrix: new Matrix4(), // updated in update()
    _boundingSphere: boundingSphere, // used to update boundingVolume
  });

  // Release CPU resources
  model._buffers = undefined;
  model._vertexArray = undefined;
  model._shaderProgram = undefined;
  model._uniformMap = undefined;
}

function createRuntimeNodes(model) {
  var loadResources = model._loadResources;
  if (!loadResources.finished()) {
    return;
  }

  if (defined(model._primitive)) {
    return;
  }

  var gltf = model.gltf;
  var nodes = gltf.nodes;
  var gltfNode = nodes[0];
  model._nodeMatrix = ModelUtility.getTransform(gltfNode, model._nodeMatrix);

  createPrimitive(model);
}

function createResources(model, frameState) {
  var context = frameState.context;

  ModelUtility.checkSupportedGlExtensions(model.gltf.glExtensionsUsed, context);
  createBuffers(model); // using glTF bufferViews
  createProgram(model);
  createVertexArray(model); // using glTF meshes
  createUniformMap(model, context); // using glTF materials/techniques
  createRuntimeNodes(model); // using glTF scene
}

///////////////////////////////////////////////////////////////////////////

var scratchComputedTranslation = new Cartesian4();
var scratchComputedMatrixIn2D = new Matrix4();

function updateNodeModelMatrix(
  model,
  modelTransformChanged,
  justLoaded,
  projection
) {
  var computedModelMatrix = model._computedModelMatrix;

  if (model._mode !== SceneMode.SCENE3D && !model._ignoreCommands) {
    var translation = Matrix4.getColumn(
      computedModelMatrix,
      3,
      scratchComputedTranslation
    );
    if (!Cartesian4.equals(translation, Cartesian4.UNIT_W)) {
      computedModelMatrix = Transforms.basisTo2D(
        projection,
        computedModelMatrix,
        scratchComputedMatrixIn2D
      );
      model._rtcCenter = model._rtcCenter3D;
    } else {
      var center = model.boundingSphere.center;
      var to2D = Transforms.wgs84To2DModelMatrix(
        projection,
        center,
        scratchComputedMatrixIn2D
      );
      computedModelMatrix = Matrix4.multiply(
        to2D,
        computedModelMatrix,
        scratchComputedMatrixIn2D
      );

      if (defined(model._rtcCenter)) {
        Matrix4.setTranslation(
          computedModelMatrix,
          Cartesian4.UNIT_W,
          computedModelMatrix
        );
        model._rtcCenter = model._rtcCenter2D;
      }
    }
  }

  var primitive = model._primitive;

  if (modelTransformChanged || justLoaded) {
    Matrix4.multiplyTransformation(
      computedModelMatrix,
      model._nodeMatrix,
      primitive._modelMatrix
    );
    BoundingSphere.transform(
      primitive._boundingSphere,
      primitive._modelMatrix,
      primitive._boundingVolume
    );

    if (defined(model._rtcCenter)) {
      Cartesian3.add(
        model._rtcCenter,
        primitive._boundingVolume.center,
        primitive._boundingVolume.center
      );
    }
  }
}

///////////////////////////////////////////////////////////////////////////

ClassificationModel.prototype.updateCommands = function (batchId, color) {
  this._primitive.updateCommands(batchId, color);
};

ClassificationModel.prototype.update = function (frameState) {
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }
  var supportsWebP = FeatureDetection.supportsWebP();

  if (this._state === ModelState.NEEDS_LOAD && defined(this.gltf)) {
    this._state = ModelState.LOADING;
    if (this._state !== ModelState.FAILED) {
      var extensions = this.gltf.extensions;
      if (defined(extensions) && defined(extensions.CESIUM_RTC)) {
        var center = Cartesian3.fromArray(extensions.CESIUM_RTC.center);
        if (!Cartesian3.equals(center, Cartesian3.ZERO)) {
          this._rtcCenter3D = center;

          var projection = frameState.mapProjection;
          var ellipsoid = projection.ellipsoid;
          var cartographic = ellipsoid.cartesianToCartographic(
            this._rtcCenter3D
          );
          var projectedCart = projection.project(cartographic);
          Cartesian3.fromElements(
            projectedCart.z,
            projectedCart.x,
            projectedCart.y,
            projectedCart
          );
          this._rtcCenter2D = projectedCart;

          this._rtcCenterEye = new Cartesian3();
          this._rtcCenter = this._rtcCenter3D;
        }
      }

      this._loadResources = new ModelLoadResources();
      ModelUtility.parseBuffers(this);
    }
  }

  var loadResources = this._loadResources;
  var justLoaded = false;

  if (this._state === ModelState.LOADING) {
    // Transition from LOADING -> LOADED once resources are downloaded and created.
    // Textures may continue to stream in while in the LOADED state.
    if (loadResources.pendingBufferLoads === 0) {
      ModelUtility.checkSupportedExtensions(
        this.extensionsRequired,
        supportsWebP
      );

      addBuffersToLoadResources(this);
      parseBufferViews(this);

      this._boundingSphere = ModelUtility.computeBoundingSphere(this);
      this._initialRadius = this._boundingSphere.radius;
      createResources(this, frameState);
    }
    if (loadResources.finished()) {
      this._state = ModelState.LOADED;
      justLoaded = true;
    }
  }

  if (defined(loadResources) && this._state === ModelState.LOADED) {
    if (!justLoaded) {
      createResources(this, frameState);
    }

    if (loadResources.finished()) {
      this._loadResources = undefined; // Clear CPU memory since WebGL resources were created.
    }
  }

  var show = this.show;

  if ((show && this._state === ModelState.LOADED) || justLoaded) {
    this._dirty = false;
    var modelMatrix = this.modelMatrix;

    var modeChanged = frameState.mode !== this._mode;
    this._mode = frameState.mode;

    // ClassificationModel's model matrix needs to be updated
    var modelTransformChanged =
      !Matrix4.equals(this._modelMatrix, modelMatrix) || modeChanged;

    if (modelTransformChanged || justLoaded) {
      Matrix4.clone(modelMatrix, this._modelMatrix);

      var computedModelMatrix = this._computedModelMatrix;
      Matrix4.clone(modelMatrix, computedModelMatrix);
      if (this._upAxis === Axis.Y) {
        Matrix4.multiplyTransformation(
          computedModelMatrix,
          Axis.Y_UP_TO_Z_UP,
          computedModelMatrix
        );
      } else if (this._upAxis === Axis.X) {
        Matrix4.multiplyTransformation(
          computedModelMatrix,
          Axis.X_UP_TO_Z_UP,
          computedModelMatrix
        );
      }
    }

    // Update modelMatrix throughout the graph as needed
    if (modelTransformChanged || justLoaded) {
      updateNodeModelMatrix(
        this,
        modelTransformChanged,
        justLoaded,
        frameState.mapProjection
      );
      this._dirty = true;
    }
  }

  if (justLoaded) {
    // Called after modelMatrix update.
    var model = this;
    frameState.afterRender.push(function () {
      model._ready = true;
      model._readyPromise.resolve(model);
    });
    return;
  }

  if (show && !this._ignoreCommands) {
    this._primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
    this._primitive.debugWireframe = this.debugWireframe;
    this._primitive.update(frameState);
  }
};

ClassificationModel.prototype.isDestroyed = function () {
  return false;
};

ClassificationModel.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  return destroyObject(this);
};
export default ClassificationModel;
