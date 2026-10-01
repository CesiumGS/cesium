import {
  Cartesian3,
  CircleOutlineGeometry,
  Ellipsoid,
  defined,
} from "@cesium/core";

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
