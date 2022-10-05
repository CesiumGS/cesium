#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH == "cesium.com" ]; then
  npm --silent run website-release
  npm --silent run build-apps
else
  npm --silent run build -- --node
  npm --silent run coverage -- --browsers FirefoxHeadless --webgl-stub --failTaskOnError --suppressPassed
  npm --silent run make-zip
  npm pack &> /dev/null
  npm --silent run build-apps
fi
