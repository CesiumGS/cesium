import {
  defaultValue,
  ImplicitSubdivisionScheme,
  ImplicitTileCoordinates,
} from "../../index.js";

describe("Scene/ImplicitTileCoordinates", function () {
  /**
   * Helper function for creating quadtree implicit tile coordinates
   * @param {Number} level
   * @param {Number} x
   * @param {Number} y
   * @param {Number} [subtreeLevels=2]
   * @returns {ImplicitTileCoordinates}
   */
  function quadtreeCoordinates(level, x, y, subtreeLevels) {
    return new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: defaultValue(subtreeLevels, 2),
      level: level,
      x: x,
      y: y,
    });
  }

  /**
   * Helper function for creating octree implicit tile coordinates
   * @param {Number} level
   * @param {Number} x
   * @param {Number} y
   * @param {Number} z
   * @param {Number} [subtreeLevels=2]
   * @returns {ImplicitTileCoordinates}
   */
  function octreeCoordinates(level, x, y, z, subtreeLevels) {
    return new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels: defaultValue(subtreeLevels, 2),
      level: level,
      x: x,
      y: y,
      z: z,
    });
  }

  it("constructs quadtree", function () {
    const coordinates = new ImplicitTileCoordinates({
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
    const coordinates = new ImplicitTileCoordinates({
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
      quadtreeCoordinates(-1, 0, 0);
    }).toThrowDeveloperError();

    // negative x
    expect(function () {
      quadtreeCoordinates(0, -1, 0);
    }).toThrowDeveloperError();

    // negative y
    expect(function () {
      quadtreeCoordinates(0, 0, -1);
    }).toThrowDeveloperError();

    // out of range x
    expect(function () {
      quadtreeCoordinates(0, 4, 0);
    }).toThrowDeveloperError();

    // out of range y
    expect(function () {
      quadtreeCoordinates(0, 0, 4);
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid inputs for octree", function () {
    // negative z
    expect(function () {
      octreeCoordinates(0, 0, 0, -1);
    }).toThrowDeveloperError();

    // out of range z
    expect(function () {
      octreeCoordinates(0, 0, 0, 4);
    }).toThrowDeveloperError();
  });

  it("getDescendantCoordinates throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      quadtreeCoordinates(0, 0, 0).getDescendantCoordinates(undefined);
    }).toThrowDeveloperError();

    // mismatched subdivisionScheme
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).getDescendantCoordinates(
        octreeCoordinates(0, 0, 0, 0)
      );
    }).toThrowDeveloperError();

    // mismatched subtreeLevels
    expect(function () {
      const subtreeLevelsA = 2;
      const subtreeLevelsB = 3;
      return quadtreeCoordinates(
        0,
        0,
        0,
        subtreeLevelsA
      ).getDescendantCoordinates(quadtreeCoordinates(0, 0, 0, subtreeLevelsB));
    }).toThrowDeveloperError();
  });

  it("getDescendantCoordinates works as expected for quadtree", function () {
    expect(
      quadtreeCoordinates(0, 0, 0)
        .getDescendantCoordinates(quadtreeCoordinates(0, 0, 0))
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(0, 0, 0)
        .getDescendantCoordinates(quadtreeCoordinates(1, 1, 1))
        .isEqual(quadtreeCoordinates(1, 1, 1))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(1, 1, 1)
        .getDescendantCoordinates(quadtreeCoordinates(2, 3, 3))
        .isEqual(quadtreeCoordinates(3, 7, 7))
    ).toEqual(true);
  });

  it("getDescendantCoordinates works as expected for octree", function () {
    expect(
      octreeCoordinates(0, 0, 0, 0)
        .getDescendantCoordinates(octreeCoordinates(0, 0, 0, 0))
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(0, 0, 0, 0)
        .getDescendantCoordinates(octreeCoordinates(1, 1, 1, 1))
        .isEqual(octreeCoordinates(1, 1, 1, 1))
    ).toEqual(true);

    expect(
      octreeCoordinates(1, 1, 1, 1)
        .getDescendantCoordinates(octreeCoordinates(2, 3, 3, 3))
        .isEqual(octreeCoordinates(3, 7, 7, 7))
    ).toEqual(true);
  });

  it("getAncestorCoordinates throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).getAncestorCoordinates(undefined);
    }).toThrowDeveloperError();

    // negative input
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).getAncestorCoordinates(-1);
    }).toThrowDeveloperError();

    // ancestor cannot be above tileset root
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).getAncestorCoordinates(1);
    }).toThrowDeveloperError();
  });

  it("getAncestorCoordinates works as expected for quadtree", function () {
    expect(
      quadtreeCoordinates(0, 0, 0)
        .getAncestorCoordinates(0)
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(1, 0, 0)
        .getAncestorCoordinates(1)
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(1, 1, 1)
        .getAncestorCoordinates(1)
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(2, 3, 3)
        .getAncestorCoordinates(1)
        .isEqual(quadtreeCoordinates(1, 1, 1))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(2, 3, 3)
        .getAncestorCoordinates(2)
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);
  });

  it("getAncestorCoordinates works as expected for octree", function () {
    expect(
      octreeCoordinates(0, 0, 0, 0)
        .getAncestorCoordinates(0)
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(1, 0, 0, 0)
        .getAncestorCoordinates(1)
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(1, 1, 1, 1)
        .getAncestorCoordinates(1)
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(2, 3, 3, 3)
        .getAncestorCoordinates(1)
        .isEqual(octreeCoordinates(1, 1, 1, 1))
    ).toEqual(true);

    expect(
      octreeCoordinates(2, 3, 3, 3)
        .getAncestorCoordinates(2)
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);
  });

  it("getOffsetCoordinates throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).getOffsetCoordinates(undefined);
    }).toThrowDeveloperError();

    // descendant is above ancestor
    expect(function () {
      return quadtreeCoordinates(1, 0, 0).getOffsetCoordinates(
        quadtreeCoordinates(0, 0, 0)
      );
    }).toThrowDeveloperError();

    // descendant is not actually a descendant
    expect(function () {
      return quadtreeCoordinates(1, 0, 0).getOffsetCoordinates(
        quadtreeCoordinates(2, 3, 3)
      );
    }).toThrowDeveloperError();

    // mismatched subdivisionScheme
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).getOffsetCoordinates(
        octreeCoordinates(0, 0, 0, 0)
      );
    }).toThrowDeveloperError();

    // mismatched subtreeLevels
    expect(function () {
      const subtreeLevelsA = 2;
      const subtreeLevelsB = 3;
      return quadtreeCoordinates(0, 0, 0, subtreeLevelsA).getOffsetCoordinates(
        quadtreeCoordinates(0, 0, 0, subtreeLevelsB)
      );
    }).toThrowDeveloperError();
  });

  it("getOffsetCoordinates works as expected for quadtree", function () {
    expect(
      quadtreeCoordinates(0, 0, 0)
        .getOffsetCoordinates(quadtreeCoordinates(0, 0, 0))
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(0, 0, 0)
        .getOffsetCoordinates(quadtreeCoordinates(1, 1, 1))
        .isEqual(quadtreeCoordinates(1, 1, 1))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(0, 0, 0)
        .getOffsetCoordinates(quadtreeCoordinates(2, 3, 3))
        .isEqual(quadtreeCoordinates(2, 3, 3))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(1, 1, 1)
        .getOffsetCoordinates(quadtreeCoordinates(2, 2, 2))
        .isEqual(quadtreeCoordinates(1, 0, 0))
    ).toEqual(true);
  });

  it("getOffsetCoordinates works as expected for octree", function () {
    expect(
      octreeCoordinates(0, 0, 0, 0)
        .getOffsetCoordinates(octreeCoordinates(0, 0, 0, 0))
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(0, 0, 0, 0)
        .getOffsetCoordinates(octreeCoordinates(1, 1, 1, 1))
        .isEqual(octreeCoordinates(1, 1, 1, 1))
    ).toEqual(true);

    expect(
      octreeCoordinates(0, 0, 0, 0)
        .getOffsetCoordinates(octreeCoordinates(2, 3, 3, 3))
        .isEqual(octreeCoordinates(2, 3, 3, 3))
    ).toEqual(true);

    expect(
      octreeCoordinates(1, 1, 1, 1)
        .getOffsetCoordinates(octreeCoordinates(2, 2, 2, 2))
        .isEqual(octreeCoordinates(1, 0, 0, 0))
    ).toEqual(true);
  });

  it("getChildCoordinates throws for invalid inputs", function () {
    const coordinates = quadtreeCoordinates(1, 0, 0);
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
    const coordinates = quadtreeCoordinates(1, 0, 0);

    expect(
      coordinates.getChildCoordinates(0).isEqual(quadtreeCoordinates(2, 0, 0))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(1).isEqual(quadtreeCoordinates(2, 1, 0))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(2).isEqual(quadtreeCoordinates(2, 0, 1))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(3).isEqual(quadtreeCoordinates(2, 1, 1))
    ).toEqual(true);
  });

  it("getChildCoordinates works as expected for octree", function () {
    const coordinates = octreeCoordinates(1, 0, 1, 1);

    expect(
      coordinates.getChildCoordinates(0).isEqual(octreeCoordinates(2, 0, 2, 2))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(1).isEqual(octreeCoordinates(2, 1, 2, 2))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(2).isEqual(octreeCoordinates(2, 0, 3, 2))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(3).isEqual(octreeCoordinates(2, 1, 3, 2))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(4).isEqual(octreeCoordinates(2, 0, 2, 3))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(5).isEqual(octreeCoordinates(2, 1, 2, 3))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(6).isEqual(octreeCoordinates(2, 0, 3, 3))
    ).toEqual(true);

    expect(
      coordinates.getChildCoordinates(7).isEqual(octreeCoordinates(2, 1, 3, 3))
    ).toEqual(true);
  });

  it("getSubtreeCoordinates works as expected for quadtree", function () {
    expect(
      quadtreeCoordinates(0, 0, 0)
        .getSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(1, 1, 1)
        .getSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(2, 3, 3)
        .getSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(2, 3, 3))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(3, 7, 7)
        .getSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(2, 3, 3))
    ).toEqual(true);
  });

  it("getSubtreeCoordinates works as expected for octree", function () {
    expect(
      octreeCoordinates(0, 0, 0, 0)
        .getSubtreeCoordinates()
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(1, 1, 1, 1)
        .getSubtreeCoordinates()
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(2, 3, 3, 3)
        .getSubtreeCoordinates()
        .isEqual(octreeCoordinates(2, 3, 3, 3))
    ).toEqual(true);

    expect(
      octreeCoordinates(3, 7, 7, 7)
        .getSubtreeCoordinates()
        .isEqual(octreeCoordinates(2, 3, 3, 3))
    ).toEqual(true);
  });

  it("getParentSubtreeCoordinates throws for invalid inputs", function () {
    // tileset root
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).getParentSubtreeCoordinates();
    }).toThrowDeveloperError();

    // in root subtree
    expect(function () {
      return quadtreeCoordinates(1, 1, 1).getParentSubtreeCoordinates();
    }).toThrowDeveloperError();
  });

  it("getParentSubtreeCoordinates works as expected for quadtree", function () {
    expect(
      quadtreeCoordinates(2, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(2, 3, 3)
        .getParentSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(3, 7, 7)
        .getParentSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(0, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(4, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(2, 0, 0))
    ).toEqual(true);

    expect(
      quadtreeCoordinates(4, 15, 15)
        .getParentSubtreeCoordinates()
        .isEqual(quadtreeCoordinates(2, 3, 3))
    ).toEqual(true);
  });

  it("getParentSubtreeCoordinates works as expected for octree", function () {
    expect(
      octreeCoordinates(2, 0, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(2, 3, 3, 3)
        .getParentSubtreeCoordinates()
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(3, 7, 7, 7)
        .getParentSubtreeCoordinates()
        .isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(4, 0, 0, 0)
        .getParentSubtreeCoordinates()
        .isEqual(octreeCoordinates(2, 0, 0, 0))
    ).toEqual(true);

    expect(
      octreeCoordinates(4, 15, 15, 15)
        .getParentSubtreeCoordinates()
        .isEqual(octreeCoordinates(2, 3, 3, 3))
    ).toEqual(true);
  });

  it("isAncestor throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      quadtreeCoordinates(0, 0, 0).isAncestor(undefined);
    }).toThrowDeveloperError();

    // mismatched subdivisionScheme
    expect(function () {
      return quadtreeCoordinates(0, 0, 0).isAncestor(
        octreeCoordinates(0, 0, 0, 0)
      );
    }).toThrowDeveloperError();

    // mismatched subtreeLevels
    expect(function () {
      const subtreeLevelsA = 2;
      const subtreeLevelsB = 3;
      return quadtreeCoordinates(0, 0, 0, subtreeLevelsA).isAncestor(
        quadtreeCoordinates(0, 0, 0, subtreeLevelsB)
      );
    }).toThrowDeveloperError();
  });

  it("isAncestor works as expected for quadtree", function () {
    // cannot be ancestor of itself
    expect(
      quadtreeCoordinates(0, 0, 0).isAncestor(quadtreeCoordinates(0, 0, 0))
    ).toEqual(false);

    // ancestor one level above
    expect(
      quadtreeCoordinates(0, 0, 0).isAncestor(quadtreeCoordinates(1, 1, 1))
    ).toEqual(true);

    // cannot be descendant
    expect(
      quadtreeCoordinates(1, 1, 1).isAncestor(quadtreeCoordinates(0, 0, 0))
    ).toEqual(false);

    // works with bigger divide
    expect(
      quadtreeCoordinates(0, 0, 0).isAncestor(quadtreeCoordinates(3, 7, 7))
    ).toEqual(true);

    // higher up in the tree but not an ancestor
    expect(
      quadtreeCoordinates(1, 0, 0).isAncestor(quadtreeCoordinates(2, 3, 3))
    ).toEqual(false);
  });

  it("isAncestor works as expected for octree", function () {
    // cannot be ancestor of itself
    expect(
      octreeCoordinates(0, 0, 0, 0).isAncestor(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(false);

    // ancestor one level above
    expect(
      octreeCoordinates(0, 0, 0, 0).isAncestor(octreeCoordinates(1, 1, 1, 1))
    ).toEqual(true);

    // cannot be descendant
    expect(
      octreeCoordinates(1, 1, 1, 1).isAncestor(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(false);

    // works with bigger divide
    expect(
      octreeCoordinates(0, 0, 0, 0).isAncestor(octreeCoordinates(3, 7, 7, 7))
    ).toEqual(true);

    // higher up in the tree but not an ancestor
    expect(
      octreeCoordinates(1, 0, 0, 0).isAncestor(octreeCoordinates(2, 3, 3, 3))
    ).toEqual(false);
  });

  it("isEqual throws with invalid inputs", function () {
    // undefined input
    expect(function () {
      quadtreeCoordinates(0, 0, 0).isEqual(undefined);
    }).toThrowDeveloperError();
  });

  it("isEqual works as expected for quadtree", function () {
    // same
    expect(
      octreeCoordinates(0, 0, 0, 0).isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(true);

    // different level
    expect(
      octreeCoordinates(0, 0, 0, 0).isEqual(octreeCoordinates(1, 0, 0, 0))
    ).toEqual(false);

    // different X
    expect(
      octreeCoordinates(1, 0, 0, 0).isEqual(octreeCoordinates(1, 1, 0, 0))
    ).toEqual(false);

    // different Y
    expect(
      octreeCoordinates(1, 0, 0, 0).isEqual(octreeCoordinates(1, 0, 1, 0))
    ).toEqual(false);

    // different Z
    expect(
      octreeCoordinates(1, 0, 0, 0).isEqual(octreeCoordinates(1, 0, 0, 1))
    ).toEqual(false);

    // mismatched subdivisionScheme
    expect(
      quadtreeCoordinates(0, 0, 0).isEqual(octreeCoordinates(0, 0, 0, 0))
    ).toEqual(false);

    // mismatched subtreeLevels
    const subtreeLevelsA = 2;
    const subtreeLevelsB = 3;
    expect(
      quadtreeCoordinates(0, 0, 0, subtreeLevelsA).isEqual(
        quadtreeCoordinates(0, 0, 0, subtreeLevelsB)
      )
    ).toEqual(false);
  });

  it("isImplicitTilesetRoot works as expected", function () {
    expect(quadtreeCoordinates(0, 0, 0).isImplicitTilesetRoot()).toEqual(true);
    expect(quadtreeCoordinates(1, 0, 0).isImplicitTilesetRoot()).toEqual(false);
    expect(quadtreeCoordinates(2, 0, 0).isImplicitTilesetRoot()).toEqual(false);
  });

  it("isSubtreeRoot works as expected", function () {
    expect(quadtreeCoordinates(0, 0, 0).isSubtreeRoot()).toEqual(true);
    expect(quadtreeCoordinates(1, 0, 0).isSubtreeRoot()).toEqual(false);
    expect(quadtreeCoordinates(2, 0, 0).isSubtreeRoot()).toEqual(true);
    expect(quadtreeCoordinates(3, 0, 0).isSubtreeRoot()).toEqual(false);
  });

  it("isBottomOfSubtree works as expected", function () {
    expect(quadtreeCoordinates(0, 0, 0).isBottomOfSubtree()).toEqual(false);
    expect(quadtreeCoordinates(1, 0, 0).isBottomOfSubtree()).toEqual(true);
    expect(quadtreeCoordinates(2, 0, 0).isBottomOfSubtree()).toEqual(false);
    expect(quadtreeCoordinates(3, 0, 0).isBottomOfSubtree()).toEqual(true);
  });

  it("childIndex works as expected for quadtree", function () {
    // x = 3 = 0b11
    // y = 2 = 0b10
    // interleaving the last bit of y, x gives 0b01 = 1
    expect(quadtreeCoordinates(4, 3, 2).childIndex).toEqual(1);
  });

  it("childIndex works as expected for octree", function () {
    // x = 3 = 0b11
    // y = 2 = 0b10
    // z = 1 = 0b01
    // interleaving the last bit of z, y, x gives 0b101 = 5
    expect(octreeCoordinates(4, 3, 2, 1).childIndex).toEqual(5);
  });

  it("mortonIndex works as expected for quadtree", function () {
    // x = 5 =  0b0101
    // y = 11 = 0b1011
    // interleave(y, x) = 0b10011011 = 155
    expect(quadtreeCoordinates(4, 5, 11).mortonIndex).toEqual(155);
  });

  it("mortonIndex works as expected for octree", function () {
    // x = 7 =  0b000111
    // y = 15 = 0b001111
    // z = 32 = 0b100000
    // interleave(z, y, x) = 0b100000010011011011 = 132315
    expect(octreeCoordinates(6, 7, 15, 32).mortonIndex).toEqual(132315);
  });

  it("fromMortonIndex works as expected for quadtree", function () {
    const subtreeLevels = 6;

    // 42 = 0b101010
    // deinterleave2D(42) = [0b111, 0b000] = [7, 0] = [y, x]
    const coordinates = ImplicitTileCoordinates.fromMortonIndex(
      ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels,
      3,
      42
    );

    expect(
      coordinates.isEqual(quadtreeCoordinates(3, 0, 7, subtreeLevels))
    ).toEqual(true);
  });

  it("fromMortonIndex works as expected for octree", function () {
    const subtreeLevels = 6;

    // 43 = 0b101011
    // deinterleave3D(43) = [0b10, 0b01, 0b11] = [2, 1, 3] = [z, y, x]
    const coordinates = ImplicitTileCoordinates.fromMortonIndex(
      ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels,
      2,
      43
    );

    expect(
      coordinates.isEqual(octreeCoordinates(2, 3, 1, 2, subtreeLevels))
    ).toEqual(true);
  });

  it("tileIndex works as expected for quadtree", function () {
    // level = 4
    // x = 5 =  0b0101
    // y = 11 = 0b1011
    // interleave(y, x) = 0b10011011 = 155
    // levelOffset = (4^level-1)/(4-1) = 85
    // tileIndex = 85 + 155 = 240
    expect(quadtreeCoordinates(4, 5, 11).tileIndex).toEqual(240);
  });

  it("tileIndex works as expected for octree", function () {
    // level = 6
    // x = 7 =  0b000111
    // y = 15 = 0b001111
    // z = 32 = 0b100000
    // interleave(z, y, x) = 0b100000010011011011 = 132315
    // levelOffset = (8^level-1)/(8-1) = 37449
    // tileIndex = 37449 + 132315 = 169764
    expect(octreeCoordinates(6, 7, 15, 32).tileIndex).toEqual(169764);
  });

  it("fromTileIndex works as expected for quadtree", function () {
    const subtreeLevels = 6;

    // level = 3
    // morton = 0b101010 = 42
    // deinterleave2D(42) = [0b111, 0b000] = [7, 0] = [y, x]
    // levelOffset = (4^level-1)/(4-1) = 21
    // tileIndex = levelOffset + morton = 63
    const coordinates = ImplicitTileCoordinates.fromTileIndex(
      ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels,
      63
    );

    expect(
      coordinates.isEqual(quadtreeCoordinates(3, 0, 7, subtreeLevels))
    ).toEqual(true);
  });

  it("fromTileIndex works as expected for octree", function () {
    const subtreeLevels = 6;

    // level = 2
    // morton = 0b101011 = 43
    // deinterleave3D(43) = [0b10, 0b01, 0b11] = [2, 1, 3] = [z, y, x]
    // levelOffset = (8^level-1)/(8-1) = 9
    // tileIndex = levelOffset + morton = 52
    const coordinates = ImplicitTileCoordinates.fromTileIndex(
      ImplicitSubdivisionScheme.OCTREE,
      subtreeLevels,
      52
    );

    expect(
      coordinates.isEqual(octreeCoordinates(2, 3, 1, 2, subtreeLevels))
    ).toEqual(true);
  });

  it("getTemplateValues works as expected for quadtree", function () {
    const subtreeLevels = 6;
    expect(
      quadtreeCoordinates(4, 3, 2, subtreeLevels).getTemplateValues()
    ).toEqual({
      level: 4,
      x: 3,
      y: 2,
    });
  });

  it("getTemplateValues works as expected for octree", function () {
    const subtreeLevels = 6;

    expect(
      octreeCoordinates(4, 3, 2, 1, subtreeLevels).getTemplateValues()
    ).toEqual({
      level: 4,
      x: 3,
      y: 2,
      z: 1,
    });
  });
});
