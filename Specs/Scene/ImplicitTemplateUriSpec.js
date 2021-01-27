import {
  ImplicitSubdivisionScheme,
  ImplicitTemplateUri,
  ImplicitTileCoordinates,
} from "../../Source/Cesium.js";

fdescribe("Source/ImplicitTemplateUri", function () {
  var quadtreeUri = new ImplicitTemplateUri(
    "https://example.com/{level}/{x}/{y}.json"
  );
  var octreeUri = new ImplicitTemplateUri(
    "https://example.com/{level}/{x}/{y}/{z}.json"
  );
  it("substitutes quadtree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.QUADTREE,
      level: 3,
      x: 2,
      y: 1,
    });
    expect(quadtreeUri.substitute(coordinates)).toEqual(
      "https://example.com/3/2/1.json"
    );
  });

  it("substitutes octree coordinates", function () {
    var coordinates = new ImplicitTileCoordinates({
      subdivisionScheme: ImplicitSubdivisionScheme.OCTREE,
      level: 4,
      x: 3,
      y: 2,
      z: 1,
    });
    expect(octreeUri.substitute(coordinates)).toEqual(
      "https://example.com/4/3/2/1.json"
    );
  });

  it("validates URI pattern", function () {
    expect(function () {
      new ImplicitTemplateUri("https://example.com/foo.json");
    }).toThrowDeveloperError();
  });
});
