/*global define*/
define([
    '../Core/defaultValue',
    '../Core/defined',
    '../Renderer/WebGLConstants'
], function(
    defaultValue,
    defined,
    WebGLConstants) {
    "use strict";

    function generateLightParameters(gltf) {
        var result = {};

        var lights;
        if (defined(gltf.extensions) && defined(gltf.extensions.KHR_materials_common)) {
            lights = gltf.extensions.KHR_materials_common.lights;
        }

        if (defined(lights)) {
            // Figure out which node references the light
            var nodes = gltf.nodes;
            for (var nodeName in nodes) {
                if (nodes.hasOwnProperty(nodeName)) {
                    var node = nodes[nodeName];
                    if (defined(node.extensions) && defined(node.extensions.KHR_materials_common)) {
                        var nodeLightId = node.extensions.KHR_materials_common.light;
                        if (defined(nodeLightId) && defined(lights[nodeLightId])) {
                            lights[nodeLightId].node = nodeName;
                        }
                        delete node.extensions.KHR_materials_common;
                    }
                }
            }

            // Add light parameters to result
            var lightCount = 0;
            for(var lightName in lights) {
                if (lights.hasOwnProperty(lightName)) {
                    var light = lights[lightName];
                    var lightBaseName = 'light' + lightCount.toString();
                    switch(light.type) {
                        case "ambient":
                        {
                            var ambient = light.ambient;
                            result[lightBaseName + 'Color'] =
                            {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: ambient.color
                            };
                        }
                            break;
                        case "directional":
                        {
                            var directional = light.directional;
                            result[lightBaseName + 'Color'] =
                            {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: directional.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] =
                                {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                            }
                        }
                            break;
                        case "point":
                        {
                            var point = light.point;
                            result[lightBaseName + 'Color'] =
                            {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: point.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] =
                                {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                            }
                            result[lightBaseName + 'ConstantAttenuation'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: point.constantAttenuation
                            };
                            result[lightBaseName + 'LinearAttenuation'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: point.linearAttenuation
                            };
                            result[lightBaseName + 'QuadraticAttenuation'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: point.quadraticAttenuation
                            };
                        }
                            break;
                        case "spot":
                        {
                            var spot = light.spot;
                            result[lightBaseName + 'Color'] =
                            {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: spot.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] =
                                {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                                result[lightBaseName + 'InverseTransform'] = {
                                    node: light.node,
                                    semantic: 'MODELVIEWINVERSE',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                            }
                            result[lightBaseName + 'ConstantAttenuation'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: spot.constantAttenuation
                            };
                            result[lightBaseName + 'LinearAttenuation'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: spot.linearAttenuation
                            };
                            result[lightBaseName + 'QuadraticAttenuation'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: spot.quadraticAttenuation
                            };

                            result[lightBaseName + 'FallOffAngle'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: spot.fallOffAngle
                            };
                            result[lightBaseName + 'FallOffExponent'] =
                            {
                                type: WebGLConstants.FLOAT,
                                value: spot.fallOffExponent
                            };
                        }
                            break;
                    }
                    ++lightCount;
                }
            }

            delete gltf.extensions.KHR_materials_common;
        }

        return result;
    }

    var techniqueCount = 0;
    var shaderCount = 0;
    var programCount = 0;
    function generateTechnique(gltf, khrMaterialsCommon, attributes, lightParameters) {
        var techniques = gltf.techniques;
        var shaders = gltf.shaders;
        var programs = gltf.programs;
        attributes = defaultValue(attributes, []);
        var attributesCount = attributes.length;

        var vertexShader = 'precision highp float;\n';
        var fragmentShader = 'precision highp float;\n';

        // Generate IDs for our new objects
        var techniqueId;
        do {
            techniqueId = 'technique' + (techniqueCount++).toString();
        } while(defined(techniques[techniqueId]));

        var shaderId;
        var vertexShaderId;
        var fragmentShaderId;
        do {
            shaderId = 'shader' + (shaderCount++).toString();
            vertexShaderId = shaderId + 'VS';
            fragmentShaderId = shaderId + 'FS';
        } while(defined(shaders[vertexShaderId]) || defined(shaders[fragmentShaderId]));

        var programId;
        do {
            programId = 'program' + (programCount++).toString();
        } while(defined(programs[programId]));

        // Add techniques
        // TODO: Handle skinning
        var lowerCase;
        var techniqueAttributes = {};
        for (var i=0;i<attributesCount;++i) {
            lowerCase = attributes[i].toLowerCase();
            techniqueAttributes['a_' + lowerCase] = lowerCase;
        }

        var techniqueParameters = {
            // Add matrices
            modelViewMatrix: {
                semantic: 'MODELVIEW',
                type: WebGLConstants.FLOAT_MAT4
            },
            normalMatrix: {
                semantic: 'MODELVIEWINVERSETRANSPOSE',
                type: WebGLConstants.FLOAT_MAT3
            },
            projectionMatrix: {
                semantic: 'PROJECTION',
                type: WebGLConstants.FLOAT_MAT4
            }
        };

        // Add material parameters
        var typeValue;
        var values = khrMaterialsCommon.values;
        for(var name in values) {
            if (values.hasOwnProperty(name)) {
                var value = values[name];
                var type = typeof value;
                typeValue = -1;
                switch (type) {
                    case 'string':
                        typeValue = WebGLConstants.SAMPLER_2D;
                        break;
                    case 'number':
                        typeValue = WebGLConstants.FLOAT;
                        break;
                    default:
                        if (Array.isArray(value)) {
                            // 35664 (vec2), 35665 (vec3), 35666 (vec4)
                            typeValue = 35662 + value.length;
                        }
                        break;
                }
                if (typeValue > 0) {
                    lowerCase = name.toLowerCase();
                    techniqueParameters[lowerCase] = {
                        type: typeValue
                    };
                }
            }
        }

        // Copy light parameters into technique parameters
        if (defined(lightParameters)) {
            for (var lightParamName in lightParameters) {
                if (lightParameters.hasOwnProperty(lightParamName)) {
                    techniqueParameters[lightParamName] = lightParameters[lightParamName];
                }
            }
        }

        // Generate uniforms object before attributes are added
        var techniqueUniforms = {};
        for (var paramName in techniqueParameters) {
            if (techniqueParameters.hasOwnProperty(paramName)) {
                techniqueUniforms['u_' + paramName] = paramName;
            }
        }

        // Add attributes with semantics
        var vertexShaderMain = '';
        for (i=0;i<attributesCount;++i) {
            var attribute = attributes[i];
            typeValue = -1;
            if (attribute === 'POSITION') {
                typeValue = WebGLConstants.FLOAT_VEC3;
                vertexShader += 'attribute vec3 a_position;\n';
                vertexShader += 'uniform mat4 u_modelViewMatrix;\n';
                vertexShader += 'uniform mat4 u_projectionMatrix;\n';
                vertexShaderMain += '  vec4 pos = u_modelViewMatrix * vec4(a_position,1.0);\n';
                vertexShaderMain += '  gl_Position = u_projectionMatrix * pos;\n';
            }
            else if (attribute === 'NORMAL') {
                typeValue = WebGLConstants.FLOAT_VEC3;
                vertexShader += 'attribute vec3 a_normal;\n';
                vertexShader += 'varying vec3 v_normal;\n';
                vertexShader += 'uniform mat3 u_normalMatrix;\n';
                vertexShaderMain += '  v_normal = u_normalMatrix * a_normal;\n';

                fragmentShader += 'varying vec3 v_normal;\n';
            }
            else if (attribute.indexOf('TEXCOORD') === 0) {
                typeValue = WebGLConstants.FLOAT_VEC2;
                lowerCase = attribute.toLowerCase();
                var a_texcoord = 'a_' + lowerCase;
                var v_texcoord = 'v_' + lowerCase;
                vertexShader += 'attribute vec2 ' + a_texcoord + ';\n';
                vertexShader += 'varying vec2 ' + v_texcoord + ';\n';
                vertexShaderMain += '  ' + v_texcoord + ' = ' + a_texcoord + ';\n';

                fragmentShader += 'varying vec2 ' + v_texcoord + ';\n';
            }
            if (typeValue > 0) {
                lowerCase = attribute.toLowerCase();
                techniqueParameters[lowerCase] = {
                    semantic: attribute,
                    type: typeValue
                };
            }
        }
        vertexShader += 'void main(void) {\n';
        vertexShader += vertexShaderMain;
        vertexShader += '}\n';

        techniques[techniqueId] = {
            attributes: techniqueAttributes,
            parameters: techniqueParameters,
            program: programId,
            states: {enable: []},
            uniforms: techniqueUniforms
        };

        // Add shaders
        // TODO: Generate shader strings
        shaders[vertexShaderId] = {
            type: WebGLConstants.VERTEX_SHADER,
            uri: '',
            extras: {
                source: vertexShader
            }
        };
        shaders[fragmentShaderId] = {
            type: WebGLConstants.FRAGMENT_SHADER,
            uri: '',
            extras: {
                source: fragmentShader
            }
        };

        // Add program
        var programAttributes = [];
        for (i=0;i<attributesCount;++i) {
            programAttributes.push('a_' + attributes[i].toLowerCase());
        }

        programs[programId] = {
            attributes: programAttributes,
            fragmentShader: fragmentShaderId,
            vertexShader: vertexShaderId
        };

        return techniqueId;
    }

    function getKey(khrMaterialsCommon) {
        var key = '';
        key += 'technique:' + khrMaterialsCommon.technique + ';';

        var values = khrMaterialsCommon.values;
        var keys = Object.keys(values).sort();
        var keysCount = keys.length;
        for (var i=0;i<keysCount;++i) {
            var name = keys[i];
            if (values.hasOwnProperty(name)) {
                var value = values[name];
                key += name + ':';
                var type = typeof value;
                switch (type) {
                    case 'string':
                        key += 'texture';
                        break;
                    case 'number':
                        key += 'float';
                        break;
                    default:
                        if (Array.isArray(value)) {
                            key += 'vec' + value.length.toString();
                        }
                        break;
                }
                key += ';';
            }
        }
    }

    function getAttributes(materialId, meshes) {
        for (var name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var mesh = meshes[name];
                var primitives = mesh.primitives;
                var primitivesCount = primitives.length;
                for (var i=0;i<primitivesCount;++i) {
                    var primitive = primitives[i];
                    if (primitive.material === materialId) {
                        return Object.keys(primitive.attributes);
                    }
                }
            }
        }
    }

    /**
     * Modifies gltf in place.
     *
     * @private
     */
    var modelMaterialsCommon = function(gltf) {
        if (!defined(gltf)) {
            return undefined;
        }

        var hasExtension = false;
        var extensionsUsed = gltf.extensionsUsed;
        if (defined(extensionsUsed)) {
            var extensionsUsedCount = extensionsUsed.length;
            for(var i=0;i<extensionsUsedCount;++i) {
                if (extensionsUsed[i] === 'KHR_materials_common') {
                    hasExtension = true;
                    extensionsUsed.splice(i, 1);
                    break;
                }
            }
        }

        if (hasExtension) {
            if (!defined(gltf.programs)) {
                gltf.programs = {};
            }
            if (!defined(gltf.shaders)) {
                gltf.shaders = {};
            }
            if (!defined(gltf.techniques)) {
                gltf.techniques = {};
            }

            var lightParameters = generateLightParameters(gltf);

            var techniques = {};
            var materials = gltf.materials;
            var meshes = gltf.meshes;
            for (var name in materials) {
                if (materials.hasOwnProperty(name)) {
                    var material = materials[name];
                    var attributes = getAttributes(name, meshes);
                    if (defined(material.extensions) && defined(material.extensions.KHR_materials_common)) {
                        var khrMaterialsCommon = material.extensions.KHR_materials_common;
                        var key = getKey(khrMaterialsCommon);
                        var technique = techniques[key];
                        if (!defined(technique)) {
                            technique = generateTechnique(gltf, khrMaterialsCommon, attributes, lightParameters);
                        }

                        // Take advantage of the fact that we generate techniques that use the
                        // same names as the extension values.
                        material.values = khrMaterialsCommon.values;
                        material.technique = technique;

                        delete material.extensions.KHR_materials_common;
                    }
                }
            }
        }

        var json = JSON.stringify(gltf, null, 4);
        var a = document.createElement('a');
        a.setAttribute('href', 'data:text;base64,' + btoa(json));
        a.setAttribute('target', '_blank');
        a.setAttribute('download', 'model.json');
        a.click();

        return gltf;
    };

    return modelMaterialsCommon;
});