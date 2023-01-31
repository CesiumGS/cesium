/* This file is automatically rebuilt by the Cesium build process. */
define(['exports', './Cartesian2-ea36f114', './Check-c23b5bd5', './ComponentDatatype-ec57da04', './when-9f8cafad', './EllipsoidRhumbLine-992a2129', './GeometryAttribute-abbafb10', './Math-cf2f57e0', './WebGLConstants-daaa9be0'], function (exports, Cartesian2, Check, ComponentDatatype, when, EllipsoidRhumbLine, GeometryAttribute, _Math, WebGLConstants) { 'use strict';

    function earcut(data, holeIndices, dim) {

        dim = dim || 2;

        var hasHoles = holeIndices && holeIndices.length,
            outerLen = hasHoles ? holeIndices[0] * dim : data.length,
            outerNode = linkedList(data, 0, outerLen, dim, true),
            triangles = [];

        if (!outerNode || outerNode.next === outerNode.prev) return triangles;

        var minX, minY, maxX, maxY, x, y, invSize;

        if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

        // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
        if (data.length > 80 * dim) {
            minX = maxX = data[0];
            minY = maxY = data[1];

            for (var i = dim; i < outerLen; i += dim) {
                x = data[i];
                y = data[i + 1];
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }

            // minX, minY and invSize are later used to transform coords into integers for z-order calculation
            invSize = Math.max(maxX - minX, maxY - minY);
            invSize = invSize !== 0 ? 1 / invSize : 0;
        }

        earcutLinked(outerNode, triangles, dim, minX, minY, invSize);

        return triangles;
    }

    // create a circular doubly linked list from polygon points in the specified winding order
    function linkedList(data, start, end, dim, clockwise) {
        var i, last;

        if (clockwise === (signedArea(data, start, end, dim) > 0)) {
            for (i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last);
        } else {
            for (i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last);
        }

        if (last && equals(last, last.next)) {
            removeNode(last);
            last = last.next;
        }

        return last;
    }

    // eliminate colinear or duplicate points
    function filterPoints(start, end) {
        if (!start) return start;
        if (!end) end = start;

        var p = start,
            again;
        do {
            again = false;

            if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
                removeNode(p);
                p = end = p.prev;
                if (p === p.next) break;
                again = true;

            } else {
                p = p.next;
            }
        } while (again || p !== end);

        return end;
    }

    // main ear slicing loop which triangulates a polygon (given as a linked list)
    function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
        if (!ear) return;

        // interlink polygon nodes in z-order
        if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

        var stop = ear,
            prev, next;

        // iterate through ears, slicing them one by one
        while (ear.prev !== ear.next) {
            prev = ear.prev;
            next = ear.next;

            if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
                // cut off the triangle
                triangles.push(prev.i / dim);
                triangles.push(ear.i / dim);
                triangles.push(next.i / dim);

                removeNode(ear);

                // skipping the next vertex leads to less sliver triangles
                ear = next.next;
                stop = next.next;

                continue;
            }

            ear = next;

            // if we looped through the whole remaining polygon and can't find any more ears
            if (ear === stop) {
                // try filtering points and slicing again
                if (!pass) {
                    earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);

                // if this didn't work, try curing all small self-intersections locally
                } else if (pass === 1) {
                    ear = cureLocalIntersections(filterPoints(ear), triangles, dim);
                    earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);

                // as a last resort, try splitting the remaining polygon into two
                } else if (pass === 2) {
                    splitEarcut(ear, triangles, dim, minX, minY, invSize);
                }

                break;
            }
        }
    }

    // check whether a polygon node forms a valid ear with adjacent nodes
    function isEar(ear) {
        var a = ear.prev,
            b = ear,
            c = ear.next;

        if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

        // now make sure we don't have other points inside the potential ear
        var p = ear.next.next;

        while (p !== ear.prev) {
            if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
                area(p.prev, p, p.next) >= 0) return false;
            p = p.next;
        }

        return true;
    }

    function isEarHashed(ear, minX, minY, invSize) {
        var a = ear.prev,
            b = ear,
            c = ear.next;

        if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

        // triangle bbox; min & max are calculated like this for speed
        var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
            minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
            maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
            maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

        // z-order range for the current triangle bbox;
        var minZ = zOrder(minTX, minTY, minX, minY, invSize),
            maxZ = zOrder(maxTX, maxTY, minX, minY, invSize);

        var p = ear.prevZ,
            n = ear.nextZ;

        // look for points inside the triangle in both directions
        while (p && p.z >= minZ && n && n.z <= maxZ) {
            if (p !== ear.prev && p !== ear.next &&
                pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
                area(p.prev, p, p.next) >= 0) return false;
            p = p.prevZ;

            if (n !== ear.prev && n !== ear.next &&
                pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
                area(n.prev, n, n.next) >= 0) return false;
            n = n.nextZ;
        }

        // look for remaining points in decreasing z-order
        while (p && p.z >= minZ) {
            if (p !== ear.prev && p !== ear.next &&
                pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
                area(p.prev, p, p.next) >= 0) return false;
            p = p.prevZ;
        }

        // look for remaining points in increasing z-order
        while (n && n.z <= maxZ) {
            if (n !== ear.prev && n !== ear.next &&
                pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
                area(n.prev, n, n.next) >= 0) return false;
            n = n.nextZ;
        }

        return true;
    }

    // go through all polygon nodes and cure small local self-intersections
    function cureLocalIntersections(start, triangles, dim) {
        var p = start;
        do {
            var a = p.prev,
                b = p.next.next;

            if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {

                triangles.push(a.i / dim);
                triangles.push(p.i / dim);
                triangles.push(b.i / dim);

                // remove two nodes involved
                removeNode(p);
                removeNode(p.next);

                p = start = b;
            }
            p = p.next;
        } while (p !== start);

        return filterPoints(p);
    }

    // try splitting polygon into two and triangulate them independently
    function splitEarcut(start, triangles, dim, minX, minY, invSize) {
        // look for a valid diagonal that divides the polygon into two
        var a = start;
        do {
            var b = a.next.next;
            while (b !== a.prev) {
                if (a.i !== b.i && isValidDiagonal(a, b)) {
                    // split the polygon in two by the diagonal
                    var c = splitPolygon(a, b);

                    // filter colinear points around the cuts
                    a = filterPoints(a, a.next);
                    c = filterPoints(c, c.next);

                    // run earcut on each half
                    earcutLinked(a, triangles, dim, minX, minY, invSize);
                    earcutLinked(c, triangles, dim, minX, minY, invSize);
                    return;
                }
                b = b.next;
            }
            a = a.next;
        } while (a !== start);
    }

    // link every hole into the outer loop, producing a single-ring polygon without holes
    function eliminateHoles(data, holeIndices, outerNode, dim) {
        var queue = [],
            i, len, start, end, list;

        for (i = 0, len = holeIndices.length; i < len; i++) {
            start = holeIndices[i] * dim;
            end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
            list = linkedList(data, start, end, dim, false);
            if (list === list.next) list.steiner = true;
            queue.push(getLeftmost(list));
        }

        queue.sort(compareX);

        // process holes from left to right
        for (i = 0; i < queue.length; i++) {
            eliminateHole(queue[i], outerNode);
            outerNode = filterPoints(outerNode, outerNode.next);
        }

        return outerNode;
    }

    function compareX(a, b) {
        return a.x - b.x;
    }

    // find a bridge between vertices that connects hole with an outer ring and and link it
    function eliminateHole(hole, outerNode) {
        outerNode = findHoleBridge(hole, outerNode);
        if (outerNode) {
            var b = splitPolygon(outerNode, hole);
            filterPoints(b, b.next);
        }
    }

    // David Eberly's algorithm for finding a bridge between hole and outer polygon
    function findHoleBridge(hole, outerNode) {
        var p = outerNode,
            hx = hole.x,
            hy = hole.y,
            qx = -Infinity,
            m;

        // find a segment intersected by a ray from the hole's leftmost point to the left;
        // segment's endpoint with lesser x will be potential connection point
        do {
            if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
                var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
                if (x <= hx && x > qx) {
                    qx = x;
                    if (x === hx) {
                        if (hy === p.y) return p;
                        if (hy === p.next.y) return p.next;
                    }
                    m = p.x < p.next.x ? p : p.next;
                }
            }
            p = p.next;
        } while (p !== outerNode);

        if (!m) return null;

        if (hx === qx) return m; // hole touches outer segment; pick leftmost endpoint

        // look for points inside the triangle of hole point, segment intersection and endpoint;
        // if there are no points found, we have a valid connection;
        // otherwise choose the point of the minimum angle with the ray as connection point

        var stop = m,
            mx = m.x,
            my = m.y,
            tanMin = Infinity,
            tan;

        p = m;

        do {
            if (hx >= p.x && p.x >= mx && hx !== p.x &&
                    pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {

                tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

                if (locallyInside(p, hole) &&
                    (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))) {
                    m = p;
                    tanMin = tan;
                }
            }

            p = p.next;
        } while (p !== stop);

        return m;
    }

    // whether sector in vertex m contains sector in vertex p in the same coordinates
    function sectorContainsSector(m, p) {
        return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
    }

    // interlink polygon nodes in z-order
    function indexCurve(start, minX, minY, invSize) {
        var p = start;
        do {
            if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, invSize);
            p.prevZ = p.prev;
            p.nextZ = p.next;
            p = p.next;
        } while (p !== start);

        p.prevZ.nextZ = null;
        p.prevZ = null;

        sortLinked(p);
    }

    // Simon Tatham's linked list merge sort algorithm
    // http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
    function sortLinked(list) {
        var i, p, q, e, tail, numMerges, pSize, qSize,
            inSize = 1;

        do {
            p = list;
            list = null;
            tail = null;
            numMerges = 0;

            while (p) {
                numMerges++;
                q = p;
                pSize = 0;
                for (i = 0; i < inSize; i++) {
                    pSize++;
                    q = q.nextZ;
                    if (!q) break;
                }
                qSize = inSize;

                while (pSize > 0 || (qSize > 0 && q)) {

                    if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
                        e = p;
                        p = p.nextZ;
                        pSize--;
                    } else {
                        e = q;
                        q = q.nextZ;
                        qSize--;
                    }

                    if (tail) tail.nextZ = e;
                    else list = e;

                    e.prevZ = tail;
                    tail = e;
                }

                p = q;
            }

            tail.nextZ = null;
            inSize *= 2;

        } while (numMerges > 1);

        return list;
    }

    // z-order of a point given coords and inverse of the longer side of data bbox
    function zOrder(x, y, minX, minY, invSize) {
        // coords are transformed into non-negative 15-bit integer range
        x = 32767 * (x - minX) * invSize;
        y = 32767 * (y - minY) * invSize;

        x = (x | (x << 8)) & 0x00FF00FF;
        x = (x | (x << 4)) & 0x0F0F0F0F;
        x = (x | (x << 2)) & 0x33333333;
        x = (x | (x << 1)) & 0x55555555;

        y = (y | (y << 8)) & 0x00FF00FF;
        y = (y | (y << 4)) & 0x0F0F0F0F;
        y = (y | (y << 2)) & 0x33333333;
        y = (y | (y << 1)) & 0x55555555;

        return x | (y << 1);
    }

    // find the leftmost node of a polygon ring
    function getLeftmost(start) {
        var p = start,
            leftmost = start;
        do {
            if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
            p = p.next;
        } while (p !== start);

        return leftmost;
    }

    // check if a point lies within a convex triangle
    function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
        return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
               (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
               (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
    }

    // check if a diagonal between two polygon nodes is valid (lies in polygon interior)
    function isValidDiagonal(a, b) {
        return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && // dones't intersect other edges
               (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && // locally visible
                (area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors
                equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0); // special zero-length case
    }

    // signed area of a triangle
    function area(p, q, r) {
        return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    }

    // check if two points are equal
    function equals(p1, p2) {
        return p1.x === p2.x && p1.y === p2.y;
    }

    // check if two segments intersect
    function intersects(p1, q1, p2, q2) {
        var o1 = sign(area(p1, q1, p2));
        var o2 = sign(area(p1, q1, q2));
        var o3 = sign(area(p2, q2, p1));
        var o4 = sign(area(p2, q2, q1));

        if (o1 !== o2 && o3 !== o4) return true; // general case

        if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1
        if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1
        if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2
        if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

        return false;
    }

    // for collinear points p, q, r, check if point q lies on segment pr
    function onSegment(p, q, r) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    }

    function sign(num) {
        return num > 0 ? 1 : num < 0 ? -1 : 0;
    }

    // check if a polygon diagonal intersects any polygon segments
    function intersectsPolygon(a, b) {
        var p = a;
        do {
            if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
                    intersects(p, p.next, a, b)) return true;
            p = p.next;
        } while (p !== a);

        return false;
    }

    // check if a polygon diagonal is locally inside the polygon
    function locallyInside(a, b) {
        return area(a.prev, a, a.next) < 0 ?
            area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :
            area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
    }

    // check if the middle point of a polygon diagonal is inside the polygon
    function middleInside(a, b) {
        var p = a,
            inside = false,
            px = (a.x + b.x) / 2,
            py = (a.y + b.y) / 2;
        do {
            if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y &&
                    (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))
                inside = !inside;
            p = p.next;
        } while (p !== a);

        return inside;
    }

    // link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
    // if one belongs to the outer ring and another to a hole, it merges it into a single ring
    function splitPolygon(a, b) {
        var a2 = new Node(a.i, a.x, a.y),
            b2 = new Node(b.i, b.x, b.y),
            an = a.next,
            bp = b.prev;

        a.next = b;
        b.prev = a;

        a2.next = an;
        an.prev = a2;

        b2.next = a2;
        a2.prev = b2;

        bp.next = b2;
        b2.prev = bp;

        return b2;
    }

    // create a node and optionally link it with previous one (in a circular doubly linked list)
    function insertNode(i, x, y, last) {
        var p = new Node(i, x, y);

        if (!last) {
            p.prev = p;
            p.next = p;

        } else {
            p.next = last.next;
            p.prev = last;
            last.next.prev = p;
            last.next = p;
        }
        return p;
    }

    function removeNode(p) {
        p.next.prev = p.prev;
        p.prev.next = p.next;

        if (p.prevZ) p.prevZ.nextZ = p.nextZ;
        if (p.nextZ) p.nextZ.prevZ = p.prevZ;
    }

    function Node(i, x, y) {
        // vertex index in coordinates array
        this.i = i;

        // vertex coordinates
        this.x = x;
        this.y = y;

        // previous and next vertex nodes in a polygon ring
        this.prev = null;
        this.next = null;

        // z-order curve value
        this.z = null;

        // previous and next nodes in z-order
        this.prevZ = null;
        this.nextZ = null;

        // indicates whether this is a steiner point
        this.steiner = false;
    }

    // return a percentage difference between the polygon area and its triangulation area;
    // used to verify correctness of triangulation
    earcut.deviation = function (data, holeIndices, dim, triangles) {
        var hasHoles = holeIndices && holeIndices.length;
        var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

        var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
        if (hasHoles) {
            for (var i = 0, len = holeIndices.length; i < len; i++) {
                var start = holeIndices[i] * dim;
                var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
                polygonArea -= Math.abs(signedArea(data, start, end, dim));
            }
        }

        var trianglesArea = 0;
        for (i = 0; i < triangles.length; i += 3) {
            var a = triangles[i] * dim;
            var b = triangles[i + 1] * dim;
            var c = triangles[i + 2] * dim;
            trianglesArea += Math.abs(
                (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
                (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
        }

        return polygonArea === 0 && trianglesArea === 0 ? 0 :
            Math.abs((trianglesArea - polygonArea) / polygonArea);
    };

    function signedArea(data, start, end, dim) {
        var sum = 0;
        for (var i = start, j = end - dim; i < end; i += dim) {
            sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
            j = i;
        }
        return sum;
    }

    // turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
    earcut.flatten = function (data) {
        var dim = data[0][0].length,
            result = {vertices: [], holes: [], dimensions: dim},
            holeIndex = 0;

        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].length; j++) {
                for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
            }
            if (i > 0) {
                holeIndex += data[i - 1].length;
                result.holes.push(holeIndex);
            }
        }
        return result;
    };

    /**
     * Winding order defines the order of vertices for a triangle to be considered front-facing.
     *
     * @enum {Number}
     */
    var WindingOrder = {
      /**
       * Vertices are in clockwise order.
       *
       * @type {Number}
       * @constant
       */
      CLOCKWISE: WebGLConstants.WebGLConstants.CW,

      /**
       * Vertices are in counter-clockwise order.
       *
       * @type {Number}
       * @constant
       */
      COUNTER_CLOCKWISE: WebGLConstants.WebGLConstants.CCW,
    };

    /**
     * @private
     */
    WindingOrder.validate = function (windingOrder) {
      return (
        windingOrder === WindingOrder.CLOCKWISE ||
        windingOrder === WindingOrder.COUNTER_CLOCKWISE
      );
    };

    var WindingOrder$1 = Object.freeze(WindingOrder);

    var scaleToGeodeticHeightN = new Cartesian2.Cartesian3();
    var scaleToGeodeticHeightP = new Cartesian2.Cartesian3();

    /**
     * @private
     */
    var PolygonPipeline = {};

    /**
     * @exception {DeveloperError} At least three positions are required.
     */
    PolygonPipeline.computeArea2D = function (positions) {
      //>>includeStart('debug', pragmas.debug);
      Check.Check.defined("positions", positions);
      Check.Check.typeOf.number.greaterThanOrEquals(
        "positions.length",
        positions.length,
        3
      );
      //>>includeEnd('debug');

      var length = positions.length;
      var area = 0.0;

      for (var i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
        var v0 = positions[i0];
        var v1 = positions[i1];

        area += v0.x * v1.y - v1.x * v0.y;
      }

      return area * 0.5;
    };

    /**
     * @returns {WindingOrder} The winding order.
     *
     * @exception {DeveloperError} At least three positions are required.
     */
    PolygonPipeline.computeWindingOrder2D = function (positions) {
      var area = PolygonPipeline.computeArea2D(positions);
      return area > 0.0 ? WindingOrder$1.COUNTER_CLOCKWISE : WindingOrder$1.CLOCKWISE;
    };

    /**
     * Triangulate a polygon.
     *
     * @param {Cartesian2[]} positions Cartesian2 array containing the vertices of the polygon
     * @param {Number[]} [holes] An array of the staring indices of the holes.
     * @returns {Number[]} Index array representing triangles that fill the polygon
     */
    PolygonPipeline.triangulate = function (positions, holes) {
      //>>includeStart('debug', pragmas.debug);
      Check.Check.defined("positions", positions);
      //>>includeEnd('debug');

      var flattenedPositions = Cartesian2.Cartesian2.packArray(positions);
      return earcut(flattenedPositions, holes, 2);
    };

    var subdivisionV0Scratch = new Cartesian2.Cartesian3();
    var subdivisionV1Scratch = new Cartesian2.Cartesian3();
    var subdivisionV2Scratch = new Cartesian2.Cartesian3();
    var subdivisionS0Scratch = new Cartesian2.Cartesian3();
    var subdivisionS1Scratch = new Cartesian2.Cartesian3();
    var subdivisionS2Scratch = new Cartesian2.Cartesian3();
    var subdivisionMidScratch = new Cartesian2.Cartesian3();

    /**
     * Subdivides positions and raises points to the surface of the ellipsoid.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid the polygon in on.
     * @param {Cartesian3[]} positions An array of {@link Cartesian3} positions of the polygon.
     * @param {Number[]} indices An array of indices that determines the triangles in the polygon.
     * @param {Number} [granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     *
     * @exception {DeveloperError} At least three indices are required.
     * @exception {DeveloperError} The number of indices must be divisable by three.
     * @exception {DeveloperError} Granularity must be greater than zero.
     */
    PolygonPipeline.computeSubdivision = function (
      ellipsoid,
      positions,
      indices,
      granularity
    ) {
      granularity = when.defaultValue(granularity, _Math.CesiumMath.RADIANS_PER_DEGREE);

      //>>includeStart('debug', pragmas.debug);
      Check.Check.typeOf.object("ellipsoid", ellipsoid);
      Check.Check.defined("positions", positions);
      Check.Check.defined("indices", indices);
      Check.Check.typeOf.number.greaterThanOrEquals("indices.length", indices.length, 3);
      Check.Check.typeOf.number.equals("indices.length % 3", "0", indices.length % 3, 0);
      Check.Check.typeOf.number.greaterThan("granularity", granularity, 0.0);
      //>>includeEnd('debug');

      // triangles that need (or might need) to be subdivided.
      var triangles = indices.slice(0);

      // New positions due to edge splits are appended to the positions list.
      var i;
      var length = positions.length;
      var subdividedPositions = new Array(length * 3);
      var q = 0;
      for (i = 0; i < length; i++) {
        var item = positions[i];
        subdividedPositions[q++] = item.x;
        subdividedPositions[q++] = item.y;
        subdividedPositions[q++] = item.z;
      }

      var subdividedIndices = [];

      // Used to make sure shared edges are not split more than once.
      var edges = {};

      var radius = ellipsoid.maximumRadius;
      var minDistance = _Math.CesiumMath.chordLength(granularity, radius);
      var minDistanceSqrd = minDistance * minDistance;

      while (triangles.length > 0) {
        var i2 = triangles.pop();
        var i1 = triangles.pop();
        var i0 = triangles.pop();

        var v0 = Cartesian2.Cartesian3.fromArray(
          subdividedPositions,
          i0 * 3,
          subdivisionV0Scratch
        );
        var v1 = Cartesian2.Cartesian3.fromArray(
          subdividedPositions,
          i1 * 3,
          subdivisionV1Scratch
        );
        var v2 = Cartesian2.Cartesian3.fromArray(
          subdividedPositions,
          i2 * 3,
          subdivisionV2Scratch
        );

        var s0 = Cartesian2.Cartesian3.multiplyByScalar(
          Cartesian2.Cartesian3.normalize(v0, subdivisionS0Scratch),
          radius,
          subdivisionS0Scratch
        );
        var s1 = Cartesian2.Cartesian3.multiplyByScalar(
          Cartesian2.Cartesian3.normalize(v1, subdivisionS1Scratch),
          radius,
          subdivisionS1Scratch
        );
        var s2 = Cartesian2.Cartesian3.multiplyByScalar(
          Cartesian2.Cartesian3.normalize(v2, subdivisionS2Scratch),
          radius,
          subdivisionS2Scratch
        );

        var g0 = Cartesian2.Cartesian3.magnitudeSquared(
          Cartesian2.Cartesian3.subtract(s0, s1, subdivisionMidScratch)
        );
        var g1 = Cartesian2.Cartesian3.magnitudeSquared(
          Cartesian2.Cartesian3.subtract(s1, s2, subdivisionMidScratch)
        );
        var g2 = Cartesian2.Cartesian3.magnitudeSquared(
          Cartesian2.Cartesian3.subtract(s2, s0, subdivisionMidScratch)
        );

        var max = Math.max(g0, g1, g2);
        var edge;
        var mid;

        // if the max length squared of a triangle edge is greater than the chord length of squared
        // of the granularity, subdivide the triangle
        if (max > minDistanceSqrd) {
          if (g0 === max) {
            edge = Math.min(i0, i1) + " " + Math.max(i0, i1);

            i = edges[edge];
            if (!when.defined(i)) {
              mid = Cartesian2.Cartesian3.add(v0, v1, subdivisionMidScratch);
              Cartesian2.Cartesian3.multiplyByScalar(mid, 0.5, mid);
              subdividedPositions.push(mid.x, mid.y, mid.z);
              i = subdividedPositions.length / 3 - 1;
              edges[edge] = i;
            }

            triangles.push(i0, i, i2);
            triangles.push(i, i1, i2);
          } else if (g1 === max) {
            edge = Math.min(i1, i2) + " " + Math.max(i1, i2);

            i = edges[edge];
            if (!when.defined(i)) {
              mid = Cartesian2.Cartesian3.add(v1, v2, subdivisionMidScratch);
              Cartesian2.Cartesian3.multiplyByScalar(mid, 0.5, mid);
              subdividedPositions.push(mid.x, mid.y, mid.z);
              i = subdividedPositions.length / 3 - 1;
              edges[edge] = i;
            }

            triangles.push(i1, i, i0);
            triangles.push(i, i2, i0);
          } else if (g2 === max) {
            edge = Math.min(i2, i0) + " " + Math.max(i2, i0);

            i = edges[edge];
            if (!when.defined(i)) {
              mid = Cartesian2.Cartesian3.add(v2, v0, subdivisionMidScratch);
              Cartesian2.Cartesian3.multiplyByScalar(mid, 0.5, mid);
              subdividedPositions.push(mid.x, mid.y, mid.z);
              i = subdividedPositions.length / 3 - 1;
              edges[edge] = i;
            }

            triangles.push(i2, i, i1);
            triangles.push(i, i0, i1);
          }
        } else {
          subdividedIndices.push(i0);
          subdividedIndices.push(i1);
          subdividedIndices.push(i2);
        }
      }

      return new GeometryAttribute.Geometry({
        attributes: {
          position: new GeometryAttribute.GeometryAttribute({
            componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: subdividedPositions,
          }),
        },
        indices: subdividedIndices,
        primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      });
    };

    var subdivisionC0Scratch = new Cartesian2.Cartographic();
    var subdivisionC1Scratch = new Cartesian2.Cartographic();
    var subdivisionC2Scratch = new Cartesian2.Cartographic();
    var subdivisionCartographicScratch = new Cartesian2.Cartographic();

    /**
     * Subdivides positions on rhumb lines and raises points to the surface of the ellipsoid.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid the polygon in on.
     * @param {Cartesian3[]} positions An array of {@link Cartesian3} positions of the polygon.
     * @param {Number[]} indices An array of indices that determines the triangles in the polygon.
     * @param {Number} [granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     *
     * @exception {DeveloperError} At least three indices are required.
     * @exception {DeveloperError} The number of indices must be divisable by three.
     * @exception {DeveloperError} Granularity must be greater than zero.
     */
    PolygonPipeline.computeRhumbLineSubdivision = function (
      ellipsoid,
      positions,
      indices,
      granularity
    ) {
      granularity = when.defaultValue(granularity, _Math.CesiumMath.RADIANS_PER_DEGREE);

      //>>includeStart('debug', pragmas.debug);
      Check.Check.typeOf.object("ellipsoid", ellipsoid);
      Check.Check.defined("positions", positions);
      Check.Check.defined("indices", indices);
      Check.Check.typeOf.number.greaterThanOrEquals("indices.length", indices.length, 3);
      Check.Check.typeOf.number.equals("indices.length % 3", "0", indices.length % 3, 0);
      Check.Check.typeOf.number.greaterThan("granularity", granularity, 0.0);
      //>>includeEnd('debug');

      // triangles that need (or might need) to be subdivided.
      var triangles = indices.slice(0);

      // New positions due to edge splits are appended to the positions list.
      var i;
      var length = positions.length;
      var subdividedPositions = new Array(length * 3);
      var q = 0;
      for (i = 0; i < length; i++) {
        var item = positions[i];
        subdividedPositions[q++] = item.x;
        subdividedPositions[q++] = item.y;
        subdividedPositions[q++] = item.z;
      }

      var subdividedIndices = [];

      // Used to make sure shared edges are not split more than once.
      var edges = {};

      var radius = ellipsoid.maximumRadius;
      var minDistance = _Math.CesiumMath.chordLength(granularity, radius);

      var rhumb0 = new EllipsoidRhumbLine.EllipsoidRhumbLine(undefined, undefined, ellipsoid);
      var rhumb1 = new EllipsoidRhumbLine.EllipsoidRhumbLine(undefined, undefined, ellipsoid);
      var rhumb2 = new EllipsoidRhumbLine.EllipsoidRhumbLine(undefined, undefined, ellipsoid);

      while (triangles.length > 0) {
        var i2 = triangles.pop();
        var i1 = triangles.pop();
        var i0 = triangles.pop();

        var v0 = Cartesian2.Cartesian3.fromArray(
          subdividedPositions,
          i0 * 3,
          subdivisionV0Scratch
        );
        var v1 = Cartesian2.Cartesian3.fromArray(
          subdividedPositions,
          i1 * 3,
          subdivisionV1Scratch
        );
        var v2 = Cartesian2.Cartesian3.fromArray(
          subdividedPositions,
          i2 * 3,
          subdivisionV2Scratch
        );

        var c0 = ellipsoid.cartesianToCartographic(v0, subdivisionC0Scratch);
        var c1 = ellipsoid.cartesianToCartographic(v1, subdivisionC1Scratch);
        var c2 = ellipsoid.cartesianToCartographic(v2, subdivisionC2Scratch);

        rhumb0.setEndPoints(c0, c1);
        var g0 = rhumb0.surfaceDistance;
        rhumb1.setEndPoints(c1, c2);
        var g1 = rhumb1.surfaceDistance;
        rhumb2.setEndPoints(c2, c0);
        var g2 = rhumb2.surfaceDistance;

        var max = Math.max(g0, g1, g2);
        var edge;
        var mid;
        var midHeight;
        var midCartesian3;

        // if the max length squared of a triangle edge is greater than granularity, subdivide the triangle
        if (max > minDistance) {
          if (g0 === max) {
            edge = Math.min(i0, i1) + " " + Math.max(i0, i1);

            i = edges[edge];
            if (!when.defined(i)) {
              mid = rhumb0.interpolateUsingFraction(
                0.5,
                subdivisionCartographicScratch
              );
              midHeight = (c0.height + c1.height) * 0.5;
              midCartesian3 = Cartesian2.Cartesian3.fromRadians(
                mid.longitude,
                mid.latitude,
                midHeight,
                ellipsoid,
                subdivisionMidScratch
              );
              subdividedPositions.push(
                midCartesian3.x,
                midCartesian3.y,
                midCartesian3.z
              );
              i = subdividedPositions.length / 3 - 1;
              edges[edge] = i;
            }

            triangles.push(i0, i, i2);
            triangles.push(i, i1, i2);
          } else if (g1 === max) {
            edge = Math.min(i1, i2) + " " + Math.max(i1, i2);

            i = edges[edge];
            if (!when.defined(i)) {
              mid = rhumb1.interpolateUsingFraction(
                0.5,
                subdivisionCartographicScratch
              );
              midHeight = (c1.height + c2.height) * 0.5;
              midCartesian3 = Cartesian2.Cartesian3.fromRadians(
                mid.longitude,
                mid.latitude,
                midHeight,
                ellipsoid,
                subdivisionMidScratch
              );
              subdividedPositions.push(
                midCartesian3.x,
                midCartesian3.y,
                midCartesian3.z
              );
              i = subdividedPositions.length / 3 - 1;
              edges[edge] = i;
            }

            triangles.push(i1, i, i0);
            triangles.push(i, i2, i0);
          } else if (g2 === max) {
            edge = Math.min(i2, i0) + " " + Math.max(i2, i0);

            i = edges[edge];
            if (!when.defined(i)) {
              mid = rhumb2.interpolateUsingFraction(
                0.5,
                subdivisionCartographicScratch
              );
              midHeight = (c2.height + c0.height) * 0.5;
              midCartesian3 = Cartesian2.Cartesian3.fromRadians(
                mid.longitude,
                mid.latitude,
                midHeight,
                ellipsoid,
                subdivisionMidScratch
              );
              subdividedPositions.push(
                midCartesian3.x,
                midCartesian3.y,
                midCartesian3.z
              );
              i = subdividedPositions.length / 3 - 1;
              edges[edge] = i;
            }

            triangles.push(i2, i, i1);
            triangles.push(i, i0, i1);
          }
        } else {
          subdividedIndices.push(i0);
          subdividedIndices.push(i1);
          subdividedIndices.push(i2);
        }
      }

      return new GeometryAttribute.Geometry({
        attributes: {
          position: new GeometryAttribute.GeometryAttribute({
            componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: subdividedPositions,
          }),
        },
        indices: subdividedIndices,
        primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      });
    };

    /**
     * Scales each position of a geometry's position attribute to a height, in place.
     *
     * @param {Number[]} positions The array of numbers representing the positions to be scaled
     * @param {Number} [height=0.0] The desired height to add to the positions
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
     * @param {Boolean} [scaleToSurface=true] <code>true</code> if the positions need to be scaled to the surface before the height is added.
     * @returns {Number[]} The input array of positions, scaled to height
     */
    PolygonPipeline.scaleToGeodeticHeight = function (
      positions,
      height,
      ellipsoid,
      scaleToSurface
    ) {
      ellipsoid = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84);

      var n = scaleToGeodeticHeightN;
      var p = scaleToGeodeticHeightP;

      height = when.defaultValue(height, 0.0);
      scaleToSurface = when.defaultValue(scaleToSurface, true);

      if (when.defined(positions)) {
        var length = positions.length;

        for (var i = 0; i < length; i += 3) {
          Cartesian2.Cartesian3.fromArray(positions, i, p);

          if (scaleToSurface) {
            p = ellipsoid.scaleToGeodeticSurface(p, p);
          }

          if (height !== 0) {
            n = ellipsoid.geodeticSurfaceNormal(p, n);

            Cartesian2.Cartesian3.multiplyByScalar(n, height, n);
            Cartesian2.Cartesian3.add(p, n, p);
          }

          positions[i] = p.x;
          positions[i + 1] = p.y;
          positions[i + 2] = p.z;
        }
      }

      return positions;
    };

    exports.PolygonPipeline = PolygonPipeline;
    exports.WindingOrder = WindingOrder$1;

});
