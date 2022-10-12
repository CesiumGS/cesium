#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH != "cesium.com" ]; then
  npm --silent run build -- --node
  npm --silent run test --workspace @cesium/engine -- --browsers ChromeCI --failTaskOnError --webgl-stub --suppressPassed
  npm --silent run test --workspace @cesium/widgets -- --browsers ChromeCI --failTaskOnError --webgl-stub --suppressPassed
fi
