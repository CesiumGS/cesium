import { defined } from "@cesium/core-utils";
import FrustumGeometry from "../Core/FrustumGeometry.js";

function createFrustumGeometry(frustumGeometry, offset) {
  if (defined(offset)) {
    frustumGeometry = FrustumGeometry.unpack(frustumGeometry, offset);
  }
  return FrustumGeometry.createGeometry(frustumGeometry);
}
export default createFrustumGeometry;
