import defined from "../Core/defined.js";
import EllipsoidOutlineGeometry from "../Core/EllipsoidOutlineGeometry.js";

function createEllipsoidOutlineGeometry(ellipsoidGeometry: any, offset: any) {
  if (defined(ellipsoidGeometry.buffer, offset)) {
    ellipsoidGeometry = EllipsoidOutlineGeometry.unpack(
      ellipsoidGeometry,
      offset,
    );
  }
  return EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
}
export default createEllipsoidOutlineGeometry;
