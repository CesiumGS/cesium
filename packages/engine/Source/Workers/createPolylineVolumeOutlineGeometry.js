import {
  Ellipsoid,
  PolylineVolumeOutlineGeometry,
  defined,
} from "@cesium/core";

function createPolylineVolumeOutlineGeometry(
  polylineVolumeOutlineGeometry,
  offset,
) {
  if (defined(offset)) {
    polylineVolumeOutlineGeometry = PolylineVolumeOutlineGeometry.unpack(
      polylineVolumeOutlineGeometry,
      offset,
    );
  }
  polylineVolumeOutlineGeometry._ellipsoid = Ellipsoid.clone(
    polylineVolumeOutlineGeometry._ellipsoid,
  );
  return PolylineVolumeOutlineGeometry.createGeometry(
    polylineVolumeOutlineGeometry,
  );
}
export default createPolylineVolumeOutlineGeometry;
