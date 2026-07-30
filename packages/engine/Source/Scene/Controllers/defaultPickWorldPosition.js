import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import IntersectionTests from "../../Core/IntersectionTests.js";
import Plane from "../../Core/Plane.js";
import Ray from "../../Core/Ray.js";

const scratchSurfaceCartesian = new Cartesian3();
const scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0);
const scratchRay = new Ray();
const defaultTargetPixelSize = new Cartesian2(1.0, 1.0, 1.0);

/**
 * Picks a cartesian worldspace position based on the specified window coordinates and the camera's current position and orientation.
 * <ol>
 * <li>If the camera is above the scene's defined ellipsoid, the position is picked on the ellipsoid.</li>
 * <li> If the camera is below the ellipsoid, a temporary plane is created relative to the camera's position and orientation, and the position is picked on that plane.</li>
 * </ol>
 * @param {Scene} scene The scene to pick the world position from.
 * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
 * @param {Cartesian3} result The object onto which to store the result.
 * @param {Cartesian2} targetPixelSize The pixel size at the target position, used to preserve relative camera distance from the target position when navigating.
 * @returns {Cartesian3|undefined} The picked cartesian worldspace position, or <code>undefined</code> if no position could be picked.
 * @see {@link ScreenSpaceMapCameraController#pickWorldPosition}
 * @see {@link ScreenSpaceElevatorCameraController#pickWorldPosition}
 * @see {@link ScreenSpaceTiltOrbitCameraController#pickWorldPosition}
 * @see {@link ScreenSpaceZoomCameraController#pickWorldPosition}
 */
export default function (
  scene,
  windowPosition,
  result,
  targetPixelSize = defaultTargetPixelSize,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("scene", scene);
  Check.typeOf.object("windowPosition", windowPosition);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const { camera, ellipsoid } = scene;
  const surface = ellipsoid.scaleToGeodeticSurface(
    camera.positionWC,
    scratchSurfaceCartesian,
  );

  // Camera is at the origin
  if (!defined(surface)) {
    return undefined;
  }

  const cameraMagnitude = Cartesian3.magnitude(camera.positionWC);
  const surfaceMagnitude = Cartesian3.magnitude(surface);
  const belowEllipsoid = cameraMagnitude <= surfaceMagnitude;

  const normal = ellipsoid.geodeticSurfaceNormal(
    camera.positionWC,
    scratchSurfaceCartesian,
  );
  const dot = Cartesian3.dot(normal, camera.directionWC);
  const lookingUp = dot > 0.0;

  if (belowEllipsoid || lookingUp) {
    // Camera is inside the ellipsoid. When underground, create a temporary plane beneath the ellipsoid surface to avoid picking a position on the inside and opposite side of the ellipsoid.

    const plane = Plane.fromPointNormal(
      camera.positionWC,
      normal,
      scratchPlane,
    );

    const { clientHeight } = scene.canvas;
    const focusDistance =
      (targetPixelSize.y * clientHeight) /
      (2.0 * Math.tan(camera.frustum.fovy * 0.5));

    plane.distance -= dot * focusDistance;
    const ray = camera.getPickRay(windowPosition, scratchRay);
    return IntersectionTests.rayPlane(ray, plane, result);
  }

  return camera.pickEllipsoid(windowPosition, ellipsoid, result);
}
