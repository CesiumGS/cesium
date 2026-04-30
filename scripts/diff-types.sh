#!/usr/bin/env bash

# diff-types.sh
# Compares Cesium.d.ts on current branch and on main. The script
# should be run from a feature branch. Example:
#
# git checkout my-feature-branch
# ./scripts/diff-types.sh

git checkout main
npm run build-ts
cp Source/Cesium.d.ts Source/Cesium.main.d.ts
git checkout -
npm run build-ts
git diff --no-index Source/Cesium.main.d.ts Source/Cesium.d.ts
