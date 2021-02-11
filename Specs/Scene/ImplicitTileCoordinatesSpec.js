import {
  ImplicitSubdivisionScheme,
  ImplicitTileCoordinates,
} from "../../Source/Cesium.js";

describe("Scene/ImplicitTileCoordinates", function () {
  it("constructs quadtree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      level: 4,
      x: 3,
      y: 2,
    });

    expect(coordinates.subdivisionScheme).toEqual(
      ImplicitSubdivisionScheme.QUADTREE
    );
    expect(coordinates.level).toEqual(4);
    expect(coordinates.x).toEqual(3);
    expect(coordinates.y).toEqual(2);
    expect(coordinates.z).not.toBeDefined();
  });

  it("constructs octree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      level: 4,
      x: 3,
      y: 2,
      z: 1,
    });

    expect(coordinates.subdivisionScheme).toEqual(
      ImplicitSubdivisionScheme.OCTREE
    );
    expect(coordinates.level).toEqual(4);
    expect(coordinates.x).toEqual(3);
    expect(coordinates.y).toEqual(2);
    expect(coordinates.z).toEqual(1);
  });

  it("derives child quadtree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      level: 1,
      x: 0,
      y: 0,
    });

    var expectedChildren = [
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        level: 2,
        x: 0,
        y: 0,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        level: 2,
        x: 1,
        y: 0,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        level: 2,
        x: 0,
        y: 1,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        level: 2,
        x: 1,
        y: 1,
      },
    ];

    for (var i = 0; i < expectedChildren.length; i++) {
      var expected = new ImplicitTileCoordinates(expectedChildren[i]);
      expect(coordinates.deriveChildCoordinates(i)).toEqual(expected);
    }
  });

  it("derives child octree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      level: 1,
      x: 0,
      y: 1,
      z: 1,
    });

    var expectedChildren = [
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 0,
        y: 2,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 1,
        y: 2,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 0,
        y: 3,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 1,
        y: 3,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 0,
        y: 2,
        z: 3,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 1,
        y: 2,
        z: 3,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 0,
        y: 3,
        z: 3,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        level: 2,
        x: 1,
        y: 3,
        z: 3,
      },
    ];

    for (var i = 0; i < expectedChildren.length; i++) {
      var expected = new ImplicitTileCoordinates(expectedChildren[i]);
      expect(coordinates.deriveChildCoordinates(i)).toEqual(expected);
    }
  });

  it("gets the child index for quadtree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      level: 4,
      x: 3,
      y: 2,
    });
    // interleaving the last bit of x, y gives 0b01 = 1
    expect(coordinates.childIndex).toEqual(1);
  });

  it("gets the child index for octree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      level: 4,
      x: 3,
      y: 2,
      z: 1,
    });
    // interleaving the last bit of z, x, y gives 0b101 = 5
    expect(coordinates.childIndex).toEqual(5);
  });

  it("computes the morton index for quadtree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      level: 4,
      x: 5,
      y: 11,
    });

    // x = 5 =  0b0101
    // y = 11 = 0b1011
    // interleave(y, x) = 0b10011011 = 155
    expect(coordinates.mortonIndex).toEqual(155);
  });

  it("computes the morton index for octree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      level: 4,
      x: 7,
      y: 15,
      z: 32,
    });

    // x = 7 =  0b000111
    // y = 15 = 0b001111
    // z = 32 = 0b100000
    // interleave(z, y, x) = 0b100000010011011011 = 132315
    expect(coordinates.mortonIndex).toEqual(132315);
  });

  it("constructs quadtree coordinates from morton index", function () {
    // 42 = 0b101010
    // deinterleave2D(42) = [0b111, 0b000] = [7, 0] = [y, x]
    var coordinates = ImplicitTileCoordinates.fromMortonIndex(
      ImplicitSubdivisionScheme.QUADTREE,
      3,
      42
    );
    var expected = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      level: 3,
      x: 0,
      y: 7,
    });

    expect(coordinates).toEqual(expected);
  });

  it("constructs octree coordinates from morton index", function () {
    // 43 = 0b101011
    // deinterleave3D(43) = [0b10, 0b01, 0b11] = [2, 1, 3] = [z, y, x]
    var coordinates = ImplicitTileCoordinates.fromMortonIndex(
      ImplicitSubdivisionScheme.OCTREE,
      2,
      43
    );
    var expected = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      level: 2,
      x: 3,
      y: 1,
      z: 2,
    });

    expect(coordinates).toEqual(expected);
  });

  it("computes quadtree template values", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      level: 4,
      x: 3,
      y: 2,
    });
    expect(coordinates.getTemplateValues()).toEqual({
      level: 4,
      x: 3,
      y: 2,
    });
  });

  it("computes octree template values", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      level: 4,
      x: 3,
      y: 2,
      z: 1,
    });
    expect(coordinates.getTemplateValues()).toEqual({
      level: 4,
      x: 3,
      y: 2,
      z: 1,
    });
  });
});
