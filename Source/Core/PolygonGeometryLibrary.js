/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './defined',
        './Ellipsoid'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        Ellipsoid) {
    "use strict";

    /**
     * @private
     */
    var PolygonGeometryLibrary = {};

    PolygonGeometryLibrary.computeHierarchyPackedLength = function(polygonHierarchy) {
        var numComponents = 0;
        var stack = [polygonHierarchy];
        while (stack.length > 0) {
            var hierarchy = stack.pop();
            if (!defined(hierarchy)) {
                continue;
            }

            numComponents += 2;

            var positions = hierarchy.positions;
            var holes = hierarchy.holes;

            if (defined(positions)) {
                numComponents += positions.length * Cartesian3.packedLength;
            }

            if (defined(holes)) {
                var length = holes.length;
                for (var i = 0; i < length; ++i) {
                    stack.push(holes[i]);
                }
            }
        }

        return numComponents;
    };

    PolygonGeometryLibrary.packPolygonHierarchy = function(polygonHierarchy, array, startingIndex) {
        var stack = [polygonHierarchy];
        while (stack.length > 0) {
            var hierarchy = stack.pop();
            if (!defined(hierarchy)) {
                continue;
            }

            var positions = hierarchy.positions;
            var holes = hierarchy.holes;

            array[startingIndex++] = defined(positions) ? positions.length : 0;
            array[startingIndex++] = defined(holes) ? holes.length : 0;

            if (defined(positions)) {
                var positionsLength = positions.length;
                for (var i = 0; i < positionsLength; ++i, startingIndex += 3) {
                    Cartesian3.pack(positions[i], array, startingIndex);
                }
            }

            if (defined(holes)) {
                var holesLength = holes.length;
                for (var j = 0; j < holesLength; ++j) {
                    stack.push(holes[j]);
                }
            }
        }

        return startingIndex;
    };

    PolygonGeometryLibrary.unpackPolygonHierarchy = function(array, startingIndex) {
        var positionsLength = array[startingIndex++];
        var holesLength = array[startingIndex++];

        var positions = new Array(positionsLength);
        var holes = holesLength > 0 ? new Array(holesLength) : undefined;

        for (var i = 0; i < positionsLength; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        for (var j = 0; j < holesLength; ++j) {
            holes[j] = PolygonGeometryLibrary.unpackPolygonHierarchy(array, startingIndex);
            startingIndex = holes[j].startingIndex;
            delete holes[j].startingIndex;
        }

        return {
            positions : positions,
            holes : holes,
            startingIndex : startingIndex
        };
    };

    var distanceScratch = new Cartesian3();
    function getPointAtDistance(p0, p1, distance, length) {
        Cartesian3.subtract(p1, p0, distanceScratch);
        Cartesian3.multiplyByScalar(distanceScratch, distance / length, distanceScratch);
        Cartesian3.add(p0, distanceScratch, distanceScratch);
        return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
    }

    /**
     * @private
     */
    PolygonGeometryLibrary.subdivideLineCount = function(p0, p1, minDistance) {
        var distance = Cartesian3.distance(p0, p1);
        var n = distance / minDistance;
        var countDivide = Math.max(0, Math.ceil(Math.log(n) / Math.log(2)));
        return Math.pow(2, countDivide);
    };

    /**
     * @private
     */
    PolygonGeometryLibrary.subdivideLine = function(p0, p1, minDistance, result) {
        var numVertices = PolygonGeometryLibrary.subdivideLineCount(p0, p1, minDistance);
        var length = Cartesian3.distance(p0, p1);
        var distanceBetweenVertices = length / numVertices;

        if (!defined(result)) {
            result = [];
        }

        var positions = result;
        positions.length = numVertices * 3;

        var index = 0;
        for ( var i = 0; i < numVertices; i++) {
            var p = getPointAtDistance(p0, p1, i * distanceBetweenVertices, length);
            positions[index++] = p[0];
            positions[index++] = p[1];
            positions[index++] = p[2];
        }

        return positions;
    };

    var scaleToGeodeticHeightN1 = new Cartesian3();
    var scaleToGeodeticHeightN2 = new Cartesian3();
    var scaleToGeodeticHeightP1 = new Cartesian3();
    var scaleToGeodeticHeightP2 = new Cartesian3();
    /**
     * @private
     */
    PolygonGeometryLibrary.scaleToGeodeticHeightExtruded = function(geometry, maxHeight, minHeight, ellipsoid, perPositionHeight) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var n1 = scaleToGeodeticHeightN1;
        var n2 = scaleToGeodeticHeightN2;
        var p = scaleToGeodeticHeightP1;
        var p2 = scaleToGeodeticHeightP2;

        if (defined(geometry) && defined(geometry.attributes) && defined(geometry.attributes.position)) {
            var positions = geometry.attributes.position.values;
            var length = positions.length / 2;

            for ( var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(positions, i, p);

                ellipsoid.geodeticSurfaceNormal(p, n1);
                p2 = ellipsoid.scaleToGeodeticSurface(p, p2);
                n2 = Cartesian3.multiplyByScalar(n1, minHeight, n2);
                n2 = Cartesian3.add(p2, n2, n2);
                positions[i + length] = n2.x;
                positions[i + 1 + length] = n2.y;
                positions[i + 2 + length] = n2.z;

                if (perPositionHeight) {
                    p2 = Cartesian3.clone(p, p2);
                }
                n2 = Cartesian3.multiplyByScalar(n1, maxHeight, n2);
                n2 = Cartesian3.add(p2, n2, n2);
                positions[i] = n2.x;
                positions[i + 1] = n2.y;
                positions[i + 2] = n2.z;
            }
        }
        return geometry;
    };

    return PolygonGeometryLibrary;
});