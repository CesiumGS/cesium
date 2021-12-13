import {
  Cartesian3,
  ImplicitSubtree,
  ImplicitTileCoordinates,
  ImplicitTileset,
  MetadataSchema,
  Resource,
  ResourceCache,
  when,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";
import MetadataTester from "../MetadataTester.js";

describe("Scene/ImplicitSubtree", function () {
  function availabilityToBooleanArray(availability) {
    if (typeof availability.descriptor === "number") {
      var constant = availability.descriptor === 1;
      var repeated = new Array(availability.lengthBits);
      for (var i = 0; i < availability.lengthBits; i++) {
        repeated[i] = constant;
      }
      return repeated;
    }

    return availability.descriptor.split("").map(function (x) {
      return x === "1";
    });
  }

  function expectTileAvailability(subtree, availability) {
    var expectedAvailability = availabilityToBooleanArray(availability);
    for (var i = 0; i < availability.lengthBits; i++) {
      expect(subtree.tileIsAvailableAtIndex(i)).toEqual(
        expectedAvailability[i]
      );
      // same as above, but using coordinates
      expect(
        subtree.tileIsAvailableAtCoordinates(
          ImplicitTileCoordinates.fromTileIndex(
            subtree.implicitCoordinates.subdivisionScheme,
            subtree.implicitCoordinates.subtreeLevels,
            i
          )
        )
      ).toEqual(expectedAvailability[i]);
    }
  }

  function expectContentAvailability(subtree, availabilityArray) {
    for (var i = 0; i < availabilityArray.length; i++) {
      var availability = availabilityArray[i];
      var expectedAvailability = availabilityToBooleanArray(availability);
      for (var j = 0; j < availability.lengthBits; j++) {
        expect(subtree.contentIsAvailableAtIndex(j, i)).toEqual(
          expectedAvailability[j]
        );
        // same as above, but using coordinates
        expect(
          subtree.contentIsAvailableAtCoordinates(
            ImplicitTileCoordinates.fromTileIndex(
              subtree.implicitCoordinates.subdivisionScheme,
              subtree.implicitCoordinates.subtreeLevels,
              j
            ),
            i
          )
        ).toEqual(expectedAvailability[j]);
      }
    }
  }
  function expectChildSubtreeAvailability(subtree, availability) {
    var expectedAvailability = availabilityToBooleanArray(availability);
    for (var i = 0; i < availability.lengthBits; i++) {
      expect(subtree.childSubtreeIsAvailableAtIndex(i)).toEqual(
        expectedAvailability[i]
      );
      // same as above, but using coordinates
      expect(
        subtree.childSubtreeIsAvailableAtCoordinates(
          ImplicitTileCoordinates.fromMortonIndex(
            subtree.implicitCoordinates.subdivisionScheme,
            subtree.implicitCoordinates.subtreeLevels,
            subtree.implicitCoordinates.subtreeLevels,
            i
          )
        )
      ).toEqual(expectedAvailability[i]);
    }
  }

  // used for spying on ResourceCache.load()
  function fakeLoad(arrayBuffer) {
    return function (options) {
      var fakeCacheResource = {
        typedArray: arrayBuffer,
      };
      options.resourceLoader._promise = {
        promise: when.resolve(fakeCacheResource),
      };
    };
  }

  var tilesetResource = new Resource({
    url: "https://example.com/tileset.json",
  });
  var subtreeResource = new Resource({
    url: "https://example.com/test.subtree",
  });
  var metadataSchema; // intentionally left undefined

  var implicitQuadtreeJson = {
    geometricError: 500,
    refine: "ADD",
    boundingVolume: {
      region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
    },
    content: {
      uri: "https://example.com/{level}/{x}/{y}.b3dm",
    },
    extensions: {
      "3DTILES_implicit_tiling": {
        subdivisionScheme: "QUADTREE",
        subtreeLevels: 2,
        // This is artificially high for ease of testing. This field is
        // not validated at runtime.
        maximumLevel: 3,
        subtrees: {
          uri: "https://example.com/{level}/{x}/{y}.subtree",
        },
      },
    },
  };

  var implicitQuadtree = new ImplicitTileset(
    tilesetResource,
    implicitQuadtreeJson,
    metadataSchema
  );

  var quadtreeCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitQuadtree.subdivisionScheme,
    subtreeLevels: implicitQuadtree.subtreeLevels,
    level: 0,
    x: 0,
    y: 0,
  });

  var implicitOctreeJson = {
    geometricError: 500,
    refine: "REPLACE",
    boundingVolume: {
      region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
    },
    content: {
      uri: "https://example.com/{level}/{x}_{y}_{z}.b3dm",
    },
    extensions: {
      "3DTILES_implicit_tiling": {
        subdivisionScheme: "OCTREE",
        subtreeLevels: 2,
        maximumLevel: 3,
        subtrees: {
          uri: "https://example.com/{level}/{x}_{y}_{z}.subtree",
        },
      },
    },
  };

  var implicitOctree = new ImplicitTileset(
    tilesetResource,
    implicitOctreeJson,
    metadataSchema
  );

  var octreeCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitOctree.subdivisionScheme,
    subtreeLevels: implicitOctree.subtreeLevels,
    level: 0,
    z: 0,
    x: 0,
    y: 0,
  });

  var internalQuadtreeDescription = {
    tileAvailability: {
      descriptor: "11010",
      lengthBits: 5,
      isInternal: true,
    },
    contentAvailability: [
      {
        descriptor: "11000",
        lengthBits: 5,
        isInternal: true,
      },
    ],
    childSubtreeAvailability: {
      descriptor: "1111000010100000",
      lengthBits: 16,
      isInternal: true,
    },
  };

  it("throws without resource", function () {
    expect(function () {
      var results = ImplicitTilingTester.generateSubtreeBuffers(
        internalQuadtreeDescription
      );
      return new ImplicitSubtree(
        undefined,
        results.subtreeBuffer,
        implicitQuadtree,
        quadtreeCoordinates
      );
    }).toThrowDeveloperError();
  });

  it("throws without subtreeView", function () {
    expect(function () {
      return new ImplicitSubtree(
        subtreeResource,
        undefined,
        implicitQuadtree,
        quadtreeCoordinates
      );
    }).toThrowDeveloperError();
  });

  it("throws without implicitTileset", function () {
    expect(function () {
      var results = ImplicitTilingTester.generateSubtreeBuffers(
        internalQuadtreeDescription
      );
      return new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        undefined,
        quadtreeCoordinates
      );
    }).toThrowDeveloperError();
  });

  it("throws without implicitCoordinates", function () {
    expect(function () {
      var results = ImplicitTilingTester.generateSubtreeBuffers(
        internalQuadtreeDescription
      );
      return new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        implicitQuadtree,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("sets the implicit coordinates of the subtree's root", function () {
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      internalQuadtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );

    expect(subtree.implicitCoordinates.isEqual(quadtreeCoordinates)).toEqual(
      true
    );
  });

  it("gets availability from internal buffer", function () {
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      internalQuadtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(
        subtree,
        internalQuadtreeDescription.tileAvailability
      );
      expectContentAvailability(
        subtree,
        internalQuadtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        internalQuadtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("gets availability from external buffer", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11010",
        lengthBits: 5,
        isInternal: false,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: false,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
        lengthBits: 16,
        isInternal: false,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var fetchExternal = spyOn(ResourceCache, "load").and.callFake(
      fakeLoad(results.externalBuffer)
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        subtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        subtreeDescription.childSubtreeAvailability
      );

      expect(fetchExternal.calls.count()).toEqual(1);
    });
  });

  it("handles typed arrays with a byte offset", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11010",
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
        lengthBits: 16,
        isInternal: true,
      },
    };

    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    // Put the subtree buffer in a larger buffer so the byteOffset is not 0
    var paddingLength = 8;
    var biggerBuffer = new Uint8Array(
      results.subtreeBuffer.length + paddingLength
    );
    biggerBuffer.set(results.subtreeBuffer, paddingLength);
    var subtreeView = new Uint8Array(biggerBuffer.buffer, paddingLength);

    var subtree = new ImplicitSubtree(
      subtreeResource,
      subtreeView,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        subtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        subtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("tile and content availability can share the same buffer", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11010",
        lengthBits: 5,
        isInternal: false,
      },
      contentAvailability: [
        {
          shareBuffer: true,
          descriptor: "11010",
          lengthBits: 5,
          isInternal: false,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
        lengthBits: 16,
        isInternal: false,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    var fetchExternal = spyOn(ResourceCache, "load").and.callFake(
      fakeLoad(results.externalBuffer)
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        subtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        subtreeDescription.childSubtreeAvailability
      );
      expect(fetchExternal.calls.count()).toEqual(1);
    });
  });

  it("external buffer is fetched if it is used for availability", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: 1,
        lengthBits: 5,
        isInternal: false,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: false,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
        lengthBits: 16,
        isInternal: false,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    var fetchExternal = spyOn(ResourceCache, "load").and.callFake(
      fakeLoad(results.externalBuffer)
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expect(fetchExternal.calls.count()).toEqual(1);
    });
  });

  it("unused external buffers are not fetched", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: 1,
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
        lengthBits: 16,
        isInternal: true,
      },
      other: {
        descriptor: "101010",
        lengthBits: 6,
        isInternal: false,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    var fetchExternal = spyOn(
      Resource.prototype,
      "fetchArrayBuffer"
    ).and.returnValue(when.resolve(results.externalBuffer));
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expect(fetchExternal).not.toHaveBeenCalled();
    });
  });

  it("missing contentAvailability is interpreted as 0s", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11010",
        lengthBits: 5,
        isInternal: true,
      },
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
        lengthBits: 16,
        isInternal: true,
      },
    };
    var expectedContentAvailability = {
      descriptor: 0,
      lengthBits: 5,
      isInternal: true,
    };

    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(subtree, expectedContentAvailability);
      expectChildSubtreeAvailability(
        subtree,
        subtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("availability works for quadtrees", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: 1,
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: 0,
        lengthBits: 16,
        isInternal: true,
      },
    };

    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        subtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        subtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("computes level offset", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "110101111",
        lengthBits: 9,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "110101011",
          lengthBits: 9,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: 1,
        lengthBits: 64,
        isInternal: true,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitOctree,
      octreeCoordinates
    );

    expect(subtree.getLevelOffset(2)).toEqual(9);
  });

  it("getTileIndex throws for a tile not in the subtree", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11000",
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "100000000000000",
        lengthBits: 16,
        isInternal: true,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    var deeperQuadtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 0,
      y: 0,
    });

    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      deeperQuadtreeCoordinates
    );

    expect(function () {
      var implicitCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 0,
        x: 0,
        y: 0,
      });
      return subtree.getTileIndex(implicitCoordinates);
    }).toThrowRuntimeError();
    expect(function () {
      var implicitCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 5,
        x: 0,
        y: 0,
      });
      return subtree.getTileIndex(implicitCoordinates);
    }).toThrowRuntimeError();
  });

  it("getTileIndex computes bit index for a tile in the subtree", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11000",
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "100000000000000",
        lengthBits: 16,
        isInternal: true,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var subtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 0,
      x: 0,
      y: 0,
    });
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      subtreeCoordinates
    );

    // level offset: 1, morton index: 0, so tile index is 1 + 0 = 1
    var implicitCoordinatesFull = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 1,
      x: 0,
      y: 0,
    });
    var indexFull = subtree.getTileIndex(implicitCoordinatesFull);
    expect(indexFull).toBe(1);
    expect(subtree.tileIsAvailableAtIndex(indexFull)).toEqual(true);
    expect(
      subtree.tileIsAvailableAtCoordinates(implicitCoordinatesFull)
    ).toEqual(true);
    expect(subtree.contentIsAvailableAtIndex(indexFull)).toEqual(true);
    expect(
      subtree.contentIsAvailableAtCoordinates(implicitCoordinatesFull)
    ).toEqual(true);

    // level offset: 1, morton index: 3, so tile index is 1 + 3 = 4
    var implicitCoordinatesEmpty = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 1,
      x: 1,
      y: 1,
    });
    var indexEmpty = subtree.getTileIndex(implicitCoordinatesEmpty);
    expect(indexEmpty).toBe(4);
    expect(subtree.tileIsAvailableAtIndex(indexEmpty)).toEqual(false);
    expect(
      subtree.tileIsAvailableAtCoordinates(implicitCoordinatesEmpty)
    ).toEqual(false);
    expect(subtree.contentIsAvailableAtIndex(indexEmpty)).toEqual(false);
    expect(
      subtree.contentIsAvailableAtCoordinates(implicitCoordinatesEmpty)
    ).toEqual(false);
  });

  it("getChildSubtreeIndex throws for a tile not in the child subtrees", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11000",
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "100000000000000",
        lengthBits: 16,
        isInternal: true,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var deeperQuadtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 0,
      y: 0,
    });
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      deeperQuadtreeCoordinates
    );

    expect(function () {
      var implicitCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 0,
        x: 0,
        y: 0,
      });
      return subtree.getChildSubtreeIndex(implicitCoordinates);
    }).toThrowRuntimeError();
    expect(function () {
      var implicitCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 5,
        x: 0,
        y: 0,
      });
      return subtree.getChildSubtreeIndex(implicitCoordinates);
    }).toThrowRuntimeError();
  });

  it("getChildSubtreeIndex computes bit index for a tile in the subtree", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11000",
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 9,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "100000000000000",
        lengthBits: 16,
        isInternal: true,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var subtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 0,
      x: 0,
      y: 0,
    });
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      subtreeCoordinates
    );

    var implicitCoordinatesFull = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 0,
      y: 0,
    });

    // morton index is 0, so child subtree index is 0
    var indexFull = subtree.getChildSubtreeIndex(implicitCoordinatesFull);
    expect(indexFull).toBe(0);
    expect(subtree.childSubtreeIsAvailableAtIndex(indexFull)).toEqual(true);
    expect(
      subtree.childSubtreeIsAvailableAtCoordinates(implicitCoordinatesFull)
    ).toEqual(true);

    var implicitCoordinatesEmpty = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 1,
      y: 1,
    });

    // morton index is 3, so child subtree index is 3
    var indexEmpty = subtree.getChildSubtreeIndex(implicitCoordinatesEmpty);
    expect(indexEmpty).toBe(3);
    expect(subtree.childSubtreeIsAvailableAtIndex(indexEmpty)).toEqual(false);
    expect(
      subtree.childSubtreeIsAvailableAtCoordinates(implicitCoordinatesEmpty)
    ).toEqual(false);
  });

  it("computes parent Morton index", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "110101111",
        lengthBits: 9,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "110101011",
          lengthBits: 9,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: 1,
        lengthBits: 64,
        isInternal: true,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitOctree,
      octreeCoordinates
    );

    // 341 = 0b101010101
    //  42 = 0b101010
    expect(subtree.getParentMortonIndex(341)).toBe(42);
  });

  it("availability works for octrees", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "110101111",
        lengthBits: 9,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: "110101011",
          lengthBits: 9,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: 1,
        lengthBits: 64,
        isInternal: true,
      },
    };

    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitOctree,
      octreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        subtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        subtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("handles subtree with constant-only data", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: 1,
        lengthBits: 9,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: 0,
          lengthBits: 9,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: 0,
        lengthBits: 64,
        isInternal: true,
      },
    };

    var constantOnly = true;
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription,
      constantOnly
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitOctree,
      octreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        subtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        subtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("rejects ready promise on error", function () {
    var error = new Error("simulated error");
    spyOn(when, "all").and.returnValue(when.reject(error));
    var subtreeDescription = {
      tileAvailability: {
        descriptor: 1,
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: [
        {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
        },
      ],
      childSubtreeAvailability: {
        descriptor: 0,
        lengthBits: 16,
        isInternal: true,
      },
    };

    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise
      .then(function () {
        fail();
      })
      .otherwise(function (error) {
        expect(error).toEqual(error);
      });
  });

  it("destroys", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11010",
        lengthBits: 5,
        isInternal: false,
      },
      contentAvailability: [
        {
          descriptor: "11000",
          lengthBits: 5,
          isInternal: false,
        },
      ],
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
        lengthBits: 16,
        isInternal: false,
      },
    };
    var results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    spyOn(ResourceCache, "load").and.callFake(fakeLoad(results.externalBuffer));
    var unload = spyOn(ResourceCache, "unload");
    var subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      var bufferLoader = subtree._bufferLoader;
      expect(bufferLoader).toBeDefined();

      expect(subtree.isDestroyed()).toBe(false);
      subtree.destroy();
      expect(subtree.isDestroyed()).toBe(true);
      expect(unload).toHaveBeenCalled();
    });
  });

  describe("3DTILES_multiple_contents", function () {
    var tileJson = {
      geometricError: 500,
      refine: "ADD",
      boundingVolume: {
        region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
      },
      extensions: {
        "3DTILES_implicit_tiling": {
          subdivisionScheme: "QUADTREE",
          subtreeLevels: 2,
          maximumLevel: 1,
          subtrees: {
            uri: "https://example.com/{level}/{x}/{y}.subtree",
          },
        },
        "3DTILES_multiple_contents": {
          content: [
            {
              uri: "https://example.com/{level}/{x}/{y}.b3dm",
            },
            {
              uri: "https://example.com/{level}/{x}/{y}.pnts",
            },
          ],
        },
      },
    };

    var multipleContentsQuadtree = new ImplicitTileset(
      tilesetResource,
      tileJson,
      metadataSchema
    );

    it("contentIsAvailableAtIndex throws for out-of-bounds contentIndex", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
        },
        contentAvailability: [
          {
            descriptor: 1,
            lengthBits: 5,
            isInternal: true,
          },
          {
            descriptor: "10011",
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
      };
      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        multipleContentsQuadtree,
        quadtreeCoordinates
      );

      var outOfBounds = 100;
      return subtree.readyPromise.then(function () {
        expect(function () {
          subtree.contentIsAvailableAtIndex(0, outOfBounds);
        }).toThrowDeveloperError();
      });
    });

    it("contentIsAvailableAtIndex works for multiple contents", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
        },
        contentAvailability: [
          {
            descriptor: 1,
            lengthBits: 5,
            isInternal: false,
          },
          {
            descriptor: "10011",
            lengthBits: 5,
            isInternal: false,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
      };
      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        multipleContentsQuadtree,
        quadtreeCoordinates
      );
      return subtree.readyPromise.then(function () {
        expect(fetchExternal).toHaveBeenCalled();
        expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      });
    });
  });

  describe("3DTILES_metadata", function () {
    var schema = {
      classes: {
        tile: {
          properties: {
            highlightColor: {
              type: "VEC3",
              componentType: "UINT8",
            },
            buildingCount: {
              componentType: "UINT16",
            },
          },
        },
      },
    };

    var highlightColors = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [255, 0, 255],
    ];
    var buildingCounts = [100, 800, 500, 350, 200];

    var tileTableDescription = {
      class: "tile",
      properties: {
        highlightColor: highlightColors,
        buildingCount: buildingCounts,
      },
    };

    var propertyTablesDescription = {
      schema: schema,
      propertyTables: [tileTableDescription],
    };

    var metadataSchema = new MetadataSchema(schema);

    var metadataQuadtree = new ImplicitTileset(
      tilesetResource,
      implicitQuadtreeJson,
      metadataSchema
    );

    it("creates a metadata table from internal metadata", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: 1,
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: propertyTablesDescription,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        metadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).not.toHaveBeenCalled();

        var metadataTable = subtree.metadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (var i = 0; i < buildingCounts.length; i++) {
          expect(metadataTable.getProperty(i, "highlightColor")).toEqual(
            Cartesian3.unpack(highlightColors[i])
          );
          expect(metadataTable.getProperty(i, "buildingCount")).toBe(
            buildingCounts[i]
          );
        }
      });
    });

    it("creates a metadata table from external metadata", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: 1,
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: false,
          propertyTables: propertyTablesDescription,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        metadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).toHaveBeenCalled();

        var metadataTable = subtree.metadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (var i = 0; i < buildingCounts.length; i++) {
          expect(metadataTable.getProperty(i, "highlightColor")).toEqual(
            Cartesian3.unpack(highlightColors[i])
          );
          expect(metadataTable.getProperty(i, "buildingCount")).toBe(
            buildingCounts[i]
          );
        }
      });
    });

    it("works correctly if availableCount is undefined", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: false,
        },
        contentAvailability: [
          {
            descriptor: 1,
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: propertyTablesDescription,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        metadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).not.toHaveBeenCalled();

        var metadataTable = subtree.metadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (var i = 0; i < buildingCounts.length; i++) {
          expect(metadataTable.getProperty(i, "highlightColor")).toEqual(
            Cartesian3.unpack(highlightColors[i])
          );
          expect(metadataTable.getProperty(i, "buildingCount")).toBe(
            buildingCounts[i]
          );
        }
      });
    });

    it("getEntityId returns undefined for subtree without metadata", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
        },
        contentAvailability: [
          {
            descriptor: 1,
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        implicitQuadtree,
        quadtreeCoordinates
      );
      var coordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 1,
        x: 1,
        y: 1,
      });
      expect(subtree.getEntityId(coordinates)).not.toBeDefined();
    });

    it("getEntityId throws for out-of-bounds coordinates", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: "11001",
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "11001",
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: propertyTablesDescription,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        metadataQuadtree,
        quadtreeCoordinates
      );

      expect(function () {
        var coordinates = new ImplicitTileCoordinates({
          subdivisionScheme: metadataQuadtree.subdivisionScheme,
          subtreeLevels: metadataQuadtree.subtreeLevels,
          level: 4,
          x: 1,
          y: 1,
        });
        return subtree.getEntityId(coordinates);
      }).toThrowRuntimeError();
    });

    it("getEntityId computes the entity id", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: "11001",
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "11001",
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: propertyTablesDescription,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        metadataQuadtree,
        quadtreeCoordinates
      );

      var coordinates = new ImplicitTileCoordinates({
        subdivisionScheme: metadataQuadtree.subdivisionScheme,
        subtreeLevels: metadataQuadtree.subtreeLevels,
        level: 1,
        x: 1,
        y: 1,
      });
      expect(subtree.getEntityId(coordinates)).toBe(2);
    });

    it("getEntityId returns undefined for unavailable tile", function () {
      var subtreeDescription = {
        tileAvailability: {
          descriptor: "11001",
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "11001",
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: propertyTablesDescription,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        metadataQuadtree,
        quadtreeCoordinates
      );

      var coordinates = new ImplicitTileCoordinates({
        subdivisionScheme: metadataQuadtree.subdivisionScheme,
        subtreeLevels: metadataQuadtree.subtreeLevels,
        level: 1,
        x: 1,
        y: 0,
      });
      expect(subtree.getEntityId(coordinates)).not.toBeDefined();
    });

    it("handles unavailable tiles correctly", function () {
      var highlightColors = [
        [255, 0, 0],
        [255, 255, 0],
        [255, 0, 255],
      ];

      var buildingCounts = [100, 350, 200];

      var tileTableDescription = {
        class: "tile",
        properties: {
          highlightColor: highlightColors,
          buildingCount: buildingCounts,
        },
      };

      var propertyTablesDescription = {
        schema: schema,
        propertyTables: [tileTableDescription],
      };

      var subtreeDescription = {
        tileAvailability: {
          descriptor: "10011",
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10011",
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: propertyTablesDescription,
        },
      };

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        metadataQuadtree,
        quadtreeCoordinates
      );
      return subtree.readyPromise.then(function () {
        expect(subtree._jumpBuffer).toEqual(new Uint8Array([0, 0, 0, 1, 2]));

        var metadataTable = subtree.metadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(3);

        for (var i = 0; i < buildingCounts.length; i++) {
          expect(metadataTable.getProperty(i, "highlightColor")).toEqual(
            Cartesian3.unpack(highlightColors[i])
          );
          expect(metadataTable.getProperty(i, "buildingCount")).toBe(
            buildingCounts[i]
          );
        }
      });
    });

    it("handles metadata with string and array offsets", function () {
      if (!MetadataTester.isSupported()) {
        return;
      }

      var arraySchema = {
        classes: {
          tile: {
            properties: {
              stringProperty: {
                componentType: "STRING",
              },
              arrayProperty: {
                type: "ARRAY",
                componentType: "INT16",
              },
              arrayOfStringProperty: {
                type: "ARRAY",
                componentType: "STRING",
              },
            },
          },
        },
      };

      var stringValues = ["foo", "bar", "baz", "qux", "quux"];
      var arrayValues = [[1, 2], [3], [4, 5, 6], [7], []];
      var stringArrayValues = [["foo"], ["bar", "bar"], ["qux"], ["quux"], []];

      var tileTableDescription = {
        class: "tile",
        properties: {
          stringProperty: stringValues,
          arrayProperty: arrayValues,
          arrayOfStringProperty: stringArrayValues,
        },
      };

      var propertyTablesWithOffsets = {
        schema: arraySchema,
        propertyTables: [tileTableDescription],
      };

      var subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: 1,
            lengthBits: 5,
            isInternal: true,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: propertyTablesWithOffsets,
        },
      };

      var metadataSchema = new MetadataSchema(arraySchema);

      var arrayQuadtree = new ImplicitTileset(
        tilesetResource,
        implicitQuadtreeJson,
        metadataSchema
      );

      var results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      var subtree = new ImplicitSubtree(
        subtreeResource,
        results.subtreeBuffer,
        arrayQuadtree,
        quadtreeCoordinates
      );
      return subtree.readyPromise.then(function () {
        var metadataTable = subtree.metadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (var i = 0; i < buildingCounts.length; i++) {
          expect(metadataTable.getProperty(i, "stringProperty")).toBe(
            stringValues[i]
          );
          expect(metadataTable.getProperty(i, "arrayProperty")).toEqual(
            arrayValues[i]
          );
          expect(metadataTable.getProperty(i, "arrayOfStringProperty")).toEqual(
            stringArrayValues[i]
          );
        }
      });
    });
  });
});
