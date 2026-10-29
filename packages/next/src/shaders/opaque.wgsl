// Opaque geometry: vertex pulling from the world's geometry arena, per-draw
// data from the prep kernel's output. `DRAW_INDEX_*` is specialized by the
// engine: `instance_index` when `indirect-first-instance` is supported,
// otherwise an instance-step vertex attribute set per draw in the bundle.

@group(0) @binding(0) var<uniform> view: View;
@group(1) @binding(0) var<storage, read> records: array<DrawRecord>;
@group(1) @binding(1) var<storage, read> instances: array<DrawInstance>;
@group(1) @binding(2) var<storage, read> vertices: array<f32>;

struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) @interpolate(flat) draw: u32,
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32, DRAW_INDEX_PARAM) -> VsOut {
  let draw = DRAW_INDEX_EXPR;
  // vertex_index already includes the draw's baseVertex.
  let base = vertexIndex * 6u;
  let position = vec3f(vertices[base], vertices[base + 1u], vertices[base + 2u]);
  let normal = vec3f(vertices[base + 3u], vertices[base + 4u], vertices[base + 5u]);
  let m = instances[draw].relModel;
  var out: VsOut;
  out.position = view.viewProj * (m * vec4f(position, 1.0));
  out.normal = (m * vec4f(normal, 0.0)).xyz;
  out.draw = draw;
  return out;
}

struct FsOut {
  @location(0) color: vec4f,
  @location(1) featureId: vec2u, // (lo16, hi16): rg16uint target
};

@fragment
fn fs(in: VsOut) -> FsOut {
  let r = records[in.draw];
  let n = normalize(in.normal);
  // Placeholder lighting until the 1.x PBR/IBL port lands in M1:
  // sun at intensity 2 (the 1.x default) plus a flat ambient term.
  let diffuse = max(dot(n, view.sunDirection.xyz), 0.0);
  let lit = r.color.rgb * (0.12 + 2.0 * diffuse);
  var out: FsOut;
  out.color = vec4f(lit, 1.0);
  out.featureId = vec2u(r.featureId & 0xffffu, r.featureId >> 16u);
  return out;
}
