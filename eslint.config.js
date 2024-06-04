import globals from "globals";
import html from "eslint-plugin-html";
import configCesium from "eslint-config-cesium";
import jsdoc from "eslint-plugin-jsdoc";

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
    plugins: { html, jsdoc },
    settings: {
      jsdoc: {
        tagNamePreference: {
          demo: "demo",
          experimental: "experimental",
          internalConstructor: "internalConstructor",
          performance: "performance",
          privateparam: "privateparam",
          privateParam: "privateParam",
        },
      },
    },
    rules: {
      ...configCesium.configs.browser.rules,
      ...jsdoc.configs["flat/recommended-error"].rules,
      "no-unused-vars": [
        "error",
        { vars: "all", args: "none", caughtErrors: "none" },
      ],
      "jsdoc/require-jsdoc": "off", // Only lint existing jsdoc
      "jsdoc/no-undefined-types": "off", // Ignore types for now
      "jsdoc/valid-types": "off", // Our link tags are structured differently
      "jsdoc/no-defaults": "off", // We use default parameters instead of enforcing with ES6 for now
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-description": "off",
      "jsdoc/require-returns-type": "off",
      "jsdoc/require-returns-check": "off",
      "jsdoc/require-param-type": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-property-description": "off",
      "jsdoc/require-description": "off",
      "jsdoc/check-param-names": "off",
      "jsdoc/check-property-names": "off",
      "jsdoc/check-types": "off",
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
