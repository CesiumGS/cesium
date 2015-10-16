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

    function webGLConstantToGlslType(webGLValue) {
        switch(webGLValue) {
            case WebGLConstants.FLOAT:
                return 'float';
            case WebGLConstants.FLOAT_VEC2:
                return 'vec2';
            case WebGLConstants.FLOAT_VEC3:
                return 'vec3';
            case WebGLConstants.FLOAT_VEC4:
                return 'vec4';
            case WebGLConstants.FLOAT_MAT2:
                return 'mat2';
            case WebGLConstants.FLOAT_MAT3:
                return 'mat3';
            case WebGLConstants.FLOAT_MAT4:
                return 'mat4';
            case WebGLConstants.SAMPLER_2D:
                return 'sampler2D';
        }
    }

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
                    var lightType = light.type;
                    if ((lightType !== 'ambient') && !defined(light.node)) {
                        delete lights[lightName];
                        continue;
                    }
                    var lightBaseName = 'light' + lightCount.toString();
                    light.baseName = lightBaseName;
                    switch(lightType) {
                        case 'ambient':
                            var ambient = light.ambient;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: ambient.color
                            };
                            break;
                        case 'directional':
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
                            break;
                        case 'point':
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
                            result[lightBaseName + 'Attenuation'] =
                            {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: [point.constantAttenuation, point.linearAttenuation, point.quadraticAttenuation]
                            };
                            break;
                        case 'spot':
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
                                    type: WebGLConstants.FLOAT_MAT4,
                                    useInFragment: true
                                };
                            }
                            result[lightBaseName + 'Attenuation'] =
                            {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: [spot.constantAttenuation, spot.linearAttenuation, spot.quadraticAttenuation]
                            };

                            result[lightBaseName + 'FallOff'] =
                            {
                                type: WebGLConstants.FLOAT_VEC2,
                                value: [spot.fallOffAngle, spot.fallOffExponent]
                            };
                            break;
                    }
                    ++lightCount;
                }
            }
        }

        return result;
    }

    function getNextId(dictionary, baseName, startingCount) {
        var count = defaultValue(startingCount, 0);
        var nextId;
        do {
            nextId = baseName + (count++).toString();
        } while(defined(dictionary[nextId]));

        return nextId;
    }

    var techniqueCount = 0;
    var vertexShaderCount = 0;
    var fragmentShaderCount = 0;
    var programCount = 0;
    function generateTechnique(gltf, khrMaterialsCommon, attributes, lightParameters, jointCount) {
        var techniques = gltf.techniques;
        var shaders = gltf.shaders;
        var programs = gltf.programs;
        attributes = defaultValue(attributes, []);
        var attributesCount = attributes.length;
        var lightingModel = khrMaterialsCommon.technique.toUpperCase();
        var lights;
        if (defined(gltf.extensions) && defined(gltf.extensions.KHR_materials_common)) {
            lights = gltf.extensions.KHR_materials_common.lights;
        }
        var hasSkinning = (jointCount > 0);
        var values = khrMaterialsCommon.values;
        var isDoubleSided = values.doubleSided;
        delete values.doubleSided;

        var vertexShader = 'precision highp float;\n';
        var fragmentShader = 'precision highp float;\n';

        // Generate IDs for our new objects
        var techniqueId = getNextId(techniques, 'technique', techniqueCount);
        var vertexShaderId = getNextId(shaders, 'vertexShader', vertexShaderCount);
        var fragmentShaderId = getNextId(shaders, 'fragmentShader', fragmentShaderCount);
        var programId = getNextId(programs, 'program', programCount);

        // Add techniques
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

        if (hasSkinning) {
            techniqueParameters.jointMatrix = {
                count: jointCount,
                semantic: 'JOINTMATRIX',
                type: WebGLConstants.FLOAT_MAT4
            };
        }

        // Add material parameters
        var hasAlpha = false;
        var typeValue;
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
                        if (!hasAlpha && (name === 'transparency')) {
                            hasAlpha = (value !== 1.0);
                        }
                        break;
                    default:
                        if (Array.isArray(value)) {
                            // 35664 (vec2), 35665 (vec3), 35666 (vec4)
                            typeValue = 35662 + value.length;
                            if (!hasAlpha && (typeValue === WebGLConstants.FLOAT_VEC4) && (name === 'diffuse')) {
                                hasAlpha = (value[3] !== 1.0);
                            }
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
                var param = techniqueParameters[paramName];
                techniqueUniforms['u_' + paramName] = paramName;
                var arraySize = defined(param.count) ? '['+param.count+']' : '';
                if (((param.type !== WebGLConstants.FLOAT_MAT3) && (param.type !== WebGLConstants.FLOAT_MAT4)) ||
                    param.useInFragment) {
                    fragmentShader += 'uniform ' + webGLConstantToGlslType(param.type) + ' u_' + paramName + arraySize + ';\n';
                    delete param.useInFragment;
                }
                else {
                    vertexShader += 'uniform ' + webGLConstantToGlslType(param.type) + ' u_' + paramName + arraySize + ';\n';
                }
            }
        }

        // Add attributes with semantics
        var vertexShaderMain = '';
        if (hasSkinning) {
            vertexShaderMain += '  mat4 skinMat = a_weight.x * u_jointMatrix[int(a_joint.x)];\n';
            vertexShaderMain += '  skinMat += a_weight.y * u_jointMatrix[int(a_joint.y)];\n';
            vertexShaderMain += '  skinMat += a_weight.z * u_jointMatrix[int(a_joint.z)];\n';
            vertexShaderMain += '  skinMat += a_weight.w * u_jointMatrix[int(a_joint.w)];\n';
        }

        // TODO: Handle multiple texture coordinates for now we just use 1
        var v_texcoord;
        for (i=0;i<attributesCount;++i) {
            var attribute = attributes[i];
            typeValue = -1;
            if (attribute === 'POSITION') {
                typeValue = WebGLConstants.FLOAT_VEC3;
                vertexShader += 'attribute vec3 a_position;\n';
                vertexShader += 'varying vec3 v_positionEC;\n';
                if (hasSkinning) {
                    vertexShaderMain += '  vec4 pos = u_modelViewMatrix * skinMat * vec4(a_position,1.0);\n';
                }
                else {
                    vertexShaderMain += '  vec4 pos = u_modelViewMatrix * vec4(a_position,1.0);\n';
                }
                vertexShaderMain += '  v_positionEC = pos.xyz;\n';
                vertexShaderMain += '  gl_Position = u_projectionMatrix * pos;\n';
                fragmentShader += 'varying vec3 v_positionEC;\n';
            }
            else if (attribute === 'NORMAL') {
                typeValue = WebGLConstants.FLOAT_VEC3;
                vertexShader += 'attribute vec3 a_normal;\n';
                vertexShader += 'varying vec3 v_normal;\n';
                if (hasSkinning) {
                    vertexShaderMain += '  v_normal = u_normalMatrix * mat3(skinMat) * a_normal;\n';
                }
                else {
                    vertexShaderMain += '  v_normal = u_normalMatrix * a_normal;\n';
                }

                fragmentShader += 'varying vec3 v_normal;\n';
            }
            else if (attribute.indexOf('TEXCOORD') === 0) {
                typeValue = WebGLConstants.FLOAT_VEC2;
                lowerCase = attribute.toLowerCase();
                var a_texcoord = 'a_' + lowerCase;
                v_texcoord = 'v_' + lowerCase;
                vertexShader += 'attribute vec2 ' + a_texcoord + ';\n';
                vertexShader += 'varying vec2 ' + v_texcoord + ';\n';
                vertexShaderMain += '  ' + v_texcoord + ' = ' + a_texcoord + ';\n';

                fragmentShader += 'varying vec2 ' + v_texcoord + ';\n';
            }
            else if (attribute === 'JOINT') {
                typeValue = WebGLConstants.FLOAT_VEC4;
                vertexShader += 'attribute vec4 a_joint;\n';
            }
            else if (attribute === 'WEIGHT') {
                typeValue = WebGLConstants.FLOAT_VEC4;
                vertexShader += 'attribute vec4 a_weight;\n';
            }

            if (typeValue > 0) {
                lowerCase = attribute.toLowerCase();
                techniqueParameters[lowerCase] = {
                    semantic: attribute,
                    type: typeValue
                };
            }
        }

        var hasNormals = defined(techniqueParameters.normal);
        var hasSpecular = hasNormals && ((lightingModel === 'BLINN') || (lightingModel === 'PHONG')) &&
                          defined(techniqueParameters.specular) && defined(techniqueParameters.shininess);

        // Generate lighting code blocks
        var hasNonAmbientLights = false;
        var hasAmbientLights = false;
        var fragmentLightingBlock = '';
        for (var lightName in lights) {
            if (lights.hasOwnProperty(lightName)) {
                var light = lights[lightName];
                var lightType = light.type.toLowerCase();
                var lightBaseName = light.baseName;
                fragmentLightingBlock += '  {\n';
                var lightColorName = 'u_' + lightBaseName + 'Color';
                var varyingName;
                if(lightType === 'ambient') {
                    hasAmbientLights = true;
                    fragmentLightingBlock += '    ambientLight += ' + lightColorName + ';\n';
                }
                else if (hasNormals && (lightingModel !== 'CONSTANT')) {
                    hasNonAmbientLights = true;
                    varyingName = 'v_' + lightBaseName + 'Direction';
                    vertexShader += 'varying vec3 ' + varyingName + ';\n';
                    fragmentShader += 'varying vec3 ' + varyingName + ';\n';

                    if (lightType === 'directional') {
                        vertexShaderMain += '  ' + varyingName + ' = mat3(u_' + lightBaseName + 'Transform) * vec3(0.,0.,1.);\n';
                        fragmentLightingBlock += '    float attenuation = 1.0;\n';
                    }
                    else {
                        vertexShaderMain += '  ' + varyingName + ' = u_' + lightBaseName + 'Transform[3].xyz - pos.xyz;\n';
                        fragmentLightingBlock += '    float range = length(' + varyingName + ');\n';
                        fragmentLightingBlock += '    float attenuation = 1.0 / (u_' + lightBaseName + 'Attenuation.x + ';
                        fragmentLightingBlock += '(u_' + lightBaseName + 'Attenuation.y * range) + ';
                        fragmentLightingBlock += '(u_' + lightBaseName + 'Attenuation.z * range * range));\n';
                    }

                    fragmentLightingBlock += '    vec3 l = normalize(' + varyingName + ');\n';

                    if (lightType === 'spot') {
                        fragmentLightingBlock += '    vec4 spotPosition = u_' + lightBaseName + 'InverseTransform * vec4(v_positionEC, 1.0);\n';
                        fragmentLightingBlock += '    float cosAngle = dot(vec3(0.0,0.0,-1.0), normalize(spotPosition.xyz));\n';
                        fragmentLightingBlock += '    if (cosAngle < cos(u_' + lightBaseName + 'FallOff.x * 0.5))\n';
                        fragmentLightingBlock += '    {\n';
                        fragmentLightingBlock += '        attenuation *= max(0.0, pow(cosAngle, u_' + lightBaseName + 'FallOff.y));\n';
                    }

                    fragmentLightingBlock += '    diffuseLight += ' + lightColorName + '* max(dot(normal,l), 0.) * attenuation;\n';

                    if (hasSpecular) {
                        if (lightingModel === 'BLINN') {
                            fragmentLightingBlock += '    vec3 h = normalize(l + viewDir);\n';
                            fragmentLightingBlock += '    float specularIntensity = max(0., pow(max(dot(normal, h), 0.), u_shininess)) * attenuation;\n';
                        }
                        else { // PHONG
                            fragmentLightingBlock += '    vec3 reflectDir = reflect(-l, normal);\n';
                            fragmentLightingBlock += '    float specularIntensity = max(0., pow(max(dot(reflectDir, viewDir), 0.), u_shininess)) * attenuation;\n';
                        }
                        fragmentLightingBlock += '    specularLight += ' + lightColorName + ' * specularIntensity;\n';
                    }

                    if (lightType === 'spot') {
                        fragmentLightingBlock += '    }\n';
                    }
                }
                fragmentLightingBlock += '  }\n';
            }
        }

        if (!hasAmbientLights) {
            // Add an ambient light if we don't have one
            fragmentLightingBlock += '  ambientLight += vec3(0.1, 0.1, 0.1);\n';
        }

        if (!hasNonAmbientLights) {
            fragmentLightingBlock += '  vec3 l = normalize(czm_sunDirectionEC);\n';
            fragmentLightingBlock += '  diffuseLight += vec3(1.0, 1.0, 1.0) * max(dot(normal,l), 0.);\n';

            if (hasSpecular) {
                if (lightingModel === 'BLINN') {
                    fragmentLightingBlock += '  vec3 h = normalize(l + viewDir);\n';
                    fragmentLightingBlock += '  float specularIntensity = max(0., pow(max(dot(normal, h), 0.), u_shininess));\n';
                }
                else { // PHONG
                    fragmentLightingBlock += '  vec3 reflectDir = reflect(-l, normal);\n';
                    fragmentLightingBlock += '  float specularIntensity = max(0., pow(max(dot(reflectDir, viewDir), 0.), u_shininess));\n';
                }

                fragmentLightingBlock += '  specularLight += vec3(1.0, 1.0, 1.0) * specularIntensity;\n';
            }
        }

        vertexShader += 'void main(void) {\n';
        vertexShader += vertexShaderMain;
        vertexShader += '}\n';

        fragmentShader += 'void main(void) {\n';
        var colorCreationBlock = '  vec3 color = vec3(0.0, 0.0, 0.0);\n';
        if (hasNormals) {
            fragmentShader += '  vec3 normal = normalize(v_normal);\n';
            if (isDoubleSided) {
                fragmentShader += '  if (gl_FrontFacing == false)\n';
                fragmentShader += '  {\n';
                fragmentShader += '    normal = -normal;\n';
                fragmentShader += '  }\n';
            }
        }

        var finalColorComputation;
        if (lightingModel !== 'CONSTANT') {
            if (defined(techniqueParameters.diffuse)) {
                if (techniqueParameters.diffuse.type === WebGLConstants.SAMPLER_2D) {
                    fragmentShader += '  vec4 diffuse = texture2D(u_diffuse, ' + v_texcoord + ');\n';
                }
                else {
                    fragmentShader += '  vec4 diffuse = u_diffuse;\n';
                }
                fragmentShader += '  vec3 diffuseLight = vec3(0.0, 0.0, 0.0);\n';
                colorCreationBlock += '  color += diffuse.rgb * diffuseLight;\n';
            }

            if (hasSpecular) {
                if (techniqueParameters.specular.type === WebGLConstants.SAMPLER_2D) {
                    fragmentShader += '  vec3 specular = texture2D(u_specular, ' + v_texcoord + ');\n';
                }
                else {
                    fragmentShader += '  vec3 specular = u_specular.rgb;\n';
                }
                fragmentShader += '  vec3 specularLight = vec3(0.0, 0.0, 0.0);\n';
                colorCreationBlock += '  color += specular * specularLight;\n';
            }

            if (defined(techniqueParameters.transparency)) {
                finalColorComputation = '  gl_FragColor = vec4(color * diffuse.a, diffuse.a * u_transparency);\n';
            }
            else {
                finalColorComputation = '  gl_FragColor = vec4(color * diffuse.a, diffuse.a);\n';
            }
        }
        else {
            if (defined(techniqueParameters.transparency)) {
                finalColorComputation = '  gl_FragColor = vec4(color, u_transparency);\n';
            }
            else {
                finalColorComputation = '  gl_FragColor = vec4(color, 1.0);\n';
            }
        }

        if (defined(techniqueParameters.emission)) {
            if (techniqueParameters.emission.type === WebGLConstants.SAMPLER_2D) {
                fragmentShader += '  vec3 emission = texture2D(u_emission, ' + v_texcoord + ');\n';
            }
            else {
                fragmentShader += '  vec3 emission = u_emission.rgb;\n';
            }
            colorCreationBlock += '  color += emission;\n';
        }

        if (defined(techniqueParameters.ambient)) {
            if (techniqueParameters.ambient.type === WebGLConstants.SAMPLER_2D) {
                fragmentShader += '  vec3 ambient = texture2D(u_ambient, ' + v_texcoord + ');\n';
            }
            else {
                fragmentShader += '  vec3 ambient = u_ambient.rgb;\n';
            }
        }
        else {
            fragmentShader += '  vec3 ambient = diffuse.rgb;\n';
        }
        fragmentShader += '  vec3 viewDir = -normalize(v_positionEC);\n';
        fragmentShader += '  vec3 ambientLight = vec3(0.0, 0.0, 0.0);\n';
        colorCreationBlock += '  color += ambient * ambientLight;\n';

        // Add in light computations
        fragmentShader += fragmentLightingBlock;

        fragmentShader += colorCreationBlock;
        fragmentShader += finalColorComputation;
        fragmentShader += '}\n';

        // TODO: Handle texture transparency
        var techniqueStates;
        if (hasAlpha) {
            techniqueStates = {
                enable: [
                    WebGLConstants.DEPTH_TEST,
                    WebGLConstants.BLEND
                ],
                depthMask: false,
                functions: {
                    "blendEquationSeparate": [
                        WebGLConstants.FUNC_ADD,
                        WebGLConstants.FUNC_ADD
                    ],
                    "blendFuncSeparate": [
                        WebGLConstants.ONE,
                        WebGLConstants.ONE_MINUS_SRC_ALPHA,
                        WebGLConstants.ONE,
                        WebGLConstants.ONE_MINUS_SRC_ALPHA
                    ]
                }
            };
        }
        else {
            techniqueStates = {
                enable: [
                    WebGLConstants.CULL_FACE,
                    WebGLConstants.DEPTH_TEST
                ]
            };
        }
        techniques[techniqueId] = {
            attributes: techniqueAttributes,
            parameters: techniqueParameters,
            program: programId,
            states: techniqueStates,
            uniforms: techniqueUniforms
        };

        // Add shaders
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

    function getTechniqueKey(khrMaterialsCommon) {
        var techniqueKey = '';
         techniqueKey += 'technique:' + khrMaterialsCommon.technique + ';';

        var values = khrMaterialsCommon.values;
        var keys = Object.keys(values).sort();
        var keysCount = keys.length;
        for (var i=0;i<keysCount;++i) {
            var name = keys[i];
            if (values.hasOwnProperty(name)) {
                var value = values[name];
                 techniqueKey += name + ':';
                var type = typeof value;
                switch (type) {
                    case 'string':
                         techniqueKey += 'texture';
                        break;
                    case 'number':
                         techniqueKey += 'float';
                        break;
                    default:
                        if (Array.isArray(value)) {
                             techniqueKey += 'vec' + value.length.toString();
                        }
                        break;
                }
                 techniqueKey += ';';
            }
        }
    }

    function getPrimitiveInfo(materialId, gltf) {
        var meshes = gltf.meshes;
        for (var name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var mesh = meshes[name];
                var primitives = mesh.primitives;
                var primitivesCount = primitives.length;
                for (var i=0;i<primitivesCount;++i) {
                    var primitive = primitives[i];
                    if (primitive.material === materialId) {
                        var jointCount = 0;
                        if (defined(primitive.attributes.JOINT)) {
                            var nodes = gltf.nodes;
                            for (var nodeName in nodes) {
                                if (nodes.hasOwnProperty(nodeName)) {
                                    var node = nodes[nodeName];
                                    // We have skinning for this node and it contains this mesh
                                    if (defined(node.skeletons) && defined(node.meshes) &&
                                        (node.meshes.indexOf(name) !== -1)) {
                                        jointCount = node.skeletons.length;
                                    }
                                }
                            }
                        }

                        return {
                            attributes : Object.keys(primitive.attributes),
                            jointCount : jointCount
                        };
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
                    if (defined(material.extensions) && defined(material.extensions.KHR_materials_common)) {
                        var khrMaterialsCommon = material.extensions.KHR_materials_common;
                        var techniqueKey = getTechniqueKey(khrMaterialsCommon);
                        var technique = techniques[techniqueKey];
                        if (!defined(technique)) {
                            var primitiveInfo = getPrimitiveInfo(name, gltf);
                            technique = generateTechnique(gltf, khrMaterialsCommon, primitiveInfo.attributes,
                                                          lightParameters, primitiveInfo.jointCount);
                        }

                        // Take advantage of the fact that we generate techniques that use the
                        // same names as the extension values.
                        material.values = khrMaterialsCommon.values;
                        material.technique = technique;

                        delete material.extensions.KHR_materials_common;
                    }
                }
            }

            if (defined(gltf.extensions)) {
                delete gltf.extensions.KHR_materials_common;
            }

            //var json = JSON.stringify(gltf, null, 4);
            //var a = document.createElement('a');
            //a.setAttribute('href', 'data:text;base64,' + btoa(json));
            //a.setAttribute('target', '_blank');
            //a.setAttribute('download', 'model.json');
            //a.click();
        }

        return gltf;
    };

    return modelMaterialsCommon;
});