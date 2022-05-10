import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import DeveloperError from "../Core/DeveloperError.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfLoader from "./GltfLoader.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";
import ModelExperimentalUtility from "./ModelExperimental/ModelExperimentalUtility.js";
import VoxelShapeType from "./VoxelShapeType.js";

/**
 * A {@link VoxelProvider} that fetches voxel data from a glTF.
 *
 * @alias GltfVoxelProvider
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {String|Resource|Uint8Array|Object|GltfLoader} options.gltf A Resource/URL to a glTF/glb file, a binary glTF buffer, or a JSON object containing the glTF contents
 *
 * @see Cesium3DTilesVoxelProvider
 * @see VoxelProvider
 * @see VoxelPrimitive
 * @see VoxelShapeType
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function GltfVoxelProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.gltf", options.gltf);
  //>>includeEnd('debug');

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   *
   * @type {Boolean}
   * @readonly
   */
  this.ready = false;

  /**
   * @type {Promise.<VoxelProvider>}
   * @private
   */
  this._readyPromise = defer();

  /**
   * Gets the promise that will be resolved when the provider is ready for use.
   *
   * @type {Promise.<GltfVoxelProvider>}
   * @readonly
   */
  this.readyPromise = this._readyPromise.promise;

  /**
   * An optional model matrix that is applied to all tiles
   *
   * @type {Matrix4|undefined}
   * @readonly
   */
  this.modelMatrix = undefined;

  /**
   * Gets the {@link VoxelShapeType}
   *
   * @type {VoxelShapeType}
   * @readonly
   */
  this.shape = undefined;

  /**
   * Gets the minimum bounds.
   * If undefined, the shape's default minimum bounds will be used instead.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.minBounds = undefined;

  /**
   * Gets the maximum bounds.
   * If undefined, the shape's default maximum bounds will be used instead.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Cartesian3|undefined}
   * @readonly
   */
  this.maxBounds = undefined;

  /**
   * Gets the number of voxels per dimension of a tile. This is the same for all tiles in the dataset.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Cartesian3}
   * @readonly
   */
  this.dimensions = undefined;

  /**
   * Gets the number of padding voxels on the edge of a tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   * TODO: mark this optional
   * This should not be called before {@link VoxelProvider#ready} returns true.
   *
   * @type {Number|undefined}
   * @readonly
   */
  this.paddingBefore = undefined;

  /**
   * Gets the number of padding voxels on the edge of a tile. This improves rendering quality when sampling the edge of a tile, but it increases memory usage.
   * This should not be called before {@link VoxelProvider#ready} returns true.
   * TODO: mark this optional
   *
   * @type {Number|undefined}
   * @readonly
   */
  this.paddingAfter = undefined;

  // TODO is there a good user-facing way to set names, types, componentTypes, min, max, etc? MetadataComponents.Primitive is close, but private and has some fields that voxels don't use

  /**
   * Gets stuff
   *
   * @type {String[]}
   * @readonly
   */
  this.names = new Array();

  /**
   * Gets stuff
   *
   * @type {MetadataType[]}
   * @readonly
   */
  this.types = new Array();

  /**
   * Gets stuff
   *
   * @type {MetadataComponentType[]}
   * @readonly
   */
  this.componentTypes = new Array();

  /**
   * TODO is [][] valid JSDOC? https://stackoverflow.com/questions/25602978/jsdoc-two-dimensional-array
   * Gets the minimum value
   *
   * @type {Number[][]|undefined}
   * @readonly
   */
  this.minimumValues = undefined;

  /**
   * TODO is [][] valid JSDOC? https://stackoverflow.com/questions/25602978/jsdoc-two-dimensional-array
   * Gets the maximum value
   *
   * @type {Number[][]|undefined}
   * @readonly
   */
  this.maximumValues = undefined;

  /**
   * The maximum number of tiles that exist for this provider. This value is used as a hint to the voxel renderer to allocate an appropriate amount of GPU memory. If this value is not known it can be set to 0.
   *
   * @type {Number|undefined}
   * @readonly
   */
  this.maximumTileCount = 1;

  /**
   * A {@link GltfLoader} that is processed each frame until ready.
   *
   * @type {GltfLoader}
   * @private
   */
  this._loader = undefined;

  /**
   * The voxel data.
   *
   * @type {Array[]}
   * @private
   */
  this._data = undefined;

  const gltf = options.gltf;
  let promise;
  if (defined(gltf.components) && defined(gltf.components.asset)) {
    promise = gltf.promise;
  } else {
    const gltfResource = Resource.createIfNeeded(gltf);
    const loader = new GltfLoader({
      gltfResource: gltfResource,
      releaseGltfJson: true,
      loadAsTypedArray: true,
    });
    loader.load();
    promise = loader.promise;
    this._loader = loader;
  }

  const that = this;
  promise
    .then(function (loader) {
      const gltf = loader.components;
      const node = gltf.nodes[0];
      const modelMatrix = ModelExperimentalUtility.getNodeTransform(node);
      const gltfPrimitive = node.primitives[0];
      const voxel = gltfPrimitive.voxel;
      const primitiveType = gltfPrimitive.primitiveType;
      const shape = VoxelShapeType.fromPrimitiveType(primitiveType);
      const attributes = gltfPrimitive.attributes;
      const attributesLength = attributes.length;
      const names = new Array(attributesLength);
      const types = new Array(attributesLength);
      const componentTypes = new Array(attributesLength);
      const minimumValues = undefined; //new Array(length);
      const maximumValues = undefined; //new Array(length);

      for (let i = 0; i < attributesLength; i++) {
        const attribute = attributes[i];
        const name = attribute.name;
        const type = attribute.type;
        const componentDatatype = attribute.componentDatatype;
        let nameFixed = name.toLowerCase();
        if (nameFixed.charAt(0) === "_") {
          nameFixed = nameFixed.slice(1);
        }

        names[i] = nameFixed;
        types[i] = type;
        componentTypes[i] = MetadataComponentType.fromComponentDatatype(
          componentDatatype
        );
      }

      that.ready = true;
      that._readyPromise = Promise.resolve(that);

      that.modelMatrix = modelMatrix;
      that.shape = shape;
      that.minBounds = defined(voxel.minBounds)
        ? Cartesian3.clone(voxel.minBounds, new Cartesian3())
        : undefined;
      that.maxBounds = defined(voxel.maxBounds)
        ? Cartesian3.clone(voxel.maxBounds, new Cartesian3())
        : undefined;
      that.dimensions = Cartesian3.clone(voxel.dimensions, new Cartesian3());
      that.paddingBefore = defined(voxel.paddingBefore)
        ? Cartesian3.clone(voxel.paddingBefore, new Cartesian3())
        : undefined;
      that.paddingAfter = defined(voxel.paddingAfter)
        ? Cartesian3.clone(voxel.paddingAfter, new Cartesian3())
        : undefined;

      // TODO is there a good user-facing way to set names, types, componentTypes, min, max, etc? MetadataComponents.Primitive is close, but private and has some fields that voxels don't use

      that.names = names;
      that.types = types;
      that.componentTypes = componentTypes;
      that.minimumValues = minimumValues;
      that.maximumValues = maximumValues;

      that._data = new Array(attributesLength);
      for (let i = 0; i < attributesLength; i++) {
        const attribute = attributes[i];
        const typedArray = attribute.typedArray;
        const type = attribute.type;
        const componentDatatype = attribute.componentDatatype;
        const componentCount = MetadataType.getComponentCount(type);
        const totalCount = attribute.count * componentCount;

        that._data[i] = ComponentDatatype.createArrayBufferView(
          componentDatatype,
          typedArray.buffer,
          typedArray.byteOffset + attribute.byteOffset,
          totalCount
        );
      }

      // Now that the data is loaded the loader can be unloaded.
      that._loader.unload();
      that._loader = undefined;
    })
    .catch(function (error) {
      that.readyPromise = Promise.reject(error);
    });
}

