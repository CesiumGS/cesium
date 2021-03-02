//import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Request from "../Core/Request.js";
import RequestScheduler from "../Core/RequestScheduler.js";
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

  this._innerContentHeaders = extensionJson.content;

  var contentCount = this._innerContentHeaders.length;
  this._arrayFetchPromises = new Array(contentCount);
  this._innerContentResources = new Array(contentCount);

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
 * @return {Number} The number of contn
 */
Multiple3DTileContent.prototype.requestInnerContents = function () {
  var requestBacklog = 0;
  for (var i = 0; i < this._innerContentHeaders.length; i++) {
    if (defined(this._arrayFetchPromises[i])) {
      continue;
    }

    var promise = requestInnerContent(this, i);
    if (!defined(promise)) {
      requestBacklog++;
    }
    this._arrayFetchPromises[i] = promise;
  }

  if (requestBacklog === 0) {
    this._contentsFetchedPromise = createInnerContents(this);
  }

  return requestBacklog;
};

function requestInnerContent(multipleContent, index) {
  var innerContentHeader = multipleContent._innerContentHeaders[index];

  var tile = multipleContent.tile;
  var contentUri = innerContentHeader.uri;
  var contentResource = multipleContent._tilesetResource.getDerivedResource({
    url: contentUri,
    preserveQueryParameters: true,
  });
  var serverKey = RequestScheduler.getServerKey(
    contentResource.getUrlComponent()
  );

  var expired = tile.contentExpired;
  if (expired) {
    // Append a query parameter of the tile expiration date to prevent caching
    contentResource.setQueryParameters({
      expired: tile.expireDate.toString(),
    });
  }

  var request = new Request({
    throttle: true,
    throttleByServer: true,
    type: RequestType.TILES3D,
    priorityFunction: function () {
      return multipleContent._tile.priority;
    },
    serverKey: serverKey,
  });
  contentResource.request = request;

  // Save the resource for later since it's used to construct
  // Cesium3DTileContent objects.
  multipleContent._innerContentResources[index] = contentResource;

  return contentResource.fetchArrayBuffer().otherwise(function (error) {
    handleInnerContentFailed(multipleContent, error);
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
          handleInnerContentFailed(multipleContent, error);
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

function handleInnerContentFailed(multipleContent, error) {
  // TODO: What's the best way to report this as an even to the tile
  // and to the tileset? here are some ideas:
  //
  // 1. A callback passed into the constructor?
  // 2. Access multipleContent._tile directly to raise events?
  // 3. Have a multipleContent.innerContentFailed event and have the tile
  //  subscribe to that?
  console.log(error);
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
