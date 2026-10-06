import { EllipsoidGeometry, defined } from "@cesium/core";

function createEllipsoidGeometry(ellipsoidGeometry, offset) {
  if (defined(offset)) {
    ellipsoidGeometry = EllipsoidGeometry.unpack(ellipsoidGeometry, offset);
  }
  return EllipsoidGeometry.createGeometry(ellipsoidGeometry);
}
export default createEllipsoidGeometry;
