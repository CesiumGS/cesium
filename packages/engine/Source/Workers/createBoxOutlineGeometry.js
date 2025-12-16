import { defined } from "@cesium/core-utils";
import BoxOutlineGeometry from "../Core/BoxOutlineGeometry.js";

function createBoxOutlineGeometry(boxGeometry, offset) {
  if (defined(offset)) {
    boxGeometry = BoxOutlineGeometry.unpack(boxGeometry, offset);
  }
  return BoxOutlineGeometry.createGeometry(boxGeometry);
}
export default createBoxOutlineGeometry;
