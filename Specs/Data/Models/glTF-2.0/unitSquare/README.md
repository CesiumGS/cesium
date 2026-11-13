# UnitSquare

A unit square, in different flavors.

All files describe a square (0,0,0)-(1,1,0), with positions, normals,
and texture coordinates. The normals are always (0,0,1). The texture
coordinates are the (x,1-y) components of the vertex positions (i.e.
the (x,y) coordinates, but flipped vertically). The texture is a
simple 128x128 pixel dummy PNG texture.

The files that start with `unitSquare11x11` consist of a regular grid
of 11x11 = 121 vertices, representing and 200 triangles, stored with
`mode=GL_TRIANGLES`.

The flavors of this file are

- `unitSquare11x11_plain.glb`: Just the plain glTF, without compression
  or quantization, storing all attributes in their floating point
  representation, in non-interleaved accessors
- `unitSquare11x11_plain_interleaved.glb`: The same as `plain`, but
  storing the data in interleaved accessors
- `unitSquare11x11_draco.glb`: The `plain` version, draco-compressed
- `unitSquare11x11_meshopt.glb`: The `plain` version, meshopt-compressed
- `unitSquare11x11_quantized.glb`: The `plain` file, with quantization, storing
  the result in non-interleaved accessors
- `unitSquare11x11_quantized_interleaved.glb`: The same as `quantized`, but storing
  the result in interleaved accessors
- `unitSquare11x11_unsignedShortTexCoords.glb`: The same as `plain`, but with the
  texture coordinates stored as a `GL_UNSIGNED_SHORT (normalized)` accessor,
  in non-interleaved accessors
- `unitSquare11x11_unsignedShortTexCoords_interleaved.glb`: The same as
  `unsignedShortTexCoords`, stored with interleaved accessors
- `unitSquare11x11_unsignedShortTexCoords_quantized.glb`: The same as
  `unsignedShortTexCoords`, with additional quantization, stored in
  non-interleaved accessors
- `unitSquare11x11_unsignedShortTexCoords_quantized_interleaved.glb`: The same as
  `unsignedShortTexCoords_quantized`, but stored with interleaved accessors

The other representations aim at different primitive modes:

- `unitSquare11x2_triangleStrip.glb`: Contains 11x2 vertices, 11 in x-direction
  and 2 in y-direction, storing the triangles in `mode=GL_TRIANGLE_STRIP`
- `unitSquare5_triangleFan.glb`: Contains 5 vertices, one at (0.5, 0.5) and
  one at each corner of the unit square, representing the triangles in
  `mode=GL_TRIANGLE_FAN`

Other representations aim at further structural tests

- `unitSquare_fourPrimitives_plain.glb`: A unit square given as a single mesh
  that consists of four primitives, each with 3x3 vertices.

Most basic versions of the files have been created with a custom snippet
based on JglTF. The compressed, interleaved, and quantized versions have
been created with `glTF-Transform` (via https://gltf.report/).
The quantization in all cases was `{ quantizePosition: 14, quantizeNormal: 10 }`.
