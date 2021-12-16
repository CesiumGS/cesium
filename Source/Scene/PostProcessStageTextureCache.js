import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import CesiumMath from "../Core/Math.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import FramebufferManager from "../Renderer/FramebufferManager.js";

/**
 * Creates a minimal amount of textures and framebuffers.
 *
 * @alias PostProcessStageTextureCache
 * @constructor
 *
 * @param {PostProcessStageCollection} postProcessStageCollection The post process collection.
 *
 * @private
 */
function PostProcessStageTextureCache(postProcessStageCollection) {
  this._collection = postProcessStageCollection;

  this._framebuffers = [];
  this._stageNameToFramebuffer = {};

  this._width = undefined;
  this._height = undefined;
  this._updateDependencies = false;
}

function getLastStageName(stage) {
  while (defined(stage.length)) {
    stage = stage.get(stage.length - 1);
  }
  return stage.name;
}

function getStageDependencies(
  collection,
  context,
  dependencies,
  stage,
  previousName
) {
  if (!stage.enabled || !stage._isSupported(context)) {
    return previousName;
  }

  var stageDependencies = (dependencies[stage.name] = {});
  if (defined(previousName)) {
    var previous = collection.getStageByName(previousName);
    stageDependencies[getLastStageName(previous)] = true;
  }
  var uniforms = stage.uniforms;
  if (defined(uniforms)) {
    var uniformNames = Object.getOwnPropertyNames(uniforms);
    var uniformNamesLength = uniformNames.length;
    for (var i = 0; i < uniformNamesLength; ++i) {
      var value = uniforms[uniformNames[i]];
      if (typeof value === "string") {
        var dependent = collection.getStageByName(value);
        if (defined(dependent)) {
          stageDependencies[getLastStageName(dependent)] = true;
        }
      }
    }
  }

  return stage.name;
}

function getCompositeDependencies(
  collection,
  context,
  dependencies,
  composite,
  previousName
) {
  if (
    (defined(composite.enabled) && !composite.enabled) ||
    (defined(composite._isSupported) && !composite._isSupported(context))
  ) {
    return previousName;
  }

  var originalDependency = previousName;

  var inSeries =
    !defined(composite.inputPreviousStageTexture) ||
    composite.inputPreviousStageTexture;
  var currentName = previousName;
  var length = composite.length;
  for (var i = 0; i < length; ++i) {
    var stage = composite.get(i);
    if (defined(stage.length)) {
      currentName = getCompositeDependencies(
        collection,
        context,
        dependencies,
        stage,
        previousName
      );
    } else {
      currentName = getStageDependencies(
        collection,
        context,
        dependencies,
        stage,
        previousName
      );
    }
    // Stages in a series only depend on the previous stage
    if (inSeries) {
      previousName = currentName;
    }
  }

  // Stages not in a series depend on every stage executed before it since it could reference it as a uniform.
  // This prevents looking at the dependencies of each stage in the composite, but might create more framebuffers than necessary.
  // In practice, there are only 2-3 stages in these composites.
  var j;
  var name;
  if (!inSeries) {
    for (j = 1; j < length; ++j) {
      name = getLastStageName(composite.get(j));
      var currentDependencies = dependencies[name];
      for (var k = 0; k < j; ++k) {
        currentDependencies[getLastStageName(composite.get(k))] = true;
      }
    }
  } else {
    for (j = 1; j < length; ++j) {
      name = getLastStageName(composite.get(j));
      if (!defined(dependencies[name])) {
        dependencies[name] = {};
      }
      dependencies[name][originalDependency] = true;
    }
  }

  return currentName;
}

