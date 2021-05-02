import {
  ImplicitSubdivisionScheme,
  ImplicitTileCoordinates,
} from "../../Source/Cesium.js";

describe("Scene/ImplicitTileCoordinates", function () {
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

  it("constructor throws with invalid inputs", function () {
    // negative level
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: -1,
        x: 0,
        y: 0,
      });
    }).toThrowDeveloperError();

    // negative x
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: -1,
        y: 0,
      });
    }).toThrowDeveloperError();

    // negative y
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: -1,
      });
    }).toThrowDeveloperError();

    // negative z
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: -1,
      });
    }).toThrowDeveloperError();

    // out of range x
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 4,
        y: 0,
      });
    }).toThrowDeveloperError();

    // out of range y
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 4,
      });
    }).toThrowDeveloperError();

    // out of range z
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 4,
      });
    }).toThrowDeveloperError();
  });

  it("deriveChildCoordinates throws for out of bounds index", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      subtreeLevels: 6,
      level: 1,
      x: 0,
      y: 0,
    });
    expect(function () {
      return coordinates.deriveChildCoordinates(-1);
    }).toThrowDeveloperError();
    expect(function () {
      return coordinates.deriveChildCoordinates(10);
    }).toThrowDeveloperError();
  });

  it("derives child quadtree coordinates", function () {
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
      expect(coordinates.deriveChildCoordinates(i)).toEqual(expected);
    }
  });

  it("derives child octree coordinates", function () {
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
      expect(coordinates.deriveChildCoordinates(i)).toEqual(expected);
    }
  });

  it("deriveDescendantCoordinates throws with mismatched values", function () {
    // mismatched subdivisionScheme
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 0,
        y: 0,
      }).deriveDescendantCoordinates(
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
        level: 2,
        x: 0,
        y: 0,
      }).deriveDescendantCoordinates(
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

  it("deriveDescendantCoordinates works as expected for quadtree", function () {
    // no change expected
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).deriveDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
        })
      )
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      })
    );

    // one level below with offset
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).deriveDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 1,
          x: 1,
          y: 1,
        })
      )
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      })
    );

    // two levels below with offset
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      }).deriveDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 2,
          x: 3,
          y: 3,
        })
      )
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
      })
    );
  });

  it("deriveDescendantCoordinates works as expected for octree", function () {
    // no change expected
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).deriveDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
          z: 0,
        })
      )
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // one level below with offset
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).deriveDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 1,
          x: 1,
          y: 1,
          z: 1,
        })
      )
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      })
    );

    // two levels below with offset
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      }).deriveDescendantCoordinates(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 2,
          x: 3,
          y: 3,
          z: 3,
        })
      )
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
        z: 7,
      })
    );
  });

  it("deriveSubtreeCoordinates works as expected for quadtree", function () {
    // already root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      })
    );

    // inside root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 1,
        y: 1,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 1,
        y: 1,
      })
    );

    // already non-root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
      })
    );

    // inside non-root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
      })
    );
  });

  it("deriveSubtreeCoordinates works as expected for octree", function () {
    // already root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // inside root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // already non-root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
        z: 3,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
        z: 3,
      })
    );

    // inside non-root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
        z: 7,
      }).deriveSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
        z: 3,
      })
    );
  });

  it("deriveParentSubtreeCoordinates works as expected for quadtree", function () {
    // already root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      })
    );

    // one level below
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      })
    );

    // one subtree below
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      })
    );

    // one subtree below, but deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 4,
        x: 0,
        y: 0,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 0,
        y: 0,
      })
    );
  });

  it("deriveParentSubtreeCoordinates works as expected for octree", function () {
    // already root subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // one level below
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // one subtree below
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
        z: 7,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // one subtree below, but deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 4,
        x: 0,
        y: 0,
        z: 0,
      }).deriveParentSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 0,
        y: 0,
        z: 0,
      })
    );
  });

  it("deriveLocalTileCoordinates works as expected for quadtree", function () {
    // no change
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      })
    );

    // no change, but deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      })
    );

    // local to deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      })
    );

    // local to deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      })
    );
  });

  it("deriveLocalTileCoordinates works as expected for octree", function () {
    // no change
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // no change, but deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      })
    );

    // local to deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
        z: 3,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      })
    );

    // local to deeper
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 3,
        x: 7,
        y: 7,
        z: 7,
      }).deriveLocalTileCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      })
    );
  });

  it("deriveLocalChildSubtreeCoordinates throws if not a child subtree", function () {
    // quadtree
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).deriveLocalChildSubtreeCoordinates();
    }).toThrowDeveloperError();

    // quadtree
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      }).deriveLocalChildSubtreeCoordinates();
    }).toThrowDeveloperError();

    // octree
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).deriveLocalChildSubtreeCoordinates();
    }).toThrowDeveloperError();

    // octree
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      }).deriveLocalChildSubtreeCoordinates();
    }).toThrowDeveloperError();
  });

  it("deriveLocalChildSubtreeCoordinates works as expected for quadtree", function () {
    // no change
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
      }).deriveLocalChildSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
      })
    );

    // deeper subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 4,
        x: 15,
        y: 15,
      }).deriveLocalChildSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
      })
    );
  });

  it("deriveLocalChildSubtreeCoordinates works as expected for octree", function () {
    // no change
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
        z: 3,
      }).deriveLocalChildSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
        z: 3,
      })
    );

    // deeper subtree
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 4,
        x: 15,
        y: 15,
        z: 15,
      }).deriveLocalChildSubtreeCoordinates()
    ).toEqual(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 2,
        x: 3,
        y: 3,
        z: 3,
      })
    );
  });

  it("isAncestorOf throws with mismatched values", function () {
    // mismatched subdivisionScheme
    expect(function () {
      return new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isAncestorOf(
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
      }).isAncestorOf(
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

  it("isAncestorOf works as expected for quadtree", function () {
    // cannot be ancestor of itself
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
        })
      )
    ).toEqual(false);

    // ancestor one level above
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 1,
          x: 1,
          y: 1,
        })
      )
    ).toEqual(true);

    // cannot be descendant
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 0,
          x: 0,
          y: 0,
        })
      )
    ).toEqual(false);

    // works across subtrees
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 3,
          x: 7,
          y: 7,
        })
      )
    ).toEqual(true);

    // higher up in the tree but not an ancestor
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 0,
        y: 0,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
          subtreeLevels: 2,
          level: 2,
          x: 3,
          y: 3,
        })
      )
    ).toEqual(false);
  });

  it("isAncestorOf works as expected for octree", function () {
    // cannot be ancestor of itself
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).isAncestorOf(
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

    // ancestor one level above
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 1,
          x: 1,
          y: 1,
          z: 1,
        })
      )
    ).toEqual(true);

    // cannot be descendant
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 1,
        y: 1,
        z: 1,
      }).isAncestorOf(
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

    // works across subtrees
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
        z: 0,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 3,
          x: 7,
          y: 7,
          z: 7,
        })
      )
    ).toEqual(true);

    // higher up in the tree but not an ancestor
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
        subtreeLevels: 2,
        level: 1,
        x: 0,
        y: 0,
        z: 0,
      }).isAncestorOf(
        new ImplicitTileCoordinates({
          subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
          subtreeLevels: 2,
          level: 2,
          x: 3,
          y: 3,
          z: 3,
        })
      )
    ).toEqual(false);
  });

  it("isRoot works as expected", function () {
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isRoot()
    ).toEqual(true);

    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 0,
        y: 0,
      }).isRoot()
    ).toEqual(false);
  });

  it("isRootOfSubtree works as expected", function () {
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isRootOfSubtree()
    ).toEqual(true);

    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 0,
        y: 0,
      }).isRootOfSubtree()
    ).toEqual(false);

    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 0,
        y: 0,
      }).isRootOfSubtree()
    ).toEqual(true);

    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 3,
        x: 0,
        y: 0,
      }).isRootOfSubtree()
    ).toEqual(false);
  });

  it("isBottomOfSubtree works as expected", function () {
    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 0,
        x: 0,
        y: 0,
      }).isBottomOfSubtree()
    ).toEqual(false);

    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 1,
        x: 0,
        y: 0,
      }).isBottomOfSubtree()
    ).toEqual(true);

    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 2,
        x: 0,
        y: 0,
      }).isBottomOfSubtree()
    ).toEqual(false);

    expect(
      new ImplicitTileCoordinates({
        subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
        subtreeLevels: 2,
        level: 3,
        x: 0,
        y: 0,
      }).isBottomOfSubtree()
    ).toEqual(true);
  });

  it("gets the child index for quadtree coordinates", function () {
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

  it("gets the child index for octree coordinates", function () {
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

  it("computes the morton index for quadtree coordinates", function () {
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

  it("computes the morton index for octree coordinates", function () {
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

  it("constructs quadtree coordinates from morton index", function () {
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

    expect(coordinates).toEqual(expected);
  });

  it("constructs octree coordinates from morton index", function () {
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

    expect(coordinates).toEqual(expected);
  });

  it("computes quadtree template values", function () {
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

  it("computes octree template values", function () {
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
