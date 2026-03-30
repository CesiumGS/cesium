import { Cartesian2, ConvexHull2D } from "../../index.js";

describe("Core/ConvexHull2D", function () {
  it("computes hull of a single point", function () {
    const points = [new Cartesian2(1, 2)];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(1);
    expect(hull[0]).toEqual(new Cartesian2(1, 2));
  });

  it("computes hull of two points", function () {
    const points = [new Cartesian2(0, 0), new Cartesian2(1, 1)];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(2);
  });

  it("computes hull of a triangle", function () {
    const points = [
      new Cartesian2(0, 0),
      new Cartesian2(1, 0),
      new Cartesian2(0, 1),
    ];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(3);
  });

  it("computes hull of a square", function () {
    const points = [
      new Cartesian2(0, 0),
      new Cartesian2(1, 0),
      new Cartesian2(1, 1),
      new Cartesian2(0, 1),
    ];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(4);
  });

  it("removes interior points", function () {
    const points = [
      new Cartesian2(0, 0),
      new Cartesian2(2, 0),
      new Cartesian2(2, 2),
      new Cartesian2(0, 2),
      new Cartesian2(1, 1), // interior
      new Cartesian2(0.5, 0.5), // interior
    ];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(4);
  });

  it("handles many interior points", function () {
    const points = [
      new Cartesian2(0, 0),
      new Cartesian2(10, 0),
      new Cartesian2(10, 10),
      new Cartesian2(0, 10),
    ];
    // Add many interior points
    for (let i = 1; i < 10; i++) {
      for (let j = 1; j < 10; j++) {
        points.push(new Cartesian2(i, j));
      }
    }
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(4);
  });

  it("handles duplicate points", function () {
    const points = [
      new Cartesian2(0, 0),
      new Cartesian2(0, 0),
      new Cartesian2(1, 0),
      new Cartesian2(1, 0),
      new Cartesian2(0, 1),
      new Cartesian2(0, 1),
    ];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(3);
  });

  it("handles collinear points", function () {
    const points = [
      new Cartesian2(0, 0),
      new Cartesian2(1, 0),
      new Cartesian2(2, 0),
      new Cartesian2(3, 0),
    ];
    const hull = ConvexHull2D.compute(points);
    // Collinear: result should include endpoints at minimum
    expect(hull.length).toBeGreaterThanOrEqual(2);
  });

  it("produces counter-clockwise winding", function () {
    const points = [
      new Cartesian2(0, 0),
      new Cartesian2(2, 0),
      new Cartesian2(2, 2),
      new Cartesian2(0, 2),
    ];
    const hull = ConvexHull2D.compute(points);
    // Verify CCW winding via shoelace formula (positive area = CCW)
    let area = 0.0;
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      area += hull[i].x * hull[j].y;
      area -= hull[j].x * hull[i].y;
    }
    expect(area).toBeGreaterThan(0);
  });

  it("handles a pentagon with one interior point", function () {
    const points = [
      new Cartesian2(1, 0),
      new Cartesian2(2, 1),
      new Cartesian2(1.5, 2),
      new Cartesian2(0.5, 2),
      new Cartesian2(0, 1),
      new Cartesian2(1, 1), // interior
    ];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(5);
  });

  it("does not modify the input array", function () {
    const points = [
      new Cartesian2(3, 1),
      new Cartesian2(0, 0),
      new Cartesian2(1, 3),
    ];
    const clone = points.map((p) => Cartesian2.clone(p));
    ConvexHull2D.compute(points);
    for (let i = 0; i < points.length; i++) {
      expect(points[i]).toEqual(clone[i]);
    }
  });

  it("throws without points", function () {
    expect(function () {
      ConvexHull2D.compute(undefined);
    }).toThrowDeveloperError();
  });

  it("handles negative coordinates", function () {
    const points = [
      new Cartesian2(-2, -2),
      new Cartesian2(2, -2),
      new Cartesian2(2, 2),
      new Cartesian2(-2, 2),
      new Cartesian2(0, 0), // interior
    ];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(4);
  });

  it("handles very small coordinate values", function () {
    const points = [
      new Cartesian2(0.0001, 0.0001),
      new Cartesian2(0.0002, 0.0001),
      new Cartesian2(0.0002, 0.0002),
      new Cartesian2(0.0001, 0.0002),
    ];
    const hull = ConvexHull2D.compute(points);
    expect(hull.length).toEqual(4);
  });
});
