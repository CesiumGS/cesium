import {
  Ellipsoid,
  Rectangle,
  RectangleOutlineGeometry,
  defined,
} from "@cesium/core";

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
