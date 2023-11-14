import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import WallGeometry from "../Core/WallGeometry.js";

function createWallGeometry(wallGeometry, offset) {
  if (defined(offset)) {
    wallGeometry = WallGeometry.unpack(wallGeometry, offset);
  }
  wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
  return WallGeometry.createGeometry(wallGeometry);
}
export default createWallGeometry;
