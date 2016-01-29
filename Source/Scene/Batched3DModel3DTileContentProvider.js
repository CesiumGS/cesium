/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../ThirdParty/when',
        './Cesium3DTileFeature',
        './Cesium3DTileBatchTableResources',
        './Cesium3DTileContentState',
        './Model'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getMagic,
        getStringFromTypedArray,
        loadArrayBuffer,
        Request,
        RequestScheduler,
        RequestType,
        when,
        Cesium3DTileFeature,
        Cesium3DTileBatchTableResources,
        Cesium3DTileContentState,
        Model) {
    "use strict";

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Batched3DModel/README.md|Batched 3D Model}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias Batched3DModel3DTileContentProvider
     * @constructor
     *
     * @private
     */
    function Batched3DModel3DTileContentProvider(tileset, tile, url) {
        this._model = undefined;
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.processingPromise = when.defer();

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        this.readyPromise = when.defer();

        this._featuresLength = 0;
        this._batchTableResources = undefined;
        this._features = undefined;
    }

    defineProperties(Batched3DModel3DTileContentProvider.prototype, {
        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        featuresLength : {
            get : function() {
                return this._featuresLength;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContentProvider} interface.
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        }
    });

    function createFeatures(content) {
        var tileset = content._tileset;
        var featuresLength = content._featuresLength;
        if (!defined(content._features) && (featuresLength > 0)) {
            var features = new Array(featuresLength);
            for (var i = 0; i < featuresLength; ++i) {
                features[i] = new Cesium3DTileFeature(tileset, content._batchTableResources, i);
            }
            content._features = features;
        }
    }

     /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.hasProperty = function(name) {
        return this._batchTableResources.hasProperty(name);
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.getFeature = function(batchId) {
        var featuresLength = this._featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId >= featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + (featuresLength - 1) + ').');
        }
        //>>includeEnd('debug');

        createFeatures(this);
        return this._features[batchId];
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.request = function() {
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
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.initialize = function(arrayBuffer, byteOffset) {
        var byteStart = defaultValue(byteOffset, 0);
        byteOffset = byteStart;

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'b3dm') {
            throw new DeveloperError('Invalid Batched 3D Model.  Expected magic=b3dm.  Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Batched 3D Model version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        var byteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchLength = view.getUint32(byteOffset, true);
        this._featuresLength = batchLength;
        byteOffset += sizeOfUint32;

        var batchTableResources = new Cesium3DTileBatchTableResources(this, batchLength);
        this._batchTableResources = batchTableResources;

        var batchTableByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        if (batchTableByteLength > 0) {
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableByteLength);
            byteOffset += batchTableByteLength;

            // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
            // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
            //
            // We could also make another request for it, but that would make the property set/get
            // API async, and would double the number of numbers in some cases.
            batchTableResources.batchTable = JSON.parse(batchTableString);
        }

        var gltfByteLength = byteStart + byteLength - byteOffset;
        var gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);

        // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
        // The pitch shader still needs to be patched.
        var model = new Model({
            gltf : gltfView,
            cull : false,           // The model is already culled by the 3D tiles
            releaseGltfJson : true, // Models are unique and will not benefit from caching so save memory
            vertexShaderLoaded : batchTableResources.getVertexShaderCallback(),
            fragmentShaderLoaded : batchTableResources.getFragmentShaderCallback(),
            uniformMapLoaded : batchTableResources.getUniformMapCallback(),
            pickVertexShaderLoaded : batchTableResources.getPickVertexShaderCallback(),
            pickFragmentShaderLoaded : batchTableResources.getPickFragmentShaderCallback(),
            pickUniformMapLoaded : batchTableResources.getPickUniformMapCallback(),
            basePath : this._url
        });

        this._model = model;
        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(this);

        var that = this;

        when(model.readyPromise).then(function(model) {
            that.state = Cesium3DTileContentState.READY;
            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.applyDebugSettings = function(enabled, color) {
        color = enabled ? color : Color.WHITE;
        this._batchTableResources.setAllColor(color);
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.update = function(tiles3D, frameState) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this._batchTableResources.update(tiles3D, frameState);
        this._model.update(frameState);
   };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContentProvider} interface.
     */
    Batched3DModel3DTileContentProvider.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        this._batchTableResources = this._batchTableResources && this._batchTableResources.destroy();

        return destroyObject(this);
    };

    return Batched3DModel3DTileContentProvider;
});
