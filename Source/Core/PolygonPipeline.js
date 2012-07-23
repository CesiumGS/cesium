/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3',
        './pointInsideTriangle2D',
        './ComponentDatatype',
        './PrimitiveType',
        './Queue',
        './WindingOrder'
    ], function(
        DeveloperError,
        CesiumMath,
        Cartesian3,
        pointInsideTriangle2D,
        ComponentDatatype,
        PrimitiveType,
        Queue,
        WindingOrder) {
    "use strict";

    function DoublyLinkedList() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    DoublyLinkedList.prototype.add = function(item) {
        if (item) {
            var node = {
                item : item,
                previous : this.tail,
                next : null
            };

            if (this.tail) {
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
        if (item) {
            if (item.previous && item.next) {
                item.previous.next = item.next;
                item.next.previous = item.previous;
            } else if (item.previous) {
                // Remove last node.
                item.previous.next = null;
                this.tail = item.previous;
            } else if (item.next) {
                // Remove first node.
                item.next.previous = null;
                this.head = item.next;
            } else {
                // Remove last node in linked list.
                this.head = null;
                this.tail = null;
            }

            --this.length;
        }
    };

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
            if (!positions) {
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
            if (!positions) {
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
            function isTipConvex(p0, p1, p2) {
                var u = p1.subtract(p0);
                var v = p2.subtract(p1);

                // Use the sign of the z component of the cross product
                return ((u.x * v.y) - (u.y * v.x)) >= 0.0;
            }

            // PERFORMANCE_IDEA:  This is slow at n^3.  Make it faster with:
            //   * http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
            //   * http://cgm.cs.mcgill.ca/~godfried/publications/triangulation.held.ps.gz
            //   * http://blogs.agi.com/insight3d/index.php/2008/03/20/triangulation-rhymes-with-strangulation/

            if (!positions) {
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

                    for (var n = (nextNode.next ? nextNode.next : remainingPositions.head);
                             n !== previousNode;
                             n = (n.next ? n.next : remainingPositions.head)) {
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
            if (!positions) {
                throw new DeveloperError('positions is required.');
            }

            if (!indices) {
                throw new DeveloperError('indices is required.');
            }

            if (indices.length < 3) {
                throw new DeveloperError('At least three indices are required.');
            }

            if (indices.length % 3 !== 0) {
                throw new DeveloperError('The number of indices must be divisable by three.');
            }

            granularity = granularity || CesiumMath.toRadians(1.0);
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
        scaleToGeodeticHeight : function(ellipsoid, mesh, height) {
            if (!ellipsoid) {
                throw new DeveloperError('ellipsoid is required.');
            }

            height = height || 0.0;

            if (mesh && mesh.attributes && mesh.attributes.position) {
                var positions = mesh.attributes.position.values;
                var length = positions.length;

                for ( var i = 0; i < length; i += 3) {
                    var p = new Cartesian3(positions[i], positions[i + 1], positions[i + 2]);
                    p = ellipsoid.scaleToGeodeticSurface(p);

                    var n = ellipsoid.geodeticSurfaceNormal(p);
                    n = n.multiplyByScalar(height);

                    // Translate from surface to height.
                    p = p.add(n);

                    positions[i] = p.x;
                    positions[i + 1] = p.y;
                    positions[i + 2] = p.z;
                }
            }

            return mesh;
        }
    };

    return PolygonPipeline;
});