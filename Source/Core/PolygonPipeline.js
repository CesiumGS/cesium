/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian2',
        './Cartesian3',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './defaultValue',
        './pointInsideTriangle2D',
        './ComponentDatatype',
        './PrimitiveType',
        './Queue',
        './WindingOrder'
    ], function(
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        EllipsoidTangentPlane,
        defaultValue,
        pointInsideTriangle2D,
        ComponentDatatype,
        PrimitiveType,
        Queue,
        WindingOrder) {
    "use strict";

    function DoublyLinkedList() {
        this.head = undefined;
        this.tail = undefined;
        this.length = 0;
    }

    DoublyLinkedList.prototype.add = function(item) {
        if (typeof item !== 'undefined') {
            var node = {
                item : item,
                previous : this.tail,
                next : undefined
            };

            if (typeof this.tail !== 'undefined') {
                this.tail.next = node;
                this.tail = node;
            } else {
                // Insert into empty list.
                this.head = node;
                this.tail = node;
            }

            ++this.length;
        }
    };

    DoublyLinkedList.prototype.remove = function(item) {
        if (typeof item !== 'undefined') {
            if (typeof item.previous !== 'undefined' && typeof item.next  !== 'undefined') {
                item.previous.next = item.next;
                item.next.previous = item.previous;
            } else if (typeof item.previous  !== 'undefined') {
                // Remove last node.
                item.previous.next = undefined;
                this.tail = item.previous;
            } else if (typeof item.next !== 'undefined') {
                // Remove first node.
                item.next.previous = undefined;
                this.head = item.next;
            } else {
                // Remove last node in linked list.
                this.head = undefined;
                this.tail = undefined;
            }

            --this.length;
        }
    };

    function isTipConvex(p0, p1, p2) {
        var u = p1.subtract(p0);
        var v = p2.subtract(p1);

        // Use the sign of the z component of the cross product
        return ((u.x * v.y) - (u.y * v.x)) >= 0.0;
    }

    /**
     * Returns the index of the vertex with the maximum X value.
     *
     * @param {Array} positions An array of the Cartesian points defining the polygon's vertices.
     * @returns {Number} The index of the positions with the maximum X value.
     *
     * @private
     */
    function getRightmostPositionIndex(positions) {
        var maximumX = positions[0].x;
        var rightmostPositionIndex = 0;
        for ( var i = 0; i < positions.length; i++) {
            if (positions[i].x > maximumX) {
                maximumX = positions[i].x;
                rightmostPositionIndex = i;
            }
        }
        return rightmostPositionIndex;
    }

    /**
     * Returns the index of the ring that contains the rightmost vertex.
     *
     * @param {Array} rings An array of arrays of Cartesians. Each array contains the vertices defining a polygon.
     * @returns {Number} The index of the ring containing the rightmost vertex.
     *
     * @private
     */
    function getRightmostRingIndex(rings) {
        var rightmostX = rings[0][0].x;
        var rightmostRingIndex = 0;
        for ( var ring = 0; ring < rings.length; ring++) {
            var maximumX = rings[ring][getRightmostPositionIndex(rings[ring])].x;
            if (maximumX > rightmostX) {
                rightmostX = maximumX;
                rightmostRingIndex = ring;
            }
        }

        return rightmostRingIndex;
    }

    /**
     * Returns a list containing the reflex vertices for a given polygon.
     *
     * @param {Array} polygon An array of Cartesian elements defining the polygon.
     * @returns {Array}
     *
     * @private
     */
    function getReflexVertices(polygon) {
        var reflexVertices = [];
        for ( var i = 0; i < polygon.length; i++) {
            var p0 = polygon[((i - 1) + polygon.length) % polygon.length];
            var p1 = polygon[i];
            var p2 = polygon[(i + 1) % polygon.length];

            if (!isTipConvex(p0, p1, p2)) {
                reflexVertices.push(p1);
            }
        }
        return reflexVertices;
    }

    /**
     * Returns true if the given point is contained in the list of positions.
     *
     * @param {Array} positions A list of Cartesian elements defining a polygon.
     * @param {Cartesian} point The point to check.
     * @returns {Boolean} <code>true></code> if <code>point</code> is found in <code>polygon</code>, <code>false</code> otherwise.
     *
     * @private
     */
    function isVertex(positions, point) {
        for ( var i = 0; i < positions.length; i++) {
            if (point.equals(positions[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Given a point inside a polygon, find the nearest point directly to the right that lies on one of the polygon's edges.
     *
     * @param {Cartesian} point A point inside the polygon defined by <code>ring</code>.
     * @param {Array} ring A list of Cartesian points defining a polygon.
     * @param {Array} [edgeIndices]  An array containing the indices two endpoints of the edge containing the intersection.
     *
     * @returns {Cartesian} The intersection point.
     * @private
     */
    function intersectPointWithRing(point, ring, edgeIndices) {
        edgeIndices = defaultValue(edgeIndices, []);

        var minDistance = Number.MAX_VALUE;
        var rightmostVertexIndex = getRightmostPositionIndex(ring);
        var intersection = new Cartesian3(ring[rightmostVertexIndex].x, point.y, 0.0);
        edgeIndices.push(rightmostVertexIndex);
        edgeIndices.push((rightmostVertexIndex + 1) % ring.length);

        var boundaryMinX = ring[0].x;
        var boundaryMaxX = boundaryMinX;
        for ( var i = 1; i < ring.length; ++i) {
            if (ring[i].x < boundaryMinX) {
                boundaryMinX = ring[i].x;
            } else if (ring[i].x > boundaryMaxX) {
                boundaryMaxX = ring[i].x;
            }
        }
        boundaryMaxX += (boundaryMaxX - boundaryMinX);
        var point2 = new Cartesian3(boundaryMaxX, point.y, 0.0);

        // Find the nearest intersection.
        for (i = 0; i < ring.length; i++) {
            var v1 = ring[i];
            var v2 = ring[(i + 1) % ring.length];

            if (((v1.x >= point.x) || (v2.x >= point.x)) && (((v1.y >= point.y) && (v2.y <= point.y)) || ((v1.y <= point.y) && (v2.y >= point.y)))) {
                var temp = ((v2.y - v1.y) * (point2.x - point.x)) - ((v2.x - v1.x) * (point2.y - point.y));
                if (temp !== 0.0) {
                    temp = 1.0 / temp;
                    var ua = (((v2.x - v1.x) * (point.y - v1.y)) - ((v2.y - v1.y) * (point.x - v1.x))) * temp;
                    var ub = (((point2.x - point.x) * (point.y - v1.y)) - ((point2.y - point.y) * (point.x - v1.x))) * temp;
                    if ((ua >= 0.0) && (ua <= 1.0) && (ub >= 0.0) && (ub <= 1.0)) {
                        var tempIntersection = new Cartesian2(point.x + ua * (point2.x - point.x), point.y + ua * (point2.y - point.y));
                        var dist = tempIntersection.subtract(point);
                        temp = dist.magnitudeSquared();
                        if (temp < minDistance) {
                            intersection = tempIntersection;
                            minDistance = temp;
                            edgeIndices[0] = i;
                            edgeIndices[1] = (i + 1) % ring.length;
                        }
                    }
                }
            }
        }

        return intersection;
    }

    /**
     * Given an outer ring and multiple inner rings, determine the point on the outer ring that is visible
     * to the rightmost vertex of the rightmost inner ring.
     *
     * @param {Array} outerRing An array of Cartesian points defining the outer boundary of the polygon.
     * @param {Array} innerRings An array of arrays of Cartesian points, where each array represents a hole in the polygon.
     * @returns {Number} The index of the vertex in <code>outerRing</code> that is mutually visible to the rightmost vertex in <code>inenrRing</code>.
     *
     * @private
     */
    function getMutuallyVisibleVertexIndex(outerRing, innerRings) {
        var innerRingIndex = getRightmostRingIndex(innerRings);
        var innerRing = innerRings[innerRingIndex];
        var innerRingVertexIndex = getRightmostPositionIndex(innerRing);
        var innerRingVertex = innerRing[innerRingVertexIndex];
        var edgeIndices = [];
        var intersection = intersectPointWithRing(innerRingVertex, outerRing, edgeIndices);

        var visibleVertex;
        if (isVertex(outerRing, intersection)) {
            visibleVertex = intersection;
        } else {
            // Set P to be the edge endpoint closest to the inner ring vertex
            var d1 = (outerRing[edgeIndices[0]].subtract(innerRingVertex)).magnitudeSquared();
            var d2 = (outerRing[edgeIndices[1]].subtract(innerRingVertex)).magnitudeSquared();
            var p = (d1 < d2) ? outerRing[edgeIndices[0]] : outerRing[edgeIndices[1]];

            var reflexVertices = getReflexVertices(outerRing);
            var reflexIndex = reflexVertices.indexOf(p);
            if (reflexIndex !== -1) {
                reflexVertices.splice(reflexIndex, 1); // Do not include p if it happens to be reflex.
            }

            var pointsInside = [];
            for ( var i = 0; i < reflexVertices.length; i++) {
                var vertex = reflexVertices[i];
                if (pointInsideTriangle2D(vertex, innerRingVertex, intersection, p)) {
                    pointsInside.push(vertex);
                }
            }

            // If all reflexive vertices are outside the triangle formed by points
            // innerRingVertex, intersection and P, then P is the visible vertex.
            // Otherwise, return the reflex vertex that minimizes the angle between <1,0> and <k, reflex>.
            var minAngle = Number.MAX_VALUE;
            if (pointsInside.length > 0) {
                var v1 = new Cartesian2(1.0, 0.0, 0.0);
                for (i = 0; i < pointsInside.length; i++) {
                    var v2 = pointsInside[i].subtract(innerRingVertex);
                    var denominator = v1.magnitude() * v2.magnitude();
                    if (denominator !== 0) {
                        var angle = Math.abs(Math.acos(v1.dot(v2) / denominator));
                        if (angle < minAngle) {
                            minAngle = angle;
                            p = pointsInside[i];
                        }
                    }
                }
            }
            visibleVertex = p;
        }

        return outerRing.indexOf(visibleVertex);
    }

    /**
     * Given a polygon defined by an outer ring with one or more inner rings (holes), return a single list of points representing
     * a polygon with the rightmost hole added to it. The added hole is removed from <code>innerRings</code>.
     *
     * @param {Array} outerRing An array of Cartesian points defining the outer boundary of the polygon.
     * @param {Array} innerRings An array of arrays of Cartesian points, where each array represents a hole in the polygon.
     *
     * @return A single list of Cartesian points defining the polygon, including the eliminated inner ring.
     *
     * @private
     */
    function eliminateHole(outerRing, innerRings, ellipsoid) {
        // Check that the holes are defined in the winding order opposite that of the outer ring.
        var windingOrder = PolygonPipeline.computeWindingOrder2D(outerRing);
        for ( var i = 0; i < innerRings.length; i++) {
            var ring = innerRings[i];

            // Ensure each hole's first and last points are the same.
            if (!(ring[0]).equals(ring[ring.length - 1])) {
                ring.push(ring[0]);
            }

            var innerWindingOrder = PolygonPipeline.computeWindingOrder2D(ring);
            if (innerWindingOrder === windingOrder) {
                ring.reverse();
            }
        }

        // Project points onto a tangent plane to find the mutually visible vertex.
        var tangentPlane = EllipsoidTangentPlane.fromPoints(outerRing, ellipsoid);
        var tangentOuterRing = tangentPlane.projectPointsOntoPlane(outerRing);
        var tangentInnerRings = [];
        for (i = 0; i < innerRings.length; i++) {
            tangentInnerRings.push(tangentPlane.projectPointsOntoPlane(innerRings[i]));
        }

        var visibleVertexIndex = getMutuallyVisibleVertexIndex(tangentOuterRing, tangentInnerRings);
        var innerRingIndex = getRightmostRingIndex(tangentInnerRings);
        var innerRingVertexIndex = getRightmostPositionIndex(tangentInnerRings[innerRingIndex]);

        var innerRing = innerRings[innerRingIndex];
        var newPolygonVertices = [];

        for (i = 0; i < outerRing.length; i++) {
            newPolygonVertices.push(outerRing[i]);
        }

        var j;
        var holeVerticesToAdd = [];

        // If the rightmost inner vertex is not the starting and ending point of the ring,
        // then some other point is duplicated in the inner ring and should be skipped once.
        if (innerRingVertexIndex !== 0) {
            for (j = 0; j <= innerRing.length; j++) {
                var index = (j + innerRingVertexIndex) % innerRing.length;
                if (index !== 0) {
                    holeVerticesToAdd.push(innerRing[index]);
                }
            }
        } else {
            for (j = 0; j < innerRing.length; j++) {
                holeVerticesToAdd.push(innerRing[(j + innerRingVertexIndex) % innerRing.length]);
            }
        }

        var lastVisibleVertexIndex = newPolygonVertices.lastIndexOf(outerRing[visibleVertexIndex]);

        holeVerticesToAdd.push(outerRing[lastVisibleVertexIndex]);

        var front = newPolygonVertices.slice(0, lastVisibleVertexIndex + 1);
        var back = newPolygonVertices.slice(lastVisibleVertexIndex + 1);
        newPolygonVertices = front.concat(holeVerticesToAdd, back);

        innerRings.splice(innerRingIndex, 1);

        return newPolygonVertices;
    }

    var scaleToGeodeticHeightN = new Cartesian3();
    var scaleToGeodeticHeightP = new Cartesian3();

    /**
     * DOC_TBA
     *
     * @exports PolygonPipeline
     */
    var PolygonPipeline = {
        /**
         * DOC_TBA
         *
         * Cleans up a simple polygon by removing duplicate adjacent positions and making
         * the first position not equal the last position.
         *
         * @exception {DeveloperError} positions is required.
         * @exception {DeveloperError} At least three positions are required.
         */
        cleanUp : function(positions) {
            if (typeof positions  === 'undefined') {
                throw new DeveloperError('positions is required.');
            }

            var length = positions.length;
            if (length < 3) {
                throw new DeveloperError('At least three positions are required.');
            }

            var cleanedPositions = [];

            for ( var i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
                var v0 = positions[i0];
                var v1 = positions[i1];

                if (!v0.equals(v1)) {
                    cleanedPositions.push(v1); // Shallow copy!
                }
            }

            return cleanedPositions;
        },

        /**
         * DOC_TBA
         *
         * @exception {DeveloperError} positions is required.
         * @exception {DeveloperError} At least three positions are required.
         */
        computeArea2D : function(positions) {
            if (typeof positions  === 'undefined') {
                throw new DeveloperError('positions is required.');
            }

            var length = positions.length;
            if (length < 3) {
                throw new DeveloperError('At least three positions are required.');
            }

            var area = 0.0;

            for ( var i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
                var v0 = positions[i0];
                var v1 = positions[i1];

                area += (v0.x * v1.y) - (v1.x * v0.y);
            }

            return area * 0.5;
        },

        /**
         * DOC_TBA
         *
         * @return {WindingOrder} DOC_TBA
         *
         * @exception {DeveloperError} positions is required.
         * @exception {DeveloperError} At least three positions are required.
         */
        computeWindingOrder2D : function(positions) {
            var area = PolygonPipeline.computeArea2D(positions);
            return (area >= 0.0) ? WindingOrder.COUNTER_CLOCKWISE : WindingOrder.CLOCKWISE;
        },

        /**
         * DOC_TBA
         *
         * @exception {DeveloperError} positions is required.
         * @exception {DeveloperError} At least three positions are required.
         */
        earClip2D : function(positions) {
            // PERFORMANCE_IDEA:  This is slow at n^3.  Make it faster with:
            //   * http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
            //   * http://cgm.cs.mcgill.ca/~godfried/publications/triangulation.held.ps.gz
            //   * http://blogs.agi.com/insight3d/index.php/2008/03/20/triangulation-rhymes-with-strangulation/

            if (typeof positions  === 'undefined') {
                throw new DeveloperError('positions is required.');
            }

            var length = positions.length;
            if (length < 3) {
                throw new DeveloperError('At least three positions are required.');
            }

            var remainingPositions = new DoublyLinkedList();

            for ( var i = 0; i < length; ++i) {
                remainingPositions.add({
                    position : positions[i],
                    index : i
                });
            }

            var indices = [];

            var previousNode = remainingPositions.head;
            var node = previousNode.next;
            var nextNode = node.next;

            var bailCount = length * length;

            while (remainingPositions.length > 3) {
                var p0 = previousNode.item.position;
                var p1 = node.item.position;
                var p2 = nextNode.item.position;

                if (isTipConvex(p0, p1, p2)) {
                    var isEar = true;

                    for ( var n = (nextNode.next ? nextNode.next : remainingPositions.head); n !== previousNode; n = (n.next ? n.next : remainingPositions.head)) {
                        if (pointInsideTriangle2D(n.item.position, p0, p1, p2)) {
                            isEar = false;
                            break;
                        }
                    }

                    if (isEar) {
                        indices.push(previousNode.item.index);
                        indices.push(node.item.index);
                        indices.push(nextNode.item.index);

                        remainingPositions.remove(node);

                        node = nextNode;
                        nextNode = nextNode.next ? nextNode.next : remainingPositions.head;
                        continue;
                    }
                }

                previousNode = previousNode.next ? previousNode.next : remainingPositions.head;
                node = node.next ? node.next : remainingPositions.head;
                nextNode = nextNode.next ? nextNode.next : remainingPositions.head;

                if (--bailCount === 0) {
                    break;
                }
            }

            var n0 = remainingPositions.head;
            var n1 = n0.next;
            var n2 = n1.next;
            indices.push(n0.item.index);
            indices.push(n1.item.index);
            indices.push(n2.item.index);

            return indices;
        },

        /**
         * DOC_TBA
         *
         * @param {DOC_TBA} positions DOC_TBA
         * @param {DOC_TBA} indices DOC_TBA
         * @param {Number} [granularity] DOC_TBA
         *
         * @exception {DeveloperError} positions is required.
         * @exception {DeveloperError} indices is required.
         * @exception {DeveloperError} At least three indices are required.
         * @exception {DeveloperError} The number of indices must be divisable by three.
         * @exception {DeveloperError} Granularity must be greater than zero.
         */
        computeSubdivision : function(positions, indices, granularity) {
            if (typeof positions  === 'undefined') {
                throw new DeveloperError('positions is required.');
            }

            if (typeof indices === 'undefined') {
                throw new DeveloperError('indices is required.');
            }

            if (indices.length < 3) {
                throw new DeveloperError('At least three indices are required.');
            }

            if (indices.length % 3 !== 0) {
                throw new DeveloperError('The number of indices must be divisable by three.');
            }

            granularity = defaultValue(granularity, CesiumMath.toRadians(1.0));
            if (granularity <= 0.0) {
                throw new DeveloperError('granularity must be greater than zero.');
            }

            // Use a queue for triangles that need (or might need) to be subdivided.
            var triangles = new Queue();

            var indicesLength = indices.length;
            for ( var j = 0; j < indicesLength; j += 3) {
                triangles.enqueue({
                    i0 : indices[j],
                    i1 : indices[j + 1],
                    i2 : indices[j + 2]
                });
            }

            // New positions due to edge splits are appended to the positions list.
            var subdividedPositions = positions.slice(0); // shadow copy!
            var subdividedIndices = [];

            // Used to make sure shared edges are not split more than once.
            var edges = {};

            var i;
            while (triangles.length > 0) {
                var triangle = triangles.dequeue();

                var v0 = subdividedPositions[triangle.i0];
                var v1 = subdividedPositions[triangle.i1];
                var v2 = subdividedPositions[triangle.i2];

                var g0 = v0.angleBetween(v1);
                var g1 = v1.angleBetween(v2);
                var g2 = v2.angleBetween(v0);

                var max = Math.max(g0, Math.max(g1, g2));
                var edge;

                if (max > granularity) {
                    if (g0 === max) {
                        edge = Math.min(triangle.i0, triangle.i1).toString() + ' ' + Math.max(triangle.i0, triangle.i1).toString();

                        i = edges[edge];
                        if (!i) {
                            subdividedPositions.push(v0.add(v1).multiplyByScalar(0.5));
                            i = subdividedPositions.length - 1;
                            edges[edge] = i;
                        }

                        triangles.enqueue({
                            i0 : triangle.i0,
                            i1 : i,
                            i2 : triangle.i2
                        });
                        triangles.enqueue({
                            i0 : i,
                            i1 : triangle.i1,
                            i2 : triangle.i2
                        });
                    } else if (g1 === max) {
                        edge = Math.min(triangle.i1, triangle.i2).toString() + ' ' + Math.max(triangle.i1, triangle.i2).toString();

                        i = edges[edge];
                        if (!i) {
                            subdividedPositions.push(v1.add(v2).multiplyByScalar(0.5));
                            i = subdividedPositions.length - 1;
                            edges[edge] = i;
                        }

                        triangles.enqueue({
                            i0 : triangle.i1,
                            i1 : i,
                            i2 : triangle.i0
                        });
                        triangles.enqueue({
                            i0 : i,
                            i1 : triangle.i2,
                            i2 : triangle.i0
                        });
                    } else if (g2 === max) {
                        edge = Math.min(triangle.i2, triangle.i0).toString() + ' ' + Math.max(triangle.i2, triangle.i0).toString();

                        i = edges[edge];
                        if (!i) {
                            subdividedPositions.push(v2.add(v0).multiplyByScalar(0.5));
                            i = subdividedPositions.length - 1;
                            edges[edge] = i;
                        }

                        triangles.enqueue({
                            i0 : triangle.i2,
                            i1 : i,
                            i2 : triangle.i1
                        });
                        triangles.enqueue({
                            i0 : i,
                            i1 : triangle.i0,
                            i2 : triangle.i1
                        });
                    }
                } else {
                    subdividedIndices.push(triangle.i0);
                    subdividedIndices.push(triangle.i1);
                    subdividedIndices.push(triangle.i2);
                }
            }

            // PERFORMANCE_IDEA Rather that waste time re-iterating the entire set of positions
            // here, all of the above code can be refactored to flatten as values are added
            // Removing the need for this for loop.
            var length = subdividedPositions.length;
            var flattenedPositions = new Array(length * 3);
            var q = 0;
            for (i = 0; i < length; i++) {
                var item = subdividedPositions[i];
                flattenedPositions[q++] = item.x;
                flattenedPositions[q++] = item.y;
                flattenedPositions[q++] = item.z;
            }

            return {
                attributes : {
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : flattenedPositions
                    }
                },

                indexLists : [{
                    primitiveType : PrimitiveType.TRIANGLES,
                    values : subdividedIndices
                }]
            };
        },

        /**
         * DOC_TBA
         *
         * @exception {DeveloperError} ellipsoid is required.
         */
        scaleToGeodeticHeight : function(mesh, height, ellipsoid) {
            ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

            var n = scaleToGeodeticHeightN;
            var p = scaleToGeodeticHeightP;

            height = defaultValue(height, 0.0);

            if (typeof mesh !== 'undefined' && typeof mesh.attributes !== 'undefined' && typeof mesh.attributes.position !== 'undefined') {
                var positions = mesh.attributes.position.values;
                var length = positions.length;

                for ( var i = 0; i < length; i += 3) {
                    p.x = positions[i];
                    p.y = positions[i + 1];
                    p.z = positions[i + 2];

                    ellipsoid.scaleToGeodeticSurface(p, p);
                    ellipsoid.geodeticSurfaceNormal(p, n);
                    Cartesian3.multiplyByScalar(n, height, n);
                    Cartesian3.add(p, n, p);

                    positions[i] = p.x;
                    positions[i + 1] = p.y;
                    positions[i + 2] = p.z;
                }
            }

            return mesh;
        },

        /**
         * Given a polygon defined by an outer ring with one or more inner rings (holes), return a single list of points representing
         * a polygon defined by the outer ring with the inner holes removed.
         *
         * @param {Array} outerRing An array of Cartesian points defining the outer boundary of the polygon.
         * @param {Array} innerRings An array of arrays of Cartesian points, where each array represents a hole in the polygon.
         *
         * @return A single list of Cartesian points defining the polygon, including the eliminated inner ring.
         *
         * @exception {DeveloperError} <code>outerRing</code> is required.
         * @exception {DeveloperError} <code>outerRing</code> must not be empty.
         * @exception {DeveloperError} <code>innerRings</code> is required.
         *
         * @example
         * // Simplifying a polygon with multiple holes.
         * outerRing = PolygonPipeline.eliminateHoles(outerRing, innerRings);
         * polygon.setPositions(outerRing);
         */
        eliminateHoles : function(outerRing, innerRings, ellipsoid) {
            if (typeof outerRing === 'undefined') {
                throw new DeveloperError('outerRing is required.');
            }
            if (outerRing.length === 0) {
                throw new DeveloperError('outerRing must not be empty.');
            }
            if (typeof innerRings === 'undefined') {
                throw new DeveloperError('innerRings is required.');
            }
            ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

            var innerRingsCopy = [];
            for ( var i = 0; i < innerRings.length; i++) {
                var innerRing = [];
                for ( var j = 0; j < innerRings[i].length; j++) {
                    innerRing.push(Cartesian3.clone(innerRings[i][j]));
                }
                innerRingsCopy.push(innerRing);
            }

            var newPolygonVertices = outerRing;
            while (innerRingsCopy.length > 0) {
                newPolygonVertices = eliminateHole(newPolygonVertices, innerRingsCopy, ellipsoid);
            }
            return newPolygonVertices;
        }
    };

    return PolygonPipeline;
});