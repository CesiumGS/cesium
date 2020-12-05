import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import isDataUri from "../Core/isDataUri.js";
import Resource from "../Core/Resource.js";
import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";
import when from "../ThirdParty/when.js";

var globalIdCounter = 0;

/**
 * Contains a glTF and any runtime resources.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 *
 * @alias GltfContainer
 * @constructor
 *
 * @private
 */
function GltfContainer(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  //>>includeEnd('debug');

  var bufferDataArray;
  var imageDataArray;
  var i;

  var promises = [];

  // TODO: simplify and combine
  var buffers = gltf.buffers;
  if (defined(buffers)) {
    var buffersLength = buffers.length;
    bufferDataArray = new Array(buffersLength);
    for (i = 0; i < buffersLength; ++i) {
      var buffer = buffers[i];
      var bufferData = GltfFeatureMetadataUtility.getSourceDataFromPipelineExtras(
        buffer
      );
      if (defined(bufferData)) {
        bufferDataArray[i] = bufferData;
      } else {
        var bufferUri = buffer.uri;
        if (defined(bufferUri) && isDataUri(bufferUri)) {
          var bufferCallback = getFetchCompleteCallback(bufferDataArray, i);
          var bufferUriPromise = Resource.fetchArrayBuffer(bufferUri).then(
            bufferCallback
          );
          promises.push(bufferUriPromise);
        }
      }
    }
  }

  var images = gltf.images;
  if (defined(images)) {
    var imagesLength = images.length;
    imageDataArray = new Array(imagesLength);
    for (i = 0; i < imagesLength; ++i) {
      var image = images[i];
      var imageData = GltfFeatureMetadataUtility.getSourceDataFromPipelineExtras(
        image
      );
      if (defined(imageData)) {
        imageDataArray[i] = imageData;
      } else {
        var imageUri = image.uri;
        if (defined(imageUri) && isDataUri(imageUri)) {
          var imageCallback = getFetchCompleteCallback(imageDataArray, i);
          var imageUriPromise = Resource.fetchArrayBuffer(imageUri).then(
            imageCallback
          );
          promises.push(imageUriPromise);
        }
      }
    }
  }

  var that = this;
  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  this._id = globalIdCounter++;
  this._gltf = gltf;
  this._bufferDataArray = bufferDataArray;
  this._imageDataArray = imageDataArray;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfContainer.prototype, {
  /**
   * A unique ID for this glTF.
   *
   * @memberof GltfContainer.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The glTF JSON object.
   *
   * @memberof GltfContainer.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  gltf: {
    get: function () {
      return this._gltf;
    },
  },

  /**
   * Promise that resolves when the gltf container is ready.
   *
   * @memberof GltfContainer.prototype
   * @type {Promise.<GltfContainer>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

// TODO
GltfContainer.prototype.getBufferData = function (bufferId) {
  return this._bufferDataArray[bufferId];
};

// TODO
GltfContainer.prototype.getImageData = function (imageId) {
  return this._imageDataArray[imageId];
};

function getFetchCompleteCallback(dataArray, index) {
  return function (arrayBuffer) {
    dataArray[index] = new Uint8Array(arrayBuffer);
  };
}

export default GltfContainer;
