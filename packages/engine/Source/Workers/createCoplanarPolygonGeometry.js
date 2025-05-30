import { defined } from "@cesium/utils";
import CoplanarPolygonGeometry from "../Core/CoplanarPolygonGeometry.js";

function createCoplanarPolygonGeometry(polygonGeometry, offset) {
  if (defined(offset)) {
    polygonGeometry = CoplanarPolygonGeometry.unpack(polygonGeometry, offset);
  }
  return CoplanarPolygonGeometry.createGeometry(polygonGeometry);
}
export default createCoplanarPolygonGeometry;
