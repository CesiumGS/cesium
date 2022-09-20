import {
  Cartesian2,
  Cartographic,
  GeographicProjection,
  GeographicTilingScheme,
  Rectangle,
  TilingScheme,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/GeographicTilingScheme", function () {
  it("conforms to TilingScheme interface.", function () {
    expect(GeographicTilingScheme).toConformToInterface(TilingScheme);
  });

  describe("Conversions from tile indices to cartographic rectangles.", function () {
    it("tileXYToRectangle returns full rectangle for single root tile.", function () {
      const tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 1,
        numberOfLevelZeroTilesY: 1,
      });
      const tilingSchemeRectangle = tilingScheme.rectangle;
      const rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);
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
      const tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 1,
        numberOfLevelZeroTilesY: 1,
      });
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
      const tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 2,
      });
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
      const tilingScheme = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 2,
      });
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

  it("uses a GeographicProjection", function () {
    const tilingScheme = new GeographicTilingScheme();
    expect(tilingScheme.projection).toBeInstanceOf(GeographicProjection);
  });

  describe("rectangleToNativeRectangle", function () {
    it("converts radians to degrees", function () {
      const tilingScheme = new GeographicTilingScheme();
      const rectangleInRadians = new Rectangle(0.1, 0.2, 0.3, 0.4);
      const nativeRectangle = tilingScheme.rectangleToNativeRectangle(
        rectangleInRadians
      );
      expect(nativeRectangle.west).toEqualEpsilon(
        (rectangleInRadians.west * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
      expect(nativeRectangle.south).toEqualEpsilon(
        (rectangleInRadians.south * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
      expect(nativeRectangle.east).toEqualEpsilon(
        (rectangleInRadians.east * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
      expect(nativeRectangle.north).toEqualEpsilon(
        (rectangleInRadians.north * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
    });

    it("uses result parameter if provided", function () {
      const tilingScheme = new GeographicTilingScheme();
      const rectangleInRadians = new Rectangle(0.1, 0.2, 0.3, 0.4);
      const resultRectangle = new Rectangle(0.0, 0.0, 0.0, 0.0);
      const outputRectangle = tilingScheme.rectangleToNativeRectangle(
        rectangleInRadians,
        resultRectangle
      );
      expect(outputRectangle).toEqual(resultRectangle);
      expect(resultRectangle.west).toEqualEpsilon(
        (rectangleInRadians.west * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
      expect(resultRectangle.south).toEqualEpsilon(
        (rectangleInRadians.south * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
      expect(resultRectangle.east).toEqualEpsilon(
        (rectangleInRadians.east * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
      expect(resultRectangle.north).toEqualEpsilon(
        (rectangleInRadians.north * 180) / Math.PI,
        CesiumMath.EPSILON13
      );
    });
  });

  describe("positionToTileXY", function () {
    it("returns undefined when outside rectangle", function () {
      const tilingScheme = new GeographicTilingScheme({
        rectangle: new Rectangle(0.1, 0.2, 0.3, 0.4),
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
      const tilingScheme = new GeographicTilingScheme();

      const centerOfWesternRootTile = new Cartographic(-Math.PI / 2.0, 0.0);
      expect(tilingScheme.positionToTileXY(centerOfWesternRootTile, 0)).toEqual(
        new Cartesian2(0, 0)
      );

      const centerOfNortheastChildOfEasternRootTile = new Cartographic(
        (3.0 * Math.PI) / 4.0,
        Math.PI / 2.0
      );
      expect(
        tilingScheme.positionToTileXY(
          centerOfNortheastChildOfEasternRootTile,
          1
        )
      ).toEqual(new Cartesian2(3, 0));
    });

    it("returns Southeast tile when on the boundary between tiles", function () {
      const tilingScheme = new GeographicTilingScheme();

      const centerOfMap = new Cartographic(0.0, 0.0);
      expect(tilingScheme.positionToTileXY(centerOfMap, 1)).toEqual(
        new Cartesian2(2, 1)
      );
    });

    it("does not return tile outside valid range", function () {
      const tilingScheme = new GeographicTilingScheme();

      const southeastCorner = new Cartographic(Math.PI, -Math.PI / 2.0);
      expect(tilingScheme.positionToTileXY(southeastCorner, 0)).toEqual(
        new Cartesian2(1, 0)
      );
    });

    it("uses result parameter if supplied", function () {
      const tilingScheme = new GeographicTilingScheme();

      const centerOfNortheastChildOfEasternRootTile = new Cartographic(
        (3.0 * Math.PI) / 4.0,
        Math.PI / 2.0
      );
      const resultParameter = new Cartesian2(0, 0);
      const returnedResult = tilingScheme.positionToTileXY(
        centerOfNortheastChildOfEasternRootTile,
        1,
        resultParameter
      );
      expect(resultParameter).toEqual(returnedResult);
      expect(resultParameter).toEqual(new Cartesian2(3, 0));
    });
  });
});
