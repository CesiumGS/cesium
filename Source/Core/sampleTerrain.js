import when from "../ThirdParty/when.js";
import Check from "./Check.js";

/**
 * Initiates a terrain height query for an array of {@link Cartographic} positions by
 * requesting tiles from a terrain provider, sampling, and interpolating.  The interpolation
 * matches the triangles used to render the terrain at the specified level.  The query
 * happens asynchronously, so this function returns a promise that is resolved when
 * the query completes.  Each point height is modified in place.  If a height can not be
 * determined because no terrain data is available for the specified level at that location,
 * or another error occurs, the height is set to undefined.  As is typical of the
 * {@link Cartographic} type, the supplied height is a height above the reference ellipsoid
 * (such as {@link Ellipsoid.WGS84}) rather than an altitude above mean sea level.  In other
 * words, it will not necessarily be 0.0 if sampled in the ocean. This function needs the
 * terrain level of detail as input, if you need to get the altitude of the terrain as precisely
 * as possible (i.e. with maximum level of detail) use {@link sampleTerrainMostDetailed}.
 *
 * @function sampleTerrain
 *
 * @param {TerrainProvider} terrainProvider The terrain provider from which to query heights.
 * @param {Number} level The terrain level-of-detail from which to query terrain heights.
 * @param {Cartographic[]} positions The positions to update with terrain heights.
 * @returns {Promise.<Cartographic[]>} A promise that resolves to the provided list of positions when terrain the query has completed.
 *
 * @see sampleTerrainMostDetailed
 *
 * @example
 * // Query the terrain height of two Cartographic positions
 * var terrainProvider = Cesium.createWorldTerrain();
 * var positions = [
 *     Cesium.Cartographic.fromDegrees(86.925145, 27.988257),
 *     Cesium.Cartographic.fromDegrees(87.0, 28.0)
 * ];
 * var promise = Cesium.sampleTerrain(terrainProvider, 11, positions);
 * Cesium.when(promise, function(updatedPositions) {
 *     // positions[0].height and positions[1].height have been updated.
 *     // updatedPositions is just a reference to positions.
 * });
 */
function sampleTerrain(terrainProvider, level, positions) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("terrainProvider", terrainProvider);
  Check.typeOf.number("level", level);
  Check.defined("positions", positions);
  //>>includeEnd('debug');

  return terrainProvider.readyPromise.then(function () {
    return doSampling(terrainProvider, level, positions);
  });
}

function doSampling(terrainProvider, level, positions) {
  const tilingScheme = terrainProvider.tilingScheme;

  let i;

  // Sort points into a set of tiles
  const tileRequests = []; // Result will be an Array as it's easier to work with
  const tileRequestSet = {}; // A unique set
  for (i = 0; i < positions.length; ++i) {
    const xy = tilingScheme.positionToTileXY(positions[i], level);
    const key = xy.toString();

    if (!tileRequestSet.hasOwnProperty(key)) {
      // When tile is requested for the first time
      const value = {
        x: xy.x,
        y: xy.y,
        level: level,
        tilingScheme: tilingScheme,
        terrainProvider: terrainProvider,
        positions: [],
      };
      tileRequestSet[key] = value;
      tileRequests.push(value);
    }

    // Now append to array of points for the tile
    tileRequestSet[key].positions.push(positions[i]);
  }

  // Send request for each required tile
  const tilePromises = [];
  for (i = 0; i < tileRequests.length; ++i) {
    const tileRequest = tileRequests[i];
    const requestPromise = tileRequest.terrainProvider.requestTileGeometry(
      tileRequest.x,
      tileRequest.y,
      tileRequest.level
    );
    const tilePromise = requestPromise
      .then(createInterpolateFunction(tileRequest))
      .otherwise(createMarkFailedFunction(tileRequest));
    tilePromises.push(tilePromise);
  }

  return when.all(tilePromises, function () {
    return positions;
  });
}

/**
 * Calls {@link TerrainData#interpolateHeight} on a given {@link TerrainData} for a given {@link Cartographic} and
 *  will assign the height property if the return value is not undefined.
 *
 * If the return value is false; it's suggesting that you should call {@link TerrainData#createMesh} first.
 * @param {Cartographic} position The position to interpolate for and assign the height value to
 * @param {TerrainData} terrainData
 * @param {Rectangle} rectangle
 * @returns {Boolean} If the height was actually interpolated and assigned
 * @private
 */
function interpolateAndAssignHeight(position, terrainData, rectangle) {
  const height = terrainData.interpolateHeight(
    rectangle,
    position.longitude,
    position.latitude
  );
  if (height === undefined) {
    // if height comes back as undefined, it may implicitly mean the terrain data
    //  requires us to call TerrainData.createMesh() first (ArcGIS requires this in particular)
    //  so we'll return false and do that next!
    return false;
  }
  position.height = height;
  return true;
}

function createInterpolateFunction(tileRequest) {
  const tilePositions = tileRequest.positions;
  const rectangle = tileRequest.tilingScheme.tileXYToRectangle(
    tileRequest.x,
    tileRequest.y,
    tileRequest.level
  );
  return function (terrainData) {
    let isMeshRequired = false;
    for (let i = 0; i < tilePositions.length; ++i) {
      const position = tilePositions[i];
      const isHeightAssigned = interpolateAndAssignHeight(
        position,
        terrainData,
        rectangle
      );
      // we've found a position which returned undefined - hinting to us
      //  that we probably need to create a mesh for this terrain data.
      // so break out of this loop and create the mesh - then we'll interpolate all the heights again
      if (!isHeightAssigned) {
        isMeshRequired = true;
        break;
      }
    }

    if (!isMeshRequired) {
      // all position heights were interpolated - we don't need the mesh
      return when.resolve();
    }

    // create the mesh - and interpolate all the positions again
    // note: terrain exaggeration is not passed in - we are only interested in the raw data
    return terrainData
      .createMesh({
        tilingScheme: tileRequest.tilingScheme,
        x: tileRequest.x,
        y: tileRequest.y,
        level: tileRequest.level,
        // don't throttle this mesh creation because we've asked to sample these points;
        //  so sample them! We don't care how many tiles that is!
        throttle: false,
      })
      .then(function () {
        // mesh has been created - so go through every position (maybe again)
        //  and re-interpolate the heights - presumably using the mesh this time
        for (let i = 0; i < tilePositions.length; ++i) {
          const position = tilePositions[i];
          // if it doesn't work this time - that's fine, we tried.
          interpolateAndAssignHeight(position, terrainData, rectangle);
        }
      });
  };
}

function createMarkFailedFunction(tileRequest) {
  const tilePositions = tileRequest.positions;
  return function () {
    for (let i = 0; i < tilePositions.length; ++i) {
      const position = tilePositions[i];
      position.height = undefined;
    }
  };
}
export default sampleTerrain;
