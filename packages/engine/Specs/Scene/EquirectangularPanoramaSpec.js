import EquirectangularPanorama from "../../Source/Scene/EquirectangularPanorama.js";
import Credit from "../../Source/Core/Credit.js";
import Matrix4 from "../../Source/Core/Matrix4.js";
import Cartesian2 from "../../Source/Core/Cartesian2.js";

describe("Scene/EquirectangularPanorama", function () {
  it("throws if options.image is not provided", function () {
    expect(function () {
      return new EquirectangularPanorama({});
    }).toThrowDeveloperError();
  });

  it("can be constructed with minimal options", function () {
    const panorama = new EquirectangularPanorama({ image: "test.png" });
    expect(panorama).toBeInstanceOf(EquirectangularPanorama);
    // getSources should return the image path
    expect(panorama.getSources()).toBe("test.png");
    // default transform
    expect(panorama.getTransform()).toEqual(Matrix4.IDENTITY);
  });

  it("respects a user-provided transform", function () {
    const transform = Matrix4.fromTranslation({ x: 1, y: 2, z: 3 });
    const panorama = new EquirectangularPanorama({
      image: "test.png",
      transform,
    });
    expect(panorama.getTransform()).toBe(transform);
  });

  it("handles a Credit object", function () {
    const credit = new Credit("Custom Credit");
    const panorama = new EquirectangularPanorama({ image: "test.png", credit });
    // The primitive should store the credit
    expect(panorama._credit).toBe(credit);
  });

  it("handles a credit string", function () {
    const panorama = new EquirectangularPanorama({
      image: "test.png",
      credit: "Test Credit",
    });
    expect(panorama._credit).toBeInstanceOf(Credit);
    expect(panorama._credit.html).toContain("Test Credit");
  });

  it("supports horizontal and vertical repeat", function () {
    const panorama = new EquirectangularPanorama({
      image: "test.png",
      repeatHorizontal: 2.0,
      repeatVertical: 3.0,
    });
    const uniforms = panorama.primitive.appearance.material.uniforms;
    expect(uniforms.repeat).toEqual(new Cartesian2(-2.0, 3.0));
  });

  it("returns the correct source image via getSources", function () {
    const panorama = new EquirectangularPanorama({ image: "test.png" });
    expect(panorama.getSources()).toBe("test.png");
  });

  it("returns the correct transform via getTransform", function () {
    const transform = Matrix4.IDENTITY;
    const panorama = new EquirectangularPanorama({
      image: "test.png",
      transform,
    });
    expect(panorama.getTransform()).toBe(transform);
  });

  it("returns the correct credits via getCredits", function () {
    const credit = new Credit("My Credit");
    const panorama = new EquirectangularPanorama({ image: "test.png", credit });
    expect(panorama.getCredits()).toBe(credit);
  });
});
