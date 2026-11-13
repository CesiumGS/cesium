import { PlaneGeometry, defined } from "@cesium/core";

function createPlaneGeometry(planeGeometry, offset) {
  if (defined(offset)) {
    planeGeometry = PlaneGeometry.unpack(planeGeometry, offset);
  }
  return PlaneGeometry.createGeometry(planeGeometry);
}
export default createPlaneGeometry;
