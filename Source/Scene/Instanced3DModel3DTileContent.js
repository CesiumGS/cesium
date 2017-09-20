define([
        '../Core/AttributeCompression',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/FeatureDetection',
        '../Core/getAbsoluteUri',
        '../Core/getBaseUri',
        '../Core/getStringFromTypedArray',
        '../Core/joinUrls',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/RequestType',
        '../Core/RuntimeError',
        '../Core/Transforms',
        '../Core/TranslationRotationScale',
        '../Renderer/Pass',
        './Cesium3DTileBatchTable',
        './Cesium3DTileFeature',
        './Cesium3DTileFeatureTable',
        './ModelInstanceCollection'
    ], function(
        AttributeCompression,
        Cartesian3,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        FeatureDetection,
        getAbsoluteUri,
        getBaseUri,
        getStringFromTypedArray,
        joinUrls,
        Matrix3,
        Matrix4,
        Quaternion,
        RequestType,
        RuntimeError,
        Transforms,
        TranslationRotationScale,
        Pass,
        Cesium3DTileBatchTable,
        Cesium3DTileFeature,
        Cesium3DTileFeatureTable,
        ModelInstanceCollection) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Instanced3DModel/README.md|Instanced 3D Model}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Instanced3DModel3DTileContent
     * @constructor
     *
     * @private
     */
    function Instanced3DModel3DTileContent(tileset, tile, url, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;
        this._modelInstanceCollection = undefined;
        this._batchTable = undefined;
        this._features = undefined;

        /**
         * @inheritdoc Cesium3DTileContent#featurePropertiesDirty
         */
        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    // This can be overridden for testing purposes
    Instanced3DModel3DTileContent._deprecationWarning = deprecationWarning;

    defineProperties(Instanced3DModel3DTileContent.prototype, {
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
                var model = this._modelInstanceCollection._model;
                if (defined(model)) {
                    return model.trianglesLength;
                }
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#geometryByteLength
         */
        geometryByteLength : {
            get : function() {
                var model = this._modelInstanceCollection._model;
                if (defined(model)) {
                    return model.geometryByteLength;
                }
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#texturesByteLength
         */
        texturesByteLength : {
            get : function() {
                var model = this._modelInstanceCollection._model;
                if (defined(model)) {
                    return model.texturesByteLength;
                }
                return 0;
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
                return this._modelInstanceCollection.readyPromise;
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
    var propertyScratch1 = new Array(4);
    var propertyScratch2 = new Array(4);

    function initialize(content, arrayBuffer, byteOffset) {
        var byteStart = defaultValue(byteOffset, 0);
        byteOffset = byteStart;

        var uint8Array = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic

        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new RuntimeError('Only Instanced 3D Model version 1 is supported. Version ' + version + ' is not.');
        }
        byteOffset += sizeOfUint32;

        var byteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var featureTableJsonByteLength = view.getUint32(byteOffset, true);
        if (featureTableJsonByteLength === 0) {
            throw new RuntimeError('featureTableJsonByteLength is zero, the feature table must be defined.');
        }
        byteOffset += sizeOfUint32;

        var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableJsonByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var gltfFormat = view.getUint32(byteOffset, true);
        if (gltfFormat !== 1 && gltfFormat !== 0) {
            throw new RuntimeError('Only glTF format 0 (uri) or 1 (embedded) are supported. Format ' + gltfFormat + ' is not.');
        }
        byteOffset += sizeOfUint32;

        var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJsonByteLength);
        var featureTableJson = JSON.parse(featureTableString);
        byteOffset += featureTableJsonByteLength;

        var featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
        byteOffset += featureTableBinaryByteLength;

        var featureTable = new Cesium3DTileFeatureTable(featureTableJson, featureTableBinary);
        var instancesLength = featureTable.getGlobalProperty('INSTANCES_LENGTH');
        featureTable.featuresLength = instancesLength;

        if (!defined(instancesLength)) {
            throw new RuntimeError('Feature table global property: INSTANCES_LENGTH must be defined');
        }

        var batchTableJson;
        var batchTableBinary;
        if (batchTableJsonByteLength > 0) {
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

        content._batchTable = new Cesium3DTileBatchTable(content, instancesLength, batchTableJson, batchTableBinary);

        var gltfByteLength = byteStart + byteLength - byteOffset;
        if (gltfByteLength === 0) {
            throw new RuntimeError('glTF byte length is zero, i3dm must have a glTF to instance.');
        }

        var gltfView;
        if (byteOffset % 4 === 0) {
            gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);
        } else {
            // Create a copy of the glb so that it is 4-byte aligned
            Instanced3DModel3DTileContent._deprecationWarning('i3dm-glb-unaligned', 'The embedded glb is not aligned to a 4-byte boundary.');
            gltfView = new Uint8Array(uint8Array.subarray(byteOffset, byteOffset + gltfByteLength));
        }

        // Create model instance collection
        var collectionOptions = {
            instances : new Array(instancesLength),
            batchTable : content._batchTable,
            cull : false, // Already culled by 3D Tiles
            url : undefined,
            requestType : RequestType.TILES3D,
            gltf : undefined,
            basePath : undefined,
            incrementallyLoadTextures : false,
            upAxis : content._tileset._gltfUpAxis,
            opaquePass : Pass.CESIUM_3D_TILE // Draw opaque portions during the 3D Tiles pass
        };

        if (gltfFormat === 0) {
            var gltfUrl = getStringFromTypedArray(gltfView);

            // We need to remove padding from the end of the model URL in case this tile was part of a composite tile.
            // This removes all white space and null characters from the end of the string.
            gltfUrl = gltfUrl.replace(/[\s\0]+$/, '');
            collectionOptions.url = getAbsoluteUri(joinUrls(getBaseUri(content._url, true), gltfUrl));
        } else {
            collectionOptions.gltf = gltfView;
            collectionOptions.basePath = getAbsoluteUri(getBaseUri(content._url, true));
        }

        var eastNorthUp = featureTable.getGlobalProperty('EAST_NORTH_UP');

        var rtcCenter;
        var rtcCenterArray = featureTable.getGlobalProperty('RTC_CENTER', ComponentDatatype.FLOAT, 3);
        if (defined(rtcCenterArray)) {
            rtcCenter = Cartesian3.unpack(rtcCenterArray);
        }

        var instances = collectionOptions.instances;
        var instancePosition = new Cartesian3();
        var instancePositionArray = new Array(3);
        var instanceNormalRight = new Cartesian3();
        var instanceNormalUp = new Cartesian3();
        var instanceNormalForward = new Cartesian3();
        var instanceRotation = new Matrix3();
        var instanceQuaternion = new Quaternion();
        var instanceScale = new Cartesian3();
        var instanceTranslationRotationScale = new TranslationRotationScale();
        var instanceTransform = new Matrix4();
        for (var i = 0; i < instancesLength; i++) {
            // Get the instance position
            var position = featureTable.getProperty('POSITION', ComponentDatatype.FLOAT, 3, i, propertyScratch1);
            if (!defined(position)) {
                position = instancePositionArray;
                var positionQuantized = featureTable.getProperty('POSITION_QUANTIZED', ComponentDatatype.UNSIGNED_SHORT, 3, i, propertyScratch1);
                if (!defined(positionQuantized)) {
                    throw new RuntimeError('Either POSITION or POSITION_QUANTIZED must be defined for each instance.');
                }
                var quantizedVolumeOffset = featureTable.getGlobalProperty('QUANTIZED_VOLUME_OFFSET', ComponentDatatype.FLOAT, 3);
                if (!defined(quantizedVolumeOffset)) {
                    throw new RuntimeError('Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
                }
                var quantizedVolumeScale = featureTable.getGlobalProperty('QUANTIZED_VOLUME_SCALE', ComponentDatatype.FLOAT, 3);
                if (!defined(quantizedVolumeScale)) {
                    throw new RuntimeError('Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
                }
                for (var j = 0; j < 3; j++) {
                    position[j] = (positionQuantized[j] / 65535.0 * quantizedVolumeScale[j]) + quantizedVolumeOffset[j];
                }
            }
            Cartesian3.unpack(position, 0, instancePosition);
            if (defined(rtcCenter)) {
                Cartesian3.add(instancePosition, rtcCenter, instancePosition);
            }
            instanceTranslationRotationScale.translation = instancePosition;

            // Get the instance rotation
            var normalUp = featureTable.getProperty('NORMAL_UP', ComponentDatatype.FLOAT, 3, i, propertyScratch1);
            var normalRight = featureTable.getProperty('NORMAL_RIGHT', ComponentDatatype.FLOAT, 3, i, propertyScratch2);
            var hasCustomOrientation = false;
            if (defined(normalUp)) {
                if (!defined(normalRight)) {
                    throw new RuntimeError('To define a custom orientation, both NORMAL_UP and NORMAL_RIGHT must be defined.');
                }
                Cartesian3.unpack(normalUp, 0, instanceNormalUp);
                Cartesian3.unpack(normalRight, 0, instanceNormalRight);
                hasCustomOrientation = true;
            } else {
                var octNormalUp = featureTable.getProperty('NORMAL_UP_OCT32P', ComponentDatatype.UNSIGNED_SHORT, 2, i, propertyScratch1);
                var octNormalRight = featureTable.getProperty('NORMAL_RIGHT_OCT32P', ComponentDatatype.UNSIGNED_SHORT, 2, i, propertyScratch2);
                if (defined(octNormalUp)) {
                    if (!defined(octNormalRight)) {
                        throw new RuntimeError('To define a custom orientation with oct-encoded vectors, both NORMAL_UP_OCT32P and NORMAL_RIGHT_OCT32P must be defined.');
                    }
                    AttributeCompression.octDecodeInRange(octNormalUp[0], octNormalUp[1], 65535, instanceNormalUp);
                    AttributeCompression.octDecodeInRange(octNormalRight[0], octNormalRight[1], 65535, instanceNormalRight);
                    hasCustomOrientation = true;
                } else if (eastNorthUp) {
                    Transforms.eastNorthUpToFixedFrame(instancePosition, Ellipsoid.WGS84, instanceTransform);
                    Matrix4.getRotation(instanceTransform, instanceRotation);
                } else {
                    Matrix3.clone(Matrix3.IDENTITY, instanceRotation);
                }
            }
            if (hasCustomOrientation) {
                Cartesian3.cross(instanceNormalRight, instanceNormalUp, instanceNormalForward);
                Cartesian3.normalize(instanceNormalForward, instanceNormalForward);
                Matrix3.setColumn(instanceRotation, 0, instanceNormalRight, instanceRotation);
                Matrix3.setColumn(instanceRotation, 1, instanceNormalUp, instanceRotation);
                Matrix3.setColumn(instanceRotation, 2, instanceNormalForward, instanceRotation);
            }
            Quaternion.fromRotationMatrix(instanceRotation, instanceQuaternion);
            instanceTranslationRotationScale.rotation = instanceQuaternion;

            // Get the instance scale
            instanceScale = Cartesian3.fromElements(1.0, 1.0, 1.0, instanceScale);
            var scale = featureTable.getProperty('SCALE', ComponentDatatype.FLOAT, 1, i);
            if (defined(scale)) {
                Cartesian3.multiplyByScalar(instanceScale, scale, instanceScale);
            }
            var nonUniformScale = featureTable.getProperty('SCALE_NON_UNIFORM', ComponentDatatype.FLOAT, 3, i, propertyScratch1);
            if (defined(nonUniformScale)) {
                instanceScale.x *= nonUniformScale[0];
                instanceScale.y *= nonUniformScale[1];
                instanceScale.z *= nonUniformScale[2];
            }
            instanceTranslationRotationScale.scale = instanceScale;

            // Get the batchId
            var batchId = featureTable.getProperty('BATCH_ID', ComponentDatatype.UNSIGNED_SHORT, 1, i);
            if (!defined(batchId)) {
                // If BATCH_ID semantic is undefined, batchId is just the instance number
                batchId = i;
            }

            // Create the model matrix and the instance
            Matrix4.fromTranslationRotationScale(instanceTranslationRotationScale, instanceTransform);
            var modelMatrix = instanceTransform.clone();
            instances[i] = {
                modelMatrix : modelMatrix,
                batchId : batchId
            };
        }

        content._modelInstanceCollection = new ModelInstanceCollection(collectionOptions);
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
    Instanced3DModel3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this._batchTable.hasProperty(batchId, name);
    };

    /**
     * @inheritdoc Cesium3DTileContent#getFeature
     */
    Instanced3DModel3DTileContent.prototype.getFeature = function(batchId) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
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
    Instanced3DModel3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        color = enabled ? color : Color.WHITE;
        this._batchTable.setAllColor(color);
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyStyle
     */
    Instanced3DModel3DTileContent.prototype.applyStyle = function(frameState, style) {
        this._batchTable.applyStyle(frameState, style);
    };

    /**
     * @inheritdoc Cesium3DTileContent#update
     */
    Instanced3DModel3DTileContent.prototype.update = function(tileset, frameState) {
        var commandStart = frameState.commandList.length;

        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this._batchTable.update(tileset, frameState);
        this._modelInstanceCollection.modelMatrix = this._tile.computedTransform;
        this._modelInstanceCollection.shadows = this._tileset.shadows;
        this._modelInstanceCollection.debugWireframe = this._tileset.debugWireframe;
        this._modelInstanceCollection.update(frameState);

        // If any commands were pushed, add derived commands
        var commandEnd = frameState.commandList.length;
        if ((commandStart < commandEnd) && frameState.passes.render) {
            this._batchTable.addDerivedCommands(frameState, commandStart);
        }
    };

    /**
     * @inheritdoc Cesium3DTileContent#isDestroyed
     */
    Instanced3DModel3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc Cesium3DTileContent#destroy
     */
    Instanced3DModel3DTileContent.prototype.destroy = function() {
        this._modelInstanceCollection = this._modelInstanceCollection && this._modelInstanceCollection.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();

        return destroyObject(this);
    };
    return Instanced3DModel3DTileContent;
});
