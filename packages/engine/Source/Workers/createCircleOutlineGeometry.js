import { defined } from "@cesium/core-utils";
import { Cartesian3 } from "@cesium/core-math";
import CircleOutlineGeometry from "../Core/CircleOutlineGeometry.js";
import Ellipsoid from "../Core/Ellipsoid.js";

function createCircleOutlineGeometry(circleGeometry, offset) {
  if (defined(offset)) {
    circleGeometry = CircleOutlineGeometry.unpack(circleGeometry, offset);
  }
  circleGeometry._ellipseGeometry._center = Cartesian3.clone(
    circleGeometry._ellipseGeometry._center,
  );
  circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(
    circleGeometry._ellipseGeometry._ellipsoid,
  );
  return CircleOutlineGeometry.createGeometry(circleGeometry);
}
export default createCircleOutlineGeometry;
