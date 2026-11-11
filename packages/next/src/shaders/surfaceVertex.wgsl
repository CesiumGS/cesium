// The surface shaders' vertex entry points (surface.slang): a unit of its
// own because their position must be `@invariant` (the opaque pass's depth,
// `vsDepth`, and its shading, `vs`, must agree to the bit: the shading tests
// for equal depth), which Slang doesn't emit. Everything else is Slang's:
// these put out what `surfaceVertex`, `surfacePointVertex`,
// `surfaceDepthVertex` and the patch pair return, at the locations
// surface.slang's fragment entry points read (`SurfaceVaryings`, in field
// order: test/linker.test.ts checks the two agree).

struct VsOut {
  @builtin(position) @invariant position: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) color: vec4f,
  @location(3) @interpolate(flat) ids: vec3u,
  @location(4) relPosition: vec3f,
  @location(5) tangent: vec4f,
  @location(6) airInscatter: vec3f,
  @location(7) airTransmittance: vec3f,
  @location(8) positionMC: vec3f,
  @location(9) named0: vec4f,
  @location(10) named1: vec4f,
  @location(11) named2: vec4f,
  @location(12) named3: vec4f,
};

fn vsOut(v: SurfaceVertex) -> VsOut {
  return VsOut(
    v.position, v.normal, v.uv, v.color, v.ids, v.relPosition, v.tangent,
    v.airInscatter, v.airTransmittance, v.positionMC,
    v.named0, v.named1, v.named2, v.named3,
  );
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32, @location(0) item: u32) -> VsOut {
  return vsOut(surfaceVertex(vertexIndex, item));
}

@vertex
fn vsPoints(@builtin(vertex_index) vertexIndex: u32, @location(0) item: u32) -> VsOut {
  return vsOut(surfacePointVertex(vertexIndex, item));
}

@vertex
fn vsDepth(@builtin(vertex_index) vertexIndex: u32, @location(0) item: u32) -> VsOut {
  return vsOut(surfaceDepthVertex(vertexIndex, item));
}

// A patch draw's (RecordFlags.patches): one instance a chunk of cells, the
// chunk (the record, a span, its cells' origin and counts) read from the
// draw's own list in place of the item list.
@vertex
fn vsPatch(@builtin(vertex_index) vertexIndex: u32, @location(0) chunk: vec4u) -> VsOut {
  return vsOut(surfacePatchVertex(vertexIndex, chunk));
}

@vertex
fn vsPatchDepth(@builtin(vertex_index) vertexIndex: u32, @location(0) chunk: vec4u) -> VsOut {
  return vsOut(surfacePatchDepthVertex(vertexIndex, chunk));
}
