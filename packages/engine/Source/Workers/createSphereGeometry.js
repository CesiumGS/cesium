import { SphereGeometry, defined } from "@cesium/core";

function createSphereGeometry(sphereGeometry, offset) {
  if (defined(offset)) {
    sphereGeometry = SphereGeometry.unpack(sphereGeometry, offset);
  }
  return SphereGeometry.createGeometry(sphereGeometry);
}
export default createSphereGeometry;
