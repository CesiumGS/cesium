#!/usr/bin/env bash

set -e
set -u

PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')
PACKAGE_NAME=$(cat package.json | grep name | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')
PUBLISHED_VERSION=$(npm view $PACKAGE_NAME version || echo '0.0.0')

echo $PUBLISHED_VERSION "->" $PACKAGE_VERSION

if [[ $PACKAGE_VERSION == $PUBLISHED_VERSION ]]
then
  echo "Version $PACKAGE_VERSION is same as npm published version! Not publishing."
  exit 0
fi

yarn clean

yarn release

npm publish

# git tag $PACKAGE_VERSION && git push origin $PACKAGE_VERSION
