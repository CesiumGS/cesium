import { Ellipsoid, WallGeometry, defined } from "@cesium/core";

function createWallGeometry(wallGeometry, offset) {
  if (defined(offset)) {
    wallGeometry = WallGeometry.unpack(wallGeometry, offset);
  }
  wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
  return WallGeometry.createGeometry(wallGeometry);
}
export default createWallGeometry;
