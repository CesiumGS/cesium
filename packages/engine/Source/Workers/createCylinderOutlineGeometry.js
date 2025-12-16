import { defined } from "@cesium/core-utils";
import CylinderOutlineGeometry from "../Core/CylinderOutlineGeometry.js";

function createCylinderOutlineGeometry(cylinderGeometry, offset) {
  if (defined(offset)) {
    cylinderGeometry = CylinderOutlineGeometry.unpack(cylinderGeometry, offset);
  }
  return CylinderOutlineGeometry.createGeometry(cylinderGeometry);
}
export default createCylinderOutlineGeometry;
