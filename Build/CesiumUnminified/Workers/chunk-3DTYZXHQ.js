/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  EllipsoidRhumbLine_default
} from "./chunk-RSJG3PFO.js";
import {
  GeometryAttribute_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  Cartesian2_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  WebGLConstants_default
} from "./chunk-LSF6MAVT.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  __commonJS,
  __toESM,
  defined_default
} from "./chunk-7KX4PCVC.js";

// node_modules/earcut/src/earcut.js
var require_earcut = __commonJS({
  "node_modules/earcut/src/earcut.js"(exports, module) {
    "use strict";
    module.exports = earcut2;
    module.exports.default = earcut2;
    function earcut2(data, holeIndices, dim) {
      dim = dim || 2;
      var hasHoles = holeIndices && holeIndices.length, outerLen = hasHoles ? holeIndices[0] * dim : data.length, outerNode = linkedList(data, 0, outerLen, dim, true), triangles = [];
      if (!outerNode || outerNode.next === outerNode.prev)
        return triangles;
      var minX, minY, maxX, maxY, x, y, invSize;
      if (hasHoles)
        outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
      if (data.length > 80 * dim) {
        minX = maxX = data[0];
        minY = maxY = data[1];
        for (var i = dim; i < outerLen; i += dim) {
          x = data[i];
          y = data[i + 1];
          if (x < minX)
            minX = x;
          if (y < minY)
            minY = y;
          if (x > maxX)
            maxX = x;
          if (y > maxY)
            maxY = y;
        }
        invSize = Math.max(maxX - minX, maxY - minY);
        invSize = invSize !== 0 ? 32767 / invSize : 0;
      }
      earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);
      return triangles;
    }
    function linkedList(data, start, end, dim, clockwise) {
      var i, last;
      if (clockwise === signedArea(data, start, end, dim) > 0) {
        for (i = start; i < end; i += dim)
          last = insertNode(i, data[i], data[i + 1], last);
      } else {
        for (i = end - dim; i >= start; i -= dim)
          last = insertNode(i, data[i], data[i + 1], last);
      }
      if (last && equals(last, last.next)) {
        removeNode(last);
        last = last.next;
      }
      return last;
    }
    function filterPoints(start, end) {
      if (!start)
        return start;
      if (!end)
        end = start;
      var p = start, again;
      do {
        again = false;
        if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
          removeNode(p);
          p = end = p.prev;
          if (p === p.next)
            break;
          again = true;
        } else {
          p = p.next;
        }
      } while (again || p !== end);
      return end;
    }
    function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
      if (!ear)
        return;
      if (!pass && invSize)
        indexCurve(ear, minX, minY, invSize);
      var stop = ear, prev, next;
      while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;
        if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
          triangles.push(prev.i / dim | 0);
          triangles.push(ear.i / dim | 0);
          triangles.push(next.i / dim | 0);
          removeNode(ear);
          ear = next.next;
          stop = next.next;
          continue;
        }
        ear = next;
        if (ear === stop) {
          if (!pass) {
            earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);
          } else if (pass === 1) {
            ear = cureLocalIntersections(filterPoints(ear), triangles, dim);
            earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);
          } else if (pass === 2) {
            splitEarcut(ear, triangles, dim, minX, minY, invSize);
          }
          break;
        }
      }
    }
    function isEar(ear) {
      var a = ear.prev, b = ear, c = ear.next;
      if (area(a, b, c) >= 0)
        return false;
      var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
      var x0 = ax < bx ? ax < cx ? ax : cx : bx < cx ? bx : cx, y0 = ay < by ? ay < cy ? ay : cy : by < cy ? by : cy, x1 = ax > bx ? ax > cx ? ax : cx : bx > cx ? bx : cx, y1 = ay > by ? ay > cy ? ay : cy : by > cy ? by : cy;
      var p = c.next;
      while (p !== a) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
          return false;
        p = p.next;
      }
      return true;
    }
    function isEarHashed(ear, minX, minY, invSize) {
      var a = ear.prev, b = ear, c = ear.next;
      if (area(a, b, c) >= 0)
        return false;
      var ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;
      var x0 = ax < bx ? ax < cx ? ax : cx : bx < cx ? bx : cx, y0 = ay < by ? ay < cy ? ay : cy : by < cy ? by : cy, x1 = ax > bx ? ax > cx ? ax : cx : bx > cx ? bx : cx, y1 = ay > by ? ay > cy ? ay : cy : by > cy ? by : cy;
      var minZ = zOrder(x0, y0, minX, minY, invSize), maxZ = zOrder(x1, y1, minX, minY, invSize);
      var p = ear.prevZ, n = ear.nextZ;
      while (p && p.z >= minZ && n && n.z <= maxZ) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
          return false;
        p = p.prevZ;
        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0)
          return false;
        n = n.nextZ;
      }
      while (p && p.z >= minZ) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0)
          return false;
        p = p.prevZ;
      }
      while (n && n.z <= maxZ) {
        if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0)
          return false;
        n = n.nextZ;
      }
      return true;
    }
    function cureLocalIntersections(start, triangles, dim) {
      var p = start;
      do {
        var a = p.prev, b = p.next.next;
        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
          triangles.push(a.i / dim | 0);
          triangles.push(p.i / dim | 0);
          triangles.push(b.i / dim | 0);
          removeNode(p);
          removeNode(p.next);
          p = start = b;
        }
        p = p.next;
      } while (p !== start);
      return filterPoints(p);
    }
    function splitEarcut(start, triangles, dim, minX, minY, invSize) {
      var a = start;
      do {
        var b = a.next.next;
        while (b !== a.prev) {
          if (a.i !== b.i && isValidDiagonal(a, b)) {
            var c = splitPolygon(a, b);
            a = filterPoints(a, a.next);
            c = filterPoints(c, c.next);
            earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
            earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
            return;
          }
          b = b.next;
        }
        a = a.next;
      } while (a !== start);
    }
    function eliminateHoles(data, holeIndices, outerNode, dim) {
      var queue = [], i, len, start, end, list;
      for (i = 0, len = holeIndices.length; i < len; i++) {
        start = holeIndices[i] * dim;
        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        list = linkedList(data, start, end, dim, false);
        if (list === list.next)
          list.steiner = true;
        queue.push(getLeftmost(list));
      }
      queue.sort(compareX);
      for (i = 0; i < queue.length; i++) {
        outerNode = eliminateHole(queue[i], outerNode);
      }
      return outerNode;
    }
    function compareX(a, b) {
      return a.x - b.x;
    }
    function eliminateHole(hole, outerNode) {
      var bridge = findHoleBridge(hole, outerNode);
      if (!bridge) {
        return outerNode;
      }
      var bridgeReverse = splitPolygon(bridge, hole);
      filterPoints(bridgeReverse, bridgeReverse.next);
      return filterPoints(bridge, bridge.next);
    }
    function findHoleBridge(hole, outerNode) {
      var p = outerNode, hx = hole.x, hy = hole.y, qx = -Infinity, m;
      do {
        if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
          var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
          if (x <= hx && x > qx) {
            qx = x;
            m = p.x < p.next.x ? p : p.next;
            if (x === hx)
              return m;
          }
        }
        p = p.next;
      } while (p !== outerNode);
      if (!m)
        return null;
      var stop = m, mx = m.x, my = m.y, tanMin = Infinity, tan;
      p = m;
      do {
        if (hx >= p.x && p.x >= mx && hx !== p.x && pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
          tan = Math.abs(hy - p.y) / (hx - p.x);
          if (locallyInside(p, hole) && (tan < tanMin || tan === tanMin && (p.x > m.x || p.x === m.x && sectorContainsSector(m, p)))) {
            m = p;
            tanMin = tan;
          }
        }
        p = p.next;
      } while (p !== stop);
      return m;
    }
    function sectorContainsSector(m, p) {
      return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
    }
    function indexCurve(start, minX, minY, invSize) {
      var p = start;
      do {
        if (p.z === 0)
          p.z = zOrder(p.x, p.y, minX, minY, invSize);
        p.prevZ = p.prev;
        p.nextZ = p.next;
        p = p.next;
      } while (p !== start);
      p.prevZ.nextZ = null;
      p.prevZ = null;
      sortLinked(p);
    }
    function sortLinked(list) {
      var i, p, q, e, tail, numMerges, pSize, qSize, inSize = 1;
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
            if (!q)
              break;
          }
          qSize = inSize;
          while (pSize > 0 || qSize > 0 && q) {
            if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
              e = p;
              p = p.nextZ;
              pSize--;
            } else {
              e = q;
              q = q.nextZ;
              qSize--;
            }
            if (tail)
              tail.nextZ = e;
            else
              list = e;
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
    function zOrder(x, y, minX, minY, invSize) {
      x = (x - minX) * invSize | 0;
      y = (y - minY) * invSize | 0;
      x = (x | x << 8) & 16711935;
      x = (x | x << 4) & 252645135;
      x = (x | x << 2) & 858993459;
      x = (x | x << 1) & 1431655765;
      y = (y | y << 8) & 16711935;
      y = (y | y << 4) & 252645135;
      y = (y | y << 2) & 858993459;
      y = (y | y << 1) & 1431655765;
      return x | y << 1;
    }
    function getLeftmost(start) {
      var p = start, leftmost = start;
      do {
        if (p.x < leftmost.x || p.x === leftmost.x && p.y < leftmost.y)
          leftmost = p;
        p = p.next;
      } while (p !== start);
      return leftmost;
    }
    function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
      return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
    }
    function isValidDiagonal(a, b) {
      return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && // dones't intersect other edges
      (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && // locally visible
      (area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors
      equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0);
    }
    function area(p, q, r) {
      return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    }
    function equals(p1, p2) {
      return p1.x === p2.x && p1.y === p2.y;
    }
    function intersects(p1, q1, p2, q2) {
      var o1 = sign(area(p1, q1, p2));
      var o2 = sign(area(p1, q1, q2));
      var o3 = sign(area(p2, q2, p1));
      var o4 = sign(area(p2, q2, q1));
      if (o1 !== o2 && o3 !== o4)
        return true;
      if (o1 === 0 && onSegment(p1, p2, q1))
        return true;
      if (o2 === 0 && onSegment(p1, q2, q1))
        return true;
      if (o3 === 0 && onSegment(p2, p1, q2))
        return true;
      if (o4 === 0 && onSegment(p2, q1, q2))
        return true;
      return false;
    }
    function onSegment(p, q, r) {
      return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    }
    function sign(num) {
      return num > 0 ? 1 : num < 0 ? -1 : 0;
    }
    function intersectsPolygon(a, b) {
      var p = a;
      do {
        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b))
          return true;
        p = p.next;
      } while (p !== a);
      return false;
    }
    function locallyInside(a, b) {
      return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
    }
    function middleInside(a, b) {
      var p = a, inside = false, px = (a.x + b.x) / 2, py = (a.y + b.y) / 2;
      do {
        if (p.y > py !== p.next.y > py && p.next.y !== p.y && px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x)
          inside = !inside;
        p = p.next;
      } while (p !== a);
      return inside;
    }
    function splitPolygon(a, b) {
      var a2 = new Node(a.i, a.x, a.y), b2 = new Node(b.i, b.x, b.y), an = a.next, bp = b.prev;
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
      if (p.prevZ)
        p.prevZ.nextZ = p.nextZ;
      if (p.nextZ)
        p.nextZ.prevZ = p.prevZ;
    }
    function Node(i, x, y) {
      this.i = i;
      this.x = x;
      this.y = y;
      this.prev = null;
      this.next = null;
      this.z = 0;
      this.prevZ = null;
      this.nextZ = null;
      this.steiner = false;
    }
    earcut2.deviation = function(data, holeIndices, dim, triangles) {
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
          (data[a] - data[c]) * (data[b + 1] - data[a + 1]) - (data[a] - data[b]) * (data[c + 1] - data[a + 1])
        );
      }
      return polygonArea === 0 && trianglesArea === 0 ? 0 : Math.abs((trianglesArea - polygonArea) / polygonArea);
    };
    function signedArea(data, start, end, dim) {
      var sum = 0;
      for (var i = start, j = end - dim; i < end; i += dim) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
        j = i;
      }
      return sum;
    }
    earcut2.flatten = function(data) {
      var dim = data[0][0].length, result = { vertices: [], holes: [], dimensions: dim }, holeIndex = 0;
      for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
          for (var d = 0; d < dim; d++)
            result.vertices.push(data[i][j][d]);
        }
        if (i > 0) {
          holeIndex += data[i - 1].length;
          result.holes.push(holeIndex);
        }
      }
      return result;
    };
  }
});

