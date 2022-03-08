import { when } from "../Source/Cesium.js";
import addDefaultMatchers from "./addDefaultMatchers.js";
import equalsMethodEqualityTester from "./equalsMethodEqualityTester.js";

function customizeJasmine(
  env,
  includedCategory,
  excludedCategory,
  includedName,
  excludedName,
  webglValidation,
  webglStub,
  release
) {
  // set this for uniform test resolution across devices
  window.devicePixelRatio = 1;

  window.specsUsingRelease = release;

  const originalDescribe = window.describe;

  window.describe = function (name, suite, categories) {
    // exclude this spec if we're filtering by category and it's not the selected category
    // otherwise if we have an excluded category, exclude this test if the category of this spec matches
    if (includedCategory && categories !== includedCategory) {
      return;
    } else if (excludedCategory && categories === excludedCategory) {
      return;
    }

    if (includedName && !name.includes(includedName)) {
      return;
    } else if (excludedName && name.includes(excludedName)) {
      return;
    }

    originalDescribe(name, suite, categories);
  };

  // Override beforeEach(), afterEach(), beforeAll(), afterAll(), and it() to automatically
  // call done() when a returned promise resolves.
  const originalIt = window.it;

  window.it = function (description, f, timeout, categories) {
    originalIt(
      description,
      function (done) {
        const result = f();
        when(
          result,
          function () {
            done();
          },
          function (e) {
            done.fail(`promise rejected: ${e.toString()}`);
          }
        );
      },
      timeout,
      categories
    );
  };

  const originalBeforeEach = window.beforeEach;

  window.beforeEach = function (f) {
    originalBeforeEach(function (done) {
      const result = f();
      when(
        result,
        function () {
          done();
        },
        function (e) {
          done.fail(`promise rejected: ${e.toString()}`);
        }
      );
    });
  };

  const originalAfterEach = window.afterEach;

  window.afterEach = function (f) {
    originalAfterEach(function (done) {
      const result = f();
      when(
        result,
        function () {
          done();
        },
        function (e) {
          done.fail(`promise rejected: ${e.toString()}`);
        }
      );
    });
  };

  const originalBeforeAll = window.beforeAll;

  window.beforeAll = function (f) {
    originalBeforeAll(function (done) {
      const result = f();
      when(
        result,
        function () {
          done();
        },
        function (e) {
          done.fail(`promise rejected: ${e.toString()}`);
        }
      );
    });
  };

  const originalAfterAll = window.afterAll;

  window.afterAll = function (f) {
    originalAfterAll(function (done) {
      const result = f();
      when(
        result,
        function () {
          done();
        },
        function (e) {
          done.fail(`promise rejected: ${e.toString()}`);
        }
      );
    });
  };

  if (webglValidation) {
    window.webglValidation = true;
  }

  if (webglStub) {
    window.webglStub = true;
  }

  //env.catchExceptions(true);

  env.beforeEach(function () {
    addDefaultMatchers(!release).call(env);
    env.addCustomEqualityTester(equalsMethodEqualityTester);
  });
}
export default customizeJasmine;
