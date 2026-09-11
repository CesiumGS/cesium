import customizeJasmine from "../../../Specs/customizeJasmine.js";
import { createBaseMatchers } from "../../../Specs/createBaseMatchers.js";

const queryString = new URLSearchParams(window.location.search);

const release = window.location.search.indexOf("release") !== -1;
const includeCategory = queryString.get("category");
const excludeCategory = queryString.get("not");

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

const specFilter = new jasmine.HtmlSpecFilter({
  filterString: function () {
    return queryString.get("spec");
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
      (includeCategory === "none" && !queryString.has("spec"))
    ) {
      return false;
    }

    return true;
  },
});

env.beforeEach(function () {
  const debug = !release;
  env.addMatchers(createBaseMatchers(debug));
});

customizeJasmine(env, {
  includeCategory,
  excludeCategory,
  release,
});
