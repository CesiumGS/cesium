import {
  ImplicitSubdivisionScheme,
  ImplicitTemplateUri,
  ImplicitTileset,
} from "../../Source/Cesium.js";

fdescribe("Scene/ImplicitTileset", function () {
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
  };
  var contentUriTemplate = new ImplicitTemplateUri(contentUriPattern);
  var subtreeUriTemplate = new ImplicitTemplateUri(subtreeUriPattern);

  it("gathers information from both tile JSON and extension", function () {
    var implicitTileset = new ImplicitTileset(
      implicitTileJson,
      implicitTileJson.extensions
    );
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
    expect(implicitTileset.contentUriTemplate).toEqual(contentUriTemplate);
    expect(implicitTileset.subtreeUriTemplate).toEqual(subtreeUriTemplate);
  });

  it("rejects bounding spheres", function () {
    var sphereJson = {
      boundingVolume: {
        sphere: [0, 0, 0, 100],
      },
    };
    var tileJson = Object.assign({}, implicitTileJson, sphereJson);
    expect(function () {
      new ImplicitTileset(tileJson, tileJson.extensions);
    }).toThrowDeveloperError();
  });

  it("makes a root tile", function () {
    fail();
  });

  it("derives children tiles", function () {
    fail();
  });
});
