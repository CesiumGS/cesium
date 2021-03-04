//import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Request from "../Core/Request.js";
import RequestScheduler from "../Core/RequestScheduler.js";
import RequestState from "../Core/RequestState.js";
import RequestType from "../Core/RequestType.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";
import Cesium3DTileContentType from "./Cesium3DTileContentType.js";
import Cesium3DTileContentFactory from "./Cesium3DTileContentFactory.js";
import preprocess3DTileContent from "./preprocess3DTileContent.js";

/**
 * A collection of contents for tiles that use the <code>3DTILES_multiple_contents</code> extension.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_multiple_contents/0.0.0|3DTILES_multiple_contents extension}
 *
 * @alias Multiple3DTileContent
 * @constructor
 *
 * @param {Cesium3DTileset} tileset The tileset this content belongs to
 * @param {Cesium3DTile} tile The content this content belongs to
 * @param {Resource} tilesetResource The resource that points to the tileset. This will be used to derive each inner content's resource.
 * @param {Object} extensionJson The <code>3DTILES_multiple_contents</code> extension JSON
 *
 * @private
 */
export default function Multiple3DTileContent(
  tileset,
  tile,
  tilesetResource,
  extensionJson
) {
  this._tileset = tileset;
  this._tile = tile;
  this._tilesetResource = tilesetResource;
  this._contents = [];

  var contentHeaders = extensionJson.content;
  this._innerContentHeaders = contentHeaders;

  var contentCount = this._innerContentHeaders.length;
  this._arrayFetchPromises = new Array(contentCount);

  this._innerContentResources = new Array(contentCount);
  this._serverKeys = new Array(contentCount);

  var priorityFunction = function () {
    return tile.priority;
  };
  for (var i = 0; i < contentCount; i++) {
    var contentResource = tilesetResource.getDerivedResource({
      url: contentHeaders[i].uri,
      preserveQueryParameters: true,
    });

    var serverKey = RequestScheduler.getServerKey(
      contentResource.getUrlComponent()
    );

    var request = new Request({
      throttle: true,
      throttleByServer: true,
      type: RequestType.TILES3D,
      priorityFunction: priorityFunction,
      serverKey: serverKey,
    });
    contentResource.request = request;

    this._innerContentResources[i] = contentResource;
    this._serverKeys[i] = serverKey;
  }

  // undefined until all requests are scheduled
  this._contentsFetchedPromise = undefined;
  this._readyPromise = when.defer();
}

