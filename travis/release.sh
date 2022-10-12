#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH == "cesium.com" ]; then
  npm --silent run website-release
else
  npm --silent run build -- --node
  npm --silent run coverage -- --browsers FirefoxHeadless --webgl-stub --failTaskOnError --suppressPassed
  npm --silent run make-zip
  npm pack &> /dev/null
fi

npm --silent run build-apps
