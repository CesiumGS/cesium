import defined from "../Core/defined.js";
import FrustumOutlineGeometry from "../Core/FrustumOutlineGeometry.js";

function createFrustumOutlineGeometry(frustumGeometry, offset) {
  if (defined(offset)) {
    frustumGeometry = FrustumOutlineGeometry.unpack(frustumGeometry, offset);
  }
  return FrustumOutlineGeometry.createGeometry(frustumGeometry);
}
export default createFrustumOutlineGeometry;
