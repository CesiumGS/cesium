import { PlaneOutlineGeometry, defined } from "@cesium/core";

function createPlaneOutlineGeometry(planeGeometry, offset) {
  if (defined(offset)) {
    planeGeometry = PlaneOutlineGeometry.unpack(planeGeometry, offset);
  }
  return PlaneOutlineGeometry.createGeometry(planeGeometry);
}
export default createPlaneOutlineGeometry;
