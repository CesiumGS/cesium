define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/getStringFromTypedArray',
        '../Core/Matrix4',
        '../Core/RequestType',
        '../Core/RuntimeError',
        '../Core/Transforms',
        '../Renderer/Pass',
        './Axis',
        './Cesium3DTileBatchTable',
        './Cesium3DTileFeature',
        './Cesium3DTileFeatureTable',
        './ClassificationModel',
        './Model',
        './ModelUtility'
    ], function(
        Cartesian3,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        getStringFromTypedArray,
        Matrix4,
        RequestType,
        RuntimeError,
        Transforms,
        Pass,
        Axis,
        Cesium3DTileBatchTable,
        Cesium3DTileFeature,
        Cesium3DTileFeatureTable,
        ClassificationModel,
        Model,
        ModelUtility) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/TileFormats/Batched3DModel|Batched 3D Model}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification|3D Tiles} tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Batched3DModel3DTileContent
     * @constructor
     *
     * @private
     */
    function Batched3DModel3DTileContent(tileset, tile, resource, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._resource = resource;
        this._model = undefined;
        this._batchTable = undefined;
        this._features = undefined;

        // Populate from gltf when available
        this._batchIdAttributeName = undefined;
        this._diffuseAttributeOrUniformName = {};

        this._rtcCenterTransform = undefined;
        this._contentModelMatrix = undefined;

        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    // This can be overridden for testing purposes
    Batched3DModel3DTileContent._deprecationWarning = deprecationWarning;

    defineProperties(Batched3DModel3DTileContent.prototype, {
        featuresLength : {
            get : function() {
                return this._batchTable.featuresLength;
            }
        },

        pointsLength : {
            get : function() {
                return 0;
            }
        },

        trianglesLength : {
            get : function() {
                return this._model.trianglesLength;
            }
        },

        geometryByteLength : {
            get : function() {
                return this._model.geometryByteLength;
            }
        },

        texturesByteLength : {
            get : function() {
                return this._model.texturesByteLength;
            }
        },

        batchTableByteLength : {
            get : function() {
                return this._batchTable.memorySizeInBytes;
            }
        },

        innerContents : {
            get : function() {
                return undefined;
            }
        },

        readyPromise : {
            get : function() {
                return this._model.readyPromise;
            }
        },

        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        tile : {
            get : function() {
                return this._tile;
            }
        },

        url: {
            get: function() {
                return this._resource.getUrlComponent(true);
            }
        },

        batchTable : {
            get : function() {
                return this._batchTable;
            }
        }
    });

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function getBatchIdAttributeName(gltf) {
        var batchIdAttributeName = ModelUtility.getAttributeOrUniformBySemantic(gltf, '_BATCHID');
        if (!defined(batchIdAttributeName)) {
            batchIdAttributeName = ModelUtility.getAttributeOrUniformBySemantic(gltf, 'BATCHID');
            if (defined(batchIdAttributeName)) {
                Batched3DModel3DTileContent._deprecationWarning('b3dm-legacy-batchid', 'The glTF in this b3dm uses the semantic `BATCHID`. Application-specific semantics should be prefixed with an underscore: `_BATCHID`.');
            }
        }
        return batchIdAttributeName;
    }

    function getVertexShaderCallback(content) {
        return function(vs, programId) {
            var batchTable = content._batchTable;
            var handleTranslucent = !defined(content._tileset.classificationType);

            var gltf = content._model.gltf;
            if (defined(gltf)) {
                content._batchIdAttributeName = getBatchIdAttributeName(gltf);
                content._diffuseAttributeOrUniformName[programId] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
            }

            var callback = batchTable.getVertexShaderCallback(handleTranslucent, content._batchIdAttributeName, content._diffuseAttributeOrUniformName[programId]);
            return defined(callback) ? callback(vs) : vs;
        };
    }

    function getFragmentShaderCallback(content) {
        return function(fs, programId) {
            var batchTable = content._batchTable;
            var handleTranslucent = !defined(content._tileset.classificationType);

            var gltf = content._model.gltf;
            if (defined(gltf)) {
                content._diffuseAttributeOrUniformName[programId] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
            }
            var callback = batchTable.getFragmentShaderCallback(handleTranslucent, content._diffuseAttributeOrUniformName[programId]);
            return defined(callback) ? callback(fs) : fs;
        };
    }

    function getPickIdCallback(content) {
        return function() {
            return content._batchTable.getPickId();
        };
    }

    function getClassificationFragmentShaderCallback(content) {
        return function(fs) {
            var batchTable = content._batchTable;
            var callback = batchTable.getClassificationFragmentShaderCallback();
            return defined(callback) ? callback(fs) : fs;
        };
    }

    function createColorChangedCallback(content) {
        return function(batchId, color) {
            content._model.updateCommands(batchId, color);
        };
    }

    function initialize(content, arrayBuffer, byteOffset) {
        var tileset = content._tileset;
        var tile = content._tile;
        var resource = content._resource;

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
            Batched3DModel3DTileContent._deprecationWarning('b3dm-legacy-header', 'This b3dm header is using the legacy format [batchLength] [batchTableByteLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/TileFormats/Batched3DModel.');
        } else if (batchTableBinaryByteLength >= 570425344) {
            // Second legacy check
            byteOffset -= sizeOfUint32;
            batchLength = batchTableJsonByteLength;
            batchTableJsonByteLength = featureTableJsonByteLength;
            batchTableBinaryByteLength = featureTableBinaryByteLength;
            featureTableJsonByteLength = 0;
            featureTableBinaryByteLength = 0;
            Batched3DModel3DTileContent._deprecationWarning('b3dm-legacy-header', 'This b3dm header is using the legacy format [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/TileFormats/Batched3DModel.');
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

        var colorChangedCallback;
        if (defined(tileset.classificationType)) {
            colorChangedCallback = createColorChangedCallback(content);
        }

        var batchTable = new Cesium3DTileBatchTable(content, batchLength, batchTableJson, batchTableBinary, colorChangedCallback);
        content._batchTable = batchTable;

        var gltfByteLength = byteStart + byteLength - byteOffset;
        if (gltfByteLength === 0) {
            throw new RuntimeError('glTF byte length must be greater than 0.');
        }

        var gltfView;
        if (byteOffset % 4 === 0) {
            gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);
        } else {
            // Create a copy of the glb so that it is 4-byte aligned
            Batched3DModel3DTileContent._deprecationWarning('b3dm-glb-unaligned', 'The embedded glb is not aligned to a 4-byte boundary.');
            gltfView = new Uint8Array(uint8Array.subarray(byteOffset, byteOffset + gltfByteLength));
        }

        var pickObject = {
            content : content,
            primitive : tileset
        };

        content._rtcCenterTransform = Matrix4.IDENTITY;
        var rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', ComponentDatatype.FLOAT, 3);
        if (defined(rtcCenter)) {
            content._rtcCenterTransform = Matrix4.fromTranslation(Cartesian3.fromArray(rtcCenter));
        }

        content._contentModelMatrix = Matrix4.multiply(tile.computedTransform, content._rtcCenterTransform, new Matrix4());

        if (!defined(tileset.classificationType)) {
            // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
            // The pick shader still needs to be patched.
            content._model = new Model({
                gltf : gltfView,
                cull : false,           // The model is already culled by 3D Tiles
                releaseGltfJson : true, // Models are unique and will not benefit from caching so save memory
                opaquePass : Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
                basePath : resource,
                requestType : RequestType.TILES3D,
                modelMatrix: content._contentModelMatrix,
                upAxis : tileset._gltfUpAxis,
                forwardAxis : Axis.X,
                shadows: tileset.shadows,
                debugWireframe: tileset.debugWireframe,
                incrementallyLoadTextures : false,
                vertexShaderLoaded : getVertexShaderCallback(content),
                fragmentShaderLoaded : getFragmentShaderCallback(content),
                uniformMapLoaded : batchTable.getUniformMapCallback(),
                pickIdLoaded : getPickIdCallback(content),
                addBatchIdToGeneratedShaders : (batchLength > 0), // If the batch table has values in it, generated shaders will need a batchId attribute
                pickObject : pickObject,
                imageBasedLightingFactor : tileset.imageBasedLightingFactor,
                lightColor : tileset.lightColor,
                luminanceAtZenith : tileset.luminanceAtZenith,
                sphericalHarmonicCoefficients : tileset.sphericalHarmonicCoefficients,
                specularEnvironmentMaps : tileset.specularEnvironmentMaps
            });
        } else {
            // This transcodes glTF to an internal representation for geometry so we can take advantage of the re-batching of vector data.
            // For a list of limitations on the input glTF, see the documentation for classificationType of Cesium3DTileset.
            content._model = new ClassificationModel({
                gltf : gltfView,
                cull : false,           // The model is already culled by 3D Tiles
                basePath : resource,
                requestType : RequestType.TILES3D,
                modelMatrix: content._contentModelMatrix,
                upAxis : tileset._gltfUpAxis,
                forwardAxis : Axis.X,
                debugWireframe : tileset.debugWireframe,
                vertexShaderLoaded : getVertexShaderCallback(content),
                classificationShaderLoaded : getClassificationFragmentShaderCallback(content),
                uniformMapLoaded : batchTable.getUniformMapCallback(),
                pickIdLoaded : getPickIdCallback(content),
                classificationType : tileset._classificationType,
                batchTable : batchTable
            });
        }
    }

    function createFeatures(content) {
        var featuresLength = content.featuresLength;
        if (!defined(content._features) && (featuresLength > 0)) {
            var features = new Array(featuresLength);
            for (var i = 0; i < featuresLength; ++i) {
                features[i] = new Cesium3DTileFeature(content, i);
            }
            content._features = features;
        }
    }

    Batched3DModel3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this._batchTable.hasProperty(batchId, name);
    };

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

    Batched3DModel3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        color = enabled ? color : Color.WHITE;
        if (this.featuresLength === 0) {
            this._model.color = color;
        } else {
            this._batchTable.setAllColor(color);
        }
    };

    var scratchColor = new Color();

    Batched3DModel3DTileContent.prototype.applyStyle = function(style) {
        if (this.featuresLength === 0) {
            var hasColorStyle = defined(style) && defined(style.color);
            var hasShowStyle = defined(style) && defined(style.show);
            this._model.color = hasColorStyle ? style.color.evaluateColor(undefined, scratchColor) : Color.WHITE;
            this._model.show = hasShowStyle ? style.show.evaluate(undefined) : true;
        } else {
            this._batchTable.applyStyle(style);
        }
    };

    Batched3DModel3DTileContent.prototype.update = function(tileset, frameState) {
        var commandStart = frameState.commandList.length;

        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this._batchTable.update(tileset, frameState);

        this._contentModelMatrix = Matrix4.multiply(this._tile.computedTransform, this._rtcCenterTransform, this._contentModelMatrix);
        this._model.modelMatrix = this._contentModelMatrix;

        this._model.shadows = this._tileset.shadows;
        this._model.imageBasedLightingFactor = this._tileset.imageBasedLightingFactor;
        this._model.lightColor = this._tileset.lightColor;
        this._model.luminanceAtZenith = this._tileset.luminanceAtZenith;
        this._model.sphericalHarmonicCoefficients = this._tileset.sphericalHarmonicCoefficients;
        this._model.specularEnvironmentMaps = this._tileset.specularEnvironmentMaps;
        this._model.debugWireframe = this._tileset.debugWireframe;

        // Update clipping planes
        var tilesetClippingPlanes = this._tileset.clippingPlanes;
        this._model.clippingPlanesOriginMatrix = this._tileset.clippingPlanesOriginMatrix;
        if (defined(tilesetClippingPlanes) && this._tile.clippingPlanesDirty) {
            // Dereference the clipping planes from the model if they are irrelevant.
            // Link/Dereference directly to avoid ownership checks.
            // This will also trigger synchronous shader regeneration to remove or add the clipping plane and color blending code.
            this._model._clippingPlanes = (tilesetClippingPlanes.enabled && this._tile._isClipped) ? tilesetClippingPlanes : undefined;
        }

        // If the model references a different ClippingPlaneCollection due to the tileset's collection being replaced with a
        // ClippingPlaneCollection that gives this tile the same clipping status, update the model to use the new ClippingPlaneCollection.
        if (defined(tilesetClippingPlanes) && defined(this._model._clippingPlanes) && this._model._clippingPlanes !== tilesetClippingPlanes) {
            this._model._clippingPlanes = tilesetClippingPlanes;
        }

        this._model.update(frameState);

        // If any commands were pushed, add derived commands
        var commandEnd = frameState.commandList.length;
        if ((commandStart < commandEnd) && (frameState.passes.render || frameState.passes.pick) && !defined(tileset.classificationType)) {
            this._batchTable.addDerivedCommands(frameState, commandStart);
        }
   };

    Batched3DModel3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    Batched3DModel3DTileContent.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();
        return destroyObject(this);
    };

    return Batched3DModel3DTileContent;
});
