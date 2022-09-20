import { PointCloudShading } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";;

describe("Scene/PointCloudShading", function () {
  it("creates expected instance from raw assignment and construction", function () {
    let pointCloudShading = new PointCloudShading();
    expect(pointCloudShading.attenuation).toEqual(false);
    expect(pointCloudShading.geometricErrorScale).toEqual(1.0);
    expect(pointCloudShading.maximumAttenuation).not.toBeDefined();
    expect(pointCloudShading.baseResolution).not.toBeDefined();
    expect(pointCloudShading.eyeDomeLighting).toEqual(true);
    expect(pointCloudShading.eyeDomeLightingStrength).toEqual(1.0);
    expect(pointCloudShading.eyeDomeLightingRadius).toEqual(1.0);
    expect(pointCloudShading.backFaceCulling).toEqual(false);
    expect(pointCloudShading.normalShading).toEqual(true);

    const options = {
      geometricErrorScale: 2.0,
      maximumAttenuation: 16,
      baseResolution: 0.1,
      eyeDomeLightingStrength: 0.1,
      eyeDomeLightingRadius: 2.0,
      backFaceCulling: true,
      normalShading: false,
    };
    pointCloudShading = new PointCloudShading(options);
    expect(pointCloudShading.attenuation).toEqual(false);
    expect(pointCloudShading.geometricErrorScale).toEqual(
      options.geometricErrorScale
    );
    expect(pointCloudShading.maximumAttenuation).toEqual(
      options.maximumAttenuation
    );
    expect(pointCloudShading.baseResolution).toEqual(options.baseResolution);
    expect(pointCloudShading.eyeDomeLighting).toEqual(true);
    expect(pointCloudShading.eyeDomeLightingStrength).toEqual(
      options.eyeDomeLightingStrength
    );
    expect(pointCloudShading.eyeDomeLightingRadius).toEqual(
      options.eyeDomeLightingRadius
    );
    expect(pointCloudShading.backFaceCulling).toEqual(options.backFaceCulling);
    expect(pointCloudShading.normalShading).toEqual(options.normalShading);
  });

  it("provides a method for checking if point cloud shading is supported", function () {
    const scene = createScene();
    const context = scene.context;
    const expectedSupport =
      context.floatingPointTexture &&
      context.drawBuffers &&
      context.fragmentDepth;
    expect(PointCloudShading.isSupported(scene)).toEqual(expectedSupport);
    scene.destroyForSpecs();
  });
});
