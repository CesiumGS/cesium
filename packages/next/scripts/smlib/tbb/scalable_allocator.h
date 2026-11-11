// The serial stand-in's allocator (scripts/smlib/README.md): oneTBB's
// scalable_* functions are the C library's.
#ifndef CESIUM_SMLIB_TBB_SCALABLE_ALLOCATOR_H
#define CESIUM_SMLIB_TBB_SCALABLE_ALLOCATOR_H

#include <stdlib.h>

static inline void* scalable_malloc(size_t size) { return malloc(size); }
static inline void* scalable_calloc(size_t num, size_t size) {
  return calloc(num, size);
}
static inline void* scalable_realloc(void* ptr, size_t size) {
  return realloc(ptr, size);
}
static inline void scalable_free(void* ptr) { free(ptr); }

#endif
