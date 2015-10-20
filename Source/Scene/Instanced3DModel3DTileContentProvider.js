/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/Matrix4',
        '../Core/Transforms',
        './Cesium3DTileBatchTable',
        './Cesium3DTileContentState',
        './ModelInstanceCollection',
        '../ThirdParty/Uri',
        '../ThirdParty/when'
    ], function(
        Cartesian3,
        defaultValue,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        getStringFromTypedArray,
        loadArrayBuffer,
        Matrix4,
        Transforms,
        Cesium3DTileBatchTable,
        Cesium3DTileContentState,
        ModelInstanceCollection,
        Uri,
        when) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Instanced3DModel3DTileContentProvider = function(tileset, tile, url, contentHeader) {
        this._modelInstanceCollection = undefined;
        this._url = url;
        this._tileset = tileset;
        this._batchTable = undefined;
        this._boundingVolume = defaultValue(tile._contentsOrientedBoundingBox, tile._orientedBoundingBox);

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

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat64 = Float64Array.BYTES_PER_ELEMENT;

    // Each vertex has a longitude, latitude, and batchId
    // Coordinates are in double precision, batchId is a short
    var instanceSizeInBytes = sizeOfFloat64 * 2 + sizeOfUint16;

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

            var batchTable = new Cesium3DTileBatchTable(that, instancesLength);
            that._batchTable = batchTable;
            if (batchTableLength > 0) {
                var batchTableString = getStringFromTypedArray(getSubarray(uint8Array, byteOffset, batchTableLength));
                batchTable._batchTable = JSON.parse(batchTableString);
                byteOffset += batchTableLength;
            }

            var gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfLength);
            byteOffset += gltfLength;

            var instancesDataSizeInBytes = instancesLength * instanceSizeInBytes;
            var instancesView = new DataView(arrayBuffer, byteOffset, instancesDataSizeInBytes);
            byteOffset += instancesDataSizeInBytes;

            // Create model instance collection
            var collectionOptions = {
                instances : new Array(instancesLength),
                batchTable : batchTable,
                boundingVolume : that._boundingVolume,
                pickPrimitive : that._tileset,
                cull : false,
                url : undefined,
                headers : undefined,
                gltf : undefined,
                basePath : undefined
            };

            //>>includeStart('debug', pragmas.debug);
            if((gltfFormat !== 0) && (gltfFormat !== 1)) {
                throw new DeveloperError('Only glTF format 0 (url) or 1 (embedded) are supported. Format ' + gltfFormat + ' is not');
            }
            //>>includeEnd('debug');

            if (gltfFormat === 0) {
                var gltfUrl = getStringFromTypedArray(gltfView);
                var url = (new Uri(gltfUrl).isAbsolute()) ? gltfUrl : that._tileset._baseUrl + gltfUrl;
                collectionOptions.url = url;
                // TODO : how to get the correct headers
            } else {
                collectionOptions.gltf = gltfView;
                collectionOptions.basePath = that._url;
            }

            var ellipsoid = Ellipsoid.WGS84;
            var position = new Cartesian3();
            var instances = collectionOptions.instances;
            byteOffset = 0;

            for (var i = 0; i < instancesLength; ++i) {
                // Get longitude and latitude
                var longitude = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;
                var latitude = instancesView.getFloat64(byteOffset, true);
                byteOffset += sizeOfFloat64;
                var height = 0.0;

                // Get batchId
                var batchId = instancesView.getUint16(byteOffset, true);
                byteOffset += sizeOfUint16;

                Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, position);
                var modelMatrix = Transforms.eastNorthUpToFixedFrame(position);

                instances[i] = {
                    modelMatrix : modelMatrix,
                    batchId : batchId
                };
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
