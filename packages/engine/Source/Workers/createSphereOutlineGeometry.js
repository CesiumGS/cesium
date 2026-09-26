import { SphereOutlineGeometry, defined } from "@cesium/core";

function createSphereOutlineGeometry(sphereGeometry, offset) {
  if (defined(offset)) {
    sphereGeometry = SphereOutlineGeometry.unpack(sphereGeometry, offset);
  }
  return SphereOutlineGeometry.createGeometry(sphereGeometry);
}
export default createSphereOutlineGeometry;
