"use strict";

module.exports = {
  extends: "./index.js",
  env: {
    browser: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: "module",
  },
  rules: {
    "no-implicit-globals": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-template": "error",
  },
};
