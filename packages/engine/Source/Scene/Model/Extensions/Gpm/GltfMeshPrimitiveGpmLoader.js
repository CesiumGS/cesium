import Check from "../../../../Core/Check.js";
import Frozen from "../../../../Core/Frozen.js";
import defined from "../../../../Core/defined.js";
import ResourceCache from "../../../ResourceCache.js";
import ResourceLoader from "../../../ResourceLoader.js";
import ResourceLoaderState from "../../../ResourceLoaderState.js";
import PropertyTexture from "../../../PropertyTexture.js";
import StructuralMetadata from "../../../StructuralMetadata.js";
import MetadataSchema from "../../../MetadataSchema.js";
import PpeTexture from "./PpeTexture.js";
import PpeMetadata from "./PpeMetadata.js";
import MeshPrimitiveGpmLocal from "./MeshPrimitiveGpmLocal.js";

/**
 * Loads glTF NGA_gpm_local from a glTF mesh primitive.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 * This loads the "ppeTextures" of the NGA_gpm_local extension of a mesh primitive
 * and stores them in a `MeshPrimitiveGpmLocal` object.
 *
 * This object will be converted into a `StructuralMetadata` object, which may
 * override any `StructuralMetadata` that was read directly from the glTF.
 *
 * @alias GltfMeshPrimitiveGpmLoader
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
 */
function GltfMeshPrimitiveGpmLoader(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const gltf = options.gltf;
  const extension = options.extension;
  const gltfResource = options.gltfResource;
  const baseResource = options.baseResource;
  const supportedImageFormats = options.supportedImageFormats;
  const frameState = options.frameState;
  const cacheKey = options.cacheKey;
  const asynchronous = options.asynchronous ?? true;

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
  this._meshPrimitiveGpmLocal = undefined;
  this._structuralMetadata = undefined;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = undefined;
}

if (defined(Object.create)) {
  GltfMeshPrimitiveGpmLoader.prototype = Object.create(
    ResourceLoader.prototype,
  );
  GltfMeshPrimitiveGpmLoader.prototype.constructor = GltfMeshPrimitiveGpmLoader;
}

Object.defineProperties(GltfMeshPrimitiveGpmLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof GltfMeshPrimitiveGpmLoader.prototype
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
   * The parsed GPM extension information from the mesh primitive
   *
   * @memberof GltfMeshPrimitiveGpmLoader.prototype
   *
   * @type {MeshPrimitiveGpmLocal}
   * @readonly
   * @private
   */
  meshPrimitiveGpmLocal: {
    get: function () {
      return this._meshPrimitiveGpmLocal;
    },
  },

  /**
   * Returns the result of converting the parsed 'MeshPrimitiveGpmLocal'
   * into a 'StructuralMetadata'.
   *
   * Some details about the translation are intentionally not specified here.
   *
   * @memberof GltfMeshPrimitiveGpmLoader.prototype
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

GltfMeshPrimitiveGpmLoader.prototype._loadResources = async function () {
  try {
    const texturesPromise = this._loadTextures();
    await texturesPromise;

    if (this.isDestroyed()) {
      return;
    }

    this._gltf = undefined; // No longer need to hold onto the glTF

    this._state = ResourceLoaderState.LOADED;
    return this;
  } catch (error) {
    if (this.isDestroyed()) {
      return;
    }

    this.unload();
    this._state = ResourceLoaderState.FAILED;
    const errorMessage = "Failed to load GPM data";
    throw this.getError(errorMessage, error);
  }
};

/**
 * Loads the resource.
 * @returns {Promise<GltfMeshPrimitiveGpmLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GltfMeshPrimitiveGpmLoader.prototype.load = function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._state = ResourceLoaderState.LOADING;
  this._promise = this._loadResources(this);
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

GltfMeshPrimitiveGpmLoader.prototype._loadTextures = function () {
  let textureIds;
  if (defined(this._extension)) {
    textureIds = gatherUsedTextureIds(this._extension);
  }

  const gltf = this._gltf;
  const gltfResource = this._gltfResource;
  const baseResource = this._baseResource;
  const supportedImageFormats = this._supportedImageFormats;
  const frameState = this._frameState;
  const asynchronous = this._asynchronous;

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
      this._textureLoaders.push(textureLoader);
      this._textureIds.push(textureId);
      texturePromises.push(textureLoader.load());
    }
  }

  return Promise.all(texturePromises);
};

/**
 * A static mapping from PPE texture property identifier keys
 * to `MetadataSchema` instances. This is used to create each
 * schema (with a certain structure) only ONCE in
 * _obtainPpeTexturesMetadataSchema
 *
 * @private
 */
GltfMeshPrimitiveGpmLoader.ppeTexturesMetadataSchemaCache = new Map();

/**
 * Create the JSON description of a metadata class that treats
 * the given PPE texture as a property texture property.
 *
 * @param {PpeTexture} ppeTexture - The PPE texture
 * @param {number} index - The index of the texture in the extension
 * @returns The class JSON
 */
GltfMeshPrimitiveGpmLoader._createPpeTextureClassJson = function (
  ppeTexture,
  index,
) {
  const traits = ppeTexture.traits;
  const ppePropertyName = traits.source;

  // The ppeTexture will have a structure like this:
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
  // This is translated into a single class property here, that defines
  // the structure of the property texture property.
  //
  // Given that `offset` and `scale` may only be applied to integer
  // property values when they are `normalized`, the values will be
  // declared as `normalized` here.
  // The normalization factor will later have to be cancelled out,
  // with the `scale` being multiplied by 255.
  const offset = ppeTexture.offset ?? 0.0;
  const scale = (ppeTexture.scale ?? 1.0) * 255.0;
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
        min: traits.min,
        max: traits.max,
      },
    },
  };
  return classJson;
};

