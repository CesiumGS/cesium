/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderSource',
        '../Renderer/ShaderProgram',
        '../Renderer/VertexArray',
        '../Renderer/WebGLConstants',
        '../ThirdParty/when',
        './BlendingState',
        './Cesium3DTileBatchTable',
        './Cesium3DTileContentState',
        './Cesium3DTileFeature',
        './Cesium3DTileFeatureTable',
        './Pass'
    ], function(
        Cartesian3,
        Color,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        destroyObject,
        defineProperties,
        DeveloperError,
        getMagic,
        getStringFromTypedArray,
        loadArrayBuffer,
        Matrix3,
        Matrix4,
        PrimitiveType,
        Request,
        RequestScheduler,
        RequestType,
        Buffer,
        BufferUsage,
        DrawCommand,
        RenderState,
        ShaderSource,
        ShaderProgram,
        VertexArray,
        WebGLConstants,
        when,
        BlendingState,
        Cesium3DTileBatchTable,
        Cesium3DTileContentState,
        Cesium3DTileFeature,
        Cesium3DTileFeatureTable,
        Pass) {
    'use strict';

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/PointCloud/README.md|Points}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias PointCloud3DTileContent
     * @constructor
     *
     * @private
     */
    function PointCloud3DTileContent(tileset, tile, url) {
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

        // Hold onto the payload until the render resources are created
        this._parsedContent = undefined;

        this._drawCommand = undefined;
        this._pickCommand = undefined;
        this._pickId = undefined; // Only defined when batchTable is undefined
        this._isTranslucent = false;
        this._constantColor = Color.clone(Color.WHITE);
        this._rtcCenter = undefined;

        this._opaqueRenderState = undefined;
        this._translucentRenderState = undefined;

        this._highlightColor = this._constantColor;
        this._pointSize = 2.0;
        this._quantizedVolumeScale = undefined;
        this._quantizedVolumeOffset = undefined;

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;
        this.batchTable = undefined;
        this.featurePropertiesDirty = false;

        this._contentReadyToProcessPromise = when.defer();
        this._readyPromise = when.defer();
        this._features = undefined;
    }

    defineProperties(PointCloud3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                if (defined(this.batchTable)) {
                    return this.batchTable.featuresLength;
                }
                return 0;
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
        contentReadyToProcessPromise : {
            get : function() {
                return this._contentReadyToProcessPromise.promise;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
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
    PointCloud3DTileContent.prototype.hasProperty = function(name) {
        if (defined(this.batchTable)) {
            return this.batchTable.hasProperty(name);
        }
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     *
     * In this context a feature refers to a group of points that share the same BATCH_ID.
     * For example all the points that represent a door in a house point cloud would be a feature.
     *
     * Features are backed by a batch table, and can be colored, shown/hidden, picked, etc like features
     * in b3dm and i3dm.
     *
     * When the BATCH_ID semantic is omitted and the point cloud stores per-point properties, they
     * are not accessible by getFeature. They are only used for dynamic styling.
     */
    PointCloud3DTileContent.prototype.getFeature = function(batchId) {
        if (defined(this.batchTable)) {
            var featuresLength = this.featuresLength;
            //>>includeStart('debug', pragmas.debug);
            if (!defined(batchId) || (batchId < 0) || (batchId >= featuresLength)) {
                throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + (featuresLength - 1) + ').');
            }
            //>>includeEnd('debug');
            createFeatures(this);
            return this._features[batchId];
        }
        return undefined;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloud3DTileContent.prototype.request = function() {
        var that = this;

        var distance = this._tile.distanceToCamera;
        var promise = RequestScheduler.schedule(new Request({
            url : this._url,
            server : this._tile.requestServer,
            requestFunction : loadArrayBuffer,
            type : RequestType.TILES3D,
            distance : distance
        }));

        if (!defined(promise)) {
            return false;
        }

        this.state = Cesium3DTileContentState.LOADING;
        promise.then(function(arrayBuffer) {
            if (that.isDestroyed()) {
                return when.reject('tileset is destroyed');
            }
            that.initialize(arrayBuffer);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that._readyPromise.reject(error);
        });
        return true;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloud3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'pnts') {
            throw new DeveloperError('Invalid Points tile.  Expected magic=pnts.  Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Points tile version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var featureTableJsonByteLength = view.getUint32(byteOffset, true);
        //>>includeStart('debug', pragmas.debug);
        if (featureTableJsonByteLength === 0) {
            throw new DeveloperError('Feature table must have a byte length greater than zero');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableJsonByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJsonByteLength);
        var featureTableJson = JSON.parse(featureTableString);
        byteOffset += featureTableJsonByteLength;

        var featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
        byteOffset += featureTableBinaryByteLength;

        // Get the batch table JSON and binary
        var batchTableJson;
        var batchTableBinary;
        if (batchTableJsonByteLength > 0) {
            // Has a batch table JSON
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableJsonByteLength);
            batchTableJson = JSON.parse(batchTableString);
            byteOffset += batchTableJsonByteLength;

            if (batchTableBinaryByteLength > 0) {
                // Has a batch table binary
                batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
                byteOffset += batchTableBinaryByteLength;
            }
        }

        var featureTable = new Cesium3DTileFeatureTable(featureTableJson, featureTableBinary);

        var pointsLength = featureTable.getGlobalProperty('POINTS_LENGTH');
        featureTable.featuresLength = pointsLength;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(pointsLength)) {
            throw new DeveloperError('Feature table global property: POINTS_LENGTH must be defined');
        }
        //>>includeEnd('debug');

        // Get the positions
        var positions;
        var isQuantized = false;

        if (defined(featureTableJson.POSITION)) {
            positions = featureTable.getPropertyArray('POSITION', ComponentDatatype.FLOAT, 3);
            var rtcCenter = featureTable.getGlobalProperty('RTC_CENTER');
            if (defined(rtcCenter)) {
                this._rtcCenter = Cartesian3.unpack(rtcCenter);
            }
        } else if (defined(featureTableJson.POSITION_QUANTIZED)) {
            positions = featureTable.getPropertyArray('POSITION_QUANTIZED', ComponentDatatype.UNSIGNED_SHORT, 3);
            isQuantized = true;

            var quantizedVolumeScale = featureTable.getGlobalProperty('QUANTIZED_VOLUME_SCALE');
            //>>includeStart('debug', pragmas.debug);
            if (!defined(quantizedVolumeScale)) {
                throw new DeveloperError('Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
            }
            //>>includeEnd('debug');
            this._quantizedVolumeScale = Cartesian3.unpack(quantizedVolumeScale);

            var quantizedVolumeOffset = featureTable.getGlobalProperty('QUANTIZED_VOLUME_OFFSET');
            //>>includeStart('debug', pragmas.debug);
            if (!defined(quantizedVolumeOffset)) {
                throw new DeveloperError('Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
            }
            //>>includeEnd('debug');
            this._quantizedVolumeOffset = Cartesian3.unpack(quantizedVolumeOffset);
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('Either POSITION or POSITION_QUANTIZED must be defined.');
        }
        //>>includeEnd('debug');

        // Get the colors
        var colors;
        var isTranslucent = false;
        var isRGB565 = false;

        if (defined(featureTableJson.RGBA)) {
            colors = featureTable.getPropertyArray('RGBA', ComponentDatatype.UNSIGNED_BYTE, 4);
            isTranslucent = true;
        } else if (defined(featureTableJson.RGB)) {
            colors = featureTable.getPropertyArray('RGB', ComponentDatatype.UNSIGNED_BYTE, 3);
        } else if (defined(featureTableJson.RGB565)) {
            colors = featureTable.getPropertyArray('RGB565', ComponentDatatype.UNSIGNED_SHORT, 1);
            isRGB565 = true;
        } else if (defined(featureTableJson.CONSTANT_RGBA)) {
            var constantRGBA  = featureTable.getGlobalProperty('CONSTANT_RGBA');
            this._constantColor = Color.fromBytes(constantRGBA[0], constantRGBA[1], constantRGBA[2], constantRGBA[3], this._constantColor);
        } else {
            // Use a default constant color
            this._constantColor = Color.clone(Color.DARKGRAY, this._constantColor);
        }

        this._isTranslucent = isTranslucent;

        // Get the normals
        var normals;
        var isOctEncoded16P = false;

        if (defined(featureTableJson.NORMAL)) {
            normals = featureTable.getPropertyArray('NORMAL', ComponentDatatype.FLOAT, 3);
        } else if (defined(featureTableJson.NORMAL_OCT16P)) {
            normals = featureTable.getPropertyArray('NORMAL_OCT16P', ComponentDatatype.UNSIGNED_BYTE, 2);
            isOctEncoded16P = true;
        }

        // Get the batchIds and batch table
        var batchIds;
        if (defined(featureTableJson.BATCH_ID)) {
            var componentType;
            var componentTypeName = featureTableJson.BATCH_ID.componentType;
            if (defined(componentTypeName)) {
                componentType = ComponentDatatype.fromName(componentTypeName);
            } else {
                // If the componentType is omitted, default to UNSIGNED_SHORT
                componentType = ComponentDatatype.UNSIGNED_SHORT;
            }

            batchIds = featureTable.getPropertyArray('BATCH_ID', componentType, 1);

            var batchLength = featureTable.getGlobalProperty('BATCH_LENGTH');
            //>>includeStart('debug', pragmas.debug);
            if (!defined(batchLength)) {
                throw new DeveloperError('Global property: BATCH_LENGTH must be defined when BATCH_ID is defined.');
            }
            //>>includeEnd('debug');

            if (defined(batchTableBinary)) {
                // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
                batchTableBinary = new Uint8Array(batchTableBinary);
            }
            this.batchTable = new Cesium3DTileBatchTable(this, batchLength, batchTableJson, batchTableBinary);
        }

        // If points are not batched and there there are per-point properties, use these properties for styling purposes
        var styleableProperties;
        if (!defined(batchIds) && defined(batchTableBinary)) {
            styleableProperties = Cesium3DTileBatchTable.getBinaryProperties(pointsLength, batchTableJson, batchTableBinary);
        }

        this._parsedContent = {
            pointsLength : pointsLength,
            positions : positions,
            colors : colors,
            normals : normals,
            batchIds : batchIds,
            isQuantized : isQuantized,
            isRGB565 : isRGB565,
            isOctEncoded16P : isOctEncoded16P,
            styleableProperties : styleableProperties
        };

        this.state = Cesium3DTileContentState.PROCESSING;
        this._contentReadyToProcessPromise.resolve(this);
    };

    function createResources(content, frameState) {
        var context = frameState.context;
        var parsedContent = content._parsedContent;
        var pointsLength = parsedContent.pointsLength;
        var positions = parsedContent.positions;
        var colors = parsedContent.colors;
        var normals = parsedContent.normals;
        var batchIds = parsedContent.batchIds;
        var isQuantized = parsedContent.isQuantized;
        var isRGB565 = parsedContent.isRGB565;
        var isOctEncoded16P = parsedContent.isOctEncoded16P;
        var styleableProperties = parsedContent.styleableProperties;
        var isTranslucent = content._isTranslucent;

        var hasColors = defined(colors);
        var hasNormals = defined(normals);
        var hasBatchIds = defined(batchIds);

        var batchTable = content.batchTable;
        var hasBatchTable = defined(batchTable);
        var hasStyleableProperties = defined(styleableProperties);

        // TODO : How to expose this? Will this be part of the point cloud styling or a property of the tileset?
        // Use per-point normals to hide back-facing points.
        var backFaceCulling = false;

        var positionAttributeLocation = 0;
        var colorAttributeLocation = 1;
        var normalAttributeLocation = 2;
        var batchIdAttributeLocation = 3;
        var numberOfAttributes = 4;

        var styleableShaderAttributes;
        var styleableVertexAttributes;
        var styleableVertexAttributeLocations;

        if (hasStyleableProperties) {
            styleableShaderAttributes = '';
            styleableVertexAttributes = [];
            styleableVertexAttributeLocations = {};

            var attributeLocation = numberOfAttributes;

            for (var name in styleableProperties) {
                if (styleableProperties.hasOwnProperty(name)) {
                    var property = styleableProperties[name];
                    // TODO : this will not handle matrix types currently
                    var componentCount = property.componentCount;
                    var typedArray = property.typedArray;
                    var componentDatatype = ComponentDatatype.fromTypedArray(typedArray);

                    // Append attributes to shader
                    var attributeName = 'czm_pnts_' + name;
                    var attributeType;
                    if (componentCount === 1) {
                        attributeType = 'float';
                    } else {
                        attributeType = 'vec' + componentCount;
                    }
                    styleableShaderAttributes += 'attribute ' + attributeType + ' ' + attributeName + '; \n';

                    var vertexBuffer = Buffer.createVertexBuffer({
                        context : context,
                        typedArray : property.typedArray,
                        usage : BufferUsage.STATIC_DRAW
                    });

                    var vertexAttribute = {
                        index : attributeLocation,
                        vertexBuffer : vertexBuffer,
                        componentsPerAttribute : componentCount,
                        componentDatatype : componentDatatype,
                        normalize : false,
                        offsetInBytes : 0,
                        strideInBytes : 0
                    };

                    styleableVertexAttributes.push(vertexAttribute);
                    styleableVertexAttributeLocations[attributeName] = attributeLocation;
                    ++attributeLocation;
                }
            }
        }

        var vs = 'attribute vec3 a_position; \n' +
                 'varying vec4 v_color; \n' +
                 'uniform float u_pointSize; \n' +
                 'uniform vec4 u_highlightColor; \n';

        if (hasColors) {
            if (isTranslucent) {
                vs += 'attribute vec4 a_color; \n';
            } else if (isRGB565) {
                vs += 'attribute float a_color; \n' +
                      'const float SHIFT_RIGHT_11 = 1.0 / 2048.0; \n' +
                      'const float SHIFT_RIGHT_5 = 1.0 / 32.0; \n' +
                      'const float SHIFT_LEFT_11 = 2048.0; \n' +
                      'const float SHIFT_LEFT_5 = 32.0; \n' +
                      'const float NORMALIZE_6 = 1.0 / 64.0; \n' +
                      'const float NORMALIZE_5 = 1.0 / 32.0; \n';
            } else {
                vs += 'attribute vec3 a_color; \n';
            }
        }
        if (hasNormals) {
            if (isOctEncoded16P) {
                vs += 'attribute vec2 a_normal; \n';
            } else {
                vs += 'attribute vec3 a_normal; \n';
            }
        }

        if (hasBatchIds) {
            vs += 'attribute float a_batchId; \n';
        }

        if (hasStyleableProperties) {
            vs += styleableShaderAttributes;
        }

        if (isQuantized) {
            vs += 'uniform vec3 u_quantizedVolumeScale; \n';
        }

        vs += 'void main() \n' +
              '{ \n';

        if (hasColors) {
            if (isTranslucent) {
                vs += '    vec4 color = a_color * u_highlightColor; \n';
            } else if (isRGB565) {
                vs += '    float compressed = a_color; \n' +
                      '    float r = floor(compressed * SHIFT_RIGHT_11); \n' +
                      '    compressed -= r * SHIFT_LEFT_11; \n' +
                      '    float g = floor(compressed * SHIFT_RIGHT_5); \n' +
                      '    compressed -= g * SHIFT_LEFT_5; \n' +
                      '    float b = compressed; \n' +
                      '    vec3 rgb = vec3(r * NORMALIZE_5, g * NORMALIZE_6, b * NORMALIZE_5); \n' +
                      '    vec4 color = vec4(rgb * u_highlightColor.rgb, u_highlightColor.a); \n';
            } else {
                vs += '    vec4 color =  vec4(a_color * u_highlightColor.rgb, u_highlightColor.a); \n';
            }
        } else {
            vs += '    vec4 color = u_highlightColor; \n';
        }

        if (hasNormals) {
            if (isOctEncoded16P) {
                vs += '    vec3 normal = czm_octDecode(a_normal); \n';
            } else {
                vs += '    vec3 normal = a_normal; \n';
            }

            vs += '    normal = czm_normal * normal; \n' +
                  '    float diffuseStrength = czm_getLambertDiffuse(czm_sunDirectionEC, normal); \n' +
                  '    diffuseStrength = max(diffuseStrength, 0.4); \n' + // Apply some ambient lighting
                  '    color *= diffuseStrength; \n';
        }

        if (isQuantized) {
            vs += '    vec3 position = a_position * u_quantizedVolumeScale; \n';
        } else {
            vs += '    vec3 position = a_position; \n';
        }

        vs += '    v_color = color; \n' +
              '    gl_Position = czm_modelViewProjection * vec4(position, 1.0); \n' +
              '    gl_PointSize = u_pointSize; \n';

        if (hasNormals && backFaceCulling) {
            vs += '    float visible = step(-normal.z, 0.0); \n' +
                  '    gl_Position *= visible; \n';
        }

        vs += '} \n';

        var fs = 'varying vec4 v_color; \n' +
                 'void main() \n' +
                 '{ \n' +
                 '    gl_FragColor = v_color; \n' +
                 '} \n';

        var uniformMap = {
            u_pointSize : function() {
                return content._pointSize;
            },
            u_highlightColor : function() {
                return content._highlightColor;
            }
        };

        if (isQuantized) {
            uniformMap = combine(uniformMap, {
                u_quantizedVolumeScale : function() {
                    return content._quantizedVolumeScale;
                }
            });
        }

        var positionsVertexBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : positions,
            usage : BufferUsage.STATIC_DRAW
        });

        var colorsVertexBuffer;
        if (hasColors) {
            colorsVertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : colors,
                usage : BufferUsage.STATIC_DRAW
            });
        }

        var normalsVertexBuffer;
        if (hasNormals) {
            normalsVertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : normals,
                usage : BufferUsage.STATIC_DRAW
            });
        }

        var batchIdsVertexBuffer;
        if (hasBatchIds) {
            batchIdsVertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : batchIds,
                usage : BufferUsage.STATIC_DRAW
            });
        }

        var attributes = [];
        if (isQuantized) {
            attributes.push({
                index : positionAttributeLocation,
                vertexBuffer : positionsVertexBuffer,
                componentsPerAttribute : 3,
                componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
                normalize : true, // Convert position to 0 to 1 before entering the shader
                offsetInBytes : 0,
                strideInBytes : 0
            });
        } else {
            attributes.push({
                index : positionAttributeLocation,
                vertexBuffer : positionsVertexBuffer,
                componentsPerAttribute : 3,
                componentDatatype : ComponentDatatype.FLOAT,
                normalize : false,
                offsetInBytes : 0,
                strideInBytes : 0
            });
        }

        if (hasColors) {
            if (isRGB565) {
                attributes.push({
                    index : colorAttributeLocation,
                    vertexBuffer : colorsVertexBuffer,
                    componentsPerAttribute : 1,
                    componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
                    normalize : false,
                    offsetInBytes : 0,
                    strideInBytes : 0
                });
            } else {
                var colorComponentsPerAttribute = isTranslucent ? 4 : 3;
                attributes.push({
                    index : colorAttributeLocation,
                    vertexBuffer : colorsVertexBuffer,
                    componentsPerAttribute : colorComponentsPerAttribute,
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    normalize : true,
                    offsetInBytes : 0,
                    strideInBytes : 0
                });
            }
        }

        if (hasNormals) {
            if (isOctEncoded16P) {
                attributes.push({
                    index : normalAttributeLocation,
                    vertexBuffer : normalsVertexBuffer,
                    componentsPerAttribute : 2,
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    normalize : false,
                    offsetInBytes : 0,
                    strideInBytes : 0
                });
            } else {
                attributes.push({
                    index : normalAttributeLocation,
                    vertexBuffer : normalsVertexBuffer,
                    componentsPerAttribute : 3,
                    componentDatatype : ComponentDatatype.FLOAT,
                    normalize : false,
                    offsetInBytes : 0,
                    strideInBytes : 0
                });
            }
        }

        if (hasBatchIds) {
            attributes.push({
                index : batchIdAttributeLocation,
                vertexBuffer : batchIdsVertexBuffer,
                componentsPerAttribute : 1,
                componentDatatype : ComponentDatatype.fromTypedArray(batchIds),
                normalize : false,
                offsetInBytes : 0,
                strideInBytes : 0
            });
        }

        if (hasStyleableProperties) {
            attributes = attributes.concat(styleableVertexAttributes);
        }

        var vertexArray = new VertexArray({
            context : context,
            attributes : attributes
        });

        var attributeLocations = {
            a_position : positionAttributeLocation
        };

        if (hasColors) {
            attributeLocations = combine(attributeLocations, {
                a_color : colorAttributeLocation
            });
        }

        if (hasNormals) {
            attributeLocations = combine(attributeLocations, {
                a_normal : normalAttributeLocation
            });
        }

        if (hasBatchIds) {
            attributeLocations = combine(attributeLocations, {
                a_batchId : batchIdAttributeLocation
            });
        }

        if (hasStyleableProperties) {
            attributeLocations = combine(attributeLocations, styleableVertexAttributeLocations);
        }

        var drawVS = vs;
        var drawFS = fs;
        var drawUniformMap = uniformMap;

        if (hasBatchTable) {
            drawVS = batchTable.getVertexShaderCallback()(vs, false);
            drawFS = batchTable.getFragmentShaderCallback()(fs, false);
            drawUniformMap = batchTable.getUniformMapCallback()(uniformMap);
        }

        var shaderProgram = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : drawVS,
            fragmentShaderSource : drawFS,
            attributeLocations : attributeLocations
        });

        content._opaqueRenderState = RenderState.fromCache({
            depthTest : {
                enabled : true
            }
        });

        content._translucentRenderState = RenderState.fromCache({
            depthTest : {
                enabled : true
            },
            depthMask : false,
            blending : BlendingState.ALPHA_BLEND
        });

        content._drawCommand = new DrawCommand({
            boundingVolume : content._tile.contentBoundingVolume.boundingSphere,
            cull : false, // Already culled by 3D tiles
            modelMatrix : new Matrix4(),
            primitiveType : PrimitiveType.POINTS,
            vertexArray : vertexArray,
            count : pointsLength,
            shaderProgram : shaderProgram,
            uniformMap : drawUniformMap,
            renderState : isTranslucent ? content._translucentRenderState : content._opaqueRenderState,
            pass : isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE,
            owner : content
        });

        var pickVS;
        var pickFS;
        var pickUniformMap;

        if (hasBatchTable) {
            pickVS = batchTable.getPickVertexShaderCallback()(vs);
            pickFS = batchTable.getPickFragmentShaderCallback()(fs);
            pickUniformMap = batchTable.getPickUniformMapCallback()(uniformMap);
        } else {
            content._pickId = context.createPickId({
                primitive : content
            });

            pickUniformMap = combine(uniformMap, {
                czm_pickColor : function() {
                    return content._pickId.color;
                }
            });

            pickVS = vs;
            pickFS = ShaderSource.createPickFragmentShaderSource(fs, 'uniform');
        }

        var pickShaderProgram = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : pickVS,
            fragmentShaderSource : pickFS,
            attributeLocations : attributeLocations
        });

        content._pickCommand = new DrawCommand({
            boundingVolume : content._tile.contentBoundingVolume.boundingSphere,
            cull : false, // Already culled by 3D tiles
            modelMatrix : new Matrix4(),
            primitiveType : PrimitiveType.POINTS,
            vertexArray : vertexArray,
            count : pointsLength,
            shaderProgram : pickShaderProgram,
            uniformMap : pickUniformMap,
            renderState : isTranslucent ? content._translucentRenderState : content._opaqueRenderState,
            pass : isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE,
            owner : content
        });
    }

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloud3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        this._highlightColor = enabled ? color : this._constantColor;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloud3DTileContent.prototype.update = function(tileset, frameState) {
        var updateModelMatrix = this._tile.transformDirty;

        if (!defined(this._drawCommand)) {
            createResources(this, frameState);
            updateModelMatrix = true;

            // Set state to ready
            this.state = Cesium3DTileContentState.READY;
            this._readyPromise.resolve(this);
            this._parsedContent = undefined; // Unload
        }

        if (updateModelMatrix) {
            if (defined(this._rtcCenter)) {
                Matrix4.multiplyByTranslation(this._tile.computedTransform, this._rtcCenter, this._drawCommand.modelMatrix);
            } else if (defined(this._quantizedVolumeOffset)) {
                Matrix4.multiplyByTranslation(this._tile.computedTransform, this._quantizedVolumeOffset, this._drawCommand.modelMatrix);
            } else {
                Matrix4.clone(this._tile.computedTransform, this._drawCommand.modelMatrix);
            }
            Matrix4.clone(this._drawCommand.modelMatrix, this._pickCommand.modelMatrix);
        }

        // Update the render state
        var isTranslucent = (this._highlightColor.alpha < 1.0) || this._isTranslucent;
        this._drawCommand.renderState = isTranslucent ? this._translucentRenderState : this._opaqueRenderState;
        this._drawCommand.pass = isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE;

        if (defined(this.batchTable)) {
            this.batchTable.update(tileset, frameState);
        }

        var passes = frameState.passes;
        if (passes.render) {
            frameState.addCommand(this._drawCommand);
        }
        if (passes.pick) {
            frameState.addCommand(this._pickCommand);
        }
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloud3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloud3DTileContent.prototype.destroy = function() {
        var command = this._drawCommand;
        var pickCommand = this._pickCommand;
        if (defined(command)) {
            command.vertexArray = command.vertexArray && command.vertexArray.destroy();
            command.shaderProgram = command.shaderProgram && command.shaderProgram.destroy();
            pickCommand.shaderProgram = pickCommand.shaderProgram && pickCommand.shaderProgram.destroy();
        }
        this.batchTable = this.batchTable && this.batchTable.destroy();
        return destroyObject(this);
    };

    return PointCloud3DTileContent;
});