function getDependencies(collection, context) {
  var dependencies = {};

  if (defined(collection.ambientOcclusion)) {
    var ao = collection.ambientOcclusion;
    var bloom = collection.bloom;
    var tonemapping = collection._tonemapping;
    var fxaa = collection.fxaa;

    var previousName = getCompositeDependencies(
      collection,
      context,
      dependencies,
      ao,
      undefined
    );
    previousName = getCompositeDependencies(
      collection,
      context,
      dependencies,
      bloom,
      previousName
    );
    previousName = getStageDependencies(
      collection,
      context,
      dependencies,
      tonemapping,
      previousName
    );
    previousName = getCompositeDependencies(
      collection,
      context,
      dependencies,
      collection,
      previousName
    );
    getStageDependencies(collection, context, dependencies, fxaa, previousName);
  } else {
    getCompositeDependencies(
      collection,
      context,
      dependencies,
      collection,
      undefined
    );
  }

  return dependencies;
}

function getFramebuffer(cache, stageName, dependencies) {
  var collection = cache._collection;
  var stage = collection.getStageByName(stageName);

  var textureScale = stage._textureScale;
  var forcePowerOfTwo = stage._forcePowerOfTwo;
  var pixelFormat = stage._pixelFormat;
  var pixelDatatype = stage._pixelDatatype;
  var clearColor = stage._clearColor;

  var i;
  var framebuffer;
  var framebuffers = cache._framebuffers;
  var length = framebuffers.length;
  for (i = 0; i < length; ++i) {
    framebuffer = framebuffers[i];

    if (
      textureScale !== framebuffer.textureScale ||
      forcePowerOfTwo !== framebuffer.forcePowerOfTwo ||
      pixelFormat !== framebuffer.pixelFormat ||
      pixelDatatype !== framebuffer.pixelDatatype ||
      !Color.equals(clearColor, framebuffer.clearColor)
    ) {
      continue;
    }

    var stageNames = framebuffer.stages;
    var stagesLength = stageNames.length;
    var foundConflict = false;
    for (var j = 0; j < stagesLength; ++j) {
      if (dependencies[stageNames[j]]) {
        foundConflict = true;
        break;
      }
    }

    if (!foundConflict) {
      break;
    }
  }

  if (defined(framebuffer) && i < length) {
    framebuffer.stages.push(stageName);
    return framebuffer;
  }

  framebuffer = {
    textureScale: textureScale,
    forcePowerOfTwo: forcePowerOfTwo,
    pixelFormat: pixelFormat,
    pixelDatatype: pixelDatatype,
    clearColor: clearColor,
    stages: [stageName],
    buffer: new FramebufferManager(),
    clear: undefined,
  };

  framebuffers.push(framebuffer);
  return framebuffer;
}

function createFramebuffers(cache, context) {
  var dependencies = getDependencies(cache._collection, context);
  for (var stageName in dependencies) {
    if (dependencies.hasOwnProperty(stageName)) {
      cache._stageNameToFramebuffer[stageName] = getFramebuffer(
        cache,
        stageName,
        dependencies[stageName]
      );
    }
  }
}

function releaseResources(cache) {
  var framebuffers = cache._framebuffers;
  var length = framebuffers.length;
  for (var i = 0; i < length; ++i) {
    var framebuffer = framebuffers[i];
    framebuffer.buffer.destroyResources();
  }
}

function updateFramebuffers(cache, context) {
  var width = cache._width;
  var height = cache._height;

  var framebuffers = cache._framebuffers;
  var length = framebuffers.length;
  for (var i = 0; i < length; ++i) {
    var framebuffer = framebuffers[i];

    var scale = framebuffer.textureScale;
    var textureWidth = Math.ceil(width * scale);
    var textureHeight = Math.ceil(height * scale);

    var size = Math.min(textureWidth, textureHeight);
    if (framebuffer.forcePowerOfTwo) {
      if (!CesiumMath.isPowerOfTwo(size)) {
        size = CesiumMath.nextPowerOfTwo(size);
      }
      textureWidth = size;
      textureHeight = size;
    }

    framebuffer.buffer.update(
      context,
      textureWidth,
      textureHeight,
      false,
      framebuffer.pixelDatatype,
      framebuffer.pixelFormat
    );
    framebuffer.clear = new ClearCommand({
      color: framebuffer.clearColor,
      framebuffer: framebuffer.buffer.framebuffer,
    });
  }
}

