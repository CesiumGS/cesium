// Logic and values based on is-ci https://github.com/watson/is-ci/blob/master/bin.js
// which uses ci-info under the hood https://github.com/watson/ci-info/blob/master/index.js
// This just extracts the specific parts we need without adding more dependencies

const { env } = process;

const isCI = !!(
  env.CI !== "false" && // Bypass all checks if CI env is explicitly set to 'false'
  (env.BUILD_ID || // Jenkins, Cloudbees
    env.BUILD_NUMBER || // Jenkins, TeamCity
    env.CI || // Travis CI, CircleCI, Cirrus CI, Gitlab CI, Appveyor, CodeShip, dsari, Cloudflare Pages
    env.CI_APP_ID || // Appflow
    env.CI_BUILD_ID || // Appflow
    env.CI_BUILD_NUMBER || // Appflow
    env.CI_NAME || // Codeship and others
    env.CONTINUOUS_INTEGRATION || // Travis CI, Cirrus CI
    env.RUN_ID || // TaskCluster, dsari
    false)
);

process.exit(isCI ? 0 : 1);
