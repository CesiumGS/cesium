import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import ManagedArray from "../Core/ManagedArray.js";
import Matrix4 from "../Core/Matrix4.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import VertexArray from "../Renderer/VertexArray.js";
import numberOfComponentsForType from "../ThirdParty/GltfPipeline/numberOfComponentsForType.js";
import when from "../ThirdParty/when.js";
import GltfLoader from "./GltfLoader.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";

var ModelState = {
  UNLOADED: 0,
  LOADING: 1,
  READY_EXCEPT_TEXTURES: 2,
  READY: 3,
  FAILED: 4,
};

export default function Model(options) {
  this._loader = options.loader;
  this._nodes = [];
  this._featureMetadata = undefined;
  this._state = ModelState.UNLOADED;
  this._readyPromise = when.defer();
}

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.
 * </p>
 */
Model.prototype.update = function (frameState) {
  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }

  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  var readyBefore =
    this._state === ModelState.READY_EXCEPT_TEXTURES ||
    this._state === ModelState.READY;

  if (this._state === ModelState.UNLOADED) {
    this._state = ModelState.LOADING;
    load(this, frameState);
  }

  if (
    this._state === ModelState.PROCESSING ||
    this._state === ModelState.READY_EXCEPT_TEXTURES
  ) {
    process(this, frameState);
  }

  var ready =
    this._state === ModelState.READY_EXCEPT_TEXTURES ||
    this._state === ModelState.READY;

  if (!readyBefore && ready) {
    createCommands();
  }

  if (ready) {
    update(this, frameState);
  }
};

/**
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 *
 * @returns {Model} The newly created model.
 */
Model.fromGltf = function (options) {
  options = defined(options)
    ? clone(options, false)
    : defaultValue.EMPTY_OBJECT;

  var url = options.url;
  var basePath = options.basePath;
  var keepResident = defaultValue(options.keepResident, false); // Undocumented option

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", url);
  //>>includeEnd('debug');

  var loaderOptions = {
    uri: url,
    basePath: basePath,
    keepResident: keepResident,
  };

  // Prepare options for Model
  options.loader = new GltfLoader(loaderOptions);

  delete options.url;
  delete options.basePath;
  delete options.keepResident;

  return new Model(options);
};

function load(model, frameState) {
  var loader = model._loader;
  if (!defined(loader)) {
    model._state = ModelState.READY;
    return;
  }

  loader.load(frameState);
  model._state = ModelState.LOADING;
}

function process(model, frameState) {
  var loader = model._loader;
  if (!defined(loader)) {
    return;
  }

  loader.process(frameState);

  if (defined(loader.error)) {
    model._state = ModelState.FAILED;
    model._readyPromise.reject(loader.error);
    return;
  }

  if (loader.readyExceptTextures) {
    model._state = ModelState.READY_EXCEPT_TEXTURES;
  }

  if (loader.ready) {
    model._state = ModelState.READY;
  }

  model._nodes = loader.nodes;
  model._featureMetadata = loader.featureMetadata;
}

var scratchStack = new ManagedArray();

function sortAttributes(attributes) {
  attributes.sort(function (attributeA, attributeB) {
    if (attributeA.semantic === "POSITION") {
      return -1;
    }
    if (attributeB.semantic === "POSITION") {
      return 1;
    }
    return 0;
  });
}

function createCommands(model, frameState) {
  var i;
  var pickId;

  var context = frameState.context;
  var allowPicking = model._allowPicking; // TODO
  var nodes = model._nodes;
  var nodesLength = nodes.length;

  var commands = [];

  var stack = scratchStack;
  stack.length = 0;

  for (i = 0; i < nodesLength; ++i) {
    stack.push(nodes[i]);
  }

  while (stack.length > 0) {
    var node = stack.pop();
    var mesh = node.mesh;
    if (defined(mesh)) {
      var primitives = mesh.primitives;
      var primitivesLength = primitives.length;
      for (i = 0; i < primitivesLength; ++i) {
        var primitive = primitives[i];
        var attributes = primitive.attributes;
        var attributesLength = attributes.length;

        if (attributesLength === 0) {
          // No position attribute. Skip this primitive.
          continue;
        }

        // Sort attributes so that POSITION comes first
        // Some devices expect POSITION to be the 0th attribute in the VAO
        sortAttributes(attributes);

        if (attributes[0].semantic !== "POSITION") {
          // No position attribute. Skip this primitive.
          continue;
        }

        var positionAttribute = attributes[0];
        var min = Cartesian3.fromArray(positionAttribute.min);
        var max = Cartesian3.fromArray(positionAttribute.max);
        var boundingSphere = BoundingSphere.fromCornerPoints(min, max);

        var vertexAttributes = [];

        for (var j = 0; j < attributesLength; ++j) {
          var attribute = attributes[j];
          vertexAttributes.push({
            index: j,
            vertexBuffer: attribute.vertexBuffer,
            componentsPerAttribute: numberOfComponentsForType(attribute.type),
            componentDatatype: attribute.componentType,
            normalize: attribute.normalized,
            offsetInBytes: attribute.byteOffset,
            strideInBytes: attribute.byteStride,
          });
        }

        var indices = primitive.indices;
        var indexBuffer = defined(indices) ? indices.indexBuffer : undefined;
        var count = defined(indices) ? indices.count : positionAttribute.count;
        var offset = 0;

        var vertexArray = new VertexArray({
          context: context,
          attributes: vertexAttributes,
          indexBuffer: indexBuffer,
        });

        var castShadows = ShadowMode.castShadows(model._shadows);
        var receiveShadows = ShadowMode.receiveShadows(model._shadows);

        var uniformMap = {}; // TODO

        var renderState = RenderState.fromCache({}); // TODO
        var isTranslucent = true; // TODO

        var owner = model._pickObject; // TODO
        if (!defined(owner)) {
          owner = {
            primitive: model,
            id: model.id,
            node: undefined, //runtimeNode.publicNode,
            mesh: undefined, //runtimeMeshesByName[mesh.name],
          };
        }

        pickId = undefined;
        if (allowPicking && !defined(model._uniformMapLoaded)) {
          pickId = context.createPickId(owner);
          pickIds.push(pickId);
          var pickUniforms = {
            czm_pickColor: createPickColorFunction(pickId.color),
          };
          uniformMap = combine(uniformMap, pickUniforms);
        }

        if (allowPicking) {
          if (
            defined(model._pickIdLoaded) &&
            defined(model._uniformMapLoaded)
          ) {
            pickId = model._pickIdLoaded();
          } else {
            pickId = "czm_pickColor";
          }
        }

        var command = new DrawCommand({
          boundingVolume: boundingSphere,
          cull: model.cull, // TODO
          modelMatrix: new Matrix4(),
          primitiveType: primitive.mode,
          vertexArray: vertexArray,
          count: count,
          offset: offset,
          shaderProgram: rendererPrograms[programId],
          castShadows: castShadows,
          receiveShadows: receiveShadows,
          uniformMap: uniformMap,
          renderState: renderState,
          owner: owner,
          pass: isTranslucent ? Pass.TRANSLUCENT : model.opaquePass,
          pickId: pickId,
        });
      }
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

function update(model, frameState) {}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Model#destroy
 */
Model.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * model = model && model.destroy();
 *
 * @see Model#isDestroyed
 */
Model.prototype.destroy = function () {
  this._loader.destroy();
  return destroyObject(this);
};
