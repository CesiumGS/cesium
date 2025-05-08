// Logic and values based on is-ci https://github.com/watson/is-ci/blob/master/bin.js
// which uses ci-info under the hood https://github.com/watson/ci-info/blob/master/index.js
// This just extracts the specific parts we need without adding more dependencies

const { env } = process;

const isCI = !!(
  env.CI !== "false" && // Bypass all checks if CI env is explicitly set to 'false'
  env.CI // GitHub CI
);

process.exit(isCI ? 0 : 1);
