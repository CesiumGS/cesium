define([
        './ForEach',
        './hasExtension',
        '../../Core/defined'
    ], function(
        ForEach,
        hasExtension,
        defined) {
    'use strict';

    /**
     * Removes unused elements from gltf.
     * This function currently only works for accessors, buffers, and bufferViews.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     *
     * @private
     */
    function removeUnusedElements(gltf) {
        removeUnusedElementsByType(gltf, 'accessor');
        removeUnusedElementsByType(gltf, 'bufferView');
        removeUnusedElementsByType(gltf, 'buffer');
        return gltf;
    }

    var TypeToGltfElementName = {
        accessor: 'accessors',
        buffer: 'buffers',
        bufferView: 'bufferViews'
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
            ForEach.mesh(gltf, function (mesh) {
                ForEach.meshPrimitive(mesh, function (primitive) {
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

    return removeUnusedElements;
});
