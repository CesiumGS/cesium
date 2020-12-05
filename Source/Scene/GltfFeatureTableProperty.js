import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";
import GltfFeaturePropertyComponentType from "./GltfFeaturePropertyComponentType.js";
import when from "../ThirdParty/when.js";
import GltfFeaturePropertyType from "./GltfFeaturePropertyType.js";

/**
 * A feature table property.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Number} options.elementCount The element count.
 * @param {String} options.id The ID of the property.
 * @param {Object} options.property The feature property JSON object from the glTF.
 * @param {GltfFeatureProperty} options.propertyDefinition The feature property definition.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTableProperty
 * @constructor
 *
 * @private
 */
function GltfFeatureTableProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var elementCount = options.elementCount;
  var id = options.id;
  var property = options.property;
  var propertyDefinition = options.propertyDefinition;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.number("options.elementCount", elementCount);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.propertyDefinition", propertyDefinition);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var type = propertyDefinition.type;
  var componentType = defaultValue(propertyDefinition.componentType, type);
  var componentCount = propertyDefinition.componentCount;
  var numberOfComponents = elementCount * componentCount;
  var componentDatatype = GltfFeaturePropertyComponentType.getComponentDatatype(
    componentType
  );

  this._elementCount = elementCount;
  this._propertyDefinition = propertyDefinition;
  this._bufferViewData = undefined;
  this._bufferViewTypedArray = undefined;
  this._bufferViewCacheItem = undefined;
  this._offsetBufferViewTypedArrays = [];
  this._offsetBufferViewCacheItems = [];
  this._cache = cache;
  this._id = id;
  this._extras = clone(property.extras, true); // Clone so that this object doesn't hold on to a reference to the glTF JSON

  var that = this;
  var promises = [];

  promises.push(
    loadBufferView(
      this,
      cache,
      gltfContainer,
      property.bufferView,
      numberOfComponents,
      componentDatatype
    ).then(function (results) {
      that._bufferViewData = results.bufferData;
      that._bufferViewTypedArray = results.typedArray;
      that._bufferViewCacheItem = results.cacheItem;
    })
  );

  if (defined(property.offsetBufferViews)) {
    // TODO: UINT64 and INT64 not supported unless BigUint64Array and BigInt64Array are used
    var offsetComponentDatatype = GltfFeaturePropertyComponentType.getComponentDatatype(
      defaultValue(
        property.offsetComponentType,
        GltfFeaturePropertyComponentType.UINT32
      )
    );
    var offsetBufferLength = elementCount + 1;
    var offsetBufferViewsPromise = loadBufferView(
      this,
      cache,
      gltfContainer,
      property.offsetBufferViews[0],
      offsetBufferLength,
      offsetComponentDatatype
    ).then(function (results) {
      that._offsetBufferViewTypedArrays.push(results.typedArray);
      that._offsetBufferViewCacheItems.push(results.cacheItem);
      return results.typedArray[offsetBufferLength - 1] + 1;
    });

    if (property.offsetBufferViews.length > 1) {
      offsetBufferViewsPromise = offsetBufferViewsPromise.then(function (
        nextOffsetBufferLength
      ) {
        return loadBufferView(
          that,
          cache,
          gltfContainer,
          property.offsetBufferViews[1],
          nextOffsetBufferLength,
          offsetComponentDatatype
        ).then(function (results) {
          that._offsetBufferViewTypedArrays.push(results.typedArray);
          that._offsetBufferViewCacheItems.push(results.cacheItem);
        });
      });
    }
    promises.push(offsetBufferViewsPromise);
  }

  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureTableProperty.prototype, {
  /**
   * The property definition from the class.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {GltfFeatureProperty}
   * @readonly
   * @private
   */
  propertyDefinition: {
    get: function () {
      return this._propertyDefinition;
    },
  },

  /**
   * The ID of the property.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * Extras in the property JSON object from the glTF.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Promise that resolves when the property is ready.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {Promise.<GltfFeatureTableProperty>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

function loadBufferView(
  featureTableProperty,
  cache,
  gltfContainer,
  bufferViewId,
  numberOfComponents,
  componentDatatype
) {
  var gltf = gltfContainer.gltf;
  var bufferView = gltf.bufferViews[bufferViewId];
  var bufferId = bufferView.buffer;
  var buffer = gltf.buffers[bufferId];

  return cache
    .getBuffer({
      gltfContainer: gltfContainer,
      buffer: buffer,
      bufferId: bufferId,
    })
    .then(function (cacheItem) {
      if (featureTableProperty.isDestroyed()) {
        // The feature table property was destroyed before the request came back
        cache.releaseCacheItem(cacheItem);
        return;
      }
      var bufferData = cacheItem.contents;
      var bufferViewData = GltfFeatureMetadataUtility.getBufferViewData(
        bufferView,
        bufferData
      );
      var typedArray;
      if (defined(componentDatatype)) {
        typedArray = GltfFeatureMetadataUtility.getTypedArrayForBufferView(
          bufferView,
          numberOfComponents,
          componentDatatype,
          bufferData
        );
      }
      return {
        bufferData: bufferViewData,
        typedArray: typedArray,
        cacheItem: cacheItem,
      };
    });
}

GltfFeatureTableProperty.prototype.getJsonValues = function () {
  var elementCount = this._elementCount;
  var offsetBufferViewTypedArrays = this._offsetBufferViewTypedArrays;
  var bufferViewData = this._bufferViewData;

  var propertyDefinition = this._propertyDefinition;
  var type = propertyDefinition.type;

  var array = new Array(elementCount);

  // TODO: need to support more than just strings
  if (type === GltfFeaturePropertyType.STRING) {
    var offsetBufferViewTypedArray = offsetBufferViewTypedArrays[0];
    for (var i = 0; i < elementCount; ++i) {
      var startByte = offsetBufferViewTypedArray[i];
      var endByte = offsetBufferViewTypedArray[i + 1];
      array[i] = getStringFromTypedArray(
        bufferViewData,
        startByte,
        endByte - startByte
      );
    }
  }

  return array;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfFeatureTableProperty#destroy
 *
 * @private
 */
GltfFeatureTableProperty.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the object. Destroying an object allows for deterministic release of
 * resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception. Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see GltfFeatureTableProperty#isDestroyed
 *
 * @private
 */
GltfFeatureTableProperty.prototype.destroy = function () {
  var cache = this._cache;
  var bufferViewCacheItem = this._bufferViewCacheItem;
  var offsetBufferViewCacheItems = this._offsetBufferViewCacheItems;

  if (defined(bufferViewCacheItem)) {
    cache.releaseCacheItem(bufferViewCacheItem);
  }

  for (var i = 0; i < offsetBufferViewCacheItems.length; i++) {
    cache.releaseCacheItem(offsetBufferViewCacheItems[i]);
  }

  return destroyObject(this);
};

export default GltfFeatureTableProperty;
