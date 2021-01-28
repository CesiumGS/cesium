import {
  ImplicitSubdivisionScheme,
  ImplicitTileCoordinates,
} from "../../Source/Cesium.js";

fdescribe("Scene/ImplicitTileCoordinates", function () {
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
});
