import defaultValue from "../Core/defaultValue.js";
import Cartesian2 from "../Core/Cartesian2.js";
import DeveloperError from "../Core/DeveloperError.js";

// https://stackoverflow.com/a/2049593
function sign(ax, ay, bx, by, cx, cy) {
  return (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
}

/**
 * Detect if a point is inside of a triangle.
 * @param {Number} px x location of point to test
 * @param {Number} py y location of point to test
 * @param {Number} ax x position of first triangle vertex
 * @param {Number} ay y position of first triangle vertex
 * @param {Number} bx x position of second triangle vertex
 * @param {Number} by y position of second triangle vertex
 * @param {Number} cx x position of third triangle vertex
 * @param {Number} cy y position of third triangle vertex
 */

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  var d1 = sign(px, py, ax, ay, bx, by);
  var d2 = sign(px, py, bx, by, cx, cy);
  var d3 = sign(px, py, cx, cy, ax, ay);
  var isNegative = d1 < 0 || d2 < 0 || d3 < 0;
  var isPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(isNegative && isPositive);
}

function pointInsideRect(rect, px, py) {
  var leftWall = px <= rect.topRight.x;
  var rightWall = px >= rect.topLeft.x;
  var topWall = py <= rect.topLeft.y;
  var btmWall = py >= rect.btmRight.y;
  return leftWall && rightWall && topWall && btmWall;
}

// https://stackoverflow.com/a/58657254
export function lineIntersection(s1x, s1y, t1x, t1y, s2x, s2y, t2x, t2y) {
  var dX = t1x - s1x;
  var dY = t1y - s1y;

  var determinant = dX * (t2y - s2y) - (t2x - s2x) * dY;
  if (determinant === 0) return null; // parallel lines

  var lambda =
    ((t2y - s2y) * (t2x - s1x) + (s2x - t2x) * (t2y - s1y)) / determinant;

  var gamma = ((s1y - t1y) * (t2x - s1x) + dX * (t2y - s1y)) / determinant;

  // check if there is an lineIntersection
  if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) return null;

  return {
    x: s1x + lambda * dX,
    y: s1y + lambda * dY,
  };
}

function doesTriangleIntersectRect(rect, ax, ay, bx, by, cx, cy) {
  // check if the points are inside the rectangle
  var leftWall = ax <= rect.topRight.x;
  var rightWall = ax >= rect.topLeft.x;
  var topWall = ay <= rect.topLeft.y;
  var btmWall = ay >= rect.btmRight.y;

  if (leftWall && rightWall && topWall && btmWall) {
    return true;
  }

  leftWall = bx <= rect.topRight.x;
  rightWall = bx >= rect.topLeft.x;
  topWall = by <= rect.topLeft.y;
  btmWall = by >= rect.btmRight.y;

  if (leftWall && rightWall && topWall && btmWall) {
    return true;
  }

  leftWall = cx <= rect.topRight.x;
  rightWall = cx >= rect.topLeft.x;
  topWall = cy <= rect.topLeft.y;
  btmWall = cy >= rect.btmRight.y;

  if (leftWall && rightWall && topWall && btmWall) {
    return true;
  }

  if (
    lineIntersection(
      rect.topLeft.x,
      rect.topLeft.y,
      rect.topRight.x,
      rect.topRight.y,
      ax,
      ay,
      bx,
      by
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.btmLeft.x,
      rect.btmLeft.y,
      rect.btmRight.x,
      rect.btmRight.y,
      ax,
      ay,
      bx,
      by
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.topLeft.x,
      rect.topLeft.y,
      rect.btmLeft.x,
      rect.btmRight.y,
      ax,
      ay,
      bx,
      by
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.topRight.x,
      rect.topRight.y,
      rect.btmRight.x,
      rect.btmRight.y,
      ax,
      ay,
      bx,
      by
    ) !== null
  )
    return true;

  if (
    lineIntersection(
      rect.topLeft.x,
      rect.topLeft.y,
      rect.topRight.x,
      rect.topRight.y,
      bx,
      by,
      cx,
      cy
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.btmLeft.x,
      rect.btmLeft.y,
      rect.btmRight.x,
      rect.btmRight.y,
      bx,
      by,
      cx,
      cy
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.topLeft.x,
      rect.topLeft.y,
      rect.btmLeft.x,
      rect.btmRight.y,
      bx,
      by,
      cx,
      cy
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.topRight.x,
      rect.topRight.y,
      rect.btmRight.x,
      rect.btmRight.y,
      bx,
      by,
      cx,
      cy
    ) !== null
  )
    return true;

  if (
    lineIntersection(
      rect.topLeft.x,
      rect.topLeft.y,
      rect.topRight.x,
      rect.topRight.y,
      ax,
      ay,
      cx,
      cy
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.btmLeft.x,
      rect.btmLeft.y,
      rect.btmRight.x,
      rect.btmRight.y,
      ax,
      ay,
      cx,
      cy
    ) !== null
  )
    return true;
  if (
    lineIntersection(
      rect.topLeft.x,
      rect.topLeft.y,
      rect.btmLeft.x,
      rect.btmRight.y,
      ax,
      ay,
      cx,
      cy
    ) !== null
  )
    return true;

  return (
    lineIntersection(
      rect.topRight.x,
      rect.topRight.y,
      rect.btmRight.x,
      rect.btmRight.y,
      ax,
      ay,
      cx,
      cy
    ) !== null
  );
}

