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
import ShaderSource from "../Renderer/ShaderSource.js";
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

function DelayLoadedTextureUniform(value, textures, defaultTexture) {
  this._value = undefined;
  this._textureId = value.index;
  this._textures = textures;
  this._defaultTexture = defaultTexture;
}

Object.defineProperties(DelayLoadedTextureUniform.prototype, {
  value: {
    get: function () {
      // Use the default texture (1x1 white) until the model's texture is loaded
      if (!defined(this._value)) {
        var texture = this._textures[this._textureId];
        if (defined(texture)) {
          this._value = texture;
        } else {
          return this._defaultTexture;
        }
      }

      return this._value;
    },
    set: function (value) {
      this._value = value;
    },
  },
});

DelayLoadedTextureUniform.prototype.clone = function (source) {
  return source;
};

DelayLoadedTextureUniform.prototype.func = undefined;
///////////////////////////////////////////////////////////////////////////

function getTextureUniformFunction(value, textures, defaultTexture) {
  var uniform = new DelayLoadedTextureUniform(value, textures, defaultTexture);
  // Define function here to access closure since 'this' can't be
  // used when the Renderer sets uniforms.
  uniform.func = function () {
    return uniform.value;
  };
  return uniform;
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

function getShaderProgram(frameState) {
  var context = frameState.context;
  var shaderCache = context.cache.modelShaderCache;

  var useTargetPositions = [];
  var useTargetNormals = [];
  var useTargetTangents = [];

  var useInstancedFeatureId;


  var useFeatureIdTexture;
  var useFeatureTexture;
  var perPointFeatures;
  var vertexTextureFetchSupported = ContextLimits.maximumVertexTextureImageUnits > 0;


  // Can only one thing do picking at a time?
  // Which thing has precedence?

  // TODO: pack attributes

// NORMAL could be used in styling language or custom shaders but not for lighting

// TOOD: might be breaking backwards compatability with i3dm
// because glTF instancing extension says that instance matrix
// is applied first before the computed node transform
// but i3dm applies the node transform before the instance transform

// Need to associate feature ids with batch table textures somehow


  var useStyle = true;
  var useColorStyle = true;
  var useShowStyle = true;

  // By default per-feature color/show are evaluated in JavaScript (precomputed). In some situations styles must be evaluated in GLSL:
  // * Styles that use dynamic uniforms like https://github.com/CesiumGS/cesium/pull/5380
  // * Styles that are time dynamic
  // * Styles that use vertex attributes
  // * Styles that use feature textures
  // * Styles that use per-point properties (too expensive to have a Cesium3DTileFeature for each point)
  var useStylePrecomputed = !useFeatureTexture; // TODO

  // By default styles are applied in the vertex shader. In some situations styles must be applied in the fragment shader instead:
  // * Feature ID textures
  // * Feature textures
  // * Vertex Texture Fetch not supported
  // * When per-fragment granularity is required (e.g. styles that use interpolated vertex attributes)
  var useStyleInVertexShader = vertexTextureFetchSupported && !useFeatureTexture && !useFeatureIdTexture;


  var useFeatureId = 

  var useTargetPositionsLength = useTargetPositions.length;
  var useTargetNormalsLength = useTargetNormals.length;
  var useTargetTangentsLength = useTargetTangents.length;

  var flags0 =
  useNormal |
  useTangent << 1 |
  useTexcoord0 << 2 |
  useTexcoord1 << 3 |
  useColor << 4 |
  useFeatureId0 << 23 |
  useFeatureId1 << 24 |
  useInstancing << 
  useSkinning << 5 |
  useMorphTargets << 6 |
  useTargetPosition0 << 7
  useTargetPosition1 << 8
  useTargetPosition2 << 9
  useTargetPosition3 << 10
  useTargetPosition4 << 11
  useTargetPosition5 << 12
  useTargetPosition6 << 13
  useTargetPosition7 << 14
  useTargetNormal0 << 15
  useTargetNormal1 << 16
  useTargetNormal2 << 17
  useTargetNormal3 << 18
  useTargetTangent0 << 19
  useTargetTangent1 << 20
  useTargetTangent2 << 21
  useTargetTangent3 << 22
  useCpuStyling << 25 |
  useVertexShaderStyling << 26 |
  useLighting << 27 |
  useMetallicRoughness << 28 |
  useBaseColorTexture << 29 |
  useMetallicRoughnessTexture << 30 |
  useSpecularGlossiness << 31 |
  useDiffuseTexture << 32;

  var flags1 =
  useSpecularGlossinessTexture;

  var key = flags0 + "_" + flags1 + "_" + morphTargetCount + "_" + jointCount;

  var shaderProgram = shaderCache[key];
  if (!defined(shaderProgram)) {
    var vsDefines = [];
    var fsDefines = [];

    if (useLighting) {
      vsDefines.push("USE_LIGHTING");
      fsDefines.push("USE_LIGHTING");
    }

    if (useNormal) {
      vsDefines.push("USE_NORMAL");
      fsDefines.push("USE_NORMAL");
    }

    if (useTangent) {
      vsDefines.push("USE_TANGENT");
      fsDefines.push("USE_TANGENT");
    }

    if (useTexcoord0) {
      vsDefines.push("USE_TEXCOORD_0");
      fsDefines.push("USE_TEXCOORD_0");
    }

    if (useTexcoord1) {
      vsDefines.push("USE_TEXCOORD_1");
      fsDefines.push("USE_TEXCOORD_1");
    }

    if (useColor) {
      vsDefines.push("USE_COLOR");
      fsDefines.push("USE_COLOR");
    }
    
    if (useFeatureId0) {
      vsDefines.push("USE_FEATURE_ID_0");
      if (!useCpuStyling) {
        fsDefines.push("USE_FEATURE_ID_0");
      }
    }

    if (useFeatureId1) {
      vsDefines.push("USE_FEATURE_ID_1");
      if (!useCpuStyling) {
        fsDefines.push("USE_FEATURE_ID_1");
      }
    }

    if (useSkinning) {
      vsDefines.push("USE_SKINNING");
      vsDefines.push("JOINT_COUNT " + jointCount);
    }

    if (useMorphTargets) {
      vsDefines.push("USE_MORPH_TARGETS");
      vsDefines.push("MORPH_TARGET_COUNT " + morphTargetCount);
    }

    var i;
    for (i = 0; i < useTargetPositionsLength; ++i) {
      vsDefines.push("USE_TARGET_POSITION_" + i);
    }

    for (i = 0; i < useTargetNormalsLength; ++i) {
      vsDefines.push("USE_TARGET_NORMAL_" + i);
    }

    for (i = 0; i < useTargetTangentsLength; ++i) {
      vsDefines.push("USE_TARGET_TANGENT_" + i);
    }

    var vertexShaderSource = new ShaderSource({
      defines: vsDefines,
      sources: [ModelVS],
    });

    var fragmentShaderSource = new ShaderSource({
      defines: fsDefines,
      sources: [ModelFS]
    })

    var attributeLocations = 

    shaderProgram = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vertexShaderSource,
      fragmentShaderSource: fragmentShaderSource,
      attributeLocations: attributeLocations,
    });
  

    shaderCache[key] = new ShaderProgram
  }

  if (defined(shaderCache[key])) {

  }


}

function createCommands(model, frameState) {
  context.cache.modelShaderCache = defaultValue(
    context.cache.modelShaderCache,
    {}
  );


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

        // Set the position attribute to the 0th index. In some WebGL implementations the shader
        // will not work correctly if the 0th attribute is not active. For example, some glTF models
        // list the normal attribute first but derived shaders like the cast-shadows shader do not use
        // the normal attribute.
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

function getShader

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
