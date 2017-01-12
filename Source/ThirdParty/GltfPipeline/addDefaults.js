/*global define*/
define([
        './addExtensionsUsed',
        '../../Core/Cartesian3',
        '../../Core/Quaternion',
        '../../Core/WebGLConstants',
        '../../Core/defaultValue',
        '../../Core/defined'
    ], function(
        addExtensionsUsed,
        Cartesian3,
        Quaternion,
        WebGLConstants,
        defaultValue,
        defined) {
    'use strict';

    function accessorDefaults(gltf) {
        if (!defined(gltf.accessors)) {
            gltf.accessors = {};
        }
        var accessors = gltf.accessors;

        for (var name in accessors) {
            if (accessors.hasOwnProperty(name)) {
                var accessor = accessors[name];
                accessor.byteStride = defaultValue(accessor.byteStride, 0);
            }
        }
    }

    function animationDefaults(gltf) {
        if (!defined(gltf.animations)) {
            gltf.animations = {};
        }
        var animations = gltf.animations;

        for (var name in animations) {
            if (animations.hasOwnProperty(name)) {
                var animation = animations[name];

                if (!defined(animation.channels)) {
                    animation.channels = [];
                }

                if (!defined(animation.parameters)) {
                    animation.parameters = {};
                }

                if (!defined(animation.samplers)) {
                    animation.samplers = {};
                }

                var samplers = animation.samplers;

                for (var samplerName in samplers) {
                    if (samplers.hasOwnProperty(samplerName)) {
                        var sampler = samplers[samplerName];
                        sampler.interpolation = defaultValue(sampler.interpolation, 'LINEAR');
                    }
                }
            }
        }
    }

    function assetDefaults(gltf) {
        if (!defined(gltf.asset)) {
            gltf.asset = {};
        }
        var asset = gltf.asset;
        if (!defined(asset.profile)) {
            asset.profile = {};
        }
        var profile = asset.profile;
        asset.premultipliedAlpha = defaultValue(asset.premultipliedAlpha, false);
        profile.api = defaultValue(profile.api, 'WebGL');
        profile.version = defaultValue(profile.version, '1.0');
    }

    function bufferDefaults(gltf) {
        if (!defined(gltf.buffers)) {
            gltf.buffers = {};
        }
        var buffers = gltf.buffers;

        for (var name in buffers) {
            if (buffers.hasOwnProperty(name)) {
                var buffer = buffers[name];
                buffer.type = defaultValue(buffer.type, 'arraybuffer');
            }
        }
    }

    function bufferViewDefaults(gltf) {
        if (!defined(gltf.bufferViews)) {
            gltf.bufferViews = {};
        }
    }

    function cameraDefaults(gltf) {
        if (!defined(gltf.cameras)) {
            gltf.cameras = {};
        }
    }

    function imageDefaults(gltf) {
        if (!defined(gltf.images)) {
            gltf.images = {};
        }
    }

    function checkIfFloatVec4(value) {
        if (defined(value) && value.length === 4) {
            if (typeof(value[0]) === 'number' &&
                typeof(value[1]) === 'number' &&
                typeof(value[2]) === 'number' &&
                typeof(value[3]) === 'number') {
                return value;
            }
        }
        return [0, 0, 0, 1];
    }

    function guessExtensionTechnique(gltf, material, options) {
        // Replaces the material technique, extension, and values with a close equivalent from KHR_materials_common.
        // If no equivalent can be found, defaults to blinn for specular materials and lambert otherwise
        var technique = options.technique;
        var values = defined(material.values) ? material.values : {};

        var ambient = checkIfFloatVec4(values.ambient);
        var diffuse = typeof(values.diffuse) === 'string' ? values.diffuse : checkIfFloatVec4(values.diffuse);
        var emission = typeof(values.emission) === 'string' ? values.emission : checkIfFloatVec4(values.emission);
        var specular = typeof(values.specular) === 'string' ? values.specular : checkIfFloatVec4(values.specular);
        var shininess = typeof(values.shininess) === 'number' ? values.shininess : 0.0;

        if (!defined(technique)) {
            if (defined(values.specular) || defined(values.shininess)) {
                technique = 'BLINN';
            } else {
                technique = 'LAMBERT';
            }
        }

        var transparency = typeof(values.transparency) === 'number' ? values.transparency : 1.0;

        var diffuseTransparent = false;
        if (typeof diffuse === 'string') {
            diffuseTransparent = gltf.images[gltf.textures[diffuse].source].extras._pipeline.transparent;
        } else {
            diffuseTransparent = diffuse[3] < 1.0;
        }

        var transparent = (transparency < 1.0) || diffuseTransparent;

        // Build an extensions object. Wipe existing extensions and values, if any.
        if (defined(material.extensions)) {
            delete material.extensions;
        }
        if (defined(material.values)) {
            delete material.values;
        }

        material.extensions = {
            KHR_materials_common : {
                technique : technique,
                values : {
                    ambient : ambient,
                    diffuse : diffuse,
                    doubleSided : false,
                    emission : emission,
                    specular : specular,
                    shininess : shininess,
                    transparency : transparency,
                    transparent : transparent
                }
            }
        };
    }

    function materialDefaults(gltf, options) {
        if (!defined(gltf.materials)) {
            gltf.materials = {};
        }
        var materials = gltf.materials;

        for (var name in materials) {
            if (materials.hasOwnProperty(name)) {
                var material = materials[name];
                if (!defined(material.technique)) {
                    if (!defined(material.extensions) || Object.keys(material.extensions).length === 0) {
                        guessExtensionTechnique(gltf, material, options);
                        addExtensionsUsed(gltf, 'KHR_materials_common');
                    }
                }
                else if (!defined(material.values)) {
                    material.values = {};
                }

                if (defined(material.values) && defined(material.values.diffuse)) {
                    // Check if the diffuse texture/color is transparent
                    var diffuse = material.values.diffuse;
                    var diffuseTransparent = false;
                    if (typeof diffuse === 'string') {
                        diffuseTransparent = gltf.images[gltf.textures[diffuse].source].extras._pipeline.transparent;
                    } else {
                        diffuseTransparent = diffuse[3] < 1.0;
                    }

                    var technique = gltf.techniques[material.technique];
                    var blendingEnabled = technique.states.enable.indexOf(WebGLConstants.BLEND) > -1;

                    // Override the technique's states if blending isn't already enabled
                    if (diffuseTransparent && !blendingEnabled) {
                        technique.states = {
                            enable : [
                                WebGLConstants.DEPTH_TEST,
                                WebGLConstants.BLEND
                            ],
                            depthMask : false,
                            functions : {
                                blendEquationSeparate : [
                                    WebGLConstants.FUNC_ADD,
                                    WebGLConstants.FUNC_ADD
                                ],
                                blendFuncSeparate : [
                                    WebGLConstants.ONE,
                                    WebGLConstants.ONE_MINUS_SRC_ALPHA,
                                    WebGLConstants.ONE,
                                    WebGLConstants.ONE_MINUS_SRC_ALPHA
                                ]
                            }
                        };
                    }
                }
            }
        }
    }

    function meshDefaults(gltf) {
        if (!defined(gltf.meshes)) {
            gltf.meshes = {};
        }
        var meshes = gltf.meshes;

        for (var name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var mesh = meshes[name];
                if (!defined(mesh.primitives)) {
                    mesh.primitives = [];
                }

                var primitives = mesh.primitives;
                var length = primitives.length;
                for (var i = 0; i < length; ++i) {
                    var primitive = primitives[i];
                    if (!defined(primitive.attributes)) {
                        primitive.attributes = {};
                    }
                    primitive.mode = defaultValue(primitive.mode, WebGLConstants.TRIANGLES);

                }
            }
        }
    }

    function nodeDefaults(gltf) {
        if (!defined(gltf.nodes)) {
            gltf.nodes = {};
        }
        var nodes = gltf.nodes;
        for (var name in nodes) {
            if (nodes.hasOwnProperty(name)) {
                var node = nodes[name];

                if (!defined(node.children)) {
                    node.children = [];
                }

                if (!defined(node.matrix)) {
                    // Add default identity matrix if there is no matrix property and no TRS properties
                    if (!defined(node.translation) && !defined(node.rotation) && !defined(node.scale)) {
                        node.matrix = [
                            1.0, 0.0, 0.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            0.0, 0.0, 1.0, 0.0,
                            0.0, 0.0, 0.0, 1.0
                        ];
                    } else {
                        if (!defined(node.translation)) {
                            node.translation = [0.0, 0.0, 0.0];
                        }

                        if (!defined(node.rotation)) {
                            node.rotation = [0.0, 0.0, 0.0, 1.0];
                        }

                        if (!defined(node.scale)) {
                            node.scale = [1.0, 1.0, 1.0];
                        }
                    }
                }
            }
        }
    }

    function programDefaults(gltf) {
        if (!defined(gltf.programs)) {
            gltf.programs = {};
        }
        var programs = gltf.programs;

        for (var name in programs) {
            if (programs.hasOwnProperty(name)) {
                var program = programs[name];
                if (!defined(program.attributes)) {
                    program.attributes = [];
                }
            }
        }
    }

    function samplerDefaults(gltf) {
        if (!defined(gltf.samplers)) {
            gltf.samplers = {};
        }
        var samplers = gltf.samplers;

        for (var name in samplers) {
            if (samplers.hasOwnProperty(name)) {
                var sampler = samplers[name];
                sampler.magFilter = defaultValue(sampler.magFilter, WebGLConstants.LINEAR);
                sampler.minFilter = defaultValue(sampler.minFilter, WebGLConstants.NEAREST_MIPMAP_LINEAR);
                sampler.wrapS = defaultValue(sampler.wrapS, WebGLConstants.REPEAT);
                sampler.wrapT = defaultValue(sampler.wrapT, WebGLConstants.REPEAT);
            }
        }
    }

    function sceneDefaults(gltf) {
        if (!defined(gltf.scenes)) {
            gltf.scenes = {};
        }
        var scenes = gltf.scenes;

        for (var name in scenes) {
            if (scenes.hasOwnProperty(name)) {
                var scene = scenes[name];
                if (!defined(scene.nodes)) {
                    scene.nodes = [];
                }
            }
        }
    }

    function shaderDefaults(gltf) {
        if (!defined(gltf.shaders)) {
            gltf.shaders = {};
        }
    }

    function skinDefaults(gltf) {
        if (!defined(gltf.skins)) {
            gltf.skins = {};
        }
        var skins = gltf.skins;

        for (var name in skins) {
            if (skins.hasOwnProperty(name)) {
                var skin = skins[name];
                if (!defined(skin.bindShapeMatrix)) {
                    skin.bindShapeMatrix = [
                        1.0, 0.0, 0.0, 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        0.0, 0.0, 1.0, 0.0,
                        0.0, 0.0, 0.0, 1.0
                    ];
                }
            }
        }
    }

    function statesDefaults(states) {
        if (!defined(states.enable)) {
            states.enable = [];
        }
    }

    function techniqueDefaults(gltf, options) {
        if (!defined(gltf.techniques)) {
            gltf.techniques = {};
        }
        var techniques = gltf.techniques;

        for (var name in techniques) {
            if (techniques.hasOwnProperty(name)) {
                var technique = techniques[name];
                if (!defined(technique.parameters)) {
                    technique.parameters = {};
                }
                var parameters = technique.parameters;
                for (var parameterName in parameters) {
                    if (parameters.hasOwnProperty(parameterName)) {
                        var parameter = parameters[parameterName];
                        parameter.node = defaultValue(parameter.node, parameter.source);
                        parameter.source = undefined;
                    }
                }

                // Give the diffuse uniform a semantic to support color replacement in 3D Tiles
                if (defined(parameters.diffuse) && options.optimizeForCesium) {
                    parameters.diffuse.semantic = '_3DTILESDIFFUSE';
                }

                if (!defined(technique.attributes)) {
                    technique.attributes = {};
                }

                if (!defined(technique.uniforms)) {
                    technique.uniforms = {};
                }

                if (!defined(technique.states)) {
                    technique.states = {};
                }
                statesDefaults(technique.states);
            }
        }
    }

    function textureDefaults(gltf) {
        if (!defined(gltf.textures)) {
            gltf.textures = {};
        }
        var textures = gltf.textures;

        for (var name in textures) {
            if (textures.hasOwnProperty(name)) {
                var texture = textures[name];
                texture.format = defaultValue(texture.format, WebGLConstants.RGBA);
                texture.internalFormat = defaultValue(texture.internalFormat, texture.format);
                texture.target = defaultValue(texture.target, WebGLConstants.TEXTURE_2D);
                texture.type = defaultValue(texture.type, WebGLConstants.UNSIGNED_BYTE);
            }
        }
    }

    /**
     * Adds default glTF values if they don't exist.
     *
     * The glTF asset must be initialized for the pipeline.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.technique] The shading technique to use. Possible techniques are 'CONSTANT', 'LAMBERT', 'BLINN', and 'PHONG'.
     * @param {Boolean} [options.optimizeForCesium] Optimize the defaults for CesiumCore. Uses the Cesium sun as the default light source.
     * @returns {Object} The modified glTF.
     *
     * @see addPipelineExtras
     * @see loadGltfUris
     */
    function addDefaults(gltf, options) {
        gltf = defaultValue(gltf, {});
        options = defaultValue(options, {});
        gltf.extensionsUsed = defaultValue(gltf.extensionsUsed, []);

        accessorDefaults(gltf);
        animationDefaults(gltf);
        assetDefaults(gltf);
        bufferDefaults(gltf);
        bufferViewDefaults(gltf);
        cameraDefaults(gltf);
        imageDefaults(gltf);
        techniqueDefaults(gltf, options);
        materialDefaults(gltf, options);
        meshDefaults(gltf);
        nodeDefaults(gltf);
        programDefaults(gltf);
        samplerDefaults(gltf);
        sceneDefaults(gltf);
        shaderDefaults(gltf);
        skinDefaults(gltf);
        textureDefaults(gltf);

        return gltf;
    }

    return addDefaults;
});