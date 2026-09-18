import customizeJasmine from "../../../Specs/customizeJasmine.js";
import { createBaseMatchers } from "../../../Specs/createBaseMatchers.js";
import { createRendererMatchers } from "../../../Specs/createRendererMatchers.js";
import { createAsyncMatchers } from "../../../Specs/createAsyncMatchers.js";
import { defined, queryToObject } from "@cesium/engine";

const queryString = queryToObject(window.location.search.substring(1));

const webglValidation = defined(queryString.webglValidation);
const webglStub = defined(queryString.webglStub);
const release = window.location.search.indexOf("release") !== -1;
const includeCategory = queryString.category;
const excludeCategory = queryString.not;
const debugCanvasWidth = defined(queryString.debugCanvasWidth)
  ? parseInt(queryString.debugCanvasWidth)
  : undefined;
const debugCanvasHeight = defined(queryString.debugCanvasHeight)
  ? parseInt(queryString.debugCanvasHeight)
  : undefined;

window.CESIUM_BASE_URL = "base/packages/engine/Build";

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
      (includeCategory === "none" && !defined(queryString.spec))
    ) {
      return false;
    }

    return true;
  },
});

env.beforeEach(function () {
  const debug = !release;
  env.addMatchers({
    ...createBaseMatchers(debug),
    ...createRendererMatchers(),
  });
  env.addAsyncMatchers(createAsyncMatchers(debug));
});

customizeJasmine(env, {
  includeCategory,
  excludeCategory,
  webglValidation,
  webglStub,
  release,
  debugCanvasWidth,
  debugCanvasHeight,
});
