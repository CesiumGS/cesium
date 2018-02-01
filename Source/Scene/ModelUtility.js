define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/RuntimeError',
        '../Core/WebGLConstants',
        '../Renderer/ShaderSource',
        './AttributeType'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        defined,
        defineProperties,
        Matrix2,
        Matrix3,
        Matrix4,
        Quaternion,
        RuntimeError,
        WebGLConstants,
        ShaderSource,
        AttributeType) {
    'use strict';

    /**
     * @private
     */
    var ModelUtility = {};

    ModelUtility.getAccessorMinMax = function(gltf, accessorId) {
        var accessor = gltf.accessors[accessorId];
        var extensions = accessor.extensions;
        var accessorMin = accessor.min;
        var accessorMax = accessor.max;
        // If this accessor is quantized, we should use the decoded min and max
        if (defined(extensions)) {
            var quantizedAttributes = extensions.WEB3D_quantized_attributes;
            if (defined(quantizedAttributes)) {
                accessorMin = quantizedAttributes.decodedMin;
                accessorMax = quantizedAttributes.decodedMax;
            }
        }
        return {
            min : accessorMin,
            max : accessorMax
        };
    };

    ModelUtility.getAttributeOrUniformBySemantic = function(gltf, semantic, programId) {
        var techniques = gltf.techniques;
        var parameter;
        for (var techniqueName in techniques) {
            if (techniques.hasOwnProperty(techniqueName)) {
                var technique = techniques[techniqueName];
                if (defined(programId) && (technique.program !== programId)) {
                    continue;
                }
                var parameters = technique.parameters;
                var attributes = technique.attributes;
                var uniforms = technique.uniforms;
                for (var attributeName in attributes) {
                    if (attributes.hasOwnProperty(attributeName)) {
                        parameter = parameters[attributes[attributeName]];
                        if (defined(parameter) && parameter.semantic === semantic) {
                            return attributeName;
                        }
                    }
                }
                for (var uniformName in uniforms) {
                    if (uniforms.hasOwnProperty(uniformName)) {
                        parameter = parameters[uniforms[uniformName]];
                        if (defined(parameter) && parameter.semantic === semantic) {
                            return uniformName;
                        }
                    }
                }
            }
        }
        return undefined;
    };

    ModelUtility.getDiffuseAttributeOrUniform = function(gltf, programId) {
        var diffuseUniformName = ModelUtility.getAttributeOrUniformBySemantic(gltf, 'COLOR_0', programId);
        if (!defined(diffuseUniformName)) {
            diffuseUniformName = ModelUtility.getAttributeOrUniformBySemantic(gltf, '_3DTILESDIFFUSE', programId);
        }
        return diffuseUniformName;
    };

    var nodeTranslationScratch = new Cartesian3();
    var nodeQuaternionScratch = new Quaternion();
    var nodeScaleScratch = new Cartesian3();

    ModelUtility.getTransform = function(node, result) {
        if (defined(node.matrix)) {
            return Matrix4.fromColumnMajorArray(node.matrix, result);
        }

        return Matrix4.fromTranslationQuaternionRotationScale(
            Cartesian3.fromArray(node.translation, 0, nodeTranslationScratch),
            Quaternion.unpack(node.rotation, 0, nodeQuaternionScratch),
            Cartesian3.fromArray(node.scale, 0, nodeScaleScratch),
            result);
    };

    ModelUtility.getUsedExtensions = function(gltf) {
        var extensionsUsed = gltf.extensionsUsed;
        var cachedExtensionsUsed = {};

        if (defined(extensionsUsed)) {
            var extensionsUsedLength = extensionsUsed.length;
            for (var i = 0; i < extensionsUsedLength; i++) {
                var extension = extensionsUsed[i];
                cachedExtensionsUsed[extension] = true;
            }
        }
        return cachedExtensionsUsed;
    };

    ModelUtility.getRequiredExtensions = function(gltf) {
        var extensionsRequired = gltf.extensionsRequired;
        var cachedExtensionsRequired = {};

        if (defined(extensionsRequired)) {
            var extensionsRequiredLength = extensionsRequired.length;
            for (var i = 0; i < extensionsRequiredLength; i++) {
                var extension = extensionsRequired[i];
                cachedExtensionsRequired[extension] = true;
            }
        }

        return cachedExtensionsRequired;
    };

    ModelUtility.checkSupportedExtensions = function(extensionsRequired) {
        for (var extension in extensionsRequired) {
            if (extensionsRequired.hasOwnProperty(extension)) {
                if (extension !== 'CESIUM_RTC' &&
                    extension !== 'KHR_technique_webgl' &&
                    extension !== 'KHR_binary_glTF' &&
                    extension !== 'KHR_materials_common' &&
                    extension !== 'WEB3D_quantized_attributes') {
                    throw new RuntimeError('Unsupported glTF Extension: ' + extension);
                }
            }
        }
    };

    ModelUtility.checkSupportedGlExtensions = function(extensionsUsed, context) {
        if (defined(extensionsUsed)) {
            var glExtensionsUsedLength = extensionsUsed.length;
            for (var i = 0; i < glExtensionsUsedLength; i++) {
                var extension = extensionsUsed[i];
                if (extension !== 'OES_element_index_uint') {
                    throw new RuntimeError('Unsupported WebGL Extension: ' + extension);
                } else if (!context.elementIndexUint) {
                    throw new RuntimeError('OES_element_index_uint WebGL extension is not enabled.');
                }
            }
        }
    };

    function replaceAllButFirstInString(string, find, replace) {
        var index = string.indexOf(find);
        return string.replace(new RegExp(find, 'g'), function(match, offset) {
            return index === offset ? match : replace;
        });
    }

    function getQuantizedAttributes(gltf, accessorId) {
        var accessor = gltf.accessors[accessorId];
        var extensions = accessor.extensions;
        if (defined(extensions)) {
            return extensions.WEB3D_quantized_attributes;
        }
        return undefined;
    }

    function getAttributeVariableName(gltf, primitive, attributeSemantic) {
        var materialId = primitive.material;
        var material = gltf.materials[materialId];
        var techniqueId = material.technique;
        var technique = gltf.techniques[techniqueId];
        for (var parameter in technique.parameters) {
            if (technique.parameters.hasOwnProperty(parameter)) {
                var semantic = technique.parameters[parameter].semantic;
                if (semantic === attributeSemantic) {
                    var attributes = technique.attributes;
                    for (var attributeVarName in attributes) {
                        if (attributes.hasOwnProperty(attributeVarName)) {
                            var name = attributes[attributeVarName];
                            if (name === parameter) {
                                return attributeVarName;
                            }
                        }
                    }
                }
            }
        }
        return undefined;
    }

    ModelUtility.modifyShaderForQuantizedAttributes = function(gltf, primitive, shader) {
        var quantizedUniforms = {};
        var attributes = primitive.attributes;
        for (var attributeSemantic in attributes) {
            if (attributes.hasOwnProperty(attributeSemantic)) {
                var attributeVarName = getAttributeVariableName(gltf, primitive, attributeSemantic);
                var accessorId = primitive.attributes[attributeSemantic];

                if (attributeSemantic.charAt(0) === '_') {
                    attributeSemantic = attributeSemantic.substring(1);
                }
                var decodeUniformVarName = 'gltf_u_dec_' + attributeSemantic.toLowerCase();

                var decodeUniformVarNameScale = decodeUniformVarName + '_scale';
                var decodeUniformVarNameTranslate = decodeUniformVarName + '_translate';
                if (!defined(quantizedUniforms[decodeUniformVarName]) && !defined(quantizedUniforms[decodeUniformVarNameScale])) {
                    var quantizedAttributes = getQuantizedAttributes(gltf, accessorId);
                    if (defined(quantizedAttributes)) {
                        var decodeMatrix = quantizedAttributes.decodeMatrix;
                        var newMain = 'gltf_decoded_' + attributeSemantic;
                        var decodedAttributeVarName = attributeVarName.replace('a_', 'gltf_a_dec_');
                        var size = Math.floor(Math.sqrt(decodeMatrix.length));

                        // replace usages of the original attribute with the decoded version, but not the declaration
                        shader = replaceAllButFirstInString(shader, attributeVarName, decodedAttributeVarName);
                        // declare decoded attribute
                        var variableType;
                        if (size > 2) {
                            variableType = 'vec' + (size - 1);
                        } else {
                            variableType = 'float';
                        }
                        shader = variableType + ' ' + decodedAttributeVarName + ';\n' + shader;
                        // splice decode function into the shader - attributes are pre-multiplied with the decode matrix
                        // uniform in the shader (32-bit floating point)
                        var decode = '';
                        if (size === 5) {
                            // separate scale and translate since glsl doesn't have mat5
                            shader = 'uniform mat4 ' + decodeUniformVarNameScale + ';\n' + shader;
                            shader = 'uniform vec4 ' + decodeUniformVarNameTranslate + ';\n' + shader;
                            decode = '\n' +
                                     'void main() {\n' +
                                     '    ' + decodedAttributeVarName + ' = ' + decodeUniformVarNameScale + ' * ' + attributeVarName + ' + ' + decodeUniformVarNameTranslate + ';\n' +
                                     '    ' + newMain + '();\n' +
                                     '}\n';

                            quantizedUniforms[decodeUniformVarNameScale] = {mat : 4};
                            quantizedUniforms[decodeUniformVarNameTranslate] = {vec : 4};
                        }
                        else {
                            shader = 'uniform mat' + size + ' ' + decodeUniformVarName + ';\n' + shader;
                            decode = '\n' +
                                     'void main() {\n' +
                                     '    ' + decodedAttributeVarName + ' = ' + variableType + '(' + decodeUniformVarName + ' * vec' + size + '(' + attributeVarName + ',1.0));\n' +
                                     '    ' + newMain + '();\n' +
                                     '}\n';

                            quantizedUniforms[decodeUniformVarName] = {mat : size};
                        }
                        shader = ShaderSource.replaceMain(shader, newMain);
                        shader += decode;
                    }
                }
            }
        }
        return {
            shader : shader,
            uniforms : quantizedUniforms
        };
    };

    function getScalarUniformFunction(value) {
        var that = {
            value : value,
            clone : function(source, result) {
                return source;
            },
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getVec2UniformFunction(value) {
        var that = {
            value : Cartesian2.fromArray(value),
            clone : Cartesian2.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getVec3UniformFunction(value) {
        var that = {
            value : Cartesian3.fromArray(value),
            clone : Cartesian3.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getVec4UniformFunction(value) {
        var that = {
            value : Cartesian4.fromArray(value),
            clone : Cartesian4.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getMat2UniformFunction(value) {
        var that = {
            value : Matrix2.fromColumnMajorArray(value),
            clone : Matrix2.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getMat3UniformFunction(value) {
        var that = {
            value : Matrix3.fromColumnMajorArray(value),
            clone : Matrix3.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    function getMat4UniformFunction(value) {
        var that = {
            value : Matrix4.fromColumnMajorArray(value),
            clone : Matrix4.clone,
            func : function() {
                return that.value;
            }
        };
        return that;
    }

    ///////////////////////////////////////////////////////////////////////////

    function DelayLoadedTextureUniform(value, textures, defaultTexture) {
        this._value = undefined;
        this._textureId = value.index;
        this._textures = textures;
        this._defaultTexture = defaultTexture;
    }

    defineProperties(DelayLoadedTextureUniform.prototype, {
        value : {
            get : function() {
                // Use the default texture (1x1 white) until the model's texture is loaded
                if (!defined(this._value)) {
                    var texture = this._textures[this._textureId];
                    if (defined(texture)) {
                        this._value = texture;
                    } else {
                        return this._defaultTexture;
                    }
                }

                return this._value;
            },
            set : function(value) {
                this._value = value;
            }
        }
    });

    DelayLoadedTextureUniform.prototype.clone = function(source) {
        return source;
    };

    DelayLoadedTextureUniform.prototype.func = undefined;

    ///////////////////////////////////////////////////////////////////////////

    function getTextureUniformFunction(value, texture, defaultTexture) {
        var uniform = new DelayLoadedTextureUniform(value, texture, defaultTexture);
        // Define function here to access closure since 'this' can't be
        // used when the Renderer sets uniforms.
        uniform.func = function() {
            return uniform.value;
        };
        return uniform;
    }

    var gltfUniformFunctions = {};
    gltfUniformFunctions[WebGLConstants.FLOAT] = getScalarUniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[WebGLConstants.INT] = getScalarUniformFunction;
    gltfUniformFunctions[WebGLConstants.INT_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[WebGLConstants.INT_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[WebGLConstants.INT_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL] = getScalarUniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL_VEC2] = getVec2UniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL_VEC3] = getVec3UniformFunction;
    gltfUniformFunctions[WebGLConstants.BOOL_VEC4] = getVec4UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_MAT2] = getMat2UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_MAT3] = getMat3UniformFunction;
    gltfUniformFunctions[WebGLConstants.FLOAT_MAT4] = getMat4UniformFunction;
    gltfUniformFunctions[WebGLConstants.SAMPLER_2D] = getTextureUniformFunction;
    // GLTF_SPEC: Support SAMPLER_CUBE. https://github.com/KhronosGroup/glTF/issues/40

    ModelUtility.createUniformFunction = function(type, value, textures, defaultTexture) {
        return gltfUniformFunctions[type](value, textures, defaultTexture);
    };

    function scaleFromMatrix5Array(matrix) {
        return [matrix[0], matrix[1], matrix[2], matrix[3],
                matrix[5], matrix[6], matrix[7], matrix[8],
                matrix[10], matrix[11], matrix[12], matrix[13],
                matrix[15], matrix[16], matrix[17], matrix[18]];
    }

    function translateFromMatrix5Array(matrix) {
        return [matrix[20], matrix[21], matrix[22], matrix[23]];
    }

    ModelUtility.createUniformsForQuantizedAttributes = function(gltf, primitive, quantizedUniforms) {
        var accessors = gltf.accessors;
        var setUniforms = {};
        var uniformMap = {};

        var attributes = primitive.attributes;
        for (var attribute in attributes) {
            if (attributes.hasOwnProperty(attribute)) {
                var accessorId = attributes[attribute];
                var a = accessors[accessorId];
                var extensions = a.extensions;

                if (attribute.charAt(0) === '_') {
                    attribute = attribute.substring(1);
                }

                if (defined(extensions)) {
                    var quantizedAttributes = extensions.WEB3D_quantized_attributes;
                    if (defined(quantizedAttributes)) {
                        var decodeMatrix = quantizedAttributes.decodeMatrix;
                        var uniformVariable = 'gltf_u_dec_' + attribute.toLowerCase();

                        switch (a.type) {
                            case AttributeType.SCALAR:
                                uniformMap[uniformVariable] = getMat2UniformFunction(decodeMatrix).func;
                                setUniforms[uniformVariable] = true;
                                break;
                            case AttributeType.VEC2:
                                uniformMap[uniformVariable] = getMat3UniformFunction(decodeMatrix).func;
                                setUniforms[uniformVariable] = true;
                                break;
                            case AttributeType.VEC3:
                                uniformMap[uniformVariable] = getMat4UniformFunction(decodeMatrix).func;
                                setUniforms[uniformVariable] = true;
                                break;
                            case AttributeType.VEC4:
                                // VEC4 attributes are split into scale and translate because there is no mat5 in GLSL
                                var uniformVariableScale = uniformVariable + '_scale';
                                var uniformVariableTranslate = uniformVariable + '_translate';
                                uniformMap[uniformVariableScale] = getMat4UniformFunction(scaleFromMatrix5Array(decodeMatrix)).func;
                                uniformMap[uniformVariableTranslate] = getVec4UniformFunction(translateFromMatrix5Array(decodeMatrix)).func;
                                setUniforms[uniformVariableScale] = true;
                                setUniforms[uniformVariableTranslate] = true;
                                break;
                        }
                    }
                }
            }
        }

        // If there are any unset quantized uniforms in this program, they should be set to the identity
        for (var quantizedUniform in quantizedUniforms) {
            if (quantizedUniforms.hasOwnProperty(quantizedUniform)) {
                if (!setUniforms[quantizedUniform]) {
                    var properties = quantizedUniforms[quantizedUniform];
                    if (defined(properties.mat)) {
                        if (properties.mat === 2) {
                            uniformMap[quantizedUniform] = getMat2UniformFunction(Matrix2.IDENTITY).func;
                        } else if (properties.mat === 3) {
                            uniformMap[quantizedUniform] = getMat3UniformFunction(Matrix3.IDENTITY).func;
                        } else if (properties.mat === 4) {
                            uniformMap[quantizedUniform] = getMat4UniformFunction(Matrix4.IDENTITY).func;
                        }
                    }
                    if (defined(properties.vec)) {
                        if (properties.vec === 4) {
                            uniformMap[quantizedUniform] = getVec4UniformFunction([0, 0, 0, 0]).func;
                        }
                    }
                }
            }
        }
        return uniformMap;
    };

    // This doesn't support LOCAL, which we could add if it is ever used.
    var scratchTranslationRtc = new Cartesian3();
    var gltfSemanticUniforms = {
        MODEL : function(uniformState, model) {
            return function() {
                return uniformState.model;
            };
        },
        VIEW : function(uniformState, model) {
            return function() {
                return uniformState.view;
            };
        },
        PROJECTION : function(uniformState, model) {
            return function() {
                return uniformState.projection;
            };
        },
        MODELVIEW : function(uniformState, model) {
            return function() {
                return uniformState.modelView;
            };
        },
        CESIUM_RTC_MODELVIEW : function(uniformState, model) {
            // CESIUM_RTC extension
            var mvRtc = new Matrix4();
            return function() {
                if (defined(model._rtcCenter)) {
                    Matrix4.getTranslation(uniformState.model, scratchTranslationRtc);
                    Cartesian3.add(scratchTranslationRtc, model._rtcCenter, scratchTranslationRtc);
                    Matrix4.multiplyByPoint(uniformState.view, scratchTranslationRtc, scratchTranslationRtc);
                    return Matrix4.setTranslation(uniformState.modelView, scratchTranslationRtc, mvRtc);
                }
                return uniformState.modelView;
            };
        },
        MODELVIEWPROJECTION : function(uniformState, model) {
            return function() {
                return uniformState.modelViewProjection;
            };
        },
        MODELINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseModel;
            };
        },
        VIEWINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseView;
            };
        },
        PROJECTIONINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseProjection;
            };
        },
        MODELVIEWINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseModelView;
            };
        },
        MODELVIEWPROJECTIONINVERSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseModelViewProjection;
            };
        },
        MODELINVERSETRANSPOSE : function(uniformState, model) {
            return function() {
                return uniformState.inverseTransposeModel;
            };
        },
        MODELVIEWINVERSETRANSPOSE : function(uniformState, model) {
            return function() {
                return uniformState.normal;
            };
        },
        VIEWPORT : function(uniformState, model) {
            return function() {
                return uniformState.viewportCartesian4;
            };
        }
        // JOINTMATRIX created in createCommand()
    };

    ModelUtility.getGltfSemanticUniforms = function() {
        return gltfSemanticUniforms;
    };

    return ModelUtility;
});
