import globals from "globals";
import html from "eslint-plugin-html";
import configCesium from "@cesium/eslint-config";

export default [
  {
    ignores: [
      "**/Build/",
      "Documentation/**/*",
      "Source/*",
      "**/ThirdParty/",
      "Tools/**/*",
      "index.html",
      "index.release.html",
      "Apps/HelloWorld.html",
      "Apps/Sandcastle/jsHintOptions.js",
      "Apps/Sandcastle/gallery/gallery-index.js",
      "packages/engine/Source/Scene/GltfPipeline/**/*",
      "packages/engine/Source/Shaders/**/*",
      "Specs/jasmine/*",
      "**/*/SpecList.js",
    ],
  },
  {
    ...configCesium.configs.recommended,
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    files: ["**/*.cjs"],
    ...configCesium.configs.node,
  },
  {
    files: [".github/**/*.js", "scripts/**/*.js", "gulpfile.js", "server.js"],
    ...configCesium.configs.node,
    languageOptions: {
      ...configCesium.configs.node.languageOptions,
      sourceType: "module",
    },
  },
  {
    files: ["packages/**/*.js", "Apps/**/*.js", "Specs/**/*.js", "**/*.html"],
    ...configCesium.configs.browser,
    plugins: { html },
    rules: {
      ...configCesium.configs.browser.rules,
      "no-unused-vars": [
        "error",
        { vars: "all", args: "none", caughtErrors: "none" },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          // The pattern of Array.push.apply() can lead to stack
          // overflow errors when the source array is large.
          // See https://github.com/CesiumGS/cesium/issues/12053
          selector:
            "CallExpression[callee.object.property.name=push][callee.property.name=apply]",
          message:
            "Avoid Array.push.apply(). Use addAllToArray() for arrays of unknown size, or the spread syntax for arrays that are known to be small",
        },
      ],
    },
  },
  {
    files: ["Apps/Sandcastle/**/*", "Apps/TimelineDemo/**/*"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.amd,
        JSON: true,
        console: true,
        Sandcastle: true,
        Cesium: true,
      },
    },
    rules: {
      "no-alert": ["off"],
      "no-unused-vars": ["off"],
    },
  },
  {
    files: ["Apps/Sandcastle/load-cesium-es6.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    files: ["Specs/**/*", "packages/**/Specs/**/*"],
    languageOptions: {
      globals: {
        ...globals.jasmine,
      },
    },
    rules: {
      "no-self-assign": "off",
    },
  },
  {
    files: ["Specs/e2e/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        Cesium: true,
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    files: [".github/**/*"],
    rules: {
      "n/no-missing-import": "off",
    },
  },
];
