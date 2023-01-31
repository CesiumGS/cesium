import BoxOutlineGeometry from "../Core/BoxOutlineGeometry.js";
import defined from "../Core/defined.js";

function createBoxOutlineGeometry(boxGeometry, offset) {
  if (defined(offset)) {
    boxGeometry = BoxOutlineGeometry.unpack(boxGeometry, offset);
  }
  return BoxOutlineGeometry.createGeometry(boxGeometry);
}
export default createBoxOutlineGeometry;
