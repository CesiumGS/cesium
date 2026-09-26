import { CoplanarPolygonGeometry, defined } from "@cesium/core";

function createCoplanarPolygonGeometry(polygonGeometry, offset) {
  if (defined(offset)) {
    polygonGeometry = CoplanarPolygonGeometry.unpack(polygonGeometry, offset);
  }
  return CoplanarPolygonGeometry.createGeometry(polygonGeometry);
}
export default createCoplanarPolygonGeometry;
