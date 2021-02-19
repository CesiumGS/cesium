import QuadtreeTrianglePicker from "../../Source/Core/QuadtreeTrianglePicker.js";
import Cartesian3 from "../../Source/Core/Cartesian3.js";

describe("Core/QuadtreeTrianglePicker", function () {
  function createPositionArray(width) {
    var positions = [];
    var row = 0;
    var col = 0;
    var i = 0;
    while (row < width) {
      var rowPositions = [];
      positions.push(rowPositions);
      while (col < width) {
        rowPositions.push([i, i, i]);
        i++;
        col++;
      }
      row++;
      col = 0;
    }
    return positions.flat(2);
  }

  it("get a position the heightmap positions", function () {
    var width = 3;
    var positions = createPositionArray(width);

    var getPos = QuadtreeTrianglePicker.getPosition;

    expect(getPos(positions, width, 0, 0)).toEqual(new Cartesian3(0, 0, 0));
    expect(getPos(positions, width, 0, 1)).toEqual(new Cartesian3(1, 1, 1));
    expect(getPos(positions, width, 0, 2)).toEqual(new Cartesian3(2, 2, 2));
    expect(getPos(positions, width, 1, 0)).toEqual(new Cartesian3(3, 3, 3));
    expect(getPos(positions, width, 1, 1)).toEqual(new Cartesian3(4, 4, 4));
    expect(getPos(positions, width, 1, 2)).toEqual(new Cartesian3(5, 5, 5));
    expect(getPos(positions, width, 2, 0)).toEqual(new Cartesian3(6, 6, 6));
    expect(getPos(positions, width, 2, 1)).toEqual(new Cartesian3(7, 7, 7));
    expect(getPos(positions, width, 2, 2)).toEqual(new Cartesian3(8, 8, 8));
  });

  it("should pick all positions for a root node", function () {
    var width = 8;
    var positions = createPositionArray(width);
    var allPositions = QuadtreeTrianglePicker.getPositionsInSegment(
      positions,
      width,
      -0.5,
      -0.5,
      0
    );
    expect(allPositions.length).toEqual(64);
  });

  it("should pick all positions for the top left node", function () {
    var width = 8;
    var positions = createPositionArray(width);
    var allPositions = QuadtreeTrianglePicker.getPositionsInSegment(
      positions,
      width,
      -0.5,
      -0.5,
      1
    );
    expect(
      allPositions.map(function (p) {
        return [p.x, p.y, p.z];
      })
    ).toEqual([
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [8, 8, 8],
      [9, 9, 9],
      [10, 10, 10],
      [11, 11, 11],
      [16, 16, 16],
      [17, 17, 17],
      [18, 18, 18],
      [19, 19, 19],
      [24, 24, 24],
      [25, 25, 25],
      [26, 26, 26],
      [27, 27, 27],
    ]);
  });

  it("should pick all positions for the top left node at level 2", function () {
    var width = 8;
    var positions = createPositionArray(width);
    var allPositions = QuadtreeTrianglePicker.getPositionsInSegment(
      positions,
      width,
      -0.5,
      -0.5,
      2
    );
    expect(
      allPositions.map(function (p) {
        return [p.x, p.y, p.z];
      })
    ).toEqual([
      [0, 0, 0],
      [1, 1, 1],
      [8, 8, 8],
      [9, 9, 9],
    ]);
  });
});
