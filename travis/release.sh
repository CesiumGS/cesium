#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH == "cesium.com" ]; then
  npm --silent run website-release
else
  npm --silent run make-zip
  npm pack &> /dev/null
  npm pack --workspaces &> /dev/null
fi

npm --silent run build-apps

if [ $TRAVIS_BRANCH != "cesium.com" ]; then
  # verify prod package
  mkdir ../test
  cp cesium-*.tgz ../test
  cp Specs/test.*js ../test
  cd ../test
  npm install cesium-*.tgz
  NODE_ENV=development node test.cjs
  NODE_ENV=production node test.cjs
  node test.mjs
fi