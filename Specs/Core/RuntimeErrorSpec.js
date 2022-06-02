import { RuntimeError } from "../../Source/Cesium.js";

describe("Core/RuntimeError", function () {
  const name = "RuntimeError";
  const testMessage = "Testing";

  let e;
  beforeEach(function () {
    e = new RuntimeError(testMessage);
  });

  it("has a name property", function () {
    expect(e.name).toEqual(name);
  });

  it("has a message property", function () {
    expect(e.message).toEqual(testMessage);
  });

  it("has a stack property", function () {
    // Since we are using source maps, we won't be able to map to a specific file without help from the browser developer tools.
    // However, we should know the class if not minified
    if (!window.specsUsingRelease) {
      expect(e.stack).toContain("RuntimeError");
    }
  });

  it("has a working toString", function () {
    const str = new RuntimeError(testMessage).toString();

    expect(str).toContain(`${name}: ${testMessage}`);

    if (!window.specsUsingRelease) {
      expect(e.stack).toContain(`RuntimeError: ${testMessage}`);
    } else {
      expect(str).toContain(testMessage);
    }
  });
});
