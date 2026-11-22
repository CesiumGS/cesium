#!/bin/zsh
# Builds CS-900's OpenUSD harness outside the repository, against the
# OpenUSD wasm build in the setup store (spikes/usd-readers/README.md says
# how that build was made). Output: <store>/openusd-26.11.1/harness/
# openusd_reader.{js,wasm}. Nothing here ships.
#
#   spikes/usd-readers/openusd/build.sh
set -e
here=${0:A:h}
store=${USD_READERS_STORE:-$HOME/.cesium-bench/usd-readers}
usd=$store/openusd-26.11.1
source ${EMSDK_DIR:-$HOME/.cesium-bench/emsdk/7.0.0}/emsdk_env.sh >/dev/null 2>&1
emcmake cmake -S $here -B $usd/harness-build -G "Unix Makefiles" \
  -DCMAKE_BUILD_TYPE=MinSizeRel \
  -DCMAKE_PREFIX_PATH=$usd/inst -DCMAKE_FIND_ROOT_PATH=$usd/inst \
  -Dpxr_DIR=$usd/inst
cmake --build $usd/harness-build --parallel 4
mkdir -p $usd/harness
cp $usd/harness-build/openusd_reader.js $usd/harness-build/openusd_reader.wasm $usd/harness/
ls -l $usd/harness
