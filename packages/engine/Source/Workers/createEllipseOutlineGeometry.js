import { defined } from "@cesium/core-utils";
import { Cartesian3 } from "@cesium/core-math";
import EllipseOutlineGeometry from "../Core/EllipseOutlineGeometry.js";
import Ellipsoid from "../Core/Ellipsoid.js";

function createEllipseOutlineGeometry(ellipseGeometry, offset) {
  if (defined(offset)) {
    ellipseGeometry = EllipseOutlineGeometry.unpack(ellipseGeometry, offset);
  }
  ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
  ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
  return EllipseOutlineGeometry.createGeometry(ellipseGeometry);
}
export default createEllipseOutlineGeometry;
