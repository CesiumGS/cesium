import { defined } from "@cesium/core-utils";
import CylinderGeometry from "../Core/CylinderGeometry.js";

function createCylinderGeometry(cylinderGeometry, offset) {
  if (defined(offset)) {
    cylinderGeometry = CylinderGeometry.unpack(cylinderGeometry, offset);
  }
  return CylinderGeometry.createGeometry(cylinderGeometry);
}
export default createCylinderGeometry;
