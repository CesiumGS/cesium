import { Rectangle } from "../../Source/Cesium.js";
import { Region } from "../../Source/Cesium.js";

describe("Core/Region", function () {
  var west = -0.9;
  var south = 0.5;
  var east = 1.4;
  var north = 1.0;
  var rectangle = new Rectangle(west, south, east, north);
  var minimumHeight = 1.0;
  var maximumHeight = 2.0;

  it("default constructor sets expected values.", function () {
    var region = new Region();
    expect(region.rectangle).toEqual(Rectangle.MAX_VALUE);
    expect(region.minimumHeight).toEqual(0.0);
    expect(region.maximumHeight).toEqual(0.0);
  });

  it("constructor sets expected parameter values.", function () {
    var region = new Region(rectangle, minimumHeight, maximumHeight);
    expect(region.rectangle).toEqual(rectangle);
    expect(region.minimumHeight).toEqual(minimumHeight);
    expect(region.maximumHeight).toEqual(maximumHeight);
  });

  it("clone works without a result parameter.", function () {
    var region = new Region(rectangle, minimumHeight, maximumHeight);
    var returnedResult = region.clone();
    expect(returnedResult).toEqual(region);
    expect(returnedResult).not.toBe(region);
  });

  it("clone works with a result parameter.", function () {
    var region = new Region(rectangle, minimumHeight, maximumHeight);
    var result = new Region();
    var returnedResult = region.clone(result);
    expect(returnedResult).toEqual(region);
    expect(returnedResult).not.toBe(region);
    expect(returnedResult).toBe(result);
  });

  it('clone works with "this" result parameter.', function () {
    var region = new Region(rectangle, minimumHeight, maximumHeight);
    var returnedResult = region.clone(region);
    expect(returnedResult).toEqual(
      new Region(rectangle, minimumHeight, maximumHeight)
    );
    expect(returnedResult).toBe(region);
  });

  it("clone works without region", function () {
    expect(Region.clone()).not.toBeDefined();
  });

  it("Equals works in all cases", function () {
    var region = new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.5, 0.6);
    expect(
      region.equals(new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.5, 0.6))
    ).toEqual(true);
    expect(
      region.equals(new Region(new Rectangle(0.7, 0.2, 0.3, 0.4), 0.5, 0.6))
    ).toEqual(false);
    expect(
      region.equals(new Region(new Rectangle(0.1, 0.7, 0.3, 0.4), 0.5, 0.6))
    ).toEqual(false);
    expect(
      region.equals(new Region(new Rectangle(0.1, 0.2, 0.7, 0.4), 0.5, 0.6))
    ).toEqual(false);
    expect(
      region.equals(new Region(new Rectangle(0.1, 0.2, 0.3, 0.7), 0.5, 0.6))
    ).toEqual(false);
    expect(
      region.equals(new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.7, 0.6))
    ).toEqual(false);
    expect(
      region.equals(new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.5, 0.7))
    ).toEqual(false);
    expect(region.equals(undefined)).toEqual(false);
  });

  it("Static equals works in all cases", function () {
    var region = new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.5, 0.6);
    expect(
      Region.equals(
        region,
        new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.5, 0.6)
      )
    ).toEqual(true);
    expect(
      Region.equals(
        region,
        new Region(new Rectangle(0.7, 0.2, 0.3, 0.4), 0.5, 0.6)
      )
    ).toEqual(false);
    expect(
      Region.equals(
        region,
        new Region(new Rectangle(0.1, 0.7, 0.3, 0.4), 0.5, 0.6)
      )
    ).toEqual(false);
    expect(
      Region.equals(
        region,
        new Region(new Rectangle(0.1, 0.2, 0.7, 0.4), 0.5, 0.6)
      )
    ).toEqual(false);
    expect(
      Region.equals(
        region,
        new Region(new Rectangle(0.1, 0.2, 0.3, 0.7), 0.5, 0.6)
      )
    ).toEqual(false);
    expect(
      Region.equals(
        region,
        new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.7, 0.6)
      )
    ).toEqual(false);
    expect(
      Region.equals(
        region,
        new Region(new Rectangle(0.1, 0.2, 0.3, 0.4), 0.5, 0.7)
      )
    ).toEqual(false);
    expect(Region.equals(region, undefined)).toEqual(false);
  });
});
