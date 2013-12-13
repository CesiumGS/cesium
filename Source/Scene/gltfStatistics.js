/*global define*/
define([
        '../Core/defined'
    ], function(
        defined) {
    "use strict";

    function getNumberOf(property) {
        if (!defined(property)) {
            return 0;
        }

        var count = 0;

        for (var name in property) {
            if (property.hasOwnProperty(name)) {
                ++count;
            }
        }

        return count;
    }

    function getNumberOfPrimitives(meshes) {
        if (!defined(meshes)) {
            return 0;
        }

        var count = 0;

        for (var name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var mesh = meshes[name];

                count += defined(mesh.primitives) ? mesh.primitives.length : 0;
            }
        }

        return count;
    }

    function getMeshStatistics(gltf) {
        var meshes = gltf.meshes;
        var accessors = gltf.accessors;

        if (!defined(meshes) || !defined(accessors)) {
            return undefined;
        }

        var statistics = {};
        var assetNumberOfTriangles = 0;

        for (var name in meshes) {
            if (meshes.hasOwnProperty(name)) {
                var mesh = meshes[name];
                var primitives = mesh.primitives;

                var meshNumberOfTriangles = 0;
                var primitivesStatistics = [];

                var length = primitives.length;
                for (var i = 0; i < length; ++i) {
                    var primitiveNumberOfTriangles = 0;

                    var primitive = primitives[i];
                    var indices = primitive.indices;
                    if (defined(indices)) {
                        // TODO: Assumes TRIANGLES primitive and indexed primitives (drawElements, not drawArrays)
                        primitiveNumberOfTriangles = accessors[indices].count / 3;
                    }

                    primitivesStatistics[i] = {
                        numberOfTriangles : primitiveNumberOfTriangles
                    };
                    meshNumberOfTriangles += primitiveNumberOfTriangles;
                }

                statistics[mesh.name] = {
                   numberOfTriangles : meshNumberOfTriangles,
                   primitives : primitivesStatistics
                };
                assetNumberOfTriangles += meshNumberOfTriangles;
            }
        }

        statistics.numberOfTriangles = assetNumberOfTriangles;

        return statistics;
    }

    function getSceneStatistics(gltf, meshStatistics) {
        var scenes = gltf.scenes;
        var nodes = gltf.nodes;

        if (!defined(scenes) || !defined(nodes)) {
            return undefined;
        }

        // TODO: skin stats
        var numberOfNodes = 0;
        var numberOfMeshNodes = 0;
        var numberOfCameraNodes = 0;
        var numberOfLightNodes = 0;
        var numberOfTransformNodes = 0;

        var numberOfMeshes = 0;     // instanced.  The same mesh may be referenced by several nodes.
        var numberOfPrimitives = 0; // instanced.  Basically number of draw calls.
        var numberOfTriangles = 0;  // instanced.  Total triangles rendered.  Total in meshes will be less than or equal to.

        var stack = [];
        var scene = scenes[gltf.scene];
        var sceneNodes = scene.nodes;
        var length = sceneNodes.length;

        for (var i = 0; i < length; ++i) {
            stack.push(nodes[sceneNodes[i]]);

            while (stack.length > 0) {
                var n = stack.pop();
                ++numberOfNodes;

                var meshes = n.meshes;

                if (defined(meshes)) {
                    ++numberOfMeshNodes;

                    var meshesLength = meshes.length;
                    numberOfMeshes += meshesLength;

                    for (var k = 0; k < meshesLength; ++k) {
                        var mesh = gltf.meshes[meshes[k]];
                        numberOfPrimitives += mesh.primitives.length;
                        numberOfTriangles += meshStatistics[mesh.name].numberOfTriangles;
                    }
                } else if (defined(n.camerea)) {
                    ++numberOfCameraNodes;
                } else if (defined(n.light)) {
                    ++numberOfLightNodes;
                } else {
                    ++numberOfTransformNodes;
                }

                var children = n.children;
                var childrenLength = children.length;
                for (var j = 0; j < childrenLength; ++j) {
                    stack.push(nodes[children[j]]);
                }
            }
        }

        return {
            numberOfNodes : numberOfNodes,
            numberOfMeshNodes : numberOfMeshNodes,
            numberOfCameraNodes : numberOfCameraNodes,
            numberOfLightNodes : numberOfLightNodes,
            numberOfTransformNodes : numberOfTransformNodes,

            numberOfMeshes : numberOfMeshes,
            numberOfPrimitives : numberOfPrimitives,
            numberOfTriangles : numberOfTriangles
        };
    }

    function getAnimationStatistics(gltf) {
        var animations = gltf.animations;

        if (!defined(animations)) {
            return undefined;
        }

        var numberOfTargetNodes = 0;
        var targets = {};

        for (var name in animations) {
            if (animations.hasOwnProperty(name)) {
                var animation = animations[name];
                var channels = animation.channels;

                var length = channels.length;
                for (var i = 0; i < length; ++i) {
                    var nodeTarget = channels[i].target.id;

                    if (!defined(targets[nodeTarget])) {
                        targets[nodeTarget] = true;
                        ++numberOfTargetNodes;
                    }
                }
            }
        }

        return {
            numberOfTargetNodes : numberOfTargetNodes
        };
    }

    /**
     * DOC_TBA
     */
    var gltfStatistics = function(gltf) {
        if (!defined(gltf)) {
            return undefined;
        }

        var meshStatistics = getMeshStatistics(gltf);

        return {
            numberOfPrograms : getNumberOf(gltf.programs),
            numberOfTextures : getNumberOf(gltf.textures),
            numberOfTechniques : getNumberOf(gltf.techniques),
            numberOfMaterials : getNumberOf(gltf.materials),
            numberOfNodes : getNumberOf(gltf.nodes),
            numberOfTotalPrimitives : getNumberOfPrimitives(gltf.meshes),
            numberOfAnimations : getNumberOf(gltf.animations),

            meshStatistics : meshStatistics,
            sceneStatistics : getSceneStatistics(gltf, meshStatistics),
            animationStatistics : getAnimationStatistics(gltf)
        };
    };

    return gltfStatistics;
});