/**
 * Returns the `MetadataSchema` for the PPE textures in the given
 * `MeshPrimitiveGpmLocal` instance.
 *
 * This method will return a (statically/globally) cached metadata
 * schema that reflects the structure of the PPE textures in the
 * given instance, creating and caching it if necessary.
 *
 * For details on the cache key, see `_collectPpeTexturePropertyIdentifiers`
 *
 * @param {MeshPrimitiveGpmLocal} meshPrimitiveGpmLocal The extension object
 * @returns The `MetadataSchema`
 */
GltfMeshPrimitiveGpmLoader._obtainPpeTexturesMetadataSchema = function (
  meshPrimitiveGpmLocal,
) {
  const ppeTexturePropertyIdentifiers =
    GltfMeshPrimitiveGpmLoader._collectPpeTexturePropertyIdentifiers(
      meshPrimitiveGpmLocal,
    );
  const key = ppeTexturePropertyIdentifiers.toString();
  let ppeTexturesMetadataSchema =
    GltfMeshPrimitiveGpmLoader.ppeTexturesMetadataSchemaCache.get(key);
  if (defined(ppeTexturesMetadataSchema)) {
    return ppeTexturesMetadataSchema;
  }

  const schemaId = `PPE_TEXTURE_SCHEMA_${GltfMeshPrimitiveGpmLoader.ppeTexturesMetadataSchemaCache.size}`;
  const ppeTexturesMetadataSchemaJson = {
    id: schemaId,
    classes: {},
  };

  const ppeTextures = meshPrimitiveGpmLocal.ppeTextures;
  for (let i = 0; i < ppeTextures.length; i++) {
    const ppeTexture = ppeTextures[i];
    const classId = `ppeTexture_${i}`;
    const classJson = GltfMeshPrimitiveGpmLoader._createPpeTextureClassJson(
      ppeTexture,
      i,
    );
    ppeTexturesMetadataSchemaJson.classes[classId] = classJson;
  }

  ppeTexturesMetadataSchema = MetadataSchema.fromJson(
    ppeTexturesMetadataSchemaJson,
  );
  GltfMeshPrimitiveGpmLoader.ppeTexturesMetadataSchemaCache.set(
    key,
    ppeTexturesMetadataSchema,
  );
  return ppeTexturesMetadataSchema;
};

/**
 * Creates an array of strings that serve as identifiers for PPE textures.
 *
 * Each glTF may define multiple `ppeTexture` objects within the
 * `NGA_gpm_local` extensions. Each of these textures corresponds
 * to one 'property texture property' in a metadata schema.
 *
 * This method will create an array where each element is a (JSON)
 * string representation of the parts of a GPM PPE texture definition
 * that are relevant for distinguishing two PPE textures in terms
 * of their structure within a `StructuralMetadata`.
 *
 * @param {MeshPrimitiveGpmLocal} meshPrimitiveGpmLocal The extension object
 * @returns The identifiers
 */
GltfMeshPrimitiveGpmLoader._collectPpeTexturePropertyIdentifiers = function (
  meshPrimitiveGpmLocal,
) {
  const ppeTexturePropertyIdentifiers = [];
  const ppeTextures = meshPrimitiveGpmLocal.ppeTextures;
  for (let i = 0; i < ppeTextures.length; i++) {
    const ppeTexture = ppeTextures[i];
    // The following will create an identifier that can be used
    // to define two PPE textures as "representing the same
    // property texture property" within a structural metadata
    // schema.
    const classJson = GltfMeshPrimitiveGpmLoader._createPpeTextureClassJson(
      ppeTexture,
      i,
    );
    const ppeTexturePropertyIdentifier = JSON.stringify(classJson);
    ppeTexturePropertyIdentifiers.push(ppeTexturePropertyIdentifier);
  }
  return ppeTexturePropertyIdentifiers;
};

