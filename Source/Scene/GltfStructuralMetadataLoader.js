import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
import parseStructuralMetadata from "./parseStructuralMetadata.js";
import parseFeatureMetadataLegacy from "./parseFeatureMetadataLegacy.js";
import ResourceCache from "./ResourceCache.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * Loads glTF structural metadata
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfStructuralMetadataLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON.
 * @param {String} [options.extension] The <code>EXT_structural_metadata</code> extension object. If this is undefined, then extensionLegacy must be defined.
 * @param {String} [options.extensionLegacy] The legacy <code>EXT_feature_metadata</code> extension for backwards compatibility.
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
 * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {SupportedImageFormats} options.supportedImageFormats The supported image formats.
 * @param {String} [options.cacheKey] The cache key of the resource.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function GltfStructuralMetadataLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltf = options.gltf;
  const extension = options.extension;
  const extensionLegacy = options.extensionLegacy;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const supportedImageFormats = options.supportedImageFormats;
  const cacheKey = options.cacheKey;
  const asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.gltfResource", gltfResource);
  Check.typeOf.object("options.baseResource", baseResource);
  Check.typeOf.object("options.supportedImageFormats", supportedImageFormats);

  if (!defined(options.extension) && !defined(options.extensionLegacy)) {
    throw new DeveloperError(
      "One of options.extension or options.extensionLegacy must be specified"
    );
  }
  //>>includeEnd('debug');

  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._gltf = gltf;
  this._extension = extension;
  this._extensionLegacy = extensionLegacy;
  this._supportedImageFormats = supportedImageFormats;
  this._cacheKey = cacheKey;
  this._asynchronous = asynchronous;
  this._bufferViewLoaders = [];
  this._textureLoaders = [];
  this._schemaLoader = undefined;
  this._structuralMetadata = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  GltfStructuralMetadataLoader.prototype = Object.create(
    ResourceLoader.prototype
  );
  GltfStructuralMetadataLoader.prototype.constructor = GltfStructuralMetadataLoader;
}

Object.defineProperties(GltfStructuralMetadataLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfStructuralMetadataLoader.prototype
   *
   * @type {Promise.<GltfStructuralMetadataLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfStructuralMetadataLoader.prototype
   *
   * @type {String}
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
   * @memberof GltfStructuralMetadataLoader.prototype
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

/**
 * Loads the resource.
 * @private
 */
GltfStructuralMetadataLoader.prototype.load = function () {
  const bufferViewsPromise = loadBufferViews(this);
  const texturesPromise = loadTextures(this);
  const schemaPromise = loadSchema(this);

  this._gltf = undefined; // No longer need to hold onto the glTF
  this._state = ResourceLoaderState.LOADING;

  const that = this;

  when
    .all([bufferViewsPromise, texturesPromise, schemaPromise])
    .then(function (results) {
      if (that.isDestroyed()) {
        return;
      }
      const bufferViews = results[0];
      const textures = results[1];
      const schema = results[2];

      if (defined(that._extension)) {
        that._structuralMetadata = parseStructuralMetadata({
          extension: that._extension,
          schema: schema,
          bufferViews: bufferViews,
          textures: textures,
        });
      } else {
        that._structuralMetadata = parseFeatureMetadataLegacy({
          extension: that._extensionLegacy,
          schema: schema,
          bufferViews: bufferViews,
          textures: textures,
        });
      }
      that._state = ResourceLoaderState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      that.unload();
      that._state = ResourceLoaderState.FAILED;
      const errorMessage = "Failed to load structural metadata";
      that._promise.reject(that.getError(errorMessage, error));
    });
};

function gatherBufferViewIdsFromProperties(properties, bufferViewIdSet) {
  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      const property = properties[propertyId];
      const values = property.values;
      const arrayOffsets = property.arrayOffsets;
      const stringOffsets = property.stringOffsets;

      // Using an object like a mathematical set
      if (defined(values)) {
        bufferViewIdSet[values] = true;
      }
      if (defined(arrayOffsets)) {
        bufferViewIdSet[arrayOffsets] = true;
      }
      if (defined(stringOffsets)) {
        bufferViewIdSet[stringOffsets] = true;
      }
    }
  }
}

