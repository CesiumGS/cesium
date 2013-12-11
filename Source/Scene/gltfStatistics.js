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
            return 0;
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
                        numberOfTriangles : primitiveNumberOfTriangles,
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

    /**
     * DOC_TBA
     */
    var gltfStatistics = function(gltf) {
        if (!defined(gltf)) {
            return undefined;
        }

        return {
            numberOfPrograms : getNumberOf(gltf.programs),
            numberOfTextures : getNumberOf(gltf.textures),
            numberOfTechniques : getNumberOf(gltf.techniques),
            numberOfMaterials : getNumberOf(gltf.materials),
            numberOfNodes : getNumberOf(gltf.nodes),
            numberOfTotalPrimitives : getNumberOfPrimitives(gltf.meshes),
            numberOfAnimations : getNumberOf(gltf.animations),

            meshStatistics : getMeshStatistics(gltf)
        };
    };

    return gltfStatistics;
});