#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH != "cesium.com" ]; then
  npm --silent run build -- --node
  npm --silent run coverage -- --browsers FirefoxHeadless --webgl-stub --failTaskOnError --suppressPassed
  # Run deployment for coverage report.
  npm --silent run deploy-s3 -- -b "cesium-dev" -d cesium/$TRAVIS_BRANCH -c 'no-cache' --confirm 
fi