function gatherBufferViewIdsFromPropertiesLegacy(properties, bufferViewIdSet) {
  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      const property = properties[propertyId];
      const bufferView = property.bufferView;
      const arrayOffsetBufferView = property.arrayOffsetBufferView;
      const stringOffsetBufferView = property.stringOffsetBufferView;

      // Using an object like a mathematical set
      if (defined(bufferView)) {
        bufferViewIdSet[bufferView] = true;
      }
      if (defined(arrayOffsetBufferView)) {
        bufferViewIdSet[arrayOffsetBufferView] = true;
      }
      if (defined(stringOffsetBufferView)) {
        bufferViewIdSet[stringOffsetBufferView] = true;
      }
    }
  }
}

function gatherUsedBufferViewIds(extension) {
  const propertyTables = extension.propertyTables;
  const bufferViewIdSet = {};
  if (defined(propertyTables)) {
    for (let i = 0; i < propertyTables.length; i++) {
      const propertyTable = propertyTables[i];
      gatherBufferViewIdsFromProperties(
        propertyTable.properties,
        bufferViewIdSet
      );
    }
  }
  return bufferViewIdSet;
}

function gatherUsedBufferViewIdsLegacy(extensionLegacy) {
  const featureTables = extensionLegacy.featureTables;

  const bufferViewIdSet = {};
  if (defined(featureTables)) {
    for (const featureTableId in featureTables) {
      if (featureTables.hasOwnProperty(featureTableId)) {
        const featureTable = featureTables[featureTableId];
        const properties = featureTable.properties;
        if (defined(properties)) {
          gatherBufferViewIdsFromPropertiesLegacy(properties, bufferViewIdSet);
        }
      }
    }
  }
  return bufferViewIdSet;
}

function loadBufferViews(structuralMetadataLoader) {
  let bufferViewIds;
  if (defined(structuralMetadataLoader._extension)) {
    bufferViewIds = gatherUsedBufferViewIds(
      structuralMetadataLoader._extension
    );
  } else {
    bufferViewIds = gatherUsedBufferViewIdsLegacy(
      structuralMetadataLoader._extensionLegacy
    );
  }

  // Load the buffer views
  const bufferViewPromises = [];
  const bufferViewLoaders = {};
  for (const bufferViewId in bufferViewIds) {
    if (bufferViewIds.hasOwnProperty(bufferViewId)) {
      const bufferViewLoader = ResourceCache.loadBufferView({
        gltf: structuralMetadataLoader._gltf,
        bufferViewId: parseInt(bufferViewId),
        gltfResource: structuralMetadataLoader._gltfResource,
        baseResource: structuralMetadataLoader._baseResource,
      });
      bufferViewPromises.push(bufferViewLoader.promise);
      structuralMetadataLoader._bufferViewLoaders.push(bufferViewLoader);
      bufferViewLoaders[bufferViewId] = bufferViewLoader;
    }
  }

  // Return a promise to a map of buffer view IDs to typed arrays
  return when.all(bufferViewPromises).then(function () {
    const bufferViews = {};
    for (const bufferViewId in bufferViewLoaders) {
      if (bufferViewLoaders.hasOwnProperty(bufferViewId)) {
        const bufferViewLoader = bufferViewLoaders[bufferViewId];
        // Copy the typed array and let the underlying ArrayBuffer be freed
        const bufferViewTypedArray = new Uint8Array(
          bufferViewLoader.typedArray
        );
        bufferViews[bufferViewId] = bufferViewTypedArray;
      }
    }

    // Buffer views can be unloaded after the data has been copied
    unloadBufferViews(structuralMetadataLoader);

    return bufferViews;
  });
}

function gatherUsedTextureIds(structuralMetadataExtension) {
  // Gather the used textures
  const textureIds = {};
  const propertyTextures = structuralMetadataExtension.propertyTextures;
  if (defined(propertyTextures)) {
    for (let i = 0; i < propertyTextures.length; i++) {
      const propertyTexture = propertyTextures[i];
      const properties = propertyTexture.properties;
      if (defined(properties)) {
        gatherTextureIdsFromProperties(properties, textureIds);
      }
    }
  }
  return textureIds;
}

function gatherTextureIdsFromProperties(properties, textureIds) {
  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      // in EXT_structural_metadata the property is a valid textureInfo.
      const textureInfo = properties[propertyId];
      textureIds[textureInfo.index] = textureInfo;
    }
  }
}

function gatherUsedTextureIdsLegacy(extensionLegacy) {
  // Gather the used textures
  const textureIds = {};
  const featureTextures = extensionLegacy.featureTextures;
  if (defined(featureTextures)) {
    for (const featureTextureId in featureTextures) {
      if (featureTextures.hasOwnProperty(featureTextureId)) {
        const featureTexture = featureTextures[featureTextureId];
        const properties = featureTexture.properties;
        if (defined(properties)) {
          gatherTextureIdsFromPropertiesLegacy(properties, textureIds);
        }
      }
    }
  }

  return textureIds;
}

