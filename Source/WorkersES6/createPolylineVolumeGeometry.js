import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolylineVolumeGeometry from "../Core/PolylineVolumeGeometry.js";

function createPolylineVolumeGeometry(polylineVolumeGeometry, offset) {
  if (defined(offset)) {
    polylineVolumeGeometry = PolylineVolumeGeometry.unpack(
      polylineVolumeGeometry,
      offset
    );
  }
  polylineVolumeGeometry._ellipsoid = Ellipsoid.clone(
    polylineVolumeGeometry._ellipsoid
  );
  return PolylineVolumeGeometry.createGeometry(polylineVolumeGeometry);
}
export default createPolylineVolumeGeometry;
