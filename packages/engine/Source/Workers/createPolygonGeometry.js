import { defined } from "@cesium/utils";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolygonGeometry from "../Core/PolygonGeometry.js";

function createPolygonGeometry(polygonGeometry, offset) {
  if (defined(offset)) {
    polygonGeometry = PolygonGeometry.unpack(polygonGeometry, offset);
  }
  polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
  return PolygonGeometry.createGeometry(polygonGeometry);
}
export default createPolygonGeometry;
