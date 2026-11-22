import * as v3 from "../math/vec3.ts";
import * as m4 from "../math/mat4.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Mat4 } from "../math/mat4.ts";
import { Ellipsoid } from "../math/ellipsoid.ts";
import { eastNorthUpToFixedFrame } from "../math/transforms.ts";
import type { FrameKey } from "../camera/frameResolver.ts";

/**
 * A perspective camera in the Earth-fixed frame (float64). Rendering is
 * camera-relative: the view matrix is rotation-only, and draws are translated
 * by (origin - position) on the GPU.
 *
 * `fov` follows 1.x `PerspectiveFrustum` semantics: it is the field of view of
 * the larger viewport dimension. `setIntrinsics` sets it from a pinhole's
 * intrinsics instead, with an off-center principal point and pixels that
 * need not be square; `record` reports the camera as a `CameraRecord`.
 */
export class Camera {
  /**
   * Where it is (Earth-fixed meters). Written in place, it needs
   * `version++` (as `direction` and `up` do): that is how views, links and
   * the engine's sleeping loop see the change.
   */
  readonly position = v3.vec3();
  readonly direction = v3.vec3(0, 0, -1);
  readonly up = v3.vec3(0, 1, 0);
  readonly right = v3.vec3(1, 0, 0);
  private fov_ = Math.PI / 3;
  private near_ = 0.1;
  private version_ = 0;
  // The lens beyond `fov` (`setIntrinsics`): the principal point in
  // normalized device coordinates (0, 0 at the view's center, y up), and
  // fy / fx (1 for square pixels). At their defaults the projection is
  // exactly the symmetric one of `fov`.
  private shiftX_ = 0;
  private shiftY_ = 0;
  private pixelAspect_ = 1;

  /**
   * The field of view of the larger viewport dimension (radians). Setting
   * it bumps `version`.
   */
  get fov(): number {
    return this.fov_;
  }
  set fov(fov: number) {
    this.fov_ = fov;
    this.version++;
  }

  /** The near plane's distance (meters). Setting it bumps `version`. */
  get near(): number {
    return this.near_;
  }
  set near(near: number) {
    this.near_ = near;
    this.version++;
  }
  private readonly watchers: Array<() => void> = [];

  /**
   * Incremented on every change so views and links can detect motion
   * cheaply. Each increment (also `camera.version++` after writing the
   * vectors in place) calls the watchers: the engine's frame loop, which
   * sleeps on demand when nothing changes, wakes for it.
   */
  get version(): number {
    return this.version_;
  }
  set version(version: number) {
    this.version_ = version;
    const watchers = this.watchers;
    for (let i = 0; i < watchers.length; i++) {
      watchers[i]!();
    }
  }

  /** Calls `watcher` on each change (`version`); returns the remover. */
  watch(watcher: () => void): () => void {
    this.watchers.push(watcher);
    return () => {
      const i = this.watchers.indexOf(watcher);
      if (i >= 0) {
        this.watchers.splice(i, 1);
      }
    };
  }

  copyFrom(other: Camera): this {
    v3.copy(this.position, other.position);
    v3.copy(this.direction, other.direction);
    v3.copy(this.up, other.up);
    v3.copy(this.right, other.right);
    return this.copyLens(other);
  }

  /**
   * @internal Copies `other`'s lens (field of view, near plane, principal
   * point and pixel aspect), not its pose.
   */
  copyLens(other: Camera): this {
    this.fov_ = other.fov_;
    this.near_ = other.near_;
    this.shiftX_ = other.shiftX_;
    this.shiftY_ = other.shiftY_;
    this.pixelAspect_ = other.pixelAspect_;
    this.version++;
    return this;
  }

