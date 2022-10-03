#!/bin/bash
set -ev
if [ $TRAVIS_REPO_SLUG == "CesiumGS/cesium" ]; then
  npm --silent run deploy-s3 -- -c 'public, max-age=1800' --confirm
  npm --silent run deploy-status -- --status success --message Deployed
fi
