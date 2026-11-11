# SMLib's build inputs

What `scripts/smlibTools.mjs` builds SMLib with (plan §13.33). The sources come
from NVIDIA-Omniverse/usd-brep at the commit pinned in `smlibTools.mjs`. They
are fetched into `~/.cesium-bench/smlib`, outside version control, and built
there with the pinned emsdk.

- `tbb/`: a serial stand-in for the oneTBB headers SMLib includes. That is
  `parallel_for` over an index range, `task_arena::execute`, and the
  `scalable_*` allocator. `parallel_for` runs in order on the calling thread,
  and the allocator is the C library's. The module has no threads, so it needs
  no SharedArrayBuffer or cross-origin isolation, and runs one solid at a time
  per worker. If SMLib starts using more of TBB, the build fails with a
  missing name, and the stand-in grows by that name.
- `bindings.cpp`: the C functions JavaScript calls, over SM_API's C++. They
  cover primitives, translation, booleans, validity, volume and tessellation.
  The mesh has the faces layout of `tessellateBrep`: vertices are unwelded
  between faces, and each vertex carries its face's index in the brep.
  Breps and meshes are pointers the caller frees. No exception crosses into
  JavaScript: a failure returns 0 or null, and `smlib_status()` says why.

The flags are in `smlibTools.mjs`: C++17 at `-O3` with exceptions; SMLib's
release defines; a 4 MB stack, since the default 64 KB corrupts the heap;
memory growth; no filesystem. Each library compiles with its own include order,
because SMLib and SM_API both have a `StdAfx.h`. No usd-brep source is edited.
