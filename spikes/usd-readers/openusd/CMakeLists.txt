# CS-900's OpenUSD harness: harness.cpp linked against an OpenUSD 26.11.1
# wasm build (build_usd.py --build-target wasm), every library that build
# makes. Configured by build.sh with emcmake; built outside the repository.
cmake_minimum_required(VERSION 3.24)
project(usdReadersOpenUsd CXX)

find_package(pxr CONFIG REQUIRED)

add_executable(openusd_reader harness.cpp)
target_compile_options(openusd_reader PRIVATE -pthread -fexceptions)

# Every library whole, as OpenUSD's own wasm examples link: its registries
# and Plug's search-path setup are static constructors nothing references,
# which a plain static link drops. The installed targets ask for this in
# their link interface, but CMake reorders those flags away from the
# archives, so it is spelled out here. The targets also embed each
# library's plugInfo.json under /usd.
set(PXR_LIBS
  arch tf gf js trace work plug vt ts ar kind sdf pcp sdr usd usdUtils
  usdGeom usdShade usdLux usdSkel usdPhysics usdSemantics usdVol usdMedia
  usdRender usdUI usdProc usdHydra usdRi usdShaders usdLod usdProfiles)
string(REPLACE ";" "," PXR_LIST "${PXR_LIBS}")
target_link_libraries(openusd_reader PRIVATE
  "$<LINK_LIBRARY:WHOLE_ARCHIVE,${PXR_LIST}>")

# A module worker loads it: an ES module factory, threads from a pool of
# four made at start (TBB's workers), the in-memory file system for the
# sample's layers, built for size.
target_link_options(openusd_reader PRIVATE
  -pthread -fexceptions -Oz
  "SHELL:--use-port=zlib"
  "SHELL:-sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createOpenUsdReader"
  "SHELL:-sENVIRONMENT=web,worker"
  "SHELL:-sPTHREAD_POOL_SIZE=4"
  "SHELL:-sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=4GB"
  "SHELL:-sFORCE_FILESYSTEM=1"
  "SHELL:-sEXPORTED_FUNCTIONS=_cs_open,_cs_describe,_cs_close,_malloc,_free"
  "SHELL:-sEXPORTED_RUNTIME_METHODS=FS,ENV,ccall,UTF8ToString"
  "SHELL:-sINVOKE_RUN=0 --no-entry")
