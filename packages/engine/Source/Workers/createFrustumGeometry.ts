import defined from "../Core/defined.js";
import FrustumGeometry from "../Core/FrustumGeometry.js";

function createFrustumGeometry(frustumGeometry: any, offset: any) {
  if (defined(offset)) {
    frustumGeometry = FrustumGeometry.unpack(frustumGeometry, offset);
  }
  return FrustumGeometry.createGeometry(frustumGeometry);
}
export default createFrustumGeometry;
