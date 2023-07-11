#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH != "cesium.com" ]; then
  npm --silent run build
  npm --silent run coverage -- --browsers FirefoxHeadless --webgl-stub --failTaskOnError --suppressPassed

  # Exit early if AWS credentials are not defined
  [ -z "${AWS_ACCESS_KEY_ID}" ] && exit 0;

  # Deploy results
  aws s3 sync ./Build/Coverage s3://cesium-dev/cesium/$TRAVIS_BRANCH/Build/Coverage --delete --color on
fi
