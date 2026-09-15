import { CorridorGeometry, Ellipsoid, defined } from "@cesium/core";

function createCorridorGeometry(corridorGeometry, offset) {
  if (defined(offset)) {
    corridorGeometry = CorridorGeometry.unpack(corridorGeometry, offset);
  }
  corridorGeometry._ellipsoid = Ellipsoid.clone(corridorGeometry._ellipsoid);
  return CorridorGeometry.createGeometry(corridorGeometry);
}
export default createCorridorGeometry;