  /**
   * Sets the lens from a pinhole's intrinsics (`CameraIntrinsics`): `fov`
   * from `fy`, and the principal point and pixel aspect, which `fov` alone
   * can't give. The view needn't be `width` × `height`: at another size the
   * intrinsics scale with it (as an image resized), and at another aspect
   * the field of view follows `fov`'s rule. Undefined goes back to a
   * centered principal point and square pixels, keeping `fov`. Setting
   * `fov` later keeps the principal point and the pixel aspect.
   *
   * Everything that reads the lens follows an off-center principal point:
   * the projection, the culling planes, `rayDirection`, `View.toPixel`,
   * picks and snaps, and the renderer's own readers (the sky and the
   * aerial perspective, occlusion culling, light culling, the shadow
   * cascades, ambient occlusion, the star cells and glare).
   *
   * `distortion` is a model's name and coefficients (`CameraDistortion`).
   * Only `"none"` is built: the others are refused by name, so they can come
   * later, as a post stage, without a change here. Rolling shutter is out of
   * scope: a record is one pose for the whole image.
   */
  setIntrinsics(
    intrinsics: CameraIntrinsics | undefined,
    distortion?: CameraDistortion,
  ): this {
    if (distortion !== undefined) {
      checkDistortion(distortion);
    }
    if (intrinsics === undefined) {
      this.shiftX_ = 0;
      this.shiftY_ = 0;
      this.pixelAspect_ = 1;
      this.version++;
      return this;
    }
    const { width, height, fx, fy, cx, cy } = intrinsics;
    for (const [name, value] of [
      ["width", width],
      ["height", height],
      ["fx", fx],
      ["fy", fy],
    ] as const) {
      if (!(value > 0) || !Number.isFinite(value)) {
        throw new RangeError(
          `setIntrinsics: ${name} must be a positive, finite number of pixels, not ${value}.`,
        );
      }
    }
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new RangeError(
        `setIntrinsics: the principal point (${cx}, ${cy}) must be finite.`,
      );
    }
    const aspect = width / height;
    // The tangent of the half field of view, up, and the larger dimension's.
    const tanY = height / (2 * fy);
    this.fov_ = 2 * Math.atan(aspect <= 1 ? tanY : tanY * aspect);
    this.shiftX_ = (2 * cx) / width - 1;
    this.shiftY_ = 1 - (2 * cy) / height;
    this.pixelAspect_ = fy / fx;
    this.version++;
    return this;
  }

  /**
   * The camera's intrinsics for a view of `width` × `height` pixels: from
   * `fov`, with the principal point and pixel aspect `setIntrinsics` set
   * (by default centered, and square). Pixels are counted from the view's
   * top-left corner, y down, so a centered principal point is at
   * (width / 2, height / 2).
   */
  intrinsics(width: number, height: number): CameraIntrinsics {
    const tanY = Math.tan(this.fovy(width / height) / 2);
    // fy / fx is the pixel aspect: with square pixels fx is fy exactly.
    const fy = height / (2 * tanY);
    return {
      width,
      height,
      fx: fy / this.pixelAspect_,
      fy,
      cx: ((this.shiftX_ + 1) / 2) * width,
      cy: ((1 - this.shiftY_) / 2) * height,
    };
  }

  /**
   * A record of the camera now, for an image of `width` × `height` pixels
   * (`CameraRecord`): its intrinsics at that size, its pose (copied) in
   * `referenceFrame` at `seconds` on the scene clock, and its distortion.
   * Picks report the one they used (`PickResult.camera`,
   * `CorePick.camera`), in CSS pixels and the view's render root.
   */
  record(
    width: number,
    height: number,
    referenceFrame: FrameKey,
    seconds: number,
  ): CameraRecord {
    return {
      ...this.intrinsics(width, height),
      pose: {
        position: Float64Array.from(this.position),
        direction: Float64Array.from(this.direction),
        up: Float64Array.from(this.up),
        right: Float64Array.from(this.right),
        referenceFrame,
        seconds,
      },
      distortion: NO_DISTORTION,
    };
  }

  /**
   * @internal The lens is the symmetric one of `fov`: the principal point
   * centered, the pixels square (`setIntrinsics`).
   */
  get centered(): boolean {
    return this.shiftX_ === 0 && this.shiftY_ === 0 && this.pixelAspect_ === 1;
  }

  /**
   * @internal The principal point's offset from the view's center, in
   * normalized device coordinates (y up): 0 while centered.
   */
  get shiftX(): number {
    return this.shiftX_;
  }
  /** @internal As `shiftX`, up. */
  get shiftY(): number {
    return this.shiftY_;
  }
  /** @internal fy / fx: 1 for square pixels. */
  get pixelAspect(): number {
    return this.pixelAspect_;
  }

  /**
   * @internal What a view at `aspect` sees through: the tangents of the half
   * fields of view across and up, and the principal point in normalized
   * device coordinates. A ray through `(ndcX, ndcY)` is `direction +
   * right · (ndcX − shiftX) · tanX + up · (ndcY − shiftY) · tanY`.
   */
  lens(aspect: number, out: CameraLens = newLens()): CameraLens {
    const tanY = Math.tan(this.fovy(aspect) / 2);
    out.tanX = tanY * aspect * this.pixelAspect_;
    out.tanY = tanY;
    out.shiftX = this.shiftX_;
    out.shiftY = this.shiftY_;
    return out;
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

  /**
   * `lookAt` in a given frame instead of the ellipsoid's east-north-up:
   * `up` and `north` are perpendicular unit vectors (Earth-fixed), and east
   * is `north × up`. Heading turns about `up`, clockwise from `north` seen
   * from above (from +up); pitch is from the plane perpendicular to `up`
   * (negative looks toward -up). The camera stays unrolled about `up`.
   */
  lookAtInFrame(
    target: Vec3,
    heading: number,
    pitch: number,
    range: number,
    north: Vec3,
    up: Vec3,
  ): this {
    const east = v3.cross(scratchA, north, up);
    const p = Math.min(Math.max(pitch, -Math.PI / 2), Math.PI / 2);
    const h = heading - Math.PI / 2;
    // The same offset as `lookAt`, in (east, north, up).
    const ox = -range * Math.cos(p) * Math.cos(h);
    const oy = range * Math.cos(p) * Math.sin(h);
    const oz = -range * Math.sin(p);
    for (let i = 0; i < 3; i++) {
      this.position[i] =
        target[i]! + east[i]! * ox + north[i]! * oy + up[i]! * oz;
    }
    v3.normalize(this.direction, v3.sub(this.direction, target, this.position));
    return this.orient(up);
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

  /**
   * Reverse-Z, infinite far plane, WebGPU clip space. With a centered
   * principal point and square pixels (the default) it is exactly
   * `mat4.perspectiveReverseZInfinite` of `fovy(aspect)`.
   */
  projection(out: Mat4, aspect: number): Mat4 {
    m4.perspectiveReverseZInfinite(out, this.fovy(aspect), aspect, this.near);
    if (this.pixelAspect_ !== 1) {
      out[0] = out[0]! / this.pixelAspect_;
    }
    // The principal point's offset: x_ndc gains shiftX (w is the depth).
    if (this.shiftX_ !== 0) {
      out[8] = -this.shiftX_;
    }
    if (this.shiftY_ !== 0) {
      out[9] = -this.shiftY_;
    }
    return out;
  }

  /**
   * World-space (camera-relative) frustum planes as (nx, ny, nz, d) with
   * normals pointing inward: left, right, bottom, top, near. Far is infinite.
   * `widen` scales the tangents of the half-angles (1: the view itself).
   */
  frustumPlanes<T extends Float32Array | Float64Array>(
    out: T,
    aspect: number,
    widen = 1,
  ): T {
    const fovy = this.fovy(aspect);
    const t = Math.tan(fovy / 2) * widen;
    const r = t * aspect * this.pixelAspect_;
    // Each side's tangent: the principal point's offset moves the edges
    // (with it centered, each is r or t exactly).
    const left = (1 + this.shiftX_) * r,
      right = (1 - this.shiftX_) * r,
      bottom = (1 + this.shiftY_) * t,
      top = (1 - this.shiftY_) * t;
    const d = this.direction,
      u = this.up,
      x = this.right;
    // Unnormalized normals first; side planes pass through the camera
    // (origin), so d = 0.
    for (let k = 0; k < 3; k++) {
      out[k] = d[k]! * left + x[k]!;
      out[4 + k] = d[k]! * right - x[k]!;
      out[8 + k] = d[k]! * bottom + u[k]!;
      out[12 + k] = d[k]! * top - u[k]!;
      out[16 + k] = d[k]!;
    }
    out[3] = out[7] = out[11] = out[15] = 0;
    out[19] = -this.near;
    for (let i = 0; i < 16; i += 4) {
      const len = Math.sqrt(
        out[i]! * out[i]! +
          out[i + 1]! * out[i + 1]! +
          out[i + 2]! * out[i + 2]!,
      );
      out[i] = out[i]! / len;
      out[i + 1] = out[i + 1]! / len;
      out[i + 2] = out[i + 2]! / len;
    }
    return out;
  }

  /** World-space ray through a normalized viewport point (x, y in [-1, 1], y up). */
  rayDirection(ndcX: number, ndcY: number, aspect: number, out: Vec3): Vec3 {
    const t = Math.tan(this.fovy(aspect) / 2);
    const x = ndcX - this.shiftX_,
      y = ndcY - this.shiftY_;
    for (let i = 0; i < 3; i++) {
      out[i] =
        this.direction[i]! +
        this.right[i]! * x * t * aspect * this.pixelAspect_ +
        this.up[i]! * y * t;
    }
    return v3.normalize(out, out);
  }
}

/** Where a camera is and which way it looks (Earth-fixed, float64). */
export interface CameraPose {
  readonly position: ArrayLike<number>;
  readonly direction: ArrayLike<number>;
  readonly up: ArrayLike<number>;
  readonly right: ArrayLike<number>;
}

/**
 * A pinhole's intrinsics for an image of `width` × `height` pixels: the focal
 * lengths `fx` and `fy` and the principal point (`cx`, `cy`), in pixels.
 * Pixels are counted from the image's top-left corner, y down, so a centered
 * principal point is at (width / 2, height / 2). OpenCV counts from the
 * first pixel's center: add 0.5 to its `cx` and `cy`.
 */
export interface CameraIntrinsics {
  readonly width: number;
  readonly height: number;
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
}

/**
 * A lens distortion model's name (`CameraDistortion`): `"none"`; OpenCV's
 * pinhole model (`"opencvPinhole"`: k1, k2, p1, p2, k3, then k4 to k6 if
 * rational), or OpenCV's fisheye model (`"opencvFisheye"`: k1 to k4). Only
 * `"none"` is built: the others are refused by name.
 */
export type CameraDistortionModel = "none" | "opencvPinhole" | "opencvFisheye";

/** A lens distortion: its model's name and coefficients, in the model's order. */
export interface CameraDistortion {
  readonly model: CameraDistortionModel;
  readonly coefficients: readonly number[];
}

/** A camera record's pose (`CameraRecord.pose`): where, which way, in which reference frame, and when. */
export interface CameraRecordPose extends CameraPose {
  /** Meters, float64, in `referenceFrame`. */
  readonly position: Float64Array;
  readonly direction: Float64Array;
  readonly up: Float64Array;
  readonly right: Float64Array;
  /** The reference frame the pose's numbers are in (for a pick, the view's render root). */
  readonly referenceFrame: FrameKey;
  /** The scene clock's seconds the pose is at (0 without a clock). */
  readonly seconds: number;
}

/**
 * Everything needed to project a point into an image, and back: the
 * intrinsics, the pose (with its reference frame and time) and the lens
 * distortion. Camera.record makes one; picks report the one they used.
 * One pose covers the whole image: rolling shutter is out of scope.
 */
export interface CameraRecord extends CameraIntrinsics {
  readonly pose: CameraRecordPose;
  readonly distortion: CameraDistortion;
}

/** @internal What a view sees through (`Camera.lens`), written in place. */
export interface CameraLens {
  tanX: number;
  tanY: number;
  shiftX: number;
  shiftY: number;
}

/** @internal A lens to write into (`Camera.lens`'s `out`), centered. */
export function newLens(): CameraLens {
  return { tanX: 1, tanY: 1, shiftX: 0, shiftY: 0 };
}

const NO_DISTORTION: CameraDistortion = Object.freeze({
  model: "none",
  coefficients: Object.freeze([]) as readonly number[],
});

/**
 * @internal Refuses a distortion that isn't built, by its model's name (only
 * `"none"` is), and a name that isn't a model.
 */
export function checkDistortion(distortion: CameraDistortion): void {
  const model: string = distortion.model;
  if (model === "none") {
    return;
  }
  if (model === "opencvPinhole" || model === "opencvFisheye") {
    throw new Error(
      `The "${model}" distortion model is not built yet: only "none" is.`,
    );
  }
  throw new Error(
    `"${model}" is not a distortion model: "none", "opencvPinhole" or "opencvFisheye".`,
  );
}

/**
 * Projects an Earth-fixed point for a camera pose with vertical field of view
 * `fovy` onto a view of `width` × `height` pixels: writes x and y (from the
 * top-left, y down) into `out` and returns the point's depth along the view
 * direction, in meters. A depth that is not positive means the point is not in
 * front of the camera, and `out` is then left as it was.
 *
 * With a `CameraRecord` instead, it projects through the record's pose and
 * intrinsics (an off-center principal point included) onto its image; a
 * distortion that isn't built is refused by name.
 */
export function projectToPixel(
  pose: CameraPose,
  fovy: number,
  width: number,
  height: number,
  point: ArrayLike<number>,
  out: Float64Array,
): number;
export function projectToPixel(
  record: CameraRecord,
  point: ArrayLike<number>,
  out: Float64Array,
): number;
export function projectToPixel(
  ...args:
    | [CameraPose, number, number, number, ArrayLike<number>, Float64Array]
    | [CameraRecord, ArrayLike<number>, Float64Array]
): number {
  if (args.length === 3) {
    const [record, point, out] = args;
    checkDistortion(record.distortion);
    return projectThrough(record.pose, record, point, out);
  }
  const [pose, fovy, width, height, point, out] = args;
  const e = pose.position,
    d = pose.direction,
    u = pose.up,
    r = pose.right;
  const x = point[0]! - e[0]!,
    y = point[1]! - e[1]!,
    z = point[2]! - e[2]!;
  const depth = x * d[0]! + y * d[1]! + z * d[2]!;
  if (!(depth > 0)) {
    return depth;
  }
  const t = Math.tan(fovy / 2) * depth;
  const ndcX = (x * r[0]! + y * r[1]! + z * r[2]!) / (t * (width / height));
  const ndcY = (x * u[0]! + y * u[1]! + z * u[2]!) / t;
  out[0] = ((ndcX + 1) / 2) * width;
  out[1] = ((1 - ndcY) / 2) * height;
  return depth;
}

/**
 * @internal `projectToPixel` through a pose and a pinhole's intrinsics
 * (no distortion): pixels from the top-left, y down, into `out`; returns
 * the depth along the view direction (not positive: behind, `out` as it was).
 */
export function projectThrough(
  pose: CameraPose,
  intrinsics: CameraIntrinsics,
  point: ArrayLike<number>,
  out: Float64Array,
): number {
  const { position: e, direction: d, up: u, right: r } = pose;
  const x = point[0]! - e[0]!,
    y = point[1]! - e[1]!,
    z = point[2]! - e[2]!;
  const depth = x * d[0]! + y * d[1]! + z * d[2]!;
  if (!(depth > 0)) {
    return depth;
  }
  out[0] =
    intrinsics.cx +
    (intrinsics.fx * (x * r[0]! + y * r[1]! + z * r[2]!)) / depth;
  out[1] =
    intrinsics.cy -
    (intrinsics.fy * (x * u[0]! + y * u[1]! + z * u[2]!)) / depth;
  return depth;
}

/**
 * @internal The centered intrinsics, with square pixels, of a vertical field
 * of view `fovy` (radians) for a `width` × `height` image.
 */
export function centeredIntrinsics(
  fovy: number,
  width: number,
  height: number,
): CameraIntrinsics {
  const fy = height / (2 * Math.tan(fovy / 2));
  return { width, height, fx: fy, fy, cx: width / 2, cy: height / 2 };
}

/**
 * @internal The intrinsics are centered with square pixels, exactly (as
 * `Camera.intrinsics` gives them for a centered camera): the symmetric
 * field of view's math applies, bit for bit.
 */
export function isCentered(intrinsics: CameraIntrinsics): boolean {
  return (
    intrinsics.cx === intrinsics.width / 2 &&
    intrinsics.cy === intrinsics.height / 2 &&
    intrinsics.fx === intrinsics.fy
  );
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
