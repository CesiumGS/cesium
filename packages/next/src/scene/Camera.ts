import * as v3 from "../math/vec3.ts";
import * as m4 from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";

/**
 * A perspective camera in the Earth-fixed frame (float64). Rendering is
 * camera-relative: the view matrix is rotation-only, and draws are translated
 * by (origin - position) on the GPU.
 *
 * `fov` follows 1.x `PerspectiveFrustum` semantics: it is the field of view of
 * the larger viewport dimension.
 */
export class Camera {
  readonly position = v3.vec3();
  readonly direction = v3.vec3(0, 0, -1);
  readonly up = v3.vec3(0, 1, 0);
  readonly right = v3.vec3(1, 0, 0);
  fov = Math.PI / 3;
  near = 0.1;
  /** Incremented on every change so views and links can detect motion cheaply. */
  version = 0;

  copyFrom(other: Camera): this {
    v3.copy(this.position, other.position);
    v3.copy(this.direction, other.direction);
    v3.copy(this.up, other.up);
    v3.copy(this.right, other.right);
    this.fov = other.fov;
    this.near = other.near;
    this.version++;
    return this;
  }

  /** Vertical field of view for an aspect ratio, as computed by 1.x. */
  fovy(aspect: number): number {
    return aspect <= 1
      ? this.fov
      : Math.atan(Math.tan(this.fov * 0.5) / aspect) * 2.0;
  }

  /**
   * Points the camera at `target` from `range` meters away, with heading
   * (clockwise from north) and pitch (negative looks down) in the target's
   * east-north-up frame. Same convention as 1.x `HeadingPitchRange`.
   */
  lookAt(
    target: Vec3,
    heading: number,
    pitch: number,
    range: number,
    ellipsoid = Ellipsoid.WGS84,
  ): this {
    const enu = eastNorthUpToFixedFrame(target, ellipsoid, scratchMat);
    const p = Math.min(Math.max(pitch, -Math.PI / 2), Math.PI / 2);
    const h = heading - Math.PI / 2;
    // Offset in ENU, matching 1.x offsetFromHeadingPitchRange.
    const ox = -range * Math.cos(p) * Math.cos(h);
    const oy = range * Math.cos(p) * Math.sin(h);
    const oz = -range * Math.sin(p);
    const localUp = v3.set(scratchA, enu[8]!, enu[9]!, enu[10]!);
    v3.set(
      this.position,
      target[0]! + enu[0]! * ox + enu[4]! * oy + enu[8]! * oz,
      target[1]! + enu[1]! * ox + enu[5]! * oy + enu[9]! * oz,
      target[2]! + enu[2]! * ox + enu[6]! * oy + enu[10]! * oz,
    );
    v3.normalize(this.direction, v3.sub(this.direction, target, this.position));
    return this.orient(localUp);
  }

  /** Re-derives right/up from `direction` and a reference up vector. */
  orient(referenceUp: Vec3): this {
    v3.cross(this.right, this.direction, referenceUp);
    if (v3.length(this.right) < 1e-10) {
      // Looking straight along the reference up; pick any perpendicular.
      v3.cross(this.right, this.direction, v3.set(scratchB, 1, 0, 0));
    }
    v3.normalize(this.right, this.right);
    v3.normalize(this.up, v3.cross(this.up, this.right, this.direction));
    this.version++;
    return this;
  }

  /** Rotates position and orientation about `axis` (through the Earth's center). */
  rotateAroundCenter(axis: Vec3, angle: number): this {
    rotate(this.position, axis, angle);
    rotate(this.direction, axis, angle);
    rotate(this.up, axis, angle);
    rotate(this.right, axis, angle);
    this.version++;
    return this;
  }

  /** Rotation-only view matrix (camera at the origin). */
  viewRotation(out: Mat4): Mat4 {
    return m4.viewRotation(out, this.direction, this.up, this.right);
  }

  /** Reverse-Z, infinite far plane, WebGPU clip space. */
  projection(out: Mat4, aspect: number): Mat4 {
    return m4.perspectiveReverseZInfinite(
      out,
      this.fovy(aspect),
      aspect,
      this.near,
    );
  }

  /**
   * World-space (camera-relative) frustum planes as (nx, ny, nz, d) with
   * normals pointing inward: left, right, bottom, top, near. Far is infinite.
   */
  frustumPlanes(out: Float32Array, aspect: number): Float32Array {
    const fovy = this.fovy(aspect);
    const t = Math.tan(fovy / 2);
    const r = t * aspect;
    const d = this.direction,
      u = this.up,
      x = this.right;
    const plane = (
      i: number,
      nx: number,
      ny: number,
      nz: number,
      dist: number,
    ) => {
      const len = Math.hypot(nx, ny, nz);
      out[i * 4] = nx / len;
      out[i * 4 + 1] = ny / len;
      out[i * 4 + 2] = nz / len;
      out[i * 4 + 3] = dist;
    };
    // Side planes pass through the camera (origin), so d = 0.
    plane(0, d[0]! * r + x[0]!, d[1]! * r + x[1]!, d[2]! * r + x[2]!, 0);
    plane(1, d[0]! * r - x[0]!, d[1]! * r - x[1]!, d[2]! * r - x[2]!, 0);
    plane(2, d[0]! * t + u[0]!, d[1]! * t + u[1]!, d[2]! * t + u[2]!, 0);
    plane(3, d[0]! * t - u[0]!, d[1]! * t - u[1]!, d[2]! * t - u[2]!, 0);
    plane(4, d[0]!, d[1]!, d[2]!, -this.near);
    return out;
  }

  /** World-space ray through a normalized viewport point (x, y in [-1, 1], y up). */
  rayDirection(ndcX: number, ndcY: number, aspect: number, out: Vec3): Vec3 {
    const t = Math.tan(this.fovy(aspect) / 2);
    for (let i = 0; i < 3; i++) {
      out[i] =
        this.direction[i]! +
        this.right[i]! * ndcX * t * aspect +
        this.up[i]! * ndcY * t;
    }
    return v3.normalize(out, out);
  }
}

const scratchMat = m4.mat4();
const scratchA = v3.vec3();
const scratchB = v3.vec3();

/** Rodrigues rotation of `v` about unit `axis`, in place. */
function rotate(v: Vec3, axis: Vec3, angle: number): void {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const k = axis;
  const kv = v3.cross(scratchA, k, v);
  const kdv = v3.dot(k, v);
  for (let i = 0; i < 3; i++) {
    v[i] = v[i]! * c + kv[i]! * s + k[i]! * kdv * (1 - c);
  }
}
