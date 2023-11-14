import defined from "../Core/defined.js";
import PlaneGeometry from "../Core/PlaneGeometry.js";

function createPlaneGeometry(planeGeometry, offset) {
  if (defined(offset)) {
    planeGeometry = PlaneGeometry.unpack(planeGeometry, offset);
  }
  return PlaneGeometry.createGeometry(planeGeometry);
}
export default createPlaneGeometry;
