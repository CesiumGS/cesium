// Minimal shaders for spikes/gpu-check.ts. No loops; every index is clamped.

struct Counts {
  // Written by the page: how many instances to draw (clamped below).
  instances: u32,
}

@group(0) @binding(0) var<storage, read> counts: Counts;
// Five words, as drawIndexedIndirect reads them (drawIndirect reads the first four).
@group(0) @binding(1) var<storage, read_write> args: array<u32, 5>;

const INDEX_COUNT: u32 = 3u;
const MAX_INSTANCES: u32 = 4u;

@compute @workgroup_size(1)
fn writeArgs() {
  args[0] = INDEX_COUNT;
  args[1] = min(counts.instances, MAX_INSTANCES);
  args[2] = 0u;
  args[3] = 0u;
  args[4] = 0u;
}

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
}

// One triangle per instance, shifted by the instance index.
@vertex
fn vertexMain(
  @location(0) position: vec2<f32>,
  @builtin(instance_index) instance: u32,
) -> VertexOut {
  let slot = f32(min(instance, MAX_INSTANCES - 1u));
  var out: VertexOut;
  out.position = vec4<f32>(position * 0.4 + vec2<f32>(slot * 0.3 - 0.45, 0.0), 0.0, 1.0);
  out.color = vec3<f32>(0.2 + 0.2 * slot, 0.6, 0.9 - 0.2 * slot);
  return out;
}

@fragment
fn fragmentMain(in: VertexOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.color, 1.0);
}
