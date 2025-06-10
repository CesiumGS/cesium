import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Rectangle from "../Core/Rectangle.js";
import RectangleOutlineGeometry from "../Core/RectangleOutlineGeometry.js";

function createRectangleOutlineGeometry(rectangleGeometry, offset) {
  if (defined(offset)) {
    rectangleGeometry = RectangleOutlineGeometry.unpack(
      rectangleGeometry,
      offset,
    );
  }
  rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
  rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
  return RectangleOutlineGeometry.createGeometry(rectangleGeometry);
}
export default createRectangleOutlineGeometry;
