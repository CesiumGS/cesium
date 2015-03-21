/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

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

                var samplers = animations.samplers;

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

        // Backwards compatibility for glTF 0.8. profile was a string.
        if (!defined(asset.profile) || (typeof asset.profile === 'string')) {
            asset.profile = {};
        }
        var profile = asset.profile;

        asset.premultipliedAlpha = defaultValue(gltf.asset.premultipliedAlpha, false);
        profile.api = defaultValue(profile.api, 'WebGL');
        profile.version = defaultValue(profile.version, '1.0.2');
        asset.version = defaultValue(gltf.version, '0.9');
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

    function lightDefaults(gltf) {
        if (!defined(gltf.lights)) {
            gltf.lights = {};
        }
        var lights = gltf.lights;

        for (var name in lights) {
            if (lights.hasOwnProperty(name)) {
                var light = lights[name];
                if (light.type === 'ambient') {
                    if (!defined(light.ambient)) {
                        light.ambient = {};
                    }
                    var ambientLight = light.ambient;

                    if (!defined(ambientLight.color)) {
                        ambientLight.color = [1.0, 1.0, 1.0];
                    }
                } else if (light.type === 'directional') {
                    if (!defined(light.directional)) {
                        light.directional = {};
                    }
                    var directionalLight = light.directional;

                    if (!defined(directionalLight.color)) {
                        directionalLight.color = [1.0, 1.0, 1.0];
                    }
                } else if (light.type === 'point') {
                    if (!defined(light.point)) {
                        light.point = {};
                    }
                    var pointLight = light.point;

                    if (!defined(pointLight.color)) {
                        pointLight.color = [1.0, 1.0, 1.0];
                    }

                    pointLight.constantAttenuation = defaultValue(pointLight.constantAttenuation, 1.0);
                    pointLight.linearAttenuation = defaultValue(pointLight.linearAttenuation, 0.0);
                    pointLight.quadraticAttenuation = defaultValue(pointLight.quadraticAttenuation, 0.0);
                } else if (light.type === 'spot') {
                    if (!defined(light.spot)) {
                        light.spot = {};
                    }
                    var spotLight = light.spot;

                    if (!defined(spotLight.color)) {
                        spotLight.color = [1.0, 1.0, 1.0];
                    }

                    spotLight.constantAttenuation = defaultValue(spotLight.constantAttenuation, 1.0);
                    spotLight.fallOffAngle = defaultValue(spotLight.fallOffAngle, 3.14159265);
                    spotLight.fallOffExponent = defaultValue(spotLight.fallOffExponent, 0.0);
                    spotLight.linearAttenuation = defaultValue(spotLight.linearAttenuation, 0.0);
                    spotLight.quadraticAttenuation = defaultValue(spotLight.quadraticAttenuation, 0.0);
                }
            }
        }
    }

    function materialDefaults(gltf) {
        if (!defined(gltf.materials)) {
            gltf.materials = {};
        }
        var materials = gltf.materials;

        for (var name in materials) {
            if (materials.hasOwnProperty(name)) {
                var instanceTechnique = materials[name].instanceTechnique;
                if (!defined(instanceTechnique.values)) {
                    instanceTechnique.values = {};
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

                var primitives = mesh.primitives.length;
                var length = primitives.length;
                for (var i = 0; i < length; ++i) {
                    var primitive = primitives[i];

                    if (!defined(primitive.attributes)) {
                        primitive.attributes = {};
                    }

                    // Backwards compatibility for glTF 0.8. primitive was renamed to mode.
                    var defaultMode = defaultValue(primitive.primitive, WebGLRenderingContext.TRIANGLES);

                    primitive.mode = defaultValue(primitive.mode, defaultMode);
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
                    if (!(defined(node.translation) && defined(node.rotation) && defined(node.scale))) {
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
                            // GLTF_SPEC: What is the default?  https://github.com/KhronosGroup/glTF/issues/197
                            node.rotation = [1.0, 0.0, 0.0, 0.0];
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
                sampler.magFilter = defaultValue(sampler.magFilter, WebGLRenderingContext.LINEAR);
                sampler.minFilter = defaultValue(sampler.minFilter, WebGLRenderingContext.NEAREST_MIPMAP_LINEAR);
                sampler.wrapS = defaultValue(sampler.wrapS, WebGLRenderingContext.REPEAT);
                sampler.wrapT = defaultValue(sampler.wrapT, WebGLRenderingContext.REPEAT);
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
                if (!defined(scene.node)) {
                    scene.node = [];
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
                if (defined(skin.bindShapeMatrix)) {
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

        if (!defined(states.disable)) {
            states.disable = [];
        }
    }

    function techniqueDefaults(gltf) {
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

                var passes = technique.passes;
                for (var passName in passes) {
                    if (passes.hasOwnProperty(passName)) {
                        var pass = passes[passName];
                        var instanceProgram = pass.instanceProgram;

                        if (!defined(instanceProgram.attributes)) {
                            instanceProgram.attributes = {};
                        }

                        if (!defined(instanceProgram.uniforms)) {
                            instanceProgram.uniforms = {};
                        }

                        if (!defined(pass.states)) {
                            pass.states = {};
                        }
                        statesDefaults(pass.states);
                    }
                }
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
                texture.format = defaultValue(texture.format, WebGLRenderingContext.RGBA);
                texture.internalFormat = defaultValue(texture.internalFormat, texture.format);
                texture.target = defaultValue(texture.target, WebGLRenderingContext.TEXTURE_2D);
                texture.type = defaultValue(texture.type, WebGLRenderingContext.UNSIGNED_BYTE);
            }
        }
    }

    /**
     * Modifies gltf in place.
     *
     * @private
     */
    var gltfDefaults = function(gltf) {
        if (!defined(gltf)) {
            return undefined;
        }

        if (!defined(gltf.allExtensions)) {
            gltf.allExtensions = [];
        }
        accessorDefaults(gltf);
        animationDefaults(gltf);
        assetDefaults(gltf);
        bufferDefaults(gltf);
        bufferViewDefaults(gltf);
        cameraDefaults(gltf);
        imageDefaults(gltf);
        lightDefaults(gltf);
        materialDefaults(gltf);
        meshDefaults(gltf);
        nodeDefaults(gltf);
        programDefaults(gltf);
        samplerDefaults(gltf);
        sceneDefaults(gltf);
        shaderDefaults(gltf);
        skinDefaults(gltf);
        techniqueDefaults(gltf);
        textureDefaults(gltf);

        return gltf;
    };

    return gltfDefaults;
});
