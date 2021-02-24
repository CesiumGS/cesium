import { Rectangle } from "../../Source/Cesium.js";
import { RectangleCollisionChecker } from "../../Source/Cesium.js";

describe("Core/RectangleCollisionChecker", function () {
  var testRectangle1 = new Rectangle(0.0, 0.0, 1.0, 1.0);
  var testRectangle2 = new Rectangle(1.1, 1.1, 2.1, 2.1);
  var testRectangle3 = new Rectangle(1.1, 1.1, 1.2, 1.2);

  it("Checks for collisions with contained rectangles", function () {
    var collisionChecker = new RectangleCollisionChecker();
    collisionChecker.insert("test1", testRectangle1);

    expect(collisionChecker.collides(testRectangle2)).toBe(false);

    collisionChecker.insert("test3", testRectangle3);
    expect(collisionChecker.collides(testRectangle2)).toBe(true);
  });

  it("removes rectangles", function () {
    var collisionChecker = new RectangleCollisionChecker();
    collisionChecker.insert("test1", testRectangle1);

    collisionChecker.insert("test3", testRectangle3);

    expect(collisionChecker.collides(testRectangle2)).toBe(true);

    collisionChecker.remove("test3", testRectangle3);

    expect(collisionChecker.collides(testRectangle2)).toBe(false);
  });
});
