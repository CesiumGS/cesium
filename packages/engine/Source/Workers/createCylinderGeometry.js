import { CylinderGeometry, defined } from "@cesium/core";

function createCylinderGeometry(cylinderGeometry, offset) {
  if (defined(offset)) {
    cylinderGeometry = CylinderGeometry.unpack(cylinderGeometry, offset);
  }
  return CylinderGeometry.createGeometry(cylinderGeometry);
}
export default createCylinderGeometry;
