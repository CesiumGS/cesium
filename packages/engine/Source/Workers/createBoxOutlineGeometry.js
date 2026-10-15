import { BoxOutlineGeometry, defined } from "@cesium/core";

function createBoxOutlineGeometry(boxGeometry, offset) {
  if (defined(offset)) {
    boxGeometry = BoxOutlineGeometry.unpack(boxGeometry, offset);
  }
  return BoxOutlineGeometry.createGeometry(boxGeometry);
}
export default createBoxOutlineGeometry;
