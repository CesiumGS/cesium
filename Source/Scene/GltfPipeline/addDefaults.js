import addToArray from "./addToArray.js"
import ForEach from "./ForEach.js"
import getAccessorByteStride from "./getAccessorByteStride.js"
import defaultValue from "../../Core/defaultValue.js"
import defined from "../../Core/defined.js"
import WebGLConstants from "../../Core/WebGLConstants.js"

/**
 * Adds default glTF values if they don't exist.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @returns {Object} The modified glTF.
 *
 * @private
 */
function addDefaults(gltf) {
    ForEach.accessor(gltf, function(accessor) {
        if (defined(accessor.bufferView)) {
            accessor.byteOffset = defaultValue(accessor.byteOffset, 0);
        }
    });

    ForEach.bufferView(gltf, function(bufferView) {
        if (defined(bufferView.buffer)) {
            bufferView.byteOffset = defaultValue(bufferView.byteOffset, 0);
        }
    });

    ForEach.mesh(gltf, function(mesh) {
        ForEach.meshPrimitive(mesh, function(primitive) {
            primitive.mode = defaultValue(primitive.mode, WebGLConstants.TRIANGLES);
            if (!defined(primitive.material)) {
                if (!defined(gltf.materials)) {
                    gltf.materials = [];
                }
                var defaultMaterial = {
                    name: 'default'
                };
                primitive.material = addToArray(gltf.materials, defaultMaterial);
            }
        });
    });

    ForEach.accessorContainingVertexAttributeData(gltf, function(accessorId) {
        var accessor = gltf.accessors[accessorId];
        var bufferViewId = accessor.bufferView;
        accessor.normalized = defaultValue(accessor.normalized, false);
        if (defined(bufferViewId)) {
            var bufferView = gltf.bufferViews[bufferViewId];
            bufferView.byteStride = getAccessorByteStride(gltf, accessor);
            bufferView.target = WebGLConstants.ARRAY_BUFFER;
        }
    });

    ForEach.accessorContainingIndexData(gltf, function(accessorId) {
        var accessor = gltf.accessors[accessorId];
        var bufferViewId = accessor.bufferView;
        if (defined(bufferViewId)) {
            var bufferView = gltf.bufferViews[bufferViewId];
            bufferView.target = WebGLConstants.ELEMENT_ARRAY_BUFFER;
        }
    });

    ForEach.material(gltf, function(material) {
        var extensions = defaultValue(material.extensions, defaultValue.EMPTY_OBJECT);
        var materialsCommon = extensions.KHR_materials_common;
        if (defined(materialsCommon)) {
            var technique = materialsCommon.technique;
            var values = defined(materialsCommon.values) ? materialsCommon.values : {};
            materialsCommon.values = values;

            values.ambient = defined(values.ambient) ? values.ambient : [0.0, 0.0, 0.0, 1.0];
            values.emission = defined(values.emission) ? values.emission : [0.0, 0.0, 0.0, 1.0];

            values.transparency = defaultValue(values.transparency, 1.0);
            values.transparent = defaultValue(values.transparent, false);
            values.doubleSided = defaultValue(values.doubleSided, false);

            if (technique !== 'CONSTANT') {
                values.diffuse = defined(values.diffuse) ? values.diffuse : [0.0, 0.0, 0.0, 1.0];
                if (technique !== 'LAMBERT') {
                    values.specular = defined(values.specular) ? values.specular : [0.0, 0.0, 0.0, 1.0];
                    values.shininess = defaultValue(values.shininess, 0.0);
                }
            }
            return;
        }

        material.emissiveFactor = defaultValue(material.emissiveFactor, [0.0, 0.0, 0.0]);
        material.alphaMode = defaultValue(material.alphaMode, 'OPAQUE');
        material.doubleSided = defaultValue(material.doubleSided, false);

        if (material.alphaMode === 'MASK') {
            material.alphaCutoff = defaultValue(material.alphaCutoff, 0.5);
        }

        var techniquesExtension = extensions.KHR_techniques_webgl;
        if (defined(techniquesExtension)) {
            ForEach.materialValue(material, function (materialValue) {
                // Check if material value is a TextureInfo object
                if (defined(materialValue.index)) {
                    addTextureDefaults(materialValue);
                }
            });
        }

        addTextureDefaults(material.emissiveTexture);
        addTextureDefaults(material.normalTexture);
        addTextureDefaults(material.occlusionTexture);

        var pbrMetallicRoughness = material.pbrMetallicRoughness;
        if (defined(pbrMetallicRoughness)) {
            pbrMetallicRoughness.baseColorFactor = defaultValue(pbrMetallicRoughness.baseColorFactor, [1.0, 1.0, 1.0, 1.0]);
            pbrMetallicRoughness.metallicFactor = defaultValue(pbrMetallicRoughness.metallicFactor, 1.0);
            pbrMetallicRoughness.roughnessFactor = defaultValue(pbrMetallicRoughness.roughnessFactor, 1.0);
            addTextureDefaults(pbrMetallicRoughness.baseColorTexture);
            addTextureDefaults(pbrMetallicRoughness.metallicRoughnessTexture);
        }

        var pbrSpecularGlossiness = extensions.KHR_materials_pbrSpecularGlossiness;
        if (defined(pbrSpecularGlossiness)) {
            pbrSpecularGlossiness.diffuseFactor = defaultValue(pbrSpecularGlossiness.diffuseFactor, [1.0, 1.0, 1.0, 1.0]);
            pbrSpecularGlossiness.specularFactor = defaultValue(pbrSpecularGlossiness.specularFactor, [1.0, 1.0, 1.0]);
            pbrSpecularGlossiness.glossinessFactor = defaultValue(pbrSpecularGlossiness.glossinessFactor, 1.0);
            addTextureDefaults(pbrSpecularGlossiness.specularGlossinessTexture);
        }
    });

    ForEach.animation(gltf, function(animation) {
        ForEach.animationSampler(animation, function(sampler) {
            sampler.interpolation = defaultValue(sampler.interpolation, 'LINEAR');
        });
    });

    var animatedNodes = getAnimatedNodes(gltf);
    ForEach.node(gltf, function(node, id) {
        var animated = defined(animatedNodes[id]);
        if (animated || defined(node.translation) || defined(node.rotation) || defined(node.scale)) {
            node.translation = defaultValue(node.translation, [0.0, 0.0, 0.0]);
            node.rotation = defaultValue(node.rotation, [0.0, 0.0, 0.0, 1.0]);
            node.scale = defaultValue(node.scale, [1.0, 1.0, 1.0]);
        } else {
            node.matrix = defaultValue(node.matrix, [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]);
        }
    });

    ForEach.sampler(gltf, function(sampler) {
        sampler.wrapS = defaultValue(sampler.wrapS, WebGLConstants.REPEAT);
        sampler.wrapT = defaultValue(sampler.wrapT, WebGLConstants.REPEAT);
    });

    if (defined(gltf.scenes) && !defined(gltf.scene)) {
        gltf.scene = 0;
    }

    return gltf;
}

function getAnimatedNodes(gltf) {
    var nodes = {};
    ForEach.animation(gltf, function(animation) {
        ForEach.animationChannel(animation, function(channel) {
            var target = channel.target;
            var nodeId = target.node;
            var path = target.path;
            // Ignore animations that target 'weights'
            if (path === 'translation' || path === 'rotation' || path === 'scale') {
                nodes[nodeId] = true;
            }
        });
    });
    return nodes;
}

function addTextureDefaults(texture) {
    if (defined(texture)) {
        texture.texCoord = defaultValue(texture.texCoord, 0);
    }
}

export default addDefaults;
