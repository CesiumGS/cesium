import hasExtension from './hasExtension.js'
import defined from '../../Core/defined.js'

    /**
     * Contains traversal functions for processing elements of the glTF hierarchy.
     * @constructor
     *
     * @private
     */
    function ForEach() {
    }

    /**
     * Fallback for glTF 1.0
     * @private
     */
    ForEach.objectLegacy = function(objects, handler) {
        if (defined(objects)) {
            for (var objectId in objects) {
                if (Object.prototype.hasOwnProperty.call(objects, objectId)) {
                    var object = objects[objectId];
                    var value = handler(object, objectId);

                    if (defined(value)) {
                        return value;
                    }
                }
            }
        }
    };

    /**
     * @private
     */
    ForEach.object = function(arrayOfObjects, handler) {
        if (defined(arrayOfObjects)) {
            var length = arrayOfObjects.length;
            for (var i = 0; i < length; i++) {
                var object = arrayOfObjects[i];
                var value = handler(object, i);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    /**
     * Supports glTF 1.0 and 2.0
     * @private
     */
    ForEach.topLevel = function(gltf, name, handler) {
        var gltfProperty = gltf[name];
        if (defined(gltfProperty) && !Array.isArray(gltfProperty)) {
            return ForEach.objectLegacy(gltfProperty, handler);
        }

        return ForEach.object(gltfProperty, handler);
    };

    ForEach.accessor = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'accessors', handler);
    };

    ForEach.accessorWithSemantic = function(gltf, semantic, handler) {
        var visited = {};
        return ForEach.mesh(gltf, function(mesh) {
            return ForEach.meshPrimitive(mesh, function(primitive) {
                var valueForEach = ForEach.meshPrimitiveAttribute(primitive, function(accessorId, attributeSemantic) {
                    if (attributeSemantic.indexOf(semantic) === 0 && !defined(visited[accessorId])) {
                        visited[accessorId] = true;
                        var value = handler(accessorId);

                        if (defined(value)) {
                            return value;
                        }
                    }
                });

                if (defined(valueForEach)) {
                    return valueForEach;
                }

                return ForEach.meshPrimitiveTarget(primitive, function(target) {
                    return ForEach.meshPrimitiveTargetAttribute(target, function(accessorId, attributeSemantic) {
                        if (attributeSemantic.indexOf(semantic) === 0 && !defined(visited[accessorId])) {
                            visited[accessorId] = true;
                            var value = handler(accessorId);

                            if (defined(value)) {
                                return value;
                            }
                        }
                    });
                });
            });
        });
    };

    ForEach.accessorContainingVertexAttributeData = function(gltf, handler) {
        var visited = {};
        return ForEach.mesh(gltf, function(mesh) {
            return ForEach.meshPrimitive(mesh, function(primitive) {
                var valueForEach = ForEach.meshPrimitiveAttribute(primitive, function(accessorId) {
                    if (!defined(visited[accessorId])) {
                        visited[accessorId] = true;
                        var value = handler(accessorId);

                        if (defined(value)) {
                            return value;
                        }
                    }
                });

                if (defined(valueForEach)) {
                    return valueForEach;
                }

                return ForEach.meshPrimitiveTarget(primitive, function(target) {
                    return ForEach.meshPrimitiveTargetAttribute(target, function(accessorId) {
                        if (!defined(visited[accessorId])) {
                            visited[accessorId] = true;
                            var value = handler(accessorId);

                            if (defined(value)) {
                                return value;
                            }
                        }
                    });
                });
            });
        });
    };

    ForEach.accessorContainingIndexData = function(gltf, handler) {
        var visited = {};
        return ForEach.mesh(gltf, function(mesh) {
            return ForEach.meshPrimitive(mesh, function(primitive) {
                var indices = primitive.indices;
                if (defined(indices) && !defined(visited[indices])) {
                    visited[indices] = true;
                    var value = handler(indices);

                    if (defined(value)) {
                        return value;
                    }
                }
            });
        });
    };

    ForEach.animation = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'animations', handler);
    };

    ForEach.animationChannel = function(animation, handler) {
        var channels = animation.channels;
        return ForEach.object(channels, handler);
    };

    ForEach.animationSampler = function(animation, handler) {
        var samplers = animation.samplers;
        return ForEach.object(samplers, handler);
    };

    ForEach.buffer = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'buffers', handler);
    };

    ForEach.bufferView = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'bufferViews', handler);
    };

    ForEach.camera = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'cameras', handler);
    };

    ForEach.image = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'images', handler);
    };

    ForEach.compressedImage = function(image, handler) {
        if (defined(image.extras)) {
            var compressedImages = image.extras.compressedImage3DTiles;
            for (var type in compressedImages) {
                if (Object.prototype.hasOwnProperty.call(compressedImages, type)) {
                    var compressedImage = compressedImages[type];
                    var value = handler(compressedImage, type);

                    if (defined(value)) {
                        return value;
                    }
                }
            }
        }
    };

    ForEach.material = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'materials', handler);
    };

    ForEach.materialValue = function(material, handler) {
        var values = material.values;
        if (defined(material.extensions) && defined(material.extensions.KHR_techniques_webgl)) {
            values = material.extensions.KHR_techniques_webgl.values;
        }

        for (var name in values) {
            if (Object.prototype.hasOwnProperty.call(values, name)) {
                var value = handler(values[name], name);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.mesh = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'meshes', handler);
    };

    ForEach.meshPrimitive = function(mesh, handler) {
        var primitives = mesh.primitives;
        if (defined(primitives)) {
            var primitivesLength = primitives.length;
            for (var i = 0; i < primitivesLength; i++) {
                var primitive = primitives[i];
                var value = handler(primitive, i);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.meshPrimitiveAttribute = function(primitive, handler) {
        var attributes = primitive.attributes;
        for (var semantic in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, semantic)) {
                var value = handler(attributes[semantic], semantic);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.meshPrimitiveTarget = function(primitive, handler) {
        var targets = primitive.targets;
        if (defined(targets)) {
            var length = targets.length;
            for (var i = 0; i < length; ++i) {
                var value = handler(targets[i], i);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.meshPrimitiveTargetAttribute = function(target, handler) {
        for (var semantic in target) {
            if (Object.prototype.hasOwnProperty.call(target, semantic)) {
                var accessorId = target[semantic];
                var value = handler(accessorId, semantic);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.node = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'nodes', handler);
    };

    ForEach.nodeInTree = function(gltf, nodeIds, handler) {
        var nodes = gltf.nodes;
        if (defined(nodes)) {
            var length = nodeIds.length;
            for (var i = 0; i < length; i++) {
                var nodeId = nodeIds[i];
                var node = nodes[nodeId];
                if (defined(node)) {
                    var value = handler(node, nodeId);

                    if (defined(value)) {
                        return value;
                    }

                    var children = node.children;
                    if (defined(children)) {
                        value = ForEach.nodeInTree(gltf, children, handler);

                        if (defined(value)) {
                            return value;
                        }
                    }
                }
            }
        }
    };

    ForEach.nodeInScene = function(gltf, scene, handler) {
        var sceneNodeIds = scene.nodes;
        if (defined(sceneNodeIds)) {
            return ForEach.nodeInTree(gltf, sceneNodeIds, handler);
        }
    };

    ForEach.program = function(gltf, handler) {
        if (hasExtension(gltf, 'KHR_techniques_webgl')) {
            return ForEach.object(gltf.extensions.KHR_techniques_webgl.programs, handler);
        }

        return ForEach.topLevel(gltf, 'programs', handler);
    };

    ForEach.sampler = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'samplers', handler);
    };

    ForEach.scene = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'scenes', handler);
    };

    ForEach.shader = function(gltf, handler) {
        if (hasExtension(gltf, 'KHR_techniques_webgl')) {
            return ForEach.object(gltf.extensions.KHR_techniques_webgl.shaders, handler);
        }

        return ForEach.topLevel(gltf, 'shaders', handler);
    };

    ForEach.skin = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'skins', handler);
    };

    ForEach.skinJoint = function(skin, handler) {
        var joints = skin.joints;
        if (defined(joints)) {
            var jointsLength = joints.length;
            for (var i = 0; i < jointsLength; i++) {
                var joint = joints[i];
                var value = handler(joint);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.techniqueAttribute = function(technique, handler) {
        var attributes = technique.attributes;
        for (var attributeName in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, attributeName)) {
                var value = handler(attributes[attributeName], attributeName);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.techniqueUniform = function(technique, handler) {
        var uniforms = technique.uniforms;
        for (var uniformName in uniforms) {
            if (Object.prototype.hasOwnProperty.call(uniforms, uniformName)) {
                var value = handler(uniforms[uniformName], uniformName);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.techniqueParameter = function(technique, handler) {
        var parameters = technique.parameters;
        for (var parameterName in parameters) {
            if (Object.prototype.hasOwnProperty.call(parameters, parameterName)) {
                var value = handler(parameters[parameterName], parameterName);

                if (defined(value)) {
                    return value;
                }
            }
        }
    };

    ForEach.technique = function(gltf, handler) {
        if (hasExtension(gltf, 'KHR_techniques_webgl')) {
            return ForEach.object(gltf.extensions.KHR_techniques_webgl.techniques, handler);
        }

        return ForEach.topLevel(gltf, 'techniques', handler);
    };

    ForEach.texture = function(gltf, handler) {
        return ForEach.topLevel(gltf, 'textures', handler);
    };

    export default ForEach;
