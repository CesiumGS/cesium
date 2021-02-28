function createProjectionFunctions(callback) {
  function unproject(cartesian, result) {
    result.longitude = cartesian.x / 6378137.0;
    result.latitude = cartesian.y / 6378137.0;
    result.height = cartesian.z;
  }
  callback(undefined, unproject);
}
