import { Ellipsoid, PolylineGeometry, defined } from "@cesium/core";

function createPolylineGeometry(polylineGeometry, offset) {
  if (defined(offset)) {
    polylineGeometry = PolylineGeometry.unpack(polylineGeometry, offset);
  }
  polylineGeometry._ellipsoid = Ellipsoid.clone(polylineGeometry._ellipsoid);
  return PolylineGeometry.createGeometry(polylineGeometry);
}
export default createPolylineGeometry;
