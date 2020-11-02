import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";
import GltfFeaturePropertyComponentType from "./GltfFeaturePropertyComponentType.js";
import when from "../ThirdParty/when.js";
import GltfFeaturePropertyElementType from "./GltfFeaturePropertyElementType.js";

/**
 * A feature table property.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {GltfFeatureTable} options.featureTable The feature table.
 * @param {String} options.id The ID of the property.
 * @param {Object} options.property The feature property JSON object from the glTF.
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
  var featureTable = options.featureTable;
  var id = options.id;
  var property = options.property;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var that;
  var promises = [];

  var propertyClass = featureTable.featureClass.properties[id];
  var componentType = defaultValue(
    propertyClass.componentType,
    GltfFeaturePropertyComponentType.UINT8
  );
  var componentsPerElement = propertyClass.componentsPerElement;
  var elementCount = featureTable.elementCount;

  var componentsCount = elementCount * componentsPerElement;
  var componentDatatype = GltfFeaturePropertyComponentType.getComponentDatatype(
    componentType
  );

  promises.push(
    loadBufferView(
      this,
      cache,
      gltfContainer,
      property.bufferView,
      componentsCount,
      componentDatatype
    ).then(function (results) {
      that._bufferViewTypedArray = results.typedArray;
      that._bufferViewCacheItem = results.cacheItem;
    })
  );

  if (defined(property.offsetsBufferView)) {
    var offsetsComponentDatatype = GltfFeaturePropertyComponentType.getComponentDatatype(
      defaultValue(
        property.offsetsComponentType,
        GltfFeaturePropertyComponentType.UINT32
      )
    );
    promises.push(
      loadBufferView(
        this,
        cache,
        gltfContainer,
        property.offsetsBufferView,
        elementCount + 1,
        offsetsComponentDatatype
      ).then(function (results) {
        that._offsetsBufferViewTypedArray = results.typedArray;
        that._offsetsBufferViewCacheItem = results.cacheItem;
      })
    );
  }

  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  this._featureTable = featureTable;
  this._propertyClass = propertyClass;
  this._bufferViewTypedArray = undefined;
  this._bufferViewCacheItem = undefined;
  this._offsetsBufferViewTypedArray = undefined;
  this._offsetsBufferViewCacheItem = undefined;
  this._cache = cache;
  this._id = id;
  this._elementByteLength = property.elementByteLength;
  this._extras = clone(property.extras, true); // Clone so that this object doesn't hold on to a reference to the gltf JSON
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureTableProperty.prototype, {
  /**
   * The property class.
   *
   * @memberof GltfFeatureTableProperty.prototype
   * @type {GltfFeatureProperty}
   * @readonly
   * @private
   */
  propertyClass: {
    get: function () {
      return this._propertyClass;
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
  componentsLength,
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
      var typedArray = GltfFeatureMetadataUtility.getTypedArrayForBufferView(
        bufferView,
        componentsLength,
        componentDatatype,
        bufferData
      );
      return {
        typedArray: typedArray,
        cacheItem: cacheItem,
      };
    });
}

GltfFeatureTableProperty.prototype.getJsonValues = function () {
  var featureTable = this._featureTable;
  var elementCount = featureTable.elementCount;
  var offsetsBufferViewTypedArray = this._offsetsBufferViewTypedArray;
  var bufferViewTypedArray = this._bufferViewTypedArray;

  var propertyClass = this._propertyClass;
  var elementType = propertyClass.elementType;
  var componentsPerElement = propertyClass.componentsPerElement;

  var i;
  var j;
  var innerArray;
  var array = new Array(elementCount);

  if (elementType === GltfFeaturePropertyElementType.STRING) {
    for (i = 0; i < elementCount; ++i) {
      var startByte = offsetsBufferViewTypedArray[i];
      var endByte = offsetsBufferViewTypedArray[i + 1];
      array[i] = getStringFromTypedArray(
        bufferViewTypedArray,
        startByte,
        endByte - startByte
      );
    }
  } else if (elementType === GltfFeaturePropertyElementType.SCALAR) {
    for (i = 0; i < elementCount; ++i) {
      array[i] = bufferViewTypedArray[i];
    }
  } else if (elementType === GltfFeaturePropertyElementType.ARRAY) {
    for (i = 0; i < elementCount; ++i) {
      innerArray = new Array(componentsPerElement);
      array[i] = innerArray;
      for (j = 0; j < componentsPerElement; ++j) {
        innerArray[j] = bufferViewTypedArray[i * componentsPerElement + j];
      }
    }
  } else if (
    elementType === GltfFeaturePropertyElementType.VARIABLE_SIZE_ARRAY
  ) {
    var componentIndex = 0;
    for (i = 0; i < elementCount; ++i) {
      var start = offsetsBufferViewTypedArray[i];
      var end = offsetsBufferViewTypedArray[i + 1];
      var componentCount = end - start;
      innerArray = new Array(componentCount);
      array[i] = innerArray;
      for (j = 0; j < componentCount; ++j) {
        innerArray[j] = bufferViewTypedArray[componentIndex + j];
      }
      componentIndex += componentCount;
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
  var bufferViewCacheItem = this._bufferVIewCacheItem;
  var offsetsBufferViewCacheItem = this._offsetsBufferViewCacheItem;

  if (defined(bufferViewCacheItem)) {
    cache.releaseCacheItem(bufferViewCacheItem);
  }

  if (defined(offsetsBufferViewCacheItem)) {
    cache.releaseCacheItem(offsetsBufferViewCacheItem);
  }

  return destroyObject(this);
};

export default GltfFeatureTableProperty;
