"use strict";

module.exports = {
  extends: "./index.js",
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2019,
  },
  rules: {
    "global-require": "error",
    "no-buffer-constructor": "error",
    "no-new-require": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-template": "error",
  },
};
