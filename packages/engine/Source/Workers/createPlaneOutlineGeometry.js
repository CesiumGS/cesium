import defined from "../Core/defined.js";
import PlaneOutlineGeometry from "../Core/PlaneOutlineGeometry.js";

function createPlaneOutlineGeometry(planeGeometry, offset) {
  if (defined(offset)) {
    planeGeometry = PlaneOutlineGeometry.unpack(planeGeometry, offset);
  }
  return PlaneOutlineGeometry.createGeometry(planeGeometry);
}
export default createPlaneOutlineGeometry;
