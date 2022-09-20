import { DistanceDisplayCondition } from "../../index.js";
import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;

describe("Core/DistanceDisplayCondition", function () {
  it("default constructs", function () {
    const dc = new DistanceDisplayCondition();
    expect(dc.near).toEqual(0.0);
    expect(dc.far).toEqual(Number.MAX_VALUE);
  });

  it("constructs with parameters", function () {
    const near = 10.0;
    const far = 100.0;
    const dc = new DistanceDisplayCondition(near, far);
    expect(dc.near).toEqual(near);
    expect(dc.far).toEqual(far);
  });

  it("gets and sets properties", function () {
    const dc = new DistanceDisplayCondition();

    const near = 10.0;
    const far = 100.0;
    dc.near = near;
    dc.far = far;

    expect(dc.near).toEqual(near);
    expect(dc.far).toEqual(far);
  });

  it("determines equality with static function", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    expect(
      DistanceDisplayCondition.equals(
        dc,
        new DistanceDisplayCondition(10.0, 100.0)
      )
    ).toEqual(true);
    expect(
      DistanceDisplayCondition.equals(
        dc,
        new DistanceDisplayCondition(11.0, 100.0)
      )
    ).toEqual(false);
    expect(
      DistanceDisplayCondition.equals(
        dc,
        new DistanceDisplayCondition(10.0, 101.0)
      )
    ).toEqual(false);
    expect(DistanceDisplayCondition.equals(dc, undefined)).toEqual(false);
  });

  it("determines equality with prototype function", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    expect(dc.equals(new DistanceDisplayCondition(10.0, 100.0))).toEqual(true);
    expect(dc.equals(new DistanceDisplayCondition(11.0, 100.0))).toEqual(false);
    expect(dc.equals(new DistanceDisplayCondition(10.0, 101.0))).toEqual(false);
    expect(dc.equals(undefined)).toEqual(false);
  });

  it("static clones", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    const result = DistanceDisplayCondition.clone(dc);
    expect(dc).toEqual(result);
  });

  it("static clone with a result parameter", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    const result = new DistanceDisplayCondition();
    const returnedResult = DistanceDisplayCondition.clone(dc, result);
    expect(dc).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(dc).toEqual(result);
  });

  it("static clone works with a result parameter that is an input parameter", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    const returnedResult = DistanceDisplayCondition.clone(dc, dc);
    expect(dc).toBe(returnedResult);
  });

  it("clones", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    const result = dc.clone();
    expect(dc).toEqual(result);
  });

  it("clone with a result parameter", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    const result = new DistanceDisplayCondition();
    const returnedResult = dc.clone(result);
    expect(dc).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(dc).toEqual(result);
  });

  it("clone works with a result parameter that is an input parameter", function () {
    const dc = new DistanceDisplayCondition(10.0, 100.0);
    const returnedResult = dc.clone(dc);
    expect(dc).toBe(returnedResult);
  });

  createPackableSpecs(
    DistanceDisplayCondition,
    new DistanceDisplayCondition(1, 2),
    [1, 2]
  );
});
