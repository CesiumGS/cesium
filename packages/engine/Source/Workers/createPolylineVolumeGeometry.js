import { Ellipsoid, PolylineVolumeGeometry, defined } from "@cesium/core";

function createPolylineVolumeGeometry(polylineVolumeGeometry, offset) {
  if (defined(offset)) {
    polylineVolumeGeometry = PolylineVolumeGeometry.unpack(
      polylineVolumeGeometry,
      offset,
    );
  }
  polylineVolumeGeometry._ellipsoid = Ellipsoid.clone(
    polylineVolumeGeometry._ellipsoid,
  );
  return PolylineVolumeGeometry.createGeometry(polylineVolumeGeometry);
}
export default createPolylineVolumeGeometry;
