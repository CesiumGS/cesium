import {
  ImplicitSubtree,
  ImplicitSubtreeCache,
  ImplicitTileset,
  ImplicitTileCoordinates,
  Resource,
} from "../../index.js";

describe("Scene/ImplicitSubtreeCache", function () {
  const implicitOctreeJson = {
    geometricError: 500,
    refine: "REPLACE",
    boundingVolume: {
      region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
    },
    content: {
      uri: "https://example.com/{level}/{x}_{y}_{z}.b3dm",
    },
    implicitTiling: {
      subdivisionScheme: "OCTREE",
      subtreeLevels: 2,
      availableLevels: 4,
      subtrees: {
        uri: "https://example.com/{level}/{x}_{y}_{z}.subtree",
      },
    },
  };

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

  let tilesetResource;
  let subtreeResource;
  let implicitOctree;
  let metadataSchema; // intentionally left undefined

  beforeEach(function () {
    tilesetResource = new Resource({
      url: "https://example.com/tileset.json",
    });

    subtreeResource = new Resource({
      url: "https://example.com/test.subtree",
    });

    implicitOctree = new ImplicitTileset(
      tilesetResource,
      implicitOctreeJson,
      metadataSchema
    );
  });

  it("constructs", function () {
    const cache = new ImplicitSubtreeCache();
    expect(cache._maximumSubtreeCount).toBe(0);
    expect(cache._subtreeRequestCounter).toBe(0);
  });

  it("can add a subtree", async function () {
    const cache = new ImplicitSubtreeCache();
    const octreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitOctree.subdivisionScheme,
      subtreeLevels: implicitOctree.subtreeLevels,
      level: 0,
      x: 0,
      y: 0,
      z: 0,
    });
    const subtree = await ImplicitSubtree.fromSubtreeJson(
      subtreeResource,
      subtreeConstantJson,
      undefined,
      implicitOctree,
      octreeCoordinates
    );
    cache.addSubtree(subtree);
    expect(cache._subtreeRequestCounter).toBe(1);
  });

  it("addSubtree throws if parent does not exist", async function () {
    const cache = new ImplicitSubtreeCache();
    const octreeCoordinates = new ImplicitTileCoordinates({
      subdivisionScheme: implicitOctree.subdivisionScheme,
      subtreeLevels: implicitOctree.subtreeLevels,
      level: 2,
      x: 0,
      y: 1,
      z: 0,
    });
    const subtree = await ImplicitSubtree.fromSubtreeJson(
      subtreeResource,
      subtreeConstantJson,
      undefined,
      implicitOctree,
      octreeCoordinates
    );
    expect(() => cache.addSubtree(subtree)).toThrowDeveloperError();
  });

  it("addSubtree trims cache as needed", async function () {
    const cache = new ImplicitSubtreeCache({
      maximumSubtreeCount: 3,
    });
    const octreeCoordArray = [
      { level: 0, x: 0, y: 0, z: 0 },
      { level: 2, x: 1, y: 0, z: 0 },
      { level: 2, x: 0, y: 1, z: 0 },
      { level: 2, x: 0, y: 0, z: 1 },
    ];
    const octreeCoordParams = {
      subdivisionScheme: implicitOctree.subdivisionScheme,
      subtreeLevels: implicitOctree.subtreeLevels,
    };
    await Promise.all(
      octreeCoordArray.map(async (octreeCoord) => {
        const octreeCoordinates = new ImplicitTileCoordinates(
          Object.assign({}, octreeCoordParams, octreeCoord)
        );
        const subtree = await ImplicitSubtree.fromSubtreeJson(
          subtreeResource,
          subtreeConstantJson,
          undefined,
          implicitOctree,
          octreeCoordinates
        );
        cache.addSubtree(subtree);
      })
    );
    expect(cache._subtreeRequestCounter).toBe(4);
    expect(cache._queue.length).toBe(3);
  });
});
