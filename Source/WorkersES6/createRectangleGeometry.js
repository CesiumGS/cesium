import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Rectangle from "../Core/Rectangle.js";
import RectangleGeometry from "../Core/RectangleGeometry.js";

function createRectangleGeometry(rectangleGeometry, offset) {
  if (defined(offset)) {
    rectangleGeometry = RectangleGeometry.unpack(rectangleGeometry, offset);
  }
  rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
  rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
  return RectangleGeometry.createGeometry(rectangleGeometry);
}
export default createRectangleGeometry;
