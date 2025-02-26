/*eslint-env node*/
"use strict";

const path = require("path");
const minified = path.join(__dirname, "Build/Cesium/index.cjs");
const unminified = path.join(__dirname, "Build/CesiumUnminified/index.cjs");

// If in 'production' mode, use the combined/minified/optimized version of Cesium
module.exports =
  process.env.NODE_ENV === "production"
    ? require(minified)
    : require(unminified);
