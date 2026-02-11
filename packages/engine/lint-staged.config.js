export default {
  // https://github.com/lint-staged/lint-staged#how-can-i-resolve-typescript-tsc-ignoring-tsconfigjson-when-lint-staged-runs-via-husky-hooks
  "*.{js,cjs,mjs,ts,cts,mts}": [() => "tsc"],
};
