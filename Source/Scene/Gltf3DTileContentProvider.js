/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/PixelDatatype',
        '../Renderer/ShaderSource',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureMagnificationFilter',
        './Cesium3DTileContentState',
        './Model',
        '../ThirdParty/when'
    ], function(
        Cartesian2,
        Cartesian4,
        Color,
        combine,
        defaultValue,
        defined,
        destroyObject,
        PixelFormat,
        PixelDatatype,
        ShaderSource,
        TextureMinificationFilter,
        TextureMagnificationFilter,
        Cesium3DTileContentState,
        Model,
        when) {
    "use strict";

    /**
     * @private
     */
    var Gltf3DTileContentProvider = function(url, contentHeader) {
        this._model = undefined;
        this._url = url;

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

        this._batchSize = defaultValue(contentHeader.batchSize, 0);  // Number of models, e.g., buildings, batched into the glTF model.
        this._batchTexture = undefined;
        this._batchTextureDimensions = undefined;
        this._useVTF = false;

        this._debugColor = Cartesian4.fromColor(Color.fromRandom({ alpha : 1.0 }));
        this._debugColorizeTiles = false;
    };

    function getVertexShaderCallback(content) {
        return function(source) {
            if (content._batchSize === 0) {
                // Do not change vertex shader source; the model was not batched
                return source;
            }

            var renamedSource = ShaderSource.replaceMain(source, 'czm_gltf_main');
            var newMain;

            // Assuming the batch texture is has dimensions batch-size by 1.
            var computeSt =
                'vec2 computeSt(int batchId, vec2 dimensions) \n' +
                '{ \n' +
                '    float width = dimensions.x; \n ' +
                '    float step = (1.0 / width); \n ' +   // PERFORMANCE_IDEA: could precompute step and center
                '    float center = step * 0.5; \n ' +
                '    return vec2(center + (float(batchId) * step), 0.5); \n' +  // batchId is zero-based: [0, width - 1]
                '} \n';

            if (content._useVTF) {
                // When VTF is supported, perform per patched model (e.g., building) show/hide in the vertex shader
                newMain =
                    'uniform sampler2D czm_batchTexture; \n' +
                    'uniform vec2 czm_batchTextureDimensions; \n' +
                    'varying vec3 czm_modelColor; \n' +
// TODO: get batch id from vertex attribute
                    'int batchId = 0; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    czm_gltf_main(); \n' +
                    '    vec2 st = computeSt(batchId, czm_batchTextureDimensions); \n' +
                    '    vec4 modelProperties = texture2D(czm_batchTexture, st); \n' +
                    '    float show = modelProperties.a; \n' +
                    '    gl_Position *= show; \n' +                    // Per batched model show/hide
                    '    czm_modelColor = modelProperties.rgb; \n' +   // Pass batched model color to fragment shader
                    '}';
            } else {
                newMain =
                    'varying vec2 czm_modelSt; \n' +
                    'uniform vec2 czm_batchTextureDimensions; \n' +
// TODO: get batch id from vertex attribute
                    'int batchId = 0; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    czm_gltf_main(); \n' +
                    '    czm_modelSt = computeSt(batchId, czm_batchTextureDimensions); \n' +
                    '}';
            }

            return renamedSource + '\n' + computeSt + newMain;
        };
    }

    function getFragmentShaderCallback(content) {
        return function(source) {
            if (content._batchSize === 0) {
                // Do not change fragment shader source; the model was not batched
                return source;
            }

            var renamedSource = ShaderSource.replaceMain(source, 'czm_gltf_main');
            var newMain;

            if (content._useVTF) {
                // When VTF is supported, per patched model (e.g., building) show/hide already
                // happened in the fragment shader
                newMain =
                    'varying vec3 czm_modelColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    czm_gltf_main(); \n' +
                    '    gl_FragColor.rgb *= czm_modelColor; \n' +
                    '}';
            } else {
                newMain =
                    'uniform sampler2D czm_batchTexture; \n' +
                    'varying vec2 czm_modelSt; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    vec4 modelProperties = texture2D(czm_batchTexture, czm_modelSt); \n' +
                    '    if (modelProperties.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    czm_gltf_main(); \n' +
                    '    gl_FragColor.rgb *= modelProperties.rgb; \n' +
                    '}';
            }

            return renamedSource + '\n' + newMain;
        };
    }

    function getUniformMapCallback(content) {
        return function(uniformMap) {
            if (content._batchSize === 0) {
                // Do not change the uniform map; the model was not batched
                return uniformMap;
            }

            var batchUniformMap = {
                czm_batchTexture : function() {
                    return content._batchTexture;
                },
                czm_batchTextureDimensions : function() {
                    return content._batchTextureDimensions;
                }
            };

            return combine(uniformMap, batchUniformMap);
        };
    }

    Gltf3DTileContentProvider.prototype.request = function() {
        var model = Model.fromGltf({
            url : this._url,
            cull : false,           // The model is already culled by the 3D tiles
            releaseGltfJson : true, // Models are unique and will not benefit from caching so save memory
            vertexShaderLoaded : getVertexShaderCallback(this),
            fragmentShaderLoaded : getFragmentShaderCallback(this),
            uniformMapLoaded : getUniformMapCallback(this)
        });

        var that = this;
        when(model.readyPromise).then(function(model) {
            that.state = Cesium3DTileContentState.READY;
            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });

        this._model = model;
// TODO: allow this to not change the state depending on if the request is actually made, e.g., with RequestsByServer.
        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(this);
    };

    function setMaterialDiffuse(content, color) {
        var material = content._model.getMaterial('material_RoofColor');
        if (!defined(material)) {
//TODO: consistent material name
/*jshint debug: true*/
            debugger;
/*jshint debug: false*/
        }
        material.setValue('diffuse', color);
    }

    function applyDebugSettings(owner, content) {
        if (content.state === Cesium3DTileContentState.READY) {
            if (owner.debugColorizeTiles && !content._debugColorizeTiles) {
                content._debugColorizeTiles = true;
                setMaterialDiffuse(content, content._debugColor);
            } else if (!owner.debugColorizeTiles && content._debugColorizeTiles) {
                content._debugColorizeTiles = false;
                setMaterialDiffuse(content, Cartesian4.fromColor(Color.WHITE));
            }
        }
    }

    Gltf3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        // In the LOADED state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        var batchSize = this._batchSize;
        if (!defined(this._batchTexture) && (batchSize > 0)) {
            // Default batch texture to RGBA = 255: white highlight and show = true.
            var byteLength = batchSize * 4;
            var bytes = new Uint8Array(byteLength);
            for (var i = 0; i < byteLength; ++i) {
                bytes[i] = 255;
            }

// TODO: handle case when the batch size is > context.maximumTextureSize
            var dimensions = new Cartesian2(batchSize, 1);
            this._batchTexture = context.createTexture2D({
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
            this._batchTextureDimensions = dimensions;
            this._useVTF = (context.maximumVertexTextureImageUnits > 0);
        }

// TODO: how to update one building:
/*
        this._batchTexture.copyFrom({
            width : 1,
            height : 1,
            arrayBufferView : new Uint8Array([255, 255, 0, 255])
        }, 0, 0);
*/

        applyDebugSettings(owner, this);
        this._model.update(context, frameState, commandList);
    };

    Gltf3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Gltf3DTileContentProvider.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        this._batchTexture = this._batchTexture && this._batchTexture.destroy();
        return destroyObject(this);
    };

    return Gltf3DTileContentProvider;
});