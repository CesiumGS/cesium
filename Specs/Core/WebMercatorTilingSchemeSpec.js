import {
  Cartesian2,
  Cartographic,
  Ellipsoid,
  Rectangle,
  TilingScheme,
  WebMercatorProjection,
  WebMercatorTilingScheme,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/WebMercatorTilingScheme", function () {
  let tilingScheme;
  beforeEach(function () {
    tilingScheme = new WebMercatorTilingScheme();
  });

  it("conforms to TilingScheme interface.", function () {
    expect(WebMercatorTilingScheme).toConformToInterface(TilingScheme);
  });

  it("default constructing uses WGS84 ellipsoid", function () {
    const tilingScheme = new WebMercatorTilingScheme();
    expect(tilingScheme.ellipsoid).toEqual(Ellipsoid.WGS84);
  });

  it("uses specified ellipsoid", function () {
    const tilingScheme = new WebMercatorTilingScheme({
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    });
    expect(tilingScheme.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
  });

  describe("Conversions from tile indices to cartographic rectangles", function () {
    it("tileXYToRectangle returns full rectangle for single root tile.", function () {
      const rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);
      const tilingSchemeRectangle = tilingScheme.rectangle;
      expect(rectangle.west).toEqualEpsilon(
        tilingSchemeRectangle.west,
        CesiumMath.EPSILON10
      );
      expect(rectangle.south).toEqualEpsilon(
        tilingSchemeRectangle.south,
        CesiumMath.EPSILON10
      );
      expect(rectangle.east).toEqualEpsilon(
        tilingSchemeRectangle.east,
        CesiumMath.EPSILON10
      );
      expect(rectangle.north).toEqualEpsilon(
        tilingSchemeRectangle.north,
        CesiumMath.EPSILON10
      );
    });

    it("tileXYToRectangle uses result parameter if provided", function () {
      const tilingSchemeRectangle = tilingScheme.rectangle;
      const result = new Rectangle(0.0, 0.0, 0.0);
      const rectangle = tilingScheme.tileXYToRectangle(0, 0, 0, result);
      expect(result).toEqual(rectangle);
      expect(rectangle.west).toEqualEpsilon(
        tilingSchemeRectangle.west,
        CesiumMath.EPSILON10
      );
      expect(rectangle.south).toEqualEpsilon(
        tilingSchemeRectangle.south,
        CesiumMath.EPSILON10
      );
      expect(rectangle.east).toEqualEpsilon(
        tilingSchemeRectangle.east,
        CesiumMath.EPSILON10
      );
      expect(rectangle.north).toEqualEpsilon(
        tilingSchemeRectangle.north,
        CesiumMath.EPSILON10
      );
    });

    it("tiles are numbered from the northwest corner.", function () {
      const northwest = tilingScheme.tileXYToRectangle(0, 0, 1);
      const northeast = tilingScheme.tileXYToRectangle(1, 0, 1);
      const southeast = tilingScheme.tileXYToRectangle(1, 1, 1);
      const southwest = tilingScheme.tileXYToRectangle(0, 1, 1);

      expect(northeast.north).toEqual(northwest.north);
      expect(northeast.south).toEqual(northwest.south);
      expect(southeast.north).toEqual(southwest.north);
      expect(southeast.south).toEqual(southwest.south);

      expect(northwest.west).toEqual(southwest.west);
      expect(northwest.east).toEqual(southwest.east);
      expect(northeast.west).toEqual(southeast.west);
      expect(northeast.east).toEqual(southeast.east);

      expect(northeast.north).toBeGreaterThan(southeast.north);
      expect(northeast.south).toBeGreaterThan(southeast.south);
      expect(northwest.north).toBeGreaterThan(southwest.north);
      expect(northwest.south).toBeGreaterThan(southwest.south);

      expect(northeast.east).toBeGreaterThan(northwest.east);
      expect(northeast.west).toBeGreaterThan(northwest.west);
      expect(southeast.east).toBeGreaterThan(southwest.east);
      expect(southeast.west).toBeGreaterThan(southwest.west);
    });

    it("adjacent tiles have overlapping coordinates", function () {
      const northwest = tilingScheme.tileXYToRectangle(0, 0, 1);
      const northeast = tilingScheme.tileXYToRectangle(1, 0, 1);
      const southeast = tilingScheme.tileXYToRectangle(1, 1, 1);
      const southwest = tilingScheme.tileXYToRectangle(0, 1, 1);

      expect(northeast.south).toEqualEpsilon(
        southeast.north,
        CesiumMath.EPSILON15
      );
      expect(northwest.south).toEqualEpsilon(
        southwest.north,
        CesiumMath.EPSILON15
      );

      expect(northeast.west).toEqualEpsilon(
        northwest.east,
        CesiumMath.EPSILON15
      );
      expect(southeast.west).toEqualEpsilon(
        southwest.east,
        CesiumMath.EPSILON15
      );
    });
  });

  describe("Conversions from cartographic positions to tile indices", function () {
    it("calculates correct tile indices for 4 corners at level 0", function () {
      let coordinates;
      const tilingSchemeRectangle = tilingScheme.rectangle;

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.southwest(tilingSchemeRectangle),
        0
      );
      expect(coordinates.x).toEqual(0);
      expect(coordinates.y).toEqual(0);

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.northwest(tilingSchemeRectangle),
        0
      );
      expect(coordinates.x).toEqual(0);
      expect(coordinates.y).toEqual(0);

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.northeast(tilingSchemeRectangle),
        0
      );
      expect(coordinates.x).toEqual(0);
      expect(coordinates.y).toEqual(0);

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.southeast(tilingSchemeRectangle),
        0
      );
      expect(coordinates.x).toEqual(0);
      expect(coordinates.y).toEqual(0);
    });

    it("calculates correct tile indices for 4 corners at level 1", function () {
      let coordinates;
      const tilingSchemeRectangle = tilingScheme.rectangle;

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.southwest(tilingSchemeRectangle),
        1
      );
      expect(coordinates.x).toEqual(0);
      expect(coordinates.y).toEqual(1);

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.northwest(tilingSchemeRectangle),
        1
      );
      expect(coordinates.x).toEqual(0);
      expect(coordinates.y).toEqual(0);

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.northeast(tilingSchemeRectangle),
        1
      );
      expect(coordinates.x).toEqual(1);
      expect(coordinates.y).toEqual(0);

      coordinates = tilingScheme.positionToTileXY(
        Rectangle.southeast(tilingSchemeRectangle),
        1
      );
      expect(coordinates.x).toEqual(1);
      expect(coordinates.y).toEqual(1);
    });

    it("calculates correct tile indices for the center at level 1", function () {
      const coordinates = tilingScheme.positionToTileXY(
        new Cartographic(0, 0),
        1
      );
      expect(coordinates.x).toEqual(1);
      expect(coordinates.y).toEqual(1);
    });

    it("calculates correct tile indices for the center at level 2", function () {
      const coordinates = tilingScheme.positionToTileXY(
        new Cartographic(0, 0),
        2
      );
      expect(coordinates.x).toEqual(2);
      expect(coordinates.y).toEqual(2);
    });

    it("calculates correct tile indices around the center at level 2", function () {
      let coordinates;

      coordinates = tilingScheme.positionToTileXY(
        new Cartographic(-0.05, -0.05),
        2
      );
      expect(coordinates.x).toEqual(1);
      expect(coordinates.y).toEqual(2);

      coordinates = tilingScheme.positionToTileXY(
        new Cartographic(-0.05, 0.05),
        2
      );
      expect(coordinates.x).toEqual(1);
      expect(coordinates.y).toEqual(1);

      coordinates = tilingScheme.positionToTileXY(
        new Cartographic(0.05, 0.05),
        2
      );
      expect(coordinates.x).toEqual(2);
      expect(coordinates.y).toEqual(1);

      coordinates = tilingScheme.positionToTileXY(
        new Cartographic(0.05, -0.05),
        2
      );
      expect(coordinates.x).toEqual(2);
      expect(coordinates.y).toEqual(2);
    });
  });

  it("uses a WebMercatorProjection", function () {
    const tilingScheme = new WebMercatorTilingScheme();
    expect(tilingScheme.projection).toBeInstanceOf(WebMercatorProjection);
  });

  describe("rectangleToNativeRectangle", function () {
    it("converts radians to web mercator meters", function () {
      const tilingScheme = new WebMercatorTilingScheme();
      const rectangleInRadians = new Rectangle(0.1, 0.2, 0.3, 0.4);
      const nativeRectangle = tilingScheme.rectangleToNativeRectangle(
        rectangleInRadians
      );

      const projection = new WebMercatorProjection();
      const expectedSouthwest = projection.project(
        Rectangle.southwest(rectangleInRadians)
      );
      const expectedNortheast = projection.project(
        Rectangle.northeast(rectangleInRadians)
      );

      expect(nativeRectangle.west).toEqualEpsilon(
        expectedSouthwest.x,
        CesiumMath.EPSILON13
      );
      expect(nativeRectangle.south).toEqualEpsilon(
        expectedSouthwest.y,
        CesiumMath.EPSILON13
      );
      expect(nativeRectangle.east).toEqualEpsilon(
        expectedNortheast.x,
        CesiumMath.EPSILON13
      );
      expect(nativeRectangle.north).toEqualEpsilon(
        expectedNortheast.y,
        CesiumMath.EPSILON13
      );
    });

    it("uses result parameter if provided", function () {
      const tilingScheme = new WebMercatorTilingScheme();
      const rectangleInRadians = new Rectangle(0.1, 0.2, 0.3, 0.4);

      const projection = new WebMercatorProjection();
      const expectedSouthwest = projection.project(
        Rectangle.southwest(rectangleInRadians)
      );
      const expectedNortheast = projection.project(
        Rectangle.northeast(rectangleInRadians)
      );

      const resultRectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
      const outputRectangle = tilingScheme.rectangleToNativeRectangle(
        rectangleInRadians,
        resultRectangle
      );
      expect(outputRectangle).toEqual(resultRectangle);

      expect(resultRectangle.west).toEqualEpsilon(
        expectedSouthwest.x,
        CesiumMath.EPSILON13
      );
      expect(resultRectangle.south).toEqualEpsilon(
        expectedSouthwest.y,
        CesiumMath.EPSILON13
      );
      expect(resultRectangle.east).toEqualEpsilon(
        expectedNortheast.x,
        CesiumMath.EPSILON13
      );
      expect(resultRectangle.north).toEqualEpsilon(
        expectedNortheast.y,
        CesiumMath.EPSILON13
      );
    });
  });

  describe("positionToTileXY", function () {
    it("returns undefined when outside rectangle", function () {
      const projection = new WebMercatorProjection();
      const rectangleInRadians = new Rectangle(0.1, 0.2, 0.3, 0.4);
      const tilingScheme = new WebMercatorTilingScheme({
        rectangleSouthwestInMeters: projection.project(
          Rectangle.southwest(rectangleInRadians)
        ),
        rectangleNortheastInMeters: projection.project(
          Rectangle.northeast(rectangleInRadians)
        ),
      });

      const tooFarWest = new Cartographic(0.05, 0.3);
      expect(tilingScheme.positionToTileXY(tooFarWest, 0)).toBeUndefined();
      const tooFarSouth = new Cartographic(0.2, 0.1);
      expect(tilingScheme.positionToTileXY(tooFarSouth, 0)).toBeUndefined();
      const tooFarEast = new Cartographic(0.4, 0.3);
      expect(tilingScheme.positionToTileXY(tooFarEast, 0)).toBeUndefined();
      const tooFarNorth = new Cartographic(0.2, 0.5);
      expect(tilingScheme.positionToTileXY(tooFarNorth, 0)).toBeUndefined();
    });

    it("returns correct tile for position in center of tile", function () {
      const tilingScheme = new WebMercatorTilingScheme();

      const centerOfSouthwesternChild = new Cartographic(
        -Math.PI / 2.0,
        -Math.PI / 4.0
      );
      expect(
        tilingScheme.positionToTileXY(centerOfSouthwesternChild, 1)
      ).toEqual(new Cartesian2(0, 1));

      const centerOfNortheasternChild = new Cartographic(
        Math.PI / 2.0,
        Math.PI / 4.0
      );
      expect(
        tilingScheme.positionToTileXY(centerOfNortheasternChild, 1)
      ).toEqual(new Cartesian2(1, 0));
    });

    it("returns Southeast tile when on the boundary between tiles", function () {
      const tilingScheme = new WebMercatorTilingScheme();

      const centerOfMap = new Cartographic(0.0, 0.0);
      expect(tilingScheme.positionToTileXY(centerOfMap, 1)).toEqual(
        new Cartesian2(1, 1)
      );
    });

    it("does not return tile outside valid range", function () {
      const tilingScheme = new WebMercatorTilingScheme();

      const southeastCorner = Rectangle.southeast(tilingScheme.rectangle);
      expect(tilingScheme.positionToTileXY(southeastCorner, 1)).toEqual(
        new Cartesian2(1, 1)
      );
    });

    it("uses result parameter if supplied", function () {
      const tilingScheme = new WebMercatorTilingScheme();

      const centerOfNortheasternChild = new Cartographic(
        Math.PI / 2.0,
        Math.PI / 4.0
      );
      const resultParameter = new Cartesian2(0, 0);
      const returnedResult = tilingScheme.positionToTileXY(
        centerOfNortheasternChild,
        1,
        resultParameter
      );
      expect(resultParameter).toEqual(returnedResult);
      expect(resultParameter).toEqual(new Cartesian2(1, 0));
    });
  });
});
