import equalsMethodEqualityTester from "./equalsMethodEqualityTester.js";

/**
 * @param {object} env The jasmine environment.
 * @param {object} [options] An object with the following properties:
 * @param {string} [options.includeCategory] Only run specs in this category.
 * @param {string} [options.excludeCategory] Skip specs in this category.
 * @param {boolean} [options.webglValidation=false] Enable WebGL validation.
 * @param {boolean} [options.webglStub=false] Replace WebGL with a stub.
 * @param {boolean} [options.release=false] True when running against a release build.
 * @param {number} [options.debugCanvasWidth] The width of the debug canvas.
 * @param {number} [options.debugCanvasHeight] The height of the debug canvas.
 */
function customizeJasmine(env, options = {}) {
  const {
    includeCategory,
    excludeCategory,
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
      includeCategory &&
      includeCategory !== "" &&
      includeCategory !== "none" &&
      category !== includeCategory
    ) {
      window.xdescribe(name, suite);
    } else if (
      excludeCategory &&
      excludeCategory !== "" &&
      category === excludeCategory
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
