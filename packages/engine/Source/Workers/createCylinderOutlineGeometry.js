import { CylinderOutlineGeometry, defined } from "@cesium/core";

function createCylinderOutlineGeometry(cylinderGeometry, offset) {
  if (defined(offset)) {
    cylinderGeometry = CylinderOutlineGeometry.unpack(cylinderGeometry, offset);
  }
  return CylinderOutlineGeometry.createGeometry(cylinderGeometry);
}
export default createCylinderOutlineGeometry;
