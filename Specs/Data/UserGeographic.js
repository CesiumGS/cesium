function createProjectionFunctions(callback) {
  function project(cartographic, result) {
    result.x = cartographic.longitude * 6378137.0;
    result.y = cartographic.latitude * 6378137.0;
    result.z = cartographic.height;
  }

  function unproject(cartesian, result) {
    result.longitude = cartesian.x / 6378137.0;
    result.latitude = cartesian.y / 6378137.0;
    result.height = cartesian.z;
  }
  callback(project, unproject);
}
