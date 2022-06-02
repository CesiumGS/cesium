import { DeveloperError } from "../../Source/Cesium.js";

describe("Core/DeveloperError", function () {
  const name = "DeveloperError";
  const testMessage = "Testing";

  let e;
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
    if (!window.specsUsingRelease) {
      // Since source maps are used, there will not be exact filenames
      expect(e.stack).toContain("DeveloperError");
    }
  });

  it("has a working toString", function () {
    const str = new DeveloperError(testMessage).toString();

    expect(str).toContain(`${name}: ${testMessage}`);

    if (!window.specsUsingRelease) {
      // Since source maps are used, there will not be exact filenames
      expect(str).toContain(`DeveloperError: ${testMessage}`);
    } else {
      expect(str).toContain(testMessage);
    }
  });
});
