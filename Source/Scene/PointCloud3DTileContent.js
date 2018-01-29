define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/getStringFromTypedArray',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/oneTimeWarning',
        '../Core/Plane',
        '../Core/PrimitiveType',
        '../Core/RuntimeError',
        '../Core/Transforms',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/Pass',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArray',
        '../ThirdParty/when',
        './BlendingState',
        './Cesium3DTileBatchTable',
        './Cesium3DTileFeature',
        './Cesium3DTileFeatureTable',
        './SceneMode',
        './ShadowMode'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Color,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        getStringFromTypedArray,
        Matrix3,
        Matrix4,
        oneTimeWarning,
        Plane,
        PrimitiveType,
        RuntimeError,
        Transforms,
        Buffer,
        BufferUsage,
        DrawCommand,
        Pass,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArray,
        when,
        BlendingState,
        Cesium3DTileBatchTable,
        Cesium3DTileFeature,
        Cesium3DTileFeatureTable,
        SceneMode,
        ShadowMode) {
    'use strict';

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/PointCloud/README.md|Points}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias PointCloud3DTileContent
     * @constructor
     *
     * @private
     */
    function PointCloud3DTileContent(tileset, tile, url, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._url = url;

        // Hold onto the payload until the render resources are created
        this._parsedContent = undefined;

        this._drawCommand = undefined;
        this._pickCommand = undefined;
        this._pickId = undefined; // Only defined when batchTable is undefined
        this._isTranslucent = false;
        this._styleTranslucent = false;
        this._constantColor = Color.clone(Color.WHITE);
        this._rtcCenter = undefined;
        this._batchTable = undefined; // Used when feature table contains BATCH_ID semantic

        // These values are used to regenerate the shader when the style changes
        this._styleableShaderAttributes = undefined;
        this._isQuantized = false;
        this._isOctEncoded16P = false;
        this._isRGB565 = false;
        this._hasColors = false;
        this._hasNormals = false;
        this._hasBatchIds = false;

        // Used to regenerate shader when clipping on this tile changes
        this._isClipped = false;
        this._unionClippingRegions = false;

        // Use per-point normals to hide back-facing points.
        this.backFaceCulling = false;
        this._backFaceCulling = false;

        this._opaqueRenderState = undefined;
        this._translucentRenderState = undefined;

        this._highlightColor = Color.clone(Color.WHITE);
        this._pointSize = 1.0;
        this._quantizedVolumeScale = undefined;
        this._quantizedVolumeOffset = undefined;

        this._modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
        this._mode = undefined;

        this._readyPromise = when.defer();
        this._pointsLength = 0;
        this._geometryByteLength = 0;

        this._features = undefined;

        this._packedClippingPlanes = [];
        this._modelViewMatrix = Matrix4.clone(Matrix4.IDENTITY);

        /**
         * @inheritdoc Cesium3DTileContent#featurePropertiesDirty
         */
        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    defineProperties(PointCloud3DTileContent.prototype, {
        /**
         * @inheritdoc Cesium3DTileContent#featuresLength
         */
        featuresLength : {
            get : function() {
                if (defined(this._batchTable)) {
                    return this._batchTable.featuresLength;
                }
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#pointsLength
         */
        pointsLength : {
            get : function() {
                return this._pointsLength;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#trianglesLength
         */
        trianglesLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#geometryByteLength
         */
        geometryByteLength : {
            get : function() {
                return this._geometryByteLength;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#texturesByteLength
         */
        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        /**
         * @inheritdoc Cesium3DTileContent#batchTableByteLength
         */
        batchTableByteLength : {
            get : function() {
                if (defined(this._batchTable)) {
                    return this._batchTable.memorySizeInBytes;
                }
                return 0;
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
                return this._readyPromise.promise;
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
        url : {
            get : function() {
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

    function initialize(content, arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic

        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new RuntimeError('Only Point Cloud tile version 1 is supported.  Version ' + version + ' is not.');
        }
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var featureTableJsonByteLength = view.getUint32(byteOffset, true);
        if (featureTableJsonByteLength === 0) {
            throw new RuntimeError('Feature table must have a byte length greater than zero');
        }
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

        if (!defined(pointsLength)) {
            throw new RuntimeError('Feature table global property: POINTS_LENGTH must be defined');
        }

        // Get the positions
        var positions;
        var isQuantized = false;

        if (defined(featureTableJson.POSITION)) {
            positions = featureTable.getPropertyArray('POSITION', ComponentDatatype.FLOAT, 3);
            var rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', ComponentDatatype.FLOAT, 3);
            if (defined(rtcCenter)) {
                content._rtcCenter = Cartesian3.unpack(rtcCenter);
            }
        } else if (defined(featureTableJson.POSITION_QUANTIZED)) {
            positions = featureTable.getPropertyArray('POSITION_QUANTIZED', ComponentDatatype.UNSIGNED_SHORT, 3);
            isQuantized = true;

            var quantizedVolumeScale = featureTable.getGlobalProperty('QUANTIZED_VOLUME_SCALE', ComponentDatatype.FLOAT, 3);
            if (!defined(quantizedVolumeScale)) {
                throw new RuntimeError('Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
            }
            content._quantizedVolumeScale = Cartesian3.unpack(quantizedVolumeScale);

            var quantizedVolumeOffset = featureTable.getGlobalProperty('QUANTIZED_VOLUME_OFFSET', ComponentDatatype.FLOAT, 3);
            if (!defined(quantizedVolumeOffset)) {
                throw new RuntimeError('Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
            }
            content._quantizedVolumeOffset = Cartesian3.unpack(quantizedVolumeOffset);
        }

        if (!defined(positions)) {
            throw new RuntimeError('Either POSITION or POSITION_QUANTIZED must be defined.');
        }

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
            var constantRGBA  = featureTable.getGlobalProperty('CONSTANT_RGBA', ComponentDatatype.UNSIGNED_BYTE, 4);
            content._constantColor = Color.fromBytes(constantRGBA[0], constantRGBA[1], constantRGBA[2], constantRGBA[3], content._constantColor);
        } else {
            // Use a default constant color
            content._constantColor = Color.clone(Color.DARKGRAY, content._constantColor);
        }

        content._isTranslucent = isTranslucent;

        // Get the normals
        var normals;
        var isOctEncoded16P = false;

        if (defined(featureTableJson.NORMAL)) {
            normals = featureTable.getPropertyArray('NORMAL', ComponentDatatype.FLOAT, 3);
        } else if (defined(featureTableJson.NORMAL_OCT16P)) {
            normals = featureTable.getPropertyArray('NORMAL_OCT16P', ComponentDatatype.UNSIGNED_BYTE, 2);
            isOctEncoded16P = true;
        }

        // Get the batchIds and batch table. BATCH_ID does not need to be defined when the point cloud has per-point properties.
        var batchIds;
        if (defined(featureTableJson.BATCH_ID)) {
            batchIds = featureTable.getPropertyArray('BATCH_ID', ComponentDatatype.UNSIGNED_SHORT, 1);

            var batchLength = featureTable.getGlobalProperty('BATCH_LENGTH');
            if (!defined(batchLength)) {
                throw new RuntimeError('Global property: BATCH_LENGTH must be defined when BATCH_ID is defined.');
            }

            if (defined(batchTableBinary)) {
                // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
                batchTableBinary = new Uint8Array(batchTableBinary);
            }
            content._batchTable = new Cesium3DTileBatchTable(content, batchLength, batchTableJson, batchTableBinary);
        }

        // If points are not batched and there are per-point properties, use these properties for styling purposes
        var styleableProperties;
        if (!defined(batchIds) && defined(batchTableBinary)) {
            styleableProperties = Cesium3DTileBatchTable.getBinaryProperties(pointsLength, batchTableJson, batchTableBinary);

            // WebGL does not support UNSIGNED_INT, INT, or DOUBLE vertex attributes. Convert these to FLOAT.
            for (var name in styleableProperties) {
                if (styleableProperties.hasOwnProperty(name)) {
                    var property = styleableProperties[name];
                    var typedArray = property.typedArray;
                    var componentDatatype = ComponentDatatype.fromTypedArray(typedArray);
                    if (componentDatatype === ComponentDatatype.INT || componentDatatype === ComponentDatatype.UNSIGNED_INT || componentDatatype === ComponentDatatype.DOUBLE) {
                        oneTimeWarning('Cast pnts property to floats', 'Point cloud property "' + name + '" will be casted to a float array because INT, UNSIGNED_INT, and DOUBLE are not valid WebGL vertex attribute types. Some precision may be lost.');
                        property.typedArray = new Float32Array(typedArray);
                    }
                }
            }
        }

        content._parsedContent = {
            positions : positions,
            colors : colors,
            normals : normals,
            batchIds : batchIds,
            styleableProperties : styleableProperties
        };
        content._pointsLength = pointsLength;
        content._isQuantized = isQuantized;
        content._isOctEncoded16P = isOctEncoded16P;
        content._isRGB565 = isRGB565;
        content._hasColors = defined(colors);
        content._hasNormals = defined(normals);
        content._hasBatchIds = defined(batchIds);
    }

    var scratchPointSizeAndTilesetTime = new Cartesian2();

    var positionLocation = 0;
    var colorLocation = 1;
    var normalLocation = 2;
    var batchIdLocation = 3;
    var numberOfAttributes = 4;

    function createResources(content, frameState) {
        var context = frameState.context;
        var parsedContent = content._parsedContent;
        var pointsLength = content._pointsLength;
        var positions = parsedContent.positions;
        var colors = parsedContent.colors;
        var normals = parsedContent.normals;
        var batchIds = parsedContent.batchIds;
        var styleableProperties = parsedContent.styleableProperties;
        var hasStyleableProperties = defined(styleableProperties);
        var isQuantized = content._isQuantized;
        var isOctEncoded16P = content._isOctEncoded16P;
        var isRGB565 = content._isRGB565;
        var isTranslucent = content._isTranslucent;
        var hasColors = content._hasColors;
        var hasNormals = content._hasNormals;
        var hasBatchIds = content._hasBatchIds;

        var batchTable = content._batchTable;
        var hasBatchTable = defined(batchTable);

        var styleableVertexAttributes = [];
        var styleableShaderAttributes = {};
        content._styleableShaderAttributes = styleableShaderAttributes;

        if (hasStyleableProperties) {
            var attributeLocation = numberOfAttributes;

            for (var name in styleableProperties) {
                if (styleableProperties.hasOwnProperty(name)) {
                    var property = styleableProperties[name];
                    var typedArray = property.typedArray;
                    var componentCount = property.componentCount;
                    var componentDatatype = ComponentDatatype.fromTypedArray(typedArray);

                    var vertexBuffer = Buffer.createVertexBuffer({
                        context : context,
                        typedArray : property.typedArray,
                        usage : BufferUsage.STATIC_DRAW
                    });

                    content._geometryByteLength += vertexBuffer.sizeInBytes;

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
                    styleableShaderAttributes[name] = {
                        location : attributeLocation,
                        componentCount : componentCount
                    };
                    ++attributeLocation;
                }
            }
        }

        var uniformMap = {
            u_pointSizeAndTilesetTime : function() {
                scratchPointSizeAndTilesetTime.x = content._pointSize;
                scratchPointSizeAndTilesetTime.y = content._tileset.timeSinceLoad;
                return scratchPointSizeAndTilesetTime;
            },
            u_highlightColor : function() {
                return content._highlightColor;
            },
            u_constantColor : function() {
                return content._constantColor;
            },
            u_clippingPlanesLength : function() {
                return content._packedClippingPlanes.length;
            },
            u_clippingPlanes : function() {
                return content._packedClippingPlanes;
            },
            u_clippingPlanesEdgeStyle : function() {
                var clippingPlanes = content._tileset.clippingPlanes;

                if (!defined(clippingPlanes)) {
                    return Color.WHITE.withAlpha(0.0);
                }

                var style = Color.clone(clippingPlanes.edgeColor);
                style.alpha = clippingPlanes.edgeWidth;
                return style;
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
        content._geometryByteLength += positionsVertexBuffer.sizeInBytes;

        var colorsVertexBuffer;
        if (hasColors) {
            colorsVertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : colors,
                usage : BufferUsage.STATIC_DRAW
            });
            content._geometryByteLength += colorsVertexBuffer.sizeInBytes;
        }

        var normalsVertexBuffer;
        if (hasNormals) {
            normalsVertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : normals,
                usage : BufferUsage.STATIC_DRAW
            });
            content._geometryByteLength += normalsVertexBuffer.sizeInBytes;
        }

        var batchIdsVertexBuffer;
        if (hasBatchIds) {
            batchIdsVertexBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : batchIds,
                usage : BufferUsage.STATIC_DRAW
            });
            content._geometryByteLength += batchIdsVertexBuffer.sizeInBytes;
        }

        var attributes = [];
        if (isQuantized) {
            attributes.push({
                index : positionLocation,
                vertexBuffer : positionsVertexBuffer,
                componentsPerAttribute : 3,
                componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
                normalize : true, // Convert position to 0 to 1 before entering the shader
                offsetInBytes : 0,
                strideInBytes : 0
            });
        } else {
            attributes.push({
                index : positionLocation,
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
                    index : colorLocation,
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
                    index : colorLocation,
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
                    index : normalLocation,
                    vertexBuffer : normalsVertexBuffer,
                    componentsPerAttribute : 2,
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    normalize : false,
                    offsetInBytes : 0,
                    strideInBytes : 0
                });
            } else {
                attributes.push({
                    index : normalLocation,
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
                index : batchIdLocation,
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

        var drawUniformMap = uniformMap;

        if (hasBatchTable) {
            drawUniformMap = batchTable.getUniformMapCallback()(uniformMap);
        }

        var pickUniformMap;

        if (hasBatchTable) {
            pickUniformMap = batchTable.getPickUniformMapCallback()(uniformMap);
        } else {
            content._pickId = context.createPickId({
                primitive : content._tileset,
                content : content
            });

            pickUniformMap = combine(uniformMap, {
                czm_pickColor : function() {
                    return content._pickId.color;
                }
            });
        }

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
            boundingVolume : undefined, // Updated in update
            cull : false, // Already culled by 3D Tiles
            modelMatrix : new Matrix4(),
            primitiveType : PrimitiveType.POINTS,
            vertexArray : vertexArray,
            count : pointsLength,
            shaderProgram : undefined, // Updated in createShaders
            uniformMap : drawUniformMap,
            renderState : isTranslucent ? content._translucentRenderState : content._opaqueRenderState,
            pass : isTranslucent ? Pass.TRANSLUCENT : Pass.CESIUM_3D_TILE,
            owner : content,
            castShadows : false,
            receiveShadows : false
        });

        content._pickCommand = new DrawCommand({
            boundingVolume : undefined, // Updated in update
            cull : false, // Already culled by 3D Tiles
            modelMatrix : new Matrix4(),
            primitiveType : PrimitiveType.POINTS,
            vertexArray : vertexArray,
            count : pointsLength,
            shaderProgram : undefined, // Updated in createShaders
            uniformMap : pickUniformMap,
            renderState : isTranslucent ? content._translucentRenderState : content._opaqueRenderState,
            pass : isTranslucent ? Pass.TRANSLUCENT : Pass.CESIUM_3D_TILE,
            owner : content
        });
    }

    var defaultProperties = ['POSITION', 'COLOR', 'NORMAL', 'POSITION_ABSOLUTE'];

    function getStyleableProperties(source, properties) {
        // Get all the properties used by this style
        var regex = /czm_tiles3d_style_(\w+)/g;
        var matches = regex.exec(source);
        while (matches !== null) {
            var name = matches[1];
            if (properties.indexOf(name) === -1) {
                properties.push(name);
            }
            matches = regex.exec(source);
        }
    }

    function getVertexAttribute(vertexArray, index) {
        var numberOfAttributes = vertexArray.numberOfAttributes;
        for (var i = 0; i < numberOfAttributes; ++i) {
            var attribute = vertexArray.getAttribute(i);
            if (attribute.index === index) {
                return attribute;
            }
        }
    }

    function modifyStyleFunction(source) {
        // Replace occurrences of czm_tiles3d_style_DEFAULTPROPERTY
        var length = defaultProperties.length;
        for (var i = 0; i < length; ++i) {
            var property = defaultProperties[i];
            var styleName = 'czm_tiles3d_style_' + property;
            var replaceName = property.toLowerCase();
            source = source.replace(new RegExp(styleName + '(\\W)', 'g'), replaceName + '$1');
        }

        // Edit the function header to accept the point position, color, and normal
        return source.replace('()', '(vec3 position, vec3 position_absolute, vec4 color, vec3 normal)');
    }

    function createShaders(content, frameState, style) {
        var i;
        var name;
        var attribute;

        var context = frameState.context;
        var batchTable = content._batchTable;
        var hasBatchTable = defined(batchTable);
        var hasStyle = defined(style);
        var isQuantized = content._isQuantized;
        var isOctEncoded16P = content._isOctEncoded16P;
        var isRGB565 = content._isRGB565;
        var isTranslucent = content._isTranslucent;
        var hasColors = content._hasColors;
        var hasNormals = content._hasNormals;
        var hasBatchIds = content._hasBatchIds;
        var backFaceCulling = content._backFaceCulling;
        var vertexArray = content._drawCommand.vertexArray;
        var clippingPlanes = content._tileset.clippingPlanes;

        var colorStyleFunction;
        var showStyleFunction;
        var pointSizeStyleFunction;
        var styleTranslucent = isTranslucent;

        if (hasBatchTable) {
            // Styling is handled in the batch table
            hasStyle = false;
        }

        if (hasStyle) {
            var shaderState = {
                translucent : false
            };
            colorStyleFunction = style.getColorShaderFunction('getColorFromStyle', 'czm_tiles3d_style_', shaderState);
            showStyleFunction = style.getShowShaderFunction('getShowFromStyle', 'czm_tiles3d_style_', shaderState);
            pointSizeStyleFunction = style.getPointSizeShaderFunction('getPointSizeFromStyle', 'czm_tiles3d_style_', shaderState);
            if (defined(colorStyleFunction) && shaderState.translucent) {
                styleTranslucent = true;
            }
        }

        content._styleTranslucent = styleTranslucent;

        var hasColorStyle = defined(colorStyleFunction);
        var hasShowStyle = defined(showStyleFunction);
        var hasPointSizeStyle = defined(pointSizeStyleFunction);
        var hasClippedContent = defined(clippingPlanes) && clippingPlanes.enabled && content._tile._isClipped && !FeatureDetection.isInternetExplorer();

        // Get the properties in use by the style
        var styleableProperties = [];

        if (hasColorStyle) {
            getStyleableProperties(colorStyleFunction, styleableProperties);
            colorStyleFunction = modifyStyleFunction(colorStyleFunction);
        }
        if (hasShowStyle) {
            getStyleableProperties(showStyleFunction, styleableProperties);
            showStyleFunction = modifyStyleFunction(showStyleFunction);
        }
        if (hasPointSizeStyle) {
            getStyleableProperties(pointSizeStyleFunction, styleableProperties);
            pointSizeStyleFunction = modifyStyleFunction(pointSizeStyleFunction);
        }

        var usesColorSemantic = styleableProperties.indexOf('COLOR') >= 0;
        var usesNormalSemantic = styleableProperties.indexOf('NORMAL') >= 0;

        // Split default properties from user properties
        var userProperties = styleableProperties.filter(function(property) { return defaultProperties.indexOf(property) === -1; });

        if (usesNormalSemantic && !hasNormals) {
            throw new RuntimeError('Style references the NORMAL semantic but the point cloud does not have normals');
        }

        // Disable vertex attributes that aren't used in the style, enable attributes that are
        var styleableShaderAttributes = content._styleableShaderAttributes;
        for (name in styleableShaderAttributes) {
            if (styleableShaderAttributes.hasOwnProperty(name)) {
                attribute = styleableShaderAttributes[name];
                var enabled = (userProperties.indexOf(name) >= 0);
                var vertexAttribute = getVertexAttribute(vertexArray, attribute.location);
                vertexAttribute.enabled = enabled;
            }
        }

        var usesColors = hasColors && (!hasColorStyle || usesColorSemantic);
        if (hasColors) {
            // Disable the color vertex attribute if the color style does not reference the color semantic
            var colorVertexAttribute = getVertexAttribute(vertexArray, colorLocation);
            colorVertexAttribute.enabled = usesColors;
        }

        var attributeLocations = {
            a_position : positionLocation
        };
        if (usesColors) {
            attributeLocations.a_color = colorLocation;
        }
        if (hasNormals) {
            attributeLocations.a_normal = normalLocation;
        }
        if (hasBatchIds) {
            attributeLocations.a_batchId = batchIdLocation;
        }

        var attributeDeclarations = '';

        var length = userProperties.length;
        for (i = 0; i < length; ++i) {
            name = userProperties[i];
            attribute = styleableShaderAttributes[name];
            if (!defined(attribute)) {
                throw new RuntimeError('Style references a property "' + name + '" that does not exist or is not styleable.');
            }

            var componentCount = attribute.componentCount;
            var attributeName = 'czm_tiles3d_style_' + name;
            var attributeType;
            if (componentCount === 1) {
                attributeType = 'float';
            } else {
                attributeType = 'vec' + componentCount;
            }

            attributeDeclarations += 'attribute ' + attributeType + ' ' + attributeName + '; \n';
            attributeLocations[attributeName] = attribute.location;
        }

        var vs = 'attribute vec3 a_position; \n' +
                 'varying vec4 v_color; \n' +
                 'uniform vec2 u_pointSizeAndTilesetTime; \n' +
                 'uniform vec4 u_constantColor; \n' +
                 'uniform vec4 u_highlightColor; \n' +
                 'float u_pointSize; \n' +
                 'float u_tilesetTime; \n';

        vs += attributeDeclarations;

        if (usesColors) {
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

        if (isQuantized) {
            vs += 'uniform vec3 u_quantizedVolumeScale; \n';
        }

        if (hasColorStyle) {
            vs += colorStyleFunction;
        }

        if (hasShowStyle) {
            vs += showStyleFunction;
        }

        if (hasPointSizeStyle) {
            vs += pointSizeStyleFunction;
        }

        vs += 'void main() \n' +
              '{ \n' +
              '    u_pointSize = u_pointSizeAndTilesetTime.x; \n' +
              '    u_tilesetTime = u_pointSizeAndTilesetTime.y; \n';

        if (usesColors) {
            if (isTranslucent) {
                vs += '    vec4 color = a_color; \n';
            } else if (isRGB565) {
                vs += '    float compressed = a_color; \n' +
                      '    float r = floor(compressed * SHIFT_RIGHT_11); \n' +
                      '    compressed -= r * SHIFT_LEFT_11; \n' +
                      '    float g = floor(compressed * SHIFT_RIGHT_5); \n' +
                      '    compressed -= g * SHIFT_LEFT_5; \n' +
                      '    float b = compressed; \n' +
                      '    vec3 rgb = vec3(r * NORMALIZE_5, g * NORMALIZE_6, b * NORMALIZE_5); \n' +
                      '    vec4 color = vec4(rgb, 1.0); \n';
            } else {
                vs += '    vec4 color = vec4(a_color, 1.0); \n';
            }
        } else {
            vs += '    vec4 color = u_constantColor; \n';
        }

        if (isQuantized) {
            vs += '    vec3 position = a_position * u_quantizedVolumeScale; \n';
        } else {
            vs += '    vec3 position = a_position; \n';
        }
        vs += '    vec3 position_absolute = vec3(czm_model * vec4(position, 1.0)); \n';

        if (hasNormals) {
            if (isOctEncoded16P) {
                vs += '    vec3 normal = czm_octDecode(a_normal); \n';
            } else {
                vs += '    vec3 normal = a_normal; \n';
            }
        } else {
            vs += '    vec3 normal = vec3(1.0); \n';
        }

        if (hasColorStyle) {
            vs += '    color = getColorFromStyle(position, position_absolute, color, normal); \n';
        }

        if (hasShowStyle) {
            vs += '    float show = float(getShowFromStyle(position, position_absolute, color, normal)); \n';
        }

        if (hasPointSizeStyle) {
            vs += '    gl_PointSize = getPointSizeFromStyle(position, position_absolute, color, normal); \n';
        } else {
            vs += '    gl_PointSize = u_pointSize; \n';
        }

        vs += '    color = color * u_highlightColor; \n';

        if (hasNormals) {
            vs += '    normal = czm_normal * normal; \n' +
                  '    float diffuseStrength = czm_getLambertDiffuse(czm_sunDirectionEC, normal); \n' +
                  '    diffuseStrength = max(diffuseStrength, 0.4); \n' + // Apply some ambient lighting
                  '    color *= diffuseStrength; \n';
        }

        vs += '    v_color = color; \n' +
              '    gl_Position = czm_modelViewProjection * vec4(position, 1.0); \n';

        if (hasNormals && backFaceCulling) {
            vs += '    float visible = step(-normal.z, 0.0); \n' +
                  '    gl_Position *= visible; \n' +
                  '    gl_PointSize *= visible; \n';
        }

        if (hasShowStyle) {
            vs += '    gl_Position *= show; \n' +
                  '    gl_PointSize *= show; \n';
        }

        vs += '} \n';

        var fs = 'varying vec4 v_color; \n';

        if (hasClippedContent) {
            fs += 'uniform int u_clippingPlanesLength;' +
                  'uniform vec4 u_clippingPlanes[czm_maxClippingPlanes]; \n' +
                  'uniform vec4 u_clippingPlanesEdgeStyle; \n';
        }

        fs +=  'void main() \n' +
               '{ \n' +
               '    gl_FragColor = v_color; \n';

        if (hasClippedContent) {
            var clippingFunction = clippingPlanes.unionClippingRegions ? 'czm_discardIfClippedWithUnion' : 'czm_discardIfClippedWithIntersect';
            fs += '    float clipDistance = ' + clippingFunction + '(u_clippingPlanes, u_clippingPlanesLength); \n' +
                  '    vec4 clippingPlanesEdgeColor = vec4(1.0); \n' +
                  '    clippingPlanesEdgeColor.rgb = u_clippingPlanesEdgeStyle.rgb; \n' +
                  '    float clippingPlanesEdgeWidth = u_clippingPlanesEdgeStyle.a; \n' +
                  '    if (clipDistance > 0.0 && clipDistance < clippingPlanesEdgeWidth) \n' +
                  '    { \n' +
                  '        gl_FragColor = clippingPlanesEdgeColor; \n' +
                  '    } \n';
        }

        fs += '} \n';

        var drawVS = vs;
        var drawFS = fs;

        if (hasBatchTable) {
            // Batched points always use the HIGHLIGHT color blend mode
            drawVS = batchTable.getVertexShaderCallback(false, 'a_batchId')(drawVS);
            drawFS = batchTable.getFragmentShaderCallback(false, undefined)(drawFS);
        }

        var pickVS = vs;
        var pickFS = fs;

        if (hasBatchTable) {
            pickVS = batchTable.getPickVertexShaderCallback('a_batchId')(pickVS);
            pickFS = batchTable.getPickFragmentShaderCallback()(pickFS);
        } else {
            pickFS = ShaderSource.createPickFragmentShaderSource(pickFS, 'uniform');
        }

        var drawCommand = content._drawCommand;
        if (defined(drawCommand.shaderProgram)) {
            // Destroy the old shader
            drawCommand.shaderProgram.destroy();
        }
        drawCommand.shaderProgram = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : drawVS,
            fragmentShaderSource : drawFS,
            attributeLocations : attributeLocations
        });

        var pickCommand = content._pickCommand;
        if (defined(pickCommand.shaderProgram)) {
            // Destroy the old shader
            pickCommand.shaderProgram.destroy();
        }
        pickCommand.shaderProgram = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : pickVS,
            fragmentShaderSource : pickFS,
            attributeLocations : attributeLocations
        });

        try {
            // Check if the shader compiles correctly. If not there is likely a syntax error with the style.
            drawCommand.shaderProgram._bind();
        } catch (error) {
            // Rephrase the error.
            throw new RuntimeError('Error generating style shader: this may be caused by a type mismatch, index out-of-bounds, or other syntax error.');
        }
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
    PointCloud3DTileContent.prototype.hasProperty = function(batchId, name) {
        if (defined(this._batchTable)) {
            return this._batchTable.hasProperty(batchId, name);
        }
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     *
     * In this context a feature refers to a group of points that share the same BATCH_ID.
     * For example all the points that represent a door in a house point cloud would be a feature.
     *
     * Features are backed by a batch table and can be colored, shown/hidden, picked, etc like features
     * in b3dm and i3dm.
     *
     * When the BATCH_ID semantic is omitted and the point cloud stores per-point properties, they
     * are not accessible by getFeature. They are only used for dynamic styling.
     */
    PointCloud3DTileContent.prototype.getFeature = function(batchId) {
        if (!defined(this._batchTable)) {
            return undefined;
        }
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
    PointCloud3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        this._highlightColor = enabled ? color : Color.WHITE;
    };

    /**
     * @inheritdoc Cesium3DTileContent#applyStyle
     */
    PointCloud3DTileContent.prototype.applyStyle = function(frameState, style) {
        if (defined(this._batchTable)) {
            this._batchTable.applyStyle(frameState, style);
        } else {
            createShaders(this, frameState, style);
        }
    };

    var scratchComputedTranslation = new Cartesian4();
    var scratchComputedMatrixIn2D = new Matrix4();

    /**
     * @inheritdoc Cesium3DTileContent#update
     */
    PointCloud3DTileContent.prototype.update = function(tileset, frameState) {
        var modelMatrix = this._tile.computedTransform;
        var modelMatrixChanged = !Matrix4.equals(this._modelMatrix, modelMatrix);
        var updateModelMatrix = modelMatrixChanged || this._mode !== frameState.mode;

        this._mode = frameState.mode;

        var context = frameState.context;

        // update clipping planes
        var clippingPlanes = this._tileset.clippingPlanes;
        var clippingEnabled = defined(clippingPlanes) && clippingPlanes.enabled && this._tile._isClipped;

        var unionClippingRegions = false;
        var length = 0;
        if (clippingEnabled) {
            unionClippingRegions = clippingPlanes.unionClippingRegions;
            length = clippingPlanes.length;
        }

        var packedPlanes = this._packedClippingPlanes;
        var packedLength = packedPlanes.length;
        if (packedLength !== length) {
            packedPlanes.length = length;

            for (var i = 0; i < length; ++i) {
                packedPlanes[i] = new Cartesian4();
            }
        }

        if (!defined(this._drawCommand)) {
            createResources(this, frameState);
            createShaders(this, frameState, tileset.style);
            updateModelMatrix = true;

            this._readyPromise.resolve(this);
            this._parsedContent = undefined; // Unload
        }

        if (this._isClipped !== clippingEnabled || this._unionClippingRegions !== unionClippingRegions) {
            this._isClipped = clippingEnabled;
            this._unionClippingRegions = unionClippingRegions;

            createShaders(this, frameState, tileset.style);
        }

        if (updateModelMatrix) {
            Matrix4.clone(modelMatrix, this._modelMatrix);
            if (defined(this._rtcCenter)) {
                Matrix4.multiplyByTranslation(modelMatrix, this._rtcCenter, this._drawCommand.modelMatrix);
            } else if (defined(this._quantizedVolumeOffset)) {
                Matrix4.multiplyByTranslation(modelMatrix, this._quantizedVolumeOffset, this._drawCommand.modelMatrix);
            } else {
                Matrix4.clone(modelMatrix, this._drawCommand.modelMatrix);
            }

            if (frameState.mode !== SceneMode.SCENE3D) {
                var projection = frameState.mapProjection;
                modelMatrix = this._drawCommand.modelMatrix;
                var translation = Matrix4.getColumn(modelMatrix, 3, scratchComputedTranslation);
                if (!Cartesian4.equals(translation, Cartesian4.UNIT_W)) {
                    Transforms.basisTo2D(projection, modelMatrix, modelMatrix);
                } else {
                    var center = this._tile.boundingSphere.center;
                    var to2D = Transforms.wgs84To2DModelMatrix(projection, center, scratchComputedMatrixIn2D);
                    Matrix4.multiply(to2D, modelMatrix, modelMatrix);
                }
            }

            Matrix4.clone(this._drawCommand.modelMatrix, this._pickCommand.modelMatrix);

            var boundingVolume;
            if (defined(this._tile._contentBoundingVolume)) {
                boundingVolume = this._mode === SceneMode.SCENE3D ? this._tile._contentBoundingVolume.boundingSphere : this._tile._contentBoundingVolume2D.boundingSphere;
            } else {
                boundingVolume = this._mode === SceneMode.SCENE3D ? this._tile._boundingVolume.boundingSphere : this._tile._boundingVolume2D.boundingSphere;
            }

            this._drawCommand.boundingVolume = boundingVolume;
            this._pickCommand.boundingVolume = boundingVolume;
        }

        if (clippingEnabled) {
            Matrix4.multiply(context.uniformState.view3D, modelMatrix, this._modelViewMatrix);
            clippingPlanes.transformAndPackPlanes(this._modelViewMatrix, packedPlanes);
        }

        this._drawCommand.castShadows = ShadowMode.castShadows(tileset.shadows);
        this._drawCommand.receiveShadows = ShadowMode.receiveShadows(tileset.shadows);

        if (this.backFaceCulling !== this._backFaceCulling) {
            this._backFaceCulling = this.backFaceCulling;
            createShaders(this, frameState, tileset.style);
        }

        // Update the render state
        var isTranslucent = (this._highlightColor.alpha < 1.0) || (this._constantColor.alpha < 1.0) || this._styleTranslucent;
        this._drawCommand.renderState = isTranslucent ? this._translucentRenderState : this._opaqueRenderState;
        this._drawCommand.pass = isTranslucent ? Pass.TRANSLUCENT : Pass.CESIUM_3D_TILE;

        if (defined(this._batchTable)) {
            this._batchTable.update(tileset, frameState);
        }

        var commandList = frameState.commandList;

        var passes = frameState.passes;
        if (passes.render) {
            commandList.push(this._drawCommand);
        }
        if (passes.pick) {
            commandList.push(this._pickCommand);
        }
    };

    /**
     * @inheritdoc Cesium3DTileContent#isDestroyed
     */
    PointCloud3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc Cesium3DTileContent#destroy
     */
    PointCloud3DTileContent.prototype.destroy = function() {
        var command = this._drawCommand;
        var pickCommand = this._pickCommand;
        if (defined(command)) {
            command.vertexArray = command.vertexArray && command.vertexArray.destroy();
            command.shaderProgram = command.shaderProgram && command.shaderProgram.destroy();
            pickCommand.shaderProgram = pickCommand.shaderProgram && pickCommand.shaderProgram.destroy();
        }
        this._batchTable = this._batchTable && this._batchTable.destroy();
        return destroyObject(this);
    };

    return PointCloud3DTileContent;
});
