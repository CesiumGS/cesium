#!/bin/bash
set -ev
if [ $TRAVIS_BRANCH != "cesium.com" ]; then
  npm --silent run deploy-set-version -- --buildVersion $TRAVIS_BRANCH.$TRAVIS_BUILD_NUMBER
fi
