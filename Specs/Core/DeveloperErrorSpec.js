import { DeveloperError } from "../../Source/Cesium.js";

describe("Core/DeveloperError", function () {
  var name = "DeveloperError";
  var testMessage = "Testing";

  var e;
  beforeEach(function () {
    e = new DeveloperError(testMessage);
  });

  it("has a name property", function () {
    expect(e.name).toEqual(name);
  });

  it("has a message property", function () {
    expect(e.message).toEqual(testMessage);
  });

  it("has a stack property", function () {
    if (window.specsUsingRelease) {
      expect(e.stack).toContain("Specs.js");
    } else {
      expect(e.stack).toContain("DeveloperErrorSpec.js");
    }
  });

  it("has a working toString", function () {
    var str = new DeveloperError(testMessage).toString();

    expect(str).toContain(name + ": " + testMessage);

    if (window.specsUsingRelease) {
      expect(str).toContain("Specs.js");
    } else {
      expect(str).toContain("Core/DeveloperErrorSpec.js");
    }
  });
});
