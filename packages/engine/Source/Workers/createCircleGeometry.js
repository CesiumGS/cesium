import { defined } from "@cesium/core-utils";
import { Cartesian3 } from "@cesium/core-math";
import CircleGeometry from "../Core/CircleGeometry.js";
import Ellipsoid from "../Core/Ellipsoid.js";

function createCircleGeometry(circleGeometry, offset) {
  if (defined(offset)) {
    circleGeometry = CircleGeometry.unpack(circleGeometry, offset);
  }
  circleGeometry._ellipseGeometry._center = Cartesian3.clone(
    circleGeometry._ellipseGeometry._center,
  );
  circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(
    circleGeometry._ellipseGeometry._ellipsoid,
  );
  return CircleGeometry.createGeometry(circleGeometry);
}
export default createCircleGeometry;
