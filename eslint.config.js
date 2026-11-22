import globals from "globals";
import html from "eslint-plugin-html";
import jsdoc from "eslint-plugin-jsdoc";
import nodePlugin from "eslint-plugin-n";
import configCesium from "@cesium/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import seatbelt from "eslint-seatbelt";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 2.0's TypeScript: its packages (packages/next until it becomes the
// umbrella) and the harness at the root (CS-835).
const NEXT_TS = [
  "packages/*/src/**/*.{ts,tsx}",
  "packages/cesium/*.ts",
  "{test,parity,bench,lab,handbook,examples,demo,spikes,standalone,scripts,tools}/**/*.{ts,tsx}",
  "*.ts",
];

export default [
  tseslint.configs.base,
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
      "Apps/Sandcastle2/",
      "apps/sandcastle/public/",
      "apps/sandcastle/templates/Sandcastle.d.ts",
      "apps/sandcastle/templates/Sandcastle.js",
      "apps/sandcastle/gallery/pagefind/",
      "packages/engine/Source/Shaders/**/*",
      "Specs/jasmine/*",
      "**/*/SpecList.js",
      // 2.0's build output (git-ignored), written by `npm run build`, `npm
      // run build:lib` and `tsc --build`.
      "dist/",
      "packages/*/dist/",
      "packages/cesium/dist-lib/",
    ],
  },
  {
    ...configCesium.configs.recommended,
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    files: ["**/*.cjs"],
    ...configCesium.configs.node,
  },
  {
    files: [
      ".github/**/*.js",
      "scripts/**/*.js",
      "apps/sandcastle/scripts/**/*.js",
      "gulpfile.js",
      "gulpfile.apps.js",
      "gulpfile.makezip.js",
      "server.js",
    ],
    ...configCesium.configs.node,
    languageOptions: {
      ...configCesium.configs.node.languageOptions,
      sourceType: "module",
    },
  },
  {
    files: ["packages/**/*.js", "apps/**/*.js", "Specs/**/*.js", "**/*.html"],
    ignores: ["apps/sandcastle/scripts/**/*.js"],
    ...configCesium.configs.browser,
    plugins: { html, "eslint-seatbelt": seatbelt },
    processor: "eslint-seatbelt/seatbelt",
    settings: {
      seatbelt: {
        seatbeltFile: join(__dirname, "eslint.seatbelt.tsv"),
      },
    },
    rules: {
      ...configCesium.configs.browser.rules,
      "eslint-seatbelt/configure": "error",
      "no-unused-vars": [
        "error",
        { vars: "all", args: "none", caughtErrors: "none" },
      ],
      // There were too many errors to address when this was first turned on.
      // Using eslint-seatbelt to gradually address them
      "no-useless-assignment": "error",
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
      // When ES6 class implementations refer to scratch variable instances of
      // the same class, ESLint raises a use-before-define error. At runtime
      // this is just fine, so configure ESLint to allow it in upper scopes.
      "no-use-before-define": [
        "error",
        { variables: false, functions: false, classes: false },
      ],
      // Prefer @ts-expect-error (with description) over @ts-ignore. Allow both
      // @ts-check and @ts-nocheck during transition to type checking.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 3,
          "ts-ignore": true,
          "ts-expect-error": "allow-with-description",
          "ts-check": false,
          "ts-nocheck": false,
        },
      ],
      // Disallow e.g. `new Cartesian3.fromDegrees(...)`; invalid with ES6 classes.
      "new-cap": ["error", { capIsNew: true }],
    },
  },
  {
    // Sources in a package may only import packages declared in that package's
    // own package.json. Published files may not import devDependencies.
    files: [
      "packages/**/*.{js,mjs,cjs,ts,tsx}",
      "apps/**/*.{js,mjs,cjs,ts,tsx}",
      // 2.0's harness, moved from packages/next to the root (CS-835).
      "{test,parity,bench,lab,handbook,examples,demo,spikes,standalone,tools}/**/*.{js,mjs,cjs,ts,tsx}",
      "*.ts",
    ],
    ignores: [
      "**/*.d.ts",
      // Build scripts are run from the repo root, so use its devDependencies
      "packages/*/scripts/**/*",
      "packages/*/vite.*.ts",
      "apps/*/scripts/**/*",
    ],
    plugins: { n: nodePlugin },
    rules: {
      "n/no-extraneous-import": "error",
      "n/no-unpublished-import": "error",
    },
  },
  {
    files: ["**/*.js"],
    plugins: { jsdoc },
    settings: {
      jsdoc: {
        preferredTypes: {
          Object: "object",
          "object.<>": "Object<>",
          "object<>": "Object<>",
        },
      },
    },
    rules: {
      "jsdoc/check-types": "error",
    },
  },
  ...[...tseslint.configs.recommended].map((config) => ({
    // This is needed to restrict to a specific path unless using the tseslint.config function
    // https://typescript-eslint.io/packages/typescript-eslint#config
    ...config,
    files: ["apps/sandcastle/**/*.{ts,tsx}"],
  })),
  {
    // This config came from the vite project generation
    files: ["apps/sandcastle/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh.plugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  ...[...tseslint.configs.recommended].map((config) => ({
    ...config,
    files: NEXT_TS,
  })),
  {
    files: NEXT_TS,
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The TypeScript compiler checks identifiers, including WebGPU types.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "none", caughtErrors: "none" },
      ],
      // Module-level scratch values are declared after the code that uses them.
      "no-use-before-define": [
        "error",
        { variables: false, functions: false, classes: false },
      ],
    },
  },
  {
    // Dyno: flag deprecated APIs, such as MUI props @stratakit/mui marks
    // unsupported (CS-707). The rule needs type information, so it's scoped
    // to Dyno's suite to keep lint elsewhere fast. Uses that were already
    // there are held in eslint.seatbelt.tsv, which only lets their count
    // fall.
    files: ["bench/suite/**/*.ts", "bench/suite/**/*.tsx"],
    plugins: { "eslint-seatbelt": seatbelt },
    processor: "eslint-seatbelt/seatbelt",
    settings: {
      seatbelt: {
        seatbeltFile: join(__dirname, "eslint.seatbelt.tsv"),
      },
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "eslint-seatbelt/configure": "error",
      "@typescript-eslint/no-deprecated": "error",
    },
  },
  {
    // Node scripts in the PoC (benchmark runner, shader build). The runner's
    // page.evaluate callbacks run in the browser, hence both global sets.
    files: [
      "packages/*/src/**/*.mjs",
      "{test,parity,bench,lab,handbook,examples,demo,spikes,standalone,scripts,tools}/**/*.mjs",
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ["apps/sandcastle/gallery/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-alert": "off",
    },
  },
  {
    files: ["apps/sandcastle/gallery/hello-world/main.js"],
    rules: {
      // ignore this rule here to avoid the excessive eslint-disable comment in our bare minimum example
      "no-unused-vars": "off",
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
