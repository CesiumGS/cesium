import { Cartesian3, CircleGeometry, Ellipsoid, defined } from "@cesium/core";

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
