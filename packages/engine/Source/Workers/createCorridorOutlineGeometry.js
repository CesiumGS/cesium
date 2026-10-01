import { CorridorOutlineGeometry, Ellipsoid, defined } from "@cesium/core";

function createCorridorOutlineGeometry(corridorOutlineGeometry, offset) {
  if (defined(offset)) {
    corridorOutlineGeometry = CorridorOutlineGeometry.unpack(
      corridorOutlineGeometry,
      offset,
    );
  }
  corridorOutlineGeometry._ellipsoid = Ellipsoid.clone(
    corridorOutlineGeometry._ellipsoid,
  );
  return CorridorOutlineGeometry.createGeometry(corridorOutlineGeometry);
}
export default createCorridorOutlineGeometry;
