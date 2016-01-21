/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/getAbsoluteUri',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/Matrix4',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../Core/Transforms',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './BatchedModel',
        './Cesium3DTileBatchTableResources',
        './Cesium3DTileContentState',
        './ModelInstanceCollection'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        getAbsoluteUri,
        getMagic,
        getStringFromTypedArray,
        loadArrayBuffer,
        Matrix4,
        Request,
        RequestScheduler,
        RequestType,
        Transforms,
        Uri,
        when,
        BatchedModel,
        Cesium3DTileBatchTableResources,
        Cesium3DTileContentState,
        ModelInstanceCollection) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Instanced3DModel3DTileContentProvider(tileset, tile, url) {
        this._modelInstanceCollection = undefined;
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

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

        this._batchTableResources = undefined;
        this._models = undefined;
    }

    defineProperties(Instanced3DModel3DTileContentProvider.prototype, {
        /**
         * DOC_TBA
         *
         * @memberof Instanced3DModel3DTileContentProvider.prototype
         *
         * @type {Number}
         * @readonly
         */
        instancesLength : {
            get : function() {
                return this._modelInstanceCollection.length;
            }
        },

        /**
         * DOC_TBA
         */
        batchTableResources : {
            get : function() {
                return this._batchTableResources;
            }
        }
    });

    function createModels(content) {
        var tileset = content._tileset;
        var instancesLength = content.instancesLength;
        if (!defined(content._models) && (instancesLength > 0)) {
            var models = new Array(instancesLength);
            for (var i = 0; i < instancesLength; ++i) {
                models[i] = new BatchedModel(tileset, content._batchTableResources, i);
            }
            content._models = models;
        }
    }

    Instanced3DModel3DTileContentProvider.prototype.getModel = function(index) {
        var instancesLength = this._modelInstanceCollection.length;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index) || (index < 0) || (index >= instancesLength)) {
            throw new DeveloperError('index is required and between zero and instancesLength - 1 (' + (instancesLength - 1) + ').');
        }
        //>>includeEnd('debug');

        createModels(this);
        return this._models[index];
    };

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat64 = Float64Array.BYTES_PER_ELEMENT;

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#requestContent
     */
    Instanced3DModel3DTileContentProvider.prototype.request = function() {
        var that = this;

        var distance = this._tile.distanceToCamera;
        var promise = RequestScheduler.schedule(new Request({
            url : this._url,
            server : this._tile.requestServer,
            requestFunction : loadArrayBuffer,
            type : RequestType.TILES3D,
            distance : distance
        }));
        if (defined(promise)) {
            this.state = Cesium3DTileContentState.LOADING;
            promise.then(function(arrayBuffer) {
                if (that.isDestroyed()) {
                    return when.reject('tileset is destroyed');
                }
                that.initialize(arrayBuffer);
            }).otherwise(function(error) {
                that.state = Cesium3DTileContentState.FAILED;
                that.readyPromise.reject(error);
            });
        }
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
        if ((gltfFormat !== 0) && (gltfFormat !== 1)) {
            throw new DeveloperError('Only glTF format 0 (uri) or 1 (embedded) are supported. Format ' + gltfFormat + ' is not');
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

        // Each vertex has a longitude, latitude, and optionally batchId if there is a batch table
        // Coordinates are in double precision, batchId is a short
        var instanceByteLength = sizeOfFloat64 * 2 + (hasBatchTable ? sizeOfUint16 : 0);
        var instancesByteLength = instancesLength * instanceByteLength;

        var instancesView = new DataView(arrayBuffer, byteOffset, instancesByteLength);
        byteOffset += instancesByteLength;

        // Create model instance collection
        var collectionOptions = {
            instances : new Array(instancesLength),
            batchTableResources : batchTableResources,
            boundingVolume : this._tile.contentBoundingVolume.boundingVolume,
            cull : false,
            url : undefined,
            headers : undefined,
            type : RequestType.TILES3D,
            gltf : undefined,
            basePath : undefined
        };

        if (gltfFormat === 0) {
            var gltfUrl = getStringFromTypedArray(gltfView);
            collectionOptions.url = getAbsoluteUri(gltfUrl, this._tileset.url);
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
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this._batchTableResources.update(owner, frameState);
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
        this._batchTableResources = this._batchTableResources && this._batchTableResources.destroy();

        return destroyObject(this);
    };
    return Instanced3DModel3DTileContentProvider;
});
