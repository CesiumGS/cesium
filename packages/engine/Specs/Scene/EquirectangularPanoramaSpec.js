import EquirectangularPanorama from "../../Source/Scene/EquirectangularPanorama.js";
import Credit from "../../Source/Core/Credit.js";
import Matrix4 from "../../Source/Core/Matrix4.js";
import Cartesian2 from "../../Source/Core/Cartesian2.js";
import Panorama from "../../Source/Scene/Panorama.js";

describe("Scene/EquirectangularPanorama", function () {
  it("conforms to Panorama interface", function () {
    expect(EquirectangularPanorama).toConformToInterface(Panorama);
  });

  it("throws if options.image is not provided", function () {
    expect(function () {
      return new EquirectangularPanorama({});
    }).toThrowDeveloperError();
  });

  it("can be constructed with minimal options", function () {
    const panorama = new EquirectangularPanorama({ image: "test.png" });

    expect(panorama).toBeInstanceOf(EquirectangularPanorama);

    expect(panorama.image).toBe("test.png");

    expect(panorama.transform).toBe(Matrix4.IDENTITY);

    expect(panorama.credit).toBeUndefined();

    expect(panorama.show).toBe(true);
  });

  it("respects a user-provided transform", function () {
    const transform = Matrix4.fromTranslation({ x: 1, y: 2, z: 3 });

    const panorama = new EquirectangularPanorama({
      image: "test.png",
      transform,
    });

    expect(panorama.transform).toBe(transform);
  });

  it("handles a Credit object", function () {
    const credit = new Credit("Custom Credit");

    const panorama = new EquirectangularPanorama({
      image: "test.png",
      credit,
    });

    expect(panorama.credit).toBe(credit);
  });

  it("handles a credit string", function () {
    const panorama = new EquirectangularPanorama({
      image: "test.png",
      credit: "Test Credit",
    });

    expect(panorama.credit).toBeInstanceOf(Credit);
    expect(panorama.credit.html).toContain("Test Credit");
  });

  it("supports horizontal and vertical repeat", function () {
    const panorama = new EquirectangularPanorama({
      image: "test.png",
      repeatHorizontal: 2.0,
      repeatVertical: 3.0,
    });

    const uniforms = panorama._primitive.appearance.material.uniforms;

    expect(uniforms.repeat).toEqual(new Cartesian2(-2.0, 3.0));
  });
});
