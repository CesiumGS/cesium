import {
  clone,
  combine,
  ImplicitSubdivisionScheme,
  ImplicitTileset,
  Resource,
} from "../../Source/Cesium.js";

describe("Scene/ImplicitTileset", function () {
  var contentUriPattern = "https://example.com/{level}/{x}/{y}.b3dm";
  var subtreeUriPattern = "https://example.com/{level}/{x}/{y}.subtree";
  var implicitTileJson = {
    geometricError: 500,
    refine: "ADD",
    boundingVolume: {
      region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
    },
    content: {
      uri: contentUriPattern,
      extras: {
        author: "Cesium",
      },
    },
    extensions: {
      "3DTILES_implicit_tiling": {
        subdivisionScheme: "QUADTREE",
        subtreeLevels: 3,
        maximumLevel: 4,
        subtrees: {
          uri: subtreeUriPattern,
        },
      },
    },
    extras: {
      creationDate: "2021-02-22",
    },
  };
  var baseResource = new Resource("https://example.com/tileset.json");
  var contentUriTemplate = new Resource(contentUriPattern);
  var subtreeUriTemplate = new Resource(subtreeUriPattern);

  it("gathers information from both tile JSON and extension", function () {
    var implicitTileset = new ImplicitTileset(baseResource, implicitTileJson);
    expect(implicitTileset.subtreeLevels).toEqual(3);
    expect(implicitTileset.maximumLevel).toEqual(4);
    expect(implicitTileset.subdivisionScheme).toEqual(
      ImplicitSubdivisionScheme.QUADTREE
    );
    expect(implicitTileset.boundingVolume).toEqual(
      implicitTileJson.boundingVolume
    );
    expect(implicitTileset.refine).toEqual(implicitTileJson.refine);
    expect(implicitTileset.geometricError).toEqual(500);
    expect(implicitTileset.contentUriTemplates).toEqual([contentUriTemplate]);
    expect(implicitTileset.subtreeUriTemplate).toEqual(subtreeUriTemplate);
  });

  it("stores a template of the tile JSON structure", function () {
    var implicitTileset = new ImplicitTileset(baseResource, implicitTileJson);
    var expected = clone(implicitTileJson, true);
    delete expected.content;
    delete expected.extensions;
    expect(implicitTileset.tileHeader).toEqual(expected);
  });

  it("stores a template of the tile content structure", function () {
    var implicitTileset = new ImplicitTileset(baseResource, implicitTileJson);
    expect(implicitTileset.contentHeaders[0]).toEqual(implicitTileJson.content);
  });

  it("allows undefined content URI", function () {
    var noContentJson = clone(implicitTileJson);
    delete noContentJson.content;
    var implicitTileset = new ImplicitTileset(baseResource, noContentJson);
    expect(implicitTileset.contentUriTemplates).toEqual([]);
  });

  it("rejects bounding spheres", function () {
    var sphereJson = {
      boundingVolume: {
        sphere: [0, 0, 0, 100],
      },
    };
    var tileJson = combine(sphereJson, implicitTileJson);
    expect(function () {
      return new ImplicitTileset(baseResource, tileJson);
    }).toThrowRuntimeError();
  });

  describe("3DTILES_multiple_contents", function () {
    var b3dmPattern = "https://example.com/{level}/{x}/{y}.b3dm";
    var pntsPattern = "https://example.com/{level}/{x}/{y}.pnts";
    var gltfPattern = "https://example.com/{level}/{x}/{y}.gltf";
    var multipleContentTile = {
      geometricError: 500,
      refine: "ADD",
      boundingVolume: {
        region: [0, 0, Math.PI / 24, Math.PI / 24, 0, 1000.0],
      },
      extensions: {
        "3DTILES_implicit_tiling": {
          subdivisionScheme: "QUADTREE",
          subtreeLevels: 3,
          maximumLevel: 4,
          subtrees: {
            uri: subtreeUriPattern,
          },
        },
        "3DTILES_multiple_contents": {
          content: [
            {
              uri: b3dmPattern,
            },
            {
              uri: pntsPattern,
            },
            {
              uri: gltfPattern,
            },
          ],
        },
      },
    };

    it("gathers content URIs from multiple contents extension", function () {
      var implicitTileset = new ImplicitTileset(
        baseResource,
        multipleContentTile
      );
      expect(implicitTileset.contentUriTemplates).toEqual([
        new Resource({ url: b3dmPattern }),
        new Resource({ url: pntsPattern }),
        new Resource({ url: gltfPattern }),
      ]);
    });

    it("stores content JSON for every tile", function () {
      var withProperties = clone(multipleContentTile);
      var extension = { "3DTILES_extension": {} };
      var boundingBox = { box: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1] };
      var contents =
        withProperties.extensions["3DTILES_multiple_contents"].content;
      var i;
      for (i = 0; i < contents.length; i++) {
        contents[i].boundingVolume = boundingBox;
        contents[i].extensions = extension;
      }

      var implicitTileset = new ImplicitTileset(baseResource, withProperties);
      for (i = 0; i < implicitTileset.contentHeaders.length; i++) {
        expect(implicitTileset.contentHeaders[i]).toEqual(contents[i]);
      }
    });
  });
});
