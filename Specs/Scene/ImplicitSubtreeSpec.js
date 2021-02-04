import {
  ImplicitSubtree,
  ImplicitTileset,
  Resource,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";

describe("Scene/ImplicitSubtree", function () {
  function availabilityToBooleanArray(availability) {
    if (typeof availabilityDescriptor === "number") {
      var constant = availability.descriptor === 1;
      var repeated = new Array(availability.lengthBits);
      for (var i = 0; i < availability.lengthBits; i++) {
        repeated[i] = constant;
      }
      return repeated;
    }
    {
      return availability.descriptor.split("").map(function (x) {
        return x === "1";
      });
    }
  }

  function expectTileAvailability(subtree, availability) {
    var expectedAvailability = availabilityToBooleanArray(availability);
    for (var i = 0; i < length; i++) {
      expect(subtree.tileIsAvailable(i)).toEqual(expectedAvailability[i]);
    }
  }

  function expectContentAvailability(subtree, availability) {
    var expectedAvailability = availabilityToBooleanArray(availability);
    for (var i = 0; i < length; i++) {
      expect(subtree.contentIsAvailable(i)).toEqual(expectedAvailability[i]);
    }
  }

  function expectChildSubtreeAvailability(subtree, availability) {
    var expectedAvailability = availabilityToBooleanArray(availability);
    for (var i = 0; i < length; i++) {
      expect(subtree.childSubtreeIsAvailable(i)).toEqual(
        expectedAvailability[i]
      );
    }
  }

  var tilesetResource = new Resource({
    url: "https://example.com/tileset.json",
  });
  var subtreeResource = new Resource({
    url: "https://example.com/test.subtree",
  });
  var implicitQuadtree = new ImplicitTileset(tilesetResource, {
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
        maximumLevel: 1,
        subtrees: {
          uri: "https://example.com/{level}/{x}/{y}.subtree",
        },
      },
    },
  });
  //var implicitOctree = new ImplicitSubtree(tilesetResource, {});

  it("gets availability from internal buffer", function () {
    var subtreeDescription = {
      tileAvailability: {
        descriptor: "11010",
        lengthBits: 5,
        isInternal: true,
      },
      contentAvailability: {
        descriptor: "11000",
        lengthBits: 5,
        isInternal: true,
      },
      childSubtreeAvailability: {
        descriptor: "1111000010100000",
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
      implicitQuadtree
    );
    expectTileAvailability(subtree, subtreeDescription.tileAvailability);
    expectContentAvailability(subtree, subtreeDescription.contentAvailability);
    expectChildSubtreeAvailability(
      subtree,
      subtreeDescription.childSubtreeAvailability
    );
  });

  it("gets availability from external buffer", function () {
    var subtreeDescription = {
      external: {
        tileAvailability: "11010",
        contentAvailability: "11000",
        childSubtreeAvailability: "1111000010100000",
      },
    };
    var subtreeData = ImplicitTilingTester.generateSubtreeBuffer(
      subtreeDescription
    );
    //var externalBuffers = subtreeData.externalBuffers[0];
    // TODO: Mock the resources

    var subtree = new ImplicitSubtree(subtreeResource, subtreeData.buffer);
    var tileBits = subtreeDescription.isInternal.tileAvailability.length;
    expectTileAvailability(
      subtree,
      subtreeDescription.external.tileAvailability,
      tileBits
    );
    expectContentAvailability(
      subtree,
      subtreeDescription.external.contentAvailability,
      tileBits
    );
    var subtreeBits =
      subtreeDescription.external.childSubtreeAvailability.length;
    expectChildSubtreeAvailability(
      subtree,
      subtreeDescription.external.childSubtreeAvailability,
      subtreeBits
    );
  });

  it("tile and content availability can share the same buffer", function () {
    fail();
  });

  it("external buffer is fetched if it is used for availability", function () {
    fail();
  });

  it("unused external buffers are not fetched", function () {
    fail();
  });

  it("availability works for quadtrees", function () {
    fail();
  });

  it("availability works for octrees", function () {
    fail();
  });
});
