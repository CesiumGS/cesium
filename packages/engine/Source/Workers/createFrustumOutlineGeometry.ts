import defined from "../Core/defined.js";
import FrustumOutlineGeometry from "../Core/FrustumOutlineGeometry.js";

function createFrustumOutlineGeometry(frustumGeometry: any, offset: any) {
  if (defined(offset)) {
    frustumGeometry = FrustumOutlineGeometry.unpack(frustumGeometry, offset);
  }
  return FrustumOutlineGeometry.createGeometry(frustumGeometry);
}
export default createFrustumOutlineGeometry;
