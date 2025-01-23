import { destroyObject } from "@cesium/engine";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import DeveloperError from "../Core/DeveloperError.js";
import defined from "../Core/defined.js";
import GltfLoader from "./GltfLoader.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";

/**
 * An object representing voxel content for a {@link Cesium3DTilesVoxelProvider}.
 *
 * @alias VoxelContent
 * @constructor
 *
 * @param {object} options An object with the following properties:
 * @param {ResourceLoader} [options.loader] The loader used to load the voxel content.
 * @param {TypedArray[]} [options.metadata] The metadata for this voxel content.
 *
 * @exception {DeveloperError} One of loader and metadata must be defined.
 * @exception {DeveloperError} metadata must be an array of TypedArrays.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function VoxelContent(options) {
  const { loader, metadata } = options;
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

/**
 * Constructs a VoxelContent from a glTF resource.
 *
 * @param {Resource} resource A Resource pointing to a glTF containing voxel content
 * @returns {Promise<VoxelContent>} A promise that resolves to the voxel content
 */
VoxelContent.fromGltf = async function (resource) {
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

  return new VoxelContent({ loader });
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
    const { attributes } = loader.components.scene.nodes[0].primitives[0];
    this._metadata = processAttributes(attributes, primitive);
    this._ready = true;
    return;
  }

  this._resourcesLoaded = loader.process(frameState);
};

/**
 * Processes the attributes from the glTF loader, reordering them into the order expected by the primitive.
 *
 * @param {ModelComponents.Attribute[]} attributes The attributes to process
 * @param {VoxelPrimitive} primitive The primitive for which this voxel content will be used.
 * @returns {TypedArray[]} An array of typed arrays containing the attribute values
 * @private
 */
function processAttributes(attributes, primitive) {
  const { names, types, componentTypes } = primitive.provider;
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