PostProcessStageTextureCache.prototype.updateDependencies = function () {
  this._updateDependencies = true;
};

/**
 * Called before the stages in the collection are executed. Creates the minimum amount of framebuffers for a post-process collection.
 *
 * @param {Context} context The context.
 */
PostProcessStageTextureCache.prototype.update = function (context) {
  var collection = this._collection;
  var updateDependencies = this._updateDependencies;
  var aoEnabled =
    defined(collection.ambientOcclusion) &&
    collection.ambientOcclusion.enabled &&
    collection.ambientOcclusion._isSupported(context);
  var bloomEnabled =
    defined(collection.bloom) &&
    collection.bloom.enabled &&
    collection.bloom._isSupported(context);
  var tonemappingEnabled =
    defined(collection._tonemapping) &&
    collection._tonemapping.enabled &&
    collection._tonemapping._isSupported(context);
  var fxaaEnabled =
    defined(collection.fxaa) &&
    collection.fxaa.enabled &&
    collection.fxaa._isSupported(context);
  var needsCheckDimensionsUpdate =
    !defined(collection._activeStages) ||
    collection._activeStages.length > 0 ||
    aoEnabled ||
    bloomEnabled ||
    tonemappingEnabled ||
    fxaaEnabled;
  if (
    updateDependencies ||
    (!needsCheckDimensionsUpdate && this._framebuffers.length > 0)
  ) {
    releaseResources(this);
    this._framebuffers.length = 0;
    this._stageNameToFramebuffer = {};
    this._width = undefined;
    this._height = undefined;
  }

  if (!updateDependencies && !needsCheckDimensionsUpdate) {
    return;
  }

  if (this._framebuffers.length === 0) {
    createFramebuffers(this, context);
  }

  var width = context.drawingBufferWidth;
  var height = context.drawingBufferHeight;
  var dimensionsChanged = this._width !== width || this._height !== height;
  if (!updateDependencies && !dimensionsChanged) {
    return;
  }

  this._width = width;
  this._height = height;
  this._updateDependencies = false;
  releaseResources(this);
  updateFramebuffers(this, context);
};

/**
 * Clears all of the framebuffers.
 *
 * @param {Context} context The context.
 */
PostProcessStageTextureCache.prototype.clear = function (context) {
  var framebuffers = this._framebuffers;
  for (var i = 0; i < framebuffers.length; ++i) {
    framebuffers[i].clear.execute(context);
  }
};

/**
 * Gets the stage with the given name.
 * @param {String} name The name of the stage.
 * @return {PostProcessStage|PostProcessStageComposite}
 */
PostProcessStageTextureCache.prototype.getStageByName = function (name) {
  return this._collection.getStageByName(name);
};

/**
 * Gets the output texture for a stage with the given name.
 * @param {String} name The name of the stage.
 * @return {Texture|undefined} The output texture of the stage with the given name.
 */
PostProcessStageTextureCache.prototype.getOutputTexture = function (name) {
  return this._collection.getOutputTexture(name);
};

/**
 * Gets the framebuffer for a stage with the given name.
 *
 * @param {String} name The name of the stage.
 * @return {Framebuffer|undefined} The framebuffer for the stage with the given name.
 */
PostProcessStageTextureCache.prototype.getFramebuffer = function (name) {
  var framebuffer = this._stageNameToFramebuffer[name];
  if (!defined(framebuffer)) {
    return undefined;
  }
  return framebuffer.buffer.framebuffer;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see PostProcessStageTextureCache#destroy
 */
PostProcessStageTextureCache.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PostProcessStageTextureCache#isDestroyed
 */
PostProcessStageTextureCache.prototype.destroy = function () {
  releaseResources(this);
  return destroyObject(this);
};
export default PostProcessStageTextureCache;
