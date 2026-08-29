import equalsMethodEqualityTester from "./equalsMethodEqualityTester.js";

/**
 * @param {object} env The jasmine environment.
 * @param {object} [options]
 * @param {string} [options.includedCategory] Only run specs in this category.
 * @param {string} [options.excludedCategory] Skip specs in this category.
 * @param {boolean} [options.webglValidation=false] Enable WebGL validation.
 * @param {boolean} [options.webglStub=false] Replace WebGL with a stub.
 * @param {boolean} [options.release=false] True when running against a release build.
 * @param {number} [options.debugCanvasWidth]
 * @param {number} [options.debugCanvasHeight]
 */
function customizeJasmine(env, options = {}) {
  const {
    includedCategory,
    excludedCategory,
    webglValidation = false,
    webglStub = false,
    release = false,
    debugCanvasWidth,
    debugCanvasHeight,
  } = options;

  // set this for uniform test resolution across devices
  window.devicePixelRatio = 1;

  window.specsUsingRelease = release;

  const originalDescribe = window.describe;

  window.describe = function (name, suite, category) {
    if (
      includedCategory &&
      includedCategory !== "" &&
      includedCategory !== "none" &&
      category !== includedCategory
    ) {
      window.xdescribe(name, suite);
    } else if (
      excludedCategory &&
      excludedCategory !== "" &&
      category === excludedCategory
    ) {
      window.xdescribe(name, suite);
    } else {
      originalDescribe(name, suite);
    }
  };

  if (webglValidation) {
    window.webglValidation = true;
  }

  if (webglStub) {
    window.webglStub = true;
  }

  window.debugCanvasWidth = debugCanvasWidth;
  window.debugCanvasHeight = debugCanvasHeight;

  env.beforeEach(function () {
    env.addCustomEqualityTester(equalsMethodEqualityTester);
  });
}
export default customizeJasmine;
