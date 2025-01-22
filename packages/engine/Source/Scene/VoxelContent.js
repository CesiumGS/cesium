import { destroyObject } from "@cesium/engine";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import DeveloperError from "../Core/DeveloperError.js";
import defined from "../Core/defined.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import GltfLoader from "./GltfLoader.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataTable from "./MetadataTable.js";
import MetadataType from "./MetadataType.js";

/**
 * <div class="notice">
 * To construct a VoxelContent, call {@link VoxelContent.fromGltf}. Do not call the constructor directly.
 * </div>
 * An object representing voxel content for a {@link Cesium3DTilesVoxelProvider}.
 *
 * @alias VoxelContent
 * @constructor
 *
 * @param {object} options An object with the following properties:
 * @param {Resource} [options.resource] The resource for this voxel content. This is used for fetching external buffers as needed.
 * @param {ResourceLoader} [options.loader] The loader used to load the voxel content.
 * @param {TypedArray[]} [options.metadata] The metadata for this voxel content.
 *
 * @exception {DeveloperError} One of loader and metadata must be defined.
 * @exception {DeveloperError} metadata must be an array of TypedArrays.
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function VoxelContent(options) {
  const { resource, loader, metadata } = options;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  if (!defined(loader)) {
    if (!defined(metadata)) {
      throw new DeveloperError("One of loader and metadata must be defined.");
    }
    if (!Array.isArray(metadata)) {
      throw new DeveloperError("metadata must be an array of TypedArrays.");
    }
  }
  //>>includeEnd('debug');

  // TODO: do we need resource?
  this._resource = resource;
  this._loader = loader;

  this._metadata = metadata;
  this._resourcesLoaded = false;
  this._ready = false;
}

Object.defineProperties(VoxelContent.prototype, {
  /**
   * Returns true when the content is ready to render; otherwise false
   *
   * @memberof VoxelContent.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * The metadata for this voxel content.
   * The metadata is an array of typed arrays, one for each field.
   * The data for one field is a flattened 3D array ordered by X, then Y, then Z.
   * TODO: use a MetadataTable
   * @type {TypedArray[]}
   * @readonly
   */
  metadata: {
    get: function () {
      return this._metadata;
    },
  },
});

VoxelContent.fromGltf = async function (resource, provider, frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resource", resource);
  //>>includeEnd('debug');

  // Construct the glTF loader
  const loader = new GltfLoader({
    gltfResource: resource,
    releaseGltfJson: false,
    loadAttributesAsTypedArray: true,
  });

  try {
    // This loads the gltf JSON and ensures the gltf is valid
    // Further resource loading is handled synchronously in loader.process()
    // via voxelContent.update() as the frameState is needed
    await loader.load();
  } catch (error) {
    loader.destroy();
    throw error;
  }

  await loader.load();
  loader.process(frameState);
  await loader._loadResourcesPromise;
  loader.process(frameState);

  const metadata = processAttributes(
    loader.components.scene.nodes[0].primitives[0].attributes,
    provider,
  );
  return new VoxelContent({ resource, loader, metadata });
};

/**
 * Updates the content until all resources are ready for rendering.
 * @param {FrameState} frameState The frame state
 * @private
 */
VoxelContent.prototype.update = function (primitive, frameState) {
  const loader = this._loader;

  if (this._ready) {
    // Nothing to do
    return;
  }

  // Ensures frames continue to render in requestRender mode while resources are processing
  frameState.afterRender.push(() => true);

  if (!defined(loader)) {
    this._ready = true;
    return;
  }

  if (this._resourcesLoaded) {
    // TODO: load to megatexture?
    const { attributes } = loader.components.scene.nodes[0].primitives[0];
    this._metadata = processAttributes(attributes, primitive);
    this._ready = true;
    return;
  }

  // TODO: handle errors from GltfLoader.prototype.process
  this._resourcesLoaded = loader.process(frameState);
};

/**
 * Processes the attributes from the glTF loader, reordering them into the order expected by the primitive.
 * TODO: use a MetadataTable?
 *
 * @param {ModelComponents.Attribute[]} attributes The attributes to process
 * @param {VoxelPrimitive} primitive The primitive for which this voxel content will be used.
 * @returns {TypedArray[]} An array of typed arrays containing the attribute values
 * @private
 */
function processAttributes(attributes, provider) {
  //function processAttributes(attributes, primitive) {
  //const { names, types, componentTypes } = primitive.provider;
  const { names, types, componentTypes } = provider;
  const data = new Array(attributes.length);

  for (let i = 0; i < attributes.length; i++) {
    // The attributes array from GltfLoader is not in the same order as
    // names, types, etc. from the provider.
    // Find the appropriate glTF attribute based on its name.
    // Note: glTF custom attribute names are prefixed with "_"
    const name = `_${names[i]}`;
    const attribute = attributes.find((a) => a.name === name);
    if (!defined(attribute)) {
      continue;
    }

    const componentDatatype = MetadataComponentType.toComponentDatatype(
      componentTypes[i],
    );
    const componentCount = MetadataType.getComponentCount(types[i]);
    const totalCount = attribute.count * componentCount;
    data[i] = ComponentDatatype.createArrayBufferView(
      componentDatatype,
      attribute.typedArray.buffer,
      attribute.typedArray.byteOffset + attribute.byteOffset,
      totalCount,
    );
  }

  return data;
}