// packages/engine/Source/Core/WindingOrder.js
var WindingOrder = {
  /**
   * Vertices are in clockwise order.
   *
   * @type {number}
   * @constant
   */
  CLOCKWISE: WebGLConstants_default.CW,
  /**
   * Vertices are in counter-clockwise order.
   *
   * @type {number}
   * @constant
   */
  COUNTER_CLOCKWISE: WebGLConstants_default.CCW
};
WindingOrder.validate = function(windingOrder) {
  return windingOrder === WindingOrder.CLOCKWISE || windingOrder === WindingOrder.COUNTER_CLOCKWISE;
};
var WindingOrder_default = Object.freeze(WindingOrder);

// packages/engine/Source/Core/PolygonPipeline.js
var import_earcut = __toESM(require_earcut(), 1);
var scaleToGeodeticHeightN = new Cartesian3_default();
var scaleToGeodeticHeightP = new Cartesian3_default();
var PolygonPipeline = {};
PolygonPipeline.computeArea2D = function(positions) {
  Check_default.defined("positions", positions);
  Check_default.typeOf.number.greaterThanOrEquals(
    "positions.length",
    positions.length,
    3
  );
  const length = positions.length;
  let area = 0;
  for (let i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
    const v0 = positions[i0];
    const v1 = positions[i1];
    area += v0.x * v1.y - v1.x * v0.y;
  }
  return area * 0.5;
};
PolygonPipeline.computeWindingOrder2D = function(positions) {
  const area = PolygonPipeline.computeArea2D(positions);
  return area > 0 ? WindingOrder_default.COUNTER_CLOCKWISE : WindingOrder_default.CLOCKWISE;
};
PolygonPipeline.triangulate = function(positions, holes) {
  Check_default.defined("positions", positions);
  const flattenedPositions = Cartesian2_default.packArray(positions);
  return (0, import_earcut.default)(flattenedPositions, holes, 2);
};
var subdivisionV0Scratch = new Cartesian3_default();
var subdivisionV1Scratch = new Cartesian3_default();
var subdivisionV2Scratch = new Cartesian3_default();
var subdivisionS0Scratch = new Cartesian3_default();
var subdivisionS1Scratch = new Cartesian3_default();
var subdivisionS2Scratch = new Cartesian3_default();
var subdivisionMidScratch = new Cartesian3_default();
var subdivisionT0Scratch = new Cartesian2_default();
var subdivisionT1Scratch = new Cartesian2_default();
var subdivisionT2Scratch = new Cartesian2_default();
var subdivisionTexcoordMidScratch = new Cartesian2_default();
PolygonPipeline.computeSubdivision = function(ellipsoid, positions, indices, texcoords, granularity) {
  granularity = defaultValue_default(granularity, Math_default.RADIANS_PER_DEGREE);
  const hasTexcoords = defined_default(texcoords);
  Check_default.typeOf.object("ellipsoid", ellipsoid);
  Check_default.defined("positions", positions);
  Check_default.defined("indices", indices);
  Check_default.typeOf.number.greaterThanOrEquals("indices.length", indices.length, 3);
  Check_default.typeOf.number.equals("indices.length % 3", "0", indices.length % 3, 0);
  Check_default.typeOf.number.greaterThan("granularity", granularity, 0);
  const triangles = indices.slice(0);
  let i;
  const length = positions.length;
  const subdividedPositions = new Array(length * 3);
  const subdividedTexcoords = new Array(length * 2);
  let q = 0;
  let p = 0;
  for (i = 0; i < length; i++) {
    const item = positions[i];
    subdividedPositions[q++] = item.x;
    subdividedPositions[q++] = item.y;
    subdividedPositions[q++] = item.z;
    if (hasTexcoords) {
      const texcoordItem = texcoords[i];
      subdividedTexcoords[p++] = texcoordItem.x;
      subdividedTexcoords[p++] = texcoordItem.y;
    }
  }
  const subdividedIndices = [];
  const edges = {};
  const radius = ellipsoid.maximumRadius;
  const minDistance = Math_default.chordLength(granularity, radius);
  const minDistanceSqrd = minDistance * minDistance;
  while (triangles.length > 0) {
    const i2 = triangles.pop();
    const i1 = triangles.pop();
    const i0 = triangles.pop();
    const v0 = Cartesian3_default.fromArray(
      subdividedPositions,
      i0 * 3,
      subdivisionV0Scratch
    );
    const v1 = Cartesian3_default.fromArray(
      subdividedPositions,
      i1 * 3,
      subdivisionV1Scratch
    );
    const v2 = Cartesian3_default.fromArray(
      subdividedPositions,
      i2 * 3,
      subdivisionV2Scratch
    );
    let t0, t1, t2;
    if (hasTexcoords) {
      t0 = Cartesian2_default.fromArray(
        subdividedTexcoords,
        i0 * 2,
        subdivisionT0Scratch
      );
      t1 = Cartesian2_default.fromArray(
        subdividedTexcoords,
        i1 * 2,
        subdivisionT1Scratch
      );
      t2 = Cartesian2_default.fromArray(
        subdividedTexcoords,
        i2 * 2,
        subdivisionT2Scratch
      );
    }
    const s0 = Cartesian3_default.multiplyByScalar(
      Cartesian3_default.normalize(v0, subdivisionS0Scratch),
      radius,
      subdivisionS0Scratch
    );
    const s1 = Cartesian3_default.multiplyByScalar(
      Cartesian3_default.normalize(v1, subdivisionS1Scratch),
      radius,
      subdivisionS1Scratch
    );
    const s2 = Cartesian3_default.multiplyByScalar(
      Cartesian3_default.normalize(v2, subdivisionS2Scratch),
      radius,
      subdivisionS2Scratch
    );
    const g0 = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(s0, s1, subdivisionMidScratch)
    );
    const g1 = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(s1, s2, subdivisionMidScratch)
    );
    const g2 = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(s2, s0, subdivisionMidScratch)
    );
    const max = Math.max(g0, g1, g2);
    let edge;
    let mid;
    let midTexcoord;
    if (max > minDistanceSqrd) {
      if (g0 === max) {
        edge = `${Math.min(i0, i1)} ${Math.max(i0, i1)}`;
        i = edges[edge];
        if (!defined_default(i)) {
          mid = Cartesian3_default.add(v0, v1, subdivisionMidScratch);
          Cartesian3_default.multiplyByScalar(mid, 0.5, mid);
          subdividedPositions.push(mid.x, mid.y, mid.z);
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
          if (hasTexcoords) {
            midTexcoord = Cartesian2_default.add(t0, t1, subdivisionTexcoordMidScratch);
            Cartesian2_default.multiplyByScalar(midTexcoord, 0.5, midTexcoord);
            subdividedTexcoords.push(midTexcoord.x, midTexcoord.y);
          }
        }
        triangles.push(i0, i, i2);
        triangles.push(i, i1, i2);
      } else if (g1 === max) {
        edge = `${Math.min(i1, i2)} ${Math.max(i1, i2)}`;
        i = edges[edge];
        if (!defined_default(i)) {
          mid = Cartesian3_default.add(v1, v2, subdivisionMidScratch);
          Cartesian3_default.multiplyByScalar(mid, 0.5, mid);
          subdividedPositions.push(mid.x, mid.y, mid.z);
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
          if (hasTexcoords) {
            midTexcoord = Cartesian2_default.add(t1, t2, subdivisionTexcoordMidScratch);
            Cartesian2_default.multiplyByScalar(midTexcoord, 0.5, midTexcoord);
            subdividedTexcoords.push(midTexcoord.x, midTexcoord.y);
          }
        }
        triangles.push(i1, i, i0);
        triangles.push(i, i2, i0);
      } else if (g2 === max) {
        edge = `${Math.min(i2, i0)} ${Math.max(i2, i0)}`;
        i = edges[edge];
        if (!defined_default(i)) {
          mid = Cartesian3_default.add(v2, v0, subdivisionMidScratch);
          Cartesian3_default.multiplyByScalar(mid, 0.5, mid);
          subdividedPositions.push(mid.x, mid.y, mid.z);
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
          if (hasTexcoords) {
            midTexcoord = Cartesian2_default.add(t2, t0, subdivisionTexcoordMidScratch);
            Cartesian2_default.multiplyByScalar(midTexcoord, 0.5, midTexcoord);
            subdividedTexcoords.push(midTexcoord.x, midTexcoord.y);
          }
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
  const geometryOptions = {
    attributes: {
      position: new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.DOUBLE,
        componentsPerAttribute: 3,
        values: subdividedPositions
      })
    },
    indices: subdividedIndices,
    primitiveType: PrimitiveType_default.TRIANGLES
  };
  if (hasTexcoords) {
    geometryOptions.attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: subdividedTexcoords
    });
  }
  return new Geometry_default(geometryOptions);
};
var subdivisionC0Scratch = new Cartographic_default();
var subdivisionC1Scratch = new Cartographic_default();
var subdivisionC2Scratch = new Cartographic_default();
var subdivisionCartographicScratch = new Cartographic_default();
PolygonPipeline.computeRhumbLineSubdivision = function(ellipsoid, positions, indices, texcoords, granularity) {
  granularity = defaultValue_default(granularity, Math_default.RADIANS_PER_DEGREE);
  const hasTexcoords = defined_default(texcoords);
  Check_default.typeOf.object("ellipsoid", ellipsoid);
  Check_default.defined("positions", positions);
  Check_default.defined("indices", indices);
  Check_default.typeOf.number.greaterThanOrEquals("indices.length", indices.length, 3);
  Check_default.typeOf.number.equals("indices.length % 3", "0", indices.length % 3, 0);
  Check_default.typeOf.number.greaterThan("granularity", granularity, 0);
  const triangles = indices.slice(0);
  let i;
  const length = positions.length;
  const subdividedPositions = new Array(length * 3);
  const subdividedTexcoords = new Array(length * 2);
  let q = 0;
  let p = 0;
  for (i = 0; i < length; i++) {
    const item = positions[i];
    subdividedPositions[q++] = item.x;
    subdividedPositions[q++] = item.y;
    subdividedPositions[q++] = item.z;
    if (hasTexcoords) {
      const texcoordItem = texcoords[i];
      subdividedTexcoords[p++] = texcoordItem.x;
      subdividedTexcoords[p++] = texcoordItem.y;
    }
  }
  const subdividedIndices = [];
  const edges = {};
  const radius = ellipsoid.maximumRadius;
  const minDistance = Math_default.chordLength(granularity, radius);
  const rhumb0 = new EllipsoidRhumbLine_default(void 0, void 0, ellipsoid);
  const rhumb1 = new EllipsoidRhumbLine_default(void 0, void 0, ellipsoid);
  const rhumb2 = new EllipsoidRhumbLine_default(void 0, void 0, ellipsoid);
  while (triangles.length > 0) {
    const i2 = triangles.pop();
    const i1 = triangles.pop();
    const i0 = triangles.pop();
    const v0 = Cartesian3_default.fromArray(
      subdividedPositions,
      i0 * 3,
      subdivisionV0Scratch
    );
    const v1 = Cartesian3_default.fromArray(
      subdividedPositions,
      i1 * 3,
      subdivisionV1Scratch
    );
    const v2 = Cartesian3_default.fromArray(
      subdividedPositions,
      i2 * 3,
      subdivisionV2Scratch
    );
    let t0, t1, t2;
    if (hasTexcoords) {
      t0 = Cartesian2_default.fromArray(
        subdividedTexcoords,
        i0 * 2,
        subdivisionT0Scratch
      );
      t1 = Cartesian2_default.fromArray(
        subdividedTexcoords,
        i1 * 2,
        subdivisionT1Scratch
      );
      t2 = Cartesian2_default.fromArray(
        subdividedTexcoords,
        i2 * 2,
        subdivisionT2Scratch
      );
    }
    const c0 = ellipsoid.cartesianToCartographic(v0, subdivisionC0Scratch);
    const c1 = ellipsoid.cartesianToCartographic(v1, subdivisionC1Scratch);
    const c2 = ellipsoid.cartesianToCartographic(v2, subdivisionC2Scratch);
    rhumb0.setEndPoints(c0, c1);
    const g0 = rhumb0.surfaceDistance;
    rhumb1.setEndPoints(c1, c2);
    const g1 = rhumb1.surfaceDistance;
    rhumb2.setEndPoints(c2, c0);
    const g2 = rhumb2.surfaceDistance;
    const max = Math.max(g0, g1, g2);
    let edge;
    let mid;
    let midHeight;
    let midCartesian3;
    let midTexcoord;
    if (max > minDistance) {
      if (g0 === max) {
        edge = `${Math.min(i0, i1)} ${Math.max(i0, i1)}`;
        i = edges[edge];
        if (!defined_default(i)) {
          mid = rhumb0.interpolateUsingFraction(
            0.5,
            subdivisionCartographicScratch
          );
          midHeight = (c0.height + c1.height) * 0.5;
          midCartesian3 = Cartesian3_default.fromRadians(
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
          if (hasTexcoords) {
            midTexcoord = Cartesian2_default.add(t0, t1, subdivisionTexcoordMidScratch);
            Cartesian2_default.multiplyByScalar(midTexcoord, 0.5, midTexcoord);
            subdividedTexcoords.push(midTexcoord.x, midTexcoord.y);
          }
        }
        triangles.push(i0, i, i2);
        triangles.push(i, i1, i2);
      } else if (g1 === max) {
        edge = `${Math.min(i1, i2)} ${Math.max(i1, i2)}`;
        i = edges[edge];
        if (!defined_default(i)) {
          mid = rhumb1.interpolateUsingFraction(
            0.5,
            subdivisionCartographicScratch
          );
          midHeight = (c1.height + c2.height) * 0.5;
          midCartesian3 = Cartesian3_default.fromRadians(
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
          if (hasTexcoords) {
            midTexcoord = Cartesian2_default.add(t1, t2, subdivisionTexcoordMidScratch);
            Cartesian2_default.multiplyByScalar(midTexcoord, 0.5, midTexcoord);
            subdividedTexcoords.push(midTexcoord.x, midTexcoord.y);
          }
        }
        triangles.push(i1, i, i0);
        triangles.push(i, i2, i0);
      } else if (g2 === max) {
        edge = `${Math.min(i2, i0)} ${Math.max(i2, i0)}`;
        i = edges[edge];
        if (!defined_default(i)) {
          mid = rhumb2.interpolateUsingFraction(
            0.5,
            subdivisionCartographicScratch
          );
          midHeight = (c2.height + c0.height) * 0.5;
          midCartesian3 = Cartesian3_default.fromRadians(
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
          if (hasTexcoords) {
            midTexcoord = Cartesian2_default.add(t2, t0, subdivisionTexcoordMidScratch);
            Cartesian2_default.multiplyByScalar(midTexcoord, 0.5, midTexcoord);
            subdividedTexcoords.push(midTexcoord.x, midTexcoord.y);
          }
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
  const geometryOptions = {
    attributes: {
      position: new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.DOUBLE,
        componentsPerAttribute: 3,
        values: subdividedPositions
      })
    },
    indices: subdividedIndices,
    primitiveType: PrimitiveType_default.TRIANGLES
  };
  if (hasTexcoords) {
    geometryOptions.attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: subdividedTexcoords
    });
  }
  return new Geometry_default(geometryOptions);
};
PolygonPipeline.scaleToGeodeticHeight = function(positions, height, ellipsoid, scaleToSurface) {
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  let n = scaleToGeodeticHeightN;
  let p = scaleToGeodeticHeightP;
  height = defaultValue_default(height, 0);
  scaleToSurface = defaultValue_default(scaleToSurface, true);
  if (defined_default(positions)) {
    const length = positions.length;
    for (let i = 0; i < length; i += 3) {
      Cartesian3_default.fromArray(positions, i, p);
      if (scaleToSurface) {
        p = ellipsoid.scaleToGeodeticSurface(p, p);
      }
      if (height !== 0) {
        n = ellipsoid.geodeticSurfaceNormal(p, n);
        Cartesian3_default.multiplyByScalar(n, height, n);
        Cartesian3_default.add(p, n, p);
      }
      positions[i] = p.x;
      positions[i + 1] = p.y;
      positions[i + 2] = p.z;
    }
  }
  return positions;
};
var PolygonPipeline_default = PolygonPipeline;

export {
  WindingOrder_default,
  PolygonPipeline_default
};
