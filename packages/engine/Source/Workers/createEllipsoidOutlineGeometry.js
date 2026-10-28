import { EllipsoidOutlineGeometry, defined } from "@cesium/core";

function createEllipsoidOutlineGeometry(ellipsoidGeometry, offset) {
  if (defined(ellipsoidGeometry.buffer, offset)) {
    ellipsoidGeometry = EllipsoidOutlineGeometry.unpack(
      ellipsoidGeometry,
      offset,
    );
  }
  return EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
}
export default createEllipsoidOutlineGeometry;
