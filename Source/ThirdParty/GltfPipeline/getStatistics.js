/*global define*/
define([
        './ForEach',
        '../../Core/defined',
        '../../Core/DeveloperError'
    ], function(
        ForEach,
        defined,
        DeveloperError) {
    'use strict';

    /**
     * Contains statistics for a glTF asset.
     *
     * @property {Number} buffersSizeInBytes The total size of all the buffers.
     * @property {Number} numberOfImages The number of images in the asset.
     * @property {Number} numberOfExternalRequests The number of external requests required to fetch the asset data.
     * @property {Number} numberOfDrawCalls The number of draw calls required to render the asset.
     * @property {Number} numberOfRenderedPrimitives The total number of rendered primitives in the asset (e.g. triangles).
     * @property {Number} numberOfNodes The total number of nodes in the asset.
     * @property {Number} numberOfMeshes The total number of meshes in the asset.
     * @property {Number} numberOfMaterials The total number of materials in the asset.
     * @property {Number} numberOfAnimations The total number of animations in the asset.
     *
     * @constructor
     *
     * @see getStatistics
     * @see printStatistics
     */
    function Statistics() {
        this.buffersSizeInBytes = 0;
        this.numberOfImages = 0;
        this.numberOfExternalRequests = 0;
        this.numberOfDrawCalls = 0;
        this.numberOfRenderedPrimitives = 0;
        this.numberOfNodes = 0;
        this.numberOfMeshes = 0;
        this.numberOfMaterials = 0;
        this.numberOfAnimations = 0;
    }

    /**
     * Creates a string listing the statistics along with their descriptions.
     *
     * @returns {String} A string describing the statistics for the glTF asset.
     */
    Statistics.prototype.toString = function() {
        return 'Total size of all buffers: ' + this.buffersSizeInBytes + ' bytes' +
            '\nImages: ' + this.numberOfImages +
            '\nDraw calls: ' + this.numberOfDrawCalls +
            '\nRendered primitives (e.g., triangles): ' + this.numberOfRenderedPrimitives +
            '\nNodes: ' + this.numberOfNodes +
            '\nMeshes: ' + this.numberOfMeshes +
            '\nMaterials: ' + this.numberOfMaterials +
            '\nAnimations: ' + this.numberOfAnimations +
            '\nExternal requests (not data uris): ' + this.numberOfExternalRequests;
    };

    function isDataUri(uri) {
        // Return false if the uri is undefined
        if (!defined(uri)) {
            return false;
        }

        // Return true if the uri is a data uri
        return /^data\:/i.test(uri);
    }

    function getAllPrimitives(gltf) {
        var primitives = [];
        ForEach.mesh(gltf, function(mesh) {
           ForEach.meshPrimitives(mesh, function(primitive) {
               primitives.push(primitive);
           });
        });
        return primitives;
    }

    function getBuffersSize(gltf) {
        var size = 0;
        ForEach.buffer(gltf, function(buffer) {
            size += buffer.byteLength;
        });
        return size;
    }

    function getNumberOfExternalProperties(property) {
        var count = 0;
        ForEach.arrayOfObjects(property, function(object) {
            var uri = object.uri;
            if (defined(uri) && !isDataUri(uri)) {
                count++;
            }
        });
        return count;
    }

    function getNumberOfExternalRequests(gltf) {
        var count = 0;

        count += getNumberOfExternalProperties(gltf.buffers);
        count += getNumberOfExternalProperties(gltf.images);
        count += getNumberOfExternalProperties(gltf.shaders);

        return count;
    }

    function getNumberOfRenderedPrimitives(gltf, primitives) {
        var numberOfRenderedPrimitives = 0;

        var primitivesLength = primitives.length;
        for (var m = 0; m < primitivesLength; ++m) {
            var primitive = primitives[m];
            var indices = primitive.indices;
            var indicesCount = gltf.accessors[indices].count;

            switch(primitive.mode) {
                case 0: // POINTS
                    numberOfRenderedPrimitives += indicesCount;
                    break;
                case 1: // LINES
                    numberOfRenderedPrimitives += (indicesCount / 2);
                    break;
                case 2: // LINE_LOOP
                    numberOfRenderedPrimitives += indicesCount;
                    break;
                case 3: // LINE_STRIP
                    numberOfRenderedPrimitives += Math.max(indicesCount - 1, 0);
                    break;
                case 4: // TRIANGLES
                    numberOfRenderedPrimitives += (indicesCount / 3);
                    break;
                case 5: // TRIANGLE_STRIP
                case 6: // TRIANGLE_FAN
                    numberOfRenderedPrimitives += Math.max(indicesCount - 2, 0);
                    break;
            }
        }

        return numberOfRenderedPrimitives;
    }

    function getDrawCallStatisticsForNode(gltf, nodeId) {
        var numberOfDrawCalls = 0;
        var numberOfRenderedPrimitives = 0;

        var meshes = gltf.meshes;

        ForEach.nodeInTree(gltf, [nodeId], function(node) {
            var meshId = node.mesh;
            var mesh = meshes[meshId];
            if (defined(mesh)) {
                var primitives = mesh.primitives;
                if (defined(primitives)) {
                    numberOfDrawCalls += primitives.length;
                    numberOfRenderedPrimitives += getNumberOfRenderedPrimitives(gltf, primitives);
                }
            }
        });

        return {
            numberOfDrawCalls : numberOfDrawCalls,
            numberOfRenderedPrimitives : numberOfRenderedPrimitives
        };
    }

    function getDrawCallStatistics(gltf) {
        var numberOfDrawCalls = 0;
        var numberOfRenderedPrimitives = 0;

        var primitives = getAllPrimitives(gltf);

        numberOfDrawCalls += primitives.length;
        numberOfRenderedPrimitives += getNumberOfRenderedPrimitives(gltf, primitives);

        return {
            numberOfDrawCalls : numberOfDrawCalls,
            numberOfRenderedPrimitives : numberOfRenderedPrimitives
        };
    }

    /**
     * Returns an object containing the statistics for the glTF asset.
     *
     * @param {Object} gltf A javascript object containing a glTF asset with extras and defaults.
     * @param {Object} [nodeId] If defined, statistics will only process number of draw calls and rendered primitives for the specified node.
     * @returns {Statistics} Object containing the statistics of the glTF asset.
     *
     * @see Statistics
     */
    function getStatistics(gltf, nodeId) {
        if (!defined(gltf)) {
            throw new DeveloperError('gltf must be defined');
        }

        var statistics = new Statistics();

        if (defined(nodeId)) {   // Only do draw call statistics
            var drawStatsNode = getDrawCallStatisticsForNode(gltf, nodeId);

            statistics.numberOfDrawCalls = drawStatsNode.numberOfDrawCalls;
            statistics.numberOfRenderedPrimitives = drawStatsNode.numberOfRenderedPrimitives;

            return statistics;
        }

        var drawStats = getDrawCallStatistics(gltf);

        statistics.buffersSizeInBytes = getBuffersSize(gltf);
        statistics.numberOfImages = gltf.images.length;
        statistics.numberOfExternalRequests = getNumberOfExternalRequests(gltf);
        statistics.numberOfDrawCalls = drawStats.numberOfDrawCalls;
        statistics.numberOfRenderedPrimitives = drawStats.numberOfRenderedPrimitives;
        statistics.numberOfNodes = gltf.nodes.length;
        statistics.numberOfMeshes = gltf.meshes.length;
        statistics.numberOfMaterials = gltf.materials.length;
        statistics.numberOfAnimations = gltf.animations.length;

        return statistics;
    }

    return getStatistics;
});
