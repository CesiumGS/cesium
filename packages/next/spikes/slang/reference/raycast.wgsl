// Ray casting against draw geometry (World.castRays). The CPU picks the
// draws whose bounds a ray crosses and splits each into jobs of 64
// triangles; one workgroup runs a job, one thread tests one triangle
// (Möller–Trumbore, both faces) and keeps the nearest hit per ray with an
// atomic min on the distance's bits (non-negative floats order as u32s).
// Brute force over candidate draws: a BVH replaces the job list later
// (plan §13.10).

struct Ray {
  originHi: vec3f,         // Earth-fixed origin, split hi/lo
  maxDistance: f32,
  originLo: vec3f,
  _ray0: u32,
  direction: vec3f,        // unit, Earth-fixed axes
  _ray1: u32,
};

struct Job {
  ray: u32,
  record: u32,
  firstTriangle: u32,
  instance: u32,           // instance-table slot, or 0xffffffff
};

@group(0) @binding(0) var<storage, read> rays: array<Ray>;
@group(0) @binding(1) var<storage, read> jobs: array<Job>;
@group(0) @binding(2) var<storage, read> records: array<DrawRecord>;
@group(0) @binding(3) var<storage, read> transforms: array<Transform>;
@group(0) @binding(4) var<storage, read> instanceTable: array<Instance>;
@group(0) @binding(5) var<storage, read> vertices: array<f32>;
@group(0) @binding(6) var<storage, read> indices: array<u32>;
@group(0) @binding(7) var<storage, read_write> hits: array<atomic<u32>>;

const NONE: u32 = 0xffffffffu;

fn position(offset: u32, index: u32) -> vec3f {
  let b = offset + index * 3u;
  return vec3f(vertices[b], vertices[b + 1u], vertices[b + 2u]);
}

@compute @workgroup_size(64)
fn main(
  @builtin(workgroup_id) wg: vec3u,
  @builtin(num_workgroups) groups: vec3u,
  @builtin(local_invocation_index) lane: u32,
) {
  let jobIndex = wg.y * groups.x + wg.x;
  if (jobIndex >= arrayLength(&jobs)) {
    return;
  }
  let job = jobs[jobIndex];
  let r = records[job.record];
  let triangle = job.firstTriangle + lane;
  if (triangle * 3u + 2u >= r.indexCount) {
    return;
  }
  let t = transforms[r.transform];
  let ray = rays[job.ray];
  // Relative to the transform's origin: hi (as integers) and lo cancel
  // separately, so nearby geometry keeps float32 precision.
  let origin = hiLoDifference(ray.originHi, ray.originLo, t.originHi, t.originLo);
  var local = mat3x3f(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
  var offset = vec3f(0.0);
  if (job.instance != NONE) {
    let inst = instanceTable[job.instance];
    local = mat3x3f(
      vec3f(inst.row0.x, inst.row1.x, inst.row2.x),
      vec3f(inst.row0.y, inst.row1.y, inst.row2.y),
      vec3f(inst.row0.z, inst.row1.z, inst.row2.z),
    );
    offset = vec3f(inst.row0.w, inst.row1.w, inst.row2.w);
  }
  let first = r.firstIndex + triangle * 3u;
  let a = t.linear * (local * position(r.positionOffset, indices[first]) + offset);
  let b = t.linear * (local * position(r.positionOffset, indices[first + 1u]) + offset);
  let c = t.linear * (local * position(r.positionOffset, indices[first + 2u]) + offset);

  let e1 = b - a;
  let e2 = c - a;
  let p = cross(ray.direction, e2);
  let det = dot(e1, p);
  if (abs(det) < 1e-12) {
    return;
  }
  let inv = 1.0 / det;
  let s = origin - a;
  let u = dot(s, p) * inv;
  if (u < 0.0 || u > 1.0) {
    return;
  }
  let q = cross(s, e1);
  let v = dot(ray.direction, q) * inv;
  if (v < 0.0 || u + v > 1.0) {
    return;
  }
  let d = dot(e2, q) * inv;
  if (d >= 0.0 && d <= ray.maxDistance) {
    atomicMin(&hits[job.ray], bitcast<u32>(d));
  }
}
