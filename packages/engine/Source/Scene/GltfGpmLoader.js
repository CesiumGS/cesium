import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import ResourceCache from "./ResourceCache.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";
import PropertyTexture from "./PropertyTexture.js";
import StructuralMetadata from "./StructuralMetadata.js";
import MetadataSchema from "./MetadataSchema.js";

/**
 * Loads glTF NGA_gpm_local
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfGpmLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.gltf The glTF JSON.
 * @param {string} [options.extension] The <code>NGA_gpm_local</code> extension object.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 * @param {FrameState} options.frameState The frame state.
 * @param {string} [options.cacheKey] The cache key of the resource.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 * @experimental This feature is subject to change without Cesium's standard deprecation policy.
 */
function GltfGpmLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const extension = options.extension;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const supportedImageFormats = options.supportedImageFormats;
  const frameState = options.frameState;
  const cacheKey = options.cacheKey;
  const asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.extension", extension);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);
  Check.typeOf.object("options.frameState", frameState);
  //>>includeEnd('debug');

  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._extension = extension;
  this._supportedImageFormats = supportedImageFormats;
  this._frameState = frameState;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._textureLoaders = [];
  this._textureIds = [];
  this._structuralMetadata = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  GltfGpmLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfGpmLoader.prototype.constructor = GltfGpmLoader;
}

Object.defineProperties(GltfGpmLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof GltfGpmLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The parsed structural metadata
   *
   * @memberof GltfGpmLoader.prototype
   *
   * @type {StructuralMetadata}
   * @readonly
   * @private
   */
  structuralMetadata: {
    get: function () {
      return this._structuralMetadata;
    },
  },
});

async function loadResources(loader) {
  try {
    const texturesPromise = loadTextures(loader);
    await texturesPromise;

    if (loader.isDestroyed()) {
      return;
    }

    loader._gltf = undefined; // No longer need to hold onto the glTF

    loader._state = ResourceLoaderState.LOADED;
    return loader;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    loader.unload();
    loader._state = ResourceLoaderState.FAILED;
    const errorMessage = "Failed to load GPM data";
    throw loader.getError(errorMessage, error);
  }
}

/**
 * Loads the resource.
 * @returns {Promise<GltfGpmLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfGpmLoader.prototype.load = function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._state = ResourceLoaderState.LOADING;
  this._promise = loadResources(this);
  return this._promise;
};

function gatherUsedTextureIds(gpmExtension) {
  // Gather the used textures
  const textureIds = {};
  const ppeTextures = gpmExtension.ppeTextures;
  if (defined(ppeTextures)) {
    for (let i = 0; i < ppeTextures.length; i++) {
      const ppeTexture = ppeTextures[i];
      // The texture is a valid textureInfo.
      textureIds[ppeTexture.index] = ppeTexture;
    }
  }
  return textureIds;
}

function loadTextures(gpmLoader) {
  let textureIds;
  if (defined(gpmLoader._extension)) {
    textureIds = gatherUsedTextureIds(gpmLoader._extension);
  }

  const gltf = gpmLoader._gltf;
  const gltfResource = gpmLoader._gltfResource;
  const baseResource = gpmLoader._baseResource;
  const supportedImageFormats = gpmLoader._supportedImageFormats;
  const frameState = gpmLoader._frameState;
  const asynchronous = gpmLoader._asynchronous;

  // Load the textures
  const texturePromises = [];
  for (const textureId in textureIds) {
    if (textureIds.hasOwnProperty(textureId)) {
      const textureLoader = ResourceCache.getTextureLoader({
        gltf: gltf,
        textureInfo: textureIds[textureId],
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        frameState: frameState,
        asynchronous: asynchronous,
      });
      gpmLoader._textureLoaders.push(textureLoader);
      gpmLoader._textureIds.push(textureId);
      texturePromises.push(textureLoader.load());
    }
  }

  return Promise.all(texturePromises);
}

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfGpmLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === ResourceLoaderState.READY) {
    return true;
  }

  if (this._state !== ResourceLoaderState.LOADED) {
    return false;
  }

  const textureLoaders = this._textureLoaders;
  const textureLoadersLength = textureLoaders.length;
  let ready = true;
  for (let i = 0; i < textureLoadersLength; ++i) {
    const textureLoader = textureLoaders[i];
    const textureReady = textureLoader.process(frameState);
    ready = ready && textureReady;
  }

  if (!ready) {
    return false;
  }

  const textures = {};
  for (let i = 0; i < this._textureIds.length; ++i) {
    const textureId = this._textureIds[i];
    const textureLoader = textureLoaders[i];
    if (!textureLoader.isDestroyed()) {
      textures[textureId] = textureLoader.texture;
    }
  }

  // XXX
  console.log("Creating dummy schema");
  const ppeClass = {
    name: "PPE",
    properties: {
      ppe: {
        name: "PPE",
        type: "SCALAR",
        componentType: "UINT8",
      },
    },
  };
  const ppeSchema = MetadataSchema.fromJson({
    id: "PPE_SCHEMA",
    classes: {
      ppe: ppeClass,
    },
  });

  const extension = this._extension;
  const propertyTextures = [];
  if (defined(extension.ppeTextures)) {
    for (let i = 0; i < extension.ppeTextures.length; i++) {
      const ppeTexture = extension.ppeTextures[i];
      const ppeTextureAsPropertyTexture = {
        class: "ppe",
        properties: {
          ppe: {
            index: ppeTexture.index,
            texCoord: ppeTexture.texCoord,
          },
        },
      };
      propertyTextures.push(
        new PropertyTexture({
          id: i,
          name: ppeTexture.name,
          propertyTexture: ppeTextureAsPropertyTexture,
          class: ppeSchema.classes["ppe"],
          textures: textures,
        })
      );

      // XXX But really...
      console.log("XXX ONLY HANDLING ONE PPE TEXTURE");
      break;
    }
  }

  const structuralMetadata = new StructuralMetadata({
    schema: ppeSchema,
    propertyTables: [],
    propertyTextures: propertyTextures,
    propertyAttributes: [],
    statistics: extension.statistics,
    extras: extension.extras,
    extensions: extension.extensions,
  });
  this._structuralMetadata = structuralMetadata;

  this._state = ResourceLoaderState.READY;
  return true;
};

function unloadTextures(gpmLoader) {
  const textureLoaders = gpmLoader._textureLoaders;
  const textureLoadersLength = textureLoaders.length;
  for (let i = 0; i < textureLoadersLength; ++i) {
    ResourceCache.unload(textureLoaders[i]);
  }
  gpmLoader._textureLoaders.length = 0;
  gpmLoader._textureIds.length = 0;
}

/**
 * Unloads the resource.
 * @private
 */
GltfGpmLoader.prototype.unload = function () {
  unloadTextures(this);

  if (defined(this._schemaLoader)) {
    ResourceCache.unload(this._schemaLoader);
  }
  this._schemaLoader = undefined;

  this._structuralMetadata = undefined;
};

export default GltfGpmLoader;
