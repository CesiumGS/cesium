import { defined } from "@cesium/utils";
import BoxGeometry from "../Core/BoxGeometry.js";

function createBoxGeometry(boxGeometry, offset) {
  if (defined(offset)) {
    boxGeometry = BoxGeometry.unpack(boxGeometry, offset);
  }
  return BoxGeometry.createGeometry(boxGeometry);
}
export default createBoxGeometry;
