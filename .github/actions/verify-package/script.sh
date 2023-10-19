#!/bin/bash
set -ev

node -e "const Cesium = require('./');"
NODE_ENV=development node Specs/test.cjs
NODE_ENV=production node Specs/test.cjs
node Specs/test.mjs

for filename in packages/**/Specs/test.mjs; do
    node $filename
done

mkdir ../test
cp cesium*.tgz ../test
cp Specs/test.*js ../test
cd ../test

npm install cesium*.tgz
NODE_ENV=development node test.cjs
NODE_ENV=production node test.cjs
node test.mjs