/**
 * A hook to update the provider every frame, called from {@link VoxelPrimitive.update}.
 * If the provider doesn't need this functionality it should leave this function undefined.
 *
 * @param {FrameState} frameState
 */
GltfVoxelProvider.prototype.update = function (frameState) {
  const loader = this._loader;
  if (defined(loader)) {
    loader.process(frameState);
  }
};

/**
 * Requests the data for a given tile. The data is a flattened 3D array ordered by X, then Y, then Z.
 * Note that there is only one "tile" for a glTF so the only valid input is the "root" tile coordinates.
 * This function should not be called before {@link GltfVoxelProvider#ready} returns true.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Number} [options.tileLevel=0] The tile's level.
 * @param {Number} [options.tileX=0] The tile's X coordinate.
 * @param {Number} [options.tileY=0] The tile's Y coordinate.
 * @param {Number} [options.tileZ=0] The tile's Z coordinate.
 * @param {Number} [options.keyframe=0] The requested keyframe.
 * @returns {Promise<Array[]>|undefined} An array of promises for the requested voxel data or undefined if there was a problem loading the data.
 *
 * @exception {DeveloperError} The provider must be ready.
 * @exception {DeveloperError} Only level 0 can be requested.
 */
GltfVoxelProvider.prototype.requestData = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!this.ready) {
    throw new DeveloperError(
      "requestData must not be called before the provider is ready."
    );
  }
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  // glTF current doesn't support level of detail.
  const tileLevel = defaultValue(options.tileLevel, 0);
  if (tileLevel > 0) {
    return undefined;
  }
  // glTF currently doesn't support time-dynamic.
  const keyframe = defaultValue(options.keyframe, 0);
  if (keyframe > 0) {
    return undefined;
  }

  return Promise.resolve(this._data);
};

/**
 * Check if the data is still being loaded.
 * This is intended to be used for unit tests only.
 *
 * @returns {Boolean}
 *
 * @private
 */
GltfVoxelProvider.prototype.doneLoading = function () {
  return defined(this._data);
};

export default GltfVoxelProvider;
