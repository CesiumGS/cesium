import {
  ImplicitSubdivisionScheme,
  ImplicitTileCoordinates,
} from "../../Source/Cesium.js";

describe("Scene/ImplicitTileCoordinates", function () {
  function internalQuadtree(level, x, y) {
    return new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 2,
      level: level,
      x: x,
      y: y,
    });
  }
  function internalOctree(level, x, y, z) {
    return new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: 2,
      level: level,
      x: x,
      y: y,
      z: z,
    });
  }

  it("constructs quadtree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
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
      subtreeLevels: 6,
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

  it("constructor throws with invalid inputs for quadree", function () {
    // negative level
    expect(function () {
      internalQuadtree(-1, 0, 0);
    }).toThrowDeveloperError();

    // negative x
    expect(function () {
      internalQuadtree(0, -1, 0);
    }).toThrowDeveloperError();

    // negative y
    expect(function () {
      internalQuadtree(0, 0, -1);
    }).toThrowDeveloperError();

    // out of range x
    expect(function () {
      internalQuadtree(0, 4, 0);
    }).toThrowDeveloperError();

    // out of range y
    expect(function () {
      internalQuadtree(0, 0, 4);
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid inputs for octree", function () {
    // negative z
    expect(function () {
      internalOctree(0, 0, 0, -1);
    }).toThrowDeveloperError();

    // out of range z
    expect(function () {
      internalOctree(0, 0, 0, 4);
    }).toThrowDeveloperError();
  });

  it("getDescendantCoordinates throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      internalQuadtree(0, 0, 0).getDescendantCoordinates(undefined);
    }).toThrowDeveloperError();

    // mismatched subdivisionScheme
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).getDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
          z: 0,
        })
      );
    }).toThrowDeveloperError();

    // mismatched subtreeLevels
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).getDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 3,
          level: 0,
          x: 0,
          y: 0,
        })
      );
    }).toThrowDeveloperError();
  });

  it("getDescendantCoordinates works as expected for quadtree", function () {
    expect(
      internalQuadtree(0, 0, 0)
        .getDescendantCoordinates(internalQuadtree(0, 0, 0))
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(0, 0, 0)
        .getDescendantCoordinates(internalQuadtree(1, 1, 1))
        .isEqual(internalQuadtree(1, 1, 1))
    ).toEqual(true);

    expect(
      internalQuadtree(1, 1, 1)
        .getDescendantCoordinates(internalQuadtree(2, 3, 3))
        .isEqual(internalQuadtree(3, 7, 7))
    ).toEqual(true);
  });

  it("getDescendantCoordinates works as expected for octree", function () {
    expect(
      internalOctree(0, 0, 0, 0)
        .getDescendantCoordinates(internalOctree(0, 0, 0, 0))
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(0, 0, 0, 0)
        .getDescendantCoordinates(internalOctree(1, 1, 1, 1))
        .isEqual(internalOctree(1, 1, 1, 1))
    ).toEqual(true);

    expect(
      internalOctree(1, 1, 1, 1)
        .getDescendantCoordinates(internalOctree(2, 3, 3, 3))
        .isEqual(internalOctree(3, 7, 7, 7))
    ).toEqual(true);
  });

  it("getAncestorCoordinates throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      return internalQuadtree(0, 0, 0).getAncestorCoordinates(undefined);
    }).toThrowDeveloperError();

    // negative input
    expect(function () {
      return internalQuadtree(0, 0, 0).getAncestorCoordinates(-1);
    }).toThrowDeveloperError();

    // ancestor cannot be above tileset root
    expect(function () {
      return internalQuadtree(0, 0, 0).getAncestorCoordinates(1);
    }).toThrowDeveloperError();
  });

  it("getAncestorCoordinates works as expected for quadtree", function () {
    expect(
      internalQuadtree(0, 0, 0)
        .getAncestorCoordinates(0)
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(1, 0, 0)
        .getAncestorCoordinates(1)
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(1, 1, 1)
        .getAncestorCoordinates(1)
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(2, 3, 3)
        .getAncestorCoordinates(1)
        .isEqual(internalQuadtree(1, 1, 1))
    ).toEqual(true);

    expect(
      internalQuadtree(2, 3, 3)
        .getAncestorCoordinates(2)
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);
  });

  it("getAncestorCoordinates works as expected for octree", function () {
    expect(
      internalOctree(0, 0, 0, 0)
        .getAncestorCoordinates(0)
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(1, 0, 0, 0)
        .getAncestorCoordinates(1)
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(1, 1, 1, 1)
        .getAncestorCoordinates(1)
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(2, 3, 3, 3)
        .getAncestorCoordinates(1)
        .isEqual(internalOctree(1, 1, 1, 1))
    ).toEqual(true);

    expect(
      internalOctree(2, 3, 3, 3)
        .getAncestorCoordinates(2)
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);
  });

  it("getOffsetCoordinates throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      return internalQuadtree(0, 0, 0).getOffsetCoordinates(undefined);
    }).toThrowDeveloperError();

    // descendant is above ancestor
    expect(function () {
      return internalQuadtree(1, 0, 0).getOffsetCoordinates(
        internalQuadtree(0, 0, 0)
      );
    }).toThrowDeveloperError();

    // descendant is not actually a descendant
    expect(function () {
      return internalQuadtree(1, 0, 0).getOffsetCoordinates(
        internalQuadtree(2, 3, 3)
      );
    }).toThrowDeveloperError();

    // mismatched subdivisionScheme
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).getOffsetCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
          z: 0,
        })
      );
    }).toThrowDeveloperError();

    // mismatched subtreeLevels
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).getOffsetCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 3,
          level: 0,
          x: 0,
          y: 0,
        })
      );
    }).toThrowDeveloperError();
  });

  it("getOffsetCoordinates works as expected for quadtree", function () {
    expect(
      internalQuadtree(0, 0, 0)
        .getOffsetCoordinates(internalQuadtree(0, 0, 0))
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(0, 0, 0)
        .getOffsetCoordinates(internalQuadtree(1, 1, 1))
        .isEqual(internalQuadtree(1, 1, 1))
    ).toEqual(true);

    expect(
      internalQuadtree(0, 0, 0)
        .getOffsetCoordinates(internalQuadtree(2, 3, 3))
        .isEqual(internalQuadtree(2, 3, 3))
    ).toEqual(true);

    expect(
      internalQuadtree(1, 1, 1)
        .getOffsetCoordinates(internalQuadtree(2, 2, 2))
        .isEqual(internalQuadtree(1, 0, 0))
    ).toEqual(true);
  });

  it("getOffsetCoordinates works as expected for octree", function () {
    expect(
      internalOctree(0, 0, 0, 0)
        .getOffsetCoordinates(internalOctree(0, 0, 0, 0))
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(0, 0, 0, 0)
        .getOffsetCoordinates(internalOctree(1, 1, 1, 1))
        .isEqual(internalOctree(1, 1, 1, 1))
    ).toEqual(true);

    expect(
      internalOctree(0, 0, 0, 0)
        .getOffsetCoordinates(internalOctree(2, 3, 3, 3))
        .isEqual(internalOctree(2, 3, 3, 3))
    ).toEqual(true);

    expect(
      internalOctree(1, 1, 1, 1)
        .getOffsetCoordinates(internalOctree(2, 2, 2, 2))
        .isEqual(internalOctree(1, 0, 0, 0))
    ).toEqual(true);
  });

  it("getChildCoordinates throws for invalid inputs", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
      level: 1,
      x: 0,
      y: 0,
    });
    expect(function () {
      return coordinates.getChildCoordinates(undefined);
    }).toThrowDeveloperError();
    expect(function () {
      return coordinates.getChildCoordinates(-1);
    }).toThrowDeveloperError();
    expect(function () {
      return coordinates.getChildCoordinates(10);
    }).toThrowDeveloperError();
  });

  it("getChildCoordinates works as expected for quadree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
      level: 1,
      x: 0,
      y: 0,
    });

    var expectedChildren = [
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 6,
        level: 2,
        x: 0,
        y: 0,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 6,
        level: 2,
        x: 1,
        y: 0,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 6,
        level: 2,
        x: 0,
        y: 1,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 6,
        level: 2,
        x: 1,
        y: 1,
      },
    ];

    for (var i = 0; i < expectedChildren.length; i++) {
      var expected = new ImplicitTileCoordinates(expectedChildren[i]);
      expect(coordinates.getChildCoordinates(i).isEqual(expected)).toEqual(
        true
      );
    }
  });

  it("getChildCoordinates works as expected for octree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: 6,
      level: 1,
      x: 0,
      y: 1,
      z: 1,
    });

    var expectedChildren = [
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 0,
        y: 2,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 1,
        y: 2,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 0,
        y: 3,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 1,
        y: 3,
        z: 2,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 0,
        y: 2,
        z: 3,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 1,
        y: 2,
        z: 3,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 0,
        y: 3,
        z: 3,
      },
      {
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 6,
        level: 2,
        x: 1,
        y: 3,
        z: 3,
      },
    ];

    for (var i = 0; i < expectedChildren.length; i++) {
      var expected = new ImplicitTileCoordinates(expectedChildren[i]);
      expect(coordinates.getChildCoordinates(i).isEqual(expected)).toEqual(
        true
      );
    }
  });

  it("getSubtreeCoordinates works as expected for quadtree", function () {
    expect(
      internalQuadtree(0, 0, 0)
        .getSubtreeCoordinates()
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(1, 1, 1)
        .getSubtreeCoordinates()
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(2, 3, 3)
        .getSubtreeCoordinates()
        .isEqual(internalQuadtree(2, 3, 3))
    ).toEqual(true);

    expect(
      internalQuadtree(3, 7, 7)
        .getSubtreeCoordinates()
        .isEqual(internalQuadtree(2, 3, 3))
    ).toEqual(true);
  });

  it("getSubtreeCoordinates works as expected for octree", function () {
    expect(
      internalOctree(0, 0, 0, 0)
        .getSubtreeCoordinates()
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(1, 1, 1, 1)
        .getSubtreeCoordinates()
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(2, 3, 3, 3)
        .getSubtreeCoordinates()
        .isEqual(internalOctree(2, 3, 3, 3))
    ).toEqual(true);

    expect(
      internalOctree(3, 7, 7, 7)
        .getSubtreeCoordinates()
        .isEqual(internalOctree(2, 3, 3, 3))
    ).toEqual(true);
  });

  it("getParentSubtreeCoordinates throws for invalid inputs", function () {
    // tileset root
    expect(function () {
      return internalQuadtree(0, 0, 0).getParentSubtreeCoordinates();
    }).toThrowDeveloperError();

    // in root subtree
    expect(function () {
      return internalQuadtree(1, 1, 1).getParentSubtreeCoordinates();
    }).toThrowDeveloperError();
  });

  it("getParentSubtreeCoordinates works as expected for quadtree", function () {
    expect(
      internalQuadtree(2, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(2, 3, 3)
        .getParentSubtreeCoordinates()
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(3, 7, 7)
        .getParentSubtreeCoordinates()
        .isEqual(internalQuadtree(0, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(4, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(internalQuadtree(2, 0, 0))
    ).toEqual(true);

    expect(
      internalQuadtree(4, 15, 15)
        .getParentSubtreeCoordinates()
        .isEqual(internalQuadtree(2, 3, 3))
    ).toEqual(true);
  });

  it("getParentSubtreeCoordinates works as expected for octree", function () {
    expect(
      internalOctree(2, 0, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(2, 3, 3, 3)
        .getParentSubtreeCoordinates()
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(3, 7, 7, 7)
        .getParentSubtreeCoordinates()
        .isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(4, 0, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(internalOctree(2, 0, 0, 0))
    ).toEqual(true);

    expect(
      internalOctree(4, 15, 15, 15)
        .getParentSubtreeCoordinates()
        .isEqual(internalOctree(2, 3, 3, 3))
    ).toEqual(true);
  });

  it("isAncestor throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      internalQuadtree(0, 0, 0).isAncestor(undefined);
    }).toThrowDeveloperError();

    // mismatched subdivisionScheme
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isAncestor(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
          z: 0,
        })
      );
    }).toThrowDeveloperError();

    // mismatched subtreeLevels
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isAncestor(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 3,
          level: 0,
          x: 0,
          y: 0,
        })
      );
    }).toThrowDeveloperError();
  });

  it("isAncestor works as expected for quadtree", function () {
    // cannot be ancestor of itself
    expect(
      internalQuadtree(0, 0, 0).isAncestor(internalQuadtree(0, 0, 0))
    ).toEqual(false);

    // ancestor one level above
    expect(
      internalQuadtree(0, 0, 0).isAncestor(internalQuadtree(1, 1, 1))
    ).toEqual(true);

    // cannot be descendant
    expect(
      internalQuadtree(1, 1, 1).isAncestor(internalQuadtree(0, 0, 0))
    ).toEqual(false);

    // works with bigger divide
    expect(
      internalQuadtree(0, 0, 0).isAncestor(internalQuadtree(3, 7, 7))
    ).toEqual(true);

    // higher up in the tree but not an ancestor
    expect(
      internalQuadtree(1, 0, 0).isAncestor(internalQuadtree(2, 3, 3))
    ).toEqual(false);
  });

  it("isAncestor works as expected for octree", function () {
    // cannot be ancestor of itself
    expect(
      internalOctree(0, 0, 0, 0).isAncestor(internalOctree(0, 0, 0, 0))
    ).toEqual(false);

    // ancestor one level above
    expect(
      internalOctree(0, 0, 0, 0).isAncestor(internalOctree(1, 1, 1, 1))
    ).toEqual(true);

    // cannot be descendant
    expect(
      internalOctree(1, 1, 1, 1).isAncestor(internalOctree(0, 0, 0, 0))
    ).toEqual(false);

    // works with bigger divide
    expect(
      internalOctree(0, 0, 0, 0).isAncestor(internalOctree(3, 7, 7, 7))
    ).toEqual(true);

    // higher up in the tree but not an ancestor
    expect(
      internalOctree(1, 0, 0, 0).isAncestor(internalOctree(2, 3, 3, 3))
    ).toEqual(false);
  });

  it("isEqual throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      internalQuadtree(0, 0, 0).isEqual(undefined);
    }).toThrowDeveloperError();
  });

  it("isEqual works as expected for quadtree", function () {
    // same
    expect(
      internalOctree(0, 0, 0, 0).isEqual(internalOctree(0, 0, 0, 0))
    ).toEqual(true);

    // different level
    expect(
      internalOctree(0, 0, 0, 0).isEqual(internalOctree(1, 0, 0, 0))
    ).toEqual(false);

    // different X
    expect(
      internalOctree(1, 0, 0, 0).isEqual(internalOctree(1, 1, 0, 0))
    ).toEqual(false);

    // different Y
    expect(
      internalOctree(1, 0, 0, 0).isEqual(internalOctree(1, 0, 1, 0))
    ).toEqual(false);

    // different Z
    expect(
      internalOctree(1, 0, 0, 0).isEqual(internalOctree(1, 0, 0, 1))
    ).toEqual(false);

    // mismatched subdivisionScheme
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isEqual(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
          z: 0,
        })
      )
    ).toEqual(false);

    // mismatched subtreeLevels
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isEqual(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 3,
          level: 0,
          x: 0,
          y: 0,
        })
      )
    ).toEqual(false);
  });

  it("isImplicitTilesetRoot works as expected", function () {
    expect(internalQuadtree(0, 0, 0).isImplicitTilesetRoot()).toEqual(true);
    expect(internalQuadtree(1, 0, 0).isImplicitTilesetRoot()).toEqual(false);
    expect(internalQuadtree(2, 0, 0).isImplicitTilesetRoot()).toEqual(false);
  });

  it("isSubtreeRoot works as expected", function () {
    expect(internalQuadtree(0, 0, 0).isSubtreeRoot()).toEqual(true);
    expect(internalQuadtree(1, 0, 0).isSubtreeRoot()).toEqual(false);
    expect(internalQuadtree(2, 0, 0).isSubtreeRoot()).toEqual(true);
    expect(internalQuadtree(3, 0, 0).isSubtreeRoot()).toEqual(false);
  });

  it("isBottomOfSubtree works as expected", function () {
    expect(internalQuadtree(0, 0, 0).isBottomOfSubtree()).toEqual(false);
    expect(internalQuadtree(1, 0, 0).isBottomOfSubtree()).toEqual(true);
    expect(internalQuadtree(2, 0, 0).isBottomOfSubtree()).toEqual(false);
    expect(internalQuadtree(3, 0, 0).isBottomOfSubtree()).toEqual(true);
  });

  it("childIndex works as expected for quadtree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
      level: 4,
      x: 3,
      y: 2,
    });
    // interleaving the last bit of x, y gives 0b01 = 1
    expect(coordinates.childIndex).toEqual(1);
  });

  it("childIndex works as expected for octree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: 6,
      level: 4,
      x: 3,
      y: 2,
      z: 1,
    });
    // interleaving the last bit of z, x, y gives 0b101 = 5
    expect(coordinates.childIndex).toEqual(5);
  });

  it("mortonIndex works as expected for quadtree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
      level: 4,
      x: 5,
      y: 11,
    });

    // x = 5 =  0b0101
    // y = 11 = 0b1011
    // interleave(y, x) = 0b10011011 = 155
    expect(coordinates.mortonIndex).toEqual(155);
  });

  it("mortonIndex works as expected for octree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: 8,
      level: 6,
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

  it("fromMortonIndex works as expected for quadtree", function () {
    var subtreeLevels = 6;

    // 42 = 0b101010
    // deinterleave2D(42) = [0b111, 0b000] = [7, 0] = [y, x]
    var coordinates = ImplicitTileCoordinates.fromMortonIndex(
      ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels,
      3,
      42
    );

    var expected = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: subtreeLevels,
      level: 3,
      x: 0,
      y: 7,
    });

    expect(coordinates.isEqual(expected)).toEqual(true);
  });

  it("fromMortonIndex works as expected for octree", function () {
    var subtreeLevels = 6;

    // 43 = 0b101011
    // deinterleave3D(43) = [0b10, 0b01, 0b11] = [2, 1, 3] = [z, y, x]
    var coordinates = ImplicitTileCoordinates.fromMortonIndex(
      ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels,
      2,
      43
    );

    var expected = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: subtreeLevels,
      level: 2,
      x: 3,
      y: 1,
      z: 2,
    });

    expect(coordinates.isEqual(expected)).toEqual(true);
  });

  it("tileIndex works as expected for quadtree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
      level: 4,
      x: 5,
      y: 11,
    });

    // level = 4
    // x = 5 =  0b0101
    // y = 11 = 0b1011
    // interleave(y, x) = 0b10011011 = 155
    // levelOffset = (4^level-1)/(4-1) = 85
    // tileIndex = 85 + 155 = 240
    expect(coordinates.tileIndex).toEqual(240);
  });

  it("tileIndex works as expected for octree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: 8,
      level: 6,
      x: 7,
      y: 15,
      z: 32,
    });

    // level = 6
    // x = 7 =  0b000111
    // y = 15 = 0b001111
    // z = 32 = 0b100000
    // interleave(z, y, x) = 0b100000010011011011 = 132315
    // levelOffset = (8^level-1)/(8-1) = 37449
    // tileIndex = 37449 + 132315 = 169764
    expect(coordinates.tileIndex).toEqual(169764);
  });

  it("fromTileIndex works as expected for quadtree", function () {
    var subtreeLevels = 6;

    // level = 3
    // morton = 0b101010 = 42
    // deinterleave2D(42) = [0b111, 0b000] = [7, 0] = [y, x]
    // levelOffset = (4^level-1)/(4-1) = 21
    // tileIndex = levelOffset + morton = 63
    var coordinates = ImplicitTileCoordinates.fromTileIndex(
      ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels,
      63
    );

    var expected = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: subtreeLevels,
      level: 3,
      x: 0,
      y: 7,
    });

    expect(coordinates.isEqual(expected)).toEqual(true);
  });

  it("fromTileIndex works as expected for octree", function () {
    var subtreeLevels = 6;

    // level = 2
    // morton = 0b101011 = 43
    // deinterleave3D(43) = [0b10, 0b01, 0b11] = [2, 1, 3] = [z, y, x]
    // levelOffset = (8^level-1)/(8-1) = 9
    // tileIndex = levelOffset + morton = 52
    var coordinates = ImplicitTileCoordinates.fromTileIndex(
      ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels,
      52
    );

    var expected = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: subtreeLevels,
      level: 2,
      x: 3,
      y: 1,
      z: 2,
    });

    expect(coordinates.isEqual(expected)).toEqual(true);
  });

  it("getTemplateValues works as expected for quadtree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
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

  it("getTemplateValues works as expected for octree", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: 6,
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
