import ForEach from './ForEach.js'
import hasExtension from './hasExtension.js'
import defaultValue from '../../Core/defaultValue.js'
import defined from '../../Core/defined.js'

    var allElementTypes = ['mesh', 'node', 'material', 'accessor', 'bufferView', 'buffer'];

    /**
     * Removes unused elements from gltf.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {String[]} [elementTypes=['mesh', 'node', 'material', 'accessor', 'bufferView', 'buffer']] Element types to be removed. Needs to be a subset of ['mesh', 'node', 'material', 'accessor', 'bufferView', 'buffer'], other items will be ignored.
     *
     * @private
     */
    function removeUnusedElements(gltf, elementTypes) {
        elementTypes = defaultValue(elementTypes, allElementTypes);
        allElementTypes.forEach(function(type) {
            if (elementTypes.indexOf(type) > -1) {
                removeUnusedElementsByType(gltf, type);
            }
        });
        return gltf;
    }

    var TypeToGltfElementName = {
        accessor: 'accessors',
        buffer: 'buffers',
        bufferView: 'bufferViews',
        node: 'nodes',
        material: 'materials',
        mesh: 'meshes'
    };

    function removeUnusedElementsByType(gltf, type) {
        var name = TypeToGltfElementName[type];
        var arrayOfObjects = gltf[name];

        if (defined(arrayOfObjects)) {
            var removed = 0;
            var usedIds = getListOfElementsIdsInUse[type](gltf);
            var length = arrayOfObjects.length;

            for (var i = 0; i < length; ++i) {
                if (!usedIds[i]) {
                    Remove[type](gltf, i - removed);
                    removed++;
                }
            }
        }
    }

    /**
     * Contains functions for removing elements from a glTF hierarchy.
     * Since top-level glTF elements are arrays, when something is removed, referring
     * indices need to be updated.
     * @constructor
     *
     * @private
     */
    function Remove() {}

    Remove.accessor = function(gltf, accessorId) {
        var accessors = gltf.accessors;

        accessors.splice(accessorId, 1);

        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                // Update accessor ids for the primitives.
                ForEach.meshPrimitiveAttribute(primitive, function(attributeAccessorId, semantic) {
                    if (attributeAccessorId > accessorId) {
                        primitive.attributes[semantic]--;
                    }
                });

                // Update accessor ids for the targets.
                ForEach.meshPrimitiveTarget(primitive, function(target) {
                    ForEach.meshPrimitiveTargetAttribute(target, function(attributeAccessorId, semantic) {
                        if (attributeAccessorId > accessorId) {
                            target[semantic]--;
                        }
                    });
                });
                var indices = primitive.indices;
                if (defined(indices) && indices > accessorId) {
                    primitive.indices--;
                }
            });
        });

        ForEach.skin(gltf, function(skin) {
            if (defined(skin.inverseBindMatrices) && skin.inverseBindMatrices > accessorId) {
                skin.inverseBindMatrices--;
            }
        });

        ForEach.animation(gltf, function(animation) {
            ForEach.animationSampler(animation, function(sampler) {
                if (defined(sampler.input) && sampler.input > accessorId) {
                    sampler.input--;
                }
                if (defined(sampler.output) && sampler.output > accessorId) {
                    sampler.output--;
                }
            });
        });
    };

    Remove.buffer = function(gltf, bufferId) {
        var buffers = gltf.buffers;

        buffers.splice(bufferId, 1);

        ForEach.bufferView(gltf, function(bufferView) {
            if (defined(bufferView.buffer) && bufferView.buffer > bufferId) {
                bufferView.buffer--;
            }
        });
    };

    Remove.bufferView = function(gltf, bufferViewId) {
        var bufferViews = gltf.bufferViews;

        bufferViews.splice(bufferViewId, 1);

        ForEach.accessor(gltf, function(accessor) {
            if (defined(accessor.bufferView) && accessor.bufferView > bufferViewId) {
                accessor.bufferView--;
            }
        });

        ForEach.shader(gltf, function(shader) {
            if (defined(shader.bufferView) && shader.bufferView > bufferViewId) {
                shader.bufferView--;
            }
        });

        ForEach.image(gltf, function(image) {
            if (defined(image.bufferView) && image.bufferView > bufferViewId) {
                image.bufferView--;
            }
            ForEach.compressedImage(image, function(compressedImage) {
                var compressedImageBufferView = compressedImage.bufferView;
                if (defined(compressedImageBufferView) && compressedImageBufferView > bufferViewId) {
                    compressedImage.bufferView--;
                }
            });
        });

        if (hasExtension(gltf, 'KHR_draco_mesh_compression')) {
            ForEach.mesh(gltf, function(mesh) {
                ForEach.meshPrimitive(mesh, function(primitive) {
                    if (defined(primitive.extensions) &&
                        defined(primitive.extensions.KHR_draco_mesh_compression)) {
                        if (primitive.extensions.KHR_draco_mesh_compression.bufferView > bufferViewId) {
                            primitive.extensions.KHR_draco_mesh_compression.bufferView--;
                        }
                    }
                });
            });
        }
    };

    Remove.mesh = function(gltf, meshId) {
        var meshes = gltf.meshes;
        meshes.splice(meshId, 1);

        ForEach.node(gltf, function(node) {
            if (defined(node.mesh)) {
                if (node.mesh > meshId) {
                    node.mesh--;
                } else if (node.mesh === meshId) {
                    // Remove reference to deleted mesh
                    delete node.mesh;
                }
            }
        });
    };

    Remove.node = function(gltf, nodeId) {
        var nodes = gltf.nodes;
        nodes.splice(nodeId, 1);

        // Shift all node references
        ForEach.skin(gltf, function(skin) {
            if (defined(skin.skeleton) && skin.skeleton > nodeId) {
                skin.skeleton--;
            }

            skin.joints = skin.joints.map(function(x) {
                return x > nodeId ? x - 1 : x;
            });
        });
        ForEach.animation(gltf, function(animation) {
            ForEach.animationChannel(animation, function(channel) {
                if (defined(channel.target) && defined(channel.target.node) && (channel.target.node > nodeId)) {
                    channel.target.node--;
                }
            });
        });
        ForEach.technique(gltf, function(technique) {
            ForEach.techniqueUniform(technique, function(uniform) {
                if (defined(uniform.node) && uniform.node > nodeId) {
                    uniform.node--;
                }
            });
        });
        ForEach.node(gltf, function(node) {
            if (!defined(node.children)) {
                return;
            }

            node.children = node.children
                .filter(function(x) {
                    return x !== nodeId; // Remove
                })
                .map(function(x) {
                    return x > nodeId ? x - 1 : x; // Shift indices
                });
        });
        ForEach.scene(gltf, function(scene) {
            scene.nodes = scene.nodes
                .filter(function(x) {
                    return x !== nodeId; // Remove
                })
                .map(function(x) {
                    return x > nodeId ? x - 1 : x; // Shift indices
                });
        });
    };

    Remove.material = function(gltf, materialId) {
        var materials = gltf.materials;
        materials.splice(materialId, 1);

        // Shift other material ids
        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                if (defined(primitive.material) && primitive.material > materialId) {
                    primitive.material--;
                }
            });
        });
    };

    /**
     * Contains functions for getting a list of element ids in use by the glTF asset.
     * @constructor
     *
     * @private
     */
    function getListOfElementsIdsInUse() {}

    getListOfElementsIdsInUse.accessor = function(gltf) {
        // Calculate accessor's that are currently in use.
        var usedAccessorIds = {};

        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                ForEach.meshPrimitiveAttribute(primitive, function(accessorId) {
                    usedAccessorIds[accessorId] = true;
                });
                ForEach.meshPrimitiveTarget(primitive, function(target) {
                    ForEach.meshPrimitiveTargetAttribute(target, function(accessorId) {
                        usedAccessorIds[accessorId] = true;
                    });
                });
                var indices = primitive.indices;
                if (defined(indices)) {
                    usedAccessorIds[indices] = true;
                }
            });
        });

        ForEach.skin(gltf, function(skin) {
            if (defined(skin.inverseBindMatrices)) {
                usedAccessorIds[skin.inverseBindMatrices] = true;
            }
        });

        ForEach.animation(gltf, function(animation) {
            ForEach.animationSampler(animation, function(sampler) {
                if (defined(sampler.input)) {
                    usedAccessorIds[sampler.input] = true;
                }
                if (defined(sampler.output)) {
                    usedAccessorIds[sampler.output] = true;
                }
            });
        });

        return usedAccessorIds;
    };

    getListOfElementsIdsInUse.buffer = function(gltf) {
        // Calculate buffer's that are currently in use.
        var usedBufferIds = {};

        ForEach.bufferView(gltf, function(bufferView) {
            if (defined(bufferView.buffer)) {
                usedBufferIds[bufferView.buffer] = true;
            }
        });

        return usedBufferIds;
    };

    getListOfElementsIdsInUse.bufferView = function(gltf) {
        // Calculate bufferView's that are currently in use.
        var usedBufferViewIds = {};

        ForEach.accessor(gltf, function(accessor) {
            if (defined(accessor.bufferView)) {
                usedBufferViewIds[accessor.bufferView] = true;
            }
        });

        ForEach.shader(gltf, function(shader) {
            if (defined(shader.bufferView)) {
                usedBufferViewIds[shader.bufferView] = true;
            }
        });

        ForEach.image(gltf, function(image) {
            if (defined(image.bufferView)) {
                usedBufferViewIds[image.bufferView] = true;
            }
            ForEach.compressedImage(image, function(compressedImage) {
                if (defined(compressedImage.bufferView)) {
                    usedBufferViewIds[compressedImage.bufferView] = true;
                }
            });
        });

        if (hasExtension(gltf, 'KHR_draco_mesh_compression')) {
            ForEach.mesh(gltf, function(mesh) {
                ForEach.meshPrimitive(mesh, function(primitive) {
                    if (defined(primitive.extensions) &&
                        defined(primitive.extensions.KHR_draco_mesh_compression)) {
                        usedBufferViewIds[primitive.extensions.KHR_draco_mesh_compression.bufferView] = true;
                    }
                });
            });
        }

        return usedBufferViewIds;
    };

    getListOfElementsIdsInUse.mesh = function(gltf) {
        var usedMeshIds = {};
        ForEach.node(gltf, function(node) {
            if (defined(node.mesh && defined(gltf.meshes))) {
                var mesh = gltf.meshes[node.mesh];
                if (defined(mesh) && defined(mesh.primitives) && (mesh.primitives.length > 0)) {
                    usedMeshIds[node.mesh] = true;
                }
            }
        });

        return usedMeshIds;
    };

    // Check if node is empty. It is considered empty if neither referencing
    // mesh, camera, extensions and has no children
    function nodeIsEmpty(gltf, node) {
        if (defined(node.mesh) || defined(node.camera) || defined(node.skin)
            || defined(node.weights) || defined(node.extras)
            || (defined(node.extensions) && node.extensions.length !== 0)) {
            return false;
        }

        // Empty if no children or children are all empty nodes
        return !defined(node.children)
            || node.children.filter(function(n) {
                return !nodeIsEmpty(gltf, gltf.nodes[n]);
            }).length === 0;
    }

    getListOfElementsIdsInUse.node = function(gltf) {
        var usedNodeIds = {};
        ForEach.node(gltf, function(node, nodeId) {
            if (!nodeIsEmpty(gltf, node)) {
                usedNodeIds[nodeId] = true;
            }
        });
        ForEach.skin(gltf, function(skin) {
            if (defined(skin.skeleton)) {
                usedNodeIds[skin.skeleton] = true;
            }

            ForEach.skinJoint(skin, function(joint) {
                usedNodeIds[joint] = true;
            });
        });
        ForEach.animation(gltf, function(animation) {
            ForEach.animationChannel(animation, function(channel) {
                if (defined(channel.target) && defined(channel.target.node)) {
                    usedNodeIds[channel.target.node] = true;
                }
            });
        });
        ForEach.technique(gltf, function(technique) {
            ForEach.techniqueUniform(technique, function(uniform) {
                if (defined(uniform.node)) {
                    usedNodeIds[uniform.node] = true;
                }
            });
        });

        return usedNodeIds;
    };

    getListOfElementsIdsInUse.material = function(gltf) {
        var usedMaterialIds = {};

        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                if (defined(primitive.material)) {
                    usedMaterialIds[primitive.material] = true;
                }
            });
        });

        return usedMaterialIds;
    };

    export default removeUnusedElements;
