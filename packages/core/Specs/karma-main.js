/*global __karma__*/
import customizeJasmine from "../../../Specs/customizeJasmine.js";
import { createBaseMatchers } from "../../../Specs/createBaseMatchers.js";

let includeCategory = "";
let excludeCategory = "";
let release = false;

if (__karma__.config.args) {
  // Karma's client.args order is shared across all workspaces; core only cares
  // about category filtering and the release flag, not the WebGL/canvas args.
  includeCategory = __karma__.config.args[0];
  excludeCategory = __karma__.config.args[1];
  release = __karma__.config.args[4];
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

const env = jasmine.getEnv();
env.beforeEach(function () {
  const debug = !release;
  env.addMatchers(createBaseMatchers(debug));
});
customizeJasmine(env, {
  includeCategory,
  excludeCategory,
  release,
});
