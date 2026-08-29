import customizeJasmine from "../../../Specs/customizeJasmine.js";
import { createBaseMatchers } from "../../../Specs/createBaseMatchers.js";
import { defined, queryToObject } from "../index.js";

const queryString = queryToObject(window.location.search.substring(1));

const release = window.location.search.indexOf("release") !== -1;
const categoryString = queryString.category;
const excludeCategoryString = queryString.not;

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

env.beforeEach(function () {
  env.addMatchers(createBaseMatchers(!release));
});

customizeJasmine(env, {
  includedCategory: categoryString,
  excludedCategory: excludeCategoryString,
  release,
});