function doesTriangleOverlapRect(rect, ax, ay, bx, by, cx, cy) {
  var r = rect;

  if (!pointInTriangle(r.topLeft.x, r.topLeft.y, ax, ay, bx, by, cx, cy)) {
    return false;
  }

  if (!pointInTriangle(r.topRight.x, r.topRight.y, ax, ay, bx, by, cx, cy)) {
    return false;
  }

  if (!pointInTriangle(r.btmRight.x, r.btmRight.y, ax, ay, bx, by, cx, cy)) {
    return false;
  }

  return pointInTriangle(r.btmLeft.x, r.btmLeft.y, ax, ay, bx, by, cx, cy);
}

/**
 * Construct a 2D bounding box from a provided triangulated
 * mesh.
 *
 * @param {Object} options Object with the following properties:
 * @param {Array.<Number>} options.positions An array of position data
 * representing the clipping mesh. The bounding box is constructed around the
 * XY axis, Z is ignored.
 * @param {Array.<Number>} options.indices Triangle index data corresponding
 * to the positions data.
 *
 * @private
 */

function ClippingBoundingBox2D(options) {
  var positions = options.positions;
  var indices = options.indices;

  var minX = Infinity;
  var minY = Infinity;
  var maxX = -Infinity;
  var maxY = -Infinity;

  var i;
  for (i = 0; i < indices.length; i += 3) {
    var ax = positions[indices[i] * 3];
    var ay = positions[indices[i] * 3 + 1];
    var bx = positions[indices[i + 1] * 3];
    var by = positions[indices[i + 1] * 3 + 1];
    var cx = positions[indices[i + 2] * 3];
    var cy = positions[indices[i + 2] * 3 + 1];

    minX = Math.min(ax, minX);
    minX = Math.min(bx, minX);
    minX = Math.min(cx, minX);
    minY = Math.min(ay, minY);
    minY = Math.min(by, minY);
    minY = Math.min(cy, minY);

    maxX = Math.max(ax, maxX);
    maxX = Math.max(bx, maxX);
    maxX = Math.max(cx, maxX);
    maxY = Math.max(ay, maxY);
    maxY = Math.max(by, maxY);
    maxY = Math.max(cy, maxY);
  }

  this.topLeft = { x: minX, y: maxY };
  this.topRight = { x: maxX, y: maxY };
  this.btmRight = { x: maxX, y: minY };
  this.btmLeft = { x: minX, y: minY };
  this.width = this.topRight.x - this.topLeft.x;
  this.height = this.topRight.y - this.btmRight.y;
}

ClippingBoundingBox2D.prototype.toClockwiseCartesian2Pairs = function () {
  return [
    new Cartesian2(this.topLeft.x, this.topLeft.y),
    new Cartesian2(this.topRight.x, this.topRight.y),
    new Cartesian2(this.btmRight.x, this.btmRight.y),
    new Cartesian2(this.btmLeft.x, this.btmLeft.y),
  ];
};

PolygonClippingAccelerationGrid.CellOcclusion = {
  None: 1,
  Partial: 2,
  Total: 3,
};

/**
 * Creates multiple data textures for accelerating point in polygon queries
 * against an inputted mesh. The first data texture, 'grid', is a 2D array with (splits + 1)^2 partitions
 * where each cell records the occlusion status of that cell with respect to all of the
 * triangles in the inputted mesh. If a cell is completely occluded by at least
 * one triangle in the mesh (CellOcclusion.Total) or a cell is not occluded
 * by any triangles in the mesh (CellOcclusion.None) then the respective
 * constant is written to grids[i * 3] where `i` is the 1D index
 * of the 2D location in the grid array (obtained via (row * this.numCols) + col).
 *
 * If the cell is partially occluded by at least one triangle, then the constant
 * CellOcclusion.Partial is written to grids[i * 3], and a list of each triangle
 * that partially intersects this cell is inserted into 'overlappingTriangleIndices',
 * and the inclusive / exclusive index of where to read those values is stored
 * stored in grids[(i * 3) + 1] and grids[(i * 3) + 2] respectively.
 *
 * @alias PolygonClippingAccelerationGrid
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Array.<Number>} options.positions An array of position data
 * representing the clipping mesh. Note that this function only supports
 * generating 2D clipping data, so one dimension of data will always be
 * thrown away.
 * @param {Array.<Number>} options.indices Triangle index data corresponding
 * to the positions data.
 * @param {Number} [options.splits-32] The number of cells to place in the
 * polygon clipping acceleration grid. Will generate (splits + 1)^2 cells.
 * @private
 */
