import { Model, ImageBasedLighting, Cartesian3 } from "../../../index.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";

// A white ambient light with low intensity
const defaultIbl = new ImageBasedLighting({
  sphericalHarmonicCoefficients: [
    new Cartesian3(0.35449, 0.35449, 0.35449),
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
  ],
});

async function loadAndZoomToModelAsync(options, scene) {
  options = {
    environmentMapOptions: {
      enabled: false, // disable other diffuse lighting by default
      ...options.environmentMapOptions,
    },
    imageBasedLighting: defaultIbl,
    ...options,
  };

  const model = await Model.fromGltfAsync(options);
  scene.primitives.add(model);

  await pollToPromise(
    function () {
      scene.renderForSpecs();
      return model.ready;
    },
    { timeout: 10000 },
  );

  scene.camera.flyToBoundingSphere(model.boundingSphere, {
    duration: 0,
    offset: options.offset,
  });

  return model;
}

export default loadAndZoomToModelAsync;
