import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolygonOutlineGeometry from "../Core/PolygonOutlineGeometry.js";

function createPolygonOutlineGeometry(polygonGeometry, offset) {
  if (defined(offset)) {
    polygonGeometry = PolygonOutlineGeometry.unpack(polygonGeometry, offset);
  }
  polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
  return PolygonOutlineGeometry.createGeometry(polygonGeometry);
}
export default createPolygonOutlineGeometry;
