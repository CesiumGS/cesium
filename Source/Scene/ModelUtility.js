import BoundingSphere from '../Core/BoundingSphere.js';
import Cartesian2 from '../Core/Cartesian2.js';
import Cartesian3 from '../Core/Cartesian3.js';
import Cartesian4 from '../Core/Cartesian4.js';
import clone from '../Core/clone.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import Matrix2 from '../Core/Matrix2.js';
import Matrix3 from '../Core/Matrix3.js';
import Matrix4 from '../Core/Matrix4.js';
import Quaternion from '../Core/Quaternion.js';
import RuntimeError from '../Core/RuntimeError.js';
import WebGLConstants from '../Core/WebGLConstants.js';
import ShaderSource from '../Renderer/ShaderSource.js';
import addToArray from '../ThirdParty/GltfPipeline/addToArray.js';
import ForEach from '../ThirdParty/GltfPipeline/ForEach.js';
import hasExtension from '../ThirdParty/GltfPipeline/hasExtension.js';
import AttributeType from './AttributeType.js';
import Axis from './Axis.js';

    /**
     * @private
     */
    var ModelUtility = {};

    /**
     * Updates the model's forward axis if the model is not a 2.0 model.
     *
     * @param {Object} model The model to update.
     */
    ModelUtility.updateForwardAxis = function(model) {
        var cachedSourceVersion = model.gltf.extras.sourceVersion;

        if ((defined(cachedSourceVersion) && cachedSourceVersion !== '2.0')
                || ModelUtility.getAssetVersion(model.gltf) !== '2.0') {
            model._gltfForwardAxis = Axis.X;
        }
    };

    /**
     *  Gets the string representing the glTF asset version.
     *
     *  @param {Object} gltf A javascript object containing a glTF asset.
     *  @returns {String} The glTF asset version string.
     */
    ModelUtility.getAssetVersion = function(gltf) {
        // In glTF 1.0 it was valid to omit the version number.
        if (!defined(gltf.asset) || !defined(gltf.asset.version)) {
            return '1.0';
        }

        return gltf.asset.version;
    };

    /**
     * Splits primitive materials with values incompatible for generating techniques.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset with modified materials.
     */
    ModelUtility.splitIncompatibleMaterials = function(gltf) {
        var accessors = gltf.accessors;
        var materials = gltf.materials;
        var primitiveInfoByMaterial = {};
        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                var materialIndex = primitive.material;
                var material = materials[materialIndex];

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

                var primitiveInfo = primitiveInfoByMaterial[materialIndex];
                if (!defined(primitiveInfo)) {
                    primitiveInfoByMaterial[materialIndex] = {
                        skinning: {
                            skinned: isSkinned,
                            componentType: componentType,
                            type: type
                        },
                        hasVertexColors: hasVertexColors,
                        hasMorphTargets: hasMorphTargets,
                        hasNormals: hasNormals,
                        hasTangents: hasTangents,
                        hasTexCoords: hasTexCoords
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
                    // Split this off as a separate material
                    materialIndex = addToArray(materials, clonedMaterial);
                    primitive.material = materialIndex;
                    primitiveInfoByMaterial[materialIndex] = {
                        skinning: {
                            skinned: isSkinned,
                            componentType: componentType,
                            type: type
                        },
                        hasVertexColors: hasVertexColors,
                        hasMorphTargets: hasMorphTargets,
                        hasNormals: hasNormals,
                        hasTangents: hasTangents,
                        hasTexCoords: hasTexCoords
                    };
                }
            });
        });

        return primitiveInfoByMaterial;
    };

    ModelUtility.getShaderVariable = function(type) {
        if (type === 'SCALAR') {
            return 'float';
        }
        return type.toLowerCase();
    };

    ModelUtility.ModelState = {
        NEEDS_LOAD: 0,
        LOADING: 1,
        LOADED: 2, // Renderable, but textures can still be pending when incrementallyLoadTextures is true.
        FAILED: 3
    };

    ModelUtility.getFailedLoadFunction = function(model, type, path) {
        return function(error) {
            model._state = ModelUtility.ModelState.FAILED;
            var message = 'Failed to load ' + type + ': ' + path;
            if (defined(error)) {
                message += '\n' + error.message;
            }
            model._readyPromise.reject(new RuntimeError(message));
        };
    };

    ModelUtility.parseBuffers = function(model, bufferLoad) {
        var loadResources = model._loadResources;
        ForEach.buffer(model.gltf, function(buffer, bufferViewId) {
            if (defined(buffer.extras._pipeline.source)) {
                loadResources.buffers[bufferViewId] = buffer.extras._pipeline.source;
            } else if (defined(bufferLoad)) {
                var bufferResource = model._resource.getDerivedResource({
                    url: buffer.uri
                });
                ++loadResources.pendingBufferLoads;
                bufferResource.fetchArrayBuffer()
                    .then(bufferLoad(model, bufferViewId))
                    .otherwise(ModelUtility.getFailedLoadFunction(model, 'buffer', bufferResource.url));
            }
        });
    };

    var aMinScratch = new Cartesian3();
    var aMaxScratch = new Cartesian3();

    ModelUtility.computeBoundingSphere = function(model) {
        var gltf = model.gltf;
        var gltfNodes = gltf.nodes;
        var gltfMeshes = gltf.meshes;
        var rootNodes = gltf.scenes[gltf.scene].nodes;
        var rootNodesLength = rootNodes.length;

        var nodeStack = [];

        var min = new Cartesian3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        var max = new Cartesian3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

        for (var i = 0; i < rootNodesLength; ++i) {
            var n = gltfNodes[rootNodes[i]];
            n._transformToRoot = ModelUtility.getTransform(n);
            nodeStack.push(n);

            while (nodeStack.length > 0) {
                n = nodeStack.pop();
                var transformToRoot = n._transformToRoot;

                var meshId = n.mesh;
                if (defined(meshId)) {
                    var mesh = gltfMeshes[meshId];
                    var primitives = mesh.primitives;
                    var primitivesLength = primitives.length;
                    for (var m = 0; m < primitivesLength; ++m) {
                        var positionAccessor = primitives[m].attributes.POSITION;
                        if (defined(positionAccessor)) {
                            var minMax = ModelUtility.getAccessorMinMax(gltf, positionAccessor);
                            var aMin = Cartesian3.fromArray(minMax.min, 0, aMinScratch);
                            var aMax = Cartesian3.fromArray(minMax.max, 0, aMaxScratch);
                            if (defined(min) && defined(max)) {
                                Matrix4.multiplyByPoint(transformToRoot, aMin, aMin);
                                Matrix4.multiplyByPoint(transformToRoot, aMax, aMax);
                                Cartesian3.minimumByComponent(min, aMin, min);
                                Cartesian3.maximumByComponent(max, aMax, max);
                            }
                        }
                    }
                }

                var children = n.children;
                if (defined(children)) {
                    var childrenLength = children.length;
                    for (var k = 0; k < childrenLength; ++k) {
                        var child = gltfNodes[children[k]];
                        child._transformToRoot = ModelUtility.getTransform(child);
                        Matrix4.multiplyTransformation(transformToRoot, child._transformToRoot, child._transformToRoot);
                        nodeStack.push(child);
                    }
                }
                delete n._transformToRoot;
            }
        }

        var boundingSphere = BoundingSphere.fromCornerPoints(min, max);
        if (model._forwardAxis === Axis.Z) {
            // glTF 2.0 has a Z-forward convention that must be adapted here to X-forward.
            BoundingSphere.transformWithoutScale(boundingSphere, Axis.Z_UP_TO_X_UP, boundingSphere);
        }
        if (model._upAxis === Axis.Y) {
            BoundingSphere.transformWithoutScale(boundingSphere, Axis.Y_UP_TO_Z_UP, boundingSphere);
        } else if (model._upAxis === Axis.X) {
            BoundingSphere.transformWithoutScale(boundingSphere, Axis.X_UP_TO_Z_UP, boundingSphere);
        }
        return boundingSphere;
    };

    function techniqueAttributeForSemantic(technique, semantic) {
        return ForEach.techniqueAttribute(technique, function(attribute, attributeName) {
            if (attribute.semantic === semantic) {
                return attributeName;
            }
        });
    }

    function ensureSemanticExistenceForPrimitive(gltf, primitive) {
        var accessors = gltf.accessors;
        var materials = gltf.materials;
        var techniquesWebgl = gltf.extensions.KHR_techniques_webgl;

        var techniques = techniquesWebgl.techniques;
        var programs = techniquesWebgl.programs;
        var shaders = techniquesWebgl.shaders;
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
        var technique = techniques[material.extensions.KHR_techniques_webgl.technique];
        var program = programs[technique.program];
        var vertexShader = shaders[program.vertexShader];

        for (var semantic in attributes) {
            if (attributes.hasOwnProperty(semantic)) {
                if (!defined(techniqueAttributeForSemantic(technique, semantic))) {
                    var accessorId = attributes[semantic];
                    var accessor = accessors[accessorId];
                    var lowerCase = semantic.toLowerCase();
                    if (lowerCase.charAt(0) === '_') {
                        lowerCase = lowerCase.slice(1);
                    }
                    var attributeName = 'a_' + lowerCase;
                    technique.attributes[attributeName] = {
                        semantic: semantic,
                        type: accessor.componentType
                    };
                    var pipelineExtras = vertexShader.extras._pipeline;
                    var shaderText = pipelineExtras.source;
                    shaderText = 'attribute ' + ModelUtility.getShaderVariable(accessor.type) + ' ' + attributeName + ';\n' + shaderText;
                    pipelineExtras.source = shaderText;
                }
            }
        }
    }

    /**
     * Ensures all attributes present on the primitive are present in the technique and
     * vertex shader.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @returns {Object} The glTF asset, including any additional attributes.
     */
    ModelUtility.ensureSemanticExistence = function (gltf) {
        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                ensureSemanticExistenceForPrimitive(gltf, primitive);
            });
        });

        return gltf;
    };

    /**
     * Creates attribute location for all attributes required by a technique.
     *
     * @param {Object} technique A glTF KHR_techniques_webgl technique object.
     * @param {Object} precreatedAttributes A dictionary object of pre-created attributes for which to also create locations.
     * @returns {Object} A dictionary object containing attribute names and their locations.
     */
    ModelUtility.createAttributeLocations = function(technique, precreatedAttributes) {
        var attributeLocations = {};
        var hasIndex0 = false;
        var i = 1;

        ForEach.techniqueAttribute(technique, function (attribute, attributeName) {
            // Set the position attribute to the 0th index. In some WebGL implementations the shader
            // will not work correctly if the 0th attribute is not active. For example, some glTF models
            // list the normal attribute first but derived shaders like the cast-shadows shader do not use
            // the normal attribute.
            if (/pos/i.test(attributeName) && !hasIndex0) {
                attributeLocations[attributeName] = 0;
                hasIndex0 = true;
            } else {
                attributeLocations[attributeName] = i++;
            }
        });

        if (defined(precreatedAttributes)) {
            for (var attributeName in precreatedAttributes) {
                if (precreatedAttributes.hasOwnProperty(attributeName)) {
                    attributeLocations[attributeName] = i++;
                }
            }
        }

        return attributeLocations;
    };

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

    function getTechniqueAttributeOrUniformFunction(gltf, technique, semantic, ignoreNodes) {
        if (hasExtension(gltf, 'KHR_techniques_webgl')) {
            return function(attributeOrUniform, attributeOrUniformName) {
                if (attributeOrUniform.semantic === semantic && (!ignoreNodes || !defined(attributeOrUniform.node))) {
                    return attributeOrUniformName;
                }
            };
        }

        return function(parameterName, attributeOrUniformName) {
            var attributeOrUniform = technique.parameters[parameterName];
            if (attributeOrUniform.semantic === semantic && (!ignoreNodes || !defined(attributeOrUniform.node))) {
                return attributeOrUniformName;
            }
        };
    }

    ModelUtility.getAttributeOrUniformBySemantic = function(gltf, semantic, programId, ignoreNodes) {
        return ForEach.technique(gltf, function(technique) {
            if (defined(programId) && (technique.program !== programId)) {
                return;
            }

            var value = ForEach.techniqueAttribute(technique, getTechniqueAttributeOrUniformFunction(gltf, technique, semantic, ignoreNodes));

            if (defined(value)) {
                return value;
            }

            return ForEach.techniqueUniform(technique, getTechniqueAttributeOrUniformFunction(gltf, technique, semantic, ignoreNodes));
        });
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

    ModelUtility.supportedExtensions = {
        'AGI_articulations' : true,
        'CESIUM_RTC' : true,
        'EXT_texture_webp' : true,
        'KHR_blend' : true,
        'KHR_binary_glTF' : true,
        'KHR_draco_mesh_compression' : true,
        'KHR_materials_common' : true,
        'KHR_techniques_webgl' : true,
        'KHR_materials_unlit' : true,
        'KHR_materials_pbrSpecularGlossiness' : true,
        'KHR_texture_transform' : true,
        'WEB3D_quantized_attributes' : true
    };

    ModelUtility.checkSupportedExtensions = function(extensionsRequired, browserSupportsWebp) {
        for (var extension in extensionsRequired) {
            if (extensionsRequired.hasOwnProperty(extension)) {
                if (!ModelUtility.supportedExtensions[extension]) {
                    throw new RuntimeError('Unsupported glTF Extension: ' + extension);
                }

                if (extension === 'EXT_texture_webp' && browserSupportsWebp === false) {
                    throw new RuntimeError('Loaded model requires WebP but browser does not support it.');
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
        // Limit search to strings that are not a subset of other tokens.
        find += '(?!\\w)';
        find = new RegExp(find, 'g');

        var index = string.search(find);
        return string.replace(find, function(match, offset) {
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

        if (!hasExtension(gltf, 'KHR_techniques_webgl')
                || !defined(material.extensions)
                || !defined(material.extensions.KHR_techniques_webgl)) {
            return;
        }

        var techniqueId = material.extensions.KHR_techniques_webgl.technique;
        var techniquesWebgl = gltf.extensions.KHR_techniques_webgl;
        var technique = techniquesWebgl.techniques[techniqueId];
        return ForEach.techniqueAttribute(technique, function(attribute, attributeName) {
            var semantic = attribute.semantic;
            if (semantic === attributeSemantic) {
                return attributeName;
            }
        });
    }

    ModelUtility.modifyShaderForDracoQuantizedAttributes = function(gltf, primitive, shader, decodedAttributes) {
        var quantizedUniforms = {};
        for (var attributeSemantic in decodedAttributes) {
            if (decodedAttributes.hasOwnProperty(attributeSemantic)) {
                var attribute = decodedAttributes[attributeSemantic];
                var quantization = attribute.quantization;
                if (!defined(quantization)) {
                    continue;
                }

                var attributeVarName = getAttributeVariableName(gltf, primitive, attributeSemantic);

                if (attributeSemantic.charAt(0) === '_') {
                    attributeSemantic = attributeSemantic.substring(1);
                }
                var decodeUniformVarName = 'gltf_u_dec_' + attributeSemantic.toLowerCase();

                if (!defined(quantizedUniforms[decodeUniformVarName])) {
                    var newMain = 'gltf_decoded_' + attributeSemantic;
                    var decodedAttributeVarName = attributeVarName.replace('a_', 'gltf_a_dec_');
                    var size = attribute.componentsPerAttribute;

                    // replace usages of the original attribute with the decoded version, but not the declaration
                    shader = replaceAllButFirstInString(shader, attributeVarName, decodedAttributeVarName);

                    // declare decoded attribute
                    var variableType;
                    if (quantization.octEncoded) {
                        variableType = 'vec3';
                    } else if (size > 1) {
                        variableType = 'vec' + size;
                    } else {
                        variableType = 'float';
                    }
                    shader = variableType + ' ' + decodedAttributeVarName + ';\n' + shader;

                    // The gltf 2.0 COLOR_0 vertex attribute can be VEC4 or VEC3
                    var vec3Color = size === 3 && attributeSemantic === 'COLOR_0';
                    if (vec3Color) {
                        shader = replaceAllButFirstInString(shader, decodedAttributeVarName, 'vec4(' + decodedAttributeVarName + ', 1.0)');
                    }

                    // splice decode function into the shader
                    var decode = '';
                    if (quantization.octEncoded) {
                        var decodeUniformVarNameRangeConstant = decodeUniformVarName + '_rangeConstant';
                        shader = 'uniform float ' + decodeUniformVarNameRangeConstant + ';\n' + shader;
                        decode = '\n' +
                                'void main() {\n' +
                                // Draco oct-encoding decodes to zxy order
                                '    ' + decodedAttributeVarName + ' = czm_octDecode(' + attributeVarName + '.xy, ' + decodeUniformVarNameRangeConstant + ').zxy;\n' +
                                '    ' + newMain + '();\n' +
                                '}\n';
                    } else {
                        var decodeUniformVarNameNormConstant = decodeUniformVarName + '_normConstant';
                        var decodeUniformVarNameMin = decodeUniformVarName + '_min';
                        shader = 'uniform float ' + decodeUniformVarNameNormConstant + ';\n' +
                                'uniform ' + variableType + ' ' + decodeUniformVarNameMin + ';\n' + shader;
                        var attributeVarAccess = vec3Color ? '.xyz' : '';
                        decode = '\n' +
                                'void main() {\n' +
                                '    ' + decodedAttributeVarName + ' = ' + decodeUniformVarNameMin + ' + ' + attributeVarName + attributeVarAccess + ' * ' + decodeUniformVarNameNormConstant + ';\n' +
                                '    ' + newMain + '();\n' +
                                '}\n';
                    }

                    shader = ShaderSource.replaceMain(shader, newMain);
                    shader += decode;
                }
            }
        }
        return {
            shader : shader
        };
    };

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

    ModelUtility.toClipCoordinatesGLSL = function(gltf, shader) {
        var positionName = ModelUtility.getAttributeOrUniformBySemantic(gltf, 'POSITION');
        var decodedPositionName = positionName.replace('a_', 'gltf_a_dec_');
        if (shader.indexOf(decodedPositionName) !== -1) {
            positionName = decodedPositionName;
        }

        var modelViewProjectionName = ModelUtility.getAttributeOrUniformBySemantic(gltf, 'MODELVIEWPROJECTION', undefined, true);
        if (!defined(modelViewProjectionName) || shader.indexOf(modelViewProjectionName) === -1) {
            var projectionName = ModelUtility.getAttributeOrUniformBySemantic(gltf, 'PROJECTION', undefined, true);
            var modelViewName = ModelUtility.getAttributeOrUniformBySemantic(gltf, 'MODELVIEW', undefined, true);
            if (shader.indexOf('czm_instanced_modelView ') !== -1) {
                modelViewName = 'czm_instanced_modelView';
            } else if (!defined(modelViewName)) {
                modelViewName = ModelUtility.getAttributeOrUniformBySemantic(gltf, 'CESIUM_RTC_MODELVIEW', undefined, true);
            }
            modelViewProjectionName = projectionName + ' * ' + modelViewName;
        }

        return modelViewProjectionName + ' * vec4(' + positionName + '.xyz, 1.0)';
    };

    ModelUtility.modifyFragmentShaderForLogDepth = function(shader) {
        shader = ShaderSource.replaceMain(shader, 'czm_depth_main');
        shader +=
            '\n' +
            'void main() \n' +
            '{ \n' +
            '    czm_depth_main(); \n' +
            '    czm_writeLogDepth(); \n' +
            '} \n';

        return shader;
    };

    ModelUtility.modifyVertexShaderForLogDepth = function(shader, toClipCoordinatesGLSL) {
        shader = ShaderSource.replaceMain(shader, 'czm_depth_main');
        shader +=
            '\n' +
            'void main() \n' +
            '{ \n' +
            '    czm_depth_main(); \n' +
            '    czm_vertexLogDepth(' + toClipCoordinatesGLSL + '); \n' +
            '} \n';

        return shader;
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

    function getTextureUniformFunction(value, textures, defaultTexture) {
        var uniform = new DelayLoadedTextureUniform(value, textures, defaultTexture);
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

    ModelUtility.createUniformsForDracoQuantizedAttributes = function(decodedAttributes) {
        var uniformMap = {};
        for (var attribute in decodedAttributes) {
            if (decodedAttributes.hasOwnProperty(attribute)) {
                var decodedData = decodedAttributes[attribute];
                var quantization = decodedData.quantization;

                if (!defined(quantization)) {
                    continue;
                }

                if (attribute.charAt(0) === '_'){
                    attribute = attribute.substring(1);
                }

                var uniformVarName = 'gltf_u_dec_' + attribute.toLowerCase();

                if (quantization.octEncoded) {
                    var uniformVarNameRangeConstant = uniformVarName + '_rangeConstant';
                    var rangeConstant = (1 << quantization.quantizationBits) - 1.0;
                    uniformMap[uniformVarNameRangeConstant] = getScalarUniformFunction(rangeConstant).func;
                    continue;
                }

                var uniformVarNameNormConstant = uniformVarName + '_normConstant';
                var normConstant = quantization.range / (1 << quantization.quantizationBits);
                uniformMap[uniformVarNameNormConstant] = getScalarUniformFunction(normConstant).func;

                var uniformVarNameMin = uniformVarName + '_min';
                switch (decodedData.componentsPerAttribute) {
                    case 1:
                        uniformMap[uniformVarNameMin] = getScalarUniformFunction(quantization.minValues).func;
                        break;
                    case 2:
                        uniformMap[uniformVarNameMin] = getVec2UniformFunction(quantization.minValues).func;
                        break;
                    case 3:
                        uniformMap[uniformVarNameMin] = getVec3UniformFunction(quantization.minValues).func;
                        break;
                    case 4:
                        uniformMap[uniformVarNameMin] = getVec4UniformFunction(quantization.minValues).func;
                        break;
                }
            }
        }

        return uniformMap;
    };

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
export default ModelUtility;
