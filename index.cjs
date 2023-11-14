/*eslint-env node*/
"use strict";

const path = require("path");

// If in 'production' mode, use the combined/minified/optimized version of Cesium
if (process.env.NODE_ENV === "production") {
  // eslint-disable-next-line global-require
  module.exports = require(path.join(__dirname, "Build/Cesium/index.cjs"));
  return;
}

module.exports = require(path.join(
  __dirname,
  "Build/CesiumUnminified/index.cjs"
));