/**
 * Converts the given `MeshPrimitiveGpmLocal` object into a `StructuralMetadata`
 * object.
 *
 * This will translate the PPE textures from the given object into property
 * texture properties. The schema will be created based on the the structure
 * of the PPE textures.
 *
 * @param {MeshPrimitiveGpmLocal} meshPrimitiveGpmLocal The extension object
 * @param {object} textures The mapping from texture ID to texture objects
 * @returns The `StructuralMetadata` object
 */
GltfMeshPrimitiveGpmLoader._convertToStructuralMetadata = function (
  meshPrimitiveGpmLocal,
  textures,
) {
  const propertyTextures = [];
  const ppeTexturesMetadataSchema =
    GltfMeshPrimitiveGpmLoader._obtainPpeTexturesMetadataSchema(
      meshPrimitiveGpmLocal,
    );
  const ppeTextures = meshPrimitiveGpmLocal.ppeTextures;
  for (let i = 0; i < ppeTextures.length; i++) {
    const ppeTexture = ppeTextures[i];
    const classId = `ppeTexture_${i}`;
    const traits = ppeTexture.traits;
    const ppePropertyName = traits.source;
    const metadataClass = ppeTexturesMetadataSchema.classes[classId];

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
      }),
    );
  }
  const structuralMetadata = new StructuralMetadata({
    schema: ppeTexturesMetadataSchema,
    propertyTables: [],
    propertyTextures: propertyTextures,
    propertyAttributes: [],
  });
  return structuralMetadata;
};

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfMeshPrimitiveGpmLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === ResourceLoaderState.READY) {
    return true;
  }

  if (this._state !== ResourceLoaderState.LOADED) {
    return false;
  }

  // The standard process of loading textures
  // (from GltfStructuralMetadataLoader)
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

  // More of the standard process of loading textures
  // (from GltfStructuralMetadataLoader)
  const textures = {};
  for (let i = 0; i < this._textureIds.length; ++i) {
    const textureId = this._textureIds[i];
    const textureLoader = textureLoaders[i];
    if (!textureLoader.isDestroyed()) {
      textures[textureId] = textureLoader.texture;
    }
  }

  // Convert the JSON representation of the `ppeTextures` that
  // are found in the extensjon JSON into `PpeTexture` objects
  const ppeTextures = [];
  const extension = this._extension;
  if (defined(extension.ppeTextures)) {
    const ppeTexturesJson = extension.ppeTextures;
    for (const ppeTextureJson of ppeTexturesJson) {
      const traitsJson = ppeTextureJson.traits;
      const traits = new PpeMetadata({
        min: traitsJson.min,
        max: traitsJson.max,
        source: traitsJson.source,
      });
      const ppeTexture = new PpeTexture({
        traits: traits,
        noData: ppeTextureJson.noData,
        offset: ppeTextureJson.offset,
        scale: ppeTextureJson.scale,
        index: ppeTextureJson.index,
        texCoord: ppeTextureJson.texCoord,
      });
      ppeTextures.push(ppeTexture);
    }
  }
  const meshPrimitiveGpmLocal = new MeshPrimitiveGpmLocal(ppeTextures);
  this._meshPrimitiveGpmLocal = meshPrimitiveGpmLocal;

  const structuralMetadata =
    GltfMeshPrimitiveGpmLoader._convertToStructuralMetadata(
      meshPrimitiveGpmLocal,
      textures,
    );
  this._structuralMetadata = structuralMetadata;

  this._state = ResourceLoaderState.READY;
  return true;
};

GltfMeshPrimitiveGpmLoader.prototype._unloadTextures = function () {
  const textureLoaders = this._textureLoaders;
  const textureLoadersLength = textureLoaders.length;
  for (let i = 0; i < textureLoadersLength; ++i) {
    ResourceCache.unload(textureLoaders[i]);
  }
  this._textureLoaders.length = 0;
  this._textureIds.length = 0;
};

/**
 * Unloads the resource.
 * @private
 */
GltfMeshPrimitiveGpmLoader.prototype.unload = function () {
  this._unloadTextures();
  this._gltf = undefined;
  this._extension = undefined;
  this._structuralMetadata = undefined;
};

export default GltfMeshPrimitiveGpmLoader;
