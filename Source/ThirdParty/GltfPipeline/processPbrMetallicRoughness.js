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
    function processPbrMetallicRoughness(gltf, options) {
        options = defaultValue(options, {});

        var hasPbrMetallicRoughness = false;
        ForEach.material(gltf, function(material) {
            if (isPbrMaterial(material)) {
                hasPbrMetallicRoughness = true;
            }
        });

        if (hasPbrMetallicRoughness) {
            if (!defined(gltf.programs)) {
                gltf.programs = [];
            }
            if (!defined(gltf.shaders)) {
                gltf.shaders = [];
            }
            if (!defined(gltf.techniques)) {
                gltf.techniques = [];
            }

            // Pre-processing to address incompatibilities between primitives using the same materials.
            splitIncompatibleMaterials(gltf);

            ForEach.material(gltf, function(material, materialIndex) {
                if (isPbrMaterial(material)) {
                    var values = {};
                    var technique = generateTechnique(gltf, material, materialIndex, values, options);
                    gltf.materials[materialIndex] = {
                        values : values,
                        technique : technique
                    };
                }
            });

            // If any primitives have semantics that aren't declared in the generated
            // shaders, we want to preserve them.
            ensureSemanticExistence(gltf);
        }

        return gltf;
    }

    function isPbrMaterial(material) {
        return defined(material.pbrMetallicRoughness) ||
               defined(material.normalTexture) ||
               defined(material.occlusionTexture) ||
               defined(material.emissiveTexture) ||
               defined(material.emissiveFactor) ||
               defined(material.alphaMode) ||
               defined(material.alphaCutoff) ||
               defined(material.doubleSided);
    }

    function generateTechnique(gltf, material, materialIndex, values, options) {
        var optimizeForCesium = defaultValue(options.optimizeForCesium, false);
        var hasCesiumRTCExtension = defined(gltf.extensions) && defined(gltf.extensions.CESIUM_RTC);
        var addBatchIdToGeneratedShaders = defaultValue(options.addBatchIdToGeneratedShaders, false);

        var techniques = gltf.techniques;
        var shaders = gltf.shaders;
        var programs = gltf.programs;

        var parameterValues = values;
        var pbrMetallicRoughness = material.pbrMetallicRoughness;
        if (defined(pbrMetallicRoughness)) {
            for (var parameterName in pbrMetallicRoughness) {
                if (pbrMetallicRoughness.hasOwnProperty(parameterName)) {
                    parameterValues[parameterName] = pbrMetallicRoughness[parameterName];
                }
            }
        }
        for (var additional in material) {
            if (material.hasOwnProperty(additional) && ((additional.indexOf('Texture') >= 0) || additional.indexOf('Factor') >= 0) || additional === 'doubleSided') {
                parameterValues[additional] = material[additional];
            }
        }

        var vertexShader = 'precision highp float;\n';
        var fragmentShader = 'precision highp float;\n';

        var skin;
        if (defined(gltf.skins)) {
            skin = gltf.skins[0];
        }
        var joints = (defined(skin)) ? skin.joints : [];
        var jointCount = joints.length;
        var primitiveInfo = material.extras._pipeline.primitive;

        var skinningInfo;
        var hasSkinning = false;
        var hasVertexColors = false;
        var hasMorphTargets = false;
        var hasNormals = false;
        var hasTangents = false;
        var hasTexCoords = false;

        if (defined(primitiveInfo)) {
            skinningInfo = primitiveInfo.skinning;
            hasSkinning = skinningInfo.skinned && (joints.length > 0);
            hasVertexColors = primitiveInfo.hasVertexColors;
            hasMorphTargets = primitiveInfo.hasMorphTargets;
            hasNormals = primitiveInfo.hasNormals;
            hasTangents = primitiveInfo.hasTangents;
            hasTexCoords = primitiveInfo.hasTexCoords;
        }

        var morphTargets;
        if (hasMorphTargets) {
            ForEach.mesh(gltf, function(mesh) {
                ForEach.meshPrimitive(mesh, function(primitive) {
                    if (primitive.material === materialIndex) {
                        var targets = primitive.targets;
                        if (defined(targets)) {
                            morphTargets = targets;
                        }
                    }
                });
            });
        }

        // Add techniques
        var techniqueParameters = {
            // Add matrices
            modelViewMatrix : {
                semantic : hasCesiumRTCExtension ? 'CESIUM_RTC_MODELVIEW' : 'MODELVIEW',
                type : WebGLConstants.FLOAT_MAT4
            },
            projectionMatrix : {
                semantic : 'PROJECTION',
                type : WebGLConstants.FLOAT_MAT4
            }
        };

        if (hasNormals) {
            techniqueParameters.normalMatrix = {
                semantic : 'MODELVIEWINVERSETRANSPOSE',
                type : WebGLConstants.FLOAT_MAT3
            };
        }

        if (hasSkinning) {
            techniqueParameters.jointMatrix = {
                count : jointCount,
                semantic : 'JOINTMATRIX',
                type : WebGLConstants.FLOAT_MAT4
            };
        }

        if (hasMorphTargets) {
            techniqueParameters.morphWeights = {
                count : morphTargets.length,
                semantic : 'MORPHWEIGHTS',
                type : WebGLConstants.FLOAT
            };
        }

        // Add material parameters
        for (var name in parameterValues) {
            if (parameterValues.hasOwnProperty(name)) {
                techniqueParameters[name] = {
                    type : getPBRValueType(name)
                };
            }
        }

        if (optimizeForCesium) {
            var baseColorParameter = defaultValue(techniqueParameters.baseColorTexture, techniqueParameters.baseColorFactor);
            if (defined(baseColorParameter)) {
                baseColorParameter.semantic = '_3DTILESDIFFUSE';
            }
        }

        // Generate uniforms object before attributes are added
        var techniqueUniforms = {};
        for (var paramName in techniqueParameters) {
            if (techniqueParameters.hasOwnProperty(paramName) && paramName !== 'extras') {
                var param = techniqueParameters[paramName];
                techniqueUniforms['u_' + paramName] = paramName;
                var arraySize = defined(param.count) ? '[' + param.count + ']' : '';
                if (((param.type !== WebGLConstants.FLOAT_MAT3) && (param.type !== WebGLConstants.FLOAT_MAT4) && (paramName !== 'morphWeights')) ||
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
                        vertexShaderMain += '    mat4 skinMatrix = ';
                    } else {
                        vertexShaderMain += '    skinMatrix += ';
                    }
                    vertexShaderMain += 'a_weight[' + i + '] * u_jointMatrix[int(a_joint[' + i + '])];\n';
                }
            } else {
                for (i = 0; i < numberOfComponents; i++) {
                    for (j = 0; j < numberOfComponents; j++) {
                        if (i === 0 && j === 0) {
                            vertexShaderMain += '    mat4 skinMatrix = ';
                        } else {
                            vertexShaderMain += '    skinMatrix += ';
                        }
                        vertexShaderMain += 'a_weight[' + i + '][' + j + '] * u_jointMatrix[int(a_joint[' + i + '][' + j + '])];\n';
                    }
                }
            }
        }

        // Add position always
        var techniqueAttributes = {
            a_position : 'position'
        };
        techniqueParameters.position = {
            semantic : 'POSITION',
            type : WebGLConstants.FLOAT_VEC3
        };
        vertexShader += 'attribute vec3 a_position;\n';
        if (hasNormals) {
            vertexShader += 'varying vec3 v_positionEC;\n';
            if (optimizeForCesium) {
                vertexShader += 'varying vec3 v_positionWC;\n';
            }
        }

        // Morph Target Weighting
        vertexShaderMain += '    vec3 weightedPosition = a_position;\n';
        if (hasNormals) {
            vertexShaderMain += '    vec3 weightedNormal = a_normal;\n';
        }
        if (hasTangents) {
            vertexShaderMain += '    vec4 weightedTangent = a_tangent;\n';
        }
        if (hasMorphTargets) {
            for (var k = 0; k < morphTargets.length; k++) {
                var targetAttributes = morphTargets[k];
                for (var targetAttribute in targetAttributes) {
                    if (targetAttributes.hasOwnProperty(targetAttribute) && targetAttribute !== 'extras') {
                        var attributeLower = targetAttribute.toLowerCase() + '_' + k;
                        techniqueAttributes['a_' + attributeLower] = attributeLower;
                        techniqueParameters[attributeLower] = {
                            semantic : targetAttribute + '_' + k,
                            type : WebGLConstants.FLOAT_VEC3
                        };
                        vertexShader += 'attribute vec3 a_' + attributeLower + ';\n';
                        if (targetAttribute === 'POSITION') {
                            vertexShaderMain += '    weightedPosition += u_morphWeights[' + k + '] * a_' + attributeLower + ';\n';
                        } else if (targetAttribute === 'NORMAL') {
                            vertexShaderMain += '    weightedNormal += u_morphWeights[' + k + '] * a_' + attributeLower + ';\n';
                        } else if (hasTangents && targetAttribute === 'TANGENT') {
                            vertexShaderMain += '    weightedTangent.xyz += u_morphWeights[' + k + '] * a_' + attributeLower + ';\n';
                        }
                    }
                }
            }
        }

        // Final position computation
        if (hasSkinning) {
            vertexShaderMain += '    vec4 position = skinMatrix * vec4(weightedPosition, 1.0);\n';
        } else {
            vertexShaderMain += '    vec4 position = vec4(weightedPosition, 1.0);\n';
        }
        if (hasNormals && optimizeForCesium) {
            vertexShaderMain += '    v_positionWC = (czm_model * position).xyz;\n';
        }
        vertexShaderMain += '    position = u_modelViewMatrix * position;\n';
        if (hasNormals) {
            vertexShaderMain += '    v_positionEC = position.xyz;\n';
        }
        vertexShaderMain += '    gl_Position = u_projectionMatrix * position;\n';

        // Final normal computation
        if (hasNormals) {
            techniqueAttributes.a_normal = 'normal';
            techniqueParameters.normal = {
                semantic : 'NORMAL',
                type : WebGLConstants.FLOAT_VEC3
            };
            vertexShader += 'attribute vec3 a_normal;\n';
            vertexShader += 'varying vec3 v_normal;\n';
            if (hasSkinning) {
                vertexShaderMain += '    v_normal = u_normalMatrix * mat3(skinMatrix) * weightedNormal;\n';
            } else {
                vertexShaderMain += '    v_normal = u_normalMatrix * weightedNormal;\n';
            }

            fragmentShader += 'varying vec3 v_normal;\n';
            fragmentShader += 'varying vec3 v_positionEC;\n';

            if (optimizeForCesium) {
                fragmentShader += 'varying vec3 v_positionWC;\n';
            }
        }

        // Read tangents if available
        if (hasTangents) {
            techniqueAttributes.a_tangent = 'tangent';
            techniqueParameters.tangent = {
                semantic : 'TANGENT',
                type : WebGLConstants.FLOAT_VEC4
            };
            vertexShader += 'attribute vec4 a_tangent;\n';
            vertexShader += 'varying vec4 v_tangent;\n';
            vertexShaderMain += '    v_tangent.xyz = u_normalMatrix * weightedTangent.xyz;\n';
            vertexShaderMain += '    v_tangent.w = weightedTangent.w;\n';

            fragmentShader += 'varying vec4 v_tangent;\n';
        }

        // Add texture coordinates if the material uses them
        var v_texcoord;
        if (hasTexCoords) {
            techniqueAttributes.a_texcoord_0 = 'texcoord_0';
            techniqueParameters.texcoord_0 = {
                semantic : 'TEXCOORD_0',
                type : WebGLConstants.FLOAT_VEC2
            };

            v_texcoord = 'v_texcoord_0';
            vertexShader += 'attribute vec2 a_texcoord_0;\n';
            vertexShader += 'varying vec2 ' + v_texcoord + ';\n';
            vertexShaderMain += '    ' + v_texcoord + ' = a_texcoord_0;\n';

            fragmentShader += 'varying vec2 ' + v_texcoord + ';\n';
        }

        // Add skinning information if available
        if (hasSkinning) {
            techniqueAttributes.a_joint = 'joint';
            var attributeType = getShaderVariable(skinningInfo.type);
            var webGLConstant = glslTypeToWebGLConstant(attributeType);

            techniqueParameters.joint = {
                semantic : 'JOINTS_0',
                type : webGLConstant
            };
            techniqueAttributes.a_weight = 'weight';
            techniqueParameters.weight = {
                semantic : 'WEIGHTS_0',
                type : webGLConstant
            };

            vertexShader += 'attribute ' + attributeType + ' a_joint;\n';
            vertexShader += 'attribute ' + attributeType + ' a_weight;\n';
        }

        if (hasVertexColors) {
            techniqueAttributes.a_vertexColor = 'vertexColor';
            techniqueParameters.vertexColor = {
                semantic: 'COLOR_0',
                type: WebGLConstants.FLOAT_VEC4
            };
            vertexShader += 'attribute vec4 a_vertexColor;\n';
            vertexShader += 'varying vec4 v_vertexColor;\n';
            vertexShaderMain += '  v_vertexColor = a_vertexColor;\n';
            fragmentShader += 'varying vec4 v_vertexColor;\n';
        }

        if (addBatchIdToGeneratedShaders) {
            techniqueAttributes.a_batchId = 'batchId';
            techniqueParameters.batchId = {
                semantic: '_BATCHID',
                type: WebGLConstants.FLOAT
            };
            vertexShader += 'attribute float a_batchId;\n';
        }

        vertexShader += 'void main(void) \n{\n';
        vertexShader += vertexShaderMain;
        vertexShader += '}\n';

        // Fragment shader lighting
        if (hasNormals) {
            fragmentShader += 'const float M_PI = 3.141592653589793;\n';

            fragmentShader += 'vec3 lambertianDiffuse(vec3 diffuseColor) \n' +
                '{\n' +
                '    return diffuseColor / M_PI;\n' +
                '}\n\n';

            fragmentShader += 'vec3 fresnelSchlick2(vec3 f0, vec3 f90, float VdotH) \n' +
                '{\n' +
                '    return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);\n' +
                '}\n\n';

            fragmentShader += 'vec3 fresnelSchlick(float metalness, float VdotH) \n' +
                '{\n' +
                '    return metalness + (vec3(1.0) - metalness) * pow(1.0 - VdotH, 5.0);\n' +
                '}\n\n';

            fragmentShader += 'float smithVisibilityG1(float NdotV, float roughness) \n' +
                '{\n' +
                '    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;\n' +
                '    return NdotV / (NdotV * (1.0 - k) + k);\n' +
                '}\n\n';

            fragmentShader += 'float smithVisibilityGGX(float roughness, float NdotL, float NdotV) \n' +
                '{\n' +
                '    return smithVisibilityG1(NdotL, roughness) * smithVisibilityG1(NdotV, roughness);\n' +
                '}\n\n';

            fragmentShader += 'float GGX(float roughness, float NdotH) \n' +
                '{\n' +
                '    float roughnessSquared = roughness * roughness;\n' +
                '    float f = (NdotH * roughnessSquared - NdotH) * NdotH + 1.0;\n' +
                '    return roughnessSquared / (M_PI * f * f);\n' +
                '}\n\n';
        }

        fragmentShader += 'vec3 SRGBtoLINEAR3(vec3 srgbIn) \n' +
            '{\n' +
            '    return pow(srgbIn, vec3(2.2));\n' +
            '}\n\n';

        fragmentShader += 'vec4 SRGBtoLINEAR4(vec4 srgbIn) \n' +
            '{\n' +
            '    vec3 linearOut = pow(srgbIn.rgb, vec3(2.2));\n' +
            '    return vec4(linearOut, srgbIn.a);\n' +
            '}\n\n';

        fragmentShader += 'vec3 LINEARtoSRGB(vec3 linearIn) \n' +
            '{\n' +
            '    return pow(linearIn, vec3(1.0/2.2));\n' +
            '}\n\n';

        fragmentShader += 'void main(void) \n{\n';

        // Add normal mapping to fragment shader
        if (hasNormals) {
            fragmentShader += '    vec3 ng = normalize(v_normal);\n';
            if (defined(parameterValues.normalTexture)) {
                if (hasTangents) {
                    // Read tangents from varying
                    fragmentShader += '    vec3 t = normalize(v_tangent.xyz);\n';
                    fragmentShader += '    vec3 b = normalize(cross(ng, t) * v_tangent.w);\n';
                    fragmentShader += '    mat3 tbn = mat3(t, b, ng);\n';
                    fragmentShader += '    vec3 n = texture2D(u_normalTexture, ' + v_texcoord + ').rgb;\n';
                    fragmentShader += '    n = normalize(tbn * (2.0 * n - 1.0));\n';
                } else {
                    // Add standard derivatives extension
                    fragmentShader = '#ifdef GL_OES_standard_derivatives\n' +
                        '#extension GL_OES_standard_derivatives : enable\n' +
                        '#endif\n' +
                        fragmentShader;
                    // Compute tangents
                    fragmentShader += '#ifdef GL_OES_standard_derivatives\n';
                    fragmentShader += '    vec3 pos_dx = dFdx(v_positionEC);\n';
                    fragmentShader += '    vec3 pos_dy = dFdy(v_positionEC);\n';
                    fragmentShader += '    vec3 tex_dx = dFdx(vec3(' + v_texcoord + ',0.0));\n';
                    fragmentShader += '    vec3 tex_dy = dFdy(vec3(' + v_texcoord + ',0.0));\n';
                    fragmentShader += '    vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);\n';
                    fragmentShader += '    t = normalize(t - ng * dot(ng, t));\n';
                    fragmentShader += '    vec3 b = normalize(cross(ng, t));\n';
                    fragmentShader += '    mat3 tbn = mat3(t, b, ng);\n';
                    fragmentShader += '    vec3 n = texture2D(u_normalTexture, ' + v_texcoord + ').rgb;\n';
                    fragmentShader += '    n = normalize(tbn * (2.0 * n - 1.0));\n';
                    fragmentShader += '#else\n';
                    fragmentShader += '    vec3 n = ng;\n';
                    fragmentShader += '#endif\n';
                }
            } else {
                fragmentShader += '    vec3 n = ng;\n';
            }
            if (parameterValues.doubleSided) {
                fragmentShader += '    if (!gl_FrontFacing)\n';
                fragmentShader += '    {\n';
                fragmentShader += '        n = -n;\n';
                fragmentShader += '    }\n';
            }
        }

        // Add base color to fragment shader
        if (defined(parameterValues.baseColorTexture)) {
            fragmentShader += '    vec4 baseColorWithAlpha = SRGBtoLINEAR4(texture2D(u_baseColorTexture, ' + v_texcoord + '));\n';
            if (defined(parameterValues.baseColorFactor)) {
                fragmentShader += '    baseColorWithAlpha *= u_baseColorFactor;\n';
            }
        } else {
            if (defined(parameterValues.baseColorFactor)) {
                fragmentShader += '    vec4 baseColorWithAlpha = u_baseColorFactor;\n';
            } else {
                fragmentShader += '    vec4 baseColorWithAlpha = vec4(1.0);\n';
            }
        }

        if (hasVertexColors) {
            fragmentShader += '    baseColorWithAlpha *= v_vertexColor;\n';
        }

        fragmentShader += '    vec3 baseColor = baseColorWithAlpha.rgb;\n';

        if (hasNormals) {
            // Add metallic-roughness to fragment shader
            if (defined(parameterValues.metallicRoughnessTexture)) {
                fragmentShader += '    vec3 metallicRoughness = texture2D(u_metallicRoughnessTexture, ' + v_texcoord + ').rgb;\n';
                fragmentShader += '    float metalness = clamp(metallicRoughness.b, 0.0, 1.0);\n';
                fragmentShader += '    float roughness = clamp(metallicRoughness.g, 0.04, 1.0);\n';
                if (defined(parameterValues.metallicFactor)) {
                    fragmentShader += '    metalness *= u_metallicFactor;\n';
                }
                if (defined(parameterValues.roughnessFactor)) {
                    fragmentShader += '    roughness *= u_roughnessFactor;\n';
                }
            } else {
                if (defined(parameterValues.metallicFactor)) {
                    fragmentShader += '    float metalness = clamp(u_metallicFactor, 0.0, 1.0);\n';
                } else {
                    fragmentShader += '    float metalness = 1.0;\n';
                }
                if (defined(parameterValues.roughnessFactor)) {
                    fragmentShader += '    float roughness = clamp(u_roughnessFactor, 0.04, 1.0);\n';
                } else {
                    fragmentShader += '    float roughness = 1.0;\n';
                }
            }
            fragmentShader += '    vec3 v = -normalize(v_positionEC);\n';

            // Generate fragment shader's lighting block
            if (optimizeForCesium) {
                // The Sun is brighter than your average light source, and has a yellowish tint balanced by the Earth's ambient blue.
                fragmentShader += '    vec3 lightColor = vec3(1.5, 1.4, 1.2);\n';
                fragmentShader += '    vec3 l = normalize(czm_sunDirectionEC);\n';
            } else {
                fragmentShader += '    vec3 lightColor = vec3(1.0, 1.0, 1.0);\n';
                fragmentShader += '    vec3 l = vec3(0.0, 0.0, 1.0);\n';
            }
            fragmentShader += '    vec3 h = normalize(v + l);\n';
            if (optimizeForCesium) {
                fragmentShader += '    vec3 r = normalize(czm_inverseViewRotation * normalize(reflect(v, n)));\n';
                // Figure out if the reflection vector hits the ellipsoid
                fragmentShader += '    czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();\n';
                fragmentShader += '    float vertexRadius = length(v_positionWC);\n';
                fragmentShader += '    float horizonDotNadir = 1.0 - min(1.0, ellipsoid.radii.x / vertexRadius);\n';
                fragmentShader += '    float reflectionDotNadir = dot(r, normalize(v_positionWC));\n';
                // Flipping the X vector is a cheap way to get the inverse of czm_temeToPseudoFixed, since that's a rotation about Z.
                fragmentShader += '    r.x = -r.x;\n';
                fragmentShader += '    r = -normalize(czm_temeToPseudoFixed * r);\n';
                fragmentShader += '    r.x = -r.x;\n';
            } else {
                fragmentShader += '    vec3 r = normalize(reflect(v, n));\n';
            }
            fragmentShader += '    float NdotL = clamp(dot(n, l), 0.001, 1.0);\n';
            fragmentShader += '    float NdotV = abs(dot(n, v)) + 0.001;\n';
            fragmentShader += '    float NdotH = clamp(dot(n, h), 0.0, 1.0);\n';
            fragmentShader += '    float LdotH = clamp(dot(l, h), 0.0, 1.0);\n';
            fragmentShader += '    float VdotH = clamp(dot(v, h), 0.0, 1.0);\n';

            fragmentShader += '    vec3 f0 = vec3(0.04);\n';
            fragmentShader += '    float alpha = roughness * roughness;\n';
            fragmentShader += '    vec3 diffuseColor = baseColor * (1.0 - metalness) * (1.0 - f0);\n';
            fragmentShader += '    vec3 specularColor = mix(f0, baseColor, metalness);\n';
            fragmentShader += '    float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);\n';
            fragmentShader += '    vec3 r90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));\n';
            fragmentShader += '    vec3 r0 = specularColor.rgb;\n';

            fragmentShader += '    vec3 F = fresnelSchlick2(r0, r90, VdotH);\n';
            fragmentShader += '    float G = smithVisibilityGGX(alpha, NdotL, NdotV);\n';
            fragmentShader += '    float D = GGX(alpha, NdotH);\n';

            fragmentShader += '    vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(diffuseColor);\n';
            fragmentShader += '    vec3 specularContribution = F * G * D / (4.0 * NdotL * NdotV);\n';
            fragmentShader += '    vec3 color = NdotL * lightColor * (diffuseContribution + specularContribution);\n';

            if (optimizeForCesium) {
                fragmentShader += '    float inverseRoughness = 1.04 - roughness;\n';
                fragmentShader += '    inverseRoughness *= inverseRoughness;\n';
                fragmentShader += '    vec3 sceneSkyBox = textureCube(czm_environmentMap, r).rgb * inverseRoughness;\n';

                fragmentShader += '    float atmosphereHeight = 0.05;\n';
                fragmentShader += '    float blendRegionSize = 0.1 * ((1.0 - inverseRoughness) * 8.0 + 1.1 - horizonDotNadir);\n';
                fragmentShader += '    float blendRegionOffset = roughness * -1.0;\n';
                fragmentShader += '    float farAboveHorizon = clamp(horizonDotNadir - blendRegionSize * 0.5 + blendRegionOffset, 1.0e-10 - blendRegionSize, 0.99999);\n';
                fragmentShader += '    float aroundHorizon = clamp(horizonDotNadir + blendRegionSize * 0.5, 1.0e-10 - blendRegionSize, 0.99999);\n';
                fragmentShader += '    float farBelowHorizon = clamp(horizonDotNadir + blendRegionSize * 1.5, 1.0e-10 - blendRegionSize, 0.99999);\n';
                fragmentShader += '    float smoothstepHeight = smoothstep(0.0, atmosphereHeight, horizonDotNadir);\n';

                fragmentShader += '    vec3 belowHorizonColor = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.7, 0.9), smoothstepHeight);\n';
                fragmentShader += '    vec3 nadirColor = belowHorizonColor * 0.5;\n';
                fragmentShader += '    vec3 aboveHorizonColor = mix(vec3(0.9, 1.0, 1.2), belowHorizonColor, roughness * 0.5);\n';
                fragmentShader += '    vec3 blueSkyColor = mix(vec3(0.18, 0.26, 0.48), aboveHorizonColor, reflectionDotNadir * inverseRoughness * 0.5 + 0.75);\n';
                fragmentShader += '    vec3 zenithColor = mix(blueSkyColor, sceneSkyBox, smoothstepHeight);\n';

                fragmentShader += '    vec3 blueSkyDiffuseColor = vec3(0.7, 0.85, 0.9);\n';
                fragmentShader += '    float diffuseIrradianceFromEarth = (1.0 - horizonDotNadir) * (reflectionDotNadir * 0.25 + 0.75) * smoothstepHeight;\n';
                fragmentShader += '    float diffuseIrradianceFromSky = (1.0 - smoothstepHeight) * (1.0 - (reflectionDotNadir * 0.25 + 0.25));\n';
                fragmentShader += '    vec3 diffuseIrradiance = blueSkyDiffuseColor * clamp(diffuseIrradianceFromEarth + diffuseIrradianceFromSky, 0.0, 1.0);\n';

                fragmentShader += '    float notDistantRough = (1.0 - horizonDotNadir * roughness * 0.8);\n';
                fragmentShader += '    vec3 specularIrradiance = mix(zenithColor, aboveHorizonColor, smoothstep(farAboveHorizon, aroundHorizon, reflectionDotNadir) * notDistantRough);\n';
                fragmentShader += '    specularIrradiance = mix(specularIrradiance, belowHorizonColor, smoothstep(aroundHorizon, farBelowHorizon, reflectionDotNadir) * inverseRoughness);\n';
                fragmentShader += '    specularIrradiance = mix(specularIrradiance, nadirColor, smoothstep(farBelowHorizon, 1.0, reflectionDotNadir) * inverseRoughness);\n';

                fragmentShader += '    vec2 brdfLut = texture2D(czm_brdfLut, vec2(NdotV, 1.0 - roughness)).rg;\n';
                fragmentShader += '    vec3 IBLColor = (diffuseIrradiance * diffuseColor) + (specularIrradiance * SRGBtoLINEAR3(specularColor * brdfLut.x + brdfLut.y));\n';
                fragmentShader += '    color += IBLColor;\n';
            }
        } else {
            fragmentShader += '    vec3 color = baseColor;\n';
        }

        if (defined(parameterValues.occlusionTexture)) {
            fragmentShader += '    color *= texture2D(u_occlusionTexture, ' + v_texcoord + ').r;\n';
        }
        if (defined(parameterValues.emissiveTexture)) {
            fragmentShader += '    vec3 emissive = SRGBtoLINEAR3(texture2D(u_emissiveTexture, ' + v_texcoord + ').rgb);\n';
            if (defined(parameterValues.emissiveFactor)) {
                fragmentShader += '    emissive *= u_emissiveFactor;\n';
            }
            fragmentShader += '    color += emissive;\n';
        }
        else {
            if (defined(parameterValues.emissiveFactor)) {
                fragmentShader += '    color += u_emissiveFactor;\n';
            }
        }

        // Final color
        fragmentShader += '    color = LINEARtoSRGB(color);\n';
        var alphaMode = material.alphaMode;
        if (defined(alphaMode)) {
            if (alphaMode === 'MASK') {
                var alphaCutoff = defaultValue(material.alphaCutoff, 0.5);
                fragmentShader += '    gl_FragColor = vec4(color, int(baseColorWithAlpha.a >= ' + alphaCutoff + '));\n';
            } else if (alphaMode === 'BLEND') {
                fragmentShader += '    gl_FragColor = vec4(color, baseColorWithAlpha.a);\n';
            } else {
                fragmentShader += '    gl_FragColor = vec4(color, 1.0);\n';
            }
        } else {
            fragmentShader += '    gl_FragColor = vec4(color, 1.0);\n';
        }
        fragmentShader += '}\n';

        var techniqueStates;
        if (defined(alphaMode) && alphaMode !== 'OPAQUE') {
            techniqueStates = {
                enable: parameterValues.doubleSided ? [
                    WebGLConstants.DEPTH_TEST,
                    WebGLConstants.BLEND
                ]: [
                    WebGLConstants.CULL_FACE,
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
        } else if (parameterValues.doubleSided) {
            techniqueStates = {
                enable : [
                    WebGLConstants.DEPTH_TEST
                ]
            };
        } else {
            techniqueStates = {
                enable : [
                    WebGLConstants.CULL_FACE,
                    WebGLConstants.DEPTH_TEST
                ]
            };
        }

        // Add shaders
        var vertexShaderId = addToArray(shaders, {
            type : WebGLConstants.VERTEX_SHADER,
            extras : {
                _pipeline : {
                    source : vertexShader,
                    extension : '.glsl'
                }
            }
        });

        var fragmentShaderId = addToArray(shaders, {
            type : WebGLConstants.FRAGMENT_SHADER,
            extras : {
                _pipeline : {
                    source : fragmentShader,
                    extension : '.glsl'
                }
            }
        });

        // Add program
        var programAttributes = Object.keys(techniqueAttributes);
        var programId = addToArray(programs, {
            attributes : programAttributes,
            fragmentShader : fragmentShaderId,
            vertexShader : vertexShaderId
        });

        var techniqueId = addToArray(techniques, {
            attributes : techniqueAttributes,
            parameters : techniqueParameters,
            program : programId,
            states : techniqueStates,
            uniforms : techniqueUniforms
        });

        return techniqueId;
    }

    function getPBRValueType(paramName) {
        switch (paramName) {
            case 'baseColorFactor':
                return WebGLConstants.FLOAT_VEC4;
            case 'metallicFactor':
                return WebGLConstants.FLOAT;
            case 'roughnessFactor':
                return WebGLConstants.FLOAT;
            case 'baseColorTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'metallicRoughnessTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'normalTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'occlusionTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'emissiveTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'emissiveFactor':
                return WebGLConstants.FLOAT_VEC3;
            case 'doubleSided':
                return WebGLConstants.BOOL;
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
        var targets = primitive.targets;

        var attributes = primitive.attributes;
        for (var target in targets) {
            if (targets.hasOwnProperty(target)) {
                var targetAttributes = targets[target];
                for (var attribute in targetAttributes) {
                    if (attribute !== 'extras') {
                        attributes[attribute + '_' + target] = targetAttributes[attribute];
                    }
                }
            }
        }
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

    function splitIncompatibleMaterials(gltf) {
        var accessors = gltf.accessors;
        var materials = gltf.materials;
        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                var materialId = primitive.material;
                var material = materials[materialId];

                var jointAccessorId = primitive.attributes.JOINTS_0;
                var componentType;
                var type;
                if (defined(jointAccessorId)) {
                    var jointAccessor = accessors[jointAccessorId];
                    componentType = jointAccessor.componentType;
                    type = jointAccessor.type;
                }
                var isSkinned = defined(jointAccessorId);
                var hasVertexColors = defined(primitive.attributes.COLOR_0);
                var hasMorphTargets = defined(primitive.targets);
                var hasNormals = defined(primitive.attributes.NORMAL);
                var hasTangents = defined(primitive.attributes.TANGENT);
                var hasTexCoords = defined(primitive.attributes.TEXCOORD_0);

                var primitiveInfo = material.extras._pipeline.primitive;
                if (!defined(primitiveInfo)) {
                    material.extras._pipeline.primitive = {
                        skinning : {
                            skinned : isSkinned,
                            componentType : componentType,
                            type : type
                        },
                        hasVertexColors : hasVertexColors,
                        hasMorphTargets : hasMorphTargets,
                        hasNormals : hasNormals,
                        hasTangents : hasTangents,
                        hasTexCoords : hasTexCoords
                    };
                } else if ((primitiveInfo.skinning.skinned !== isSkinned) ||
                        (primitiveInfo.skinning.type !== type) ||
                        (primitiveInfo.hasVertexColors !== hasVertexColors) ||
                        (primitiveInfo.hasMorphTargets !== hasMorphTargets) ||
                        (primitiveInfo.hasNormals !== hasNormals) ||
                        (primitiveInfo.hasTangents !== hasTangents) ||
                        (primitiveInfo.hasTexCoords !== hasTexCoords)) {
                    // This primitive uses the same material as another one that either:
                    // * Isn't skinned
                    // * Uses a different type to store joints and weights
                    // * Doesn't have vertex colors, morph targets, normals, tangents, or texCoords
                    var clonedMaterial = clone(material, true);
                    clonedMaterial.extras._pipeline.primitive = {
                        skinning : {
                            skinned : isSkinned,
                            componentType : componentType,
                            type : type
                        },
                        hasVertexColors : hasVertexColors,
                        hasMorphTargets : hasMorphTargets,
                        hasNormals : hasNormals,
                        hasTangents : hasTangents,
                        hasTexCoords : hasTexCoords
                    };
                    // Split this off as a separate material
                    materialId = addToArray(materials, clonedMaterial);
                    primitive.material = materialId;
                }
            });
        });
    }

    return processPbrMetallicRoughness;
});
