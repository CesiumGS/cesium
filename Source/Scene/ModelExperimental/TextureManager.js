import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import Texture from "../../Renderer/Texture.js";
import TextureMinificationFilter from "../../Renderer/TextureMinificationFilter.js";

/**
 * An object to manage loading textures
 *
 * @alias TextureManager
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function TextureManager() {
  this._defaultTexture = undefined;
  this._textures = {};
  this._loadedImages = [];

  // Keep track of the last time update() was called to avoid
  // calling update() twice.
  this._lastUpdatedFrame = -1;
}

/**
 * Get one of the loaded textures
 * @param {String} textureId The unique ID of the texture loaded by {@link TextureManager#loadTexture2D}
 * @return {Texture} The texture or <code>undefined</code> if no texture exists
 */
TextureManager.prototype.getTexture = function (textureId) {
  return this._textures[textureId];
};

function fetchTexture2D(textureManager, textureId, textureUniform) {
  textureUniform.resource
    .fetchImage()
    .then(function (image) {
      textureManager._loadedImages.push({
        id: textureId,
        image: image,
        textureUniform: textureUniform,
      });
    })
    .otherwise(function () {
      const texture = textureManager._textures[textureId];
      if (defined(texture) && texture !== textureManager._defaultTexture) {
        texture.destroy();
      }

      textureManager._textures[textureId] = textureManager._defaultTexture;
    });
}

/**
 * Load a texture 2D asynchronously. Note that {@link TextureManager#update}
 * must be called in the render loop to finish processing the textures.
 *
 * @param {String} textureId A unique ID to identify this texture.
 * @param {TextureUniform} textureUniform A description of the texture
 *
 * @private
 */
TextureManager.prototype.loadTexture2D = function (textureId, textureUniform) {
  if (defined(textureUniform.typedArray)) {
    this._loadedImages.push({
      id: textureId,
      textureUniform: textureUniform,
    });
  } else {
    fetchTexture2D(this, textureId, textureUniform);
  }
};

function createTexture(textureManager, loadedImage, context) {
  const id = loadedImage.id;
  const textureUniform = loadedImage.textureUniform;

  const typedArray = textureUniform.typedArray;
  const sampler = textureUniform.sampler;

  let texture;
  if (defined(typedArray)) {
    texture = new Texture({
      context: context,
      pixelFormat: textureUniform.pixelFormat,
      pixelDatatype: textureUniform.pixelDatatype,
      source: {
        arrayBufferView: typedArray,
        width: textureUniform.width,
        height: textureUniform.height,
      },
      sampler: sampler,
      flipY: false,
    });
  } else {
    texture = new Texture({
      context: context,
      source: loadedImage.image,
      sampler: sampler,
    });
  }
  //use mipmap
  if (
    sampler &&
    sampler._minificationFilter &&
    (sampler._minificationFilter ===
      TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
      sampler._minificationFilter ===
        TextureMinificationFilter.LINEAR_MIPMAP_NEAREST ||
      sampler._minificationFilter ===
        TextureMinificationFilter.NEAREST_MIPMAP_LINEAR ||
      sampler._minificationFilter ===
        TextureMinificationFilter.LINEAR_MIPMAP_LINEAR)
  ) {
    texture.generateMipmap();
  }
  // Destroy the old texture once the new one is loaded for more seamless
  // transitions between values
  const oldTexture = textureManager._textures[id];
  if (defined(oldTexture) && oldTexture !== context.defaultTexture) {
    oldTexture.destroy();
  }
  textureManager._textures[id] = texture;
}

TextureManager.prototype.update = function (frameState) {
  // update only needs to be called once a frame.
  if (frameState.frameNumber === this._lastUpdatedFrame) {
    return;
  }
  this._lastUpdatedFrame = frameState.frameNumber;

  const context = frameState.context;
  this._defaultTexture = context.defaultTexture;

  // If any images were loaded since the last frame, create Textures
  // for them and store in the uniform dictionary
  const loadedImages = this._loadedImages;
  for (let i = 0; i < loadedImages.length; i++) {
    const loadedImage = loadedImages[i];
    createTexture(this, loadedImage, context);
  }
  loadedImages.length = 0;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 *
 * @see TextureManager#destroy
 * @private
 */
TextureManager.prototype.isDestroyed = function () {
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
 * @example
 * textureManager = textureManager && textureManager.destroy();
 *
 * @see TextureManager#isDestroyed
 * @private
 */
TextureManager.prototype.destroy = function () {
  const textures = this._textures;
  for (const texture in textures) {
    if (textures.hasOwnProperty(texture)) {
      const instance = textures[texture];
      if (instance !== this._defaultTexture) {
        instance.destroy();
      }
    }
  }
  return destroyObject(this);
};
