import { defined } from "@cesium/utils";
import EllipsoidOutlineGeometry from "../Core/EllipsoidOutlineGeometry.js";

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
