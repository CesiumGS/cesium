import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolylineGeometry from "../Core/PolylineGeometry.js";

function createPolylineGeometry(polylineGeometry, offset) {
  if (defined(offset)) {
    polylineGeometry = PolylineGeometry.unpack(polylineGeometry, offset);
  }
  polylineGeometry._ellipsoid = Ellipsoid.clone(polylineGeometry._ellipsoid);
  return PolylineGeometry.createGeometry(polylineGeometry);
}
export default createPolylineGeometry;
