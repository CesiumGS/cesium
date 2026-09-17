import { Ellipsoid, Rectangle, RectangleGeometry, defined } from "@cesium/core";

function createRectangleGeometry(rectangleGeometry, offset) {
  if (defined(offset)) {
    rectangleGeometry = RectangleGeometry.unpack(rectangleGeometry, offset);
  }
  rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
  rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
  return RectangleGeometry.createGeometry(rectangleGeometry);
}
export default createRectangleGeometry;
