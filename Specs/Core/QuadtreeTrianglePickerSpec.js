import QuadtreeTrianglePicker from "../../Source/Core/QuadtreeTrianglePicker.js";
import Cartesian3 from "../../Source/Core/Cartesian3.js";

describe("Core/QuadtreeTrianglePicker", function () {
  function createPositionArray(width, hasSkirting) {
    var positions = [];
    var row = 0;
    var col = 0;
    var i = 0;
    var rowPositions;

    while (row < width) {
      rowPositions = [];
      positions.push(rowPositions);
      while (col < width) {
        rowPositions.push([i, i, i]);
        i++;
        col++;
      }
      row++;
      col = 0;
    }

    if (hasSkirting) {
      row = 0;
      col = 0;
      while (row < 4) {
        rowPositions = [];
        positions.push(rowPositions);
        while (col < width) {
          rowPositions.push([-1, -1, -1]);
          i++;
          col++;
        }
        row++;
        col = 0;
      }
    }

    return positions.flat(2);
  }

  it("get a position the heightmap positions with no skirting", function () {
    var width = 3;
    var positions = createPositionArray(width, false);

    var getPos = function (row, col) {
      return QuadtreeTrianglePicker.getPosition(
        positions,
        width,
        width,
        row,
        col,
        false
      );
    };

    // 0, 1, 2
    // 3, 4, 5
    // 6, 7, 8

    // we invert the Y axis for some reason - I'm not sure why yet.
    //  so row 0,1,2 is swapped with 6,7,8 here
    expect(getPos(0, 0)).toEqual(new Cartesian3(6, 6, 6));
    expect(getPos(0, 1)).toEqual(new Cartesian3(7, 7, 7));
    expect(getPos(0, 2)).toEqual(new Cartesian3(8, 8, 8));
    expect(getPos(1, 0)).toEqual(new Cartesian3(3, 3, 3));
    expect(getPos(1, 1)).toEqual(new Cartesian3(4, 4, 4));
    expect(getPos(1, 2)).toEqual(new Cartesian3(5, 5, 5));
    expect(getPos(2, 0)).toEqual(new Cartesian3(0, 0, 0));
    expect(getPos(2, 1)).toEqual(new Cartesian3(1, 1, 1));
    expect(getPos(2, 2)).toEqual(new Cartesian3(2, 2, 2));
  });

  it("get a position the heightmap positions with skirting", function () {
    var width = 3;
    var positions = createPositionArray(width, true);

    var getPos = function (row, col) {
      return QuadtreeTrianglePicker.getPosition(
        positions,
        width,
        width,
        row,
        col,
        true
      );
    };

    // 0, 1, 2
    // 3, 4, 5
    // 6, 7, 8
    // x, x, x  -- skirting row
    // x, x, x  -- skirting row
    // x, x, x  -- skirting row
    // x, x, x  -- skirting row

    // we invert the Y axis for some reason - I'm not sure why yet.
    //  so row 0,1,2 is swapped with 6,7,8 here
    expect(getPos(0, 0)).toEqual(new Cartesian3(6, 6, 6));
    expect(getPos(0, 1)).toEqual(new Cartesian3(7, 7, 7));
    expect(getPos(0, 2)).toEqual(new Cartesian3(8, 8, 8));
    expect(getPos(1, 0)).toEqual(new Cartesian3(3, 3, 3));
    expect(getPos(1, 1)).toEqual(new Cartesian3(4, 4, 4));
    expect(getPos(1, 2)).toEqual(new Cartesian3(5, 5, 5));
    expect(getPos(2, 0)).toEqual(new Cartesian3(0, 0, 0));
    expect(getPos(2, 1)).toEqual(new Cartesian3(1, 1, 1));
    expect(getPos(2, 2)).toEqual(new Cartesian3(2, 2, 2));
  });

  describe("with a width of 8", function () {
    Math.floor();
    // Probably unlikely to get a even width like this; at least for ArcGIS (width of 8 here)
    //
    //           0       1       2       3       4       5       6       7
    // -0.5,-0.5 +-------------+-------------+-------------+-------------+
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           +-------------+-------------+-------------+-------------+
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           +-------------+-------------+-------------+-------------+
    //           |             |             |0,0          |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           +-------------+-------------+-------------+-------------+
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           |             |             |             |             |
    //           +-------------+-------------+-------------+-------------+ 0.5,0.5
    it("should suggest iterating the entire node at root level", function () {
      var result = QuadtreeTrianglePicker.getDimensionBounds(
        0,
        8,
        8,
        -0.5,
        -0.5
      );
      expect(result.columnStart).toEqual(0);
      expect(result.columnEnd).toEqual(7);
      expect(result.rowStart).toEqual(0);
      expect(result.rowEnd).toEqual(7);
    });

    it("should iterate the top left at level 1", function () {
      var result = QuadtreeTrianglePicker.getDimensionBounds(
        1,
        8,
        8,
        -0.5,
        -0.5
      );
      expect(result.columnStart).toEqual(0);
      expect(result.columnEnd).toEqual(3);
      expect(result.rowStart).toEqual(0);
      expect(result.rowEnd).toEqual(3);
    });

    it("should iterate the top right at level 1", function () {
      var result = QuadtreeTrianglePicker.getDimensionBounds(1, 8, 8, 0, -0.5);
      expect(result.columnStart).toEqual(3);
      expect(result.columnEnd).toEqual(7);
      expect(result.rowStart).toEqual(0);
      expect(result.rowEnd).toEqual(3);
    });

    it("should iterate the bottom left at level 1", function () {
      var result = QuadtreeTrianglePicker.getDimensionBounds(1, 8, 8, -0.5, 0);
      expect(result.columnStart).toEqual(0);
      expect(result.columnEnd).toEqual(3);
      expect(result.rowStart).toEqual(3);
      expect(result.rowEnd).toEqual(7);
    });

    it("should iterate the bottom right at level 1", function () {
      var result = QuadtreeTrianglePicker.getDimensionBounds(1, 8, 8, 0, 0);
      expect(result.columnStart).toEqual(3);
      expect(result.columnEnd).toEqual(7);
      expect(result.rowStart).toEqual(3);
      expect(result.rowEnd).toEqual(7);
    });
  });

  describe("with a width of 9", function () {
    // I think you're more likely to get an odd width tile like this so it fits evenly (width of 9 points here)
    //
    //
    //           0     1      2      3     4      5     6      7     8
    // -0.5,-0.5 +------------+------------+------------+------------+
    //           |            |            |            |            |
    //           |            |            |            |            |
    //          1|            |            |            |            |
    //           |            |            |            |            |
    //           |            |            |            |            |
    //          2+------------+------------+------------+------------+
    //           |            |            |            |            |
    //           |            |            |            |            |
    //          3|            |            |            |            |
    //           |            |            |            |            |
    //           |            |            |            |            |
    //          4+------------+------------+------------+------------+
    //           |            |            |0,0         |            |
    //           |            |            |            |            |
    //          5|            |            |            |            |
    //           |            |            |            |            |
    //           |            |            |            |            |
    //          6+------------+------------+------------+------------+
    //           |            |            |            |            |
    //           |            |            |            |            |
    //          7|            |            |            |            |
    //           |            |            |            |            |
    //           |            |            |            |            |
    //          8+------------+------------+------------+------------+ 0.5,0.5
    it("should iterate the top left of bottom right at level 2", function () {
      var result = QuadtreeTrianglePicker.getDimensionBounds(2, 9, 9, 0, 0);
      expect(result.columnStart).toEqual(4);
      expect(result.columnEnd).toEqual(6);
      expect(result.rowStart).toEqual(4);
      expect(result.rowEnd).toEqual(6);
    });
  });
});
