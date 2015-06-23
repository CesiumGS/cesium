/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/clone',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/PixelFormat',
        '../Renderer/Context',
        '../Renderer/PixelDatatype',
        '../Renderer/ShaderSource',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureMagnificationFilter',
        './Cesium3DTileContentState',
        './Model',
        './BatchedModel',
        '../ThirdParty/when'
    ], function(
        Cartesian2,
        Cartesian4,
        clone,
        Color,
        combine,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getStringFromTypedArray,
        loadArrayBuffer,
        PixelFormat,
        Context,
        PixelDatatype,
        ShaderSource,
        TextureMinificationFilter,
        TextureMagnificationFilter,
        Cesium3DTileContentState,
        Model,
        BatchedModel,
        when) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Batched3DModel3DTileContentProvider = function(tileset, url, contentHeader) {
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
        this._batchSize = batchSize;    // Number of models, e.g., buildings, batched into the glTF model.
        this._batchValues = undefined;  // Per-model show/color
        this._batchValuesDirty = false;
        this._batchTexture = undefined;
        this._defaultTexture = undefined;

        this._pickTexture = undefined;
        this._pickIds = [];

        this._batchTable = undefined;
        this._models = undefined;

        // Dimensions for batch and pick textures
        var textureDimensions;
        var textureStep;

        if (batchSize > 0) {
            // PERFORMANCE_IDEA: this can waste memory in the last row in the uncommon case
            // when more than one row is needed (e.g., > 16K models in one tile)
            var width = Math.min(batchSize, Context.maximumTextureSize);
            var height = Math.ceil(batchSize / Context.maximumTextureSize);
            var stepX = 1.0 / width;
            var centerX = stepX * 0.5;
            var stepY = 1.0 / height;
            var centerY = stepY * 0.5;

            textureDimensions = new Cartesian2(width, height);
            textureStep = new Cartesian4(stepX, centerX, stepY, centerY);
        }

        this._textureDimensions = textureDimensions;
        this._textureStep = textureStep;

        this._debugColor = Color.fromRandom({ alpha : 1.0 });
        this._debugColorizeTiles = false;
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

    function getByteLength(content) {
        var dimensions = content._textureDimensions;
        return (dimensions.x * dimensions.y) * 4;
    }

    function getBatchValues(content) {
        if (!defined(content._batchValues)) {
            // Default batch texture to RGBA = 255: white highlight (RGB) and show = true (A).
            var byteLength = getByteLength(content);
            var bytes = new Uint8Array(byteLength);
            for (var i = 0; i < byteLength; ++i) {
                bytes[i] = 255;
            }

            content._batchValues = bytes;
        }

        return content._batchValues;
    }

    /**
     * Use BatchedModel#show
     *
     * @private
     */
    Batched3DModel3DTileContentProvider.prototype.setShow = function(batchId, value) {
        var batchSize = this._batchSize;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + batchSize - + ').');
        }

        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        if (value && !defined(this._batchValues)) {
            // Avoid allocating since the default is show = true
            return;
        }

        var batchValues = getBatchValues(this);
        var offset = (batchId * 4) + 3; // Store show/hide in alpha
        var newValue = value ? 255 : 0;

        if (batchValues[offset] !== newValue) {
            batchValues[offset] = newValue;
            this._batchValuesDirty = true;
        }
    };

    /**
     * Use BatchedModel#show
     *
     * @private
     */
    Batched3DModel3DTileContentProvider.prototype.getShow = function(batchId) {
        var batchSize = this._batchSize;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + batchSize - + ').');
        }
        //>>includeEnd('debug');

        if (!defined(this._batchValues)) {
            // Batched models default to true
            return true;
        }

        var offset = (batchId * 4) + 3; // Store show/hide in alpha
        return this._batchValues[offset] === 255;
    };

    var scratchColor = new Array(4);

    /**
     * Use BatchedModel#color
     *
     * @private
     */
    Batched3DModel3DTileContentProvider.prototype.setColor = function(batchId, value) {
        var batchSize = this._batchSize;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + batchSize - + ').');
        }

        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        if (Color.equals(value, Color.WHITE) && !defined(this._batchValues)) {
            // Avoid allocating since the default is white
            return;
        }

        var batchValues = getBatchValues(this);
        var offset = batchId * 4;
        var newValue = value.toBytes(scratchColor);

        if ((batchValues[offset] !== newValue[0]) ||
                (batchValues[offset + 1] !== newValue[1]) ||
                (batchValues[offset + 2] !== newValue[2])) {
            batchValues[offset] = newValue[0];
            batchValues[offset + 1] = newValue[1];
            batchValues[offset + 2] = newValue[2];
            this._batchValuesDirty = true;
        }
    };

    /**
     * @private
     */
    Batched3DModel3DTileContentProvider.prototype.setAllColor = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var batchSize = this._batchSize;
        for (var i = 0; i < batchSize; ++i) {
            // PERFORMANCE_IDEA: duplicate part of setColor here to factor things out of the loop
            this.setColor(i, value);
        }
    };

    /**
     * Use BatchedModel#color
     *
     * @private
     */
    Batched3DModel3DTileContentProvider.prototype.getColor = function(batchId, color) {
        var batchSize = this._batchSize;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + batchSize - + ').');
        }

        if (!defined(color)) {
            throw new DeveloperError('color is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this._batchValues)) {
            // Batched models default to WHITE
            return Color.clone(Color.WHITE, color);
        }

        var batchValues = this._batchValues;
        var offset = batchId * 4;
        return Color.fromBytes(batchValues[offset], batchValues[offset + 1], batchValues[offset + 2], 255, color);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * DOC_TBA
     */
    Batched3DModel3DTileContentProvider.prototype.hasProperty = function(name) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        var batchTable = this._batchTable;
        return defined(batchTable) && defined(batchTable[name]);
    };

    /**
     * DOC_TBA
     *
     * This may return different values from call to call if {@link BatchedModel#setProperty}
     * is used to add new properties.
     */
    Batched3DModel3DTileContentProvider.prototype.getPropertyNames = function() {
        var names = [];
        var batchTable = this._batchTable;

        if (!batchTable) {
            return names;
        }

        for (var name in batchTable) {
            if (batchTable.hasOwnProperty(name)) {
                names.push(name);
            }
        }

        return names;
    };

    /**
     * Use BatchedModel#getProperty
     *
     * @private
     */
    Batched3DModel3DTileContentProvider.prototype.getProperty = function(batchId, name) {
        var batchSize = this._batchSize;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + batchSize - + ').');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this._batchTable)) {
            return undefined;
        }

        var propertyValues = this._batchTable[name];

        if (!defined(propertyValues)) {
            return undefined;
        }

        return clone(propertyValues[batchId], true);
    };

    /**
     * Use BatchedModel#setProperty
     *
     * @private
     */
    Batched3DModel3DTileContentProvider.prototype.setProperty = function(batchId, name, value) {
        var batchSize = this._batchSize;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + batchSize - + ').');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this._batchTable)) {
            // Tile payload did not have a batch table.  Create one for new user-defined properties.
            this._batchTable = {};
        }

        var propertyValues = this._batchTable[name];

        if (!defined(propertyValues)) {
            // Property does not exist.  Create it.
            this._batchTable[name] = new Array(batchSize);
            propertyValues = this._batchTable[name];
        }

        propertyValues[batchId] = clone(value, true);
    };

    ///////////////////////////////////////////////////////////////////////////

    function createModels(content) {
        var tileset = content._tileset;
        var batchSize = content._batchSize;
        if (!defined(content._models) && (batchSize > 0)) {
            var models = new Array(batchSize);
            for (var i = 0; i < batchSize; ++i) {
                models[i] = new BatchedModel(tileset, content, i);
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
        if (!defined(batchId) || (batchId < 0) || (batchId > batchSize)) {
            throw new DeveloperError('batchId is required and between zero and batchSize - 1 (' + batchSize - + ').');
        }
        //>>includeEnd('debug');

        createModels(this);
        return this._models[batchId];
    };

    ///////////////////////////////////////////////////////////////////////////

    function getGlslComputeSt(content) {
        // GLSL batchId is zero-based: [0, batchSize - 1]
        if (content._textureDimensions.y === 1) {
            return 'uniform vec4 tiles3d_textureStep; \n' +
                'vec2 computeSt(float batchId) \n' +
                '{ \n' +
                '    float stepX = tiles3d_textureStep.x; \n' +
                '    float centerX = tiles3d_textureStep.y; \n' +
                '    return vec2(centerX + (batchId * stepX), 0.5); \n' +
                '} \n';
        }

        return 'uniform vec4 tiles3d_textureStep; \n' +
            'uniform vec2 tiles3d_textureDimensions; \n' +
            'vec2 computeSt(float batchId) \n' +
            '{ \n' +
            '    float stepX = tiles3d_textureStep.x; \n' +
            '    float centerX = tiles3d_textureStep.y; \n' +
            '    float stepY = tiles3d_textureStep.z; \n' +
            '    float centerY = tiles3d_textureStep.w; \n' +
            '    float xId = mod(batchId, tiles3d_textureDimensions.x); \n' +
            '    float yId = floor(batchId / tiles3d_textureDimensions.x); \n' +
            '    return vec2(centerX + (xId * stepX), 1.0 - (centerY + (yId * stepY))); \n' +
            '} \n';
    }

    function getVertexShaderCallback(content) {
        if (content._batchSize === 0) {
            // Do not change vertex shader source; the model was not batched
            return undefined;
        }

        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (Context.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, perform per patched model (e.g., building) show/hide in the vertex shader
                newMain =
                    'uniform sampler2D tiles3d_batchTexture; \n' +
                    'varying vec3 tiles3d_modelColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    vec2 st = computeSt(a_batchId); \n' +
                    '    vec4 modelProperties = texture2D(tiles3d_batchTexture, st); \n' +
                    '    float show = modelProperties.a; \n' +
                    '    gl_Position *= show; \n' +                        // Per batched model show/hide
                    '    tiles3d_modelColor = modelProperties.rgb; \n' +   // Pass batched model color to fragment shader
                    '}';
            } else {
                newMain =
                    'varying vec2 tiles3d_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    tiles3d_modelSt = computeSt(a_batchId); \n' +
                    '}';
            }

            return renamedSource + '\n' + getGlslComputeSt(content) + newMain;
        };
    }

    function getFragmentShaderCallback(content) {
        if (content._batchSize === 0) {
            // Do not change fragment shader source; the model was not batched
            return undefined;
        }

        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (Context.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, per patched model (e.g., building) show/hide already
                // happened in the fragment shader
                newMain =
                    'varying vec3 tiles3d_modelColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    gl_FragColor.rgb *= tiles3d_modelColor; \n' +
                    '}';
            } else {
                newMain =
                    'uniform sampler2D tiles3d_batchTexture; \n' +
                    'varying vec2 tiles3d_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 modelProperties = texture2D(tiles3d_batchTexture, tiles3d_modelSt); \n' +
                    '    if (modelProperties.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    gltf_main(); \n' +
                    '    gl_FragColor.rgb *= modelProperties.rgb; \n' +
                    '}';
            }

            return renamedSource + '\n' + newMain;
        };
    }

    function getUniformMapCallback(content) {
        if (content._batchSize === 0) {
            // Do not change the uniform map; the model was not batched
            return undefined;
        }

        return function(uniformMap) {
            var batchUniformMap = {
                tiles3d_batchTexture : function() {
                    // PERFORMANCE_IDEA: we could also use a custom shader that avoids the texture read.
                    return defaultValue(content._batchTexture, content._defaultTexture);
                },
                tiles3d_textureDimensions : function() {
                    return content._textureDimensions;
                },
                tiles3d_textureStep : function() {
                    return content._textureStep;
                }
            };

            return combine(uniformMap, batchUniformMap);
        };
    }

    ///////////////////////////////////////////////////////////////////////////

    function getPickVertexShaderCallback(content) {
        if (content._batchSize === 0) {
            // Do not change vertex shader source; the model was not batched
            return undefined;
        }

        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (Context.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, perform per patched model (e.g., building) show/hide in the vertex shader
                newMain =
                    'uniform sampler2D tiles3d_batchTexture; \n' +
                    'varying vec2 tiles3d_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    vec2 st = computeSt(a_batchId); \n' +
                    '    vec4 modelProperties = texture2D(tiles3d_batchTexture, st); \n' +
                    '    float show = modelProperties.a; \n' +
                    '    gl_Position *= show; \n' +                       // Per batched model show/hide
                    '    tiles3d_modelSt = st; \n' +
                    '}';
            } else {
                newMain =
                    'varying vec2 tiles3d_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    tiles3d_modelSt = computeSt(a_batchId); \n' +
                    '}';
            }

            return renamedSource + '\n' + getGlslComputeSt(content) + newMain;
        };
    }

    function getPickFragmentShaderCallback(content) {
        if (content._batchSize === 0) {
            // Do not change fragment shader source; the model was not batched
            return undefined;
        }

        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (Context.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, per patched model (e.g., building) show/hide already
                // happened in the fragment shader
                newMain =
                    'uniform sampler2D tiles3d_pickTexture; \n' +
                    'varying vec2 tiles3d_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    if (gl_FragColor.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    gl_FragColor = texture2D(tiles3d_pickTexture, tiles3d_modelSt); \n' +
                    '}';
            } else {
                newMain =
                    'uniform sampler2D tiles3d_pickTexture; \n' +
                    'uniform sampler2D tiles3d_batchTexture; \n' +
                    'varying vec2 tiles3d_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 modelProperties = texture2D(tiles3d_batchTexture, tiles3d_modelSt); \n' +
                    '    if (modelProperties.a == 0.0) { \n' +
                    '        discard; \n' +                       // Per batched model show/hide
                    '    } \n' +
                    '    gltf_main(); \n' +
                    '    if (gl_FragColor.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    gl_FragColor = texture2D(tiles3d_pickTexture, tiles3d_modelSt); \n' +
                    '}';
            }

            return renamedSource + '\n' + newMain;
        };
    }

    function getPickUniformMapCallback(content) {
        if (content._batchSize === 0) {
            // Do not change the uniform map; the model was not batched
            return undefined;
        }

        return function(uniformMap) {
            var batchUniformMap = {
                tiles3d_batchTexture : function() {
                    return defaultValue(content._batchTexture, content._defaultTexture);
                },
                tiles3d_textureDimensions : function() {
                    return content._textureDimensions;
                },
                tiles3d_textureStep : function() {
                    return content._textureStep;
                },
                tiles3d_pickTexture : function() {
                    return content._pickTexture;
                }
            };

            return combine(uniformMap, batchUniformMap);
        };
    }

    ///////////////////////////////////////////////////////////////////////////

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
                that._batchTable = JSON.parse(batchTableString);
            }

            var gltfView = new Uint8Array(arrayBuffer, byteOffset, arrayBuffer.byteLength - byteOffset);

            // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
            // The pitch shader still needs to be patched.
            var model = new Model({
                gltf : gltfView,
                cull : false,           // The model is already culled by the 3D tiles
                releaseGltfJson : true, // Models are unique and will not benefit from caching so save memory
                vertexShaderLoaded : getVertexShaderCallback(that),
                fragmentShaderLoaded : getFragmentShaderCallback(that),
                uniformMapLoaded : getUniformMapCallback(that),
                pickVertexShaderLoaded : getPickVertexShaderCallback(that),
                pickFragmentShaderLoaded : getPickFragmentShaderCallback(that),
                pickUniformMapLoaded: getPickUniformMapCallback(that),
                basePath: that._url
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

     function applyDebugSettings(owner, content) {
        if (content.state === Cesium3DTileContentState.READY) {
            if (owner.debugColorizeTiles && !content._debugColorizeTiles) {
                content._debugColorizeTiles = true;
                content.setAllColor(content._debugColor);
            } else if (!owner.debugColorizeTiles && content._debugColorizeTiles) {
                content._debugColorizeTiles = false;
                content.setAllColor(Color.WHITE);
            }
        }
    }

    function createTexture(content, context, bytes) {
        var dimensions = content._textureDimensions;
        return context.createTexture2D({
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            source : {
                width : dimensions.x,
                height : dimensions.y,
                arrayBufferView : bytes
            },
            sampler : context.createSampler({
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });
    }

    function createPickTexture(content, context) {
        var batchSize = content._batchSize;
        if (!defined(content._pickTexture) && (batchSize > 0)) {
            createModels(content);
            var models = content._models;

            var pickIds = content._pickIds;
            var byteLength = getByteLength(content);
            var bytes = new Uint8Array(byteLength);

            // PERFORMANCE_IDEA: we could skip the pick texture completely by allocating
            // a continuous range of pickIds and then converting the base pickId + batchId
            // to RGBA in the shader.  The only consider is precision issues, which might
            // not be an issue in WebGL 2.
            for (var i = 0; i < batchSize; ++i) {
                var pickId = context.createPickId(models[i]);
                pickIds.push(pickId);

                var pickColor = pickId.color;
                var offset = i * 4;
                bytes[offset] = Color.floatToByte(pickColor.red);
                bytes[offset + 1] = Color.floatToByte(pickColor.green);
                bytes[offset + 2] = Color.floatToByte(pickColor.blue);
                bytes[offset + 3] = Color.floatToByte(pickColor.alpha);
            }

            content._pickTexture = createTexture(content, context, bytes);
        }
    }

    function createBatchTexture(content, context) {
        if (!defined(content._batchTexture)) {
            content._batchTexture = createTexture(content, context, content._batchValues);
            content._batchValuesDirty = false;
        }
    }

    function updateBatchTexture(content, context) {
        if (content._batchValuesDirty) {
            var dimensions = content._textureDimensions;
            // PERFORMANCE_IDEA: Instead of rewriting the entire texture, use fine-grained
            // texture updates when less than, for example, 10%, of the values changed.  Or
            // even just optimize the common case when one model show/color changed.
            content._batchTexture.copyFrom({
                width : dimensions.x,
                height : dimensions.y,
                arrayBufferView : content._batchValues
            });
        }
    }

    /**
     * DOC_TBA
     *
     * Use Cesium3DTile#update
     */
    Batched3DModel3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        applyDebugSettings(owner, this);

        this._defaultTexture = context.defaultTexture;

        if (frameState.passes.pick) {
            // Create pick texture on-demand
            createPickTexture(this, context);
        }

        if (this._batchValuesDirty) {
            // Create batch texture on-demand
            createBatchTexture(this, context);
            updateBatchTexture(this, context);  // Apply per-model show/color updates

            this._batchValuesDirty = false;
        }

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
        this._batchTexture = this._batchTexture && this._batchTexture.destroy();
        this._pickTexture = this._pickTexture && this._pickTexture.destroy();

        var pickIds = this._pickIds;
        var length = pickIds.length;
        for (var i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }

        return destroyObject(this);
    };

    return Batched3DModel3DTileContentProvider;
});