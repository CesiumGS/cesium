import defined from "../Core/defined.js";
import Rectangle from "../Core/Rectangle.js";
import sampleTerrainMostDetailed from "../Core/sampleTerrainMostDetailed.js";
import SceneMode from "./SceneMode.js";

/**
 * Computes the final camera location to view a rectangle adjusted for the current terrain.
 * If the terrain does not support availability, the height above the ellipsoid is used.
 *
 * @param {Rectangle} rectangle The rectangle being zoomed to.
 * @param {Scene} scene The scene being used.
 *
 * @returns {Promise<Cartographic>} The optimal location to place the camera so that the entire rectangle is in view.
 *
 * @private
 */
async function computeFlyToLocationForRectangle(rectangle, scene) {
  const terrainProvider = scene.terrainProvider;
  const mapProjection = scene.mapProjection;
  const ellipsoid = mapProjection.ellipsoid;

  let positionWithoutTerrain;
  const tmp = scene.camera.getRectangleCameraCoordinates(rectangle);
  if (scene.mode === SceneMode.SCENE3D) {
    positionWithoutTerrain = ellipsoid.cartesianToCartographic(tmp);
  } else {
    positionWithoutTerrain = mapProjection.unproject(tmp);
  }

  if (!defined(terrainProvider)) {
    return positionWithoutTerrain;
  }

  const availability = terrainProvider.availability;

  if (!defined(availability) || scene.mode === SceneMode.SCENE2D) {
    return positionWithoutTerrain;
  }

  const cartographics = [
    Rectangle.center(rectangle),
    Rectangle.southeast(rectangle),
    Rectangle.southwest(rectangle),
    Rectangle.northeast(rectangle),
    Rectangle.northwest(rectangle),
  ];

  const positionsOnTerrain = await computeFlyToLocationForRectangle._sampleTerrainMostDetailed(
    terrainProvider,
    cartographics
  );

  let heightFound = false;
  const maxHeight = positionsOnTerrain.reduce(function (currentMax, item) {
    if (!defined(item.height)) {
      return currentMax;
    }
    heightFound = true;
    return Math.max(item.height, currentMax);
  }, -Number.MAX_VALUE);

  const finalPosition = positionWithoutTerrain;
  if (heightFound) {
    finalPosition.height += maxHeight;
  }

  return finalPosition;
}

//Exposed for testing.
computeFlyToLocationForRectangle._sampleTerrainMostDetailed = sampleTerrainMostDetailed;
export default computeFlyToLocationForRectangle;
