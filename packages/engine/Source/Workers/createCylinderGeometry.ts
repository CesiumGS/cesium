import CylinderGeometry from "../Core/CylinderGeometry.js";
import defined from "../Core/defined.js";

function createCylinderGeometry(cylinderGeometry: any, offset: any) {
  if (defined(offset)) {
    cylinderGeometry = CylinderGeometry.unpack(cylinderGeometry, offset);
  }
  return CylinderGeometry.createGeometry(cylinderGeometry);
}
export default createCylinderGeometry;
