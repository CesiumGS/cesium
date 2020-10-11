// import Check from "../Core/Check.js";
// import clone from "../Core/clone.js";
// import ComponentDatatype from "../Core/ComponentDatatype.js";
// import defaultValue from "../Core/defaultValue.js";
// import defined from "../Core/defined.js";
// import destroyObject from "../Core/destroyObject.js";
// import getBinaryAccessor from "./getBinaryAccessor.js";
// import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";
// import when from "../ThirdParty/when.js";
// import RuntimeError from "../Core/RuntimeError.js";
// import GltfFeaturePropertyComponentType from "./GltfFeaturePropertyComponentType.js";

// /**
//  * A feature table property.
//  *
//  * @param {Object} options Object with the following properties:
//  * @param {GltfContainer} options.gltfContainer The glTF container.
//  * @param {GltfFeatureTable} options.featureTable The feature table.
//  * @param {String} options.id The ID of the property.
//  * @param {Object} options.property The feature property JSON object from the glTF.
//  * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
//  *
//  * @alias GltfFeatureTableProperty
//  * @constructor
//  *
//  * @private
//  */
// function GltfFeatureTableProperty(options) {
//   options = defaultValue(options, defaultValue.EMPTY_OBJECT);
//   var gltfContainer = options.gltfContainer;
//   var featureTable = options.featureTable;
//   var id = options.id;
//   var property = options.property;
//   var cache = options.cache;

//   //>>includeStart('debug', pragmas.debug);
//   Check.typeOf.object("options.gltfContainer", gltfContainer);
//   Check.typeOf.object("options.featureTable", featureTable);
//   Check.typeOf.string("options.id", id);
//   Check.typeOf.object("options.property", property);
//   Check.typeOf.object("options.cache", cache);
//   //>>includeEnd('debug');

//   var gltf = gltfContainer.gltf;
//   var bufferView = gltf.bufferViews[featureTable.bufferView];
//   var bufferId = bufferView.buffer;
//   var buffer = gltf.buffers[bufferId];

//   var offsetsBufferView = gltf.bufferViews[featureTable.offsetsBufferView];
//   var offsetsBufferId = offsetsBufferView.buffer;
//   var offsetsBuffer = gltf.buffers[offsetsBufferId];

//   var readyPromise;
//   var that = this;
//   readyPromise = cache
//     .getBuffer({
//       gltfContainer: gltfContainer,
//       buffer: buffer,
//       bufferId: bufferId,
//     })
//     .then(function (cacheItem) {
//       if (that.isDestroyed()) {
//         // The feature table property was destroyed before the request came back
//         cache.releaseCacheItem(cacheItem);
//         return;
//       }
//       that._cacheItem = cacheItem;
//       var bufferData = cacheItem.contents;
//       if (defined(bufferData)) {
//         that._typedArray = GltfFeatureMetadataUtility.getTypedArrayForBufferView(
//           gltf,
//           bufferView,
//           bufferData
//         );
//       } else {
//         throw new RuntimeError("No buffer data available for property: " + id);
//       }
//       return that;
//     });

//   this._bufferViewTypedArray = undefined;
//   this._offsetsBufferViewTypedArray = undefined;
//   this._cache = cache;
//   this._bufferCacheItem = undefined;
//   this._offsetsBufferCacheItem = undefined;
//   this._id = id;
//   this._elementByteLength = property.elementByteLength;
//   this._offsetsComponentType =
//     GltfFeaturePropertyComponentType[property.offsetsComponentType];
//   this._extras = clone(property.extras, true); // Clone so that this object doesn't hold on to a reference to the gltf JSON
//   this._readyPromise = readyPromise;
// }

// /**
//  * Returns true if this object was destroyed; otherwise, false.
//  * <br /><br />
//  * If this object was destroyed, it should not be used; calling any function other than
//  * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
//  *
//  * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
//  *
//  * @see GltfFeatureTableProperty#destroy
//  *
//  * @private
//  */
// GltfFeatureTableProperty.prototype.isDestroyed = function () {
//   return false;
// };

// /**
//  * Destroys the object. Destroying an object allows for deterministic release of
//  * resources, instead of relying on the garbage collector to destroy this object.
//  * <br /><br />
//  * Once an object is destroyed, it should not be used; calling any function other than
//  * <code>isDestroyed</code> will result in a {@link DeveloperError} exception. Therefore,
//  * assign the return value (<code>undefined</code>) to the object as done in the example.
//  *
//  * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
//  *
//  * @see GltfFeatureTableProperty#isDestroyed
//  *
//  * @private
//  */
// GltfFeatureTableProperty.prototype.destroy = function () {
//   var cache = this._cache;
//   var bufferCacheItem = this._bufferCacheItem;
//   var offsetsBufferCacheItem = this._offsetsBufferCacheItem;

//   if (defined(bufferCacheItem)) {
//     cache.releaseCacheItem(bufferCacheItem);
//   }

//   if (defined(offsetsBufferCacheItem)) {
//     cache.releaseCacheItem(offsetsBufferCacheItem);
//   }

//   return destroyObject(this);
// };

// export default GltfFeatureTableProperty;