/**
 * Creates an object representing voxel content for a {@link Cesium3DTilesVoxelProvider}.
 *
 * @param {Resource} resource The resource for this voxel content. This is used for fetching external buffers as needed.
 * @param {object} [json] Voxel JSON contents. Mutually exclusive with binary.
 * @param {Uint8Array} [binary] Voxel binary contents. Mutually exclusive with json.
 * @param {MetadataSchema} metadataSchema The metadata schema used by property tables in the voxel content
 * @returns {Promise<VoxelContent>}
 *
 * @exception {DeveloperError} One of json and binary must be defined.
 */
VoxelContent.fromJson = async function (
  resource,
  json,
  binary,
  metadataSchema,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resource", resource);
  if (defined(json) === defined(binary)) {
    throw new DeveloperError("One of json and binary must be defined.");
  }
  //>>includeEnd('debug');

  let chunks;
  if (defined(json)) {
    chunks = {
      json: json,
      binary: undefined,
    };
  } else {
    chunks = parseVoxelChunks(binary);
  }

  const buffersU8 = await requestBuffers(resource, chunks.json, chunks.binary);
  const bufferViewsU8 = {};
  const bufferViewsLength = chunks.json.bufferViews.length;
  for (let i = 0; i < bufferViewsLength; ++i) {
    const bufferViewJson = chunks.json.bufferViews[i];
    const start = bufferViewJson.byteOffset;
    const end = start + bufferViewJson.byteLength;
    const buffer = buffersU8[bufferViewJson.buffer];
    const bufferView = buffer.subarray(start, end);
    bufferViewsU8[i] = bufferView;
  }

  const propertyTableIndex = chunks.json.voxelTable;
  const propertyTableJson = chunks.json.propertyTables[propertyTableIndex];

  const content = new VoxelContent(resource);

  content._metadataTable = new MetadataTable({
    count: propertyTableJson.count,
    properties: propertyTableJson.properties,
    class: metadataSchema.classes[propertyTableJson.class],
    bufferViews: bufferViewsU8,
  });

  return content;
};

function requestBuffers(resource, json, binary) {
  const buffersLength = json.buffers.length;
  const bufferPromises = new Array(buffersLength);
  for (let i = 0; i < buffersLength; i++) {
    const buffer = json.buffers[i];
    if (defined(buffer.uri)) {
      const baseResource = resource;
      const bufferResource = baseResource.getDerivedResource({
        url: buffer.uri,
      });
      bufferPromises[i] = bufferResource
        .fetchArrayBuffer()
        .then(function (arrayBuffer) {
          return new Uint8Array(arrayBuffer);
        });
    } else {
      bufferPromises[i] = Promise.resolve(binary);
    }
  }

  return Promise.all(bufferPromises);
}

/**
 * A helper object for storing the two parts of the binary voxel content
 *
 * @typedef {object} VoxelChunks
 * @property {object} json The json chunk of the binary voxel content
 * @property {Uint8Array} binary The binary chunk of the binary voxel content. This represents the internal buffer.
 * @private
 */

/**
 * Given binary voxel content, split into JSON and binary chunks
 *
 * @param {Uint8Array} binaryView The binary voxel content
 * @returns {VoxelChunks} An object containing the JSON and binary chunks
 * @private
 */
function parseVoxelChunks(binaryView) {
  // Parse the header
  const littleEndian = true;
  const reader = new DataView(binaryView.buffer, binaryView.byteOffset);
  // Skip to the chunk lengths
  let byteOffset = 8;

  // Read the bottom 32 bits of the 64-bit byte length. This is ok for now because:
  // 1) not all browsers have native 64-bit operations
  // 2) the data is well under 4GB
  const jsonByteLength = reader.getUint32(byteOffset, littleEndian);
  byteOffset += 8;
  const binaryByteLength = reader.getUint32(byteOffset, littleEndian);
  byteOffset += 8;

  const json = getJsonFromTypedArray(binaryView, byteOffset, jsonByteLength);
  byteOffset += jsonByteLength;
  const binary = binaryView.subarray(byteOffset, byteOffset + binaryByteLength);

  return {
    json: json,
    binary: binary,
  };
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see VoxelContent#destroy
 *
 * @private
 */
VoxelContent.prototype.isDestroyed = function () {
  return false;
};

/**
 * Frees the resources used by this object.
 * @private
 */
VoxelContent.prototype.destroy = function () {
  this._loader = this._loader && this._loader.destroy();
  return destroyObject(this);
};

export default VoxelContent;
