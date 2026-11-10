# BENTLEY_brep

## Contents

- [Status](#status)
- [Dependencies](#dependencies)
- [Overview](#overview)
- [Schema](#schema)
- [Parameterizations](#parameterizations)
- [The fallback rule](#the-fallback-rule)
- [Open questions](#open-questions)

## Status

Draft, for this proof of concept. Nothing here is fixed: names, layout and
versioning are free to change before any review.

## Dependencies

Written against glTF 2.0. `ids` use the same string encoding as
`EXT_structural_metadata`.

## Overview

A primitive's triangles are a fallback for a boundary representation (a
b-rep): a solid's faces, edges and vertices, with each face on an analytic
surface or a list of rational Bézier patches. This extension carries the b-rep
beside the triangles, so a client that understands it can draw and measure the
exact surface, and a client that does not draws the triangles.

The b-rep is plain typed arrays, one bufferView each, so it moves between
workers without copying and a host with its own modeler can write it directly.
Lengths are metres and angles are radians. All geometry is float64.

## Schema

The extension is listed in `extensionsUsed` and is never in
`extensionsRequired`.

### Root

`extensions.BENTLEY_brep` is an object:

| Property | Type       | Description          |
| -------- | ---------- | -------------------- |
| `breps`  | `object[]` | The b-reps, indexed. |

### b-rep

Every array property below is a bufferView index. The bufferView's bytes are
the array, little-endian, with the element type given in the table. The
bufferView's byteOffset must be a multiple of the element size (a writer pads
each array to 8 bytes), and its byte length a whole number of elements. A
bufferView of an empty array may have byte length 0.

| Property          | Element type | Count               | Description                                                                                 |
| ----------------- | ------------ | ------------------- | ------------------------------------------------------------------------------------------- |
| `version`         | number       |                     | The content version; goes up when the geometry changes.                                     |
| `surfaceKind`     | Uint8        | S                   | Surface kinds: 0 plane, 1 cylinder, 2 cone, 3 sphere, 4 torus, 5 Bézier.                    |
| `surfaceFrame`    | Float64      | 9 S                 | Origin (3, m), x axis (3), y axis (3), unit and orthogonal; z = x × y. Unused for Bézier.   |
| `surfaceParams`   | Float64      | 2 S                 | Cylinder [r, 0]; cone [r at v = 0, half-angle]; sphere [r, 0]; torus [R, r]; else 0.        |
| `surfacePatches`  | Uint32       | 2 S                 | [first patch, patch count]; Bézier only, else [0, 0].                                       |
| `patchDegree`     | Uint8        | 2 P                 | Degree in u, degree in v (1 to 7).                                                          |
| `patchFirst`      | Uint32       | P                   | Index of the patch's first control point in `patchPoints`, in points. Points run u fastest. |
| `patchPoints`     | Float64      | 4 per control point | Homogeneous: x·w, y·w, z·w, w (w > 0), m.                                                   |
| `patchDomain`     | Float64      | 4 P                 | u0, u1, v0, v1: the patch's span in its surface's parameter space.                          |
| `faceSurface`     | Uint32       | F                   | The face's surface.                                                                         |
| `faceReversed`    | Uint8        | F                   | 1 when the face's outward normal is −(∂u × ∂v), else 0.                                     |
| `faceLoops`       | Uint32       | 2 F                 | [first loop, loop count]. A face's first loop is its outer loop.                            |
| `loopUses`        | Uint32       | 2 per loop          | [first use, use count]. Outer loops run counter-clockwise in (u, v), inner ones clockwise.  |
| `useEdge`         | Uint32       | U                   | The use's edge.                                                                             |
| `useReversed`     | Uint8        | U                   | 1 when the use runs from the edge's end vertex to its start.                                |
| `usePcurve`       | Uint32       | 2 U                 | [first segment, segment count] in `curves2`, already in the use's direction.                |
| `edgeVertices`    | Uint32       | 2 E                 | Start vertex, end vertex.                                                                   |
| `edgeCurve`       | Uint32       | 2 E                 | [first segment, segment count] in `curves3`, start to end.                                  |
| `edgeTolerance`   | Float32      | E                   | How far the edge's curve and its uses' images may be apart, m.                              |
| `vertexPosition`  | Float64      | 3 V                 | m.                                                                                          |
| `vertexTolerance` | Float32      | V                   | How far the vertex may be from its edges' ends, m.                                          |
| `curves2`         | object       |                     | Curve segments in 2D (u, v): `degree`, `first`, `points`.                                   |
| `curves3`         | object       |                     | Curve segments in 3D, m: `degree`, `first`, `points`.                                       |
| `ids`             | object       |                     | `values` and `offsets`.                                                                     |

S, P, F, U, E and V are the counts of surfaces, patches, faces, edge uses,
edges and vertices. A reader derives them from the arrays and checks that
every count above agrees.

### Curves

`curves2` and `curves3` are each an object of three bufferView indices. The
segments are rational Bézier curves of degree 1 to 3.

| Property | Element type | Count                              | Description                                   |
| -------- | ------------ | ---------------------------------- | --------------------------------------------- |
| `degree` | Uint8        | one per segment                    | 1 to 3.                                       |
| `first`  | Uint32       | one per segment                    | The segment's first control point, in points. |
| `points` | Float64      | 3 per point (2D), 4 per point (3D) | Homogeneous: x·w, y·w, (z·w,) w; w > 0.       |

### IDs

`ids` holds stable source IDs: the faces', then the edges', then the vertices'.
An empty string means none.

| Property  | Element type | Count         | Description                                                                              |
| --------- | ------------ | ------------- | ---------------------------------------------------------------------------------------- |
| `values`  | Uint8        | any           | The IDs' UTF-8 bytes, joined.                                                            |
| `offsets` | Uint32       | F + E + V + 1 | ID i is `values[offsets[i] .. offsets[i + 1]]`, as in `EXT_structural_metadata` strings. |

### Primitive

`primitive.extensions.BENTLEY_brep` is an object:

| Property | Type   | Description                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------------- |
| `brep`   | number | Index into the root's `breps`: this primitive's triangles are that b-rep's fallback mesh. |

## Parameterizations

With frame origin `o`, axes `x` and `y`, and `z = x × y`. Units: u and v in
radians where angular, metres otherwise.

- Plane: `P = o + u·x + v·y`.
- Cylinder: `P = o + r(cos u·x + sin u·y) + v·z`.
- Cone: `P = o + (r + v·tan a)(cos u·x + sin u·y) + v·z`.
- Sphere: `P = o + r(cos v(cos u·x + sin u·y) + sin v·z)`. u is longitude, v
  latitude.
- Torus: `P = o + (R + r·cos v)(cos u·x + sin u·y) + r·sin v·z`.
- Bézier: the patch whose domain holds (u, v). The patch's local parameters are
  `s = (u − u0)/(u1 − u0)` and `t = (v − v0)/(v1 − v0)`. A point on a shared
  boundary takes the lower-index patch.

## The fallback rule

The primitive's triangles stand for the b-rep. A client without the extension
draws the triangles. A client with it may draw the b-rep instead, and then
must not also draw the triangles. If the b-rep is missing, malformed or
truncated, the client drops it with a warning and draws the triangles.

## Open questions

- Whether the arrays belong in bufferViews of their own, or in one buffer with
  an index, as a compact binary table would.
- Whether tessellation tolerance, or a hint of how far the fallback triangles
  deviate from the surface, belongs in the b-rep.
- How a b-rep's faces map onto the fallback triangles, so a picked triangle
  names its face.
- Precision: float64 for geometry and float32 for tolerances, and whether
  large coordinates need a stated origin.
- Versioning: whether `version` is a content counter only, or also a format
  version.
- Whether Bézier patches are the right interchange form for freeform
  surfaces, against NURBS with knot vectors.
- Whether bufferViews of byte length 0 should be allowed for empty arrays.
