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

// * TODO: modify/create commands

    /**
     * @private
     */
    function Cesium3DTileBatchTableResources(content, featuresLength) {
        featuresLength = defaultValue(featuresLength, 0);

        /**
         * @readonly
         */
        this.featuresLength = featuresLength;

        this._translucentFeaturesLength = 0; // Number of features in the tile that are translucent

        /**
         * @private
         */
        this.batchTable = undefined;

        // PERFORMANCE_IDEA: These parallel arrays probably generate cache misses in get/set color/show
        // and use A LOT of memory.  How can we use less memory?
        this._showAlphaProperties = undefined; // [Show (0 or 255), Alpha (0 to 255)] property for each feature
        this._batchValues = undefined;  // Per-feature RGBA (A is based on the color's alpha and feature's show property)

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
            // when more than one row is needed (e.g., > 16K features in one tile)
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
            // Default batch texture to RGBA = 255: white highlight (RGB) and show/alpha = true/255 (A).
            var byteLength = getByteLength(batchTableResources);
            var bytes = new Uint8Array(byteLength);
            for (var i = 0; i < byteLength; ++i) {
                bytes[i] = 255;
            }

            batchTableResources._batchValues = bytes;
        }

        return batchTableResources._batchValues;
    }

    function getShowAlphaProperties(batchTableResources) {
        if (!defined(batchTableResources._showAlphaProperties)) {
            var byteLength = 2 * batchTableResources.featuresLength;
            var bytes = new Uint8Array(byteLength);
            for (var i = 0; i < byteLength; ++i) {
                bytes[i] = 255; // [Show = true, Alpha = 255]
            }

            batchTableResources._showAlphaProperties = bytes;
        }
        return batchTableResources._showAlphaProperties;
    }

    Cesium3DTileBatchTableResources.prototype.setShow = function(batchId, show) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
        }

        if (!defined(show)) {
            throw new DeveloperError('show is required.');
        }
        //>>includeEnd('debug');

        if (show && !defined(this._showAlphaProperties)) {
            // Avoid allocating since the default is show = true
            return;
        }

        var showAlphaProperties = getShowAlphaProperties(this);
        var propertyOffset = batchId * 2;

        var newShow = show ? 255 : 0;
        if (showAlphaProperties[propertyOffset] !== newShow) {
            showAlphaProperties[propertyOffset] = newShow;

            var batchValues = getBatchValues(this);

            // Compute alpha used in the shader based on show and color.alpha properties
            var offset = (batchId * 4) + 3;
            batchValues[offset] = show ? showAlphaProperties[propertyOffset + 1] : 0;

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

        if (!defined(this._showAlphaProperties)) {
            // Avoid allocating since the default is show = true
            return true;
        }

        var offset = batchId * 2;
        return (this._showAlphaProperties[offset] === 255);
    };

    var scratchColor = new Array(4);

    Cesium3DTileBatchTableResources.prototype.setColor = function(batchId, color) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
        }

        if (!defined(color)) {
            throw new DeveloperError('color is required.');
        }
        //>>includeEnd('debug');

        if (Color.equals(color, Color.WHITE) && !defined(this._batchValues)) {
            // Avoid allocating since the default is white
            return;
        }

        var newColor = color.toBytes(scratchColor);
        var newAlpha = newColor[3];

        var batchValues = getBatchValues(this);
        var offset = batchId * 4;

        var showAlphaProperties = getShowAlphaProperties(this);
        var propertyOffset = batchId * 2;

        if ((batchValues[offset] !== newColor[0]) ||
            (batchValues[offset + 1] !== newColor[1]) ||
            (batchValues[offset + 2] !== newColor[2]) ||
            (showAlphaProperties[propertyOffset + 1] !== newAlpha)) {

            batchValues[offset] = newColor[0];
            batchValues[offset + 1] = newColor[1];
            batchValues[offset + 2] = newColor[2];

            var wasTranslucent = (showAlphaProperties[propertyOffset + 1] !== 255);

            // Compute alpha used in the shader based on show and color.alpha properties
            var show = showAlphaProperties[propertyOffset] !== 0;
            batchValues[offset + 3] = show ? newAlpha : 0;
            showAlphaProperties[propertyOffset + 1] = newAlpha;

            // Track number of translucent features so we know if this tile needs
            // opaque commands, translucent commands, or both for rendering.
            var isTranslucent = (newAlpha !== 255);
            if (isTranslucent && !wasTranslucent) {
                ++this._translucentFeaturesLength;
            } else if (!isTranslucent && wasTranslucent) {
                --this._translucentFeaturesLength;
            }

            this._batchValuesDirty = true;
        }
    };

    Cesium3DTileBatchTableResources.prototype.setAllColor = function(color) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(color)) {
            throw new DeveloperError('color is required.');
        }
        //>>includeEnd('debug');

        var featuresLength = this.featuresLength;
        for (var i = 0; i < featuresLength; ++i) {
            // PERFORMANCE_IDEA: duplicate part of setColor here to factor things out of the loop
            this.setColor(i, color);
        }
    };

    Cesium3DTileBatchTableResources.prototype.getColor = function(batchId, result) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
        }

        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this._batchValues)) {
            return Color.clone(Color.WHITE, result);
        }

        var batchValues = this._batchValues;
        var offset = batchId * 4;

        var showAlphaProperties = this._showAlphaProperties;
        var propertyOffset = batchId * 2;

        return Color.fromBytes(batchValues[offset],
            batchValues[offset + 1],
            batchValues[offset + 2],
            showAlphaProperties[propertyOffset + 1],
            result);
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
            return 'uniform vec4 tile_textureStep; \n' +
                'vec2 computeSt(float batchId) \n' +
                '{ \n' +
                '    float stepX = tile_textureStep.x; \n' +
                '    float centerX = tile_textureStep.y; \n' +
                '    return vec2(centerX + (batchId * stepX), 0.5); \n' +
                '} \n';
        }

        return 'uniform vec4 tile_textureStep; \n' +
            'uniform vec2 tile_textureDimensions; \n' +
            'vec2 computeSt(float batchId) \n' +
            '{ \n' +
            '    float stepX = tile_textureStep.x; \n' +
            '    float centerX = tile_textureStep.y; \n' +
            '    float stepY = tile_textureStep.z; \n' +
            '    float centerY = tile_textureStep.w; \n' +
            '    float xId = mod(batchId, tile_textureDimensions.x); \n' +
            '    float yId = floor(batchId / tile_textureDimensions.x); \n' +
            '    return vec2(centerX + (xId * stepX), 1.0 - (centerY + (yId * stepY))); \n' +
            '} \n';
    }

    /**
     * @private
     */
    Cesium3DTileBatchTableResources.prototype.getVertexShaderCallback = function() {
        var that = this;
        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'tile_main');
            var newMain;

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, perform per-feature show/hide in the vertex shader
                newMain =
                    'uniform sampler2D tile_batchTexture; \n' +
                    'varying vec4 tile_featureColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    tile_main(); \n' +
                    '    vec2 st = computeSt(a_batchId); \n' +
                    '    vec4 featureProperties = texture2D(tile_batchTexture, st); \n' +
                    '    float show = ceil(featureProperties.a); \n' +      // 0 - false, non-zeo - true
                    '    gl_Position *= show; \n' +                         // Per-feature show/hide
                    '    tile_featureColor = featureProperties; \n' +
                    '}';
            } else {
                newMain =
                    'varying vec2 tile_featureSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    tile_main(); \n' +
                    '    tile_featureSt = computeSt(a_batchId); \n' +
                    '}';
            }

            return renamedSource + '\n' + getGlslComputeSt(that) + newMain;
        };
    };

    Cesium3DTileBatchTableResources.prototype.getFragmentShaderCallback = function() {
        return function(source) {
            //TODO: generate entire shader at runtime?
            //var diffuse = 'diffuse = u_diffuse;';
            //var diffuseTexture = 'diffuse = texture2D(u_diffuse, v_texcoord0);';
            //if (ContextLimits.maximumVertexTextureImageUnits > 0) {
            //    source = 'varying vec3 tile_featureColor; \n' + source;
            //    source = source.replace(diffuse, 'diffuse.rgb = tile_featureColor;');
            //    source = source.replace(diffuseTexture, 'diffuse.rgb = texture2D(u_diffuse, v_texcoord0).rgb * tile_featureColor;');
            //} else {
            //    source =
            //        'uniform sampler2D tile_batchTexture; \n' +
            //        'varying vec2 tile_featureSt; \n' +
            //        source;
            //
            //    var readColor =
            //        'vec4 featureProperties = texture2D(tile_batchTexture, tile_featureSt); \n' +
            //        'if (featureProperties.a == 0.0) { \n' +
            //        '    discard; \n' +
            //        '}';
            //
            //    source = source.replace(diffuse, readColor + 'diffuse.rgb = featureProperties.rgb;');
            //    source = source.replace(diffuseTexture, readColor + 'diffuse.rgb = texture2D(u_diffuse, v_texcoord0).rgb * featureProperties.rgb;');
            //}
            //
            //return source;

            // TODO: support both "replace" and "highlight" color?  Highlight is below, replace is commented out above
            var renamedSource = ShaderSource.replaceMain(source, 'tile_main');
            var newMain;

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, per-feature show/hide already happened in the fragment shader
                newMain =
                    'varying vec4 tile_featureColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    tile_main(); \n' +
                    '    gl_FragColor *= tile_featureColor; \n' +
                    '}';
            } else {
                newMain =
                    'uniform sampler2D tile_batchTexture; \n' +
                    'varying vec2 tile_featureSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 featureProperties = texture2D(tile_batchTexture, tile_featureSt); \n' +
                    '    if (featureProperties.a == 0.0) { \n' + // show: alpha == 0 - false, non-zeo - true
                    '        discard; \n' +
                    '    } \n' +
                    '    tile_main(); \n' +
                    '    gl_FragColor *= featureProperties; \n' +
                    '}';
            }

            return renamedSource + '\n' + newMain;
        };
    };

    Cesium3DTileBatchTableResources.prototype.getUniformMapCallback = function() {
        var that = this;
        return function(uniformMap) {
            var batchUniformMap = {
                tile_batchTexture : function() {
                    // PERFORMANCE_IDEA: we could also use a custom shader that avoids the texture read.
                    return defaultValue(that._batchTexture, that._defaultTexture);
                },
                tile_textureDimensions : function() {
                    return that._textureDimensions;
                },
                tile_textureStep : function() {
                    return that._textureStep;
                }
            };

            return combine(uniformMap, batchUniformMap);
        };
    };

    Cesium3DTileBatchTableResources.prototype.getPickVertexShaderCallback = function() {
        var that = this;
        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'tile_main');
            var newMain;

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, perform per-feature show/hide in the vertex shader
                newMain =
                    'uniform sampler2D tile_batchTexture; \n' +
                    'varying vec2 tile_featureSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    tile_main(); \n' +
                    '    vec2 st = computeSt(a_batchId); \n' +
                    '    vec4 featureProperties = texture2D(tile_batchTexture, st); \n' +
                    '    float show = ceil(featureProperties.a); \n' +    // 0 - false, non-zero - true
                    '    gl_Position *= show; \n' +                       // Per-feature show/hide
                    '    tile_featureSt = st; \n' +
                    '}';
            } else {
                newMain =
                    'varying vec2 tile_featureSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    tile_main(); \n' +
                    '    tile_featureSt = computeSt(a_batchId); \n' +
                    '}';
            }

            return renamedSource + '\n' + getGlslComputeSt(that) + newMain;
        };
    };

    Cesium3DTileBatchTableResources.prototype.getPickFragmentShaderCallback = function() {
        return function(source) {
            var renamedSource = ShaderSource.replaceMain(source, 'tile_main');
            var newMain;

            // Pick shaders do not need to take into account per-feature color/alpha.
            // (except when alpha is zero, which is treated as if show is false, so
            //  it does not write depth in the color or pick pass).
            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, per-feature show/hide already happened in the fragment shader
                newMain =
                    'uniform sampler2D tile_pickTexture; \n' +
                    'varying vec2 tile_featureSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    tile_main(); \n' +
                    '    if (gl_FragColor.a == 0.0) { \n' + // per-feature show: alpha == 0 - false, non-zeo - true
                    '        discard; \n' +
                    '    } \n' +
                    '    gl_FragColor = texture2D(tile_pickTexture, tile_featureSt); \n' +
                    '}';
            } else {
                newMain =
                    'uniform sampler2D tile_pickTexture; \n' +
                    'uniform sampler2D tile_batchTexture; \n' +
                    'varying vec2 tile_featureSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 featureProperties = texture2D(tile_batchTexture, tile_featureSt); \n' +
                    '    if (featureProperties.a == 0.0) { \n' +  // per-feature show: alpha == 0 - false, non-zeo - true
                    '        discard; \n' +
                    '    } \n' +
                    '    tile_main(); \n' +
                    '    if (gl_FragColor.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    gl_FragColor = texture2D(tile_pickTexture, tile_featureSt); \n' +
                    '}';
            }

            return renamedSource + '\n' + newMain;
        };
    };

    Cesium3DTileBatchTableResources.prototype.getPickUniformMapCallback = function() {
        var that = this;
        return function(uniformMap) {
            var batchUniformMap = {
                tile_batchTexture : function() {
                    return defaultValue(that._batchTexture, that._defaultTexture);
                },
                tile_textureDimensions : function() {
                    return that._textureDimensions;
                },
                tile_textureStep : function() {
                    return that._textureStep;
                },
                tile_pickTexture : function() {
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
        // even just optimize the common case when one feature show/color changed.
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
