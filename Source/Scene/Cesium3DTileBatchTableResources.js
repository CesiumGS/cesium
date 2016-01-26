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
        '../Core/PixelFormat',
        '../Renderer/ContextLimits',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter'
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
        PixelFormat,
        ContextLimits,
        PixelDatatype,
        Sampler,
        ShaderSource,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter) {
    "use strict";

    /**
     * DOC_TBA
     */
    function Cesium3DTileBatchTableResources(contentProvider, size) {
        this._batchLength = defaultValue(size, 0);
        this._batchValues = undefined;  // Per-model show/color
        this._batchValuesDirty = false;
        this._batchTexture = undefined;
        this._defaultTexture = undefined;

        this._pickTexture = undefined;
        this._pickIds = [];

        this._batchTable = undefined;
        this._contentProvider = contentProvider;

        // Dimensions for batch and pick textures
        var textureDimensions;
        var textureStep;

        var batchLength = this._batchLength;
        if (batchLength > 0) {
            // PERFORMANCE_IDEA: this can waste memory in the last row in the uncommon case
            // when more than one row is needed (e.g., > 16K models in one tile)
            var width = Math.min(batchLength, ContextLimits.maximumTextureSize);
            var height = Math.ceil(batchLength / ContextLimits.maximumTextureSize);
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
    }

    defineProperties(Cesium3DTileBatchTableResources.prototype, {
        /**
         * DOC_TBA
         *
         * @memberof Cesium3DTileBatchTableResources.prototype
         *
         * @type {Number}
         * @readonly
         */
        batchLength : {
            get : function() {
                return this._batchLength;
            }
        },

        /**
         * DOC_TBA
         *
         * @memberof Cesium3DTileBatchTableResources.prototype
         *
         * @type {Object}
         */
        batchTable : {
            get : function() {
                return this._batchTable;
            },
            set : function(batchTable) {
                this._batchTable = batchTable;
            }
        }
    });

    function getByteLength(batchTableResources) {
        var dimensions = batchTableResources._textureDimensions;
        return (dimensions.x * dimensions.y) * 4;
    }

    function getBatchValues(batchTableResources) {
        if (!defined(batchTableResources._batchValues)) {
            // Default batch texture to RGBA = 255: white highlight (RGB) and show = true (A).
            var byteLength = getByteLength(batchTableResources);
            var bytes = new Uint8Array(byteLength);
            for (var i = 0; i < byteLength; ++i) {
                bytes[i] = 255;
            }

            batchTableResources._batchValues = bytes;
        }

        return batchTableResources._batchValues;
    }

    /**
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.setShow = function(batchId, value) {
        var batchLength = this._batchLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchLength)) {
            throw new DeveloperError('batchId is required and between zero and batchLength - 1 (' + batchLength - + ').');
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
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.getShow = function(batchId) {
        var batchLength = this._batchLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchLength)) {
            throw new DeveloperError('batchId is required and between zero and batchLength - 1 (' + batchLength - + ').');
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
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.setColor = function(batchId, value) {
        var batchLength = this._batchLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchLength)) {
            throw new DeveloperError('batchId is required and between zero and batchLength - 1 (' + batchLength - + ').');
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
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.setAllColor = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var batchLength = this._batchLength;
        for (var i = 0; i < batchLength; ++i) {
            // PERFORMANCE_IDEA: duplicate part of setColor here to factor things out of the loop
            this.setColor(i, value);
        }
    };

    /**
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.getColor = function(batchId, result) {
        var batchLength = this._batchLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchLength)) {
            throw new DeveloperError('batchId is required and between zero and batchLength - 1 (' + batchLength - + ').');
        }

        if (!defined(result)) {
            throw new DeveloperError('color is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this._batchValues)) {
            // Batched models default to WHITE
            return Color.clone(Color.WHITE, result);
        }

        var batchValues = this._batchValues;
        var offset = batchId * 4;
        return Color.fromBytes(batchValues[offset], batchValues[offset + 1], batchValues[offset + 2], 255, result);
    };

    /**
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.hasProperty = function(name) {
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
     */
    Cesium3DTileBatchTableResources.prototype.getPropertyNames = function() {
        var names = [];
        var batchTable = this._batchTable;

        if (!defined(batchTable)) {
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
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.getProperty = function(batchId, name) {
        var batchLength = this._batchLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchLength)) {
            throw new DeveloperError('batchId is required and between zero and batchLength - 1 (' + batchLength - + ').');
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
     * DOC_TBA
     */
    Cesium3DTileBatchTableResources.prototype.setProperty = function(batchId, name, value) {
        var batchLength = this._batchLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > batchLength)) {
            throw new DeveloperError('batchId is required and between zero and batchLength - 1 (' + batchLength - + ').');
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
            this._batchTable[name] = new Array(batchLength);
            propertyValues = this._batchTable[name];
        }

        propertyValues[batchId] = clone(value, true);
    };

    function getGlslComputeSt(batchTableResources) {
        // GLSL batchId is zero-based: [0, batchLength - 1]
        if (batchTableResources._textureDimensions.y === 1) {
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

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getVertexShaderCallback = function() {
        if (this._batchLength === 0) {
            // Do not change vertex shader source; the model was not batched
            return undefined;
        }

        var that = this;
        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, perform per model (e.g., building) show/hide in the vertex shader
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

            return renamedSource + '\n' + getGlslComputeSt(that) + newMain;
        };
    };

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getFragmentShaderCallback = function() {
        if (this._batchLength === 0) {
            // Do not change fragment shader source; the model was not batched
            return undefined;
        }

        return function(source) {
            //TODO: generate entire shader at runtime?
            //var diffuse = 'diffuse = u_diffuse;';
            //var diffuseTexture = 'diffuse = texture2D(u_diffuse, v_texcoord0);';
            //if (ContextLimits.maximumVertexTextureImageUnits > 0) {
            //    source = 'varying vec3 tiles3d_modelColor; \n' + source;
            //    source = source.replace(diffuse, 'diffuse.rgb = tiles3d_modelColor;');
            //    source = source.replace(diffuseTexture, 'diffuse.rgb = texture2D(u_diffuse, v_texcoord0).rgb * tiles3d_modelColor;');
            //} else {
            //    source =
            //        'uniform sampler2D tiles3d_batchTexture; \n' +
            //        'varying vec2 tiles3d_modelSt; \n' +
            //        source;
            //
            //    var readColor =
            //        'vec4 modelProperties = texture2D(tiles3d_batchTexture, tiles3d_modelSt); \n' +
            //        'if (modelProperties.a == 0.0) { \n' +
            //        '    discard; \n' +
            //        '}';
            //
            //    source = source.replace(diffuse, readColor + 'diffuse.rgb = modelProperties.rgb;');
            //    source = source.replace(diffuseTexture, readColor + 'diffuse.rgb = texture2D(u_diffuse, v_texcoord0).rgb * modelProperties.rgb;');
            //}
            //
            //return source;

            // TODO: support both "replace" and "highlight" color?  Highlight is below, replace is commented out above
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
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
    };

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getUniformMapCallback = function() {
        if (this._batchLength === 0) {
            // Do not change the uniform map; the model was not batched
            return undefined;
        }

        var that = this;
        return function(uniformMap) {
            var batchUniformMap = {
                tiles3d_batchTexture : function() {
                    // PERFORMANCE_IDEA: we could also use a custom shader that avoids the texture read.
                    return defaultValue(that._batchTexture, that._defaultTexture);
                },
                tiles3d_textureDimensions : function() {
                    return that._textureDimensions;
                },
                tiles3d_textureStep : function() {
                    return that._textureStep;
                }
            };

            return combine(uniformMap, batchUniformMap);
        };
    };

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getPickVertexShaderCallback = function() {
        if (this._batchLength === 0) {
            // Do not change vertex shader source; the model was not batched
            return undefined;
        }

        var that = this;
        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
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

            return renamedSource + '\n' + getGlslComputeSt(that) + newMain;
        };
    };

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getPickFragmentShaderCallback = function() {
        if (this._batchLength === 0) {
            // Do not change fragment shader source; the model was not batched
            return undefined;
        }

        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'gltf_main');
            var newMain;

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
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
    };

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getPickUniformMapCallback = function() {
        if (this._batchLength === 0) {
            // Do not change the uniform map; the model was not batched
            return undefined;
        }

        var that = this;
        return function(uniformMap) {
            var batchUniformMap = {
                tiles3d_batchTexture : function() {
                    return defaultValue(that._batchTexture, that._defaultTexture);
                },
                tiles3d_textureDimensions : function() {
                    return that._textureDimensions;
                },
                tiles3d_textureStep : function() {
                    return that._textureStep;
                },
                tiles3d_pickTexture : function() {
                    return that._pickTexture;
                }
            };

            // uniformMap goes through getUniformMap first in Model.
            // Combine in this order so uniforms with the same name are overridden.
            return combine(batchUniformMap, uniformMap);
        };
    };

    function createTexture(batchTableResources, context, bytes) {
        var dimensions = batchTableResources._textureDimensions;
        return new Texture({
            context : context,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            source : {
                width : dimensions.x,
                height : dimensions.y,
                arrayBufferView : bytes
            },
            sampler : new Sampler({
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });
    }

    function createPickTexture(batchTableResources, context) {
        var batchLength = batchTableResources._batchLength;
        if (!defined(batchTableResources._pickTexture) && (batchLength > 0)) {
            var pickIds = batchTableResources._pickIds;
            var byteLength = getByteLength(batchTableResources);
            var bytes = new Uint8Array(byteLength);
            var contentProvider = batchTableResources._contentProvider;

            // PERFORMANCE_IDEA: we could skip the pick texture completely by allocating
            // a continuous range of pickIds and then converting the base pickId + batchId
            // to RGBA in the shader.  The only consider is precision issues, which might
            // not be an issue in WebGL 2.
            for (var i = 0; i < batchLength; ++i) {
                var pickId = context.createPickId(contentProvider.getFeature(i));
                pickIds.push(pickId);

                var pickColor = pickId.color;
                var offset = i * 4;
                bytes[offset] = Color.floatToByte(pickColor.red);
                bytes[offset + 1] = Color.floatToByte(pickColor.green);
                bytes[offset + 2] = Color.floatToByte(pickColor.blue);
                bytes[offset + 3] = Color.floatToByte(pickColor.alpha);
            }

            batchTableResources._pickTexture = createTexture(batchTableResources, context, bytes);
        }
    }

    function createBatchTexture(batchTableResources, context) {
        if (!defined(batchTableResources._batchTexture)) {
            batchTableResources._batchTexture = createTexture(batchTableResources, context, batchTableResources._batchValues);
            batchTableResources._batchValuesDirty = false;
        }
    }

    function updateBatchTexture(batchTableResources) {
        if (batchTableResources._batchValuesDirty) {
            var dimensions = batchTableResources._textureDimensions;
            // PERFORMANCE_IDEA: Instead of rewriting the entire texture, use fine-grained
            // texture updates when less than, for example, 10%, of the values changed.  Or
            // even just optimize the common case when one model show/color changed.
            batchTableResources._batchTexture.copyFrom({
                width : dimensions.x,
                height : dimensions.y,
                arrayBufferView : batchTableResources._batchValues
            });
        }
    }

    function applyDebugSettings(tiles3D, batchTableResources) {
        if (tiles3D.debugColorizeTiles && !batchTableResources._debugColorizeTiles) {
            batchTableResources._debugColorizeTiles = true;
            batchTableResources.setAllColor(batchTableResources._debugColor);
        } else if (!tiles3D.debugColorizeTiles && batchTableResources._debugColorizeTiles) {
            batchTableResources._debugColorizeTiles = false;
            batchTableResources.setAllColor(Color.WHITE);
        }
    }

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.update = function(tiles3D, frameState) {
        applyDebugSettings(tiles3D, this);

        var context = frameState.context;
        this._defaultTexture = context.defaultTexture;

        if (frameState.passes.pick) {
            // Create pick texture on-demand
            createPickTexture(this, context);
        }

        if (this._batchValuesDirty) {
            // Create batch texture on-demand
            createBatchTexture(this, context);
            updateBatchTexture(this);  // Apply per-model show/color updates

            this._batchValuesDirty = false;
        }
    };

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.destroy = function() {
        this._batchTexture = this._batchTexture && this._batchTexture.destroy();
        this._pickTexture = this._pickTexture && this._pickTexture.destroy();

        var pickIds = this._pickIds;
        var length = pickIds.length;
        for (var i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }

        return destroyObject(this);
    };

    return Cesium3DTileBatchTableResources;
});
