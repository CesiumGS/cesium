/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/clone',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
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
    'use strict';

    /**
     * @private
     */
    function Cesium3DTileBatchTableResources(content, featuresLength) {
        featuresLength = defaultValue(featuresLength, 0);

        /**
         * @readonly
         */
        this.featuresLength = featuresLength;

        /**
         * @private
         */
        this.batchTable = undefined;

        this._batchValues = undefined;  // Per-feature show/color
        this._batchValuesDirty = false;
        this._batchTexture = undefined;
        this._defaultTexture = undefined;

        this._pickTexture = undefined;
        this._pickIds = [];

        this._content = content;

        // Dimensions for batch and pick textures
        var textureDimensions;
        var textureStep;

        if (featuresLength > 0) {
            // PERFORMANCE_IDEA: this can waste memory in the last row in the uncommon case
            // when more than one row is needed (e.g., > 16K models in one tile)
            var width = Math.min(featuresLength, ContextLimits.maximumTextureSize);
            var height = Math.ceil(featuresLength / ContextLimits.maximumTextureSize);
            var stepX = 1.0 / width;
            var centerX = stepX * 0.5;
            var stepY = 1.0 / height;
            var centerY = stepY * 0.5;

            textureDimensions = new Cartesian2(width, height);
            textureStep = new Cartesian4(stepX, centerX, stepY, centerY);
        }

        this._textureDimensions = textureDimensions;
        this._textureStep = textureStep;
    }

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

    Cesium3DTileBatchTableResources.prototype.setShow = function(batchId, value) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
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

    Cesium3DTileBatchTableResources.prototype.getShow = function(batchId) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
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

    Cesium3DTileBatchTableResources.prototype.setColor = function(batchId, value) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
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

    Cesium3DTileBatchTableResources.prototype.setAllColor = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var featuresLength = this.featuresLength;
        for (var i = 0; i < featuresLength; ++i) {
            // PERFORMANCE_IDEA: duplicate part of setColor here to factor things out of the loop
            this.setColor(i, value);
        }
    };

    Cesium3DTileBatchTableResources.prototype.getColor = function(batchId, result) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
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

    Cesium3DTileBatchTableResources.prototype.hasProperty = function(name) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        var batchTable = this.batchTable;
        return defined(batchTable) && defined(batchTable[name]);
    };

    Cesium3DTileBatchTableResources.prototype.getPropertyNames = function() {
        var names = [];
        var batchTable = this.batchTable;

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

    Cesium3DTileBatchTableResources.prototype.getProperty = function(batchId, name) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this.batchTable)) {
            return undefined;
        }

        var propertyValues = this.batchTable[name];

        if (!defined(propertyValues)) {
            return undefined;
        }

        return clone(propertyValues[batchId], true);
    };

    Cesium3DTileBatchTableResources.prototype.setProperty = function(batchId, name, value) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this.batchTable)) {
            // Tile payload did not have a batch table.  Create one for new user-defined properties.
            this.batchTable = {};
        }

        var propertyValues = this.batchTable[name];

        if (!defined(propertyValues)) {
            // Property does not exist.  Create it.
            this.batchTable[name] = new Array(featuresLength);
            propertyValues = this.batchTable[name];
        }

        propertyValues[batchId] = clone(value, true);
    };

    function getGlslComputeSt(batchTableResources) {
        // GLSL batchId is zero-based: [0, featuresLength - 1]
        if (batchTableResources._textureDimensions.y === 1) {
            return 'uniform vec4 tileset_textureStep; \n' +
                'vec2 computeSt(float batchId) \n' +
                '{ \n' +
                '    float stepX = tileset_textureStep.x; \n' +
                '    float centerX = tileset_textureStep.y; \n' +
                '    return vec2(centerX + (batchId * stepX), 0.5); \n' +
                '} \n';
        }

        return 'uniform vec4 tileset_textureStep; \n' +
            'uniform vec2 tileset_textureDimensions; \n' +
            'vec2 computeSt(float batchId) \n' +
            '{ \n' +
            '    float stepX = tileset_textureStep.x; \n' +
            '    float centerX = tileset_textureStep.y; \n' +
            '    float stepY = tileset_textureStep.z; \n' +
            '    float centerY = tileset_textureStep.w; \n' +
            '    float xId = mod(batchId, tileset_textureDimensions.x); \n' +
            '    float yId = floor(batchId / tileset_textureDimensions.x); \n' +
            '    return vec2(centerX + (xId * stepX), 1.0 - (centerY + (yId * stepY))); \n' +
            '} \n';
    }

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getVertexShaderCallback = function() {
        if (this.featuresLength === 0) {
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
                    'uniform sampler2D tileset_batchTexture; \n' +
                    'varying vec3 tileset_modelColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    vec2 st = computeSt(a_batchId); \n' +
                    '    vec4 modelProperties = texture2D(tileset_batchTexture, st); \n' +
                    '    float show = modelProperties.a; \n' +
                    '    gl_Position *= show; \n' +                        // Per batched model show/hide
                    '    tileset_modelColor = modelProperties.rgb; \n' +   // Pass batched model color to fragment shader
                    '}';
            } else {
                newMain =
                    'varying vec2 tileset_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    tileset_modelSt = computeSt(a_batchId); \n' +
                    '}';
            }

            return renamedSource + '\n' + getGlslComputeSt(that) + newMain;
        };
    };

    Cesium3DTileBatchTableResources.prototype.getFragmentShaderCallback = function() {
        if (this.featuresLength === 0) {
            // Do not change fragment shader source; the model was not batched
            return undefined;
        }

        return function(source) {
            //TODO: generate entire shader at runtime?
            //var diffuse = 'diffuse = u_diffuse;';
            //var diffuseTexture = 'diffuse = texture2D(u_diffuse, v_texcoord0);';
            //if (ContextLimits.maximumVertexTextureImageUnits > 0) {
            //    source = 'varying vec3 tileset_modelColor; \n' + source;
            //    source = source.replace(diffuse, 'diffuse.rgb = tileset_modelColor;');
            //    source = source.replace(diffuseTexture, 'diffuse.rgb = texture2D(u_diffuse, v_texcoord0).rgb * tileset_modelColor;');
            //} else {
            //    source =
            //        'uniform sampler2D tileset_batchTexture; \n' +
            //        'varying vec2 tileset_modelSt; \n' +
            //        source;
            //
            //    var readColor =
            //        'vec4 modelProperties = texture2D(tileset_batchTexture, tileset_modelSt); \n' +
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
                    'varying vec3 tileset_modelColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    gl_FragColor.rgb *= tileset_modelColor; \n' +
                    '}';
            } else {
                newMain =
                    'uniform sampler2D tileset_batchTexture; \n' +
                    'varying vec2 tileset_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 modelProperties = texture2D(tileset_batchTexture, tileset_modelSt); \n' +
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

    Cesium3DTileBatchTableResources.prototype.getUniformMapCallback = function() {
        if (this.featuresLength === 0) {
            // Do not change the uniform map; the model was not batched
            return undefined;
        }

        var that = this;
        return function(uniformMap) {
            var batchUniformMap = {
                tileset_batchTexture : function() {
                    // PERFORMANCE_IDEA: we could also use a custom shader that avoids the texture read.
                    return defaultValue(that._batchTexture, that._defaultTexture);
                },
                tileset_textureDimensions : function() {
                    return that._textureDimensions;
                },
                tileset_textureStep : function() {
                    return that._textureStep;
                }
            };

            return combine(uniformMap, batchUniformMap);
        };
    };

    Cesium3DTileBatchTableResources.prototype.getPickVertexShaderCallback = function() {
        if (this.featuresLength === 0) {
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
                    'uniform sampler2D tileset_batchTexture; \n' +
                    'varying vec2 tileset_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    vec2 st = computeSt(a_batchId); \n' +
                    '    vec4 modelProperties = texture2D(tileset_batchTexture, st); \n' +
                    '    float show = modelProperties.a; \n' +
                    '    gl_Position *= show; \n' +                       // Per batched model show/hide
                    '    tileset_modelSt = st; \n' +
                    '}';
            } else {
                newMain =
                    'varying vec2 tileset_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    tileset_modelSt = computeSt(a_batchId); \n' +
                    '}';
            }

            return renamedSource + '\n' + getGlslComputeSt(that) + newMain;
        };
    };

    Cesium3DTileBatchTableResources.prototype.getPickFragmentShaderCallback = function() {
        if (this.featuresLength === 0) {
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
                    'uniform sampler2D tileset_pickTexture; \n' +
                    'varying vec2 tileset_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    gltf_main(); \n' +
                    '    if (gl_FragColor.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    gl_FragColor = texture2D(tileset_pickTexture, tileset_modelSt); \n' +
                    '}';
            } else {
                newMain =
                    'uniform sampler2D tileset_pickTexture; \n' +
                    'uniform sampler2D tileset_batchTexture; \n' +
                    'varying vec2 tileset_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 modelProperties = texture2D(tileset_batchTexture, tileset_modelSt); \n' +
                    '    if (modelProperties.a == 0.0) { \n' +
                    '        discard; \n' +                       // Per batched model show/hide
                    '    } \n' +
                    '    gltf_main(); \n' +
                    '    if (gl_FragColor.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    gl_FragColor = texture2D(tileset_pickTexture, tileset_modelSt); \n' +
                    '}';
            }

            return renamedSource + '\n' + newMain;
        };
    };

    Cesium3DTileBatchTableResources.prototype.getPickUniformMapCallback = function() {
        if (this.featuresLength === 0) {
            // Do not change the uniform map; the model was not batched
            return undefined;
        }

        var that = this;
        return function(uniformMap) {
            var batchUniformMap = {
                tileset_batchTexture : function() {
                    return defaultValue(that._batchTexture, that._defaultTexture);
                },
                tileset_textureDimensions : function() {
                    return that._textureDimensions;
                },
                tileset_textureStep : function() {
                    return that._textureStep;
                },
                tileset_pickTexture : function() {
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
        var featuresLength = batchTableResources.featuresLength;
        if (!defined(batchTableResources._pickTexture) && (featuresLength > 0)) {
            var pickIds = batchTableResources._pickIds;
            var byteLength = getByteLength(batchTableResources);
            var bytes = new Uint8Array(byteLength);
            var content = batchTableResources._content;

            // PERFORMANCE_IDEA: we could skip the pick texture completely by allocating
            // a continuous range of pickIds and then converting the base pickId + batchId
            // to RGBA in the shader.  The only consider is precision issues, which might
            // not be an issue in WebGL 2.
            for (var i = 0; i < featuresLength; ++i) {
                var pickId = context.createPickId(content.getFeature(i));
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

    function updateBatchTexture(batchTableResources) {
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

    Cesium3DTileBatchTableResources.prototype.update = function(tileset, frameState) {
        var context = frameState.context;
        this._defaultTexture = context.defaultTexture;

        if (frameState.passes.pick) {
            // Create pick texture on-demand
            createPickTexture(this, context);
        }

        if (this._batchValuesDirty) {
            this._batchValuesDirty = false;

            // Create batch texture on-demand
            if (!defined(this._batchTexture)) {
                this._batchTexture = createTexture(this, context, this._batchValues);
            }

            updateBatchTexture(this);  // Apply per-feature show/color updates
        }
    };

    Cesium3DTileBatchTableResources.prototype.isDestroyed = function() {
        return false;
    };

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
