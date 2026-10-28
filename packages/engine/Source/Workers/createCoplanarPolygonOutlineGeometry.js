import {
  CoplanarPolygonOutlineGeometry,
  Ellipsoid,
  defined,
} from "@cesium/core";

function createCoplanarPolygonOutlineGeometry(polygonGeometry, offset) {
  if (defined(offset)) {
    polygonGeometry = CoplanarPolygonOutlineGeometry.unpack(
      polygonGeometry,
      offset,
    );
  }
  polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
  return CoplanarPolygonOutlineGeometry.createGeometry(polygonGeometry);
}
export default createCoplanarPolygonOutlineGeometry;
