import { Ellipsoid, WallOutlineGeometry, defined } from "@cesium/core";

function createWallOutlineGeometry(wallGeometry, offset) {
  if (defined(offset)) {
    wallGeometry = WallOutlineGeometry.unpack(wallGeometry, offset);
  }
  wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
  return WallOutlineGeometry.createGeometry(wallGeometry);
}
export default createWallOutlineGeometry;
