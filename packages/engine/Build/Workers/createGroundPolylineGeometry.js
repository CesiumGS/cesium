define(['./Transforms-26539bce', './Matrix2-13178034', './Matrix3-315394f6', './Check-666ab1a0', './defaultValue-0a909f67', './Math-2dbd6b93', './ArcType-ce2e50ab', './arrayRemoveDuplicates-c2038105', './ComponentDatatype-f7b11d02', './EllipsoidGeodesic-98c62a56', './EllipsoidRhumbLine-19756602', './EncodedCartesian3-81f70735', './GeometryAttribute-0bfd05e8', './IntersectionTests-a93d3de9', './Plane-900aa728', './WebMercatorProjection-13a90d41', './combine-ca22a614', './RuntimeError-06c93819', './WebGLConstants-a8cc3e8c'], (function (Transforms, Matrix2, Matrix3, Check, defaultValue, Math$1, ArcType, arrayRemoveDuplicates, ComponentDatatype, EllipsoidGeodesic, EllipsoidRhumbLine, EncodedCartesian3, GeometryAttribute, IntersectionTests, Plane, WebMercatorProjection, combine, RuntimeError, WebGLConstants) { 'use strict';

  /**
   * A tiling scheme for geometry referenced to a simple {@link GeographicProjection} where
   * longitude and latitude are directly mapped to X and Y.  This projection is commonly
   * known as geographic, equirectangular, equidistant cylindrical, or plate carrée.
   *
   * @alias GeographicTilingScheme
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
   * the WGS84 ellipsoid.
   * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the tiling scheme.
   * @param {Number} [options.numberOfLevelZeroTilesX=2] The number of tiles in the X direction at level zero of
   * the tile tree.
   * @param {Number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
   * the tile tree.
   */
  function GeographicTilingScheme(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    this._ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix3.Ellipsoid.WGS84);
    this._rectangle = defaultValue.defaultValue(options.rectangle, Matrix2.Rectangle.MAX_VALUE);
    this._projection = new Transforms.GeographicProjection(this._ellipsoid);
    this._numberOfLevelZeroTilesX = defaultValue.defaultValue(
      options.numberOfLevelZeroTilesX,
      2
    );
    this._numberOfLevelZeroTilesY = defaultValue.defaultValue(
      options.numberOfLevelZeroTilesY,
      1
    );
  }

  Object.defineProperties(GeographicTilingScheme.prototype, {
    /**
     * Gets the ellipsoid that is tiled by this tiling scheme.
     * @memberof GeographicTilingScheme.prototype
     * @type {Ellipsoid}
     */
    ellipsoid: {
      get: function () {
        return this._ellipsoid;
      },
    },

    /**
     * Gets the rectangle, in radians, covered by this tiling scheme.
     * @memberof GeographicTilingScheme.prototype
     * @type {Rectangle}
     */
    rectangle: {
      get: function () {
        return this._rectangle;
      },
    },

    /**
     * Gets the map projection used by this tiling scheme.
     * @memberof GeographicTilingScheme.prototype
     * @type {MapProjection}
     */
    projection: {
      get: function () {
        return this._projection;
      },
    },
  });

  /**
   * Gets the total number of tiles in the X direction at a specified level-of-detail.
   *
   * @param {Number} level The level-of-detail.
   * @returns {Number} The number of tiles in the X direction at the given level.
   */
  GeographicTilingScheme.prototype.getNumberOfXTilesAtLevel = function (level) {
    return this._numberOfLevelZeroTilesX << level;
  };

  /**
   * Gets the total number of tiles in the Y direction at a specified level-of-detail.
   *
   * @param {Number} level The level-of-detail.
   * @returns {Number} The number of tiles in the Y direction at the given level.
   */
  GeographicTilingScheme.prototype.getNumberOfYTilesAtLevel = function (level) {
    return this._numberOfLevelZeroTilesY << level;
  };

  /**
   * Transforms a rectangle specified in geodetic radians to the native coordinate system
   * of this tiling scheme.
   *
   * @param {Rectangle} rectangle The rectangle to transform.
   * @param {Rectangle} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Rectangle} The specified 'result', or a new object containing the native rectangle if 'result'
   *          is undefined.
   */
  GeographicTilingScheme.prototype.rectangleToNativeRectangle = function (
    rectangle,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("rectangle", rectangle);
    //>>includeEnd('debug');

    const west = Math$1.CesiumMath.toDegrees(rectangle.west);
    const south = Math$1.CesiumMath.toDegrees(rectangle.south);
    const east = Math$1.CesiumMath.toDegrees(rectangle.east);
    const north = Math$1.CesiumMath.toDegrees(rectangle.north);

    if (!defaultValue.defined(result)) {
      return new Matrix2.Rectangle(west, south, east, north);
    }

    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;
    return result;
  };

  /**
   * Converts tile x, y coordinates and level to a rectangle expressed in the native coordinates
   * of the tiling scheme.
   *
   * @param {Number} x The integer x coordinate of the tile.
   * @param {Number} y The integer y coordinate of the tile.
   * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
   * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
   *          if 'result' is undefined.
   */
  GeographicTilingScheme.prototype.tileXYToNativeRectangle = function (
    x,
    y,
    level,
    result
  ) {
    const rectangleRadians = this.tileXYToRectangle(x, y, level, result);
    rectangleRadians.west = Math$1.CesiumMath.toDegrees(rectangleRadians.west);
    rectangleRadians.south = Math$1.CesiumMath.toDegrees(rectangleRadians.south);
    rectangleRadians.east = Math$1.CesiumMath.toDegrees(rectangleRadians.east);
    rectangleRadians.north = Math$1.CesiumMath.toDegrees(rectangleRadians.north);
    return rectangleRadians;
  };

  /**
   * Converts tile x, y coordinates and level to a cartographic rectangle in radians.
   *
   * @param {Number} x The integer x coordinate of the tile.
   * @param {Number} y The integer y coordinate of the tile.
   * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
   * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
   *          if 'result' is undefined.
   */
  GeographicTilingScheme.prototype.tileXYToRectangle = function (
    x,
    y,
    level,
    result
  ) {
    const rectangle = this._rectangle;

    const xTiles = this.getNumberOfXTilesAtLevel(level);
    const yTiles = this.getNumberOfYTilesAtLevel(level);

    const xTileWidth = rectangle.width / xTiles;
    const west = x * xTileWidth + rectangle.west;
    const east = (x + 1) * xTileWidth + rectangle.west;

    const yTileHeight = rectangle.height / yTiles;
    const north = rectangle.north - y * yTileHeight;
    const south = rectangle.north - (y + 1) * yTileHeight;

    if (!defaultValue.defined(result)) {
      result = new Matrix2.Rectangle(west, south, east, north);
    }

    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;
    return result;
  };

  /**
   * Calculates the tile x, y coordinates of the tile containing
   * a given cartographic position.
   *
   * @param {Cartographic} position The position.
   * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
   * @param {Cartesian2} [result] The instance to which to copy the result, or undefined if a new instance
   *        should be created.
   * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
   *          if 'result' is undefined.
   */
  GeographicTilingScheme.prototype.positionToTileXY = function (
    position,
    level,
    result
  ) {
    const rectangle = this._rectangle;
    if (!Matrix2.Rectangle.contains(rectangle, position)) {
      // outside the bounds of the tiling scheme
      return undefined;
    }

    const xTiles = this.getNumberOfXTilesAtLevel(level);
    const yTiles = this.getNumberOfYTilesAtLevel(level);

    const xTileWidth = rectangle.width / xTiles;
    const yTileHeight = rectangle.height / yTiles;

    let longitude = position.longitude;
    if (rectangle.east < rectangle.west) {
      longitude += Math$1.CesiumMath.TWO_PI;
    }

    let xTileCoordinate = ((longitude - rectangle.west) / xTileWidth) | 0;
    if (xTileCoordinate >= xTiles) {
      xTileCoordinate = xTiles - 1;
    }

    let yTileCoordinate =
      ((rectangle.north - position.latitude) / yTileHeight) | 0;
    if (yTileCoordinate >= yTiles) {
      yTileCoordinate = yTiles - 1;
    }

    if (!defaultValue.defined(result)) {
      return new Matrix2.Cartesian2(xTileCoordinate, yTileCoordinate);
    }

    result.x = xTileCoordinate;
    result.y = yTileCoordinate;
    return result;
  };

  const scratchDiagonalCartesianNE = new Matrix3.Cartesian3();
  const scratchDiagonalCartesianSW = new Matrix3.Cartesian3();
  const scratchDiagonalCartographic = new Matrix3.Cartographic();
  const scratchCenterCartesian = new Matrix3.Cartesian3();
  const scratchSurfaceCartesian = new Matrix3.Cartesian3();

  const scratchBoundingSphere = new Transforms.BoundingSphere();
  const tilingScheme = new GeographicTilingScheme();
  const scratchCorners = [
    new Matrix3.Cartographic(),
    new Matrix3.Cartographic(),
    new Matrix3.Cartographic(),
    new Matrix3.Cartographic(),
  ];
  const scratchTileXY = new Matrix2.Cartesian2();

  /**
   * A collection of functions for approximating terrain height
   * @private
   */
  const ApproximateTerrainHeights = {};

  /**
   * Initializes the minimum and maximum terrain heights
   * @return {Promise.<void>}
   */
  ApproximateTerrainHeights.initialize = function () {
    let initPromise = ApproximateTerrainHeights._initPromise;
    if (defaultValue.defined(initPromise)) {
      return initPromise;
    }
    initPromise = Transforms.Resource.fetchJson(
      Transforms.buildModuleUrl("Assets/approximateTerrainHeights.json")
    ).then(function (json) {
      // PROPELLER HACK: Allow rendering of ground primitives with negative WGS84 elevation
      var MAX_HOLE_DEPTH = 250;
      Object.keys(json).map(function (key) {
        json[key][0] -= MAX_HOLE_DEPTH;
      });
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
    Check.Check.defined("rectangle", rectangle);
    if (!defaultValue.defined(ApproximateTerrainHeights._terrainHeights)) {
      throw new Check.DeveloperError(
        "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function"
      );
    }
    //>>includeEnd('debug');
    ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);

    const xyLevel = getTileXYLevel(rectangle);

    // Get the terrain min/max for that tile
    let minTerrainHeight = ApproximateTerrainHeights._defaultMinTerrainHeight;
    let maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
    if (defaultValue.defined(xyLevel)) {
      const key = `${xyLevel.level}-${xyLevel.x}-${xyLevel.y}`;
      const heights = ApproximateTerrainHeights._terrainHeights[key];
      if (defaultValue.defined(heights)) {
        minTerrainHeight = heights[0];
        maxTerrainHeight = heights[1];
      }

      // Compute min by taking the center of the NE->SW diagonal and finding distance to the surface
      ellipsoid.cartographicToCartesian(
        Matrix2.Rectangle.northeast(rectangle, scratchDiagonalCartographic),
        scratchDiagonalCartesianNE
      );
      ellipsoid.cartographicToCartesian(
        Matrix2.Rectangle.southwest(rectangle, scratchDiagonalCartographic),
        scratchDiagonalCartesianSW
      );

      Matrix3.Cartesian3.midpoint(
        scratchDiagonalCartesianSW,
        scratchDiagonalCartesianNE,
        scratchCenterCartesian
      );
      const surfacePosition = ellipsoid.scaleToGeodeticSurface(
        scratchCenterCartesian,
        scratchSurfaceCartesian
      );
      if (defaultValue.defined(surfacePosition)) {
        const distance = Matrix3.Cartesian3.distance(
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
    Check.Check.defined("rectangle", rectangle);
    if (!defaultValue.defined(ApproximateTerrainHeights._terrainHeights)) {
      throw new Check.DeveloperError(
        "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function"
      );
    }
    //>>includeEnd('debug');
    ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);

    const xyLevel = getTileXYLevel(rectangle);

    // Get the terrain max for that tile
    let maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
    if (defaultValue.defined(xyLevel)) {
      const key = `${xyLevel.level}-${xyLevel.x}-${xyLevel.y}`;
      const heights = ApproximateTerrainHeights._terrainHeights[key];
      if (defaultValue.defined(heights)) {
        maxTerrainHeight = heights[1];
      }
    }

    const result = Transforms.BoundingSphere.fromRectangle3D(rectangle, ellipsoid, 0.0);
    Transforms.BoundingSphere.fromRectangle3D(
      rectangle,
      ellipsoid,
      maxTerrainHeight,
      scratchBoundingSphere
    );

    return Transforms.BoundingSphere.union(result, scratchBoundingSphere, result);
  };

  function getTileXYLevel(rectangle) {
    Matrix3.Cartographic.fromRadians(
      rectangle.east,
      rectangle.north,
      0.0,
      scratchCorners[0]
    );
    Matrix3.Cartographic.fromRadians(
      rectangle.west,
      rectangle.north,
      0.0,
      scratchCorners[1]
    );
    Matrix3.Cartographic.fromRadians(
      rectangle.east,
      rectangle.south,
      0.0,
      scratchCorners[2]
    );
    Matrix3.Cartographic.fromRadians(
      rectangle.west,
      rectangle.south,
      0.0,
      scratchCorners[3]
    );

    // Determine which tile the bounding rectangle is in
    let lastLevelX = 0,
      lastLevelY = 0;
    let currentX = 0,
      currentY = 0;
    const maxLevel = ApproximateTerrainHeights._terrainHeightsMaxLevel;
    let i;
    for (i = 0; i <= maxLevel; ++i) {
      let failed = false;
      for (let j = 0; j < 4; ++j) {
        const corner = scratchCorners[j];
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
        return defaultValue.defined(ApproximateTerrainHeights._terrainHeights);
      },
    },
  });
  var ApproximateTerrainHeights$1 = ApproximateTerrainHeights;

  const PROJECTIONS = [Transforms.GeographicProjection, WebMercatorProjection.WebMercatorProjection];
  const PROJECTION_COUNT = PROJECTIONS.length;

  const MITER_BREAK_SMALL = Math.cos(Math$1.CesiumMath.toRadians(30.0));
  const MITER_BREAK_LARGE = Math.cos(Math$1.CesiumMath.toRadians(150.0));

  // Initial heights for constructing the wall.
  // Keeping WALL_INITIAL_MIN_HEIGHT near the ellipsoid surface helps
  // prevent precision problems with planes in the shader.
  // Putting the start point of a plane at ApproximateTerrainHeights._defaultMinTerrainHeight,
  // which is a highly conservative bound, usually puts the plane origin several thousands
  // of meters away from the actual terrain, causing floating point problems when checking
  // fragments on terrain against the plane.
  // Ellipsoid height is generally much closer.
  // The initial max height is arbitrary.
  // Both heights are corrected using ApproximateTerrainHeights for computing the actual volume geometry.
  // PROPELLER HACK: Allow rendering of ground primitives with negative WGS84 elevation
  const WALL_INITIAL_MIN_HEIGHT = -250;
  const WALL_INITIAL_MAX_HEIGHT = 1000.0;

  /**
   * A description of a polyline on terrain or 3D Tiles. Only to be used with {@link GroundPolylinePrimitive}.
   *
   * @alias GroundPolylineGeometry
   * @constructor
   *
   * @param {Object} options Options with the following properties:
   * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the polyline's points. Heights above the ellipsoid will be ignored.
   * @param {Number} [options.width=1.0] The screen space width in pixels.
   * @param {Number} [options.granularity=9999.0] The distance interval in meters used for interpolating options.points. Defaults to 9999.0 meters. Zero indicates no interpolation.
   * @param {Boolean} [options.loop=false] Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polyline segments must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
   *
   * @exception {DeveloperError} At least two positions are required.
   *
   * @see GroundPolylinePrimitive
   *
   * @example
   * const positions = Cesium.Cartesian3.fromDegreesArray([
   *   -112.1340164450331, 36.05494287836128,
   *   -112.08821010582645, 36.097804071380715,
   *   -112.13296079730024, 36.168769146801104
   * ]);
   *
   * const geometry = new Cesium.GroundPolylineGeometry({
   *   positions : positions
   * });
   */
  function GroundPolylineGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
    const positions = options.positions;

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(positions) || positions.length < 2) {
      throw new Check.DeveloperError("At least two positions are required.");
    }
    if (
      defaultValue.defined(options.arcType) &&
      options.arcType !== ArcType.ArcType.GEODESIC &&
      options.arcType !== ArcType.ArcType.RHUMB
    ) {
      throw new Check.DeveloperError(
        "Valid options for arcType are ArcType.GEODESIC and ArcType.RHUMB."
      );
    }
    //>>includeEnd('debug');

    /**
     * The screen space width in pixels.
     * @type {Number}
     */
    this.width = defaultValue.defaultValue(options.width, 1.0); // Doesn't get packed, not necessary for computing geometry.

    this._positions = positions;

    /**
     * The distance interval used for interpolating options.points. Zero indicates no interpolation.
     * Default of 9999.0 allows centimeter accuracy with 32 bit floating point.
     * @type {Boolean}
     * @default 9999.0
     */
    this.granularity = defaultValue.defaultValue(options.granularity, 9999.0);

    /**
     * Whether during geometry creation a line segment will be added between the last and first line positions to make this Polyline a loop.
     * If the geometry has two positions this parameter will be ignored.
     * @type {Boolean}
     * @default false
     */
    this.loop = defaultValue.defaultValue(options.loop, false);

    /**
     * The type of path the polyline must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
     * @type {ArcType}
     * @default ArcType.GEODESIC
     */
    this.arcType = defaultValue.defaultValue(options.arcType, ArcType.ArcType.GEODESIC);

    this._ellipsoid = Matrix3.Ellipsoid.WGS84;

    // MapProjections can't be packed, so store the index to a known MapProjection.
    this._projectionIndex = 0;
    this._workerName = "createGroundPolylineGeometry";

    // Used by GroundPolylinePrimitive to signal worker that scenemode is 3D only.
    this._scene3DOnly = false;
  }

  Object.defineProperties(GroundPolylineGeometry.prototype, {
    /**
     * The number of elements used to pack the object into an array.
     * @memberof GroundPolylineGeometry.prototype
     * @type {Number}
     * @readonly
     * @private
     */
    packedLength: {
      get: function () {
        return (
          1.0 +
          this._positions.length * 3 +
          1.0 +
          1.0 +
          1.0 +
          Matrix3.Ellipsoid.packedLength +
          1.0 +
          1.0
        );
      },
    },
  });

  /**
   * Set the GroundPolylineGeometry's projection and ellipsoid.
   * Used by GroundPolylinePrimitive to signal scene information to the geometry for generating 2D attributes.
   *
   * @param {GroundPolylineGeometry} groundPolylineGeometry GroundPolylinGeometry describing a polyline on terrain or 3D Tiles.
   * @param {Projection} mapProjection A MapProjection used for projecting cartographic coordinates to 2D.
   * @private
   */
  GroundPolylineGeometry.setProjectionAndEllipsoid = function (
    groundPolylineGeometry,
    mapProjection
  ) {
    let projectionIndex = 0;
    for (let i = 0; i < PROJECTION_COUNT; i++) {
      if (mapProjection instanceof PROJECTIONS[i]) {
        projectionIndex = i;
        break;
      }
    }

    groundPolylineGeometry._projectionIndex = projectionIndex;
    groundPolylineGeometry._ellipsoid = mapProjection.ellipsoid;
  };

  const cart3Scratch1 = new Matrix3.Cartesian3();
  const cart3Scratch2 = new Matrix3.Cartesian3();
  const cart3Scratch3 = new Matrix3.Cartesian3();
  function computeRightNormal(start, end, maxHeight, ellipsoid, result) {
    const startBottom = getPosition(ellipsoid, start, 0.0, cart3Scratch1);
    const startTop = getPosition(ellipsoid, start, maxHeight, cart3Scratch2);
    const endBottom = getPosition(ellipsoid, end, 0.0, cart3Scratch3);

    const up = direction(startTop, startBottom, cart3Scratch2);
    const forward = direction(endBottom, startBottom, cart3Scratch3);

    Matrix3.Cartesian3.cross(forward, up, result);
    return Matrix3.Cartesian3.normalize(result, result);
  }

  const interpolatedCartographicScratch = new Matrix3.Cartographic();
  const interpolatedBottomScratch = new Matrix3.Cartesian3();
  const interpolatedTopScratch = new Matrix3.Cartesian3();
  const interpolatedNormalScratch = new Matrix3.Cartesian3();
  function interpolateSegment(
    start,
    end,
    minHeight,
    maxHeight,
    granularity,
    arcType,
    ellipsoid,
    normalsArray,
    bottomPositionsArray,
    topPositionsArray,
    cartographicsArray
  ) {
    if (granularity === 0.0) {
      return;
    }

    let ellipsoidLine;
    if (arcType === ArcType.ArcType.GEODESIC) {
      ellipsoidLine = new EllipsoidGeodesic.EllipsoidGeodesic(start, end, ellipsoid);
    } else if (arcType === ArcType.ArcType.RHUMB) {
      ellipsoidLine = new EllipsoidRhumbLine.EllipsoidRhumbLine(start, end, ellipsoid);
    }

    const surfaceDistance = ellipsoidLine.surfaceDistance;
    if (surfaceDistance < granularity) {
      return;
    }

    // Compute rightwards normal applicable at all interpolated points
    const interpolatedNormal = computeRightNormal(
      start,
      end,
      maxHeight,
      ellipsoid,
      interpolatedNormalScratch
    );

    const segments = Math.ceil(surfaceDistance / granularity);
    const interpointDistance = surfaceDistance / segments;
    let distanceFromStart = interpointDistance;
    const pointsToAdd = segments - 1;
    let packIndex = normalsArray.length;
    for (let i = 0; i < pointsToAdd; i++) {
      const interpolatedCartographic = ellipsoidLine.interpolateUsingSurfaceDistance(
        distanceFromStart,
        interpolatedCartographicScratch
      );
      const interpolatedBottom = getPosition(
        ellipsoid,
        interpolatedCartographic,
        minHeight,
        interpolatedBottomScratch
      );
      const interpolatedTop = getPosition(
        ellipsoid,
        interpolatedCartographic,
        maxHeight,
        interpolatedTopScratch
      );

      Matrix3.Cartesian3.pack(interpolatedNormal, normalsArray, packIndex);
      Matrix3.Cartesian3.pack(interpolatedBottom, bottomPositionsArray, packIndex);
      Matrix3.Cartesian3.pack(interpolatedTop, topPositionsArray, packIndex);
      cartographicsArray.push(interpolatedCartographic.latitude);
      cartographicsArray.push(interpolatedCartographic.longitude);

      packIndex += 3;
      distanceFromStart += interpointDistance;
    }
  }

  const heightlessCartographicScratch = new Matrix3.Cartographic();
  function getPosition(ellipsoid, cartographic, height, result) {
    Matrix3.Cartographic.clone(cartographic, heightlessCartographicScratch);
    heightlessCartographicScratch.height = height;
    return Matrix3.Cartographic.toCartesian(
      heightlessCartographicScratch,
      ellipsoid,
      result
    );
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PolygonGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  GroundPolylineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    let index = defaultValue.defaultValue(startingIndex, 0);

    const positions = value._positions;
    const positionsLength = positions.length;

    array[index++] = positionsLength;

    for (let i = 0; i < positionsLength; ++i) {
      const cartesian = positions[i];
      Matrix3.Cartesian3.pack(cartesian, array, index);
      index += 3;
    }

    array[index++] = value.granularity;
    array[index++] = value.loop ? 1.0 : 0.0;
    array[index++] = value.arcType;

    Matrix3.Ellipsoid.pack(value._ellipsoid, array, index);
    index += Matrix3.Ellipsoid.packedLength;

    array[index++] = value._projectionIndex;
    array[index++] = value._scene3DOnly ? 1.0 : 0.0;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PolygonGeometry} [result] The object into which to store the result.
   */
  GroundPolylineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    let index = defaultValue.defaultValue(startingIndex, 0);
    const positionsLength = array[index++];
    const positions = new Array(positionsLength);

    for (let i = 0; i < positionsLength; i++) {
      positions[i] = Matrix3.Cartesian3.unpack(array, index);
      index += 3;
    }

    const granularity = array[index++];
    const loop = array[index++] === 1.0;
    const arcType = array[index++];

    const ellipsoid = Matrix3.Ellipsoid.unpack(array, index);
    index += Matrix3.Ellipsoid.packedLength;

    const projectionIndex = array[index++];
    const scene3DOnly = array[index++] === 1.0;

    if (!defaultValue.defined(result)) {
      result = new GroundPolylineGeometry({
        positions: positions,
      });
    }

    result._positions = positions;
    result.granularity = granularity;
    result.loop = loop;
    result.arcType = arcType;
    result._ellipsoid = ellipsoid;
    result._projectionIndex = projectionIndex;
    result._scene3DOnly = scene3DOnly;

    return result;
  };

  function direction(target, origin, result) {
    Matrix3.Cartesian3.subtract(target, origin, result);
    Matrix3.Cartesian3.normalize(result, result);
    return result;
  }

  function tangentDirection(target, origin, up, result) {
    result = direction(target, origin, result);

    // orthogonalize
    result = Matrix3.Cartesian3.cross(result, up, result);
    result = Matrix3.Cartesian3.normalize(result, result);
    result = Matrix3.Cartesian3.cross(up, result, result);
    return result;
  }

  const toPreviousScratch = new Matrix3.Cartesian3();
  const toNextScratch = new Matrix3.Cartesian3();
  const forwardScratch = new Matrix3.Cartesian3();
  const vertexUpScratch = new Matrix3.Cartesian3();
  const cosine90 = 0.0;
  const cosine180 = -1.0;
  function computeVertexMiterNormal(
    previousBottom,
    vertexBottom,
    vertexTop,
    nextBottom,
    result
  ) {
    const up = direction(vertexTop, vertexBottom, vertexUpScratch);

    // Compute vectors pointing towards neighboring points but tangent to this point on the ellipsoid
    const toPrevious = tangentDirection(
      previousBottom,
      vertexBottom,
      up,
      toPreviousScratch
    );
    const toNext = tangentDirection(nextBottom, vertexBottom, up, toNextScratch);

    // Check if tangents are almost opposite - if so, no need to miter.
    if (
      Math$1.CesiumMath.equalsEpsilon(
        Matrix3.Cartesian3.dot(toPrevious, toNext),
        cosine180,
        Math$1.CesiumMath.EPSILON5
      )
    ) {
      result = Matrix3.Cartesian3.cross(up, toPrevious, result);
      result = Matrix3.Cartesian3.normalize(result, result);
      return result;
    }

    // Average directions to previous and to next in the plane of Up
    result = Matrix3.Cartesian3.add(toNext, toPrevious, result);
    result = Matrix3.Cartesian3.normalize(result, result);

    // Flip the normal if it isn't pointing roughly bound right (aka if forward is pointing more "backwards")
    const forward = Matrix3.Cartesian3.cross(up, result, forwardScratch);
    if (Matrix3.Cartesian3.dot(toNext, forward) < cosine90) {
      result = Matrix3.Cartesian3.negate(result, result);
    }

    return result;
  }

  const XZ_PLANE = Plane.Plane.fromPointNormal(Matrix3.Cartesian3.ZERO, Matrix3.Cartesian3.UNIT_Y);

  const previousBottomScratch = new Matrix3.Cartesian3();
  const vertexBottomScratch = new Matrix3.Cartesian3();
  const vertexTopScratch = new Matrix3.Cartesian3();
  const nextBottomScratch = new Matrix3.Cartesian3();
  const vertexNormalScratch = new Matrix3.Cartesian3();
  const intersectionScratch = new Matrix3.Cartesian3();
  const cartographicScratch0 = new Matrix3.Cartographic();
  const cartographicScratch1 = new Matrix3.Cartographic();
  const cartographicIntersectionScratch = new Matrix3.Cartographic();
  /**
   * Computes shadow volumes for the ground polyline, consisting of its vertices, indices, and a bounding sphere.
   * Vertices are "fat," packing all the data needed in each volume to describe a line on terrain or 3D Tiles.
   * Should not be called independent of {@link GroundPolylinePrimitive}.
   *
   * @param {GroundPolylineGeometry} groundPolylineGeometry
   * @private
   */
  GroundPolylineGeometry.createGeometry = function (groundPolylineGeometry) {
    const compute2dAttributes = !groundPolylineGeometry._scene3DOnly;
    let loop = groundPolylineGeometry.loop;
    const ellipsoid = groundPolylineGeometry._ellipsoid;
    const granularity = groundPolylineGeometry.granularity;
    const arcType = groundPolylineGeometry.arcType;
    const projection = new PROJECTIONS[groundPolylineGeometry._projectionIndex](
      ellipsoid
    );

    const minHeight = WALL_INITIAL_MIN_HEIGHT;
    const maxHeight = WALL_INITIAL_MAX_HEIGHT;

    let index;
    let i;

    const positions = groundPolylineGeometry._positions;
    const positionsLength = positions.length;

    if (positionsLength === 2) {
      loop = false;
    }

    // Split positions across the IDL and the Prime Meridian as well.
    // Split across prime meridian because very large geometries crossing the Prime Meridian but not the IDL
    // may get split by the plane of IDL + Prime Meridian.
    let p0;
    let p1;
    let c0;
    let c1;
    const rhumbLine = new EllipsoidRhumbLine.EllipsoidRhumbLine(undefined, undefined, ellipsoid);
    let intersection;
    let intersectionCartographic;
    let intersectionLongitude;
    const splitPositions = [positions[0]];
    for (i = 0; i < positionsLength - 1; i++) {
      p0 = positions[i];
      p1 = positions[i + 1];
      intersection = IntersectionTests.IntersectionTests.lineSegmentPlane(
        p0,
        p1,
        XZ_PLANE,
        intersectionScratch
      );
      if (
        defaultValue.defined(intersection) &&
        !Matrix3.Cartesian3.equalsEpsilon(intersection, p0, Math$1.CesiumMath.EPSILON7) &&
        !Matrix3.Cartesian3.equalsEpsilon(intersection, p1, Math$1.CesiumMath.EPSILON7)
      ) {
        if (groundPolylineGeometry.arcType === ArcType.ArcType.GEODESIC) {
          splitPositions.push(Matrix3.Cartesian3.clone(intersection));
        } else if (groundPolylineGeometry.arcType === ArcType.ArcType.RHUMB) {
          intersectionLongitude = ellipsoid.cartesianToCartographic(
            intersection,
            cartographicScratch0
          ).longitude;
          c0 = ellipsoid.cartesianToCartographic(p0, cartographicScratch0);
          c1 = ellipsoid.cartesianToCartographic(p1, cartographicScratch1);
          rhumbLine.setEndPoints(c0, c1);
          intersectionCartographic = rhumbLine.findIntersectionWithLongitude(
            intersectionLongitude,
            cartographicIntersectionScratch
          );
          intersection = ellipsoid.cartographicToCartesian(
            intersectionCartographic,
            intersectionScratch
          );
          if (
            defaultValue.defined(intersection) &&
            !Matrix3.Cartesian3.equalsEpsilon(intersection, p0, Math$1.CesiumMath.EPSILON7) &&
            !Matrix3.Cartesian3.equalsEpsilon(intersection, p1, Math$1.CesiumMath.EPSILON7)
          ) {
            splitPositions.push(Matrix3.Cartesian3.clone(intersection));
          }
        }
      }
      splitPositions.push(p1);
    }

    if (loop) {
      p0 = positions[positionsLength - 1];
      p1 = positions[0];
      intersection = IntersectionTests.IntersectionTests.lineSegmentPlane(
        p0,
        p1,
        XZ_PLANE,
        intersectionScratch
      );
      if (
        defaultValue.defined(intersection) &&
        !Matrix3.Cartesian3.equalsEpsilon(intersection, p0, Math$1.CesiumMath.EPSILON7) &&
        !Matrix3.Cartesian3.equalsEpsilon(intersection, p1, Math$1.CesiumMath.EPSILON7)
      ) {
        if (groundPolylineGeometry.arcType === ArcType.ArcType.GEODESIC) {
          splitPositions.push(Matrix3.Cartesian3.clone(intersection));
        } else if (groundPolylineGeometry.arcType === ArcType.ArcType.RHUMB) {
          intersectionLongitude = ellipsoid.cartesianToCartographic(
            intersection,
            cartographicScratch0
          ).longitude;
          c0 = ellipsoid.cartesianToCartographic(p0, cartographicScratch0);
          c1 = ellipsoid.cartesianToCartographic(p1, cartographicScratch1);
          rhumbLine.setEndPoints(c0, c1);
          intersectionCartographic = rhumbLine.findIntersectionWithLongitude(
            intersectionLongitude,
            cartographicIntersectionScratch
          );
          intersection = ellipsoid.cartographicToCartesian(
            intersectionCartographic,
            intersectionScratch
          );
          if (
            defaultValue.defined(intersection) &&
            !Matrix3.Cartesian3.equalsEpsilon(intersection, p0, Math$1.CesiumMath.EPSILON7) &&
            !Matrix3.Cartesian3.equalsEpsilon(intersection, p1, Math$1.CesiumMath.EPSILON7)
          ) {
            splitPositions.push(Matrix3.Cartesian3.clone(intersection));
          }
        }
      }
    }
    let cartographicsLength = splitPositions.length;

    let cartographics = new Array(cartographicsLength);
    for (i = 0; i < cartographicsLength; i++) {
      const cartographic = Matrix3.Cartographic.fromCartesian(
        splitPositions[i],
        ellipsoid
      );
      cartographic.height = 0.0;
      cartographics[i] = cartographic;
    }

    cartographics = arrayRemoveDuplicates.arrayRemoveDuplicates(
      cartographics,
      Matrix3.Cartographic.equalsEpsilon
    );
    cartographicsLength = cartographics.length;

    if (cartographicsLength < 2) {
      return undefined;
    }

    /**** Build heap-side arrays for positions, interpolated cartographics, and normals from which to compute vertices ****/
    // We build a "wall" and then decompose it into separately connected component "volumes" because we need a lot
    // of information about the wall. Also, this simplifies interpolation.
    // Convention: "next" and "end" are locally forward to each segment of the wall,
    // and we are computing normals pointing towards the local right side of the vertices in each segment.
    const cartographicsArray = [];
    const normalsArray = [];
    const bottomPositionsArray = [];
    const topPositionsArray = [];

    let previousBottom = previousBottomScratch;
    let vertexBottom = vertexBottomScratch;
    let vertexTop = vertexTopScratch;
    let nextBottom = nextBottomScratch;
    let vertexNormal = vertexNormalScratch;

    // First point - either loop or attach a "perpendicular" normal
    const startCartographic = cartographics[0];
    const nextCartographic = cartographics[1];

    const prestartCartographic = cartographics[cartographicsLength - 1];
    previousBottom = getPosition(
      ellipsoid,
      prestartCartographic,
      minHeight,
      previousBottom
    );
    nextBottom = getPosition(ellipsoid, nextCartographic, minHeight, nextBottom);
    vertexBottom = getPosition(
      ellipsoid,
      startCartographic,
      minHeight,
      vertexBottom
    );
    vertexTop = getPosition(ellipsoid, startCartographic, maxHeight, vertexTop);

    if (loop) {
      vertexNormal = computeVertexMiterNormal(
        previousBottom,
        vertexBottom,
        vertexTop,
        nextBottom,
        vertexNormal
      );
    } else {
      vertexNormal = computeRightNormal(
        startCartographic,
        nextCartographic,
        maxHeight,
        ellipsoid,
        vertexNormal
      );
    }

    Matrix3.Cartesian3.pack(vertexNormal, normalsArray, 0);
    Matrix3.Cartesian3.pack(vertexBottom, bottomPositionsArray, 0);
    Matrix3.Cartesian3.pack(vertexTop, topPositionsArray, 0);
    cartographicsArray.push(startCartographic.latitude);
    cartographicsArray.push(startCartographic.longitude);

    interpolateSegment(
      startCartographic,
      nextCartographic,
      minHeight,
      maxHeight,
      granularity,
      arcType,
      ellipsoid,
      normalsArray,
      bottomPositionsArray,
      topPositionsArray,
      cartographicsArray
    );

    // All inbetween points
    for (i = 1; i < cartographicsLength - 1; ++i) {
      previousBottom = Matrix3.Cartesian3.clone(vertexBottom, previousBottom);
      vertexBottom = Matrix3.Cartesian3.clone(nextBottom, vertexBottom);
      const vertexCartographic = cartographics[i];
      getPosition(ellipsoid, vertexCartographic, maxHeight, vertexTop);
      getPosition(ellipsoid, cartographics[i + 1], minHeight, nextBottom);

      computeVertexMiterNormal(
        previousBottom,
        vertexBottom,
        vertexTop,
        nextBottom,
        vertexNormal
      );

      index = normalsArray.length;
      Matrix3.Cartesian3.pack(vertexNormal, normalsArray, index);
      Matrix3.Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
      Matrix3.Cartesian3.pack(vertexTop, topPositionsArray, index);
      cartographicsArray.push(vertexCartographic.latitude);
      cartographicsArray.push(vertexCartographic.longitude);

      interpolateSegment(
        cartographics[i],
        cartographics[i + 1],
        minHeight,
        maxHeight,
        granularity,
        arcType,
        ellipsoid,
        normalsArray,
        bottomPositionsArray,
        topPositionsArray,
        cartographicsArray
      );
    }

    // Last point - either loop or attach a normal "perpendicular" to the wall.
    const endCartographic = cartographics[cartographicsLength - 1];
    const preEndCartographic = cartographics[cartographicsLength - 2];

    vertexBottom = getPosition(
      ellipsoid,
      endCartographic,
      minHeight,
      vertexBottom
    );
    vertexTop = getPosition(ellipsoid, endCartographic, maxHeight, vertexTop);

    if (loop) {
      const postEndCartographic = cartographics[0];
      previousBottom = getPosition(
        ellipsoid,
        preEndCartographic,
        minHeight,
        previousBottom
      );
      nextBottom = getPosition(
        ellipsoid,
        postEndCartographic,
        minHeight,
        nextBottom
      );

      vertexNormal = computeVertexMiterNormal(
        previousBottom,
        vertexBottom,
        vertexTop,
        nextBottom,
        vertexNormal
      );
    } else {
      vertexNormal = computeRightNormal(
        preEndCartographic,
        endCartographic,
        maxHeight,
        ellipsoid,
        vertexNormal
      );
    }

    index = normalsArray.length;
    Matrix3.Cartesian3.pack(vertexNormal, normalsArray, index);
    Matrix3.Cartesian3.pack(vertexBottom, bottomPositionsArray, index);
    Matrix3.Cartesian3.pack(vertexTop, topPositionsArray, index);
    cartographicsArray.push(endCartographic.latitude);
    cartographicsArray.push(endCartographic.longitude);

    if (loop) {
      interpolateSegment(
        endCartographic,
        startCartographic,
        minHeight,
        maxHeight,
        granularity,
        arcType,
        ellipsoid,
        normalsArray,
        bottomPositionsArray,
        topPositionsArray,
        cartographicsArray
      );
      index = normalsArray.length;
      for (i = 0; i < 3; ++i) {
        normalsArray[index + i] = normalsArray[i];
        bottomPositionsArray[index + i] = bottomPositionsArray[i];
        topPositionsArray[index + i] = topPositionsArray[i];
      }
      cartographicsArray.push(startCartographic.latitude);
      cartographicsArray.push(startCartographic.longitude);
    }

    return generateGeometryAttributes(
      loop,
      projection,
      bottomPositionsArray,
      topPositionsArray,
      normalsArray,
      cartographicsArray,
      compute2dAttributes
    );
  };

  // If the end normal angle is too steep compared to the direction of the line segment,
  // "break" the miter by rotating the normal 90 degrees around the "up" direction at the point
  // For ultra precision we would want to project into a plane, but in practice this is sufficient.
  const lineDirectionScratch = new Matrix3.Cartesian3();
  const matrix3Scratch = new Matrix3.Matrix3();
  const quaternionScratch = new Transforms.Quaternion();
  function breakMiter(endGeometryNormal, startBottom, endBottom, endTop) {
    const lineDirection = direction(endBottom, startBottom, lineDirectionScratch);

    const dot = Matrix3.Cartesian3.dot(lineDirection, endGeometryNormal);
    if (dot > MITER_BREAK_SMALL || dot < MITER_BREAK_LARGE) {
      const vertexUp = direction(endTop, endBottom, vertexUpScratch);
      const angle =
        dot < MITER_BREAK_LARGE
          ? Math$1.CesiumMath.PI_OVER_TWO
          : -Math$1.CesiumMath.PI_OVER_TWO;
      const quaternion = Transforms.Quaternion.fromAxisAngle(
        vertexUp,
        angle,
        quaternionScratch
      );
      const rotationMatrix = Matrix3.Matrix3.fromQuaternion(quaternion, matrix3Scratch);
      Matrix3.Matrix3.multiplyByVector(
        rotationMatrix,
        endGeometryNormal,
        endGeometryNormal
      );
      return true;
    }
    return false;
  }

  const endPosCartographicScratch = new Matrix3.Cartographic();
  const normalStartpointScratch = new Matrix3.Cartesian3();
  const normalEndpointScratch = new Matrix3.Cartesian3();
  function projectNormal(
    projection,
    cartographic,
    normal,
    projectedPosition,
    result
  ) {
    const position = Matrix3.Cartographic.toCartesian(
      cartographic,
      projection._ellipsoid,
      normalStartpointScratch
    );
    let normalEndpoint = Matrix3.Cartesian3.add(position, normal, normalEndpointScratch);
    let flipNormal = false;

    const ellipsoid = projection._ellipsoid;
    let normalEndpointCartographic = ellipsoid.cartesianToCartographic(
      normalEndpoint,
      endPosCartographicScratch
    );
    // If normal crosses the IDL, go the other way and flip the result.
    // In practice this almost never happens because the cartographic start
    // and end points of each segment are "nudged" to be on the same side
    // of the IDL and slightly away from the IDL.
    if (
      Math.abs(cartographic.longitude - normalEndpointCartographic.longitude) >
      Math$1.CesiumMath.PI_OVER_TWO
    ) {
      flipNormal = true;
      normalEndpoint = Matrix3.Cartesian3.subtract(
        position,
        normal,
        normalEndpointScratch
      );
      normalEndpointCartographic = ellipsoid.cartesianToCartographic(
        normalEndpoint,
        endPosCartographicScratch
      );
    }

    normalEndpointCartographic.height = 0.0;
    const normalEndpointProjected = projection.project(
      normalEndpointCartographic,
      result
    );
    result = Matrix3.Cartesian3.subtract(
      normalEndpointProjected,
      projectedPosition,
      result
    );
    result.z = 0.0;
    result = Matrix3.Cartesian3.normalize(result, result);
    if (flipNormal) {
      Matrix3.Cartesian3.negate(result, result);
    }
    return result;
  }

  const adjustHeightNormalScratch = new Matrix3.Cartesian3();
  const adjustHeightOffsetScratch = new Matrix3.Cartesian3();
  function adjustHeights(
    bottom,
    top,
    minHeight,
    maxHeight,
    adjustHeightBottom,
    adjustHeightTop
  ) {
    // bottom and top should be at WALL_INITIAL_MIN_HEIGHT and WALL_INITIAL_MAX_HEIGHT, respectively
    const adjustHeightNormal = Matrix3.Cartesian3.subtract(
      top,
      bottom,
      adjustHeightNormalScratch
    );
    Matrix3.Cartesian3.normalize(adjustHeightNormal, adjustHeightNormal);

    const distanceForBottom = minHeight - WALL_INITIAL_MIN_HEIGHT;
    let adjustHeightOffset = Matrix3.Cartesian3.multiplyByScalar(
      adjustHeightNormal,
      distanceForBottom,
      adjustHeightOffsetScratch
    );
    Matrix3.Cartesian3.add(bottom, adjustHeightOffset, adjustHeightBottom);

    const distanceForTop = maxHeight - WALL_INITIAL_MAX_HEIGHT;
    adjustHeightOffset = Matrix3.Cartesian3.multiplyByScalar(
      adjustHeightNormal,
      distanceForTop,
      adjustHeightOffsetScratch
    );
    Matrix3.Cartesian3.add(top, adjustHeightOffset, adjustHeightTop);
  }

  const nudgeDirectionScratch = new Matrix3.Cartesian3();
  function nudgeXZ(start, end) {
    const startToXZdistance = Plane.Plane.getPointDistance(XZ_PLANE, start);
    const endToXZdistance = Plane.Plane.getPointDistance(XZ_PLANE, end);
    let offset = nudgeDirectionScratch;
    // Larger epsilon than what's used in GeometryPipeline, a centimeter in world space
    if (Math$1.CesiumMath.equalsEpsilon(startToXZdistance, 0.0, Math$1.CesiumMath.EPSILON2)) {
      offset = direction(end, start, offset);
      Matrix3.Cartesian3.multiplyByScalar(offset, Math$1.CesiumMath.EPSILON2, offset);
      Matrix3.Cartesian3.add(start, offset, start);
    } else if (
      Math$1.CesiumMath.equalsEpsilon(endToXZdistance, 0.0, Math$1.CesiumMath.EPSILON2)
    ) {
      offset = direction(start, end, offset);
      Matrix3.Cartesian3.multiplyByScalar(offset, Math$1.CesiumMath.EPSILON2, offset);
      Matrix3.Cartesian3.add(end, offset, end);
    }
  }

  // "Nudge" cartographic coordinates so start and end are on the same side of the IDL.
  // Nudge amounts are tiny, basically just an IDL flip.
  // Only used for 2D/CV.
  function nudgeCartographic(start, end) {
    const absStartLon = Math.abs(start.longitude);
    const absEndLon = Math.abs(end.longitude);
    if (
      Math$1.CesiumMath.equalsEpsilon(absStartLon, Math$1.CesiumMath.PI, Math$1.CesiumMath.EPSILON11)
    ) {
      const endSign = Math$1.CesiumMath.sign(end.longitude);
      start.longitude = endSign * (absStartLon - Math$1.CesiumMath.EPSILON11);
      return 1;
    } else if (
      Math$1.CesiumMath.equalsEpsilon(absEndLon, Math$1.CesiumMath.PI, Math$1.CesiumMath.EPSILON11)
    ) {
      const startSign = Math$1.CesiumMath.sign(start.longitude);
      end.longitude = startSign * (absEndLon - Math$1.CesiumMath.EPSILON11);
      return 2;
    }
    return 0;
  }

  const startCartographicScratch = new Matrix3.Cartographic();
  const endCartographicScratch = new Matrix3.Cartographic();

  const segmentStartTopScratch = new Matrix3.Cartesian3();
  const segmentEndTopScratch = new Matrix3.Cartesian3();
  const segmentStartBottomScratch = new Matrix3.Cartesian3();
  const segmentEndBottomScratch = new Matrix3.Cartesian3();
  const segmentStartNormalScratch = new Matrix3.Cartesian3();
  const segmentEndNormalScratch = new Matrix3.Cartesian3();

  const getHeightCartographics = [
    startCartographicScratch,
    endCartographicScratch,
  ];
  const getHeightRectangleScratch = new Matrix2.Rectangle();

  const adjustHeightStartTopScratch = new Matrix3.Cartesian3();
  const adjustHeightEndTopScratch = new Matrix3.Cartesian3();
  const adjustHeightStartBottomScratch = new Matrix3.Cartesian3();
  const adjustHeightEndBottomScratch = new Matrix3.Cartesian3();

  const segmentStart2DScratch = new Matrix3.Cartesian3();
  const segmentEnd2DScratch = new Matrix3.Cartesian3();
  const segmentStartNormal2DScratch = new Matrix3.Cartesian3();
  const segmentEndNormal2DScratch = new Matrix3.Cartesian3();

  const offsetScratch = new Matrix3.Cartesian3();
  const startUpScratch = new Matrix3.Cartesian3();
  const endUpScratch = new Matrix3.Cartesian3();
  const rightScratch = new Matrix3.Cartesian3();
  const startPlaneNormalScratch = new Matrix3.Cartesian3();
  const endPlaneNormalScratch = new Matrix3.Cartesian3();
  const encodeScratch = new EncodedCartesian3.EncodedCartesian3();

  const encodeScratch2D = new EncodedCartesian3.EncodedCartesian3();
  const forwardOffset2DScratch = new Matrix3.Cartesian3();
  const right2DScratch = new Matrix3.Cartesian3();

  const normalNudgeScratch = new Matrix3.Cartesian3();

  const scratchBoundingSpheres = [new Transforms.BoundingSphere(), new Transforms.BoundingSphere()];

  // Winding order is reversed so each segment's volume is inside-out
  const REFERENCE_INDICES = [
    0,
    2,
    1,
    0,
    3,
    2, // right
    0,
    7,
    3,
    0,
    4,
    7, // start
    0,
    5,
    4,
    0,
    1,
    5, // bottom
    5,
    7,
    4,
    5,
    6,
    7, // left
    5,
    2,
    6,
    5,
    1,
    2, // end
    3,
    6,
    2,
    3,
    7,
    6, // top
  ];
  const REFERENCE_INDICES_LENGTH = REFERENCE_INDICES.length;

  // Decompose the "wall" into a series of shadow volumes.
  // Each shadow volume's vertices encode a description of the line it contains,
  // including mitering planes at the end points, a plane along the line itself,
  // and attributes for computing length-wise texture coordinates.
  function generateGeometryAttributes(
    loop,
    projection,
    bottomPositionsArray,
    topPositionsArray,
    normalsArray,
    cartographicsArray,
    compute2dAttributes
  ) {
    let i;
    let index;
    const ellipsoid = projection._ellipsoid;

    // Each segment will have 8 vertices
    const segmentCount = bottomPositionsArray.length / 3 - 1;
    const vertexCount = segmentCount * 8;
    const arraySizeVec4 = vertexCount * 4;
    const indexCount = segmentCount * 36;

    const indices =
      vertexCount > 65535
        ? new Uint32Array(indexCount)
        : new Uint16Array(indexCount);
    const positionsArray = new Float64Array(vertexCount * 3);

    const startHiAndForwardOffsetX = new Float32Array(arraySizeVec4);
    const startLoAndForwardOffsetY = new Float32Array(arraySizeVec4);
    const startNormalAndForwardOffsetZ = new Float32Array(arraySizeVec4);
    const endNormalAndTextureCoordinateNormalizationX = new Float32Array(
      arraySizeVec4
    );
    const rightNormalAndTextureCoordinateNormalizationY = new Float32Array(
      arraySizeVec4
    );

    let startHiLo2D;
    let offsetAndRight2D;
    let startEndNormals2D;
    let texcoordNormalization2D;

    if (compute2dAttributes) {
      startHiLo2D = new Float32Array(arraySizeVec4);
      offsetAndRight2D = new Float32Array(arraySizeVec4);
      startEndNormals2D = new Float32Array(arraySizeVec4);
      texcoordNormalization2D = new Float32Array(vertexCount * 2);
    }

    /*** Compute total lengths for texture coordinate normalization ***/
    // 2D
    const cartographicsLength = cartographicsArray.length / 2;
    let length2D = 0.0;

    const startCartographic = startCartographicScratch;
    startCartographic.height = 0.0;
    const endCartographic = endCartographicScratch;
    endCartographic.height = 0.0;

    let segmentStartCartesian = segmentStartTopScratch;
    let segmentEndCartesian = segmentEndTopScratch;

    if (compute2dAttributes) {
      index = 0;
      for (i = 1; i < cartographicsLength; i++) {
        // Don't clone anything from previous segment b/c possible IDL touch
        startCartographic.latitude = cartographicsArray[index];
        startCartographic.longitude = cartographicsArray[index + 1];
        endCartographic.latitude = cartographicsArray[index + 2];
        endCartographic.longitude = cartographicsArray[index + 3];

        segmentStartCartesian = projection.project(
          startCartographic,
          segmentStartCartesian
        );
        segmentEndCartesian = projection.project(
          endCartographic,
          segmentEndCartesian
        );
        length2D += Matrix3.Cartesian3.distance(
          segmentStartCartesian,
          segmentEndCartesian
        );
        index += 2;
      }
    }

    // 3D
    const positionsLength = topPositionsArray.length / 3;
    segmentEndCartesian = Matrix3.Cartesian3.unpack(
      topPositionsArray,
      0,
      segmentEndCartesian
    );
    let length3D = 0.0;

    index = 3;
    for (i = 1; i < positionsLength; i++) {
      segmentStartCartesian = Matrix3.Cartesian3.clone(
        segmentEndCartesian,
        segmentStartCartesian
      );
      segmentEndCartesian = Matrix3.Cartesian3.unpack(
        topPositionsArray,
        index,
        segmentEndCartesian
      );
      length3D += Matrix3.Cartesian3.distance(segmentStartCartesian, segmentEndCartesian);
      index += 3;
    }

    /*** Generate segments ***/
    let j;
    index = 3;
    let cartographicsIndex = 0;
    let vec2sWriteIndex = 0;
    let vec3sWriteIndex = 0;
    let vec4sWriteIndex = 0;
    let miterBroken = false;

    let endBottom = Matrix3.Cartesian3.unpack(
      bottomPositionsArray,
      0,
      segmentEndBottomScratch
    );
    let endTop = Matrix3.Cartesian3.unpack(topPositionsArray, 0, segmentEndTopScratch);
    let endGeometryNormal = Matrix3.Cartesian3.unpack(
      normalsArray,
      0,
      segmentEndNormalScratch
    );

    if (loop) {
      const preEndBottom = Matrix3.Cartesian3.unpack(
        bottomPositionsArray,
        bottomPositionsArray.length - 6,
        segmentStartBottomScratch
      );
      if (breakMiter(endGeometryNormal, preEndBottom, endBottom, endTop)) {
        // Miter broken as if for the last point in the loop, needs to be inverted for first point (clone of endBottom)
        endGeometryNormal = Matrix3.Cartesian3.negate(
          endGeometryNormal,
          endGeometryNormal
        );
      }
    }

    let lengthSoFar3D = 0.0;
    let lengthSoFar2D = 0.0;

    // For translating bounding volume
    let sumHeights = 0.0;

    for (i = 0; i < segmentCount; i++) {
      const startBottom = Matrix3.Cartesian3.clone(endBottom, segmentStartBottomScratch);
      const startTop = Matrix3.Cartesian3.clone(endTop, segmentStartTopScratch);
      let startGeometryNormal = Matrix3.Cartesian3.clone(
        endGeometryNormal,
        segmentStartNormalScratch
      );

      if (miterBroken) {
        startGeometryNormal = Matrix3.Cartesian3.negate(
          startGeometryNormal,
          startGeometryNormal
        );
      }

      endBottom = Matrix3.Cartesian3.unpack(
        bottomPositionsArray,
        index,
        segmentEndBottomScratch
      );
      endTop = Matrix3.Cartesian3.unpack(topPositionsArray, index, segmentEndTopScratch);
      endGeometryNormal = Matrix3.Cartesian3.unpack(
        normalsArray,
        index,
        segmentEndNormalScratch
      );

      miterBroken = breakMiter(endGeometryNormal, startBottom, endBottom, endTop);

      // 2D - don't clone anything from previous segment b/c possible IDL touch
      startCartographic.latitude = cartographicsArray[cartographicsIndex];
      startCartographic.longitude = cartographicsArray[cartographicsIndex + 1];
      endCartographic.latitude = cartographicsArray[cartographicsIndex + 2];
      endCartographic.longitude = cartographicsArray[cartographicsIndex + 3];
      let start2D;
      let end2D;
      let startGeometryNormal2D;
      let endGeometryNormal2D;

      if (compute2dAttributes) {
        const nudgeResult = nudgeCartographic(startCartographic, endCartographic);
        start2D = projection.project(startCartographic, segmentStart2DScratch);
        end2D = projection.project(endCartographic, segmentEnd2DScratch);
        const direction2D = direction(end2D, start2D, forwardOffset2DScratch);
        direction2D.y = Math.abs(direction2D.y);

        startGeometryNormal2D = segmentStartNormal2DScratch;
        endGeometryNormal2D = segmentEndNormal2DScratch;
        if (
          nudgeResult === 0 ||
          Matrix3.Cartesian3.dot(direction2D, Matrix3.Cartesian3.UNIT_Y) > MITER_BREAK_SMALL
        ) {
          // No nudge - project the original normal
          // Or, if the line's angle relative to the IDL is very acute,
          // in which case snapping will produce oddly shaped volumes.
          startGeometryNormal2D = projectNormal(
            projection,
            startCartographic,
            startGeometryNormal,
            start2D,
            segmentStartNormal2DScratch
          );
          endGeometryNormal2D = projectNormal(
            projection,
            endCartographic,
            endGeometryNormal,
            end2D,
            segmentEndNormal2DScratch
          );
        } else if (nudgeResult === 1) {
          // Start is close to IDL - snap start normal to align with IDL
          endGeometryNormal2D = projectNormal(
            projection,
            endCartographic,
            endGeometryNormal,
            end2D,
            segmentEndNormal2DScratch
          );
          startGeometryNormal2D.x = 0.0;
          // If start longitude is negative and end longitude is less negative, relative right is unit -Y
          // If start longitude is positive and end longitude is less positive, relative right is unit +Y
          startGeometryNormal2D.y = Math$1.CesiumMath.sign(
            startCartographic.longitude - Math.abs(endCartographic.longitude)
          );
          startGeometryNormal2D.z = 0.0;
        } else {
          // End is close to IDL - snap end normal to align with IDL
          startGeometryNormal2D = projectNormal(
            projection,
            startCartographic,
            startGeometryNormal,
            start2D,
            segmentStartNormal2DScratch
          );
          endGeometryNormal2D.x = 0.0;
          // If end longitude is negative and start longitude is less negative, relative right is unit Y
          // If end longitude is positive and start longitude is less positive, relative right is unit -Y
          endGeometryNormal2D.y = Math$1.CesiumMath.sign(
            startCartographic.longitude - endCartographic.longitude
          );
          endGeometryNormal2D.z = 0.0;
        }
      }

      /****************************************
       * Geometry descriptors of a "line on terrain,"
       * as opposed to the "shadow volume used to draw
       * the line on terrain":
       * - position of start + offset to end
       * - start, end, and right-facing planes
       * - encoded texture coordinate offsets
       ****************************************/

      /* 3D */
      const segmentLength3D = Matrix3.Cartesian3.distance(startTop, endTop);

      const encodedStart = EncodedCartesian3.EncodedCartesian3.fromCartesian(
        startBottom,
        encodeScratch
      );
      const forwardOffset = Matrix3.Cartesian3.subtract(
        endBottom,
        startBottom,
        offsetScratch
      );
      const forward = Matrix3.Cartesian3.normalize(forwardOffset, rightScratch);

      let startUp = Matrix3.Cartesian3.subtract(startTop, startBottom, startUpScratch);
      startUp = Matrix3.Cartesian3.normalize(startUp, startUp);
      let rightNormal = Matrix3.Cartesian3.cross(forward, startUp, rightScratch);
      rightNormal = Matrix3.Cartesian3.normalize(rightNormal, rightNormal);

      let startPlaneNormal = Matrix3.Cartesian3.cross(
        startUp,
        startGeometryNormal,
        startPlaneNormalScratch
      );
      startPlaneNormal = Matrix3.Cartesian3.normalize(startPlaneNormal, startPlaneNormal);

      let endUp = Matrix3.Cartesian3.subtract(endTop, endBottom, endUpScratch);
      endUp = Matrix3.Cartesian3.normalize(endUp, endUp);
      let endPlaneNormal = Matrix3.Cartesian3.cross(
        endGeometryNormal,
        endUp,
        endPlaneNormalScratch
      );
      endPlaneNormal = Matrix3.Cartesian3.normalize(endPlaneNormal, endPlaneNormal);

      const texcoordNormalization3DX = segmentLength3D / length3D;
      const texcoordNormalization3DY = lengthSoFar3D / length3D;

      /* 2D */
      let segmentLength2D = 0.0;
      let encodedStart2D;
      let forwardOffset2D;
      let right2D;
      let texcoordNormalization2DX = 0.0;
      let texcoordNormalization2DY = 0.0;
      if (compute2dAttributes) {
        segmentLength2D = Matrix3.Cartesian3.distance(start2D, end2D);

        encodedStart2D = EncodedCartesian3.EncodedCartesian3.fromCartesian(
          start2D,
          encodeScratch2D
        );
        forwardOffset2D = Matrix3.Cartesian3.subtract(
          end2D,
          start2D,
          forwardOffset2DScratch
        );

        // Right direction is just forward direction rotated by -90 degrees around Z
        // Similarly with plane normals
        right2D = Matrix3.Cartesian3.normalize(forwardOffset2D, right2DScratch);
        const swap = right2D.x;
        right2D.x = right2D.y;
        right2D.y = -swap;

        texcoordNormalization2DX = segmentLength2D / length2D;
        texcoordNormalization2DY = lengthSoFar2D / length2D;
      }
      /** Pack **/
      for (j = 0; j < 8; j++) {
        const vec4Index = vec4sWriteIndex + j * 4;
        const vec2Index = vec2sWriteIndex + j * 2;
        const wIndex = vec4Index + 3;

        // Encode sidedness of vertex relative to right plane in texture coordinate normalization X,
        // whether vertex is top or bottom of volume in sign/magnitude of normalization Y.
        const rightPlaneSide = j < 4 ? 1.0 : -1.0;
        const topBottomSide =
          j === 2 || j === 3 || j === 6 || j === 7 ? 1.0 : -1.0;

        // 3D
        Matrix3.Cartesian3.pack(encodedStart.high, startHiAndForwardOffsetX, vec4Index);
        startHiAndForwardOffsetX[wIndex] = forwardOffset.x;

        Matrix3.Cartesian3.pack(encodedStart.low, startLoAndForwardOffsetY, vec4Index);
        startLoAndForwardOffsetY[wIndex] = forwardOffset.y;

        Matrix3.Cartesian3.pack(
          startPlaneNormal,
          startNormalAndForwardOffsetZ,
          vec4Index
        );
        startNormalAndForwardOffsetZ[wIndex] = forwardOffset.z;

        Matrix3.Cartesian3.pack(
          endPlaneNormal,
          endNormalAndTextureCoordinateNormalizationX,
          vec4Index
        );
        endNormalAndTextureCoordinateNormalizationX[wIndex] =
          texcoordNormalization3DX * rightPlaneSide;

        Matrix3.Cartesian3.pack(
          rightNormal,
          rightNormalAndTextureCoordinateNormalizationY,
          vec4Index
        );

        let texcoordNormalization = texcoordNormalization3DY * topBottomSide;
        if (texcoordNormalization === 0.0 && topBottomSide < 0.0) {
          texcoordNormalization = 9.0; // some value greater than 1.0
        }
        rightNormalAndTextureCoordinateNormalizationY[
          wIndex
        ] = texcoordNormalization;

        // 2D
        if (compute2dAttributes) {
          startHiLo2D[vec4Index] = encodedStart2D.high.x;
          startHiLo2D[vec4Index + 1] = encodedStart2D.high.y;
          startHiLo2D[vec4Index + 2] = encodedStart2D.low.x;
          startHiLo2D[vec4Index + 3] = encodedStart2D.low.y;

          startEndNormals2D[vec4Index] = -startGeometryNormal2D.y;
          startEndNormals2D[vec4Index + 1] = startGeometryNormal2D.x;
          startEndNormals2D[vec4Index + 2] = endGeometryNormal2D.y;
          startEndNormals2D[vec4Index + 3] = -endGeometryNormal2D.x;

          offsetAndRight2D[vec4Index] = forwardOffset2D.x;
          offsetAndRight2D[vec4Index + 1] = forwardOffset2D.y;
          offsetAndRight2D[vec4Index + 2] = right2D.x;
          offsetAndRight2D[vec4Index + 3] = right2D.y;

          texcoordNormalization2D[vec2Index] =
            texcoordNormalization2DX * rightPlaneSide;

          texcoordNormalization = texcoordNormalization2DY * topBottomSide;
          if (texcoordNormalization === 0.0 && topBottomSide < 0.0) {
            texcoordNormalization = 9.0; // some value greater than 1.0
          }
          texcoordNormalization2D[vec2Index + 1] = texcoordNormalization;
        }
      }

      // Adjust height of volume in 3D
      const adjustHeightStartBottom = adjustHeightStartBottomScratch;
      const adjustHeightEndBottom = adjustHeightEndBottomScratch;
      const adjustHeightStartTop = adjustHeightStartTopScratch;
      const adjustHeightEndTop = adjustHeightEndTopScratch;

      const getHeightsRectangle = Matrix2.Rectangle.fromCartographicArray(
        getHeightCartographics,
        getHeightRectangleScratch
      );
      const minMaxHeights = ApproximateTerrainHeights$1.getMinimumMaximumHeights(
        getHeightsRectangle,
        ellipsoid
      );
      const minHeight = minMaxHeights.minimumTerrainHeight;
      const maxHeight = minMaxHeights.maximumTerrainHeight;

      sumHeights += minHeight;
      sumHeights += maxHeight;

      adjustHeights(
        startBottom,
        startTop,
        minHeight,
        maxHeight,
        adjustHeightStartBottom,
        adjustHeightStartTop
      );
      adjustHeights(
        endBottom,
        endTop,
        minHeight,
        maxHeight,
        adjustHeightEndBottom,
        adjustHeightEndTop
      );

      // Nudge the positions away from the "polyline" a little bit to prevent errors in GeometryPipeline
      let normalNudge = Matrix3.Cartesian3.multiplyByScalar(
        rightNormal,
        Math$1.CesiumMath.EPSILON5,
        normalNudgeScratch
      );
      Matrix3.Cartesian3.add(
        adjustHeightStartBottom,
        normalNudge,
        adjustHeightStartBottom
      );
      Matrix3.Cartesian3.add(adjustHeightEndBottom, normalNudge, adjustHeightEndBottom);
      Matrix3.Cartesian3.add(adjustHeightStartTop, normalNudge, adjustHeightStartTop);
      Matrix3.Cartesian3.add(adjustHeightEndTop, normalNudge, adjustHeightEndTop);

      // If the segment is very close to the XZ plane, nudge the vertices slightly to avoid touching it.
      nudgeXZ(adjustHeightStartBottom, adjustHeightEndBottom);
      nudgeXZ(adjustHeightStartTop, adjustHeightEndTop);

      Matrix3.Cartesian3.pack(adjustHeightStartBottom, positionsArray, vec3sWriteIndex);
      Matrix3.Cartesian3.pack(adjustHeightEndBottom, positionsArray, vec3sWriteIndex + 3);
      Matrix3.Cartesian3.pack(adjustHeightEndTop, positionsArray, vec3sWriteIndex + 6);
      Matrix3.Cartesian3.pack(adjustHeightStartTop, positionsArray, vec3sWriteIndex + 9);

      normalNudge = Matrix3.Cartesian3.multiplyByScalar(
        rightNormal,
        -2.0 * Math$1.CesiumMath.EPSILON5,
        normalNudgeScratch
      );
      Matrix3.Cartesian3.add(
        adjustHeightStartBottom,
        normalNudge,
        adjustHeightStartBottom
      );
      Matrix3.Cartesian3.add(adjustHeightEndBottom, normalNudge, adjustHeightEndBottom);
      Matrix3.Cartesian3.add(adjustHeightStartTop, normalNudge, adjustHeightStartTop);
      Matrix3.Cartesian3.add(adjustHeightEndTop, normalNudge, adjustHeightEndTop);

      nudgeXZ(adjustHeightStartBottom, adjustHeightEndBottom);
      nudgeXZ(adjustHeightStartTop, adjustHeightEndTop);

      Matrix3.Cartesian3.pack(
        adjustHeightStartBottom,
        positionsArray,
        vec3sWriteIndex + 12
      );
      Matrix3.Cartesian3.pack(
        adjustHeightEndBottom,
        positionsArray,
        vec3sWriteIndex + 15
      );
      Matrix3.Cartesian3.pack(adjustHeightEndTop, positionsArray, vec3sWriteIndex + 18);
      Matrix3.Cartesian3.pack(adjustHeightStartTop, positionsArray, vec3sWriteIndex + 21);

      cartographicsIndex += 2;
      index += 3;

      vec2sWriteIndex += 16;
      vec3sWriteIndex += 24;
      vec4sWriteIndex += 32;

      lengthSoFar3D += segmentLength3D;
      lengthSoFar2D += segmentLength2D;
    }

    index = 0;
    let indexOffset = 0;
    for (i = 0; i < segmentCount; i++) {
      for (j = 0; j < REFERENCE_INDICES_LENGTH; j++) {
        indices[index + j] = REFERENCE_INDICES[j] + indexOffset;
      }
      indexOffset += 8;
      index += REFERENCE_INDICES_LENGTH;
    }

    const boundingSpheres = scratchBoundingSpheres;
    Transforms.BoundingSphere.fromVertices(
      bottomPositionsArray,
      Matrix3.Cartesian3.ZERO,
      3,
      boundingSpheres[0]
    );
    Transforms.BoundingSphere.fromVertices(
      topPositionsArray,
      Matrix3.Cartesian3.ZERO,
      3,
      boundingSpheres[1]
    );
    const boundingSphere = Transforms.BoundingSphere.fromBoundingSpheres(boundingSpheres);

    // Adjust bounding sphere height and radius to cover more of the volume
    boundingSphere.radius += sumHeights / (segmentCount * 2.0);

    const attributes = {
      position: new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        normalize: false,
        values: positionsArray,
      }),
      startHiAndForwardOffsetX: getVec4GeometryAttribute(
        startHiAndForwardOffsetX
      ),
      startLoAndForwardOffsetY: getVec4GeometryAttribute(
        startLoAndForwardOffsetY
      ),
      startNormalAndForwardOffsetZ: getVec4GeometryAttribute(
        startNormalAndForwardOffsetZ
      ),
      endNormalAndTextureCoordinateNormalizationX: getVec4GeometryAttribute(
        endNormalAndTextureCoordinateNormalizationX
      ),
      rightNormalAndTextureCoordinateNormalizationY: getVec4GeometryAttribute(
        rightNormalAndTextureCoordinateNormalizationY
      ),
    };

    if (compute2dAttributes) {
      attributes.startHiLo2D = getVec4GeometryAttribute(startHiLo2D);
      attributes.offsetAndRight2D = getVec4GeometryAttribute(offsetAndRight2D);
      attributes.startEndNormals2D = getVec4GeometryAttribute(startEndNormals2D);
      attributes.texcoordNormalization2D = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        normalize: false,
        values: texcoordNormalization2D,
      });
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      boundingSphere: boundingSphere,
    });
  }

  function getVec4GeometryAttribute(typedArray) {
    return new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
      componentsPerAttribute: 4,
      normalize: false,
      values: typedArray,
    });
  }

  /**
   * Approximates an ellipsoid-tangent vector in 2D by projecting the end point into 2D.
   * Exposed for testing.
   *
   * @param {MapProjection} projection Map Projection for projecting coordinates to 2D.
   * @param {Cartographic} cartographic The cartographic origin point of the normal.
   *   Used to check if the normal crosses the IDL during projection.
   * @param {Cartesian3} normal The normal in 3D.
   * @param {Cartesian3} projectedPosition The projected origin point of the normal in 2D.
   * @param {Cartesian3} result Result parameter on which to store the projected normal.
   * @private
   */
  GroundPolylineGeometry._projectNormal = projectNormal;

  function createGroundPolylineGeometry(groundPolylineGeometry, offset) {
    return ApproximateTerrainHeights$1.initialize().then(function () {
      if (defaultValue.defined(offset)) {
        groundPolylineGeometry = GroundPolylineGeometry.unpack(
          groundPolylineGeometry,
          offset
        );
      }
      return GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
    });
  }

  return createGroundPolylineGeometry;

}));
