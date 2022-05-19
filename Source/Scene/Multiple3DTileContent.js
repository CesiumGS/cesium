import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Request from "../Core/Request.js";
import RequestScheduler from "../Core/RequestScheduler.js";
import RequestState from "../Core/RequestState.js";
import RequestType from "../Core/RequestType.js";
import RuntimeError from "../Core/RuntimeError.js";
import Cesium3DContentGroup from "./Cesium3DContentGroup.js";
import Cesium3DTileContentType from "./Cesium3DTileContentType.js";
import Cesium3DTileContentFactory from "./Cesium3DTileContentFactory.js";
import findContentMetadata from "./findContentMetadata.js";
import findGroupMetadata from "./findGroupMetadata.js";
import preprocess3DTileContent from "./preprocess3DTileContent.js";

/**
 * A collection of contents for tiles that have multiple contents, either via the tile JSON (3D Tiles 1.1) or the <code>3DTILES_multiple_contents</code> extension.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_multiple_contents|3DTILES_multiple_contents extension}
 *
 * @alias Multiple3DTileContent
 * @constructor
 *
 * @param {Cesium3DTileset} tileset The tileset this content belongs to
 * @param {Cesium3DTile} tile The content this content belongs to
 * @param {Resource} tilesetResource The resource that points to the tileset. This will be used to derive each inner content's resource.
 * @param {Object} contentsJson Either the tile JSON containing the contents array (3D Tiles 1.1), or <code>3DTILES_multiple_contents</code> extension JSON
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function Multiple3DTileContent(
  tileset,
  tile,
  tilesetResource,
  contentsJson
) {
  this._tileset = tileset;
  this._tile = tile;
  this._tilesetResource = tilesetResource;
  this._contents = [];

  // An older version of 3DTILES_multiple_contents used "content" instead of "contents"
  const contentHeaders = defined(contentsJson.contents)
    ? contentsJson.contents
    : contentsJson.content;

  this._innerContentHeaders = contentHeaders;
  this._requestsInFlight = 0;

  // How many times cancelPendingRequests() has been called. This is
  // used to help short-circuit computations after a tile was canceled.
  this._cancelCount = 0;

  const contentCount = this._innerContentHeaders.length;
  this._arrayFetchPromises = new Array(contentCount);
  this._requests = new Array(contentCount);

  this._innerContentResources = new Array(contentCount);
  this._serverKeys = new Array(contentCount);

  for (let i = 0; i < contentCount; i++) {
    const contentResource = tilesetResource.getDerivedResource({
      url: contentHeaders[i].uri,
    });

    const serverKey = RequestScheduler.getServerKey(
      contentResource.getUrlComponent()
    );

    this._innerContentResources[i] = contentResource;
    this._serverKeys[i] = serverKey;
  }

  // undefined until the first time requests are scheduled
  this._contentsFetchedPromise = undefined;
  this._readyPromise = defer();
}

Object.defineProperties(Multiple3DTileContent.prototype, {
  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code> checks if any of the inner contents have dirty featurePropertiesDirty.
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {Boolean}
   *
   * @private
   */
  featurePropertiesDirty: {
    get: function () {
      const contents = this._contents;
      const length = contents.length;
      for (let i = 0; i < length; ++i) {
        if (contents[i].featurePropertiesDirty) {
          return true;
        }
      }

      return false;
    },
    set: function (value) {
      const contents = this._contents;
      const length = contents.length;
      for (let i = 0; i < length; ++i) {
        contents[i].featurePropertiesDirty = value;
      }
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>featuresLength</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead, call <code>pointsLength</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  pointsLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>trianglesLength</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>geometryByteLength</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  geometryByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.   <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>texturesByteLength</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>batchTableByteLength</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  batchTableByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>metadataByteLength</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  metadataByteLength: {
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

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * Unlike other content types, <code>Multiple3DTileContent</code> does not
   * have a single URL, so this returns undefined.
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  url: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Multiple3DTileContent</code>
   * always returns <code>undefined</code>.  Instead call <code>metadata</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  metadata: {
    get: function () {
      return undefined;
    },
    set: function () {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError("Multiple3DTileContent cannot have metadata");
      //>>includeEnd('debug');
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Multiple3DTileContent</code>
   * always returns <code>undefined</code>.  Instead call <code>batchTable</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  batchTable: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Multiple3DTileContent</code>
   * always returns <code>undefined</code>.  Instead call <code>group</code> for a specific inner content.
   * @memberof Multiple3DTileContent.prototype
   * @private
   */
  group: {
    get: function () {
      return undefined;
    },
    set: function () {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(
        "Multiple3DTileContent cannot have group metadata"
      );
      //>>includeEnd('debug');
    },
  },

  /**
   * Get an array of the inner content URLs, regardless of whether they've
   * been fetched or not. This is intended for use with
   * {@link Cesium3DTileset#debugShowUrl}.
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {String[]}
   * @readonly
   * @private
   */
  innerContentUrls: {
    get: function () {
      return this._innerContentHeaders.map(function (contentHeader) {
        return contentHeader.uri;
      });
    },
  },

  /**
   * A promise that resolves when all of the inner contents have been fetched.
   * This promise is undefined until the first frame where all array buffer
   * requests have been scheduled.
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {Promise}
   * @private
   */
  contentsFetchedPromise: {
    get: function () {
      if (defined(this._contentsFetchedPromise)) {
        return this._contentsFetchedPromise.promise;
      }

      return undefined;
    },
  },
});

function updatePendingRequests(multipleContents, deltaRequestCount) {
  multipleContents._requestsInFlight += deltaRequestCount;
  multipleContents.tileset.statistics.numberOfPendingRequests += deltaRequestCount;
}

function cancelPendingRequests(multipleContents, originalContentState) {
  multipleContents._cancelCount++;

  // reset the tile's content state to try again later.
  multipleContents._tile._contentState = originalContentState;

  multipleContents.tileset.statistics.numberOfPendingRequests -=
    multipleContents._requestsInFlight;
  multipleContents._requestsInFlight = 0;

  // Discard the request promises.
  const contentCount = multipleContents._innerContentHeaders.length;
  multipleContents._arrayFetchPromises = new Array(contentCount);
}

/**
 * Request the inner contents of this <code>Multiple3DTileContent</code>. This must be called once a frame until
 * {@link Multiple3DTileContent#contentsFetchedPromise} is defined. This promise
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

  const contentHeaders = this._innerContentHeaders;
  updatePendingRequests(this, contentHeaders.length);

  for (let i = 0; i < contentHeaders.length; i++) {
    // The cancel count is needed to avoid a race condition where a content
    // is canceled multiple times.
    this._arrayFetchPromises[i] = requestInnerContent(
      this,
      i,
      this._cancelCount,
      this._tile._contentState
    );
  }

  // set up the deferred promise the first time requestInnerContent()
  // is called.
  if (!defined(this._contentsFetchedPromise)) {
    this._contentsFetchedPromise = defer();
  }

  createInnerContents(this);
  return 0;
};

/**
 * Check if all requests for inner contents can be scheduled at once. This is slower, but it avoids a potential memory leak.
 * @param {String[]} serverKeys The server keys for all of the inner contents
 * @return {Boolean} True if the request scheduler has enough open slots for all inner contents
 * @private
 */
function canScheduleAllRequests(serverKeys) {
  const requestCountsByServer = {};
  for (let i = 0; i < serverKeys.length; i++) {
    const serverKey = serverKeys[i];
    if (defined(requestCountsByServer[serverKey])) {
      requestCountsByServer[serverKey]++;
    } else {
      requestCountsByServer[serverKey] = 1;
    }
  }

  for (const key in requestCountsByServer) {
    if (
      requestCountsByServer.hasOwnProperty(key) &&
      !RequestScheduler.serverHasOpenSlots(key, requestCountsByServer[key])
    ) {
      return false;
    }
  }
  return RequestScheduler.heapHasOpenSlots(serverKeys.length);
}

function requestInnerContent(
  multipleContents,
  index,
  originalCancelCount,
  originalContentState
) {
  // it is important to clone here. The fetchArrayBuffer() below here uses
  // throttling, but other uses of the resources do not.
  const contentResource = multipleContents._innerContentResources[
    index
  ].clone();
  const tile = multipleContents.tile;

  // Always create a new request. If the tile gets canceled, this
  // avoids getting stuck in the canceled state.
  const priorityFunction = function () {
    return tile._priority;
  };
  const serverKey = multipleContents._serverKeys[index];
  const request = new Request({
    throttle: true,
    throttleByServer: true,
    type: RequestType.TILES3D,
    priorityFunction: priorityFunction,
    serverKey: serverKey,
  });
  contentResource.request = request;
  multipleContents._requests[index] = request;

  return contentResource
    .fetchArrayBuffer()
    .then(function (arrayBuffer) {
      // Short circuit if another inner content was canceled.
      if (originalCancelCount < multipleContents._cancelCount) {
        return undefined;
      }

      updatePendingRequests(multipleContents, -1);
      return arrayBuffer;
    })
    .catch(function (error) {
      // Short circuit if another inner content was canceled.
      if (originalCancelCount < multipleContents._cancelCount) {
        return undefined;
      }

      if (contentResource.request.state === RequestState.CANCELLED) {
        cancelPendingRequests(multipleContents, originalContentState);
        return undefined;
      }

      updatePendingRequests(multipleContents, -1);
      handleInnerContentFailed(multipleContents, index, error);
      return undefined;
    });
}

function createInnerContents(multipleContents) {
  const originalCancelCount = multipleContents._cancelCount;
  Promise.all(multipleContents._arrayFetchPromises)
    .then(function (arrayBuffers) {
      if (originalCancelCount < multipleContents._cancelCount) {
        return undefined;
      }

      return arrayBuffers.map(function (arrayBuffer, i) {
        if (!defined(arrayBuffer)) {
          // Content was not fetched. The error was handled in
          // the fetch promise
          return undefined;
        }

        try {
          return createInnerContent(multipleContents, arrayBuffer, i);
        } catch (error) {
          handleInnerContentFailed(multipleContents, i, error);
          return undefined;
        }
      });
    })
    .then(function (contents) {
      if (!defined(contents)) {
        // request was canceled. resolve the promise (Cesium3DTile will
        // detect that the the content was canceled), then discard the promise
        // so a new one can be created
        if (defined(multipleContents._contentsFetchedPromise)) {
          multipleContents._contentsFetchedPromise.resolve();
          multipleContents._contentsFetchedPromise = undefined;
        }
        return;
      }

      multipleContents._contents = contents.filter(defined);
      awaitReadyPromises(multipleContents);

      if (defined(multipleContents._contentsFetchedPromise)) {
        multipleContents._contentsFetchedPromise.resolve();
      }
    })
    .catch(function (error) {
      if (defined(multipleContents._contentsFetchedPromise)) {
        multipleContents._contentsFetchedPromise.reject(error);
      }
    });
}

function createInnerContent(multipleContents, arrayBuffer, index) {
  const preprocessed = preprocess3DTileContent(arrayBuffer);

  if (preprocessed.contentType === Cesium3DTileContentType.EXTERNAL_TILESET) {
    throw new RuntimeError(
      "External tilesets are disallowed inside multiple contents"
    );
  }

  multipleContents._disableSkipLevelOfDetail =
    multipleContents._disableSkipLevelOfDetail ||
    preprocessed.contentType === Cesium3DTileContentType.GEOMETRY ||
    preprocessed.contentType === Cesium3DTileContentType.VECTOR;

  const tileset = multipleContents._tileset;
  const resource = multipleContents._innerContentResources[index];
  const tile = multipleContents._tile;

  let content;
  const contentFactory = Cesium3DTileContentFactory[preprocessed.contentType];
  if (defined(preprocessed.binaryPayload)) {
    content = contentFactory(
      tileset,
      tile,
      resource,
      preprocessed.binaryPayload.buffer,
      0
    );
  } else {
    // JSON formats
    content = contentFactory(tileset, tile, resource, preprocessed.jsonPayload);
  }

  const contentHeader = multipleContents._innerContentHeaders[index];

  if (tile.hasImplicitContentMetadata) {
    const subtree = tile.implicitSubtree;
    const coordinates = tile.implicitCoordinates;
    content.metadata = subtree.getContentMetadataView(coordinates, index);
  } else if (!tile.hasImplicitContent) {
    content.metadata = findContentMetadata(tileset, contentHeader);
  }

  const groupMetadata = findGroupMetadata(tileset, contentHeader);
  if (defined(groupMetadata)) {
    content.group = new Cesium3DContentGroup({
      metadata: groupMetadata,
    });
  }
  return content;
}

function awaitReadyPromises(multipleContents) {
  const readyPromises = multipleContents._contents.map(function (content) {
    return content.readyPromise;
  });

  Promise.all(readyPromises)
    .then(function () {
      multipleContents._readyPromise.resolve(multipleContents);
    })
    .catch(function (error) {
      multipleContents._readyPromise.reject(error);
    });
}

function handleInnerContentFailed(multipleContents, index, error) {
  const tileset = multipleContents._tileset;
  const url = multipleContents._innerContentResources[index].url;
  const message = defined(error.message) ? error.message : error.toString();
  if (tileset.tileFailed.numberOfListeners > 0) {
    tileset.tileFailed.raiseEvent({
      url: url,
      message: message,
    });
  } else {
    console.log(`A content failed to load: ${url}`);
    console.log(`Error: ${message}`);
  }
}

/**
 * Cancel all requests for inner contents. This is called by the tile
 * when a tile goes out of view.
 *
 * @private
 */
Multiple3DTileContent.prototype.cancelRequests = function () {
  for (let i = 0; i < this._requests.length; i++) {
    const request = this._requests[i];
    if (defined(request)) {
      request.cancel();
    }
  }
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
 * always returns <code>false</code>.  Instead call <code>hasProperty</code> for a specific inner content
 * @private
 */
Multiple3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code>
 * always returns <code>undefined</code>.  Instead call <code>getFeature</code> for a specific inner content
 * @private
 */
Multiple3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Multiple3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].applyDebugSettings(enabled, color);
  }
};

Multiple3DTileContent.prototype.applyStyle = function (style) {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].applyStyle(style);
  }
};

Multiple3DTileContent.prototype.update = function (tileset, frameState) {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].update(tileset, frameState);
  }
};

Multiple3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Multiple3DTileContent.prototype.destroy = function () {
  const contents = this._contents;
  const length = contents.length;
  for (let i = 0; i < length; ++i) {
    contents[i].destroy();
  }
  return destroyObject(this);
};