Object.defineProperties(Multiple3DTileContent.prototype, {
  featurePropertiesDirty: {
    get: function () {
      var contents = this._contents;
      var length = contents.length;
      for (var i = 0; i < length; ++i) {
        if (contents[i].featurePropertiesDirty) {
          return true;
        }
      }

      return false;
    },
    set: function (value) {
      var contents = this._contents;
      var length = contents.length;
      for (var i = 0; i < length; ++i) {
        contents[i].featurePropertiesDirty = value;
      }
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>featuresLength</code> for a specific inner content.
   * @memberof Composite3DTileContent.prototype
   */
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead, call <code>pointsLength</code> for a specific inner content.
   * @memberof Composite3DTileContent.prototype
   */
  pointsLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>trianglesLength</code> for a specific inner content.
   * @memberof Composite3DTileContent.prototype
   */
  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>geometryByteLength</code> for a specific inner content.
   * @memberof Composite3DTileContent.prototype
   */
  geometryByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.   <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>texturesByteLength</code> for a specific inner content.
   * @memberof Composite3DTileContent.prototype
   */
  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Composite3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>batchTableByteLength</code> for a specific inner content.
   * @memberof Composite3DTileContent.prototype
   */
  batchTableByteLength: {
    get: function () {
      return 0;
    },
  },

  innerContents: {
    get: function () {
      return this._contents;
    },
  },

  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  tile: {
    get: function () {
      return this._tile;
    },
  },

  url: {
    get: function () {
      return this._resource.getUrlComponent(true);
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Composite3DTileContent</code>
   * always returns <code>undefined</code>.  Instead call <code>batchTable</code> for a specific inner content.
   * @memberof Composite3DTileContent.prototype
   */
  batchTable: {
    get: function () {
      return undefined;
    },
  },

  /**
   * A promise that resolves when all of the inner contents have been fetched.
   * This promise is undefined until the first frame where all array buffer
   * requests have been scheduled.
   * @type {Promise}
   * @private
   */
  contentFetchedPromise: {
    get: function () {
      return this._contentsFetchedPromise;
    },
  },
});

/**
 * Request the inner contents of this <code>Multiple3DTileContent</code>. This must be called once a frame until
 * {@link Multiple3DTileContent#contentFetchedPromise} is defined. This promise
 * becomes available as soon as all requests are scheduled.
 * <p>
 * This method also updates the tile statistics' pending request count if the
 * requests are successfully scheduled.
 * </p>
 *
 * @return {Number} The number of attempted requests that were unable to be scheduled.
 * @private
 */
Multiple3DTileContent.prototype.requestInnerContents = function () {
  // It's possible for these promises to leak content array buffers if the
  // camera moves before they all are scheduled. To prevent this leak, check
  // if we can schedule all the requests at once. If not, no requests are
  // scheduled
  if (!canScheduleAllRequests(this._serverKeys)) {
    return this._serverKeys.length;
  }

  var contentHeaders = this._innerContentHeaders;
  this._tileset.statistics.numberOfPendingRequests += contentHeaders.length;
  for (var i = 0; i < contentHeaders.length; i++) {
    this._arrayFetchPromises[i] = requestInnerContent(this, i);
  }

  this._contentsFetchedPromise = createInnerContents(this);
  return 0;
};

/**
 * Check if all requests for inner contents can be scheduled at once. This is slower, but it avoids a potential memory leak.
 * @param {String[]} serverKeys the server keys for all of the inner contents
 * @return {Boolean} True if the request scheduler has enough open slots for all inner contents
 * @private
 */
function canScheduleAllRequests(serverKeys) {
  var requestCountsByServer = {};
  for (var i = 0; i < serverKeys.length; i++) {
    var serverKey = serverKeys[i];
    if (defined(requestCountsByServer[serverKey])) {
      requestCountsByServer[serverKey]++;
    } else {
      requestCountsByServer[serverKey] = 1;
    }
  }

  for (var key in requestCountsByServer) {
    if (
      requestCountsByServer.hasOwnProperty(key) &&
      !RequestScheduler.serverHasOpenSlots(key, requestCountsByServer[key])
    ) {
      return false;
    }
  }
  return true;
}

function requestInnerContent(multipleContent, index) {
  var contentResource = multipleContent._innerContentResources[index];
  var tile = multipleContent.tile;

  var expired = tile.contentExpired;
  if (expired) {
    // Append a query parameter of the tile expiration date to prevent caching
    contentResource.setQueryParameters({
      expired: tile.expireDate.toString(),
    });
  }

  var tileset = multipleContent._tileset;
  return contentResource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      --tileset.statistics.numberOfPendingRequests;
      return arrayBuffer;
    })
    .otherwise(function (error) {
      var request = contentResource.request;
      --tileset.statistics.numberOfPendingRequests;

      if (request.state === RequestState.CANCELLED) {
        // Cancelled due to low priority
        // TODO: How to update this if canceling one inner content cancels
        // the entire multiple content?
        ++tileset.statistics.numberOfAttemptedRequests;
        // TODO: this should throw an exception to cancel the whole
        // multiple content. This will require some other tweaks to
        // ensure statistics are accurate.
        return undefined;
      }

      handleInnerContentFailed(multipleContent, index, error);
      return undefined;
    });
}

function createInnerContents(multipleContent) {
  return when
    .all(multipleContent._arrayFetchPromises)
    .then(function (arrayBuffers) {
      return arrayBuffers.map(function (arrayBuffer, i) {
        if (!defined(arrayBuffer)) {
          // Content was not fetched. The error was handled in
          // the fetch promise
          return undefined;
        }

        var resource = multipleContent._innerContentResources[i];

        try {
          return createInnerContent(multipleContent, resource, arrayBuffer);
        } catch (error) {
          handleInnerContentFailed(multipleContent, i, error);
          return undefined;
        }
      });
    })
    .then(function (contents) {
      multipleContent._contents = contents.filter(defined);
      awaitReadyPromises(multipleContent);
    })
    .otherwise(function (error) {
      multipleContent._readyPromise.reject(error);
    });
}

function createInnerContent(multipleContent, resource, arrayBuffer) {
  var preprocessed = preprocess3DTileContent(arrayBuffer);

  if (preprocessed.contentType === Cesium3DTileContentType.EXTERNAL_TILESET) {
    throw new RuntimeError(
      "External tilesets are disallowed inside the 3DTILES_multiple_contents extension"
    );
  }

  multipleContent._disableSkipLevelOfDetail =
    multipleContent._disableSkipLevelOfDetail ||
    preprocessed.contentType === Cesium3DTileContentType.GEOMETRY ||
    preprocessed.contentType === Cesium3DTileContentType.VECTOR;

  var content;
  var contentFactory = Cesium3DTileContentFactory[preprocessed.contentType];
  if (defined(preprocessed.binaryPayload)) {
    content = contentFactory(
      multipleContent._tileset,
      multipleContent._tile,
      resource,
      preprocessed.binaryPayload.buffer,
      0
    );
  } else {
    // JSON formats
    content = contentFactory(
      multipleContent._tileset,
      multipleContent._tile,
      resource,
      preprocessed.jsonPayload
    );
  }

  return content;
}

function awaitReadyPromises(multipleContent) {
  var readyPromises = multipleContent._contents.map(function (content) {
    return content.readyPromise;
  });

  when
    .all(readyPromises)
    .then(function () {
      multipleContent._readyPromise.resolve(multipleContent);
    })
    .otherwise(function (error) {
      multipleContent._readyPromise.reject(error);
    });
}

function handleInnerContentFailed(multipleContent, index, error) {
  var tileset = multipleContent._tileset;
  var url = multipleContent._innerContentResources[index].url;
  var message = defined(error.message) ? error.message : error.toString();
  if (tileset.tileFailed.numberOfListeners > 0) {
    tileset.tileFailed.raiseEvent({
      url: url,
      message: message,
    });
  } else {
    console.log("A content failed to load: " + url);
    console.log("Error: " + message);
  }
}

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
 * always returns <code>false</code>.  Instead call <code>hasProperty</code> for a specific inner content
 */
Multiple3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
 * always returns <code>undefined</code>.  Instead call <code>getFeature</code> for a specific inner content
 */
Multiple3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Multiple3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].applyDebugSettings(enabled, color);
  }
};

Multiple3DTileContent.prototype.applyStyle = function (style) {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].applyStyle(style);
  }
};

Multiple3DTileContent.prototype.update = function (tileset, frameState) {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].update(tileset, frameState);
  }
};

Multiple3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Multiple3DTileContent.prototype.destroy = function () {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].destroy();
  }
  return destroyObject(this);
};
