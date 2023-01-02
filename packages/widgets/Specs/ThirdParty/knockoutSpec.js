import { knockout } from "../../index.js";

describe("ThirdParty/knockout", function () {
  it("can track all properties", function () {
    const obj = {
      one: 1,
      two: undefined,
      three: knockout.observable(),
    };

    expect(knockout.getObservable(obj, "one")).toBeNull();
    expect(knockout.getObservable(obj, "two")).toBeNull();
    expect(knockout.getObservable(obj, "three")).toBeNull();

    knockout.track(obj);

    expect(knockout.getObservable(obj, "one")).not.toBeNull();
    expect(knockout.getObservable(obj, "two")).not.toBeNull();
    expect(knockout.getObservable(obj, "three")).not.toBeNull();
  });
});
