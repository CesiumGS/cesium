import {
  Cartesian3,
  Event,
  ExtrapolationType,
  JulianDate,
  CallbackProperty,
  ConstantPositionProperty,
  SampledPositionProperty,
  VelocityVectorProperty,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

describe("DataSources/VelocityVectorProperty", function () {
  const time = JulianDate.now();

  it("can default construct", function () {
    const property = new VelocityVectorProperty();
    expect(property.isConstant).toBe(true);
    expect(property.definitionChanged).toBeInstanceOf(Event);
    expect(property.position).toBeUndefined();
    expect(property.getValue(time)).toBeUndefined();
    expect(property.normalize).toBe(true);
  });

  it("can construct with arguments", function () {
    const position = new SampledPositionProperty();
    const property = new VelocityVectorProperty(position, false);
    expect(property.isConstant).toBe(true);
    expect(property.definitionChanged).toBeInstanceOf(Event);
    expect(property.position).toBe(position);
    expect(property.getValue(time)).toEqual(Cartesian3.ZERO);
    expect(property.normalize).toBe(false);
  });

  it("raises definitionChanged event when position is set", function () {
    const property = new VelocityVectorProperty();

    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    const position = new SampledPositionProperty();
    property.position = position;
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("raises definitionChanged event when normalize changes", function () {
    const property = new VelocityVectorProperty(new SampledPositionProperty());

    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    property.normalize = true;
    expect(listener.calls.count()).toBe(0);

    property.normalize = false;
    expect(listener).toHaveBeenCalledWith(property);
  });

  it("subscribes and unsubscribes to position definitionChanged and propagates up", function () {
    const position = new SampledPositionProperty();
    const property = new VelocityVectorProperty(position);

    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    //Position changing should raise out property change event
    position.definitionChanged.raiseEvent(position);
    expect(listener).toHaveBeenCalledWith(property);

    //Make sure it unsubscribes when value is changed
    property.position = undefined;

    listener.calls.reset();
    position.definitionChanged.raiseEvent(position);
    expect(listener.calls.count()).toBe(0);
  });

  it("does not raise definitionChanged event when position is set to the same instance", function () {
    const position = new SampledPositionProperty();
    const property = new VelocityVectorProperty(position);

    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    property.position = position;
    expect(listener.calls.count()).toBe(0);
  });

  it("produces correct normalized value when called without result parameter", function () {
    const times = [new JulianDate(0, 0), new JulianDate(0, 1.0 / 60.0)];
    const values = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(20.0, 0.0, 0.0),
    ];

    const position = new SampledPositionProperty();
    position.addSamples(times, values);

    const property = new VelocityVectorProperty(position);

    const expectedVelocityDirection = new Cartesian3(1.0, 0.0, 0.0);
    expect(property.getValue(times[0])).toEqual(expectedVelocityDirection);
    expect(property.getValue(times[1])).toEqual(expectedVelocityDirection);
  });

  it("produces correct normalized value when called with result parameter", function () {
    const times = [new JulianDate(0, 0), new JulianDate(0, 1.0 / 60.0)];
    const values = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(20.0, 0.0, 0.0),
    ];

    const position = new SampledPositionProperty();
    position.addSamples(times, values);

    const property = new VelocityVectorProperty(position);

    const expectedVelocityDirection = new Cartesian3(1.0, 0.0, 0.0);

    const expected = new Cartesian3();
    const result = property.getValue(times[0], expected);
    expect(result).toBe(expected);
    expect(result).toEqual(expectedVelocityDirection);
  });

  it("produces correct unnormalized value when called without result parameter", function () {
    const times = [new JulianDate(0, 0), new JulianDate(0, 1.0)];
    const values = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(20.0, 0.0, 0.0),
    ];

    const position = new SampledPositionProperty();
    position.addSamples(times, values);

    const property = new VelocityVectorProperty(position, false);

    const expectedVelocity = new Cartesian3(20.0, 0.0, 0.0);
    expect(property.getValue(times[0])).toEqualEpsilon(
      expectedVelocity,
      CesiumMath.EPSILON13
    );
    expect(property.getValue(times[1])).toEqualEpsilon(
      expectedVelocity,
      CesiumMath.EPSILON13
    );
  });

  it("produces correct unnormalized value when called with result parameter", function () {
    const times = [new JulianDate(0, 0), new JulianDate(0, 1.0)];
    const values = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(20.0, 0.0, 0.0),
    ];

    const position = new SampledPositionProperty();
    position.addSamples(times, values);

    const property = new VelocityVectorProperty(position, false);

    const expectedVelocity = new Cartesian3(20.0, 0.0, 0.0);

    const expected = new Cartesian3();
    const result = property.getValue(times[0], expected);
    expect(result).toBe(expected);
    expect(result).toEqualEpsilon(expectedVelocity, CesiumMath.EPSILON13);
  });

  it("produces normalized value of undefined with constant position", function () {
    const position = new ConstantPositionProperty(
      new Cartesian3(1.0, 2.0, 3.0)
    );

    const property = new VelocityVectorProperty(position);
    expect(property.getValue(new JulianDate())).toBeUndefined();
  });

  it("produces unnormalized value of zero with constant position", function () {
    const position = new ConstantPositionProperty(
      new Cartesian3(1.0, 2.0, 3.0)
    );

    const property = new VelocityVectorProperty(position, false);
    expect(property.getValue(new JulianDate())).toEqual(Cartesian3.ZERO);
  });

  it("produces normalized value of undefined at zero velocity", function () {
    const position = new CallbackProperty(function () {
      return new Cartesian3(0, 0, 0);
    }, false);

    const property = new VelocityVectorProperty(position);
    expect(property.getValue(new JulianDate())).toBeUndefined();
  });

  it("produces unnormalized value of zero at zero velocity", function () {
    const position = new CallbackProperty(function () {
      return new Cartesian3(0, 0, 0);
    }, false);

    const property = new VelocityVectorProperty(position, false);
    expect(property.getValue(new JulianDate())).toEqual(Cartesian3.ZERO);
  });

  it("returns undefined when position value is undefined", function () {
    const position = new SampledPositionProperty();
    position.addSample(new JulianDate(1, 0), new Cartesian3(0.0, 0.0, 0.0));
    position.forwardExtrapolationType = ExtrapolationType.NONE;
    position.backwardExtrapolationType = ExtrapolationType.NONE;

    const property = new VelocityVectorProperty(position);

    const result = property.getValue(new JulianDate());
    expect(result).toBeUndefined();
  });

  it("returns undefined when position has exactly one value", function () {
    const position = new SampledPositionProperty();
    position.addSample(new JulianDate(1, 0), new Cartesian3(0.0, 0.0, 0.0));
    position.forwardExtrapolationType = ExtrapolationType.NONE;
    position.backwardExtrapolationType = ExtrapolationType.NONE;

    const property = new VelocityVectorProperty(position);

    const result = property.getValue(new JulianDate(1, 0));
    expect(result).toBeUndefined();
  });

  it("equals works", function () {
    const position = new SampledPositionProperty();

    const left = new VelocityVectorProperty();
    const right = new VelocityVectorProperty();

    expect(left.equals(right)).toBe(true);

    left.position = position;
    expect(left.equals(right)).toBe(false);

    right.position = position;
    expect(left.equals(right)).toBe(true);
  });

  it("getValue throws without time", function () {
    const property = new VelocityVectorProperty();
    expect(function () {
      property.getValue();
    }).toThrowDeveloperError();
  });
});
