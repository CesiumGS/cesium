#!/bin/bash
set -ev
if [ $TRAVIS_SECURE_ENV_VARS ]; then
  # Files deployed to cesium.com are "production", and should be cached at edge locations for 
  # better performance. Otherwise, this is a development deploy and nothing should be cached
  if [ $TRAVIS_BRANCH == "cesium.com" ]; then
    echo "Uploading files to cesium.com..."
    npm --silent run deploy-s3 -- -b "cesium.com-next" -c 'public, max-age=1800' --confirm
  else
    npm --silent run deploy-s3 -- -b "cesium-dev" -d cesium/$TRAVIS_BRANCH -c 'no-cache' --confirm 
  fi
  npm --silent run deploy-status -- --status success --message Deployed
fi
