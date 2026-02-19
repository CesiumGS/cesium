import Panorama from "../../Source/Scene/Panorama.js";

describe("Scene/Panorama", function () {
  it("cannot be instantiated", function () {
    expect(function () {
      return new Panorama();
    }).toThrowDeveloperError();
  });

  describe("abstract properties", function () {
    let panorama;

    beforeEach(function () {
      // Create a fake object that uses Panorama.prototype
      panorama = Object.create(Panorama.prototype);
    });

    it("show throws DeveloperError", function () {
      expect(function () {
        return panorama.show;
      }).toThrowDeveloperError();
    });

    it("transform throws DeveloperError", function () {
      expect(function () {
        return panorama.transform;
      }).toThrowDeveloperError();
    });

    it("credit throws DeveloperError", function () {
      expect(function () {
        return panorama.credit;
      }).toThrowDeveloperError();
    });
  });
});
