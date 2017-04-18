/*global define*/
define([
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getAbsoluteUri',
        '../Core/getBaseUri',
        '../Core/getStringFromTypedArray',
        '../Core/RequestType',
        '../ThirdParty/when',
        './Cesium3DTileBatchTable',
        './Cesium3DTileFeature',
        './Cesium3DTileFeatureTable',
        './getAttributeOrUniformBySemantic',
        './Model'
    ], function(
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        DeveloperError,
        getAbsoluteUri,
        getBaseUri,
        getStringFromTypedArray,
        RequestType,
        when,
        Cesium3DTileBatchTable,
        Cesium3DTileFeature,
        Cesium3DTileFeatureTable,
        getAttributeOrUniformBySemantic,
        Model) {
    'use strict';

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Batched3DModel/README.md|Batched 3D Model}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias Batched3DModel3DTileContent
     * @constructor
     *
     * @private
     */
    function Batched3DModel3DTileContent(tileset, tile, url, arrayBuffer, byteOffset) {
        this._model = undefined;
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.batchTable = undefined;
        this.featurePropertiesDirty = false;

        this._features = undefined;

        initialize(this, arrayBuffer, byteOffset);
    }

    // This can be overridden for testing purposes
    Batched3DModel3DTileContent._deprecationWarning = deprecationWarning;

    defineProperties(Batched3DModel3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                return this.batchTable.featuresLength;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        pointsLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        trianglesLength : {
            get : function() {
                return this._model.trianglesLength;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        vertexMemorySizeInBytes : {
            get : function() {
                return this._model.vertexMemorySizeInBytes;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        textureMemorySizeInBytes : {
            get : function() {
                return this._model.textureMemorySizeInBytes;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        batchTableMemorySizeInBytes : {
            get : function() {
                return this.batchTable.memorySizeInBytes;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
            get : function() {
                return this._model.readyPromise;
            }
        }
    });

    function createFeatures(content) {
        var tileset = content._tileset;
        var featuresLength = content.featuresLength;
        if (!defined(content._features) && (featuresLength > 0)) {
            var features = new Array(featuresLength);
            for (var i = 0; i < featuresLength; ++i) {
                features[i] = new Cesium3DTileFeature(tileset, content, i);
            }
            content._features = features;
        }
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Batched3DModel3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this.batchTable.hasProperty(batchId, name);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Batched3DModel3DTileContent.prototype.getFeature = function(batchId) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId >= featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + (featuresLength - 1) + ').');
        }
        //>>includeEnd('debug');

        createFeatures(this);
        return this._features[batchId];
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function getBatchIdAttributeName(gltf) {
        var batchIdAttributeName = getAttributeOrUniformBySemantic(gltf, '_BATCHID');
        if (!defined(batchIdAttributeName)) {
            batchIdAttributeName = getAttributeOrUniformBySemantic(gltf, 'BATCHID');
            if (defined(batchIdAttributeName)) {
                Batched3DModel3DTileContent._deprecationWarning('b3dm-legacy-batchid', 'The glTF in this b3dm uses the semantic `BATCHID`. Application-specific semantics should be prefixed with an underscore: `_BATCHID`.');
            }
        }
        return batchIdAttributeName;
    }

    function getVertexShaderCallback(content) {
        return function(vs) {
            var batchTable = content.batchTable;
            var gltf = content._model.gltf;
            var batchIdAttributeName = getBatchIdAttributeName(gltf);
            var callback = batchTable.getVertexShaderCallback(true, batchIdAttributeName);
            return defined(callback) ? callback(vs) : vs;
        };
    }

    function getPickVertexShaderCallback(content) {
        return function(vs) {
            var batchTable = content.batchTable;
            var gltf = content._model.gltf;
            var batchIdAttributeName = getBatchIdAttributeName(gltf);
            var callback = batchTable.getPickVertexShaderCallback(batchIdAttributeName);
            return defined(callback) ? callback(vs) : vs;
        };
    }

    function getFragmentShaderCallback(content) {
        return function(fs) {
            var batchTable = content.batchTable;
            var gltf = content._model.gltf;
            var diffuseUniformName = getAttributeOrUniformBySemantic(gltf, '_3DTILESDIFFUSE');
            var callback = batchTable.getFragmentShaderCallback(true, diffuseUniformName);
            return defined(callback) ? callback(fs) : fs;
        };
    }

    function initialize(content, arrayBuffer, byteOffset) {
        var tileset = content._tileset;
        var tile = content._tile;
        var basePath = getAbsoluteUri(getBaseUri(content._url, true));

        var byteStart = defaultValue(byteOffset, 0);
        byteOffset = byteStart;

        var uint8Array = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Batched 3D Model version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        var byteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var featureTableJsonByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableJsonByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchLength;

        // TODO : remove this legacy check before merging into master
        // Legacy header #1: [batchLength] [batchTableByteLength]
        // Legacy header #2: [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]
        // Current header: [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength]
        // If the header is in the first legacy format 'batchTableJsonByteLength' will be the start of the JSON string (a quotation mark) or the glTF magic.
        // Accordingly its first byte will be either 0x22 or 0x67, and so the minimum uint32 expected is 0x22000000 = 570425344 = 570MB. It is unlikely that the feature table JSON will exceed this length.
        // The check for the second legacy format is similar, except it checks 'batchTableBinaryByteLength' instead
        if (batchTableJsonByteLength >= 570425344) {
            // First legacy check
            byteOffset -= sizeOfUint32 * 2;
            batchLength = featureTableJsonByteLength;
            batchTableJsonByteLength = featureTableBinaryByteLength;
            batchTableBinaryByteLength = 0;
            featureTableJsonByteLength = 0;
            featureTableBinaryByteLength = 0;
            deprecationWarning('b3dm-legacy-header', 'This b3dm header is using the legacy format [batchLength] [batchTableByteLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Batched3DModel/README.md.');
        } else if (batchTableBinaryByteLength >= 570425344) {
            // Second legacy check
            byteOffset -= sizeOfUint32;
            batchLength = batchTableJsonByteLength;
            batchTableJsonByteLength = featureTableJsonByteLength;
            batchTableBinaryByteLength = featureTableBinaryByteLength;
            featureTableJsonByteLength = 0;
            featureTableBinaryByteLength = 0;
            deprecationWarning('b3dm-legacy-header', 'This b3dm header is using the legacy format [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Batched3DModel/README.md.');
        }

        var featureTableJson;
        if (featureTableJsonByteLength === 0) {
            featureTableJson = {
                BATCH_LENGTH : defaultValue(batchLength, 0)
            };
        } else {
            var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJsonByteLength);
            featureTableJson = JSON.parse(featureTableString);
            byteOffset += featureTableJsonByteLength;
        }

        var featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
        byteOffset += featureTableBinaryByteLength;

        var featureTable = new Cesium3DTileFeatureTable(featureTableJson, featureTableBinary);

        batchLength = featureTable.getGlobalProperty('BATCH_LENGTH', ComponentDatatype.UNSIGNED_INT);
        featureTable.featuresLength = batchLength;

        var batchTableJson;
        var batchTableBinary;
        if (batchTableJsonByteLength > 0) {
            // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
            // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
            //
            // We could also make another request for it, but that would make the property set/get
            // API async, and would double the number of numbers in some cases.
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableJsonByteLength);
            batchTableJson = JSON.parse(batchTableString);
            byteOffset += batchTableJsonByteLength;

            if (batchTableBinaryByteLength > 0) {
                // Has a batch table binary
                batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
                // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
                batchTableBinary = new Uint8Array(batchTableBinary);
                byteOffset += batchTableBinaryByteLength;
            }
        }

        var batchTable = new Cesium3DTileBatchTable(content, batchLength, batchTableJson, batchTableBinary);
        content.batchTable = batchTable;

        var gltfByteLength = byteStart + byteLength - byteOffset;
        var gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);

        // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
        // The pick shader still needs to be patched.
        content._model = new Model({
            gltf : gltfView,
            cull : false,           // The model is already culled by the 3D tiles
            releaseGltfJson : true, // Models are unique and will not benefit from caching so save memory
            basePath : basePath,
            requestType : RequestType.TILES3D,
            modelMatrix : tile.computedTransform,
            upAxis : tileset._gltfUpAxis,
            shadows: tileset.shadows,
            debugWireframe: tileset.debugWireframe,
            incrementallyLoadTextures : false,
            pickPrimitive : tileset,
            vertexShaderLoaded : getVertexShaderCallback(content),
            fragmentShaderLoaded : getFragmentShaderCallback(content),
            uniformMapLoaded : batchTable.getUniformMapCallback(),
            pickVertexShaderLoaded : getPickVertexShaderCallback(content),
            pickFragmentShaderLoaded : batchTable.getPickFragmentShaderCallback(),
            pickUniformMapLoaded : batchTable.getPickUniformMapCallback(),
            addBatchIdToGeneratedShaders : (batchLength > 0) // If the batch table has values in it, generated shaders will need a batchId attribute
        });
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Batched3DModel3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        color = enabled ? color : Color.WHITE;
        this.batchTable.setAllColor(color);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Batched3DModel3DTileContent.prototype.applyStyleWithShader = function(frameState, style) {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Batched3DModel3DTileContent.prototype.update = function(tileset, frameState) {
        var oldAddCommand = frameState.addCommand;
        if (frameState.passes.render) {
            frameState.addCommand = this.batchTable.getAddCommand();
        }

        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this.batchTable.update(tileset, frameState);
        this._model.modelMatrix = this._tile.computedTransform;
        this._model.shadows = this._tileset.shadows;
        this._model.debugWireframe = this._tileset.debugWireframe;
        this._model.update(frameState);
        frameState.addCommand = oldAddCommand;
   };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Batched3DModel3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Batched3DModel3DTileContent.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        this.batchTable = this.batchTable && this.batchTable.destroy();
        return destroyObject(this);
    };

    return Batched3DModel3DTileContent;
});
