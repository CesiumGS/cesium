/*global define*/
define([
        './arrayRemoveDuplicates',
        './Cartesian3',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './PolygonPipeline',
        './PrimitiveType',
        './Queue',
        './WindingOrder'
    ], function(
        arrayRemoveDuplicates,
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        PolygonPipeline,
        PrimitiveType,
        Queue,
        WindingOrder) {
    'use strict';

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

    PolygonGeometryLibrary.subdivideLineCount = function(p0, p1, minDistance) {
        var distance = Cartesian3.distance(p0, p1);
        var n = distance / minDistance;
        var countDivide = Math.max(0, Math.ceil(Math.log(n) / Math.log(2)));
        return Math.pow(2, countDivide);
    };

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

    PolygonGeometryLibrary.polygonsFromHierarchy = function(polygonHierarchy, perPositionHeight, tangentPlane, ellipsoid) {
        // create from a polygon hierarchy
        // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
        var hierarchy = [];
        var polygons = [];

        var queue = new Queue();
        queue.enqueue(polygonHierarchy);

        while (queue.length !== 0) {
            var outerNode = queue.dequeue();
            var outerRing = outerNode.positions;
            var holes = outerNode.holes;

            outerRing = arrayRemoveDuplicates(outerRing, Cartesian3.equalsEpsilon, true);
            if (outerRing.length < 3) {
                continue;
            }

            var positions2D = tangentPlane.projectPointsOntoPlane(outerRing);
            var holeIndices = [];

            var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
            if (originalWindingOrder === WindingOrder.CLOCKWISE) {
                positions2D.reverse();
                outerRing = outerRing.slice().reverse();
            }

            var positions = outerRing.slice();
            var numChildren = defined(holes) ? holes.length : 0;
            var polygonHoles = [];
            var i;
            var j;

            for (i = 0; i < numChildren; i++) {
                var hole = holes[i];
                var holePositions = arrayRemoveDuplicates(hole.positions, Cartesian3.equalsEpsilon, true);
                if (holePositions.length < 3) {
                    continue;
                }

                var holePositions2D = tangentPlane.projectPointsOntoPlane(holePositions);

                originalWindingOrder = PolygonPipeline.computeWindingOrder2D(holePositions2D);
                if (originalWindingOrder === WindingOrder.CLOCKWISE) {
                    holePositions2D.reverse();
                    holePositions = holePositions.slice().reverse();
                }

                polygonHoles.push(holePositions);
                holeIndices.push(positions.length);
                positions = positions.concat(holePositions);
                positions2D = positions2D.concat(holePositions2D);

                var numGrandchildren = 0;
                if (defined(hole.holes)) {
                    numGrandchildren = hole.holes.length;
                }

                for (j = 0; j < numGrandchildren; j++) {
                    queue.enqueue(hole.holes[j]);
                }
            }

            if (!perPositionHeight) {
                for (i = 0; i < outerRing.length; i++) {
                    ellipsoid.scaleToGeodeticSurface(outerRing[i], outerRing[i]);
                }
                for (i = 0; i < polygonHoles.length; i++) {
                    var polygonHole = polygonHoles[i];
                    for (j = 0; j < polygonHole.length; ++j) {
                        ellipsoid.scaleToGeodeticSurface(polygonHole[j], polygonHole[j]);
                    }
                }
            }

            hierarchy.push({
                outerRing : outerRing,
                holes : polygonHoles
            });
            polygons.push({
                positions : positions,
                positions2D : positions2D,
                holes : holeIndices
            });
        }

        return {
            hierarchy : hierarchy,
            polygons : polygons
        };
    };

    PolygonGeometryLibrary.createGeometryFromPositions = function(ellipsoid, polygon, granularity, perPositionHeight, vertexFormat) {
        var indices = PolygonPipeline.triangulate(polygon.positions2D, polygon.holes);

        /* If polygon is completely unrenderable, just use the first three vertices */
        if (indices.length < 3) {
            indices = [0, 1, 2];
        }

        var positions = polygon.positions;

        if (perPositionHeight) {
            var length = positions.length;
            var flattenedPositions = new Array(length * 3);
            var index = 0;
            for ( var i = 0; i < length; i++) {
                var p = positions[i];
                flattenedPositions[index++] = p.x;
                flattenedPositions[index++] = p.y;
                flattenedPositions[index++] = p.z;
            }
            var geometry = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : flattenedPositions
                    })
                },
                indices : indices,
                primitiveType : PrimitiveType.TRIANGLES
            });

            if (vertexFormat.normal) {
                return GeometryPipeline.computeNormal(geometry);
            }

            return geometry;
        }

        return PolygonPipeline.computeSubdivision(ellipsoid, positions, indices, granularity);
    };

    var computeWallIndicesSubdivided = [];
    var p1Scratch = new Cartesian3();
    var p2Scratch = new Cartesian3();

    PolygonGeometryLibrary.computeWallGeometry = function(positions, ellipsoid, granularity, perPositionHeight) {
        var edgePositions;
        var topEdgeLength;
        var i;
        var p1;
        var p2;

        var length = positions.length;
        var index = 0;

        if (!perPositionHeight) {
            var minDistance = CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);

            var numVertices = 0;
            for (i = 0; i < length; i++) {
                numVertices += PolygonGeometryLibrary.subdivideLineCount(positions[i], positions[(i + 1) % length], minDistance);
            }

            topEdgeLength = (numVertices + length) * 3;
            edgePositions = new Array(topEdgeLength * 2);
            for (i = 0; i < length; i++) {
                p1 = positions[i];
                p2 = positions[(i + 1) % length];

                var tempPositions = PolygonGeometryLibrary.subdivideLine(p1, p2, minDistance, computeWallIndicesSubdivided);
                var tempPositionsLength = tempPositions.length;
                for (var j = 0; j < tempPositionsLength; ++j, ++index) {
                    edgePositions[index] = tempPositions[j];
                    edgePositions[index + topEdgeLength] = tempPositions[j];
                }

                edgePositions[index] = p2.x;
                edgePositions[index + topEdgeLength] = p2.x;
                ++index;

                edgePositions[index] = p2.y;
                edgePositions[index + topEdgeLength] = p2.y;
                ++index;

                edgePositions[index] = p2.z;
                edgePositions[index + topEdgeLength] = p2.z;
                ++index;
            }
        } else {
            topEdgeLength = length * 3 * 2;
            edgePositions = new Array(topEdgeLength * 2);
            for (i = 0; i < length; i++) {
                p1 = positions[i];
                p2 = positions[(i + 1) % length];
                edgePositions[index] = edgePositions[index + topEdgeLength] = p1.x;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p1.y;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p1.z;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p2.x;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p2.y;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p2.z;
                ++index;
            }
        }

        length = edgePositions.length;
        var indices = IndexDatatype.createTypedArray(length / 3, length - positions.length * 6);
        var edgeIndex = 0;
        length /= 6;

        for (i = 0; i < length; i++) {
            var UL = i;
            var UR = UL + 1;
            var LL = UL + length;
            var LR = LL + 1;

            p1 = Cartesian3.fromArray(edgePositions, UL * 3, p1Scratch);
            p2 = Cartesian3.fromArray(edgePositions, UR * 3, p2Scratch);
            if (Cartesian3.equalsEpsilon(p1, p2, CesiumMath.EPSILON14)) {
                continue;
            }

            indices[edgeIndex++] = UL;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = LR;
        }

        return new Geometry({
            attributes : new GeometryAttributes({
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : edgePositions
                })
            }),
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES
        });
    };

    return PolygonGeometryLibrary;
});
