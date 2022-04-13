import customizeJasmine from "./customizeJasmine.js";
import defined from "../Source/Core/defined.js";
import queryToObject from "../Source/Core/queryToObject.js";

const queryString = queryToObject(window.location.search.substring(1));

let webglValidation = false;
let webglStub = false;
const built = window.location.search.indexOf("built") !== -1;
const release = window.location.search.indexOf("release") !== -1;
const categoryString = queryString.category;
const excludeCategoryString = queryString.not;

if (defined(queryString.webglValidation)) {
  webglValidation = true;
}

if (defined(queryString.webglStub)) {
  webglStub = true;
}

if (built) {
  if (release) {
    window.CESIUM_BASE_URL = "../Build/Cesium";
  } else {
    window.CESIUM_BASE_URL = "../Build/CesiumUnminified";
  }
} else {
  window.CESIUM_BASE_URL = "../Source/";
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

const specFilter = new jasmine.HtmlSpecFilter({
  filterString: function () {
    return queryString.spec;
  },
});

const env = jasmine.getEnv();
env.configure({
  stopSpecOnExpectationFailure: false,
  stopOnSpecFailure: false,
  random: false,
  hideDisabled: true,
  specFilter: function (spec) {
    if (
      !specFilter.matches(spec.getFullName()) ||
      (categoryString === "none" && !defined(queryString.spec))
    ) {
      return false;
    }

    return true;
  },
});

customizeJasmine(
  env,
  categoryString,
  excludeCategoryString,
  webglValidation,
  webglStub,
  release
);
