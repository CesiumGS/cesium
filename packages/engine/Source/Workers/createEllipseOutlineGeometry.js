import {
  Cartesian3,
  EllipseOutlineGeometry,
  Ellipsoid,
  defined,
} from "@cesium/core";

function createEllipseOutlineGeometry(ellipseGeometry, offset) {
  if (defined(offset)) {
    ellipseGeometry = EllipseOutlineGeometry.unpack(ellipseGeometry, offset);
  }
  ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
  ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
  return EllipseOutlineGeometry.createGeometry(ellipseGeometry);
}
export default createEllipseOutlineGeometry;
