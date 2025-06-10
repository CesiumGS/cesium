import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import defined from "../Core/defined.js";
import GroundPolylineGeometry from "../Core/GroundPolylineGeometry.js";

function createGroundPolylineGeometry(groundPolylineGeometry, offset) {
  return ApproximateTerrainHeights.initialize().then(function () {
    if (defined(offset)) {
      groundPolylineGeometry = GroundPolylineGeometry.unpack(
        groundPolylineGeometry,
        offset,
      );
    }
    return GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
  });
}
export default createGroundPolylineGeometry;
