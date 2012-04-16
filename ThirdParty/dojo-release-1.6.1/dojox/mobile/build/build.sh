#!/bin/sh

# Build script for dojox.mobile
# 
# Note:
# You may need to manually apply the following patch to your build script
# in order to completely remove all the unused modules from your build.
# The patch disables finding the dojo base modules being used from the
# dependent modules with a simple pattern matching, which sometimes
# unexpectedly picks up unused modules.
# For example, if you see query.js and NodeList.js baked into your build,
# while you are not using them, then it is worth trying the patch.
# The file to be patched is util/buildscripts/jslib/buildUtil.js.
# 
# --- buildUtil.js-orig
# +++ buildUtil.js
# @@ -1506,7 +1506,7 @@
#    var addedResources = {};
# -  while((matches = buildUtil.baseMappingRegExp.exec(tempContents))){
# +  while(false&&(matches = buildUtil.baseMappingRegExp.exec(tempContents))){
#        var baseResource = buildUtil.baseMappings[matches[1]];
#        //Make sure we do not add the dependency to its source resource.

if [ $# -eq 0 ]; then
  echo 'Usage: build separate|single [webkit]'
  echo '  separate  Create mobile.js that includes only dojox.mobile'
  echo '  single    Create a single dojo.js layer that includes dojox.mobile'
  echo '  webkit    Enable webkitMobile=true option (Loses PC browser support)'
  exit 1
fi

optimize=shrinksafe
profile=mobile
dir=release-mobile-separate
webkit=
if [ "$1" == "single" ]; then
  profile=mobile-all
fi
if [ "$1" == "single" ]; then
  dir=release-mobile-single
fi
if [ "$2" == "webkit" ]; then
  webkit=webkitMobile=true
fi

cd ../../../util/buildscripts

./build.sh profile=$profile action=release customDijitBase=true optimize=$optimize layerOptimize=$optimize cssOptimize=comments releaseDir=../../$dir/ $webkit

cd ../../dojox/mobile/build
