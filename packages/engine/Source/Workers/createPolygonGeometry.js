import { Ellipsoid, PolygonGeometry, defined } from "@cesium/core";

function createPolygonGeometry(polygonGeometry, offset) {
  if (defined(offset)) {
    polygonGeometry = PolygonGeometry.unpack(polygonGeometry, offset);
  }
  polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
  return PolygonGeometry.createGeometry(polygonGeometry);
}
export default createPolygonGeometry;
