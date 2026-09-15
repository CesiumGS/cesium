import { Ellipsoid, PolygonOutlineGeometry, defined } from "@cesium/core";

function createPolygonOutlineGeometry(polygonGeometry, offset) {
  if (defined(offset)) {
    polygonGeometry = PolygonOutlineGeometry.unpack(polygonGeometry, offset);
  }
  polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
  return PolygonOutlineGeometry.createGeometry(polygonGeometry);
}
export default createPolygonOutlineGeometry;
