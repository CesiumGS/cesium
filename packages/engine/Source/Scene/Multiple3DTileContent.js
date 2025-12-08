import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import {
  ContentHandle,
  LoggingContentListener,
  LoggingRequestListener,
} from "./Dynamic3DTileContent.js";

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
 * @param {object} contentsJson Either the tile JSON containing the contents array (3D Tiles 1.1), or <code>3DTILES_multiple_contents</code> extension JSON
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Multiple3DTileContent(tileset, tile, tilesetResource, contentsJson) {
  this._tileset = tileset;
  this._tile = tile;

  // An older version of 3DTILES_multiple_contents used "content" instead of "contents"
  const contentHeaders = defined(contentsJson.contents)
    ? contentsJson.contents
    : contentsJson.content;

  this._innerContentHeaders = contentHeaders;
  this._contentLoadedAndReadyCount = 0;

  /**
   * A mapping from URL strings to ContentHandle objects.
   *
   * This is initialized with all the content definitions that
   * are found in the 'dynamicContents' array. It will create
   * one ContentHandle for each content. This map will never
   * be modified after it was created.
   *
   * @type {Map<string, ContentHandle>}
   * @readonly
   */
  this._contentHandles = this._createContentHandles(tilesetResource);

  this._contents = [];

  this._ready = false;
}

/**
 * Create the mapping from URL strings to ContentHandle objects.
 *
 * This is called once from the constructor. The content handles
 * will be used for tracking the process of requesting and
 * creating the content objects.
 *
 * @param {Resource} baseResource The base resource (from the tileset)
 * @returns {Map} The content handles
 */
Multiple3DTileContent.prototype._createContentHandles = function (
  baseResource,
) {
  const dynamicContents = this._innerContentHeaders;

  const contentHandles = new Map();
  for (let i = 0; i < dynamicContents.length; i++) {
    const contentHeader = dynamicContents[i];
    const contentHandle = new ContentHandle(
      this.tile,
      baseResource,
      contentHeader,
    );
    this._attachTilesetStatisticsTracker(contentHandle);

    const uri = contentHeader.uri;
    contentHandles.set(uri, contentHandle);
  }
  return contentHandles;
};

const DYNAMIC_MULTIPLE_CONTENT_LOGGING = true;

/**
 * Attach a listener to the given content handle that will update
 * the tileset statistics based on the request state.
 *
 * @param {ContentHandle} contentHandle The content handle
 */
Multiple3DTileContent.prototype._attachTilesetStatisticsTracker = function (
  contentHandle,
) {
  if (DYNAMIC_MULTIPLE_CONTENT_LOGGING) {
    contentHandle.addRequestListener(new LoggingRequestListener());
    contentHandle.addContentListener(new LoggingContentListener());
  }

  const tileset = this._tile.tileset;
  contentHandle.addRequestListener({
    requestAttempted(request) {
      tileset.statistics.numberOfAttemptedRequests++;
    },
    requestStarted(request) {
      tileset.statistics.numberOfPendingRequests++;
    },
    requestCancelled(request) {
      tileset.statistics.numberOfPendingRequests--;
    },
    requestCompleted(request) {
      tileset.statistics.numberOfPendingRequests--;
    },
    requestFailed(request) {
      tileset.statistics.numberOfPendingRequests--;
    },
  });

  const that = this;
  contentHandle.addContentListener({
    contentLoadedAndReady(content) {
      if (DYNAMIC_MULTIPLE_CONTENT_LOGGING) {
        console.log(
          "Multiple3DTileContent content handle listener contentLoadedAndReady - update statistics for   loaded content: ",
          content,
        );
      }
      tileset.statistics.incrementLoadCounts(content);
      that._contentLoadedAndReadyCount++;
      if (
        that._contentLoadedAndReadyCount === that._innerContentHeaders.length
      ) {
        console.log("All loaded, setting ready");
        that._ready = true;
        // XXX_DYNAMIC_MULTIPLE Should not be done here. All uses of _contents should
        // use the content handles!
        for (const ch of that._contentHandles.values()) {
          that._contents.push(ch.tryGetContent());
        }
      }
    },
    contentUnloaded(content) {
      if (DYNAMIC_MULTIPLE_CONTENT_LOGGING) {
        console.log(
          "Multiple3DTileContent content handle listener contentUnloaded       - update statistics for unloaded content: ",
          content,
        );
      }
      tileset.statistics.decrementLoadCounts(content);
    },
  });
};

Object.defineProperties(Multiple3DTileContent.prototype, {
  /**
   * Part of the {@link Cesium3DTileContent} interface.  <code>Multiple3DTileContent</code> checks if any of the inner contents have dirty featurePropertiesDirty.
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {boolean}
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
   *
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   *
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
   *
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   *
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
   *
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   *
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
   *
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   *
   * @private
   */
  geometryByteLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Part of the {@link Cesium3DTileContent} interface. <code>Multiple3DTileContent</code>
   * always returns <code>0</code>.  Instead call <code>texturesByteLength</code> for a specific inner content.
   *
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   *
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
   *
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   *
   * @private
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

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   * @memberof Multiple3DTileContent.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  ready: {
    get: function () {
      if (!this._contentsCreated) {
        return false;
      }

      return this._ready;
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
   * @type {string}
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
        "Multiple3DTileContent cannot have group metadata",
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
   * @type {string[]}
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
});

/**
 * Cancel all requests for inner contents. This is called by the tile
 * when a tile goes out of view.
 *
 * @private
 */
Multiple3DTileContent.prototype.cancelRequests = function () {
  // XXX_DYNAMIC_MULTIPLE TODO
  /*
  for (let i = 0; i < this._requests.length; i++) {
    const request = this._requests[i];
    if (defined(request)) {
      request.cancel();
    }
  }
  */
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
  // Call update for all contents
  for (const contentHandle of this._contentHandles.values()) {
    // XXX_DYNAMIC_MULTIPLE Trigger request...
    contentHandle.tryGetContent();
    contentHandle.updateContent(tileset, frameState);
  }
};

/**
 * Find an intersection between a ray and the tile content surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @private
 */
Multiple3DTileContent.prototype.pick = function (ray, frameState, result) {
  if (!this._ready) {
    return undefined;
  }

  let intersection;
  let minDistance = Number.POSITIVE_INFINITY;
  const contents = this._contents;
  const length = contents.length;

  for (let i = 0; i < length; ++i) {
    const candidate = contents[i].pick(ray, frameState, result);

    if (!defined(candidate)) {
      continue;
    }

    const distance = Cartesian3.distance(ray.origin, candidate);
    if (distance < minDistance) {
      intersection = candidate;
      minDistance = distance;
    }
  }

  if (!defined(intersection)) {
    return undefined;
  }

  return result;
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

export default Multiple3DTileContent;
