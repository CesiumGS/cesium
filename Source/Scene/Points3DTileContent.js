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
        './Cesium3DTileContentState',
        './Cesium3DTileFeatureTableResources',
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
        Cesium3DTileContentState,
        Cesium3DTileFeatureTableResources,
        Pass) {
    'use strict';

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Points/README.md|Points}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias Points3DTileContent
     * @constructor
     *
     * @private
     */
    function Points3DTileContent(tileset, tile, url) {
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;

        // Hold onto the payload until the render resources are created
        this._parsedContent = undefined;

        this._drawCommand = undefined;
        this._pickCommand = undefined;
        this._pickId = undefined;
        this._isTranslucent = false;
        this._constantColor = Color.clone(Color.WHITE);
        this._rtcCenter = undefined;

        this._opaqueRenderState = undefined;
        this._translucentRenderState = undefined;

        // Uniforms
        this._highlightColor = this._constantColor;
        this._pointSize = 2.0;
        this._quantizedVolumeScale = undefined;

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;
        this.batchTableResources = undefined;
        this.featurePropertiesDirty = false;

        this._contentReadyToProcessPromise = when.defer();
        this._readyPromise = when.defer();
    }

    defineProperties(Points3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                // TODO: implement batchTable for pnts tile format
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

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.hasProperty = function(name) {
        // TODO: implement batchTable for pnts tile format
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.getFeature = function(batchId) {
        // TODO: implement batchTable for pnts tile format
        return undefined;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.request = function() {
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
    Points3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
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

        var featureTableJSONByteLength = view.getUint32(byteOffset, true);
        //>>includeStart('debug', pragmas.debug);
        if (featureTableJSONByteLength === 0) {
            throw new DeveloperError('Feature table must have a byte length greater than zero');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJSONByteLength);
        var featureTableJSON = JSON.parse(featureTableString);
        byteOffset += featureTableJSONByteLength;

        var featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
        byteOffset += featureTableBinaryByteLength;

        var featureTableResources = new Cesium3DTileFeatureTableResources(featureTableJSON, featureTableBinary);

        var pointsLength = featureTableResources.getGlobalProperty('POINTS_LENGTH');
        featureTableResources.featuresLength = pointsLength;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(pointsLength)) {
            throw new DeveloperError('Feature table global property: POINTS_LENGTH must be defined');
        }
        //>>includeEnd('debug');

        // Get the positions
        var positions;
        var isQuantized = false;

        if (defined(featureTableJSON.POSITION)) {
            positions = featureTableResources.getPropertyArray('POSITION', ComponentDatatype.FLOAT, 3);
            var rtcCenter = featureTableResources.getGlobalProperty('RTC_CENTER');
            if (defined(rtcCenter)) {
                this._rtcCenter = Cartesian3.unpack(rtcCenter);
            }
        } else if (defined(featureTableJSON.POSITION_QUANTIZED)) {
            positions = featureTableResources.getPropertyArray('POSITION_QUANTIZED', ComponentDatatype.UNSIGNED_SHORT, 3);
            isQuantized = true;

            var quantizedVolumeScale = featureTableResources.getGlobalProperty('QUANTIZED_VOLUME_SCALE');
            //>>includeStart('debug', pragmas.debug);
            if (!defined(quantizedVolumeScale)) {
                throw new DeveloperError('Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
            }
            //>>includeEnd('debug');
            this._quantizedVolumeScale = Cartesian3.unpack(quantizedVolumeScale);

            var quantizedVolumeOffset = featureTableResources.getGlobalProperty('QUANTIZED_VOLUME_OFFSET');
            //>>includeStart('debug', pragmas.debug);
            if (!defined(quantizedVolumeOffset)) {
                throw new DeveloperError('Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
            }
            //>>includeEnd('debug');
            this._rtcCenter = Cartesian3.unpack(quantizedVolumeOffset);
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('Either POSITION or POSITION_QUANTIZED must be defined.');
        }
        //>>includeEnd('debug');

        // Get the colors
        var colors;
        var isTranslucent = false;

        if (defined(featureTableJSON.RGBA)) {
            colors = featureTableResources.getPropertyArray('RGBA', ComponentDatatype.UNSIGNED_BYTE, 4);
            isTranslucent = true;
        } else if (defined(featureTableJSON.RGB)) {
            colors = featureTableResources.getPropertyArray('RGB', ComponentDatatype.UNSIGNED_BYTE, 3);
        } else if (defined(featureTableJSON.CONSTANT_RGBA)) {
            var constantRGBA  = featureTableResources.getGlobalProperty('CONSTANT_RGBA');
            this._constantColor = Color.fromBytes(constantRGBA[0], constantRGBA[1], constantRGBA[2], constantRGBA[3], this._constantColor);
        } else {
            // Use a default constant color
            this._constantColor = Color.clone(Color.DARKGRAY, this._constantColor);
        }

        this._isTranslucent = isTranslucent;

        // Get the normals
        var normals;
        var isOctEncoded16P = false;

        if (defined(featureTableJSON.NORMAL)) {
            normals = featureTableResources.getPropertyArray('NORMAL', ComponentDatatype.FLOAT, 3);
        } else if (defined(featureTableJSON.NORMAL_OCT16P)) {
            normals = featureTableResources.getPropertyArray('NORMAL_OCT16P', ComponentDatatype.UNSIGNED_BYTE, 2);
            isOctEncoded16P = true;
        }

        this._parsedContent = {
            pointsLength : pointsLength,
            positions : positions,
            colors : colors,
            normals : normals,
            isQuantized : isQuantized,
            isOctEncoded16P : isOctEncoded16P
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
        var isQuantized = parsedContent.isQuantized;
        var isOctEncoded16P = parsedContent.isOctEncoded16P;
        var isTranslucent = content._isTranslucent;

        var hasColors = defined(colors);
        var hasNormals = defined(normals);

        var vs = 'attribute vec3 a_position; \n' +
                 'varying vec4 v_color; \n' +
                 'uniform float u_pointSize; \n' +
                 'uniform vec4 u_highlightColor; \n';

        if (hasColors) {
            if (isTranslucent) {
                vs += 'attribute vec4 a_color; \n';
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

        if (isQuantized) {
            vs += 'uniform vec3 u_quantizedVolumeScale; \n';
        }

        vs += 'void main() \n' +
              '{ \n';

        if (hasColors) {
            if (isTranslucent) {
                vs += '    vec4 color = a_color * u_highlightColor; \n';
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
            // Transform a_position from [0 to 1] to [-0.5 to 0.5] before scaling
            vs += '    vec3 position = (a_position - 0.5) * u_quantizedVolumeScale; \n';
        } else {
            vs += '    vec3 position = a_position; \n';
        }

        vs += '    v_color = color; \n' +
              '    gl_Position = czm_modelViewProjection * vec4(position, 1.0); \n' +
              '    gl_PointSize = u_pointSize; \n' +
              '} \n';

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

        var positionAttributeLocation = 0;
        var colorAttributeLocation = 1;
        var normalAttributeLocation = 2;

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

        var shaderProgram = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
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
            uniformMap : uniformMap,
            renderState : isTranslucent ? content._translucentRenderState : content._opaqueRenderState,
            pass : isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE,
            owner : content
        });

        content._pickId = context.createPickId({
            primitive : content
        });

        var pickUniformMap = combine(uniformMap, {
            czm_pickColor : function() {
                return content._pickId.color;
            }
        });

        var pickVS = vs;
        var pickFS = ShaderSource.createPickFragmentShaderSource(fs, 'uniform');

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
    Points3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        this._highlightColor = enabled ? color : this._constantColor;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.update = function(tileset, frameState) {
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
            } else {
                Matrix4.clone(this._tile.computedTransform, this._drawCommand.modelMatrix);
            }
            Matrix4.clone(this._drawCommand.modelMatrix, this._pickCommand.modelMatrix);
        }

        // Update the render state
        var isTranslucent = (this._highlightColor.alpha < 1.0) || this._isTranslucent;
        this._drawCommand.renderState = isTranslucent ? this._translucentRenderState : this._opaqueRenderState;
        this._drawCommand.pass = isTranslucent ? Pass.TRANSLUCENT : Pass.OPAQUE;

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
    Points3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.destroy = function() {
        var command = this._drawCommand;
        var pickCommand = this._pickCommand;
        if (defined(command)) {
            command.vertexArray = command.vertexArray && command.vertexArray.destroy();
            command.shaderProgram = command.shaderProgram && command.shaderProgram.destroy();
            pickCommand.shaderProgram = pickCommand.shaderProgram && pickCommand.shaderProgram.destroy();
        }
        return destroyObject(this);
    };

    return Points3DTileContent;
});
