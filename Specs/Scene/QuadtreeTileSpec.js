import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { WebMercatorTilingScheme } from "../../Source/Cesium.js";
import { QuadtreeTile } from "../../Source/Cesium.js";

describe("Scene/QuadtreeTile", function () {
  it("throws without a options", function () {
    expect(function () {
      return new QuadtreeTile();
    }).toThrowDeveloperError();
  });

  it("throws without options.rectangle", function () {
    expect(function () {
      return new QuadtreeTile({
        x: 0,
        y: 0,
      });
    }).toThrowDeveloperError();
  });

  it("throws without options.level", function () {
    expect(function () {
      return new QuadtreeTile({
        rectangle: new Rectangle(
          -CesiumMath.PI_OVER_FOUR,
          0.0,
          CesiumMath.PI_OVER_FOUR,
          CesiumMath.PI_OVER_FOUR
        ),
        x: 0,
        y: 0,
      });
    }).toThrowDeveloperError();
  });

  it("throws with negative x or y properties", function () {
    expect(function () {
      return new QuadtreeTile({
        x: -1.0,
        y: -1.0,
        level: 1.0,
      });
    }).toThrowDeveloperError();
  });

  it("creates rectangle on construction", function () {
    var desc = {
      tilingScheme: new WebMercatorTilingScheme(),
      x: 0,
      y: 0,
      level: 0,
    };
    var tile = new QuadtreeTile(desc);
    var rectangle = desc.tilingScheme.tileXYToRectangle(
      desc.x,
      desc.y,
      desc.level
    );
    expect(tile.rectangle).toEqual(rectangle);
  });

  it("throws if constructed improperly", function () {
    expect(function () {
      return new QuadtreeTile();
    }).toThrowDeveloperError();

    expect(function () {
      return new QuadtreeTile({
        y: 0,
        level: 0,
        tilingScheme: {
          tileXYToRectangle: function () {
            return undefined;
          },
        },
      });
    }).toThrowDeveloperError();

    expect(function () {
      return new QuadtreeTile({
        x: 0,
        level: 0,
        tilingScheme: {
          tileXYToRectangle: function () {
            return undefined;
          },
        },
      });
    }).toThrowDeveloperError();

    expect(function () {
      return new QuadtreeTile({
        x: 0,
        y: 0,
        tilingScheme: {
          tileXYToRectangle: function () {
            return undefined;
          },
        },
      });
    }).toThrowDeveloperError();

    expect(function () {
      return new QuadtreeTile({
        x: 0,
        y: 0,
        level: 0,
      });
    }).toThrowDeveloperError();
  });

  it("can get tiles around a root tile", function () {
    var tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 3,
      numberOfLevelZeroTilesY: 3,
    });
    var levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);

    var L0X0Y0 = levelZeroTiles.filter(function (tile) {
      return tile.x === 0 && tile.y === 0;
    })[0];
    var L0X1Y0 = levelZeroTiles.filter(function (tile) {
      return tile.x === 1 && tile.y === 0;
    })[0];
    var L0X2Y0 = levelZeroTiles.filter(function (tile) {
      return tile.x === 2 && tile.y === 0;
    })[0];
    var L0X0Y1 = levelZeroTiles.filter(function (tile) {
      return tile.x === 0 && tile.y === 1;
    })[0];
    var L0X1Y1 = levelZeroTiles.filter(function (tile) {
      return tile.x === 1 && tile.y === 1;
    })[0];
    var L0X2Y1 = levelZeroTiles.filter(function (tile) {
      return tile.x === 2 && tile.y === 1;
    })[0];
    var L0X0Y2 = levelZeroTiles.filter(function (tile) {
      return tile.x === 0 && tile.y === 2;
    })[0];
    var L0X1Y2 = levelZeroTiles.filter(function (tile) {
      return tile.x === 1 && tile.y === 2;
    })[0];
    var L0X2Y2 = levelZeroTiles.filter(function (tile) {
      return tile.x === 2 && tile.y === 2;
    })[0];

    expect(L0X0Y0.findTileToWest(levelZeroTiles)).toBe(L0X2Y0);
    expect(L0X0Y0.findTileToEast(levelZeroTiles)).toBe(L0X1Y0);
    expect(L0X0Y0.findTileToNorth(levelZeroTiles)).toBeUndefined();
    expect(L0X0Y0.findTileToSouth(levelZeroTiles)).toBe(L0X0Y1);

    expect(L0X1Y0.findTileToWest(levelZeroTiles)).toBe(L0X0Y0);
    expect(L0X1Y0.findTileToEast(levelZeroTiles)).toBe(L0X2Y0);
    expect(L0X1Y0.findTileToNorth(levelZeroTiles)).toBeUndefined();
    expect(L0X1Y0.findTileToSouth(levelZeroTiles)).toBe(L0X1Y1);

    expect(L0X2Y0.findTileToWest(levelZeroTiles)).toBe(L0X1Y0);
    expect(L0X2Y0.findTileToEast(levelZeroTiles)).toBe(L0X0Y0);
    expect(L0X2Y0.findTileToNorth(levelZeroTiles)).toBeUndefined();
    expect(L0X2Y0.findTileToSouth(levelZeroTiles)).toBe(L0X2Y1);

    expect(L0X0Y1.findTileToWest(levelZeroTiles)).toBe(L0X2Y1);
    expect(L0X0Y1.findTileToEast(levelZeroTiles)).toBe(L0X1Y1);
    expect(L0X0Y1.findTileToNorth(levelZeroTiles)).toBe(L0X0Y0);
    expect(L0X0Y1.findTileToSouth(levelZeroTiles)).toBe(L0X0Y2);

    expect(L0X1Y1.findTileToWest(levelZeroTiles)).toBe(L0X0Y1);
    expect(L0X1Y1.findTileToEast(levelZeroTiles)).toBe(L0X2Y1);
    expect(L0X1Y1.findTileToNorth(levelZeroTiles)).toBe(L0X1Y0);
    expect(L0X1Y1.findTileToSouth(levelZeroTiles)).toBe(L0X1Y2);

    expect(L0X2Y1.findTileToWest(levelZeroTiles)).toBe(L0X1Y1);
    expect(L0X2Y1.findTileToEast(levelZeroTiles)).toBe(L0X0Y1);
    expect(L0X2Y1.findTileToNorth(levelZeroTiles)).toBe(L0X2Y0);
    expect(L0X2Y1.findTileToSouth(levelZeroTiles)).toBe(L0X2Y2);

    expect(L0X0Y2.findTileToWest(levelZeroTiles)).toBe(L0X2Y2);
    expect(L0X0Y2.findTileToEast(levelZeroTiles)).toBe(L0X1Y2);
    expect(L0X0Y2.findTileToNorth(levelZeroTiles)).toBe(L0X0Y1);
    expect(L0X0Y2.findTileToSouth(levelZeroTiles)).toBeUndefined();

    expect(L0X1Y2.findTileToWest(levelZeroTiles)).toBe(L0X0Y2);
    expect(L0X1Y2.findTileToEast(levelZeroTiles)).toBe(L0X2Y2);
    expect(L0X1Y2.findTileToNorth(levelZeroTiles)).toBe(L0X1Y1);
    expect(L0X1Y2.findTileToSouth(levelZeroTiles)).toBeUndefined();

    expect(L0X2Y2.findTileToWest(levelZeroTiles)).toBe(L0X1Y2);
    expect(L0X2Y2.findTileToEast(levelZeroTiles)).toBe(L0X0Y2);
    expect(L0X2Y2.findTileToNorth(levelZeroTiles)).toBe(L0X2Y1);
    expect(L0X2Y2.findTileToSouth(levelZeroTiles)).toBeUndefined();
  });

  it("can get tiles around a tile when they share a common parent", function () {
    var tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 1,
    });

    var levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
    var parent = levelZeroTiles[1];
    var sw = parent.southwestChild;
    var se = parent.southeastChild;
    var nw = parent.northwestChild;
    var ne = parent.northeastChild;

    expect(sw.findTileToEast(levelZeroTiles)).toBe(se);
    expect(sw.findTileToNorth(levelZeroTiles)).toBe(nw);
    expect(se.findTileToWest(levelZeroTiles)).toBe(sw);
    expect(se.findTileToNorth(levelZeroTiles)).toBe(ne);
    expect(nw.findTileToEast(levelZeroTiles)).toBe(ne);
    expect(nw.findTileToSouth(levelZeroTiles)).toBe(sw);
    expect(ne.findTileToWest(levelZeroTiles)).toBe(nw);
    expect(ne.findTileToSouth(levelZeroTiles)).toBe(se);
  });

  it("can get tiles around a tile when they do not share a common parent", function () {
    var tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 2,
    });

    var levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);

    var northwest = levelZeroTiles[0];
    var nwse = northwest.southeastChild;
    var nwne = northwest.northeastChild;
    var nwsw = northwest.southwestChild;

    var northeast = levelZeroTiles[1];
    var nesw = northeast.southwestChild;
    var nenw = northeast.northwestChild;
    var nese = northeast.southeastChild;

    var southwest = levelZeroTiles[2];
    var swne = southwest.northeastChild;
    var swnw = southwest.northwestChild;
    var swse = southwest.southeastChild;

    var southeast = levelZeroTiles[3];
    var senw = southeast.northwestChild;
    var sene = southeast.northeastChild;
    var sesw = southeast.southwestChild;

    expect(nwse.findTileToEast(levelZeroTiles)).toBe(nesw);
    expect(nwse.findTileToSouth(levelZeroTiles)).toBe(swne);
    expect(nwne.findTileToEast(levelZeroTiles)).toBe(nenw);
    expect(nwsw.findTileToSouth(levelZeroTiles)).toBe(swnw);

    expect(nesw.findTileToWest(levelZeroTiles)).toBe(nwse);
    expect(nesw.findTileToSouth(levelZeroTiles)).toBe(senw);
    expect(nenw.findTileToWest(levelZeroTiles)).toBe(nwne);
    expect(nese.findTileToSouth(levelZeroTiles)).toBe(sene);

    expect(swne.findTileToEast(levelZeroTiles)).toBe(senw);
    expect(swne.findTileToNorth(levelZeroTiles)).toBe(nwse);
    expect(swnw.findTileToNorth(levelZeroTiles)).toBe(nwsw);
    expect(swse.findTileToEast(levelZeroTiles)).toBe(sesw);

    expect(senw.findTileToWest(levelZeroTiles)).toBe(swne);
    expect(senw.findTileToNorth(levelZeroTiles)).toBe(nesw);
    expect(sene.findTileToNorth(levelZeroTiles)).toBe(nese);
    expect(sesw.findTileToWest(levelZeroTiles)).toBe(swse);
  });

  it("can get adjacent tiles wrapping around the anti-meridian", function () {
    var tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 1,
    });

    var levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);

    var west = levelZeroTiles[0];
    var wsw = west.southwestChild;
    var wnw = west.northwestChild;

    var east = levelZeroTiles[1];
    var ene = east.northeastChild;
    var ese = east.southeastChild;

    expect(wsw.findTileToWest(levelZeroTiles)).toBe(ese);
    expect(wnw.findTileToWest(levelZeroTiles)).toBe(ene);

    expect(ene.findTileToEast(levelZeroTiles)).toBe(wnw);
    expect(ese.findTileToEast(levelZeroTiles)).toBe(wsw);
  });

  it("returns undefined when asked for adjacent tiles north of the north pole or south of the south pole", function () {
    var tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 1,
    });

    var levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);

    var west = levelZeroTiles[0];
    var wnw = west.northwestChild;
    var wsw = west.southwestChild;

    expect(wnw.findTileToNorth(levelZeroTiles)).toBeUndefined();
    expect(wsw.findTileToSouth(levelZeroTiles)).toBeUndefined();
  });

  describe("createLevelZeroTiles", function () {
    var tilingScheme1x1;
    var tilingScheme2x2;
    var tilingScheme2x1;
    var tilingScheme1x2;

    beforeEach(function () {
      tilingScheme1x1 = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 1,
        numberOfLevelZeroTilesY: 1,
      });
      tilingScheme2x2 = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 2,
      });
      tilingScheme2x1 = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 2,
        numberOfLevelZeroTilesY: 1,
      });
      tilingScheme1x2 = new GeographicTilingScheme({
        numberOfLevelZeroTilesX: 1,
        numberOfLevelZeroTilesY: 2,
      });
    });

    it("requires tilingScheme", function () {
      expect(function () {
        return QuadtreeTile.createLevelZeroTiles(undefined);
      }).toThrowDeveloperError();
    });

    it("creates expected number of tiles", function () {
      var tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme1x1);
      expect(tiles.length).toBe(1);

      tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x2);
      expect(tiles.length).toBe(4);

      tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x1);
      expect(tiles.length).toBe(2);

      tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme1x2);
      expect(tiles.length).toBe(2);
    });

    it("created tiles are associated with specified tiling scheme", function () {
      var tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x2);
      for (var i = 0; i < tiles.length; ++i) {
        expect(tiles[i].tilingScheme).toBe(tilingScheme2x2);
      }
    });

    it("created tiles are ordered from the northwest and proceeding east and then south", function () {
      var tiles = QuadtreeTile.createLevelZeroTiles(tilingScheme2x2);
      var northwest = tiles[0];
      var northeast = tiles[1];
      var southwest = tiles[2];
      var southeast = tiles[3];

      expect(northeast.rectangle.west).toBeGreaterThan(
        northwest.rectangle.west
      );
      expect(southeast.rectangle.west).toBeGreaterThan(
        southwest.rectangle.west
      );
      expect(northeast.rectangle.south).toBeGreaterThan(
        southeast.rectangle.south
      );
      expect(northwest.rectangle.south).toBeGreaterThan(
        southwest.rectangle.south
      );
    });
  });
});