function PolygonClippingAccelerationGrid(options) {
  this.overlappingTriangleIndices = undefined;
  var positions = defaultValue(options.positions, []);
  var indices = defaultValue(options.indices, []);
  var splits = defaultValue(options.splits, 32);

  if (positions.length < 3) {
    throw new DeveloperError(
      "PolygonClippingAccelerationGrid requires at least 3 positions, " +
        "(Found " +
        options.positions.length +
        " instead)."
    );
  }

  if (indices.length < 3 || indices.length % 3 !== 0) {
    throw new DeveloperError(
      "PolygonClippingAccelerationGrid requires indices is non-zero" +
        " and a multiple of three"
    );
  }

  var bbox = new ClippingBoundingBox2D(options);

  // each cell is 3 numbers (occlusion status, start index, end index)
  var cellNumElements = 3;
  this.numCols = splits + 1;
  this.numRows = this.numCols; // always square for now
  var numCells = this.numCols * this.numRows;

  var allOverlappingTriangles = [];
  this.grid = new Float32Array(numCells * cellNumElements);
  this.cellWidth = bbox.width / this.numCols;
  this.cellHeight = bbox.height / this.numRows;
  this.boundingBox = bbox;
  this.cellNumElements = cellNumElements;

  var row;
  var col;

  for (row = 0; row < this.numRows; ++row) {
    for (col = 0; col < this.numCols; ++col) {
      var cellTopLeft = {
        x: bbox.topLeft.x + col * this.cellWidth,
        y: bbox.topRight.y - this.cellHeight * row,
      };

      var cellTopRight = {
        x: bbox.topLeft.x + (col + 1) * this.cellWidth,
        y: cellTopLeft.y,
      };

      var cellBtmRight = {
        x: cellTopRight.x,
        y: bbox.topRight.y - this.cellHeight * (row + 1),
      };

      var cellBtmLeft = {
        x: cellTopLeft.x,
        y: cellBtmRight.y,
      };

      var cell = {
        topLeft: cellTopLeft,
        topRight: cellTopRight,
        btmRight: cellBtmRight,
        btmLeft: cellBtmLeft,
      };

      var cellIsIndeterminate = false;
      var cellIsCompletelyOccluded = false;
      var partiallyOverlappingTriangleIndices = [];

      for (let i = 0; i < indices.length; i += 3) {
        var ax = positions[indices[i] * 3];
        var ay = positions[indices[i] * 3 + 1];
        var bx = positions[indices[i + 1] * 3];
        var by = positions[indices[i + 1] * 3 + 1];
        var cx = positions[indices[i + 2] * 3];
        var cy = positions[indices[i + 2] * 3 + 1];

        // if the edge of this triangle intersects with the cell
        // then the cell is indeterminate
        if (doesTriangleIntersectRect(cell, ax, ay, bx, by, cx, cy)) {
          cellIsIndeterminate = true;
          var i0 = indices[i];
          var i1 = indices[i + 1];
          var i2 = indices[i + 2];
          partiallyOverlappingTriangleIndices.push(i0, i1, i2);
        }

        if (doesTriangleOverlapRect(cell, ax, ay, bx, by, cx, cy)) {
          cellIsCompletelyOccluded = true;
          cellIsIndeterminate = false;
          partiallyOverlappingTriangleIndices = [];
          break;
        }
      }

      var cellIndex = (row * this.numCols + col) * cellNumElements;

      // if the cell is indeterminate we record all the overlapping
      if (cellIsIndeterminate) {
        this.grid[cellIndex] =
          PolygonClippingAccelerationGrid.CellOcclusion.Partial;
        var startIndex = allOverlappingTriangles.length;
        var endIndex = startIndex + partiallyOverlappingTriangleIndices.length;
        this.grid[cellIndex + 1] = startIndex;
        this.grid[cellIndex + 2] = endIndex;
        allOverlappingTriangles = allOverlappingTriangles.concat(
          partiallyOverlappingTriangleIndices
        );
      } else if (cellIsCompletelyOccluded) {
        this.grid[cellIndex] =
          PolygonClippingAccelerationGrid.CellOcclusion.Total;
      } else {
        this.grid[cellIndex] =
          PolygonClippingAccelerationGrid.CellOcclusion.None;
      }
    }
  }

  this.overlappingTriangleIndices = Float32Array.from(allOverlappingTriangles);
}

PolygonClippingAccelerationGrid.prototype.getCellFromWorldPosition = function (
  px,
  py
) {
  if (!pointInsideRect(this.boundingBox, px, py)) {
    return null;
  }

  var screenX = px + this.boundingBox.width / 2.0;
  var screenY = -py + this.boundingBox.height / 2.0;
  var row = Math.floor(screenY / this.cellHeight);
  var col = Math.floor(screenX / this.cellWidth);
  var gridIndex = (row * this.numCols + col) * this.cellNumElements;
  var cell = this.grid[gridIndex];

  return {
    status: cell,
    startIndex: this.grid[gridIndex + 1],
    endIndex: this.grid[gridIndex + 2],
    row: row,
    col: col,
  };
};

export default PolygonClippingAccelerationGrid;
