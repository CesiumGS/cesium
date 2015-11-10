/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/Matrix4',
        '../Core/Transforms',
        './Cesium3DTileBatchTableResources',
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
        getMagic,
        getStringFromTypedArray,
        loadArrayBuffer,
        Matrix4,
        Transforms,
        Cesium3DTileBatchTableResources,
        Cesium3DTileContentState,
        ModelInstanceCollection,
        Uri,
        when) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Instanced3DModel3DTileContentProvider = function(tileset, tile, url) {
        this._modelInstanceCollection = undefined;
        this._url = url;
        this._tileset = tileset;
        this._batchTableResources = undefined;
        this._boundingVolume = tile.orientedBoundingBox;

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

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#requestContent
     */
    Instanced3DModel3DTileContentProvider.prototype.request = function() {
        var that = this;

        this.state = Cesium3DTileContentState.LOADING;

        loadArrayBuffer(this._url).then(function(arrayBuffer) {
            that.initialize(arrayBuffer);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });
    };

    /**
     * DOC_TBA
     */
    Instanced3DModel3DTileContentProvider.prototype.initialize = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'i3dm') {
            throw new DeveloperError('Invalid Instanced 3D Model. Expected magic=i3dm. Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Instanced 3D Model version 1 is supported. Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var batchTableByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var gltfByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var gltfFormat = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var instancesLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        //>>includeStart('debug', pragmas.debug);
        if (gltfByteLength < 0) {
            throw new DeveloperError('glTF byte length must be greater than or equal to zero. Value is ' + gltfByteLength + '.');
        }
        if ((gltfFormat !== 0) && (gltfFormat !== 1)) {
            throw new DeveloperError('Only glTF format 0 (uri) or 1 (embedded) are supported. Format ' + gltfFormat + ' is not');
        }
        if (instancesLength < 0) {
            throw new DeveloperError('Instances length must be greater than or equal to zero. Value is ' + instancesLength + '.');
        }
        //>>includeEnd('debug');

        var batchTableResources = new Cesium3DTileBatchTableResources(this, instancesLength);
        this._batchTableResources = batchTableResources;
        var hasBatchTable = false;
        if (batchTableByteLength > 0) {
            hasBatchTable = true;
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableByteLength);
            batchTableResources.batchTable = JSON.parse(batchTableString);
            byteOffset += batchTableByteLength;
        }

        var gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);
        byteOffset += gltfByteLength;

        var instancesDataSizeInBytes = instancesLength * instanceSizeInBytes;
        var instancesView = new DataView(arrayBuffer, byteOffset, instancesDataSizeInBytes);
        byteOffset += instancesDataSizeInBytes;

        // Create model instance collection
        var collectionOptions = {
            instances : new Array(instancesLength),
            batchTableResources : batchTableResources,
            boundingVolume : this._boundingVolume,
            tileset : this._tileset,
            cull : false,
            url : undefined,
            headers : undefined,
            gltf : undefined,
            basePath : undefined
        };

        if (gltfFormat === 0) {
            var gltfUrl = getStringFromTypedArray(gltfView);
            var url = (new Uri(gltfUrl).isAbsolute()) ? gltfUrl : this._tileset.url + gltfUrl;
            collectionOptions.url = url;
            // TODO : how to get the correct headers
        } else {
            collectionOptions.gltf = gltfView;
            collectionOptions.basePath = this._url;
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

            // Get batch id. If there is no batch table, the batch id is the array index.
            var batchId = i;
            if (hasBatchTable) {
                batchId = instancesView.getUint16(byteOffset, true);
                byteOffset += sizeOfUint16;
            }

            Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, position);
            var modelMatrix = Transforms.eastNorthUpToFixedFrame(position);

            instances[i] = {
                modelMatrix : modelMatrix,
                batchId : batchId
            };
        }

        var modelInstanceCollection = new ModelInstanceCollection(collectionOptions);
        this._modelInstanceCollection = modelInstanceCollection;
        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(this);

        var that = this;

        when(modelInstanceCollection.readyPromise).then(function(modelInstanceCollection) {
            that.state = Cesium3DTileContentState.READY;
            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });
    };

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#update
     */
    Instanced3DModel3DTileContentProvider.prototype.update = function(owner, frameState) {
        this._modelInstanceCollection.update(frameState);
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
