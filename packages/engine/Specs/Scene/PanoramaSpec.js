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

    it("alpha throws DeveloperError", function () {
      expect(function () {
        return panorama.alpha;
      }).toThrowDeveloperError();
    });

    it("debugShowExtents throws DeveloperError", function () {
      expect(function () {
        return panorama.debugShowExtents;
      }).toThrowDeveloperError();
    });
  });

  describe("abstract methods", function () {
    let panorama;

    beforeEach(function () {
      panorama = Object.create(Panorama.prototype);
    });

    it("getSources throws DeveloperError", function () {
      expect(function () {
        panorama.getSources();
      }).toThrowDeveloperError();
    });

    it("getTransform throws DeveloperError", function () {
      expect(function () {
        panorama.getTransform();
      }).toThrowDeveloperError();
    });

    it("getCredits throws DeveloperError", function () {
      expect(function () {
        panorama.getCredits();
      }).toThrowDeveloperError();
    });
  });
});
