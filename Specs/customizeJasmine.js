import addDefaultMatchers from "./addDefaultMatchers.js";
import equalsMethodEqualityTester from "./equalsMethodEqualityTester.js";

function customizeJasmine(
  env,
  includedCategory,
  excludedCategory,
  webglValidation,
  webglStub,
  release,
  debugCanvasWidth,
  debugCanvasHeight,
) {
  // set this for uniform test resolution across devices
  window.devicePixelRatio = 1;

  window.specsUsingRelease = release;

  const originalDescribe = window.describe;

  window.describe = function (name, suite, category) {
    // exclude this spec if we're filtering by category and it's not the selected category
    // otherwise if we have an excluded category, exclude this test if the category of this spec matches
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
    addDefaultMatchers(!release).call(env);
    env.addCustomEqualityTester(equalsMethodEqualityTester);
  });
}
export default customizeJasmine;
