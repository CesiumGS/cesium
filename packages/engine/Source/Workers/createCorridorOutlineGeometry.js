import CorridorOutlineGeometry from "../Core/CorridorOutlineGeometry.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";

function createCorridorOutlineGeometry(corridorOutlineGeometry, offset) {
  if (defined(offset)) {
    corridorOutlineGeometry = CorridorOutlineGeometry.unpack(
      corridorOutlineGeometry,
      offset
    );
  }
  corridorOutlineGeometry._ellipsoid = Ellipsoid.clone(
    corridorOutlineGeometry._ellipsoid
  );
  return CorridorOutlineGeometry.createGeometry(corridorOutlineGeometry);
}
export default createCorridorOutlineGeometry;
