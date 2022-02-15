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
      const constant = availability.descriptor === 1;
      const repeated = new Array(availability.lengthBits);
      for (let i = 0; i < availability.lengthBits; i++) {
        repeated[i] = constant;
      }
      return repeated;
    }

    return availability.descriptor.split("").map(function (x) {
      return x === "1";
    });
  }

  function expectTileAvailability(subtree, availability) {
    const expectedAvailability = availabilityToBooleanArray(availability);
    for (let i = 0; i < availability.lengthBits; i++) {
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
    for (let i = 0; i < availabilityArray.length; i++) {
      const availability = availabilityArray[i];
      const expectedAvailability = availabilityToBooleanArray(availability);
      for (let j = 0; j < availability.lengthBits; j++) {
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
    const expectedAvailability = availabilityToBooleanArray(availability);
    for (let i = 0; i < availability.lengthBits; i++) {
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
      const fakeCacheResource = {
        typedArray: arrayBuffer,
      };
      options.resourceLoader._promise = {
        promise: when.resolve(fakeCacheResource),
      };
    };
  }

  const tilesetResource = new Resource({
    url: "https://example.com/tileset.json",
  });
  const subtreeResource = new Resource({
    url: "https://example.com/test.subtree",
  });
  let metadataSchema; // intentionally left undefined

  const subtreeJson = {
    tileAvailability: {
      constant: 1,
    },
    contentAvailability: {
      constant: 1,
    },
    childSubtreeAvailability: {
      constant: 0,
    },
  };

  const implicitQuadtreeJson = {
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
        availableLevels: 4,
        subtrees: {
          uri: "https://example.com/{level}/{x}/{y}.subtree",
        },
      },
    },
  };

  const implicitQuadtree = new ImplicitTileset(
    tilesetResource,
    implicitQuadtreeJson,
    metadataSchema
  );

  const quadtreeCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitQuadtree.subdivisionScheme,
    subtreeLevels: implicitQuadtree.subtreeLevels,
    level: 0,
    x: 0,
    y: 0,
  });

  const implicitOctreeJson = {
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
        availableLevels: 4,
        subtrees: {
          uri: "https://example.com/{level}/{x}_{y}_{z}.subtree",
        },
      },
    },
  };

  const implicitOctree = new ImplicitTileset(
    tilesetResource,
    implicitOctreeJson,
    metadataSchema
  );

  const octreeCoordinates = new ImplicitTileCoordinates({
    subdivisionScheme: implicitOctree.subdivisionScheme,
    subtreeLevels: implicitOctree.subtreeLevels,
    level: 0,
    z: 0,
    x: 0,
    y: 0,
  });

  const internalQuadtreeDescription = {
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

  const jsonQuadtreeDescription = {
    tileAvailability: {
      descriptor: "11111",
      lengthBits: 5,
      isInternal: false,
    },
    contentAvailability: [
      {
        descriptor: "11111",
        lengthBits: 5,
        isInternal: false,
      },
    ],
    childSubtreeAvailability: {
      descriptor: "0000000000000000",
      lengthBits: 16,
      isInternal: false,
    },
  };

  it("throws without resource", function () {
    expect(function () {
      const results = ImplicitTilingTester.generateSubtreeBuffers(
        internalQuadtreeDescription
      );
      return new ImplicitSubtree(
        undefined,
        undefined,
        results.subtreeBuffer,
        implicitQuadtree,
        quadtreeCoordinates
      );
    }).toThrowDeveloperError();
  });

  it("throws without json or subtreeView", function () {
    expect(function () {
      return new ImplicitSubtree(
        subtreeResource,
        undefined,
        undefined,
        implicitQuadtree,
        quadtreeCoordinates
      );
    }).toThrowDeveloperError();
  });

  it("throws without implicitTileset", function () {
    expect(function () {
      const results = ImplicitTilingTester.generateSubtreeBuffers(
        internalQuadtreeDescription
      );
      return new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        undefined,
        quadtreeCoordinates
      );
    }).toThrowDeveloperError();
  });

  it("throws without implicitCoordinates", function () {
    expect(function () {
      const results = ImplicitTilingTester.generateSubtreeBuffers(
        internalQuadtreeDescription
      );
      return new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        implicitQuadtree,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("sets the implicit coordinates of the subtree's root", function () {
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      internalQuadtreeDescription
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );

    expect(subtree.implicitCoordinates.isEqual(quadtreeCoordinates)).toEqual(
      true
    );
  });

  it("gets availability from internal buffer", function () {
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      internalQuadtreeDescription
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
      fakeLoad(results.externalBuffer)
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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

  it("gets availability from JSON", function () {
    const subtree = new ImplicitSubtree(
      subtreeResource,
      subtreeJson,
      undefined,
      implicitQuadtree,
      quadtreeCoordinates
    );

    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, jsonQuadtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        jsonQuadtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        jsonQuadtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("handles typed arrays with a byte offset", function () {
    const subtreeDescription = {
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

    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    // Put the subtree buffer in a larger buffer so the byteOffset is not 0
    const paddingLength = 8;
    const biggerBuffer = new Uint8Array(
      results.subtreeBuffer.length + paddingLength
    );
    biggerBuffer.set(results.subtreeBuffer, paddingLength);
    const subtreeView = new Uint8Array(biggerBuffer.buffer, paddingLength);

    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
      fakeLoad(results.externalBuffer)
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
      fakeLoad(results.externalBuffer)
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expect(fetchExternal.calls.count()).toEqual(1);
    });
  });

  it("unused external buffers are not fetched", function () {
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    const fetchExternal = spyOn(
      Resource.prototype,
      "fetchArrayBuffer"
    ).and.returnValue(when.resolve(results.externalBuffer));
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      expect(fetchExternal).not.toHaveBeenCalled();
    });
  });

  it("missing contentAvailability is interpreted as 0s", function () {
    const subtreeDescription = {
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
    const expectedContentAvailability = {
      descriptor: 0,
      lengthBits: 5,
      isInternal: true,
    };

    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const subtreeDescription = {
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

    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitOctree,
      octreeCoordinates
    );

    expect(subtree.getLevelOffset(2)).toEqual(9);
  });

  it("getTileIndex throws for a tile not in the subtree", function () {
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );

    const deeperQuadtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 0,
      y: 0,
    });

    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      deeperQuadtreeCoordinates
    );

    expect(function () {
      const implicitCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 0,
        x: 0,
        y: 0,
      });
      return subtree.getTileIndex(implicitCoordinates);
    }).toThrowRuntimeError();
    expect(function () {
      const implicitCoordinates = new ImplicitTileCoordinates({
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const subtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 0,
      x: 0,
      y: 0,
    });
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      subtreeCoordinates
    );

    // level offset: 1, morton index: 0, so tile index is 1 + 0 = 1
    const implicitCoordinatesFull = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 1,
      x: 0,
      y: 0,
    });
    const indexFull = subtree.getTileIndex(implicitCoordinatesFull);
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
    const implicitCoordinatesEmpty = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 1,
      x: 1,
      y: 1,
    });
    const indexEmpty = subtree.getTileIndex(implicitCoordinatesEmpty);
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const deeperQuadtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 0,
      y: 0,
    });
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      deeperQuadtreeCoordinates
    );

    expect(function () {
      const implicitCoordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 0,
        x: 0,
        y: 0,
      });
      return subtree.getChildSubtreeIndex(implicitCoordinates);
    }).toThrowRuntimeError();
    expect(function () {
      const implicitCoordinates = new ImplicitTileCoordinates({
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const subtreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 0,
      x: 0,
      y: 0,
    });
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      subtreeCoordinates
    );

    const implicitCoordinatesFull = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 0,
      y: 0,
    });

    // morton index is 0, so child subtree index is 0
    const indexFull = subtree.getChildSubtreeIndex(implicitCoordinatesFull);
    expect(indexFull).toBe(0);
    expect(subtree.childSubtreeIsAvailableAtIndex(indexFull)).toEqual(true);
    expect(
      subtree.childSubtreeIsAvailableAtCoordinates(implicitCoordinatesFull)
    ).toEqual(true);

    const implicitCoordinatesEmpty = new ImplicitTileCoordinates({
      subdivisionScheme: implicitQuadtree.subdivisionScheme,
      subtreeLevels: implicitQuadtree.subtreeLevels,
      level: 2,
      x: 1,
      y: 1,
    });

    // morton index is 3, so child subtree index is 3
    const indexEmpty = subtree.getChildSubtreeIndex(implicitCoordinatesEmpty);
    expect(indexEmpty).toBe(3);
    expect(subtree.childSubtreeIsAvailableAtIndex(indexEmpty)).toEqual(false);
    expect(
      subtree.childSubtreeIsAvailableAtCoordinates(implicitCoordinatesEmpty)
    ).toEqual(false);
  });

  it("computes parent Morton index", function () {
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitOctree,
      octreeCoordinates
    );

    // 341 = 0b101010101
    //  42 = 0b101010
    expect(subtree.getParentMortonIndex(341)).toBe(42);
  });

  it("availability works for octrees", function () {
    const subtreeDescription = {
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

    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const subtreeDescription = {
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

    const constantOnly = true;
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription,
      constantOnly
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const error = new Error("simulated error");
    spyOn(when, "all").and.returnValue(when.reject(error));
    const subtreeDescription = {
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

    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
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
    const subtreeDescription = {
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
    const results = ImplicitTilingTester.generateSubtreeBuffers(
      subtreeDescription
    );
    spyOn(ResourceCache, "load").and.callFake(fakeLoad(results.externalBuffer));
    const unload = spyOn(ResourceCache, "unload");
    const subtree = new ImplicitSubtree(
      subtreeResource,
      undefined,
      results.subtreeBuffer,
      implicitQuadtree,
      quadtreeCoordinates
    );
    return subtree.readyPromise.then(function () {
      const bufferLoader = subtree._bufferLoader;
      expect(bufferLoader).toBeDefined();

      expect(subtree.isDestroyed()).toBe(false);
      subtree.destroy();
      expect(subtree.isDestroyed()).toBe(true);
      expect(unload).toHaveBeenCalled();
    });
  });

  describe("3DTILES_multiple_contents", function () {
    const tileJson = {
      geometricError: 500,
      refine: "ADD",
      boundingVolume: {
        region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
      },
      extensions: {
        "3DTILES_implicit_tiling": {
          subdivisionScheme: "QUADTREE",
          subtreeLevels: 2,
          availableLevels: 2,
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

    const multipleContentsQuadtree = new ImplicitTileset(
      tilesetResource,
      tileJson,
      metadataSchema
    );

    it("contentIsAvailableAtIndex throws for out-of-bounds contentIndex", function () {
      const subtreeDescription = {
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
      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        multipleContentsQuadtree,
        quadtreeCoordinates
      );

      const outOfBounds = 100;
      return subtree.readyPromise.then(function () {
        expect(function () {
          subtree.contentIsAvailableAtIndex(0, outOfBounds);
        }).toThrowDeveloperError();
      });
    });

    it("contentIsAvailableAtIndex works for multiple contents", function () {
      const subtreeDescription = {
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
      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
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
    const tileSchema = {
      classes: {
        tile: {
          properties: {
            highlightColor: {
              type: "VEC3",
              componentType: "UINT8",
            },
            buildingCount: {
              type: "SCALAR",
              componentType: "UINT16",
            },
          },
        },
      },
    };

    const subtreeJsonResource = new Resource({
      url: "https://example.com/0.0.0.json",
    });

    const subtreeSchema = {
      classes: {
        subtree: {
          properties: {
            author: {
              type: "STRING",
            },
            credits: {
              type: "STRING",
              hasFixedCount: false,
            },
          },
        },
      },
    };

    const highlightColors = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [255, 0, 255],
    ];
    const buildingCounts = [100, 800, 500, 350, 200];

    const tileTableDescription = {
      class: "tile",
      properties: {
        highlightColor: highlightColors,
        buildingCount: buildingCounts,
      },
    };

    const propertyTablesDescription = {
      schema: tileSchema,
      propertyTables: [tileTableDescription],
    };

    const tileMetadataSchema = new MetadataSchema(tileSchema);
    const subtreeMetadataSchema = new MetadataSchema(subtreeSchema);

    const tileMetadataQuadtree = new ImplicitTileset(
      tilesetResource,
      implicitQuadtreeJson,
      tileMetadataSchema
    );

    const subtreeMetadataQuadtree = new ImplicitTileset(
      tilesetResource,
      implicitQuadtreeJson,
      subtreeMetadataSchema
    );

    const metadataSubtreeJson = {
      tileAvailability: {
        constant: 1,
      },
      contentAvailability: {
        constant: 1,
      },
      childSubtreeAvailability: {
        constant: 0,
      },
      subtreeMetadata: {
        class: "subtree",
        properties: {
          author: "Cesium",
          credits: ["A", "B", "C"],
        },
      },
    };

    it("creates metadata from JSON", function () {
      const subtree = new ImplicitSubtree(
        subtreeJsonResource,
        metadataSubtreeJson,
        undefined,
        subtreeMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        const metadata = subtree.metadata;
        expect(metadata).toBeDefined();

        expect(metadata.hasProperty("author")).toBe(true);
        expect(metadata.hasProperty("credits")).toBe(true);

        expect(metadata.getProperty("author")).toEqual("Cesium");
        expect(metadata.getProperty("credits")).toEqual(["A", "B", "C"]);
      });
    });

    it("creates a metadata table from internal metadata", function () {
      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        tileMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).not.toHaveBeenCalled();

        const metadataTable = subtree.tileMetadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (let i = 0; i < buildingCounts.length; i++) {
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
      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        tileMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).toHaveBeenCalled();

        const metadataTable = subtree.tileMetadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (let i = 0; i < buildingCounts.length; i++) {
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
      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
        fakeLoad(results.externalBuffer)
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        tileMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).not.toHaveBeenCalled();

        const metadataTable = subtree.tileMetadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (let i = 0; i < buildingCounts.length; i++) {
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
      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        implicitQuadtree,
        quadtreeCoordinates
      );
      const coordinates = new ImplicitTileCoordinates({
        subdivisionScheme: implicitQuadtree.subdivisionScheme,
        subtreeLevels: implicitQuadtree.subtreeLevels,
        level: 1,
        x: 1,
        y: 1,
      });
      expect(subtree.getEntityId(coordinates)).not.toBeDefined();
    });

    it("getEntityId throws for out-of-bounds coordinates", function () {
      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        tileMetadataQuadtree,
        quadtreeCoordinates
      );

      expect(function () {
        const coordinates = new ImplicitTileCoordinates({
          subdivisionScheme: tileMetadataQuadtree.subdivisionScheme,
          subtreeLevels: tileMetadataQuadtree.subtreeLevels,
          level: 4,
          x: 1,
          y: 1,
        });
        return subtree.getEntityId(coordinates);
      }).toThrowRuntimeError();
    });

    it("getEntityId computes the entity id", function () {
      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        tileMetadataQuadtree,
        quadtreeCoordinates
      );

      const coordinates = new ImplicitTileCoordinates({
        subdivisionScheme: tileMetadataQuadtree.subdivisionScheme,
        subtreeLevels: tileMetadataQuadtree.subtreeLevels,
        level: 1,
        x: 1,
        y: 1,
      });
      expect(subtree.getEntityId(coordinates)).toBe(2);
    });

    it("getEntityId returns undefined for unavailable tile", function () {
      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        tileMetadataQuadtree,
        quadtreeCoordinates
      );

      const coordinates = new ImplicitTileCoordinates({
        subdivisionScheme: tileMetadataQuadtree.subdivisionScheme,
        subtreeLevels: tileMetadataQuadtree.subtreeLevels,
        level: 1,
        x: 1,
        y: 0,
      });
      expect(subtree.getEntityId(coordinates)).not.toBeDefined();
    });

    it("handles unavailable tiles correctly", function () {
      const highlightColors = [
        [255, 0, 0],
        [255, 255, 0],
        [255, 0, 255],
      ];

      const buildingCounts = [100, 350, 200];

      const tileTableDescription = {
        class: "tile",
        properties: {
          highlightColor: highlightColors,
          buildingCount: buildingCounts,
        },
      };

      const propertyTablesDescription = {
        schema: tileSchema,
        propertyTables: [tileTableDescription],
      };

      const subtreeDescription = {
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

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        tileMetadataQuadtree,
        quadtreeCoordinates
      );
      return subtree.readyPromise.then(function () {
        expect(subtree._jumpBuffer).toEqual(new Uint8Array([0, 0, 0, 1, 2]));

        const metadataTable = subtree.tileMetadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(3);

        for (let i = 0; i < buildingCounts.length; i++) {
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

      const arraySchema = {
        classes: {
          tile: {
            properties: {
              stringProperty: {
                type: "STRING",
              },
              arrayProperty: {
                type: "SCALAR",
                componentType: "INT16",
                hasFixedCount: false,
              },
              arrayOfStringProperty: {
                type: "STRING",
                hasFixedCount: false,
              },
            },
          },
        },
      };

      const stringValues = ["foo", "bar", "baz", "qux", "quux"];
      const arrayValues = [[1, 2], [3], [4, 5, 6], [7], []];
      const stringArrayValues = [
        ["foo"],
        ["bar", "bar"],
        ["qux"],
        ["quux"],
        [],
      ];

      const tileTableDescription = {
        class: "tile",
        properties: {
          stringProperty: stringValues,
          arrayProperty: arrayValues,
          arrayOfStringProperty: stringArrayValues,
        },
      };

      const propertyTablesWithOffsets = {
        schema: arraySchema,
        propertyTables: [tileTableDescription],
      };

      const subtreeDescription = {
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

      const metadataSchema = new MetadataSchema(arraySchema);

      const arrayQuadtree = new ImplicitTileset(
        tilesetResource,
        implicitQuadtreeJson,
        metadataSchema
      );

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        arrayQuadtree,
        quadtreeCoordinates
      );
      return subtree.readyPromise.then(function () {
        const metadataTable = subtree.tileMetadataTable;
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(5);

        for (let i = 0; i < buildingCounts.length; i++) {
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
