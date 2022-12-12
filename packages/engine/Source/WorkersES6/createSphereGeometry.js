import defined from "../Core/defined.js";
import SphereGeometry from "../Core/SphereGeometry.js";

function createSphereGeometry(sphereGeometry, offset) {
  if (defined(offset)) {
    sphereGeometry = SphereGeometry.unpack(sphereGeometry, offset);
  }
  return SphereGeometry.createGeometry(sphereGeometry);
}
export default createSphereGeometry;
