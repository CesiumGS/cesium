/*global define*/
define([
        '../Core/arrayFill',
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/clone',
        '../Core/Color',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/PixelFormat',
        '../Renderer/ContextLimits',
        '../Renderer/DrawCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/ShaderSource',
        '../Renderer/RenderState',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        './BlendingState',
        './CullFace',
        './getBinaryAccessor',
        './Pass'
    ], function(
        arrayFill,
        Cartesian2,
        Cartesian4,
        clone,
        Color,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        PixelFormat,
        ContextLimits,
        DrawCommand,
        PixelDatatype,
        Sampler,
        ShaderSource,
        RenderState,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        BlendingState,
        CullFace,
        getBinaryAccessor,
        Pass) {
    'use strict';

    /**
     * @private
     */
    function Cesium3DTileBatchTable(content, featuresLength, batchTableJson, batchTableBinary) {
        featuresLength = defaultValue(featuresLength, 0);

        /**
         * @readonly
         */
        this.featuresLength = featuresLength;

        this._translucentFeaturesLength = 0; // Number of features in the tile that are translucent

        /**
         * @private
         */
        this.batchTableJson = batchTableJson;
        /**
         * @private
         */
        this.batchTableBinary = batchTableBinary;
        this._batchTableBinaryProperties = Cesium3DTileBatchTable.getBinaryProperties(featuresLength, batchTableJson, batchTableBinary);

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

    Cesium3DTileBatchTable.getBinaryProperties = function(featuresLength, json, binary) {
        var binaryProperties;
        if (defined(json)) {
            for (var name in json) {
                if (json.hasOwnProperty(name)) {
                    var property = json[name];
                    var byteOffset = property.byteOffset;
                    if (defined(byteOffset)) {
                        // This is a binary property
                        var componentType = ComponentDatatype.fromName(property.componentType);
                        var type = property.type;
                        //>>includeStart('debug', pragmas.debug);
                        if (!defined(componentType)) {
                            throw new DeveloperError('componentType is required.');
                        }
                        if (!defined(type)) {
                            throw new DeveloperError('type is required.');
                        }
                        if (!defined(binary)) {
                            throw new DeveloperError('Property ' + name + ' requires a batch table binary.');
                        }
                        //>>includeEnd('debug');

                        var binaryAccessor = getBinaryAccessor(property);
                        var componentCount = binaryAccessor.componentsPerAttribute;
                        var classType = binaryAccessor.classType;
                        var typedArray = binaryAccessor.createArrayBufferView(binary.buffer, binary.byteOffset + byteOffset, featuresLength);

                        if (!defined(binaryProperties)) {
                            binaryProperties = {};
                        }

                        // Store any information needed to access the binary data, including the typed array,
                        // componentCount (e.g. a MAT4 would be 16), and the type used to pack and unpack (e.g. Matrix4).
                        binaryProperties[name] = {
                            typedArray : typedArray,
                            componentCount : componentCount,
                            type : classType
                        };
                    }
                }
            }
        }
        return binaryProperties;
    };

    function getByteLength(batchTable) {
        var dimensions = batchTable._textureDimensions;
        return (dimensions.x * dimensions.y) * 4;
    }

    function getBatchValues(batchTable) {
        if (!defined(batchTable._batchValues)) {
            // Default batch texture to RGBA = 255: white highlight (RGB) and show/alpha = true/255 (A).
            var byteLength = getByteLength(batchTable);
            var bytes = new Uint8Array(byteLength);
            arrayFill(bytes, 255);
            batchTable._batchValues = bytes;
        }

        return batchTable._batchValues;
    }

    function getShowAlphaProperties(batchTable) {
        if (!defined(batchTable._showAlphaProperties)) {
            var byteLength = 2 * batchTable.featuresLength;
            var bytes = new Uint8Array(byteLength);
            // [Show = true, Alpha = 255]
            arrayFill(bytes, 255);
            batchTable._showAlphaProperties = bytes;
        }
        return batchTable._showAlphaProperties;
    }

    Cesium3DTileBatchTable.prototype.setShow = function(batchId, show) {
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

    Cesium3DTileBatchTable.prototype.getShow = function(batchId) {
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

    Cesium3DTileBatchTable.prototype.setColor = function(batchId, color) {
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

    Cesium3DTileBatchTable.prototype.setAllColor = function(color) {
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

    Cesium3DTileBatchTable.prototype.getColor = function(batchId, result) {
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

    Cesium3DTileBatchTable.prototype.hasProperty = function(name) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        var json = this.batchTableJson;
        return defined(json) && defined(json[name]);
    };

    Cesium3DTileBatchTable.prototype.getPropertyNames = function() {
        var names = [];
        var json = this.batchTableJson;

        if (!defined(json)) {
            return names;
        }

        for (var name in json) {
            if (json.hasOwnProperty(name)) {
                names.push(name);
            }
        }

        return names;
    };

    Cesium3DTileBatchTable.prototype.getProperty = function(batchId, name) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this.batchTableJson)) {
            return undefined;
        }

        if (defined(this._batchTableBinaryProperties)) {
            var binaryProperty = this._batchTableBinaryProperties[name];
            if (defined(binaryProperty)) {
                var typedArray = binaryProperty.typedArray;
                var componentCount = binaryProperty.componentCount;
                if (componentCount === 1) {
                    return typedArray[batchId];
                } else {
                    return binaryProperty.type.unpack(typedArray, batchId * componentCount);
                }
            }
        }

        var propertyValues = this.batchTableJson[name];
        if (!defined(propertyValues)) {
            return undefined;
        }
        return clone(propertyValues[batchId], true);
    };

    Cesium3DTileBatchTable.prototype.setProperty = function(batchId, name, value) {
        var featuresLength = this.featuresLength;
        //>>includeStart('debug', pragmas.debug);
        if (!defined(batchId) || (batchId < 0) || (batchId > featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + featuresLength - + ').');
        }

        if (!defined(name)) {
            throw new DeveloperError('name is required.');
        }
        //>>includeEnd('debug');

        if (defined(this._batchTableBinaryProperties)) {
            var binaryProperty = this._batchTableBinaryProperties[name];
            if (defined(binaryProperty)) {
                var typedArray = binaryProperty.typedArray;
                var componentCount = binaryProperty.componentCount;
                if (componentCount === 1) {
                    typedArray[batchId] = value;
                } else {
                    binaryProperty.type.pack(value, typedArray, batchId * componentCount);
                }
                return;
            }
        }

        if (!defined(this.batchTableJson)) {
            // Tile payload did not have a batch table. Create one for new user-defined properties.
            this.batchTableJson = {};
        }

        var propertyValues = this.batchTableJson[name];

        if (!defined(propertyValues)) {
            // Property does not exist. Create it.
            this.batchTableJson[name] = new Array(featuresLength);
            propertyValues = this.batchTableJson[name];
        }

        propertyValues[batchId] = clone(value, true);
    };

    function getGlslComputeSt(batchTable) {
        // GLSL batchId is zero-based: [0, featuresLength - 1]
        if (batchTable._textureDimensions.y === 1) {
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
    Cesium3DTileBatchTable.prototype.getVertexShaderCallback = function() {
        if (this.featuresLength === 0) {
            return;
        }

        var that = this;
        return function(source, handleTranslucent) {
            var renamedSource = ShaderSource.replaceMain(source, 'tile_main');
            var newMain;

            handleTranslucent = defaultValue(handleTranslucent, true);

            if (ContextLimits.maximumVertexTextureImageUnits > 0) {
                // When VTF is supported, perform per-feature show/hide in the vertex shader
                newMain =
                    'uniform sampler2D tile_batchTexture; \n' +
                    'uniform bool tile_translucentCommand; \n' +
                    'varying vec4 tile_featureColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    tile_main(); \n' +
                    '    vec2 st = computeSt(a_batchId); \n' +
                    '    vec4 featureProperties = texture2D(tile_batchTexture, st); \n' +
                    '    float show = ceil(featureProperties.a); \n' +      // 0 - false, non-zeo - true
                    '    gl_Position *= show; \n';                          // Per-feature show/hide
// TODO: Translucent should still write depth for picking?  For example, we want to grab highlighted building that became translucent
// TODO: Same TODOs below in getFragmentShaderCallback
                if (handleTranslucent) {
                    newMain +=
                        '    bool isStyleTranslucent = (featureProperties.a != 1.0); \n' +
                        '    if (czm_pass == czm_passTranslucent) \n' +
                        '    { \n' +
                        '        if (!isStyleTranslucent && !tile_translucentCommand) \n' + // Do not render opaque features in the translucent pass
                        '        { \n' +
                        '            gl_Position *= 0.0; \n' +
                        '        } \n' +
                        '    } \n' +
                        '    else \n' +
                        '    { \n' +
                        '        if (isStyleTranslucent) \n' + // Do not render translucent features in the opaque pass
                        '        { \n' +
                        '            gl_Position *= 0.0; \n' +
                        '        } \n' +
                        '    } \n';
                }
                newMain +=
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

    Cesium3DTileBatchTable.prototype.getFragmentShaderCallback = function() {
        if (this.featuresLength === 0) {
            return;
        }

        return function(source, handleTranslucent) {
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

            handleTranslucent = defaultValue(handleTranslucent, true);

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
                    'uniform bool tile_translucentCommand; \n' +
                    'varying vec2 tile_featureSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 featureProperties = texture2D(tile_batchTexture, tile_featureSt); \n' +
                    '    if (featureProperties.a == 0.0) { \n' + // show: alpha == 0 - false, non-zeo - true
                    '        discard; \n' +
                    '    } \n';

                if (handleTranslucent) {
                    newMain +=
                        '    bool isStyleTranslucent = (featureProperties.a != 1.0); \n' +
                        '    if (czm_pass == czm_passTranslucent) \n' +
                        '    { \n' +
                        '        if (!isStyleTranslucent && !tile_translucentCommand) \n' + // Do not render opaque features in the translucent pass
                        '        { \n' +
                        '            discard; \n' +
                        '        } \n' +
                        '    } \n' +
                        '    else \n' +
                        '    { \n' +
                        '        if (isStyleTranslucent) \n' + // Do not render translucent features in the opaque pass
                        '        { \n' +
                        '            discard; \n' +
                        '        } \n' +
                        '    } \n';
                }
                newMain +=
                    '    tile_main(); \n' +
                    '    gl_FragColor *= featureProperties; \n' +
                    '}';
            }

            return renamedSource + '\n' + newMain;
        };
    };

    Cesium3DTileBatchTable.prototype.getUniformMapCallback = function() {
        if (this.featuresLength === 0) {
            return;
        }

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

    Cesium3DTileBatchTable.prototype.getPickVertexShaderCallback = function() {
        if (this.featuresLength === 0) {
            return;
        }

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

    Cesium3DTileBatchTable.prototype.getPickFragmentShaderCallback = function() {
        if (this.featuresLength === 0) {
            return;
        }

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

    Cesium3DTileBatchTable.prototype.getPickUniformMapCallback = function() {
        if (this.featuresLength === 0) {
            return;
        }

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

    ///////////////////////////////////////////////////////////////////////////

    var StyleCommandsNeeded = {
        ALL_OPAQUE : 0,
        ALL_TRANSLUCENT : 1,
        OPAQUE_AND_TRANSLUCENT : 2
    };

    Cesium3DTileBatchTable.prototype.getAddCommand = function() {
        var styleCommandsNeeded = getStyleCommandsNeeded(this);

// TODO: This function most likely will not get optimized.  Do something like this later in the render loop.
        return function(command) {
            var commandList = this.commandList;

            var derivedCommands = command.derivedCommands.tileset;
            if (!defined(derivedCommands)) {
                derivedCommands = {};
                command.derivedCommands.tileset = derivedCommands;

                derivedCommands.originalCommand = deriveCommand(command);
                derivedCommands.back = deriveTranslucentCommand(command, CullFace.FRONT);
                derivedCommands.front = deriveTranslucentCommand(command, CullFace.BACK);
            }

            derivedCommands.originalCommand.castShadows = command.castShadows;
            derivedCommands.originalCommand.receiveShadows = command.receiveShadows;
            derivedCommands.back.castShadows = command.castShadows;
            derivedCommands.back.receiveShadows = command.receiveShadows;
            derivedCommands.front.castShadows = command.castShadows;
            derivedCommands.front.receiveShadows = command.receiveShadows;

            // If the command was originally opaque:
            //    * If the styling applied to the tile is all opaque, use the original command
            //      (with one additional uniform needed for the shader).
            //    * If the styling is all translucent, use new (cached) derived commands (front
            //      and back faces) with a translucent render state.
            //    * If the styling causes both opaque and translucent features in this tile,
            //      then use both sets of commands.
// TODO: if the tile has multiple commands, we do not know what features are in what
// commands so the third-case may be overkill.  Change this to a PERFORMANCE_IDEA?
            if (command.pass !== Pass.TRANSLUCENT) {
                if (styleCommandsNeeded === StyleCommandsNeeded.ALL_OPAQUE) {
                    commandList.push(derivedCommands.originalCommand);
                }

                if (styleCommandsNeeded === StyleCommandsNeeded.ALL_TRANSLUCENT) {
// TODO: vector tiles, for example, will not always want two passes for translucency.  Some primitives,
// for example, those created from Cesium geometries, will also already return commands for two
// passes if the command is originally translucent.  Same TODO below.
                    commandList.push(derivedCommands.back);
                    commandList.push(derivedCommands.front);
                }

                if (styleCommandsNeeded === StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT) {
                    commandList.push(derivedCommands.originalCommand);
                    commandList.push(derivedCommands.back);
                    commandList.push(derivedCommands.front);
                }
            } else {
                // Command was originally translucent so no need to derive new commands;
                // as of now, a style can't change an originally translucent feature to
                // opaque since the style's alpha is modulated, not a replacement.  When
                // this changes, we need to derive new opaque commands here.
                commandList.push(derivedCommands.originalCommand);
            }
        };
    };

    function getStyleCommandsNeeded(batchTable) {
        var translucentFeaturesLength = batchTable._translucentFeaturesLength;

        if (translucentFeaturesLength === 0) {
            return StyleCommandsNeeded.ALL_OPAQUE;
        } else if (translucentFeaturesLength === batchTable.featuresLength) {
            return StyleCommandsNeeded.ALL_TRANSLUCENT;
        }

        return StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;
    }

    function deriveTranslucentCommand(command, cullFace) {
        var derivedCommand = deriveCommand(command);
        derivedCommand.pass = Pass.TRANSLUCENT;
        derivedCommand.renderState = getTranslucentRenderState(command.renderState, cullFace);
        return derivedCommand;
    }

    function deriveCommand(command) {
        var derivedCommand = DrawCommand.shallowClone(command);

        // Add a uniform to indicate if the original command was translucent so
        // the shader knows not to cull vertices that were originally transparent
        // even though their style is opaque.
        var translucentCommand = (derivedCommand.pass === Pass.TRANSLUCENT);

        derivedCommand.uniformMap = defined(derivedCommand.uniformMap) ? derivedCommand.uniformMap : {};
        derivedCommand.uniformMap.tile_translucentCommand = function() {
            return translucentCommand;
        };

        return derivedCommand;
    }

    function getTranslucentRenderState(renderState, cullFace) {
        var rs = clone(renderState, true);
        rs.cull.enabled = true;
        rs.cull.face = cullFace;
        rs.depthTest.enabled = true;
        rs.depthMask = false;
        rs.blending = BlendingState.ALPHA_BLEND;

        return RenderState.fromCache(rs);
    }

    ///////////////////////////////////////////////////////////////////////////

    function createTexture(batchTable, context, bytes) {
        var dimensions = batchTable._textureDimensions;
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

    function createPickTexture(batchTable, context) {
        var featuresLength = batchTable.featuresLength;
        if (!defined(batchTable._pickTexture) && (featuresLength > 0)) {
            var pickIds = batchTable._pickIds;
            var byteLength = getByteLength(batchTable);
            var bytes = new Uint8Array(byteLength);
            var content = batchTable._content;

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

            batchTable._pickTexture = createTexture(batchTable, context, bytes);
        }
    }

    function updateBatchTexture(batchTable) {
        var dimensions = batchTable._textureDimensions;
        // PERFORMANCE_IDEA: Instead of rewriting the entire texture, use fine-grained
        // texture updates when less than, for example, 10%, of the values changed.  Or
        // even just optimize the common case when one feature show/color changed.
        batchTable._batchTexture.copyFrom({
            width : dimensions.x,
            height : dimensions.y,
            arrayBufferView : batchTable._batchValues
        });
    }

    Cesium3DTileBatchTable.prototype.update = function(tileset, frameState) {
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

    Cesium3DTileBatchTable.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTileBatchTable.prototype.destroy = function() {
        this._batchTexture = this._batchTexture && this._batchTexture.destroy();
        this._pickTexture = this._pickTexture && this._pickTexture.destroy();

        var pickIds = this._pickIds;
        var length = pickIds.length;
        for (var i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }

        return destroyObject(this);
    };

    return Cesium3DTileBatchTable;
});
