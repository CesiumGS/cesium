#!/bin/sh
../util/buildscripts/build.sh -p standard -r --releaseDir ../../built-i18n-test --releaseName rel  --layerOptimize 0 --optimize 0
../util/buildscripts/build.sh -p standard -p cdn -r --releaseDir ../../../built-i18n-test --releaseName cdn  --layerOptimize 0 --optimize 0
../util/buildscripts/build.sh -p ../i18n-test/i18n-test -r --layerOptimize 0 --optimize 0
../util/buildscripts/build.sh -p ../i18n-test/i18n-test-with-layers -r  --layerOptimize 0 --optimize 0
../util/buildscripts/build.sh -p ../i18n-test/i18n-test-with-layers-and-preloads -r  --layerOptimize 0 --optimize 0

