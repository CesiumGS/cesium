import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import ManagedArray from "../Core/ManagedArray.js";
import Resource from "../Core/Resource.js";
import numberOfComponentsForType from "../ThirdParty/GltfPipeline/numberOfComponentsForType.js";
import when from "../ThirdParty/when.js";
import GltfLoader from "./GltfLoader.js";
import MetadataType from "./MetadataType.js";
import SceneMode from "./SceneMode.js";

var ModelState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

/**
 * @private
 */
export default function Model(options) {
  this._loader = options.loader;
  this._components = undefined;
  this._texturesLoaded = false;
  this._commandsCreated = false;
  this._components = undefined;
  this._state = ModelState.UNLOADED;
  this._readyPromise = when.defer();
}

Object.defineProperties(Model.prototype, {
  /**
   * When <code>true</code>, this model is ready to render, i.e., the external
   * resources were downloaded and the WebGL resources were created. This is set
   * to <code>true</code> right before {@link Model#readyPromise} is resolved.
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._state === ModelState.READY;
    },
  },

  /**
   * Gets the promise that will be resolved when this model is ready to render,
   * i.e., when the resources were downloaded and the WebGL resources were created.
   * <p>
   * This promise is resolved at the end of the frame before the first frame the model is rendered in.
   * </p>
   *
   * @memberof Model.prototype
   * @type {Promise.<Model>}
   * @readonly
   *
   * @example
   * // Play all animations at half-speed when the model is ready to render
   * model.readyPromise.then(function(model) {
   *   model.activeAnimations.addAll({
   *     multiplier : 0.5
   *   });
   * }).otherwise(function(error){
   *   window.alert(error);
   * });
   *
   * @see Model#ready
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

/**
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 *
 * <p>
 * Cesium supports glTF assets with the following extensions:
 * <p>glTF 2.0</p>
 * <ul>
 * <li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md|KHR_draco_mesh_compression}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/README.md|KHR_materials_pbrSpecularGlossiness}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md|KHR_materials_unlit}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/README.md|KHR_texture_transform}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_mesh_quantization/README.md|KHR_mesh_quantization}
 * </li>
 * </ul>
 * </p>
 *
 * @returns {Model} The newly created model.
 */
Model.fromGltf = function (options) {
  // TODO: validation layer?
  // TODO: throw if encountering an unrecognized required extension
  // TODO: need to recognize per-vertex metadata and convert it vertex attribute
  // TODO: this can have different interpolations: https://github.com/CesiumGS/3d-tiles-next/issues/15
  // TODO: random per-vertex attributes could be draco encoded. so could per-vertex metadata. so min/max metadata is required to support
  // TODO: most other stuff can be baked in the model matrix, normal matrix, tangent matrix
  options = defined(options) ? options : defaultValue.EMPTY_OBJECT;

  var url = options.url;
  var basePath = options.basePath;
  var releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  var asynchronous = defaultValue(options.asynchronous, true);
  var incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  var allowPicking = defaultValue(options.allowPicking, true);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", url);
  //>>includeEnd('debug');

  var gltfResource = Resource.createIfNeeded(url);
  var baseResource = Resource.createIfNeeded(basePath);

  var loaderOptions = {
    gltfResource: gltfResource,
    baseResource: baseResource,
    releaseGltfJson: releaseGltfJson,
    asynchronous: asynchronous,
    incrementallyLoadTextures: incrementallyLoadTextures,
  };

  var modelOptions = {
    loader: new GltfLoader(loaderOptions),
    // incrementallyLoadTextures: incrementallyLoadTextures,
    allowPicking: allowPicking,
  };

  return new Model(modelOptions);
};

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.
 * </p>
 */
Model.prototype.update = function (frameState) {
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  var that = this;

  if (!defined(this._loader)) {
    this._state = ModelState.READY;
    this._texturesLoaded = true;
  }

  if (this._state === ModelState.UNLOADED) {
    this._state = ModelState.LOADING;
    this._loader.load();

    this._loader.promise
      .then(function (loader) {
        that._components = loader.components;
        that._state = ModelState.READY;
      })
      .otherwise(function (error) {
        that._state = ModelState.FAILED;
        that._readyPromise.reject(error);
      });
    this._loader.texturesLoadedPromise.then(function () {
      that._texturesLoaded = true;
    });
  }

  if (
    this._state === ModelState.LOADING ||
    (this._state === ModelState.READY && !this._texturesLoaded)
  ) {
    this._loader.process(frameState);
  }

  if (this._state === ModelState.READY && !this._commandsCreated) {
    this._commandsCreated = true;
    createCommands(this, frameState);

    frameState.afterRender.push(function () {
      that._readyPromise.resolve(that);
    });

    return;
  }

  if (this._state === ModelState.READY) {
    update(this, frameState);
  }
};

var scratchStack = new ManagedArray();

function getUniformFunction(value) {
  return function () {
    return value;
  };
}

function getBoundingSphere(positionAttribute) {
  var min = Cartesian3.clone(positionAttribute.min);
  var max = Cartesian3.clone(positionAttribute.max);

  if (positionAttribute.normalized) {
    // The position may be normalized when loaded a glTF that has the
    // KHR_mesh_quantization extension. Unnormalize the min/max to account for this.
    var componentDatatype = positionAttribute.componentDatatype;
    var metadataType = MetadataType.fromComponentDatatype(componentDatatype);
    min.x = MetadataType.unnormalize(min.x, metadataType);
    min.y = MetadataType.unnormalize(min.y, metadataType);
    min.z = MetadataType.unnormalize(min.z, metadataType);
    max.x = MetadataType.unnormalize(max.x, metadataType);
    max.y = MetadataType.unnormalize(max.y, metadataType);
    max.z = MetadataType.unnormalize(max.z, metadataType);
  }

  return BoundingSphere.fromCornerPoints(min, max);
}

function createCommands(model, frameState) {
  frameState.context.cache.modelShaderCache = defaultValue(
    frameState.context.cache.modelShaderCache,
    {}
  );

  var i;
  var j;
  var attribute;
  var pickId;

  var context = frameState.context;
  var allowPicking = model._allowPicking;
  var components = model._components;
  var scene = components.scene;
  var nodes = scene.nodes;
  var nodesLength = nodes.length;
  var featureMetadata = components.featureMetadata;

  var commands = [];

  var stack = scratchStack;
  stack.length = 0;

  for (i = 0; i < nodesLength; ++i) {
    stack.push(nodes[i]);
  }

  while (stack.length > 0) {
    var node = stack.pop();
    var primitives = node.primitives;
    var primitivesLength = primitives.length;

    for (i = 0; i < primitivesLength; ++i) {
      var primitive = primitives[i];
      var attributes = primitive.attributes;
      var attributesLength = attributes.length;

      var positionIndex = -1;
      for (j = 0; j < attributesLength; ++j) {
        attribute = attributes[j];
        if (attribute.semantic === "POSITION") {
          positionIndex = j;
          break;
        }
      }

      if (positionIndex === -1) {
        // No position attribute. Skip this primitive.
        continue;
      }

      // Set the position attribute to the 0th index. In some WebGL implementations the shader
      // will not work correctly if the 0th attribute is not active. For example, some glTF models
      // list the normal attribute first but derived shaders like the cast-shadows shader do not use
      // the normal attribute.
      if (positionIndex > 0) {
        var attributeToSwap = attributes[0];
        attributes[0] = attributes[positionIndex];
        attributes[positionIndex] = attributeToSwap;
      }
      // TODO: avoid rearranging the user's data?

      var positionAttribute = attributes[0];
      var boundingSphere = getBoundingSphere(positionAttribute);

      var uniformMap = {};
      var vertexAttributes = [];

      for (j = 0; j < attributesLength; ++j) {
        attribute = attributes[j];
        var semantic = attribute.semantic;
        var type = attribute.type;
        var componentDatatype = attribute.componentDatatype;
        var normalized = attribute.normalized;

        var quantization = attribute.quantization;
        if (defined(quantization)) {
          type = quantization.type;
          componentDatatype = quantization.componentDatatype;
          normalized = false; // Normalization happens manually in the shader

          var attributeName = semantic;
          if (attributeName.charAt(0) === "_") {
            attributeName = attributeName.slice(1);
          }
          attributeName = attributeName.toLowerCase();

          // if (quantization.octEncoded) {
          //   uniformMap[
          //     "u_octEncodedRange_" + attributeName
          //   ] = getUniformFunction(quantization.normalizationRange);
          // } else {
          //   var quantizedVolumeOffset = quantization.quantizedVolumeOffset;
          //   var quantizedVolumeDimensions =
          //     quantization.quantizedVolumeDimensions;
          //   var normalizationRange = quantization.normalizationRange;
          //   var quantizedVolumeScale;

          //   var MathType = AttributeType.getMathType(type);
          //   if (MathType === Number) {
          //     quantizedVolumeScale =
          //       quantizedVolumeDimensions / normalizationRange;
          //   } else {
          //     quantizedVolumeScale = MathType.clone(quantizedVolumeDimensions);
          //     MathType.divideByScalar(quantizedVolumeScale, normalizationRange);
          //   }

          //   uniformMap["u_quantizedVolumeOffset"];

          //   uniformMap[
          //     "u_quantizedVolumeScale_" + attributeName
          //   ] = getUniformFunction(quantizedVolumeScale);
          // }

          // var uniformVarName = "model_quantizedVolumeScaleAndOctEncodedRange_" + attribute.toLowerCase();
          // var
        }

        var componentsPerAttribute = numberOfComponentsForType(type);

        vertexAttributes.push({
          index: j,
          vertexBuffer: attribute.buffer,
          componentsPerAttribute: componentsPerAttribute,
          componentDatatype: componentDatatype,
          normalize: normalized,
          offsetInBytes: attribute.byteOffset,
          strideInBytes: attribute.byteStride,
        });
      }

      var indices = primitive.indices;
      var indexBuffer = defined(indices) ? indices.buffer : undefined;
      var count = defined(indices) ? indices.count : positionAttribute.count;
      var offset = 0;

      var vertexArray = new VertexArray({
        context: context,
        attributes: vertexAttributes,
        indexBuffer: indexBuffer,
      });

      // var renderState = RenderState.fromCache({}); // TODO
      // var isTranslucent = true; // TODO

      // var owner = model._pickObject; // TODO
      // if (!defined(owner)) {
      //   owner = {
      //     primitive: model,
      //     id: model.id,
      //     node: undefined, //runtimeNode.publicNode,
      //     mesh: undefined, //runtimeMeshesByName[mesh.name],
      //   };
      // }

      // pickId = undefined;
      // if (allowPicking && !defined(model._uniformMapLoaded)) {
      //   pickId = context.createPickId(owner);
      //   pickIds.push(pickId);
      //   var pickUniforms = {
      //     czm_pickColor: createPickColorFunction(pickId.color),
      //   };
      //   uniformMap = combine(uniformMap, pickUniforms);
      // }

      // if (allowPicking) {
      //   if (defined(model._pickIdLoaded) && defined(model._uniformMapLoaded)) {
      //     pickId = model._pickIdLoaded();
      //   } else {
      //     pickId = "czm_pickColor";
      //   }
      // }

      // var command = new DrawCommand({
      //   boundingVolume: boundingSphere,
      //   cull: model.cull, // TODO
      //   modelMatrix: new Matrix4(),
      //   primitiveType: primitive.mode,
      //   vertexArray: vertexArray,
      //   count: count,
      //   offset: offset,
      //   shaderProgram: rendererPrograms[programId],
      //   castShadows: castShadows,
      //   receiveShadows: receiveShadows,
      //   uniformMap: uniformMap,
      //   renderState: renderState,
      //   owner: owner,
      //   pass: isTranslucent ? Pass.TRANSLUCENT : model.opaquePass,
      //   pickId: pickId,
      // });
    }
  }

  // if (defined(this._root)) {
  //   var stack = scratchStack;
  //   stack.push(this._root);

  //   while (stack.length > 0) {
  //     var tile = stack.pop();
  //     tile.destroy();

  //     var children = tile.children;
  //     var length = children.length;
  //     for (var i = 0; i < length; ++i) {
  //       stack.push(children[i]);
  //     }
  //   }
  // }
}

function update(model) {}
