define([
        './addToArray',
        './ForEach',
        '../../Core/clone',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/WebGLConstants'
    ], function(
        addToArray,
        ForEach,
        clone,
        defaultValue,
        defined,
        WebGLConstants) {
    'use strict';

    var gltfTemplate = {
        accessors: [],
        animations : [
            {
                channels : [],
                samplers : [
                    {
                        interpolation : 'LINEAR'
                    }
                ]
            }
        ],
        asset : {},
        buffers : [
            {
                byteLength: 0,
                type: 'arraybuffer'
            }
        ],
        bufferViews: [
            {
                byteLength: 0
            }
        ],
        cameras: [],
        images: [],
        materials: [
            {
                values: function(material) {
                    var extensions = defaultValue(material.extensions, {});
                    var materialsCommon = extensions.KHR_materials_common;
                    if (!defined(materialsCommon)) {
                        return {};
                    }
                },
                extensions: function(material) {
                    var extensions = defaultValue(material.extensions, {});
                    var materialsCommon = extensions.KHR_materials_common;
                    if (defined(materialsCommon)) {
                        var technique = materialsCommon.technique;
                        var defaults = {
                            ambient: [0.0, 0.0, 0.0, 1.0],
                            emission: [0.0, 0.0, 0.0, 1.0],
                            transparency: 1.0
                        };
                        if (technique !== 'CONSTANT') {
                            defaults.diffuse = [0.0, 0.0, 0.0, 1.0];
                            if (technique !== 'LAMBERT') {
                                defaults.specular = [0.0, 0.0, 0.0, 1.0];
                                defaults.shininess = 0.0;
                            }
                        }
                        return {
                            KHR_materials_common: {
                                doubleSided: false,
                                transparent: false,
                                values: defaults
                            }
                        };
                    }
                }
            }
        ],
        meshes : [
            {
                primitives : [
                    {
                        attributes : {},
                        mode : WebGLConstants.TRIANGLES
                    }
                ]
            }
        ],
        nodes : [
            {
                children : [],
                matrix : function(node) {
                    if (!defined(node.translation) && !defined(node.rotation) && !defined(node.scale)) {
                        return [
                            1.0, 0.0, 0.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            0.0, 0.0, 1.0, 0.0,
                            0.0, 0.0, 0.0, 1.0
                        ];
                    }
                },
                rotation : function(node) {
                    if (defined(node.translation) || defined(node.scale)) {
                        return [0.0, 0.0, 0.0, 1.0];
                    }
                },
                scale : function(node) {
                    if (defined(node.translation) || defined(node.rotation)) {
                        return [1.0, 1.0, 1.0];
                    }
                },
                translation : function(node) {
                    if (defined(node.rotation) || defined(node.scale)) {
                        return [0.0, 0.0, 0.0];
                    }
                }
            }
        ],
        programs : [
            {
                attributes : []
            }
        ],
        samplers : [
            {
                magFilter: WebGLConstants.LINEAR,
                minFilter : WebGLConstants.NEAREST_MIPMAP_LINEAR,
                wrapS : WebGLConstants.REPEAT,
                wrapT : WebGLConstants.REPEAT
            }
        ],
        scenes : [
            {
                nodes : []
            }
        ],
        shaders : [],
        skins : [
            {
                bindShapeMatrix : [
                    1.0, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0
                ]
            }
        ],
        techniques : [
            {
                parameters: {},
                attributes: {},
                uniforms: {},
                states: {
                    enable: []
                }
            }
        ],
        textures : [
            {
                format: WebGLConstants.RGBA,
                internalFormat: WebGLConstants.RGBA,
                target: WebGLConstants.TEXTURE_2D,
                type: WebGLConstants.UNSIGNED_BYTE
            }
        ],
        extensionsUsed : [],
        extensionsRequired : []
    };

    function addDefaultsFromTemplate(object, template) {
        for (var id in template) {
            if (template.hasOwnProperty(id)) {
                var templateValue = template[id];
                if (typeof templateValue === 'function') {
                    templateValue = templateValue(object);
                }
                if (defined(templateValue)) {
                    if (typeof templateValue === 'object') {
                        if (Array.isArray(templateValue)) {
                            var arrayValue = defaultValue(object[id], []);
                            if (templateValue.length > 0) {
                                var arrayTemplate = templateValue[0];
                                if (typeof arrayTemplate === 'object') {
                                    var arrayValueLength = arrayValue.length;
                                    for (var i = 0; i < arrayValueLength; i++) {
                                        addDefaultsFromTemplate(arrayValue[i], arrayTemplate);
                                    }
                                } else {
                                    arrayValue = defaultValue(object[id], templateValue);
                                }
                            }
                            object[id] = arrayValue;
                        } else {
                            var applyTemplate = templateValue['*'];
                            object[id] = defaultValue(object[id], {});
                            var objectValue = object[id];
                            if (defined(applyTemplate)) {
                                for (var subId in objectValue) {
                                    if (objectValue.hasOwnProperty(subId) && subId !== 'extras') {
                                        var subObject = objectValue[subId];
                                        addDefaultsFromTemplate(subObject, applyTemplate);
                                    }
                                }
                            } else {
                                addDefaultsFromTemplate(objectValue, templateValue);
                            }
                        }
                    } else {
                        object[id] = defaultValue(object[id], templateValue);
                    }
                }
            }
        }
    }

    var defaultMaterial = {
        values : {
            emission : [
                0.5, 0.5, 0.5, 1.0
            ]
        },
        extras : {
            _pipeline: {}
        }
    };

    var defaultTechnique = {
        attributes : {
            a_position : 'position'
        },
        parameters : {
            modelViewMatrix : {
                semantic : 'MODELVIEW',
                type : WebGLConstants.FLOAT_MAT4
            },
            projectionMatrix : {
                semantic : 'PROJECTION',
                type : WebGLConstants.FLOAT_MAT4
            },
            emission : {
                type : WebGLConstants.FLOAT_VEC4,
                value : [
                    0.5, 0.5, 0.5, 1.0
                ]
            },
            position : {
                semantic: 'POSITION',
                type: WebGLConstants.FLOAT_VEC3
            }
        },
        states : {
            enable : [
                WebGLConstants.CULL_FACE,
                WebGLConstants.DEPTH_TEST
            ]
        },
        uniforms : {
            u_modelViewMatrix : 'modelViewMatrix',
            u_projectionMatrix : 'projectionMatrix',
            u_emission : 'emission'
        }
    };

    var defaultProgram = {
        attributes : [
            'a_position'
        ]
    };

    var defaultVertexShader = {
        type : WebGLConstants.VERTEX_SHADER,
        extras : {
            _pipeline : {
                extension : '.vert',
                source : '' +
                    'precision highp float;\n' +
                    '\n' +
                    'uniform mat4 u_modelViewMatrix;\n' +
                    'uniform mat4 u_projectionMatrix;\n' +
                    '\n' +
                    'attribute vec3 a_position;\n' +
                    '\n' +
                    'void main (void)\n' +
                    '{\n' +
                    '    gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);\n' +
                    '}\n'
            }
        }
    };

    var defaultFragmentShader = {
        type : WebGLConstants.FRAGMENT_SHADER,
        extras : {
            _pipeline : {
                extension: '.frag',
                source : '' +
                    'precision highp float;\n' +
                    '\n' +
                    'uniform vec4 u_emission;\n' +
                    '\n' +
                    'void main(void)\n' +
                    '{\n' +
                    '    gl_FragColor = u_emission;\n' +
                    '}\n'
            }
        }
    };

    function addDefaultMaterial(gltf) {
        var materials = gltf.materials;
        var meshes = gltf.meshes;

        var defaultMaterialId;

        var meshesLength = meshes.length;
        for (var meshId = 0; meshId < meshesLength; meshId++) {
            var mesh = meshes[meshId];
            var primitives = mesh.primitives;
            var primitivesLength = primitives.length;
            for (var j = 0; j < primitivesLength; j++) {
                var primitive = primitives[j];
                if (!defined(primitive.material)) {
                    if (!defined(defaultMaterialId)) {
                        defaultMaterialId = addToArray(materials, clone(defaultMaterial, true));
                    }
                    primitive.material = defaultMaterialId;
                }
            }
        }
    }

    function addDefaultTechnique(gltf) {
        var materials = gltf.materials;
        var techniques = gltf.techniques;
        var programs = gltf.programs;
        var shaders = gltf.shaders;

        var defaultTechniqueId;

        var materialsLength = materials.length;
        for (var materialId = 0; materialId < materialsLength; materialId++) {
            var material = materials[materialId];
            var techniqueId = material.technique;
            var extensions = defaultValue(material.extensions, {});
            var materialsCommon = extensions.KHR_materials_common;
            if (!defined(techniqueId)) {
                if (!defined(defaultTechniqueId) && !defined(materialsCommon)) {
                    var technique = clone(defaultTechnique, true);
                    defaultTechniqueId = addToArray(techniques, technique);

                    var program = clone(defaultProgram, true);
                    technique.program = addToArray(programs, program);

                    var vertexShader = clone(defaultVertexShader, true);
                    program.vertexShader = addToArray(shaders, vertexShader);

                    var fragmentShader = clone(defaultFragmentShader, true);
                    program.fragmentShader = addToArray(shaders, fragmentShader);
                }
                material.technique = defaultTechniqueId;
            }
        }
    }

    function addDefaultByteOffsets(gltf) {
        var accessors = gltf.accessors;

        var accessorLength = accessors.length;
        for (var i = 0; i < accessorLength; i++) {
            var accessor = accessors[i];
            if (!defined(accessor.byteOffset)) {
                accessor.byteOffset = 0;
            }
        }

        var bufferViews = gltf.bufferViews;

        var bufferViewsLength = bufferViews.length;
        for (var j = 0; j < bufferViewsLength; j++) {
            var bufferView = bufferViews[j];
            if (!defined(bufferView.byteOffset)) {
                bufferView.byteOffset = 0;
            }
        }
    }

    function selectDefaultScene(gltf) {
        if (defined(gltf.scenes) && !defined(gltf.scene)) {
            gltf.scene = 0;
        }
    }

    function optimizeForCesium(gltf) {
        // Give the diffuse uniform a semantic to support color replacement in 3D Tiles
        var techniques = gltf.techniques;
        var techniquesLength = techniques.length;
        for (var techniqueId = 0; techniqueId < techniquesLength; techniqueId++) {
            var technique = techniques[techniqueId];
            var parameters = technique.parameters;
            if (defined(parameters.diffuse)) {
                parameters.diffuse.semantic = '_3DTILESDIFFUSE';
            }
        }
    }

    function inferBufferViewTargets(gltf) {
        // If bufferView elements are missing targets, we can infer their type from their use
        var needsTarget = {};
        var shouldTraverse = 0;
        ForEach.bufferView(gltf, function(bufferView, bufferViewId) {
            if (!defined(bufferView.target)) {
                needsTarget[bufferViewId] = true;
                shouldTraverse++;
            }
        });
        if (shouldTraverse > 0) {
            var accessors = gltf.accessors;
            var bufferViews = gltf.bufferViews;
            ForEach.mesh(gltf, function (mesh) {
                ForEach.meshPrimitive(mesh, function (primitive) {
                    var indices = primitive.indices;
                    if (defined(indices)) {
                        var accessor = accessors[indices];
                        var bufferViewId = accessor.bufferView;
                        if (needsTarget[bufferViewId]) {
                            var bufferView = bufferViews[bufferViewId];
                            if (defined(bufferView)) {
                                bufferView.target = WebGLConstants.ELEMENT_ARRAY_BUFFER;
                                needsTarget[bufferViewId] = false;
                                shouldTraverse--;
                            }
                        }
                    }
                    ForEach.meshPrimitiveAttribute(primitive, function (accessorId) {
                        var accessor = accessors[accessorId];
                        var bufferViewId = accessor.bufferView;
                        if (needsTarget[bufferViewId]) {
                            var bufferView = bufferViews[bufferViewId];
                            if (defined(bufferView)) {
                                bufferView.target = WebGLConstants.ARRAY_BUFFER;
                                needsTarget[bufferViewId] = false;
                                shouldTraverse--;
                            }
                        }
                    });
                    ForEach.meshPrimitiveTargetAttribute(primitive, function (targetAttribute) {
                        var bufferViewId = accessors[targetAttribute].bufferView;
                        if (needsTarget[bufferViewId]) {
                            var bufferView = bufferViews[bufferViewId];
                            if (defined(bufferView)) {
                                bufferView.target = WebGLConstants.ARRAY_BUFFER;
                                needsTarget[bufferViewId] = false;
                                shouldTraverse--;
                            }
                        }
                    });
                });
                if (shouldTraverse === 0) {
                    return true;
                }
            });
        }
    }

    /**
     * Adds default glTF values if they don't exist.
     *
     * The glTF asset must be initialized for the pipeline.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {Object} [options] An object with the following properties:
     * @param {Boolean} [options.optimizeForCesium] Optimize the defaults for Cesium. Uses the Cesium sun as the default light source.
     * @returns {Object} The modified glTF.
     *
     * @see addPipelineExtras
     * @see loadGltfUris
     */
    function addDefaults(gltf, options) {
        options = defaultValue(options, {});
        addDefaultsFromTemplate(gltf, gltfTemplate);
        addDefaultMaterial(gltf);
        addDefaultTechnique(gltf);
        addDefaultByteOffsets(gltf);
        selectDefaultScene(gltf);
        inferBufferViewTargets(gltf);
        if (options.optimizeForCesium) {
            optimizeForCesium(gltf);
        }
        return gltf;
    }

    return addDefaults;
});
