/*global define*/
define([
        '../Core/Check',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/getAbsoluteUri',
        '../Core/getBaseUri',
        '../Core/getStringFromTypedArray',
        '../Core/RequestType',
        '../Core/RuntimeError',
        './Cesium3DTileBatchTable',
        './Cesium3DTileFeature',
        './Cesium3DTileFeatureTable',
        './getAttributeOrUniformBySemantic',
        './Model'
    ], function(
        Check,
        Color,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        getAbsoluteUri,
        getBaseUri,
        getStringFromTypedArray,
        RequestType,
        RuntimeError,
        Cesium3DTileBatchTable,
        Cesium3DTileFeature,
        Cesium3DTileFeatureTable,
        getAttributeOrUniformBySemantic,
        Model) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Batched3DModel/README.md|Batched 3D Model}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Batched3DModel3DTileContent
     * @constructor
     *
     * @private
     */
    function Batched3DModel3DTileContent(tileset, tile, url, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;
        this._model = undefined;
        this._batchTable = undefined;
        this._features = undefined;

        /**
         * @inheritdoc Cesium3DTileContent#featurePropertiesDirty
         */
        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    // This can be overridden for testing purposes
    Batched3DModel3DTileContent._deprecationWarning = deprecationWarning;

    defineProperties(Batched3DModel3DTileContent.prototype, {
        /**
         * @inheritdoc Cesium3DTileContent#featuresLength
         */
        featuresLength : {
            get : function() {
                return this._batchTable.featuresLength;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#pointsLength
         */
        pointsLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#trianglesLength
         */
        trianglesLength : {
            get : function() {
                return this._model.trianglesLength;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#geometryByteLength
         */
        geometryByteLength : {
            get : function() {
                return this._model.geometryByteLength;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#texturesByteLength
         */
        texturesByteLength : {
            get : function() {
                return this._model.texturesByteLength;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#batchTableByteLength
         */
        batchTableByteLength : {
            get : function() {
                return this._batchTable.memorySizeInBytes;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#innerContents
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#readyPromise
         */
        readyPromise : {
            get : function() {
                return this._model.readyPromise;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#tileset
         */
        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#tile
         */
        tile : {
            get : function() {
                return this._tile;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#url
         */
        url: {
            get: function() {
                return this._url;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#batchTable
         */
        batchTable : {
            get : function() {
                return this._batchTable;
            }
        }
    });

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
            var batchTable = content._batchTable;
            var gltf = content._model.gltf;
            var batchIdAttributeName = getBatchIdAttributeName(gltf);
            var callback = batchTable.getVertexShaderCallback(true, batchIdAttributeName);
            return defined(callback) ? callback(vs) : vs;
        };
    }

    function getPickVertexShaderCallback(content) {
        return function(vs) {
            var batchTable = content._batchTable;
            var gltf = content._model.gltf;
            var batchIdAttributeName = getBatchIdAttributeName(gltf);
            var callback = batchTable.getPickVertexShaderCallback(batchIdAttributeName);
            return defined(callback) ? callback(vs) : vs;
        };
    }

    function getFragmentShaderCallback(content) {
        return function(fs) {
            var batchTable = content._batchTable;
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

        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new RuntimeError('Only Batched 3D Model version 1 is supported.  Version ' + version + ' is not.');
        }
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

        batchLength = featureTable.getGlobalProperty('BATCH_LENGTH');
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
        content._batchTable = batchTable;

        var gltfByteLength = byteStart + byteLength - byteOffset;
        if (gltfByteLength === 0) {
            throw new RuntimeError('glTF byte length must be greater than 0.');
        }
        var gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);

        var pickObject = {
            content : content,
            primitive : tileset
        };

        // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
        // The pick shader still needs to be patched.
        content._model = new Model({
            gltf : gltfView,
            cull : false,           // The model is already culled by 3D Tiles
            releaseGltfJson : true, // Models are unique and will not benefit from caching so save memory
            basePath : basePath,
            requestType : RequestType.TILES3D,
            modelMatrix : tile.computedTransform,
            upAxis : tileset._gltfUpAxis,
            shadows: tileset.shadows,
            debugWireframe: tileset.debugWireframe,
            incrementallyLoadTextures : false,
            vertexShaderLoaded : getVertexShaderCallback(content),
            fragmentShaderLoaded : getFragmentShaderCallback(content),
            uniformMapLoaded : batchTable.getUniformMapCallback(),
            pickVertexShaderLoaded : getPickVertexShaderCallback(content),
            pickFragmentShaderLoaded : batchTable.getPickFragmentShaderCallback(),
            pickUniformMapLoaded : batchTable.getPickUniformMapCallback(),
            addBatchIdToGeneratedShaders : (batchLength > 0), // If the batch table has values in it, generated shaders will need a batchId attribute
            pickObject : pickObject
        });
    }

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
     * @inheritdoc Cesium3DTileContent#hasProperty
     */
    Batched3DModel3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this._batchTable.hasProperty(batchId, name);
    };

    /**
     * @inheritdoc Cesium3DTileContent#getFeature
     */
    Batched3DModel3DTileContent.prototype.getFeature = function(batchId) {
        //>>includeStart('debug', pragmas.debug);
        var featuresLength = this.featuresLength;
        if (!defined(batchId) || (batchId < 0) || (batchId >= featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + (featuresLength - 1) + ').');
        }
        //>>includeEnd('debug');

        createFeatures(this);
        return this._features[batchId];
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyDebugSettings
     */
    Batched3DModel3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        color = enabled ? color : Color.WHITE;
        if (this.featuresLength === 0) {
            this._model.color = color;
        } else {
            this._batchTable.setAllColor(color);
        }
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyStyle
     */
    Batched3DModel3DTileContent.prototype.applyStyle = function(frameState, style) {
        this._batchTable.applyStyle(frameState, style);
    };

    /**
     * @inheritdoc Cesium3DTileContent#update
     */
    Batched3DModel3DTileContent.prototype.update = function(tileset, frameState) {
        var commandStart = frameState.commandList.length;

        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this._batchTable.update(tileset, frameState);
        this._model.modelMatrix = this._tile.computedTransform;
        this._model.shadows = this._tileset.shadows;
        this._model.debugWireframe = this._tileset.debugWireframe;
        this._model.update(frameState);

        // If any commands were pushed, add derived commands
        var commandEnd = frameState.commandList.length;
        if ((commandStart < commandEnd) && frameState.passes.render) {
            this._batchTable.addDerivedCommands(frameState, commandStart);
        }
   };

    /**
     * @inheritdoc Cesium3DTileContent#isDestroyed
     */
    Batched3DModel3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc Cesium3DTileContent#destroy
     */
    Batched3DModel3DTileContent.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();
        return destroyObject(this);
    };

    return Batched3DModel3DTileContent;
});
