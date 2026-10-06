import { BoxGeometry, defined } from "@cesium/core";

function createBoxGeometry(boxGeometry, offset) {
  if (defined(offset)) {
    boxGeometry = BoxGeometry.unpack(boxGeometry, offset);
  }
  return BoxGeometry.createGeometry(boxGeometry);
}
export default createBoxGeometry;
