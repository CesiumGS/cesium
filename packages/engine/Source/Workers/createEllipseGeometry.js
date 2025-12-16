import { Cartesian3 } from "@cesium/core-math";
import defined from "../Core/defined.js";
import EllipseGeometry from "../Core/EllipseGeometry.js";
import Ellipsoid from "../Core/Ellipsoid.js";

function createEllipseGeometry(ellipseGeometry, offset) {
  if (defined(offset)) {
    ellipseGeometry = EllipseGeometry.unpack(ellipseGeometry, offset);
  }
  ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
  ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
  return EllipseGeometry.createGeometry(ellipseGeometry);
}
export default createEllipseGeometry;
