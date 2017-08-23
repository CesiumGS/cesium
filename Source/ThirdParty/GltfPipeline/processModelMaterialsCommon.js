define([
        './addToArray',
        './ForEach',
        './numberOfComponentsForType',
        './techniqueParameterForSemantic',
        './webGLConstantToGlslType',
        './glslTypeToWebGLConstant',
        '../../Core/clone',
        '../../Core/defined',
        '../../Core/defaultValue',
        '../../Core/WebGLConstants'
    ], function(
        addToArray,
        ForEach,
        numberOfComponentsForType,
        techniqueParameterForSemantic,
        webGLConstantToGlslType,
        glslTypeToWebGLConstant,
        clone,
        defined,
        defaultValue,
        WebGLConstants) {
    'use strict';

    /**
     * @private
     */
    function processModelMaterialsCommon(gltf, options) {
        options = defaultValue(options, {});

        if (!defined(gltf)) {
            return undefined;
        }

        var hasExtension = false;
        var extensionsRequired = gltf.extensionsRequired;
        var extensionsUsed = gltf.extensionsUsed;
        if (defined(extensionsUsed)) {
            var index = extensionsUsed.indexOf('KHR_materials_common');
            if (index >= 0) {
                extensionsUsed.splice(index, 1);
                hasExtension = true;
            }
            if (defined(extensionsRequired)) {
                index = extensionsRequired.indexOf('KHR_materials_common');
                if (index >= 0) {
                    extensionsRequired.splice(index, 1);
                }
            }
        }

        if (hasExtension) {
            if (!defined(gltf.programs)) {
                gltf.programs = [];
            }
            if (!defined(gltf.shaders)) {
                gltf.shaders = [];
            }
            if (!defined(gltf.techniques)) {
                gltf.techniques = [];
            }
            lightDefaults(gltf);

            var lightParameters = generateLightParameters(gltf);

            // Pre-processing to assign skinning info and address incompatibilities
            splitIncompatibleSkins(gltf);

            var techniques = {};
            ForEach.material(gltf, function(material) {
                if (defined(material.extensions) && defined(material.extensions.KHR_materials_common)) {
                    var khrMaterialsCommon = material.extensions.KHR_materials_common;
                    var techniqueKey = getTechniqueKey(khrMaterialsCommon);
                    var technique = techniques[techniqueKey];
                    if (!defined(technique)) {
                        technique = generateTechnique(gltf, khrMaterialsCommon, lightParameters, options);
                        techniques[techniqueKey] = technique;
                    }

                    // Take advantage of the fact that we generate techniques that use the
                    // same parameter names as the extension values.
                    material.values = {};
                    var values = khrMaterialsCommon.values;
                    for (var valueName in values) {
                        if (values.hasOwnProperty(valueName)) {
                            var value = values[valueName];
                            material.values[valueName] = value;
                        }
                    }

                    material.technique = technique;

                    delete material.extensions.KHR_materials_common;
                    if (Object.keys(material.extensions).length === 0) {
                        delete material.extensions;
                    }
                }
            });

            if (defined(gltf.extensions)) {
                delete gltf.extensions.KHR_materials_common;
                if (Object.keys(gltf.extensions).length === 0) {
                    delete gltf.extensions;
                }
            }

            // If any primitives have semantics that aren't declared in the generated
            // shaders, we want to preserve them.
            ensureSemanticExistence(gltf);
        }

        return gltf;
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
            for (var lightName in lights) {
                if (lights.hasOwnProperty(lightName)) {
                    var light = lights[lightName];
                    var lightType = light.type;
                    if ((lightType !== 'ambient') && !defined(light.node)) {
                        delete lights[lightName];
                        continue;
                    }
                    var lightBaseName = 'light' + lightCount.toString();
                    light.baseName = lightBaseName;
                    switch (lightType) {
                        case 'ambient':
                            var ambient = light.ambient;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: ambient.color
                            };
                            break;
                        case 'directional':
                            var directional = light.directional;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: directional.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] = {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                            }
                            break;
                        case 'point':
                            var point = light.point;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: point.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] = {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                            }
                            result[lightBaseName + 'Attenuation'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: [point.constantAttenuation, point.linearAttenuation, point.quadraticAttenuation]
                            };
                            break;
                        case 'spot':
                            var spot = light.spot;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: spot.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] = {
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
                            result[lightBaseName + 'Attenuation'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: [spot.constantAttenuation, spot.linearAttenuation, spot.quadraticAttenuation]
                            };

                            result[lightBaseName + 'FallOff'] = {
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

    function generateTechnique(gltf, khrMaterialsCommon, lightParameters, options) {
        var optimizeForCesium = defaultValue(options.optimizeForCesium, false);
        var hasCesiumRTCExtension = defined(gltf.extensions) && defined(gltf.extensions.CESIUM_RTC);
        var addBatchIdToGeneratedShaders = defaultValue(options.addBatchIdToGeneratedShaders, false);

        var techniques = gltf.techniques;
        var shaders = gltf.shaders;
        var programs = gltf.programs;
        var lightingModel = khrMaterialsCommon.technique.toUpperCase();
        var lights;
        if (defined(gltf.extensions) && defined(gltf.extensions.KHR_materials_common)) {
            lights = gltf.extensions.KHR_materials_common.lights;
        }
        var parameterValues = khrMaterialsCommon.values;
        if (defined(khrMaterialsCommon.transparent)) {
            parameterValues.transparent = khrMaterialsCommon.transparent;
        }
        if (defined(khrMaterialsCommon.doubleSided)) {
            parameterValues.doubleSided = khrMaterialsCommon.doubleSided;
        }
        var jointCount = defaultValue(khrMaterialsCommon.jointCount, 0);

        var hasSkinning = jointCount > 0;
        var skinningInfo = {};
        if (hasSkinning) {
            skinningInfo = khrMaterialsCommon.extras._pipeline.skinning;
        }

        var vertexShader = 'precision highp float;\n';
        var fragmentShader = 'precision highp float;\n';

        var hasNormals = (lightingModel !== 'CONSTANT');

        // Add techniques
        var techniqueParameters = {
            // Add matrices
            modelViewMatrix: {
                semantic: hasCesiumRTCExtension ? 'CESIUM_RTC_MODELVIEW' : 'MODELVIEW',
                type: WebGLConstants.FLOAT_MAT4
            },
            projectionMatrix: {
                semantic: 'PROJECTION',
                type: WebGLConstants.FLOAT_MAT4
            }
        };

        if (hasNormals) {
            techniqueParameters.normalMatrix = {
                semantic: 'MODELVIEWINVERSETRANSPOSE',
                type: WebGLConstants.FLOAT_MAT3
            };
        }

        if (hasSkinning) {
            techniqueParameters.jointMatrix = {
                count: jointCount,
                semantic: 'JOINTMATRIX',
                type: WebGLConstants.FLOAT_MAT4
            };
        }

        // Add material parameters
        var lowerCase;
        var hasTexCoords = false;
        for (var name in parameterValues) {
            //generate shader parameters for KHR_materials_common attributes
            //(including a check, because some boolean flags should not be used as shader parameters)
            if (parameterValues.hasOwnProperty(name) && (name !== 'transparent') && (name !== 'doubleSided')) {
                var valType = getKHRMaterialsCommonValueType(name, parameterValues[name]);
                lowerCase = name.toLowerCase();
                if (!hasTexCoords && (valType === WebGLConstants.SAMPLER_2D)) {
                    hasTexCoords = true;
                }
                techniqueParameters[lowerCase] = {
                    type: valType
                };
            }
        }

        // Give the diffuse uniform a semantic to support color replacement in 3D Tiles
        if (defined(techniqueParameters.diffuse) && optimizeForCesium) {
            techniqueParameters.diffuse.semantic = '_3DTILESDIFFUSE';
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
            if (techniqueParameters.hasOwnProperty(paramName) && paramName !== 'extras') {
                var param = techniqueParameters[paramName];
                techniqueUniforms['u_' + paramName] = paramName;
                var arraySize = defined(param.count) ? '[' + param.count + ']' : '';
                if (((param.type !== WebGLConstants.FLOAT_MAT3) && (param.type !== WebGLConstants.FLOAT_MAT4)) ||
                    param.useInFragment) {
                    fragmentShader += 'uniform ' + webGLConstantToGlslType(param.type) + ' u_' + paramName + arraySize + ';\n';
                    delete param.useInFragment;
                } else {
                    vertexShader += 'uniform ' + webGLConstantToGlslType(param.type) + ' u_' + paramName + arraySize + ';\n';
                }
            }
        }

        // Add attributes with semantics
        var vertexShaderMain = '';
        if (hasSkinning) {
            var i, j;
            var numberOfComponents = numberOfComponentsForType(skinningInfo.type);
            var matrix = false;
            if (skinningInfo.type.indexOf('MAT') === 0) {
                matrix = true;
                numberOfComponents = Math.sqrt(numberOfComponents);
            }
            if (!matrix) {
                for (i = 0; i < numberOfComponents; i++) {
                    if (i === 0) {
                        vertexShaderMain += '  mat4 skinMat = ';
                    } else {
                        vertexShaderMain += '  skinMat += ';
                    }
                    vertexShaderMain += 'a_weight[' + i + '] * u_jointMatrix[int(a_joint[' + i + '])];\n';
                }
            } else {
                for (i = 0; i < numberOfComponents; i++) {
                    for (j = 0; j < numberOfComponents; j++) {
                        if (i === 0 && j === 0) {
                            vertexShaderMain += '  mat4 skinMat = ';
                        } else {
                            vertexShaderMain += '  skinMat += ';
                        }
                        vertexShaderMain += 'a_weight[' + i + '][' + j + '] * u_jointMatrix[int(a_joint[' + i + '][' + j + '])];\n';
                    }
                }
            }
        }

        // Add position always
        var techniqueAttributes = {
            a_position: 'position'
        };
        techniqueParameters.position = {
            semantic: 'POSITION',
            type: WebGLConstants.FLOAT_VEC3
        };
        vertexShader += 'attribute vec3 a_position;\n';
        vertexShader += 'varying vec3 v_positionEC;\n';
        if (hasSkinning) {
            vertexShaderMain += '  vec4 pos = u_modelViewMatrix * skinMat * vec4(a_position,1.0);\n';
        } else {
            vertexShaderMain += '  vec4 pos = u_modelViewMatrix * vec4(a_position,1.0);\n';
        }
        vertexShaderMain += '  v_positionEC = pos.xyz;\n';
        vertexShaderMain += '  gl_Position = u_projectionMatrix * pos;\n';
        fragmentShader += 'varying vec3 v_positionEC;\n';

        // Add normal if we don't have constant lighting
        if (hasNormals) {
            techniqueAttributes.a_normal = 'normal';
            techniqueParameters.normal = {
                semantic: 'NORMAL',
                type: WebGLConstants.FLOAT_VEC3
            };
            vertexShader += 'attribute vec3 a_normal;\n';
            vertexShader += 'varying vec3 v_normal;\n';
            if (hasSkinning) {
                vertexShaderMain += '  v_normal = u_normalMatrix * mat3(skinMat) * a_normal;\n';
            } else {
                vertexShaderMain += '  v_normal = u_normalMatrix * a_normal;\n';
            }

            fragmentShader += 'varying vec3 v_normal;\n';
        }

        // Add texture coordinates if the material uses them
        var v_texcoord;
        if (hasTexCoords) {
            techniqueAttributes.a_texcoord_0 = 'texcoord_0';
            techniqueParameters.texcoord_0 = {
                semantic: 'TEXCOORD_0',
                type: WebGLConstants.FLOAT_VEC2
            };

            v_texcoord = 'v_texcoord_0';
            vertexShader += 'attribute vec2 a_texcoord_0;\n';
            vertexShader += 'varying vec2 ' + v_texcoord + ';\n';
            vertexShaderMain += '  ' + v_texcoord + ' = a_texcoord_0;\n';

            fragmentShader += 'varying vec2 ' + v_texcoord + ';\n';
        }

        if (hasSkinning) {
            techniqueAttributes.a_joint = 'joint';
            var attributeType = getShaderVariable(skinningInfo.type);
            var webGLConstant = glslTypeToWebGLConstant(attributeType);

            techniqueParameters.joint = {
                semantic: 'JOINT',
                type: webGLConstant
            };
            techniqueAttributes.a_weight = 'weight';
            techniqueParameters.weight = {
                semantic: 'WEIGHT',
                type: webGLConstant
            };

            vertexShader += 'attribute ' + attributeType + ' a_joint;\n';
            vertexShader += 'attribute ' + attributeType + ' a_weight;\n';
        }

        if (addBatchIdToGeneratedShaders) {
            techniqueAttributes.a_batchId = 'batchId';
            techniqueParameters.batchId = {
                semantic: '_BATCHID',
                type: WebGLConstants.FLOAT
            };
            vertexShader += 'attribute float a_batchId;\n';
        }

        var hasSpecular = hasNormals && ((lightingModel === 'BLINN') || (lightingModel === 'PHONG')) &&
            defined(techniqueParameters.specular) && defined(techniqueParameters.shininess) &&
            (techniqueParameters.shininess > 0.0);

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
                var varyingDirectionName;
                var varyingPositionName;
                if (lightType === 'ambient') {
                    hasAmbientLights = true;
                    fragmentLightingBlock += '    ambientLight += ' + lightColorName + ';\n';
                } else if (hasNormals) {
                    hasNonAmbientLights = true;
                    varyingDirectionName = 'v_' + lightBaseName + 'Direction';
                    varyingPositionName = 'v_' + lightBaseName + 'Position';

                    if (lightType !== 'point') {
                        vertexShader += 'varying vec3 ' + varyingDirectionName + ';\n';
                        fragmentShader += 'varying vec3 ' + varyingDirectionName + ';\n';

                        vertexShaderMain += '  ' + varyingDirectionName + ' = mat3(u_' + lightBaseName + 'Transform) * vec3(0.,0.,1.);\n';
                        if (lightType === 'directional') {
                            fragmentLightingBlock += '    vec3 l = normalize(' + varyingDirectionName + ');\n';
                        }
                    }

                    if (lightType !== 'directional') {
                        vertexShader += 'varying vec3 ' + varyingPositionName + ';\n';
                        fragmentShader += 'varying vec3 ' + varyingPositionName + ';\n';

                        vertexShaderMain += '  ' + varyingPositionName + ' = u_' + lightBaseName + 'Transform[3].xyz;\n';
                        fragmentLightingBlock += '    vec3 VP = ' + varyingPositionName + ' - v_positionEC;\n';
                        fragmentLightingBlock += '    vec3 l = normalize(VP);\n';
                        fragmentLightingBlock += '    float range = length(VP);\n';
                        fragmentLightingBlock += '    float attenuation = 1.0 / (u_' + lightBaseName + 'Attenuation.x + ';
                        fragmentLightingBlock += '(u_' + lightBaseName + 'Attenuation.y * range) + ';
                        fragmentLightingBlock += '(u_' + lightBaseName + 'Attenuation.z * range * range));\n';
                    } else {
                        fragmentLightingBlock += '    float attenuation = 1.0;\n';
                    }

                    if (lightType === 'spot') {
                        fragmentLightingBlock += '    float spotDot = dot(l, normalize(' + varyingDirectionName + '));\n';
                        fragmentLightingBlock += '    if (spotDot < cos(u_' + lightBaseName + 'FallOff.x * 0.5))\n';
                        fragmentLightingBlock += '    {\n';
                        fragmentLightingBlock += '      attenuation = 0.0;\n';
                        fragmentLightingBlock += '    }\n';
                        fragmentLightingBlock += '    else\n';
                        fragmentLightingBlock += '    {\n';
                        fragmentLightingBlock += '        attenuation *= max(0.0, pow(spotDot, u_' + lightBaseName + 'FallOff.y));\n';
                        fragmentLightingBlock += '    }\n';
                    }

                    fragmentLightingBlock += '    diffuseLight += ' + lightColorName + '* max(dot(normal,l), 0.) * attenuation;\n';

                    if (hasSpecular) {
                        if (lightingModel === 'BLINN') {
                            fragmentLightingBlock += '    vec3 h = normalize(l + viewDir);\n';
                            fragmentLightingBlock += '    float specularIntensity = max(0., pow(max(dot(normal, h), 0.), u_shininess)) * attenuation;\n';
                        } else { // PHONG
                            fragmentLightingBlock += '    vec3 reflectDir = reflect(-l, normal);\n';
                            fragmentLightingBlock += '    float specularIntensity = max(0., pow(max(dot(reflectDir, viewDir), 0.), u_shininess)) * attenuation;\n';
                        }
                        fragmentLightingBlock += '    specularLight += ' + lightColorName + ' * specularIntensity;\n';
                    }
                }
                fragmentLightingBlock += '  }\n';
            }
        }

        if (!hasAmbientLights) {
            // Add an ambient light if we don't have one
            fragmentLightingBlock += '  ambientLight += vec3(0.2, 0.2, 0.2);\n';
        }

        if (!hasNonAmbientLights && (lightingModel !== 'CONSTANT')) {
            if (optimizeForCesium) {
                fragmentLightingBlock += '  vec3 l = normalize(czm_sunDirectionEC);\n';
            } else {
                fragmentLightingBlock += '  vec3 l = vec3(0.0, 0.0, 1.0);\n';
            }
            fragmentLightingBlock += '  diffuseLight += vec3(1.0, 1.0, 1.0) * max(dot(normal,l), 0.);\n';

            if (hasSpecular) {
                if (lightingModel === 'BLINN') {
                    fragmentLightingBlock += '  vec3 h = normalize(l + viewDir);\n';
                    fragmentLightingBlock += '  float specularIntensity = max(0., pow(max(dot(normal, h), 0.), u_shininess));\n';
                } else { // PHONG
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
            if (khrMaterialsCommon.doubleSided) {
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
                } else {
                    fragmentShader += '  vec4 diffuse = u_diffuse;\n';
                }
                fragmentShader += '  vec3 diffuseLight = vec3(0.0, 0.0, 0.0);\n';
                colorCreationBlock += '  color += diffuse.rgb * diffuseLight;\n';
            }

            if (hasSpecular) {
                if (techniqueParameters.specular.type === WebGLConstants.SAMPLER_2D) {
                    fragmentShader += '  vec3 specular = texture2D(u_specular, ' + v_texcoord + ').rgb;\n';
                } else {
                    fragmentShader += '  vec3 specular = u_specular.rgb;\n';
                }
                fragmentShader += '  vec3 specularLight = vec3(0.0, 0.0, 0.0);\n';
                colorCreationBlock += '  color += specular * specularLight;\n';
            }

            if (defined(techniqueParameters.transparency)) {
                finalColorComputation = '  gl_FragColor = vec4(color * diffuse.a * u_transparency, diffuse.a * u_transparency);\n';
            } else {
                finalColorComputation = '  gl_FragColor = vec4(color * diffuse.a, diffuse.a);\n';
            }
        } else {
            if (defined(techniqueParameters.transparency)) {
                finalColorComputation = '  gl_FragColor = vec4(color * u_transparency, u_transparency);\n';
            } else {
                finalColorComputation = '  gl_FragColor = vec4(color, 1.0);\n';
            }
        }

        if (defined(techniqueParameters.emission)) {
            if (techniqueParameters.emission.type === WebGLConstants.SAMPLER_2D) {
                fragmentShader += '  vec3 emission = texture2D(u_emission, ' + v_texcoord + ').rgb;\n';
            } else {
                fragmentShader += '  vec3 emission = u_emission.rgb;\n';
            }
            colorCreationBlock += '  color += emission;\n';
        }

        if (defined(techniqueParameters.ambient) || (lightingModel !== 'CONSTANT')) {
            if (defined(techniqueParameters.ambient)) {
                if (techniqueParameters.ambient.type === WebGLConstants.SAMPLER_2D) {
                    fragmentShader += '  vec3 ambient = texture2D(u_ambient, ' + v_texcoord + ').rgb;\n';
                } else {
                    fragmentShader += '  vec3 ambient = u_ambient.rgb;\n';
                }
            } else {
                fragmentShader += '  vec3 ambient = diffuse.rgb;\n';
            }
            colorCreationBlock += '  color += ambient * ambientLight;\n';
        }
        fragmentShader += '  vec3 viewDir = -normalize(v_positionEC);\n';
        fragmentShader += '  vec3 ambientLight = vec3(0.0, 0.0, 0.0);\n';

        // Add in light computations
        fragmentShader += fragmentLightingBlock;

        fragmentShader += colorCreationBlock;
        fragmentShader += finalColorComputation;
        fragmentShader += '}\n';

        var techniqueStates;
        if (parameterValues.transparent) {
            techniqueStates = {
                enable: [
                    WebGLConstants.DEPTH_TEST,
                    WebGLConstants.BLEND
                ],
                functions: {
                    depthMask : [false],
                    blendEquationSeparate: [
                        WebGLConstants.FUNC_ADD,
                        WebGLConstants.FUNC_ADD
                    ],
                    blendFuncSeparate: [
                        WebGLConstants.ONE,
                        WebGLConstants.ONE_MINUS_SRC_ALPHA,
                        WebGLConstants.ONE,
                        WebGLConstants.ONE_MINUS_SRC_ALPHA
                    ]
                }
            };
        } else if (khrMaterialsCommon.doubleSided) {
            techniqueStates = {
                enable: [
                    WebGLConstants.DEPTH_TEST
                ]
            };
        } else { // Not transparent or double sided
            techniqueStates = {
                enable: [
                    WebGLConstants.CULL_FACE,
                    WebGLConstants.DEPTH_TEST
                ]
            };
        }

        // Add shaders
        var vertexShaderId = addToArray(shaders, {
            type: WebGLConstants.VERTEX_SHADER,
                extras: {
                    _pipeline: {
                        source: vertexShader,
                        extension: '.glsl'
                }
            }
        });

        var fragmentShaderId = addToArray(shaders, {
            type: WebGLConstants.FRAGMENT_SHADER,
            extras: {
                _pipeline: {
                    source: fragmentShader,
                    extension: '.glsl'
                }
            }
        });

        // Add program
        var programAttributes = Object.keys(techniqueAttributes);
        var programId = addToArray(programs, {
            attributes: programAttributes,
            fragmentShader: fragmentShaderId,
            vertexShader: vertexShaderId
        });

        var techniqueId = addToArray(techniques, {
            attributes: techniqueAttributes,
            parameters: techniqueParameters,
            program: programId,
            states: techniqueStates,
            uniforms: techniqueUniforms
        });

        return techniqueId;
    }

    function getKHRMaterialsCommonValueType(paramName, paramValue) {
        var value;

        // Backwards compatibility for COLLADA2GLTF v1.0-draft when it encoding
        // materials using KHR_materials_common with explicit type/value members
        if (defined(paramValue.value)) {
            value = paramValue.value;
        } else if (defined(paramValue.index)) {
            value = [paramValue.index];
        } else {
            value = paramValue;
        }

        switch (paramName) {
            case 'ambient':
                return value.length === 1 ? WebGLConstants.SAMPLER_2D : WebGLConstants.FLOAT_VEC4;
            case 'diffuse':
                return value.length === 1 ? WebGLConstants.SAMPLER_2D : WebGLConstants.FLOAT_VEC4;
            case 'emission':
                return value.length === 1 ? WebGLConstants.SAMPLER_2D : WebGLConstants.FLOAT_VEC4;
            case 'specular':
                return value.length === 1 ? WebGLConstants.SAMPLER_2D : WebGLConstants.FLOAT_VEC4;
            case 'shininess':
                return WebGLConstants.FLOAT;
            case 'transparency':
                return WebGLConstants.FLOAT;

            // these two are usually not used directly within shaders,
            // they are just added here for completeness
            case 'transparent':
                return WebGLConstants.BOOL;
            case 'doubleSided':
                return WebGLConstants.BOOL;
        }
    }

    function getTechniqueKey(khrMaterialsCommon) {
        var techniqueKey = '';
        techniqueKey += 'technique:' + khrMaterialsCommon.technique + ';';

        var values = khrMaterialsCommon.values;
        var keys = Object.keys(values).sort();
        var keysCount = keys.length;
        for (var i = 0; i < keysCount; ++i) {
            var name = keys[i];
            if (values.hasOwnProperty(name)) {
                techniqueKey += name + ':' + getKHRMaterialsCommonValueType(name, values[name]);
                techniqueKey += ';';
            }
        }

        var doubleSided = defaultValue(khrMaterialsCommon.doubleSided, defaultValue(khrMaterialsCommon.values.doubleSided, false));
        techniqueKey += doubleSided.toString() + ';';
        var transparent = defaultValue(khrMaterialsCommon.transparent, defaultValue(khrMaterialsCommon.values.transparent, false));
        techniqueKey += transparent.toString() + ';';
        var jointCount = defaultValue(khrMaterialsCommon.jointCount, 0);
        techniqueKey += jointCount.toString() + ';';
        if (jointCount > 0) {
            var skinningInfo = khrMaterialsCommon.extras._pipeline.skinning;
            techniqueKey += skinningInfo.type + ';';
        }

        return techniqueKey;
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

        if (!defined(khrMaterialsCommon.lights)) {
            khrMaterialsCommon.lights = {};
        }
        var lights = khrMaterialsCommon.lights;

        var lightsLength = lights.length;
        for (var lightId = 0; lightId < lightsLength; lightId++) {
            var light = lights[lightId];
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

    function getShaderVariable(type) {
        if (type === 'SCALAR') {
            return 'float';
        }
        return type.toLowerCase();
    }

    function ensureSemanticExistenceForPrimitive(gltf, primitive) {
        var accessors = gltf.accessors;
        var materials = gltf.materials;
        var techniques = gltf.techniques;
        var programs = gltf.programs;
        var shaders = gltf.shaders;

        var attributes = primitive.attributes;
        var material = materials[primitive.material];
        var technique = techniques[material.technique];
        var program = programs[technique.program];
        var vertexShader = shaders[program.vertexShader];

        for (var semantic in attributes) {
            if (attributes.hasOwnProperty(semantic)) {
                if (!defined(techniqueParameterForSemantic(technique, semantic))) {
                    var accessorId = attributes[semantic];
                    var accessor = accessors[accessorId];
                    var lowerCase = semantic.toLowerCase();
                    if (lowerCase.charAt(0) === '_') {
                        lowerCase = lowerCase.slice(1);
                    }
                    var attributeName = 'a_' + lowerCase;
                    technique.parameters[lowerCase] = {
                        semantic: semantic,
                        type: accessor.componentType
                    };
                    technique.attributes[attributeName] = lowerCase;
                    program.attributes.push(attributeName);
                    var pipelineExtras = vertexShader.extras._pipeline;
                    var shaderText = pipelineExtras.source;
                    shaderText = 'attribute ' + getShaderVariable(accessor.type) + ' ' + attributeName + ';\n' + shaderText;
                    pipelineExtras.source = shaderText;
                }
            }
        }
    }

    function ensureSemanticExistence(gltf) {
        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                ensureSemanticExistenceForPrimitive(gltf, primitive);
            });
        });
    }

    function splitIncompatibleSkins(gltf) {
        var accessors = gltf.accessors;
        var materials = gltf.materials;
        ForEach.mesh(gltf, function(mesh) {
           ForEach.meshPrimitive(mesh, function(primitive) {
               var materialId = primitive.material;
               var material = materials[materialId];

               if (defined(material.extensions) && defined(material.extensions.KHR_materials_common)) {
                   var khrMaterialsCommon = material.extensions.KHR_materials_common;
                   var jointAccessorId = primitive.attributes.JOINT;
                   var componentType;
                   var type;
                   if (defined(jointAccessorId)) {
                       var jointAccessor = accessors[jointAccessorId];
                       componentType = jointAccessor.componentType;
                       type = jointAccessor.type;
                   }
                   var isSkinned = defined(jointAccessorId);

                   var skinningInfo = khrMaterialsCommon.extras._pipeline.skinning;
                   if (!defined(skinningInfo)) {
                       khrMaterialsCommon.extras._pipeline.skinning = {
                           skinned: isSkinned,
                           componentType: componentType,
                           type: type
                       };
                   } else if ((skinningInfo.skinned !== isSkinned) || (skinningInfo.type !== type)) {
                       // This primitive uses the same material as another one that either isn't skinned or uses a different type to store joints and weights
                       var clonedMaterial = clone(material, true);
                       clonedMaterial.extensions.KHR_materials_common.extras._pipeline.skinning = {
                           skinned: isSkinned,
                           componentType: componentType,
                           type: type
                       };
                       // Split this off as a separate material
                       materialId = addToArray(materials, clonedMaterial);
                       primitive.material = materialId;
                   }
               }
           });
        });
    }

    return processModelMaterialsCommon;
});
