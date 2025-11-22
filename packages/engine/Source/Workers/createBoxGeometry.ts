import BoxGeometry from "../Core/BoxGeometry.js";
import defined from "../Core/defined.js";

function createBoxGeometry(boxGeometry: any, offset: any) {
  if (defined(offset)) {
    boxGeometry = BoxGeometry.unpack(boxGeometry, offset);
  }
  return BoxGeometry.createGeometry(boxGeometry);
}
export default createBoxGeometry;
