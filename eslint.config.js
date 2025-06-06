import globals from "globals";
import html from "eslint-plugin-html";
import configCesium from "@cesium/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

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
      "Apps/Sandcastle2/",
      "packages/sandcastle/public/",
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
  ...[...tseslint.configs.recommended].map((config) => ({
    // This is needed to restrict to a specific path unless using the tseslint.config function
    // https://typescript-eslint.io/packages/typescript-eslint#config
    ...config,
    files: ["packages/sandcastle/**/*.{ts,tsx}"],
  })),
  {
    // This config came from the vite project generation
    files: ["packages/sandcastle/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["packages/sandcastle/gallery/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-alert": "off",
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
