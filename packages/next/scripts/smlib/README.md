# SMLib's build inputs

What `scripts/smlibTools.mjs` builds SMLib with (plan §13.33). The sources come
from NVIDIA-Omniverse/usd-brep at the commit pinned in `smlibTools.mjs`. They
are fetched into `~/.cesium-bench/smlib`, outside version control, and built
there with the pinned emsdk.

`bindings.cpp` is the C functions JavaScript calls, over SM_API's C++, and the
only input here: `src/brep/smlib.ts` is its other side. It covers these areas.

- **Solids.** Primitives, translation and rotation, booleans, validity and volume. Breps
  are pointers the caller frees.
- **Face tags.** An application attribute on every face of a solid, copied
  by SMLib to the faces a boolean makes from it, so each face of a result
  says which input it came from.
- **Export.** `smlib_brep_export` writes a brep as one record of doubles:
  its topology from SMLib's `SmBrepData`, every surface and curve as the NURBS
  SMLib holds (a surface that is a plane, cylinder, cone, sphere or torus also
  says so, with its frame and radii), each face's outward side (from the
  faceuse that bounds a void region), each edge's tolerance, and its face
  tags. The comment above the function gives the layout, and `readSmlibExport`
  reads it.
- **Tessellation.** SMLib's own meshes, in the face layout of
  `tessellateBrep`: vertices are unwelded between faces, and each vertex
  carries its face's index in the brep.

No exception crosses into JavaScript: a failure returns 0 or null, and
`smlib_status()` says why.

SMLib needs nothing else. Its TBB code compiles only with `SM_USE_TBB`, which
usd-brep's own build doesn't define either, so it runs on one thread. The
module has no threads, so it needs no SharedArrayBuffer or cross-origin
isolation. It runs one solid at a time per worker.

The flags are in `smlibTools.mjs`: C++17 at `-O3` with exceptions; SMLib's
release defines; a 4 MB stack, since the default 64 KB corrupts the heap;
memory growth; no filesystem. Each library compiles with its own include order,
because SMLib and SM_API both have a `StdAfx.h`. No usd-brep source is edited.
