/**
 * JavaScript code for a user-defined map projection. See <code>CustomProjection</code> for details.
 */

function createProjectionFunctions(callback) {
  function project(cartographic, result) {
    result.x = cartographic.longitude * 6378137.0;
    result.y = cartographic.latitude * 2.0 * 6378137.0;
    result.z =
      cartographic.height +
      Math.abs(cartographic.longitude * cartographic.longitude * 1000000.0);
  }
  function unproject(cartesian, result) {
    result.longitude = cartesian.x / 6378137.0;
    result.latitude = cartesian.y / (2.0 * 6378137.0);
    result.height =
      cartesian.z - Math.abs(result.longitude * result.longitude * 1000000.0);
  }
  callback(project, unproject);
}
