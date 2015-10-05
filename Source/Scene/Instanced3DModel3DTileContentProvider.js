/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/Matrix4',
        '../Core/Quaternion',
        './Cesium3DTileBatchData',
        './Cesium3DTileContentState',
        './ModelInstanceCollection',
        '../ThirdParty/when'
    ], function(
        Cartesian3,
        destroyObject,
        DeveloperError,
        getStringFromTypedArray,
        loadArrayBuffer,
        Matrix4,
        Quaternion,
        Cesium3DTileBatchData,
        Cesium3DTileContentState,
        ModelInstanceCollection,
        when) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Instanced3DModel3DTileContentProvider = function(tileset, url, contentHeader) {
        this._modelInstanceCollection = undefined;
        this._url = url;
        this._tileset = tileset;
        this._batchData = undefined;

        /**
         * @readonly
         */
        this.state = Cesium3DTileContentState.UNLOADED;

        /**
         * @type {Promise}
         */
        this.processingPromise = when.defer();

        /**
         * @type {Promise}
         */
        this.readyPromise = when.defer();
    };

    Instanced3DModel3DTileContentProvider.prototype.getModel = function(index) {
        return this._modelInstanceCollection.getModel(index);
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat64 = Float64Array.BYTES_PER_ELEMENT;
    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;

    // Each vertex has a position, quaternion, and batchId
    // Coordinates are in double precision, batchId is a short
    var instanceSizeInBytes = sizeOfFloat64 * 7 + sizeOfUint16;

    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#requestContent
     */
    Instanced3DModel3DTileContentProvider.prototype.request = function() {
        var that = this;

        this.state = Cesium3DTileContentState.LOADING;

        function failRequest(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        }

        loadArrayBuffer(this._url).then(function(arrayBuffer) {
            var uint8Array = new Uint8Array(arrayBuffer);
            var magic = getStringFromTypedArray(getSubarray(uint8Array, 0, Math.min(4, uint8Array.byteLength)));
            if (magic !== 'i3dm') {
                throw new DeveloperError('Invalid Instanced 3D Model. Expected magic=i3dm. Read magic=' + magic);
            }

            var view = new DataView(arrayBuffer);
            var byteOffset = 0;

            byteOffset += sizeOfUint32;  // Skip magic number

            //>>includeStart('debug', pragmas.debug);
            var version = view.getUint32(byteOffset, true);
            if (version !== 1) {
                throw new DeveloperError('Only Instanced 3D Model version 1 is supported. Version ' + version + ' is not.');
            }
            //>>includeEnd('debug');
            byteOffset += sizeOfUint32;

            var batchTableLength = view.getUint32(byteOffset, true);
            byteOffset += sizeOfUint32;

            var gltfLength = view.getUint32(byteOffset, true);
            byteOffset += sizeOfUint32;

            var gltfFormat = view.getUint32(byteOffset, true);
            byteOffset += sizeOfUint32;

            var instancesLength = view.getUint32(byteOffset, true);
            byteOffset += sizeOfUint32;

            var batchData = new Cesium3DTileBatchData(that, instancesLength);
            that._batchData = batchData;
            if (batchTableLength > 0) {
                var batchTableString = getStringFromTypedArray(getSubarray(uint8Array, byteOffset, batchTableLength));
                batchData._batchTable = JSON.parse(batchTableString);
                byteOffset += batchTableLength;
            }

            var gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfLength);
            byteOffset += gltfLength;

            var instancesDataSizeInBytes = instancesLength * instanceSizeInBytes;
            var instancesView = new DataView(arrayBuffer, byteOffset, instancesDataSizeInBytes);
            byteOffset += instancesDataSizeInBytes;

            // TODO : what is the model's cache key if it doesn't have a url? Url of the tile?
            // Create model instance collection
            var collectionOptions = {
                instances : [],
                batchData : batchData,
                boundingVolume : undefined, // TODO : what is the best way to get the tile's bounding volume?
                pickPrimitive : that._tileset,
                cull : false,
                url : undefined,
                headers : undefined,
                gltf : undefined,
                basePath : undefined
            };

            //>>includeStart('debug', pragmas.debug);
            if((gltfFormat !== 0) && (gltfFormat !== 1)) {
                throw new DeveloperError('glTF format must be 0 or 1.');
            }
            //>>includeEnd('debug');

            if (gltfFormat === 0) {
                collectionOptions.url = getStringFromTypedArray(gltfView);
                // TODO : how to get the correct headers
            } else {
                collectionOptions.gltf = gltfView;
                collectionOptions.basePath = that._url;
            }

            var position = new Cartesian3();
            var quaternion = new Quaternion();
            var scale = new Cartesian3(1.0, 1.0, 1.0);

            var instances = collectionOptions.instances;
            byteOffset = 0;

            for (var i = 0; i < instancesLength; ++i) {
                // Get position
                position.x = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;
                position.y = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;
                position.z = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;

                // Get rotation quaternion
                quaternion.x = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;
                quaternion.y = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;
                quaternion.z = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;
                quaternion.w = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;

                // Get batchId
                var batchId = instancesView.getUint16(byteOffset, true);
                byteOffset += sizeOfUint16;

                var modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(position, quaternion, scale);
                instances.push({
                    modelMatrix : modelMatrix,
                    batchId : batchId
                });
            }

            var modelInstanceCollection = new ModelInstanceCollection(collectionOptions);
            that._modelInstanceCollection = modelInstanceCollection;
            that.state = Cesium3DTileContentState.PROCESSING;
            that.processingPromise.resolve(that);

            when(modelInstanceCollection.readyPromise).then(function(modelInstanceCollection) {
                that.state = Cesium3DTileContentState.READY;
                that.readyPromise.resolve(that);
            }).otherwise(failRequest);
        }).otherwise(failRequest);
    };

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#update
     */
    Instanced3DModel3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        this._modelInstanceCollection.update(context, frameState, commandList);
    };

    /**
     * DOC_TBA
     */
    Instanced3DModel3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    Instanced3DModel3DTileContentProvider.prototype.destroy = function() {
        this._modelInstanceCollection = this._modelInstanceCollection && this._modelInstanceCollection.destroy();

        return destroyObject(this);
    };
    return Instanced3DModel3DTileContentProvider;
});
