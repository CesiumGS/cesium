import { Cartesian3, EllipseGeometry, Ellipsoid, defined } from "@cesium/core";

function createEllipseGeometry(ellipseGeometry, offset) {
  if (defined(offset)) {
    ellipseGeometry = EllipseGeometry.unpack(ellipseGeometry, offset);
  }
  ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
  ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
  return EllipseGeometry.createGeometry(ellipseGeometry);
}
export default createEllipseGeometry;
