import BoundingSphere from "./BoundingSphere.js";
import buildModuleUrl from "./buildModuleUrl.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";

var scratchDiagonalCartesianNE = new Cartesian3();
var scratchDiagonalCartesianSW = new Cartesian3();
var scratchDiagonalCartographic = new Cartographic();
var scratchCenterCartesian = new Cartesian3();
var scratchSurfaceCartesian = new Cartesian3();

var scratchBoundingSphere = new BoundingSphere();
var tilingScheme = new GeographicTilingScheme();
var scratchCorners = [
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
];
var scratchTileXY = new Cartesian2();

/**
 * A collection of functions for approximating terrain height
 * @private
 */
var ApproximateTerrainHeights = {};

/**
 * Initializes the minimum and maximum terrain heights
 * @return {Promise<void>}
 */
ApproximateTerrainHeights.initialize = function () {
  var initPromise = ApproximateTerrainHeights._initPromise;
  if (defined(initPromise)) {
    return initPromise;
  }

  initPromise = Resource.fetchJson(
    buildModuleUrl("Assets/approximateTerrainHeights.json")
  ).then(function (json) {
    ApproximateTerrainHeights._terrainHeights = json;
  });
  ApproximateTerrainHeights._initPromise = initPromise;

  return initPromise;
};

/**
 * Computes the minimum and maximum terrain heights for a given rectangle
 * @param {Rectangle} rectangle The bounding rectangle
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid
 * @return {{minimumTerrainHeight: Number, maximumTerrainHeight: Number}}
 */
ApproximateTerrainHeights.getMinimumMaximumHeights = function (
  rectangle,
  ellipsoid
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("rectangle", rectangle);
  if (!defined(ApproximateTerrainHeights._terrainHeights)) {
    throw new DeveloperError(
      "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function"
    );
  }
  //>>includeEnd('debug');
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  var xyLevel = getTileXYLevel(rectangle);

  // Get the terrain min/max for that tile
  var minTerrainHeight = ApproximateTerrainHeights._defaultMinTerrainHeight;
  var maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
  if (defined(xyLevel)) {
    var key = xyLevel.level + "-" + xyLevel.x + "-" + xyLevel.y;
    var heights = ApproximateTerrainHeights._terrainHeights[key];
    if (defined(heights)) {
      minTerrainHeight = heights[0];
      maxTerrainHeight = heights[1];
    }

    // Compute min by taking the center of the NE->SW diagonal and finding distance to the surface
    ellipsoid.cartographicToCartesian(
      Rectangle.northeast(rectangle, scratchDiagonalCartographic),
      scratchDiagonalCartesianNE
    );
    ellipsoid.cartographicToCartesian(
      Rectangle.southwest(rectangle, scratchDiagonalCartographic),
      scratchDiagonalCartesianSW
    );

    Cartesian3.midpoint(
      scratchDiagonalCartesianSW,
      scratchDiagonalCartesianNE,
      scratchCenterCartesian
    );
    var surfacePosition = ellipsoid.scaleToGeodeticSurface(
      scratchCenterCartesian,
      scratchSurfaceCartesian
    );
    if (defined(surfacePosition)) {
      var distance = Cartesian3.distance(
        scratchCenterCartesian,
        surfacePosition
      );
      minTerrainHeight = Math.min(minTerrainHeight, -distance);
    } else {
      minTerrainHeight = ApproximateTerrainHeights._defaultMinTerrainHeight;
    }
  }

  minTerrainHeight = Math.max(
    ApproximateTerrainHeights._defaultMinTerrainHeight,
    minTerrainHeight
  );

  return {
    minimumTerrainHeight: minTerrainHeight,
    maximumTerrainHeight: maxTerrainHeight,
  };
};

/**
 * Computes the bounding sphere based on the tile heights in the rectangle
 * @param {Rectangle} rectangle The bounding rectangle
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid
 * @return {BoundingSphere} The result bounding sphere
 */
ApproximateTerrainHeights.getBoundingSphere = function (rectangle, ellipsoid) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("rectangle", rectangle);
  if (!defined(ApproximateTerrainHeights._terrainHeights)) {
    throw new DeveloperError(
      "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function"
    );
  }
  //>>includeEnd('debug');
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  var xyLevel = getTileXYLevel(rectangle);

  // Get the terrain max for that tile
  var maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
  if (defined(xyLevel)) {
    var key = xyLevel.level + "-" + xyLevel.x + "-" + xyLevel.y;
    var heights = ApproximateTerrainHeights._terrainHeights[key];
    if (defined(heights)) {
      maxTerrainHeight = heights[1];
    }
  }

  var result = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, 0.0);
  BoundingSphere.fromRectangle3D(
    rectangle,
    ellipsoid,
    maxTerrainHeight,
    scratchBoundingSphere
  );

  return BoundingSphere.union(result, scratchBoundingSphere, result);
};

function getTileXYLevel(rectangle) {
  Cartographic.fromRadians(
    rectangle.east,
    rectangle.north,
    0.0,
    scratchCorners[0]
  );
  Cartographic.fromRadians(
    rectangle.west,
    rectangle.north,
    0.0,
    scratchCorners[1]
  );
  Cartographic.fromRadians(
    rectangle.east,
    rectangle.south,
    0.0,
    scratchCorners[2]
  );
  Cartographic.fromRadians(
    rectangle.west,
    rectangle.south,
    0.0,
    scratchCorners[3]
  );

  // Determine which tile the bounding rectangle is in
  var lastLevelX = 0,
    lastLevelY = 0;
  var currentX = 0,
    currentY = 0;
  var maxLevel = ApproximateTerrainHeights._terrainHeightsMaxLevel;
  var i;
  for (i = 0; i <= maxLevel; ++i) {
    var failed = false;
    for (var j = 0; j < 4; ++j) {
      var corner = scratchCorners[j];
      tilingScheme.positionToTileXY(corner, i, scratchTileXY);
      if (j === 0) {
        currentX = scratchTileXY.x;
        currentY = scratchTileXY.y;
      } else if (currentX !== scratchTileXY.x || currentY !== scratchTileXY.y) {
        failed = true;
        break;
      }
    }

    if (failed) {
      break;
    }

    lastLevelX = currentX;
    lastLevelY = currentY;
  }

  if (i === 0) {
    return undefined;
  }

  return {
    x: lastLevelX,
    y: lastLevelY,
    level: i > maxLevel ? maxLevel : i - 1,
  };
}

ApproximateTerrainHeights._terrainHeightsMaxLevel = 6;
ApproximateTerrainHeights._defaultMaxTerrainHeight = 9000.0;
ApproximateTerrainHeights._defaultMinTerrainHeight = -100000.0;
ApproximateTerrainHeights._terrainHeights = undefined;
ApproximateTerrainHeights._initPromise = undefined;

Object.defineProperties(ApproximateTerrainHeights, {
  /**
   * Determines if the terrain heights are initialized and ready to use. To initialize the terrain heights,
   * call {@link ApproximateTerrainHeights#initialize} and wait for the returned promise to resolve.
   * @type {Boolean}
   * @readonly
   * @memberof ApproximateTerrainHeights
   */
  initialized: {
    get: function () {
      return defined(ApproximateTerrainHeights._terrainHeights);
    },
  },
});
export default ApproximateTerrainHeights;
