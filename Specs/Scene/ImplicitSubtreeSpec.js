import {
  Cartesian3,
  clone,
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

  const subtreeConstantJson = {
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

  const constantQuadtreeDescription = {
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

  it("gets availability from JSON constants", function () {
    const subtree = new ImplicitSubtree(
      subtreeResource,
      subtreeConstantJson,
      undefined,
      implicitQuadtree,
      quadtreeCoordinates
    );

    return subtree.readyPromise.then(function () {
      expectTileAvailability(
        subtree,
        constantQuadtreeDescription.tileAvailability
      );
      expectContentAvailability(
        subtree,
        constantQuadtreeDescription.contentAvailability
      );
      expectChildSubtreeAvailability(
        subtree,
        constantQuadtreeDescription.childSubtreeAvailability
      );
    });
  });

  it("gets availability from JSON and external buffers", function () {
    const description = {
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
      json: true,
    };

    const results = ImplicitTilingTester.generateSubtreeBuffers(description);

    const fetchExternal = spyOn(ResourceCache, "load").and.callFake(
      fakeLoad(results.externalBuffer)
    );

    const subtree = new ImplicitSubtree(
      subtreeResource,
      results.subtreeJson,
      undefined,
      implicitQuadtree,
      quadtreeCoordinates
    );

    return subtree.readyPromise.then(function () {
      expectTileAvailability(subtree, description.tileAvailability);
      expectContentAvailability(subtree, description.contentAvailability);
      expectChildSubtreeAvailability(
        subtree,
        description.childSubtreeAvailability
      );

      expect(fetchExternal.calls.count()).toEqual(1);
    });
  });

  // Test for backwards compatibility
  it("gets availability with bufferViews", function () {
    const description = clone(internalQuadtreeDescription);
    description.useBufferViews = true;

    const results = ImplicitTilingTester.generateSubtreeBuffers(description);

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

  it("contentIsAvailableAtIndex works for multiple contents without extension", function () {
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
      implicitQuadtree,
      quadtreeCoordinates
    );

    return subtree.readyPromise.then(function () {
      expect(fetchExternal).toHaveBeenCalled();
      expectTileAvailability(subtree, subtreeDescription.tileAvailability);
      expectContentAvailability(
        subtree,
        subtreeDescription.contentAvailability
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

    const multipleContentsCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: multipleContentsQuadtree.subdivisionScheme,
      subtreeLevels: multipleContentsQuadtree.subtreeLevels,
      level: 0,
      x: 0,
      y: 0,
    });

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
        useMultipleContentsExtension: true,
      };
      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );
      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        multipleContentsQuadtree,
        multipleContentsCoordinates
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
        useMultipleContentsExtension: true,
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
        multipleContentsCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).toHaveBeenCalled();
        expectTileAvailability(subtree, subtreeDescription.tileAvailability);
        expectContentAvailability(
          subtree,
          subtreeDescription.contentAvailability
        );
      });
    });
  });

  describe("3DTILES_metadata", function () {
    const tileProperties = {
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
    };

    const tileSchema = {
      classes: {
        tile: tileProperties,
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
              array: true,
            },
          },
        },
      },
    };

    const buildingProperties = {
      properties: {
        height: {
          type: "SCALAR",
          componentType: "UINT16",
          semantic: "_HEIGHT",
        },
        buildingType: {
          type: "STRING",
          semantic: "_BUILDING_TYPE",
        },
      },
    };

    const treeProperties = {
      properties: {
        height: {
          type: "SCALAR",
          componentType: "UINT16",
          semantic: "_HEIGHT",
        },
        species: {
          type: "STRING",
          semantic: "_TREE_SPECIES",
        },
      },
    };

    const buildingSchema = {
      classes: {
        tile: tileProperties,
        building: buildingProperties,
      },
    };

    const multipleContentsSchema = {
      classes: {
        tile: tileProperties,
        building: buildingProperties,
        tree: treeProperties,
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

    const buildingHeights = [20, 30, 10];
    const buildingTypes = ["Residential", "Commercial", "Other"];
    const buildingTableDescription = {
      class: "building",
      properties: {
        height: buildingHeights,
        buildingType: buildingTypes,
      },
    };

    const treeHeights = [3, 1, 2, 4];
    const treeSpecies = ["Oak", "Chestnut", "Pine", "Maple"];
    const treeTableDescription = {
      class: "tree",
      properties: {
        height: treeHeights,
        species: treeSpecies,
      },
    };

    const tilePropertyTablesDescription = {
      schema: tileSchema,
      propertyTables: [tileTableDescription],
    };

    const buildingPropertyTablesDescription = {
      schema: buildingSchema,
      propertyTables: [tileTableDescription, buildingTableDescription],
    };

    const multiplePropertyTablesDescription = {
      schema: multipleContentsSchema,
      propertyTables: [
        tileTableDescription,
        buildingTableDescription,
        treeTableDescription,
      ],
    };

    const tileMetadataSchema = new MetadataSchema(tileSchema);
    const subtreeMetadataSchema = new MetadataSchema(subtreeSchema);
    const buildingMetadataSchema = new MetadataSchema(buildingSchema);
    const multipleContentsMetadataSchema = new MetadataSchema(
      multipleContentsSchema
    );

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

    const buildingMetadataQuadtree = new ImplicitTileset(
      tilesetResource,
      implicitQuadtreeJson,
      buildingMetadataSchema
    );

    const multipleContentsMetadataQuadtree = new ImplicitTileset(
      tilesetResource,
      implicitQuadtreeJson,
      multipleContentsMetadataSchema
    );

    it("creates subtree metadata from JSON", function () {
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

    it("creates a metadata table from internal metadata for tiles", function () {
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
          propertyTables: tilePropertyTablesDescription,
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

    it("creates a metadata table from external metadata for tiles", function () {
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
          propertyTables: tilePropertyTablesDescription,
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

    it("creates a metadata table from internal metadata for single content", function () {
      const subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10110",
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
          propertyTables: buildingPropertyTablesDescription,
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
        buildingMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).not.toHaveBeenCalled();
        const metadataTables = subtree.contentMetadataTables;
        expect(metadataTables).toBeDefined();
        expect(metadataTables.length).toBe(1);

        const metadataTable = metadataTables[0];
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(3);

        for (let i = 0; i < buildingHeights.length; i++) {
          expect(metadataTable.getProperty(i, "height")).toEqual(
            buildingHeights[i]
          );
          expect(metadataTable.getProperty(i, "buildingType")).toBe(
            buildingTypes[i]
          );
        }
      });
    });

    it("creates a metadata table from external metadata for single content", function () {
      const subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10110",
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
          propertyTables: buildingPropertyTablesDescription,
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
        buildingMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).toHaveBeenCalled();
        const metadataTables = subtree.contentMetadataTables;
        expect(metadataTables).toBeDefined();
        expect(metadataTables.length).toBe(1);

        const metadataTable = metadataTables[0];
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(3);

        for (let i = 0; i < buildingHeights.length; i++) {
          expect(metadataTable.getProperty(i, "height")).toEqual(
            buildingHeights[i]
          );
          expect(metadataTable.getProperty(i, "buildingType")).toBe(
            buildingTypes[i]
          );
        }
      });
    });

    it("creates a metadata table from internal metadata for multiple contents", function () {
      const subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10110",
            lengthBits: 5,
            isInternal: true,
          },
          {
            descriptor: "01111",
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
          propertyTables: multiplePropertyTablesDescription,
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
        multipleContentsMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).not.toHaveBeenCalled();
        const metadataTables = subtree.contentMetadataTables;
        expect(metadataTables).toBeDefined();
        expect(metadataTables.length).toBe(2);

        const buildingMetadataTable = metadataTables[0];
        expect(buildingMetadataTable).toBeDefined();
        expect(buildingMetadataTable.count).toBe(3);

        for (let i = 0; i < buildingHeights.length; i++) {
          expect(buildingMetadataTable.getProperty(i, "height")).toEqual(
            buildingHeights[i]
          );
          expect(buildingMetadataTable.getProperty(i, "buildingType")).toBe(
            buildingTypes[i]
          );
        }

        const treeMetadataTable = metadataTables[1];
        expect(treeMetadataTable).toBeDefined();
        expect(treeMetadataTable.count).toBe(4);

        for (let i = 0; i < treeHeights.length; i++) {
          expect(treeMetadataTable.getProperty(i, "height")).toEqual(
            treeHeights[i]
          );
          expect(treeMetadataTable.getProperty(i, "species")).toBe(
            treeSpecies[i]
          );
        }
      });
    });

    it("creates a metadata table from external metadata for multiple contents", function () {
      const subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10110",
            lengthBits: 5,
            isInternal: true,
          },
          {
            descriptor: "01111",
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
          propertyTables: multiplePropertyTablesDescription,
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
        multipleContentsMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).toHaveBeenCalled();
        const metadataTables = subtree.contentMetadataTables;
        expect(metadataTables).toBeDefined();
        expect(metadataTables.length).toBe(2);

        const buildingMetadataTable = metadataTables[0];
        expect(buildingMetadataTable).toBeDefined();
        expect(buildingMetadataTable.count).toBe(3);

        for (let i = 0; i < buildingHeights.length; i++) {
          expect(buildingMetadataTable.getProperty(i, "height")).toEqual(
            buildingHeights[i]
          );
          expect(buildingMetadataTable.getProperty(i, "buildingType")).toBe(
            buildingTypes[i]
          );
        }

        const treeMetadataTable = metadataTables[1];
        expect(treeMetadataTable).toBeDefined();
        expect(treeMetadataTable.count).toBe(4);

        for (let i = 0; i < treeHeights.length; i++) {
          expect(treeMetadataTable.getProperty(i, "height")).toEqual(
            treeHeights[i]
          );
          expect(treeMetadataTable.getProperty(i, "species")).toBe(
            treeSpecies[i]
          );
        }
      });
    });

    // test for backwards compatibility
    it("handles 3DTiles_metadata extension", function () {
      const subtreeDescription = {
        tileAvailability: {
          descriptor: 1,
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10110",
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
          propertyTables: buildingPropertyTablesDescription,
          useMetadataExtension: true,
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
        buildingMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        expect(fetchExternal).not.toHaveBeenCalled();
        const metadataTables = subtree.contentMetadataTables;
        expect(metadataTables).toBeDefined();
        expect(metadataTables.length).toBe(1);

        const metadataTable = metadataTables[0];
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(3);

        for (let i = 0; i < buildingHeights.length; i++) {
          expect(metadataTable.getProperty(i, "height")).toEqual(
            buildingHeights[i]
          );
          expect(metadataTable.getProperty(i, "buildingType")).toBe(
            buildingTypes[i]
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
            includeAvailableCount: false,
          },
        ],
        childSubtreeAvailability: {
          descriptor: 0,
          lengthBits: 16,
          isInternal: true,
        },
        metadata: {
          isInternal: true,
          propertyTables: tilePropertyTablesDescription,
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
        expect(subtree._tileJumpBuffer).toEqual(
          new Uint8Array([0, 0, 0, 1, 2])
        );

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

    it("handles unavailable content correctly", function () {
      const buildingHeightsTruncated = buildingHeights.slice(0, 2);
      const buildingTypesTruncated = buildingTypes.slice(0, 2);

      const subtreeDescription = {
        tileAvailability: {
          descriptor: "10011",
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10010",
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
          propertyTables: buildingPropertyTablesDescription,
        },
      };

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );

      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        buildingMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        const jumpBuffer = subtree._contentJumpBuffers[0];
        expect(jumpBuffer).toEqual(new Uint8Array([0, 0, 0, 1, 0]));

        const metadataTables = subtree.contentMetadataTables;
        expect(metadataTables).toBeDefined();
        expect(metadataTables.length).toBe(1);

        const metadataTable = metadataTables[0];
        expect(metadataTable).toBeDefined();
        expect(metadataTable.count).toBe(2);

        for (let i = 0; i < buildingHeightsTruncated.length; i++) {
          expect(metadataTable.getProperty(i, "height")).toEqual(
            buildingHeightsTruncated[i]
          );
          expect(metadataTable.getProperty(i, "buildingType")).toBe(
            buildingTypesTruncated[i]
          );
        }
      });
    });

    it("handles unavailable multiple contents correctly", function () {
      const buildingHeightsTruncated = buildingHeights.slice(0, 1);
      const buildingTypesTruncated = buildingTypes.slice(0, 1);

      const treeHeightsTruncated = treeHeights.slice(0, 2);
      const treeSpeciesTruncated = treeSpecies.slice(0, 2);

      const subtreeDescription = {
        tileAvailability: {
          descriptor: "10011",
          lengthBits: 5,
          isInternal: true,
          includeAvailableCount: true,
        },
        contentAvailability: [
          {
            descriptor: "10000",
            lengthBits: 5,
            isInternal: true,
          },
          {
            descriptor: "00011",
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
          propertyTables: multiplePropertyTablesDescription,
        },
      };

      const results = ImplicitTilingTester.generateSubtreeBuffers(
        subtreeDescription
      );

      const subtree = new ImplicitSubtree(
        subtreeResource,
        undefined,
        results.subtreeBuffer,
        multipleContentsMetadataQuadtree,
        quadtreeCoordinates
      );

      return subtree.readyPromise.then(function () {
        const buildingJumpBuffer = subtree._contentJumpBuffers[0];
        expect(buildingJumpBuffer).toEqual(new Uint8Array([0, 0, 0, 0, 0]));

        const treeJumpBuffer = subtree._contentJumpBuffers[1];
        expect(treeJumpBuffer).toEqual(new Uint8Array([0, 0, 0, 0, 1]));

        const metadataTables = subtree.contentMetadataTables;
        expect(metadataTables).toBeDefined();
        expect(metadataTables.length).toBe(2);

        const buildingMetadataTable = metadataTables[0];
        expect(buildingMetadataTable).toBeDefined();
        expect(buildingMetadataTable.count).toBe(1);

        for (let i = 0; i < buildingHeightsTruncated.length; i++) {
          expect(buildingMetadataTable.getProperty(i, "height")).toEqual(
            buildingHeightsTruncated[i]
          );
          expect(buildingMetadataTable.getProperty(i, "buildingType")).toBe(
            buildingTypesTruncated[i]
          );
        }

        const treeMetadataTable = metadataTables[1];
        expect(treeMetadataTable).toBeDefined();
        expect(treeMetadataTable.count).toBe(2);

        for (let i = 0; i < treeHeightsTruncated.length; i++) {
          expect(treeMetadataTable.getProperty(i, "height")).toEqual(
            treeHeightsTruncated[i]
          );
          expect(treeMetadataTable.getProperty(i, "species")).toBe(
            treeSpeciesTruncated[i]
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
                array: true,
              },
              arrayOfStringProperty: {
                type: "STRING",
                array: true,
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
