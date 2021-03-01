import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import defined from "../Core/defined.js";
import GroundPolylineGeometry from "../Core/GroundPolylineGeometry.js";

function createGroundPolylineGeometry(
  groundPolylineGeometry,
  offset,
  mapProjection
) {
  return ApproximateTerrainHeights.initialize().then(function () {
    if (defined(offset)) {
      groundPolylineGeometry = GroundPolylineGeometry.unpack(
        groundPolylineGeometry,
        offset
      );
    }
    GroundPolylineGeometry.setProjection(groundPolylineGeometry, mapProjection);
    return GroundPolylineGeometry.createGeometry(groundPolylineGeometry);
  });
}
export default createGroundPolylineGeometry;
