import Axis from "../Axis.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import when from "../../ThirdParty/when.js";

var I3dmLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

/**
 * Loads an Instanced 3D Model.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias I3dmLoader
 * @constructor
 * @augments ResourceLoader
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.i3dmResource The {@link Resource} containing the I3DM.
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the I3DM contents.
 * @param {Number} [options.byteOffset=0] The byte offset to the beginning of the I3DM contents in the array buffer.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.X] The forward-axis of the glTF model.
 * @param {Boolean} [options.loadAsTypedArray=false] Load all attributes as typed arrays instead of GPU buffers.
 */
function I3dmLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var i3dmResource = options.i3dmResource;
  var arrayBuffer = options.arrayBuffer;
  var baseResource = options.baseResource;
  var byteOffset = defaultValue(options.byteOffset, 0);
  var releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  var asynchronous = defaultValue(options.asynchronous, true);
  var incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  var upAxis = defaultValue(options.upAxis, Axis.Y);
  var forwardAxis = defaultValue(options.forwardAxis, Axis.X);
  var loadAsTypedArray = defaultValue(options.loadAsTypedArray, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.i3dmResource", i3dmResource);
  Check.typeOf.object("options.arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  baseResource = defined(baseResource) ? baseResource : i3dmResource.clone();

  this._i3dmResource = i3dmResource;
  this._baseResource = baseResource;
  this._arrayBuffer = arrayBuffer;
  this._byteOffset = byteOffset;
  this._releaseGltfJson = releaseGltfJson;
  this._asynchronous = asynchronous;
  this._incrementallyLoadTextures = incrementallyLoadTextures;
  this._upAxis = upAxis;
  this._forwardAxis = forwardAxis;
  this._loadAsTypedArray = loadAsTypedArray;

  this._state = I3dmLoaderState.UNLOADED;
  this._promise = when.defer();

  this._gltfLoader = undefined;
}
