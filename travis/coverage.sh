#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH != "cesium.com" ]; then
  npm --silent run build
  npm --silent run coverage -- --browsers FirefoxHeadless --webgl-stub --failTaskOnError --suppressPassed

  if [ $TRAVIS_SECURE_ENV_VARS ]; then
    aws s3 sync ./Build/Coverage s3://cesium-dev/cesium/$TRAVIS_BRANCH/Build/Coverage --delete --color on
  fi
fi
