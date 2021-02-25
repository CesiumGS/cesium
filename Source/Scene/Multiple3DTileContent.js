import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getMagic from "../Core/getMagic.js";
import RequestType from "../Core/RequestType.js";
import RequestScheduler from "../Core/RequestScheduler.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

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
 * @private
 */
export default function Multiple3DTileContent(
  tileset,
  tile,
  baseResource,
  extensionJson,
  factory
) {
  this._tileset = tileset;
  this._tile = tile;
  this._baseResource = baseResource;
  this._contents = [];
  this._readyPromise = when.defer();

  initialize(this, extensionJson, factory);
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
});

function initialize(content, extensionJson, factory) {
  var innerContentJsons = extensionJson.content;
  // TODO: what if some contents were not scheduled?
  var innerContentReadyPromises = innerContentJsons.map(function (json) {
    // TODO: the fetch inner contents should be a seperate promise
    return requestInnerContent(content, json).then(function (innerContent) {
      if (!defined(innerContent)) {
        // TODO: request was not scheduled... what to do here?
        return when.resolve();
      }

      content._contents.push(innerContent);
      return innerContent.readyPromise;
    });
    // TODO: how do failures here impact statistics in Cesium3DTile?
  });

  when
    .all(innerContentReadyPromises)
    .then(function () {
      content._readyPromise.resolve(content);
    })
    .otherwise(function (error) {
      content._readyPromise.reject(error);
    });
}

/*
 * TODO: create a function like this, and another one to create the tile
function prepocessContent(arrayBuffer) {
  //1. create Uint8Array
  //2. Check the magic
  //3. if it's one of the binary formats (b3dm, vctr, subt, etc.), return
  //{
  //  contentType: Cesium3DTileContentType.B3DM,
  //  binary: uint8Array
  //}
  //4. otherwise, assume JSON, so parse the JSON
  //5. check if it's external tileset or glTF
  //if it's valid, return:
  //{
  //  contentType: Cesium3DTileContentType.EXTERNAL
  //  json: parsedJson
  //}
}
*/

function requestInnerContent(multipleContent, innerContentJson, factory) {
  var contentUri = innerContentJson.uri;
  // TODO: preserve query parameters for this
  var contentResource = multipleContent._baseResource.getDerivedResource({
    url: contentUri,
  });
  var serverKey = RequestScheduler.getServerKey(
    contentResource.getUrlComponent()
  );

  // TODO: set expiration query parameters?

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

  var promise = contentResource.fetchArrayBuffer();

  if (!defined(promise)) {
    //TODO: what to do here if the request wasn't prioritized?
    return when.resolve(undefined);
  }

  return promise.then(function (arrayBuffer) {
    var tile = multipleContent._tile;
    var tileset = multipleContent._tileset;
    var innerContent;

    // TODO: if the tile was destroyed before the buffer was loaded, reject
    // the promise, or is something else needed?
    var uint8Array = new Uint8Array(arrayBuffer);

    var magic = getMagic(uint8Array);
    var contentIdentifer = magic;
    if (magic === "glTF") {
      contentIdentifer = "glb";
    }

    var contentFactory = factory[contentIdentifer];

    // TODO: for vector and geom should the tileset disable skip LOD?
    if (defined(contentFactory)) {
      innerContent = contentFactory(
        tileset,
        tile,
        contentResource,
        arrayBuffer,
        0
      );
    } else {
      var json = getJsonContent(arrayBuffer, 0);
      if (defined(json.geometricError)) {
        // Most likely a tileset JSON
        throw new RuntimeError(
          "External tilesets are disallowed inside the 3DTILES_multiple_contents extension"
        );
      } else if (defined(json.asset)) {
        // Most likely a glTF. Tileset JSON also has an "asset" property
        // so this check needs to happen second
        innerContent = contentFactory.gltf(
          tileset,
          tile,
          contentResource,
          json
        );
      }
    }

    if (!defined(innerContent)) {
      throw new RuntimeError("Invalid tile content.");
    }

    // TODO: Should tile.hasImplicitContent be updated?
    // TODO: Should tile.expireDate be updated?

    return innerContent;
  });
}

// TODO: This was copied from Cesiu3DTile. Refactor!
function getJsonContent(arrayBuffer, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);
  var uint8Array = new Uint8Array(arrayBuffer);
  var json;

  try {
    json = getJsonFromTypedArray(uint8Array);
  } catch (error) {
    throw new RuntimeError("Invalid tile content.");
  }

  return json;
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
