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
 * Implementation note: This is an experimental implementation. It is based
 * on a GltfStructuralMetadataLoader, by removing everything that is not
 * related to property textures, and translating the "ppeTextures" of
 * the NGA_gpm_local extension into property textures. These will be
 * returned as part of a `StructuralMetadata` object, which may override
 * any `StructuralMetadata` that was read directly from the glTF.
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
 * A static mapping from PPE texture property identifier keys
 * to `MetadataSchema` instances. This is used to create each
 * schema (with a certain structure) only ONCE in
 * obtainPpeTexturesMetadataSchema
 *
 * @private
 */
GltfGpmLoader.ppeTexturesMetadataSchemaCache = new Map();

/**
 * Create the JSON description of a metadata class that treats
 * the given PPE texture as a property texture property(!).
 *
 * @param {any} ppeTexture - The PPE texture
 * @param {number} index - The index of the texture in the extension
 * @returns The class JSON
 */
GltfGpmLoader.prototype.createPpeTextureClassJson = function (
  ppeTexture,
  index
) {
  const traits = ppeTexture.traits;
  const ppePropertyName = traits.source;

  // XXX_UNCERTAINTY: The ppeTexture will have a structure
  // like this:
  //
  //"ppeTextures" : [
  //  {
  //    "traits" : {
  //      "source" : "SIGZ",
  //      "min" : 0.0,
  //      "max" : 16.0
  //    },
  //    "index" : 2,
  //    "noData" : 255,
  //    "offset" : 0.0,
  //    "scale" : 0.06274509803921569,
  //    "texCoord" : 1
  //  },
  //
  // Note that in GPM 1.2d, the min/max should be part of the
  // texture, but in the actual data (GPM 1.2i), they are in
  // the traits (ppeMetadata). And there, they/ seem to denote
  // the min/max values that actually appear in the texture.
  // So they are integrated into the 'scale' factor here:
  const min = traits.min ?? 0;
  const max = traits.max ?? 255;
  const minMaxScale = 255.0 / (max - min);
  const offset = ppeTexture.offset;
  const scale = ppeTexture.scale * minMaxScale;
  const classJson = {
    name: `PPE texture class ${index}`,
    properties: {
      [ppePropertyName]: {
        name: "PPE",
        type: "SCALAR",
        componentType: "UINT8",
        normalized: true,
        offset: offset,
        scale: scale,
      },
    },
  };
  return classJson;
};

/**
 * Returns the `MetadataSchema` for the PPE textures in this instance.
 *
 * This method will return a (statically/globally) cached metadata
 * schema that reflects the structure of the PPE textures in this
 * instance, creating and caching it if necessary.
 *
 * For details on the cache key, see `collectPpeTexturePropertyIdentifiers`
 *
 * @returns The `MetadataSchema`
 */
GltfGpmLoader.prototype.obtainPpeTexturesMetadataSchema = function () {
  const ppeTexturePropertyIdentifiers = this.collectPpeTexturePropertyIdentifiers();
  const key = ppeTexturePropertyIdentifiers.toString();
  let ppeTexturesMetadataSchema = GltfGpmLoader.ppeTexturesMetadataSchemaCache.get(
    key
  );
  if (defined(ppeTexturesMetadataSchema)) {
    // XXX_UNCERTAINTY Debug log
    //console.log(`Using cached schema for GPM PPE textures with key ${key}`);
    return ppeTexturesMetadataSchema;
  }

  // XXX_UNCERTAINTY Debug log - if caching works, this should be printed only ONCE!
  console.log(`Creating schema for GPM PPE textures with key ${key}`);
  const schemaId = `PPE_TEXTURE_SCHEMA_${GltfGpmLoader.ppeTexturesMetadataSchemaCache.size}`;
  const ppeTexturesMetadataSchemaJson = {
    id: schemaId,
    classes: {},
  };

  const extension = this._extension;
  if (defined(extension.ppeTextures)) {
    for (let i = 0; i < extension.ppeTextures.length; i++) {
      const ppeTexture = extension.ppeTextures[i];
      const classId = `ppeTexture_${i}`;
      const classJson = this.createPpeTextureClassJson(ppeTexture, i);
      ppeTexturesMetadataSchemaJson.classes[classId] = classJson;
    }
  }

  ppeTexturesMetadataSchema = MetadataSchema.fromJson(
    ppeTexturesMetadataSchemaJson
  );
  GltfGpmLoader.ppeTexturesMetadataSchemaCache.set(
    key,
    ppeTexturesMetadataSchema
  );
  return ppeTexturesMetadataSchema;
};

/**
 * Creates an array of strings that serve as identifiers for PPE textures.
 *
 * Each glTF may define multiple `ppeTexture` objects within the
 * `NGA_gpm_local` extensions. Each of these textures corresponds
 * to one 'property texture property(!)' in a metadata schema.
 *
 * This method will create an array where each element is a (JSON)
 * string representation of the parts of a GPM PPE texture definition
 * that are relevant for distinguishing two PPE textures in terms
 * of their structure within a `StructuralMetadata`.
 *
 * @returns The identifiers
 */
GltfGpmLoader.prototype.collectPpeTexturePropertyIdentifiers = function () {
  const extension = this._extension;
  const ppeTexturePropertyIdentifiers = [];
  if (defined(extension.ppeTextures)) {
    for (let i = 0; i < extension.ppeTextures.length; i++) {
      const ppeTexture = extension.ppeTextures[i];
      // The following will create an identifier that can be used
      // to define two PPE textures as "representing the same
      // property texture property" within a structural metadata
      // schema.
      const classJson = this.createPpeTextureClassJson(ppeTexture, i);
      const ppeTexturePropertyIdentifier = JSON.stringify(classJson);
      ppeTexturePropertyIdentifiers.push(ppeTexturePropertyIdentifier);
    }
  }
  return ppeTexturePropertyIdentifiers;
};

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

  const ppeTexturesMetadataSchema = this.obtainPpeTexturesMetadataSchema();
  const extension = this._extension;
  const propertyTextures = [];
  if (defined(extension.ppeTextures)) {
    for (let i = 0; i < extension.ppeTextures.length; i++) {
      const ppeTexture = extension.ppeTextures[i];
      const classId = `ppeTexture_${i}`;
      const traits = ppeTexture.traits;
      const ppePropertyName = traits.source;
      const metadataClass = ppeTexturesMetadataSchema.classes[classId];

      // XXX_UNCERTAINTY Debug log
      //console.log(
      //  `Creating property texture with class ${classId} and property ${ppePropertyName}`
      //);

      const ppeTextureAsPropertyTexture = {
        class: classId,
        properties: {
          [ppePropertyName]: {
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
          class: metadataClass,
          textures: textures,
        })
      );
    }
  }

  const structuralMetadata = new StructuralMetadata({
    schema: ppeTexturesMetadataSchema,
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
