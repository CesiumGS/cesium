function createProjectionFunctions(callback) {
  function project(cartographic, result) {
    result.x = cartographic.longitude * 6378137.0;
    result.y = cartographic.latitude * 6378137.0;
    result.z = cartographic.height;
  }

  callback(project);
}
