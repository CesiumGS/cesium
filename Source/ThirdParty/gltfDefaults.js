/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Quaternion',
        '../Renderer/WebGLConstants'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        Quaternion,
        WebGLConstants) {
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

        asset.premultipliedAlpha = defaultValue(asset.premultipliedAlpha, false);
        profile.api = defaultValue(profile.api, 'WebGL');
        profile.version = defaultValue(profile.version, '1.0.2');

        if (defined(gltf.version)) {
            asset.version = defaultValue(asset.version, gltf.version);
            delete gltf.version;
        }
        if (typeof asset.version === 'number') {
            asset.version = asset.version.toFixed(1).toString();
        }
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
        if (!defined(gltf.extensions)) {
            gltf.extensions = {};
        }
        var extensions = gltf.extensions;

        if (!defined(extensions.KHR_materials_common)) {
            extensions.KHR_materials_common = {};
        }
        var khrMaterialsCommon = extensions.KHR_materials_common;

        if (defined(gltf.lights)) {
            khrMaterialsCommon.lights = gltf.lights;
            delete gltf.lights;
        }
        else if (!defined(khrMaterialsCommon.lights)) {
            khrMaterialsCommon.lights = {};
        }
        var lights = khrMaterialsCommon.lights;

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
                var material = materials[name];
                var instanceTechnique = material.instanceTechnique;
                if (defined(instanceTechnique)) {
                    material.technique = instanceTechnique.technique;
                    material.values = instanceTechnique.values;

                    delete material.instanceTechnique;
                }

                if (!defined(material.extensions)) {
                    if (!defined(material.technique)) {
                        delete material.values;
                        material.extensions = {
                            KHR_materials_common : {
                                technique : 'CONSTANT',
                                transparent: false,
                                values : {
                                    emission : {
                                        type: WebGLConstants.FLOAT_VEC4,
                                        value: [
                                            0.5,
                                            0.5,
                                            0.5,
                                            1
                                        ]
                                    }
                                }
                            }
                        };

                        if (!defined(gltf.extensionsUsed)) {
                            gltf.extensionsUsed = [];
                        }
                        var extensionsUsed = gltf.extensionsUsed;
                        if (extensionsUsed.indexOf('KHR_materials_common') === -1) {
                            extensionsUsed.push('KHR_materials_common');
                        }
                    }
                    else if (!defined(material.values)) {
                        material.values = {};
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

                var primitives = mesh.primitives.length;
                var length = primitives.length;
                for (var i = 0; i < length; ++i) {
                    var primitive = primitives[i];

                    if (!defined(primitive.attributes)) {
                        primitive.attributes = {};
                    }

                    // Backwards compatibility for glTF 0.8. primitive was renamed to mode.
                    var defaultMode = defaultValue(primitive.primitive, WebGLConstants.TRIANGLES);

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
        var hasAxisAngle = (parseFloat(gltf.asset.version) < 1.0);

        var axis = new Cartesian3();
        var quat = new Quaternion();
        for (var name in nodes) {
            if (nodes.hasOwnProperty(name)) {
                var node = nodes[name];

                if (!defined(node.children)) {
                    node.children = [];
                }

                if (hasAxisAngle && defined(node.rotation)) {
                    var rotation = node.rotation;
                    Cartesian3.fromArray(rotation, 0, axis);
                    Quaternion.fromAxisAngle(axis, rotation[3], quat);
                    node.rotation = [quat.x, quat.y, quat.z, quat.w];
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

                var instanceSkin = node.instanceSkin;
                if (defined(instanceSkin)) {
                    node.skeletons = instanceSkin.skeletons;
                    node.skin = instanceSkin.skin;
                    node.meshes = instanceSkin.meshes;
                    delete node.instanceSkin;
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
                var parameters = technique.parameters;
                for (var parameterName in parameters) {
                    var parameter = parameters[parameterName];
                    parameter.node = defaultValue(parameter.node, parameter.source);
                    parameter.source = undefined;
                }

                var passes = technique.passes;
                if (defined(passes)) {
                    var passName = defaultValue(technique.pass, 'defaultPass');
                    if (passes.hasOwnProperty(passName)) {
                        var pass = passes[passName];
                        var instanceProgram = pass.instanceProgram;

                        technique.attributes = defaultValue(technique.attributes, instanceProgram.attributes);
                        technique.program = defaultValue(technique.program, instanceProgram.program);
                        technique.uniforms = defaultValue(technique.uniforms, instanceProgram.uniforms);

                        technique.states = defaultValue(technique.states, pass.states);
                    }

                    technique.passes = undefined;
                    technique.pass = undefined;
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
     * Modifies gltf in place.
     *
     * @private
     */
    var gltfDefaults = function(gltf) {
        if (!defined(gltf)) {
            return undefined;
        }

        if (defined(gltf.allExtensions)) {
            gltf.extensionsUsed = gltf.allExtensions;
            gltf.allExtensions = undefined;
        }
        gltf.extensionsUsed = defaultValue(gltf.extensionsUsed, []);

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