function gatherTextureIdsFromPropertiesLegacy(properties, textureIds) {
  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      const property = properties[propertyId];
      const textureInfo = property.texture;
      textureIds[textureInfo.index] = textureInfo;
    }
  }
}

function loadTextures(structuralMetadataLoader) {
  let textureIds;
  if (defined(structuralMetadataLoader._extension)) {
    textureIds = gatherUsedTextureIds(structuralMetadataLoader._extension);
  } else {
    textureIds = gatherUsedTextureIdsLegacy(
      structuralMetadataLoader._extensionLegacy
    );
  }

  const gltf = structuralMetadataLoader._gltf;
  const gltfResource = structuralMetadataLoader._gltfResource;
  const baseResource = structuralMetadataLoader._baseResource;
  const supportedImageFormats = structuralMetadataLoader._supportedImageFormats;
  const asynchronous = structuralMetadataLoader._asynchronous;

  // Load the textures
  const texturePromises = [];
  const textureLoaders = {};
  for (const textureId in textureIds) {
    if (textureIds.hasOwnProperty(textureId)) {
      const textureLoader = ResourceCache.loadTexture({
        gltf: gltf,
        textureInfo: textureIds[textureId],
        gltfResource: gltfResource,
        baseResource: baseResource,
        supportedImageFormats: supportedImageFormats,
        asynchronous: asynchronous,
      });
      texturePromises.push(textureLoader.promise);
      structuralMetadataLoader._textureLoaders.push(textureLoader);
      textureLoaders[textureId] = textureLoader;
    }
  }

  // Return a promise to a map of texture IDs to Texture objects
  return when.all(texturePromises).then(function () {
    const textures = {};
    for (const textureId in textureLoaders) {
      if (textureLoaders.hasOwnProperty(textureId)) {
        const textureLoader = textureLoaders[textureId];
        textures[textureId] = textureLoader.texture;
      }
    }
    return textures;
  });
}

function loadSchema(structuralMetadataLoader) {
  const extension = defaultValue(
    structuralMetadataLoader._extension,
    structuralMetadataLoader._extensionLegacy
  );

  let schemaLoader;
  if (defined(extension.schemaUri)) {
    const resource = structuralMetadataLoader._baseResource.getDerivedResource({
      url: extension.schemaUri,
    });
    schemaLoader = ResourceCache.loadSchema({
      resource: resource,
    });
  } else {
    schemaLoader = ResourceCache.loadSchema({
      schema: extension.schema,
    });
  }

  structuralMetadataLoader._schemaLoader = schemaLoader;

  return schemaLoader.promise.then(function (schemaLoader) {
    return schemaLoader.schema;
  });
}

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfStructuralMetadataLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state !== ResourceLoaderState.LOADING) {
    return;
  }

  const textureLoaders = this._textureLoaders;
  const textureLoadersLength = textureLoaders.length;

  for (let i = 0; i < textureLoadersLength; ++i) {
    const textureLoader = textureLoaders[i];
    textureLoader.process(frameState);
  }
};

function unloadBufferViews(structuralMetadataLoader) {
  const bufferViewLoaders = structuralMetadataLoader._bufferViewLoaders;
  const bufferViewLoadersLength = bufferViewLoaders.length;
  for (let i = 0; i < bufferViewLoadersLength; ++i) {
    ResourceCache.unload(bufferViewLoaders[i]);
  }
  structuralMetadataLoader._bufferViewLoaders.length = 0;
}

function unloadTextures(structuralMetadataLoader) {
  const textureLoaders = structuralMetadataLoader._textureLoaders;
  const textureLoadersLength = textureLoaders.length;
  for (let i = 0; i < textureLoadersLength; ++i) {
    ResourceCache.unload(textureLoaders[i]);
  }
  structuralMetadataLoader._textureLoaders.length = 0;
}

/**
 * Unloads the resource.
 * @private
 */
GltfStructuralMetadataLoader.prototype.unload = function () {
  unloadBufferViews(this);
  unloadTextures(this);

  if (defined(this._schemaLoader)) {
    ResourceCache.unload(this._schemaLoader);
  }
  this._schemaLoader = undefined;

  this._structuralMetadata = undefined;
};
