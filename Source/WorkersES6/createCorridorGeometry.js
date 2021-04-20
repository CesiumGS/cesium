import CorridorGeometry from "../Core/CorridorGeometry.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";

function createCorridorGeometry(corridorGeometry, offset) {
  if (defined(offset)) {
    corridorGeometry = CorridorGeometry.unpack(corridorGeometry, offset);
  }
  corridorGeometry._ellipsoid = Ellipsoid.clone(corridorGeometry._ellipsoid);
  return CorridorGeometry.createGeometry(corridorGeometry);
}
export default createCorridorGeometry;
