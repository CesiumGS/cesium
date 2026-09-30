import baseConfig from "../../lint-staged.config.js";

export default {
  ...baseConfig,
  // https://github.com/lint-staged/lint-staged#how-can-i-resolve-typescript-tsc-ignoring-tsconfigjson-when-lint-staged-runs-via-husky-hooks
  "*.{js,cjs,mjs,ts,cts,mts}": [() => "tsc"],
};
