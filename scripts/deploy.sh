#!/bin/bash
set -ev
if [ $TRAVIS_REPO_SLUG == "CesiumGS/cesium" ]; then
  npm --silent run deploy-s3 -- -b cesium-dev -d cesium/$TRAVIS_BRANCH --confirm -c 'no-cache'
  npm --silent run deploy-status -- --status success --message Deployed
fi
