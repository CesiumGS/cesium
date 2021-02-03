import {
  ImplicitSubtree,
  ImplicitTileset,
  Resource,
} from "../../Source/Cesium.js";
import ImplicitTilingTester from "../ImplicitTilingTester.js";

describe("Scene/ImplicitSubtree", function () {
  function availabilityToBooleanArray(availabilityDescriptor, length) {
    if (typeof availabilityDescriptor === "number") {
      var constant = availabilityDescriptor === "1";
      var repeated = new Array(length);
      for (var i = 0; i < length; i++) {
        repeated[i] = constant;
      }
      return repeated;
    }
    {
      return availabilityDescriptor.split("").map(function (x) {
        return x === "1";
      });
    }
  }

  function expectTileAvailability(subtree, availabilityDescriptor, length) {
    var expectedAvailability = availabilityToBooleanArray(
      availabilityDescriptor,
      length
    );
    for (var i = 0; i < length; i++) {
      expect(subtree.tileIsAvailable(i)).toEqual(expectedAvailability[i]);
    }
  }

  function expectContentAvailability(subtree, availabilityDescriptor, length) {
    var expectedAvailability = availabilityToBooleanArray(
      availabilityDescriptor,
      length
    );
    for (var i = 0; i < length; i++) {
      expect(subtree.contentIsAvailable(i)).toEqual(expectedAvailability[i]);
    }
  }

  function expectChildSubtreeAvailability(
    subtree,
    availabilityDescriptor,
    length
  ) {
    var expectedAvailability = availabilityToBooleanArray(
      availabilityDescriptor,
      length
    );
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
  var implicitQuadtree = new ImplicitTileset(tilesetResource, {});
  //var implicitOctree = new ImplicitSubtree(tilesetResource, {});

  it("gets availability from internal buffer", function () {
    var subtreeDescription = {
      internal: {
        tileAvailability: "11010",
        contentAvailability: "11000",
        childSubtreeAvailability: "1111000010100000",
      },
    };
    var subtreeArray = ImplicitTilingTester.generateSubtreeBuffer(
      subtreeDescription
    );
    var subtree = new ImplicitSubtree(
      subtreeResource,
      subtreeArray,
      implicitQuadtree
    );
    var tileBits = subtreeDescription.internal.tileAvailability.length;
    expectTileAvailability(
      subtree,
      subtreeDescription.internal.tileAvailability,
      tileBits
    );
    expectContentAvailability(
      subtree,
      subtreeDescription.internal.contentAvailability,
      tileBits
    );
    var subtreeBits =
      subtreeDescription.internal.childSubtreeAvailability.length;
    expectChildSubtreeAvailability(
      subtree,
      subtreeDescription.internal.childSubtreeAvailability,
      subtreeBits
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
    var tileBits = subtreeDescription.internal.tileAvailability.length;
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
