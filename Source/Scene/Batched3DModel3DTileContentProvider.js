/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        './Cesium3DTileBatchTable',
        './Cesium3DTileContentState',
        './Model',
        './BatchedModel',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getStringFromTypedArray,
        loadArrayBuffer,
        Cesium3DTileBatchTable,
        Cesium3DTileContentState,
        Model,
        BatchedModel,
        when) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Batched3DModel3DTileContentProvider = function(tileset, tile, url, contentHeader) {
        this._model = undefined;
        this._url = url;
        this._tileset = tileset;

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

        var batchSize = defaultValue(contentHeader.batchSize, 0);
        this._batchSize = batchSize;
        this._batchTable = new Cesium3DTileBatchTable(this, batchSize);
        this._models = undefined;
    };

    defineProperties(Batched3DModel3DTileContentProvider.prototype, {
        /**
         * DOC_TBA
         *
         * @memberof Batched3DModel3DTileContentProvider.prototype
         *
         * @type {Number}
         * @readonly
         */
        batchSize : {
            get : function() {
                return this._batchSize;
            }
        }
    });

    function createModels(content) {
        var tileset = content._tileset;
        var batchSize = content._batchSize;
        if (!defined(content._models) && (batchSize > 0)) {
            var models = new Array(batchSize);
            for (var i = 0; i < batchSize; ++i) {
                models[i] = new BatchedModel(tileset, content._batchTable, i);
            }
            content._models = models;
        }
    }

    /**
     * DOC_TBA
     */
    Batched3DModel3DTileContentProvider.prototype.getModel = function(batchId) {
        var batchSize = this._batchSize;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId >= batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + (batchSize - 1) + ').');
        }
        //>>includeEnd('debug');

        createModels(this);
        return this._models[batchId];
    };

    // TODO: move this and the copy in Model.js to an overload for getStringFromTypedArray
    function getSubarray(array, offset, length) {
        return array.subarray(offset, offset + length);
    }

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#requestContent
     */
    Batched3DModel3DTileContentProvider.prototype.request = function() {
        var that = this;
        var batchTable = this._batchTable;

        this.state = Cesium3DTileContentState.LOADING;

        function failRequest(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        }

        loadArrayBuffer(this._url). then(function(arrayBuffer) {
            var uint8Array = new Uint8Array(arrayBuffer);
            var magic = getStringFromTypedArray(getSubarray(uint8Array, 0, Math.min(4, uint8Array.length)));
            if (magic !== 'b3dm') {
                throw new DeveloperError('Invalid Batched 3D Model.  Expected magic=b3dm.  Read magic=' + magic);
            }

            var view = new DataView(arrayBuffer);
            var byteOffset = 0;

            byteOffset += sizeOfUint32;  // Skip magic number

            //>>includeStart('debug', pragmas.debug);
            var version = view.getUint32(byteOffset, true);
            if (version !== 1) {
                throw new DeveloperError('Only Batched 3D Model version 1 is supported.  Version ' + version + ' is not.');
            }
            //>>includeEnd('debug');
            byteOffset += sizeOfUint32;

            var batchTableLength = view.getUint32(byteOffset, true);
            byteOffset += sizeOfUint32;
            if (batchTableLength > 0) {
                var batchTableString = getStringFromTypedArray(getSubarray(uint8Array, byteOffset, batchTableLength));
                byteOffset += batchTableLength;

                // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
                // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
                //
                // We could also make another request for it, but that would make the property set/get
                // API async, and would double the number of numbers in some cases.
                batchTable._batchTable = JSON.parse(batchTableString);
            }

            var gltfView = new Uint8Array(arrayBuffer, byteOffset, arrayBuffer.byteLength - byteOffset);

            // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
            // The pitch shader still needs to be patched.
            var model = new Model({
                gltf : gltfView,
                cull : false,           // The model is already culled by the 3D tiles
                releaseGltfJson : true, // Models are unique and will not benefit from caching so save memory
                vertexShaderLoaded : batchTable.getVertexShaderCallback(),
                fragmentShaderLoaded : batchTable.getFragmentShaderCallback(),
                uniformMapLoaded : batchTable.getUniformMapCallback(),
                pickVertexShaderLoaded : batchTable.getPickVertexShaderCallback(),
                pickFragmentShaderLoaded : batchTable.getPickFragmentShaderCallback(),
                pickUniformMapLoaded : batchTable.getPickUniformMapCallback(),
                basePath : that._url
            });

            that._model = model;
            that.state = Cesium3DTileContentState.PROCESSING;
            that.processingPromise.resolve(that);

            when(model.readyPromise).then(function(model) {
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
    Batched3DModel3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        this._batchTable.update(context, frameState);
        this._model.update(context, frameState, commandList);
   };

   /**
    * DOC_TBA
    */
    Batched3DModel3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    Batched3DModel3DTileContentProvider.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();

        return destroyObject(this);
    };

    return Batched3DModel3DTileContentProvider;
});
