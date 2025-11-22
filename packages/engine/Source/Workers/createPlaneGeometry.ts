import defined from "../Core/defined.js";
import PlaneGeometry from "../Core/PlaneGeometry.js";

function createPlaneGeometry(planeGeometry: any, offset: any) {
  if (defined(offset)) {
    planeGeometry = PlaneGeometry.unpack(planeGeometry, offset);
  }
  return PlaneGeometry.createGeometry(planeGeometry);
}
export default createPlaneGeometry;
