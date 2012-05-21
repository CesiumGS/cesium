#!/bin/sh

# Build script for dojox.mobile

if [ $# -eq 0 ]; then
  echo 'Usage: build separate|single [webkit]'
  echo '  separate  Create mobile.js that includes only dojox.mobile'
  echo '  single    Create a single dojo.js layer that includes dojox.mobile'
  echo '  webkit    Enable webkitMobile=true option (Loses PC browser support)'
  exit 1
fi

#optimize=shrinksafe
optimize=closure
profile=mobile
dir=release-mobile-separate
webkit=
#standalone=standaloneScrollable=true
if [ "$1" == "single" ]; then
  profile=mobile-all
fi
if [ "$1" == "single" ]; then
  dir=release-mobile-single
fi
shift 1
if [ "$1" == "webkit" ]; then
  webkit=webkitMobile=true
  shift 1
fi

cd ../../../util/buildscripts

./build.sh profile=$profile action=release optimize=$optimize layerOptimize=$optimize cssOptimize=comments releaseDir=../../$dir/ $webkit $standalone $*

cd ../../dojox/mobile/build
