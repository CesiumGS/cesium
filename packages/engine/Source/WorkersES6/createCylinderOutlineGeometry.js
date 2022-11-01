import CylinderOutlineGeometry from "../Core/CylinderOutlineGeometry.js";
import defined from "../Core/defined.js";

function createCylinderOutlineGeometry(cylinderGeometry, offset) {
  if (defined(offset)) {
    cylinderGeometry = CylinderOutlineGeometry.unpack(cylinderGeometry, offset);
  }
  return CylinderOutlineGeometry.createGeometry(cylinderGeometry);
}
export default createCylinderOutlineGeometry;
