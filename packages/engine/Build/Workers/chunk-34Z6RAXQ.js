/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
import {
  Plane_default
} from "./chunk-PY3JQBWU.js";
import {
  GeometryAttributes_default
} from "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default,
  Intersect_default,
  Quaternion_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian4_default,
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/CullingVolume.js
function CullingVolume(planes) {
  this.planes = defaultValue_default(planes, []);
}
var faces = [new Cartesian3_default(), new Cartesian3_default(), new Cartesian3_default()];
Cartesian3_default.clone(Cartesian3_default.UNIT_X, faces[0]);
Cartesian3_default.clone(Cartesian3_default.UNIT_Y, faces[1]);
Cartesian3_default.clone(Cartesian3_default.UNIT_Z, faces[2]);
var scratchPlaneCenter = new Cartesian3_default();
var scratchPlaneNormal = new Cartesian3_default();
var scratchPlane = new Plane_default(new Cartesian3_default(1, 0, 0), 0);
CullingVolume.fromBoundingSphere = function(boundingSphere, result) {
  if (!defined_default(boundingSphere)) {
    throw new DeveloperError_default("boundingSphere is required.");
  }
  if (!defined_default(result)) {
    result = new CullingVolume();
  }
  const length = faces.length;
  const planes = result.planes;
  planes.length = 2 * length;
  const center = boundingSphere.center;
  const radius = boundingSphere.radius;
  let planeIndex = 0;
  for (let i = 0; i < length; ++i) {
    const faceNormal = faces[i];
    let plane0 = planes[planeIndex];
    let plane1 = planes[planeIndex + 1];
    if (!defined_default(plane0)) {
      plane0 = planes[planeIndex] = new Cartesian4_default();
    }
    if (!defined_default(plane1)) {
      plane1 = planes[planeIndex + 1] = new Cartesian4_default();
    }
    Cartesian3_default.multiplyByScalar(faceNormal, -radius, scratchPlaneCenter);
    Cartesian3_default.add(center, scratchPlaneCenter, scratchPlaneCenter);
    plane0.x = faceNormal.x;
    plane0.y = faceNormal.y;
    plane0.z = faceNormal.z;
    plane0.w = -Cartesian3_default.dot(faceNormal, scratchPlaneCenter);
    Cartesian3_default.multiplyByScalar(faceNormal, radius, scratchPlaneCenter);
    Cartesian3_default.add(center, scratchPlaneCenter, scratchPlaneCenter);
    plane1.x = -faceNormal.x;
    plane1.y = -faceNormal.y;
    plane1.z = -faceNormal.z;
    plane1.w = -Cartesian3_default.dot(
      Cartesian3_default.negate(faceNormal, scratchPlaneNormal),
      scratchPlaneCenter
    );
    planeIndex += 2;
  }
  return result;
};
CullingVolume.prototype.computeVisibility = function(boundingVolume) {
  if (!defined_default(boundingVolume)) {
    throw new DeveloperError_default("boundingVolume is required.");
  }
  const planes = this.planes;
  let intersecting = false;
  for (let k = 0, len = planes.length; k < len; ++k) {
    const result = boundingVolume.intersectPlane(
      Plane_default.fromCartesian4(planes[k], scratchPlane)
    );
    if (result === Intersect_default.OUTSIDE) {
      return Intersect_default.OUTSIDE;
    } else if (result === Intersect_default.INTERSECTING) {
      intersecting = true;
    }
  }
  return intersecting ? Intersect_default.INTERSECTING : Intersect_default.INSIDE;
};
CullingVolume.prototype.computeVisibilityWithPlaneMask = function(boundingVolume, parentPlaneMask) {
  if (!defined_default(boundingVolume)) {
    throw new DeveloperError_default("boundingVolume is required.");
  }
  if (!defined_default(parentPlaneMask)) {
    throw new DeveloperError_default("parentPlaneMask is required.");
  }
  if (parentPlaneMask === CullingVolume.MASK_OUTSIDE || parentPlaneMask === CullingVolume.MASK_INSIDE) {
    return parentPlaneMask;
  }
  let mask = CullingVolume.MASK_INSIDE;
  const planes = this.planes;
  for (let k = 0, len = planes.length; k < len; ++k) {
    const flag = k < 31 ? 1 << k : 0;
    if (k < 31 && (parentPlaneMask & flag) === 0) {
      continue;
    }
    const result = boundingVolume.intersectPlane(
      Plane_default.fromCartesian4(planes[k], scratchPlane)
    );
    if (result === Intersect_default.OUTSIDE) {
      return CullingVolume.MASK_OUTSIDE;
    } else if (result === Intersect_default.INTERSECTING) {
      mask |= flag;
    }
  }
  return mask;
};
CullingVolume.MASK_OUTSIDE = 4294967295;
CullingVolume.MASK_INSIDE = 0;
CullingVolume.MASK_INDETERMINATE = 2147483647;
var CullingVolume_default = CullingVolume;

// packages/engine/Source/Core/OrthographicOffCenterFrustum.js
function OrthographicOffCenterFrustum(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this.left = options.left;
  this._left = void 0;
  this.right = options.right;
  this._right = void 0;
  this.top = options.top;
  this._top = void 0;
  this.bottom = options.bottom;
  this._bottom = void 0;
  this.near = defaultValue_default(options.near, 1);
  this._near = this.near;
  this.far = defaultValue_default(options.far, 5e8);
  this._far = this.far;
  this._cullingVolume = new CullingVolume_default();
  this._orthographicMatrix = new Matrix4_default();
}
function update(frustum) {
  if (!defined_default(frustum.right) || !defined_default(frustum.left) || !defined_default(frustum.top) || !defined_default(frustum.bottom) || !defined_default(frustum.near) || !defined_default(frustum.far)) {
    throw new DeveloperError_default(
      "right, left, top, bottom, near, or far parameters are not set."
    );
  }
  if (frustum.top !== frustum._top || frustum.bottom !== frustum._bottom || frustum.left !== frustum._left || frustum.right !== frustum._right || frustum.near !== frustum._near || frustum.far !== frustum._far) {
    if (frustum.left > frustum.right) {
      throw new DeveloperError_default("right must be greater than left.");
    }
    if (frustum.bottom > frustum.top) {
      throw new DeveloperError_default("top must be greater than bottom.");
    }
    if (frustum.near <= 0 || frustum.near > frustum.far) {
      throw new DeveloperError_default(
        "near must be greater than zero and less than far."
      );
    }
    frustum._left = frustum.left;
    frustum._right = frustum.right;
    frustum._top = frustum.top;
    frustum._bottom = frustum.bottom;
    frustum._near = frustum.near;
    frustum._far = frustum.far;
    frustum._orthographicMatrix = Matrix4_default.computeOrthographicOffCenter(
      frustum.left,
      frustum.right,
      frustum.bottom,
      frustum.top,
      frustum.near,
      frustum.far,
      frustum._orthographicMatrix
    );
  }
}
Object.defineProperties(OrthographicOffCenterFrustum.prototype, {
  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof OrthographicOffCenterFrustum.prototype
   * @type {Matrix4}
   * @readonly
   */
  projectionMatrix: {
    get: function() {
      update(this);
      return this._orthographicMatrix;
    }
  }
});
var getPlanesRight = new Cartesian3_default();
var getPlanesNearCenter = new Cartesian3_default();
var getPlanesPoint = new Cartesian3_default();
var negateScratch = new Cartesian3_default();
OrthographicOffCenterFrustum.prototype.computeCullingVolume = function(position, direction, up) {
  if (!defined_default(position)) {
    throw new DeveloperError_default("position is required.");
  }
  if (!defined_default(direction)) {
    throw new DeveloperError_default("direction is required.");
  }
  if (!defined_default(up)) {
    throw new DeveloperError_default("up is required.");
  }
  const planes = this._cullingVolume.planes;
  const t = this.top;
  const b = this.bottom;
  const r = this.right;
  const l = this.left;
  const n = this.near;
  const f = this.far;
  const right = Cartesian3_default.cross(direction, up, getPlanesRight);
  Cartesian3_default.normalize(right, right);
  const nearCenter = getPlanesNearCenter;
  Cartesian3_default.multiplyByScalar(direction, n, nearCenter);
  Cartesian3_default.add(position, nearCenter, nearCenter);
  const point = getPlanesPoint;
  Cartesian3_default.multiplyByScalar(right, l, point);
  Cartesian3_default.add(nearCenter, point, point);
  let plane = planes[0];
  if (!defined_default(plane)) {
    plane = planes[0] = new Cartesian4_default();
  }
  plane.x = right.x;
  plane.y = right.y;
  plane.z = right.z;
  plane.w = -Cartesian3_default.dot(right, point);
  Cartesian3_default.multiplyByScalar(right, r, point);
  Cartesian3_default.add(nearCenter, point, point);
  plane = planes[1];
  if (!defined_default(plane)) {
    plane = planes[1] = new Cartesian4_default();
  }
  plane.x = -right.x;
  plane.y = -right.y;
  plane.z = -right.z;
  plane.w = -Cartesian3_default.dot(Cartesian3_default.negate(right, negateScratch), point);
  Cartesian3_default.multiplyByScalar(up, b, point);
  Cartesian3_default.add(nearCenter, point, point);
  plane = planes[2];
  if (!defined_default(plane)) {
    plane = planes[2] = new Cartesian4_default();
  }
  plane.x = up.x;
  plane.y = up.y;
  plane.z = up.z;
  plane.w = -Cartesian3_default.dot(up, point);
  Cartesian3_default.multiplyByScalar(up, t, point);
  Cartesian3_default.add(nearCenter, point, point);
  plane = planes[3];
  if (!defined_default(plane)) {
    plane = planes[3] = new Cartesian4_default();
  }
  plane.x = -up.x;
  plane.y = -up.y;
  plane.z = -up.z;
  plane.w = -Cartesian3_default.dot(Cartesian3_default.negate(up, negateScratch), point);
  plane = planes[4];
  if (!defined_default(plane)) {
    plane = planes[4] = new Cartesian4_default();
  }
  plane.x = direction.x;
  plane.y = direction.y;
  plane.z = direction.z;
  plane.w = -Cartesian3_default.dot(direction, nearCenter);
  Cartesian3_default.multiplyByScalar(direction, f, point);
  Cartesian3_default.add(position, point, point);
  plane = planes[5];
  if (!defined_default(plane)) {
    plane = planes[5] = new Cartesian4_default();
  }
  plane.x = -direction.x;
  plane.y = -direction.y;
  plane.z = -direction.z;
  plane.w = -Cartesian3_default.dot(Cartesian3_default.negate(direction, negateScratch), point);
  return this._cullingVolume;
};
OrthographicOffCenterFrustum.prototype.getPixelDimensions = function(drawingBufferWidth, drawingBufferHeight, distance, pixelRatio, result) {
  update(this);
  if (!defined_default(drawingBufferWidth) || !defined_default(drawingBufferHeight)) {
    throw new DeveloperError_default(
      "Both drawingBufferWidth and drawingBufferHeight are required."
    );
  }
  if (drawingBufferWidth <= 0) {
    throw new DeveloperError_default("drawingBufferWidth must be greater than zero.");
  }
  if (drawingBufferHeight <= 0) {
    throw new DeveloperError_default("drawingBufferHeight must be greater than zero.");
  }
  if (!defined_default(distance)) {
    throw new DeveloperError_default("distance is required.");
  }
  if (!defined_default(pixelRatio)) {
    throw new DeveloperError_default("pixelRatio is required.");
  }
  if (pixelRatio <= 0) {
    throw new DeveloperError_default("pixelRatio must be greater than zero.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("A result object is required.");
  }
  const frustumWidth = this.right - this.left;
  const frustumHeight = this.top - this.bottom;
  const pixelWidth = pixelRatio * frustumWidth / drawingBufferWidth;
  const pixelHeight = pixelRatio * frustumHeight / drawingBufferHeight;
  result.x = pixelWidth;
  result.y = pixelHeight;
  return result;
};
OrthographicOffCenterFrustum.prototype.clone = function(result) {
  if (!defined_default(result)) {
    result = new OrthographicOffCenterFrustum();
  }
  result.left = this.left;
  result.right = this.right;
  result.top = this.top;
  result.bottom = this.bottom;
  result.near = this.near;
  result.far = this.far;
  result._left = void 0;
  result._right = void 0;
  result._top = void 0;
  result._bottom = void 0;
  result._near = void 0;
  result._far = void 0;
  return result;
};
OrthographicOffCenterFrustum.prototype.equals = function(other) {
  return defined_default(other) && other instanceof OrthographicOffCenterFrustum && this.right === other.right && this.left === other.left && this.top === other.top && this.bottom === other.bottom && this.near === other.near && this.far === other.far;
};
OrthographicOffCenterFrustum.prototype.equalsEpsilon = function(other, relativeEpsilon, absoluteEpsilon) {
  return other === this || defined_default(other) && other instanceof OrthographicOffCenterFrustum && Math_default.equalsEpsilon(
    this.right,
    other.right,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.left,
    other.left,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.top,
    other.top,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.bottom,
    other.bottom,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.near,
    other.near,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.far,
    other.far,
    relativeEpsilon,
    absoluteEpsilon
  );
};
var OrthographicOffCenterFrustum_default = OrthographicOffCenterFrustum;

// packages/engine/Source/Core/OrthographicFrustum.js
function OrthographicFrustum(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this._offCenterFrustum = new OrthographicOffCenterFrustum_default();
  this.width = options.width;
  this._width = void 0;
  this.aspectRatio = options.aspectRatio;
  this._aspectRatio = void 0;
  this.near = defaultValue_default(options.near, 1);
  this._near = this.near;
  this.far = defaultValue_default(options.far, 5e8);
  this._far = this.far;
}
OrthographicFrustum.packedLength = 4;
OrthographicFrustum.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.width;
  array[startingIndex++] = value.aspectRatio;
  array[startingIndex++] = value.near;
  array[startingIndex] = value.far;
  return array;
};
OrthographicFrustum.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new OrthographicFrustum();
  }
  result.width = array[startingIndex++];
  result.aspectRatio = array[startingIndex++];
  result.near = array[startingIndex++];
  result.far = array[startingIndex];
  return result;
};
function update2(frustum) {
  if (!defined_default(frustum.width) || !defined_default(frustum.aspectRatio) || !defined_default(frustum.near) || !defined_default(frustum.far)) {
    throw new DeveloperError_default(
      "width, aspectRatio, near, or far parameters are not set."
    );
  }
  const f = frustum._offCenterFrustum;
  if (frustum.width !== frustum._width || frustum.aspectRatio !== frustum._aspectRatio || frustum.near !== frustum._near || frustum.far !== frustum._far) {
    if (frustum.aspectRatio < 0) {
      throw new DeveloperError_default("aspectRatio must be positive.");
    }
    if (frustum.near < 0 || frustum.near > frustum.far) {
      throw new DeveloperError_default(
        "near must be greater than zero and less than far."
      );
    }
    frustum._aspectRatio = frustum.aspectRatio;
    frustum._width = frustum.width;
    frustum._near = frustum.near;
    frustum._far = frustum.far;
    const ratio = 1 / frustum.aspectRatio;
    f.right = frustum.width * 0.5;
    f.left = -f.right;
    f.top = ratio * f.right;
    f.bottom = -f.top;
    f.near = frustum.near;
    f.far = frustum.far;
  }
}
Object.defineProperties(OrthographicFrustum.prototype, {
  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof OrthographicFrustum.prototype
   * @type {Matrix4}
   * @readonly
   */
  projectionMatrix: {
    get: function() {
      update2(this);
      return this._offCenterFrustum.projectionMatrix;
    }
  },
  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof OrthographicFrustum.prototype
   * @type {OrthographicOffCenterFrustum}
   * @readonly
   * @private
   */
  offCenterFrustum: {
    get: function() {
      update2(this);
      return this._offCenterFrustum;
    }
  }
});
OrthographicFrustum.prototype.computeCullingVolume = function(position, direction, up) {
  update2(this);
  return this._offCenterFrustum.computeCullingVolume(position, direction, up);
};
OrthographicFrustum.prototype.getPixelDimensions = function(drawingBufferWidth, drawingBufferHeight, distance, pixelRatio, result) {
  update2(this);
  return this._offCenterFrustum.getPixelDimensions(
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    pixelRatio,
    result
  );
};
OrthographicFrustum.prototype.clone = function(result) {
  if (!defined_default(result)) {
    result = new OrthographicFrustum();
  }
  result.aspectRatio = this.aspectRatio;
  result.width = this.width;
  result.near = this.near;
  result.far = this.far;
  result._aspectRatio = void 0;
  result._width = void 0;
  result._near = void 0;
  result._far = void 0;
  this._offCenterFrustum.clone(result._offCenterFrustum);
  return result;
};
OrthographicFrustum.prototype.equals = function(other) {
  if (!defined_default(other) || !(other instanceof OrthographicFrustum)) {
    return false;
  }
  update2(this);
  update2(other);
  return this.width === other.width && this.aspectRatio === other.aspectRatio && this._offCenterFrustum.equals(other._offCenterFrustum);
};
OrthographicFrustum.prototype.equalsEpsilon = function(other, relativeEpsilon, absoluteEpsilon) {
  if (!defined_default(other) || !(other instanceof OrthographicFrustum)) {
    return false;
  }
  update2(this);
  update2(other);
  return Math_default.equalsEpsilon(
    this.width,
    other.width,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.aspectRatio,
    other.aspectRatio,
    relativeEpsilon,
    absoluteEpsilon
  ) && this._offCenterFrustum.equalsEpsilon(
    other._offCenterFrustum,
    relativeEpsilon,
    absoluteEpsilon
  );
};
var OrthographicFrustum_default = OrthographicFrustum;

// packages/engine/Source/Core/PerspectiveOffCenterFrustum.js
function PerspectiveOffCenterFrustum(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this.left = options.left;
  this._left = void 0;
  this.right = options.right;
  this._right = void 0;
  this.top = options.top;
  this._top = void 0;
  this.bottom = options.bottom;
  this._bottom = void 0;
  this.near = defaultValue_default(options.near, 1);
  this._near = this.near;
  this.far = defaultValue_default(options.far, 5e8);
  this._far = this.far;
  this._cullingVolume = new CullingVolume_default();
  this._perspectiveMatrix = new Matrix4_default();
  this._infinitePerspective = new Matrix4_default();
}
function update3(frustum) {
  if (!defined_default(frustum.right) || !defined_default(frustum.left) || !defined_default(frustum.top) || !defined_default(frustum.bottom) || !defined_default(frustum.near) || !defined_default(frustum.far)) {
    throw new DeveloperError_default(
      "right, left, top, bottom, near, or far parameters are not set."
    );
  }
  const t = frustum.top;
  const b = frustum.bottom;
  const r = frustum.right;
  const l = frustum.left;
  const n = frustum.near;
  const f = frustum.far;
  if (t !== frustum._top || b !== frustum._bottom || l !== frustum._left || r !== frustum._right || n !== frustum._near || f !== frustum._far) {
    if (frustum.near <= 0 || frustum.near > frustum.far) {
      throw new DeveloperError_default(
        "near must be greater than zero and less than far."
      );
    }
    frustum._left = l;
    frustum._right = r;
    frustum._top = t;
    frustum._bottom = b;
    frustum._near = n;
    frustum._far = f;
    frustum._perspectiveMatrix = Matrix4_default.computePerspectiveOffCenter(
      l,
      r,
      b,
      t,
      n,
      f,
      frustum._perspectiveMatrix
    );
    frustum._infinitePerspective = Matrix4_default.computeInfinitePerspectiveOffCenter(
      l,
      r,
      b,
      t,
      n,
      frustum._infinitePerspective
    );
  }
}
Object.defineProperties(PerspectiveOffCenterFrustum.prototype, {
  /**
   * Gets the perspective projection matrix computed from the view frustum.
   * @memberof PerspectiveOffCenterFrustum.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @see PerspectiveOffCenterFrustum#infiniteProjectionMatrix
   */
  projectionMatrix: {
    get: function() {
      update3(this);
      return this._perspectiveMatrix;
    }
  },
  /**
   * Gets the perspective projection matrix computed from the view frustum with an infinite far plane.
   * @memberof PerspectiveOffCenterFrustum.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @see PerspectiveOffCenterFrustum#projectionMatrix
   */
  infiniteProjectionMatrix: {
    get: function() {
      update3(this);
      return this._infinitePerspective;
    }
  }
});
var getPlanesRight2 = new Cartesian3_default();
var getPlanesNearCenter2 = new Cartesian3_default();
var getPlanesFarCenter = new Cartesian3_default();
var getPlanesNormal = new Cartesian3_default();
PerspectiveOffCenterFrustum.prototype.computeCullingVolume = function(position, direction, up) {
  if (!defined_default(position)) {
    throw new DeveloperError_default("position is required.");
  }
  if (!defined_default(direction)) {
    throw new DeveloperError_default("direction is required.");
  }
  if (!defined_default(up)) {
    throw new DeveloperError_default("up is required.");
  }
  const planes = this._cullingVolume.planes;
  const t = this.top;
  const b = this.bottom;
  const r = this.right;
  const l = this.left;
  const n = this.near;
  const f = this.far;
  const right = Cartesian3_default.cross(direction, up, getPlanesRight2);
  const nearCenter = getPlanesNearCenter2;
  Cartesian3_default.multiplyByScalar(direction, n, nearCenter);
  Cartesian3_default.add(position, nearCenter, nearCenter);
  const farCenter = getPlanesFarCenter;
  Cartesian3_default.multiplyByScalar(direction, f, farCenter);
  Cartesian3_default.add(position, farCenter, farCenter);
  const normal = getPlanesNormal;
  Cartesian3_default.multiplyByScalar(right, l, normal);
  Cartesian3_default.add(nearCenter, normal, normal);
  Cartesian3_default.subtract(normal, position, normal);
  Cartesian3_default.normalize(normal, normal);
  Cartesian3_default.cross(normal, up, normal);
  Cartesian3_default.normalize(normal, normal);
  let plane = planes[0];
  if (!defined_default(plane)) {
    plane = planes[0] = new Cartesian4_default();
  }
  plane.x = normal.x;
  plane.y = normal.y;
  plane.z = normal.z;
  plane.w = -Cartesian3_default.dot(normal, position);
  Cartesian3_default.multiplyByScalar(right, r, normal);
  Cartesian3_default.add(nearCenter, normal, normal);
  Cartesian3_default.subtract(normal, position, normal);
  Cartesian3_default.cross(up, normal, normal);
  Cartesian3_default.normalize(normal, normal);
  plane = planes[1];
  if (!defined_default(plane)) {
    plane = planes[1] = new Cartesian4_default();
  }
  plane.x = normal.x;
  plane.y = normal.y;
  plane.z = normal.z;
  plane.w = -Cartesian3_default.dot(normal, position);
  Cartesian3_default.multiplyByScalar(up, b, normal);
  Cartesian3_default.add(nearCenter, normal, normal);
  Cartesian3_default.subtract(normal, position, normal);
  Cartesian3_default.cross(right, normal, normal);
  Cartesian3_default.normalize(normal, normal);
  plane = planes[2];
  if (!defined_default(plane)) {
    plane = planes[2] = new Cartesian4_default();
  }
  plane.x = normal.x;
  plane.y = normal.y;
  plane.z = normal.z;
  plane.w = -Cartesian3_default.dot(normal, position);
  Cartesian3_default.multiplyByScalar(up, t, normal);
  Cartesian3_default.add(nearCenter, normal, normal);
  Cartesian3_default.subtract(normal, position, normal);
  Cartesian3_default.cross(normal, right, normal);
  Cartesian3_default.normalize(normal, normal);
  plane = planes[3];
  if (!defined_default(plane)) {
    plane = planes[3] = new Cartesian4_default();
  }
  plane.x = normal.x;
  plane.y = normal.y;
  plane.z = normal.z;
  plane.w = -Cartesian3_default.dot(normal, position);
  plane = planes[4];
  if (!defined_default(plane)) {
    plane = planes[4] = new Cartesian4_default();
  }
  plane.x = direction.x;
  plane.y = direction.y;
  plane.z = direction.z;
  plane.w = -Cartesian3_default.dot(direction, nearCenter);
  Cartesian3_default.negate(direction, normal);
  plane = planes[5];
  if (!defined_default(plane)) {
    plane = planes[5] = new Cartesian4_default();
  }
  plane.x = normal.x;
  plane.y = normal.y;
  plane.z = normal.z;
  plane.w = -Cartesian3_default.dot(normal, farCenter);
  return this._cullingVolume;
};
PerspectiveOffCenterFrustum.prototype.getPixelDimensions = function(drawingBufferWidth, drawingBufferHeight, distance, pixelRatio, result) {
  update3(this);
  if (!defined_default(drawingBufferWidth) || !defined_default(drawingBufferHeight)) {
    throw new DeveloperError_default(
      "Both drawingBufferWidth and drawingBufferHeight are required."
    );
  }
  if (drawingBufferWidth <= 0) {
    throw new DeveloperError_default("drawingBufferWidth must be greater than zero.");
  }
  if (drawingBufferHeight <= 0) {
    throw new DeveloperError_default("drawingBufferHeight must be greater than zero.");
  }
  if (!defined_default(distance)) {
    throw new DeveloperError_default("distance is required.");
  }
  if (!defined_default(pixelRatio)) {
    throw new DeveloperError_default("pixelRatio is required");
  }
  if (pixelRatio <= 0) {
    throw new DeveloperError_default("pixelRatio must be greater than zero.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("A result object is required.");
  }
  const inverseNear = 1 / this.near;
  let tanTheta = this.top * inverseNear;
  const pixelHeight = 2 * pixelRatio * distance * tanTheta / drawingBufferHeight;
  tanTheta = this.right * inverseNear;
  const pixelWidth = 2 * pixelRatio * distance * tanTheta / drawingBufferWidth;
  result.x = pixelWidth;
  result.y = pixelHeight;
  return result;
};
PerspectiveOffCenterFrustum.prototype.clone = function(result) {
  if (!defined_default(result)) {
    result = new PerspectiveOffCenterFrustum();
  }
  result.right = this.right;
  result.left = this.left;
  result.top = this.top;
  result.bottom = this.bottom;
  result.near = this.near;
  result.far = this.far;
  result._left = void 0;
  result._right = void 0;
  result._top = void 0;
  result._bottom = void 0;
  result._near = void 0;
  result._far = void 0;
  return result;
};
PerspectiveOffCenterFrustum.prototype.equals = function(other) {
  return defined_default(other) && other instanceof PerspectiveOffCenterFrustum && this.right === other.right && this.left === other.left && this.top === other.top && this.bottom === other.bottom && this.near === other.near && this.far === other.far;
};
PerspectiveOffCenterFrustum.prototype.equalsEpsilon = function(other, relativeEpsilon, absoluteEpsilon) {
  return other === this || defined_default(other) && other instanceof PerspectiveOffCenterFrustum && Math_default.equalsEpsilon(
    this.right,
    other.right,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.left,
    other.left,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.top,
    other.top,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.bottom,
    other.bottom,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.near,
    other.near,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.far,
    other.far,
    relativeEpsilon,
    absoluteEpsilon
  );
};
var PerspectiveOffCenterFrustum_default = PerspectiveOffCenterFrustum;

// packages/engine/Source/Core/PerspectiveFrustum.js
function PerspectiveFrustum(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this._offCenterFrustum = new PerspectiveOffCenterFrustum_default();
  this.fov = options.fov;
  this._fov = void 0;
  this._fovy = void 0;
  this._sseDenominator = void 0;
  this.aspectRatio = options.aspectRatio;
  this._aspectRatio = void 0;
  this.near = defaultValue_default(options.near, 1);
  this._near = this.near;
  this.far = defaultValue_default(options.far, 5e8);
  this._far = this.far;
  this.xOffset = defaultValue_default(options.xOffset, 0);
  this._xOffset = this.xOffset;
  this.yOffset = defaultValue_default(options.yOffset, 0);
  this._yOffset = this.yOffset;
}
PerspectiveFrustum.packedLength = 6;
PerspectiveFrustum.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.fov;
  array[startingIndex++] = value.aspectRatio;
  array[startingIndex++] = value.near;
  array[startingIndex++] = value.far;
  array[startingIndex++] = value.xOffset;
  array[startingIndex] = value.yOffset;
  return array;
};
PerspectiveFrustum.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new PerspectiveFrustum();
  }
  result.fov = array[startingIndex++];
  result.aspectRatio = array[startingIndex++];
  result.near = array[startingIndex++];
  result.far = array[startingIndex++];
  result.xOffset = array[startingIndex++];
  result.yOffset = array[startingIndex];
  return result;
};
function update4(frustum) {
  if (!defined_default(frustum.fov) || !defined_default(frustum.aspectRatio) || !defined_default(frustum.near) || !defined_default(frustum.far)) {
    throw new DeveloperError_default(
      "fov, aspectRatio, near, or far parameters are not set."
    );
  }
  const f = frustum._offCenterFrustum;
  if (frustum.fov !== frustum._fov || frustum.aspectRatio !== frustum._aspectRatio || frustum.near !== frustum._near || frustum.far !== frustum._far || frustum.xOffset !== frustum._xOffset || frustum.yOffset !== frustum._yOffset) {
    if (frustum.fov < 0 || frustum.fov >= Math.PI) {
      throw new DeveloperError_default("fov must be in the range [0, PI).");
    }
    if (frustum.aspectRatio < 0) {
      throw new DeveloperError_default("aspectRatio must be positive.");
    }
    if (frustum.near < 0 || frustum.near > frustum.far) {
      throw new DeveloperError_default(
        "near must be greater than zero and less than far."
      );
    }
    frustum._aspectRatio = frustum.aspectRatio;
    frustum._fov = frustum.fov;
    frustum._fovy = frustum.aspectRatio <= 1 ? frustum.fov : Math.atan(Math.tan(frustum.fov * 0.5) / frustum.aspectRatio) * 2;
    frustum._near = frustum.near;
    frustum._far = frustum.far;
    frustum._sseDenominator = 2 * Math.tan(0.5 * frustum._fovy);
    frustum._xOffset = frustum.xOffset;
    frustum._yOffset = frustum.yOffset;
    f.top = frustum.near * Math.tan(0.5 * frustum._fovy);
    f.bottom = -f.top;
    f.right = frustum.aspectRatio * f.top;
    f.left = -f.right;
    f.near = frustum.near;
    f.far = frustum.far;
    f.right += frustum.xOffset;
    f.left += frustum.xOffset;
    f.top += frustum.yOffset;
    f.bottom += frustum.yOffset;
  }
}
Object.defineProperties(PerspectiveFrustum.prototype, {
  /**
   * Gets the perspective projection matrix computed from the view frustum.
   * @memberof PerspectiveFrustum.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @see PerspectiveFrustum#infiniteProjectionMatrix
   */
  projectionMatrix: {
    get: function() {
      update4(this);
      return this._offCenterFrustum.projectionMatrix;
    }
  },
  /**
   * The perspective projection matrix computed from the view frustum with an infinite far plane.
   * @memberof PerspectiveFrustum.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @see PerspectiveFrustum#projectionMatrix
   */
  infiniteProjectionMatrix: {
    get: function() {
      update4(this);
      return this._offCenterFrustum.infiniteProjectionMatrix;
    }
  },
  /**
   * Gets the angle of the vertical field of view, in radians.
   * @memberof PerspectiveFrustum.prototype
   * @type {number}
   * @readonly
   * @default undefined
   */
  fovy: {
    get: function() {
      update4(this);
      return this._fovy;
    }
  },
  /**
   * @readonly
   * @private
   */
  sseDenominator: {
    get: function() {
      update4(this);
      return this._sseDenominator;
    }
  },
  /**
   * Gets the orthographic projection matrix computed from the view frustum.
   * @memberof PerspectiveFrustum.prototype
   * @type {PerspectiveOffCenterFrustum}
   * @readonly
   * @private
   */
  offCenterFrustum: {
    get: function() {
      update4(this);
      return this._offCenterFrustum;
    }
  }
});
PerspectiveFrustum.prototype.computeCullingVolume = function(position, direction, up) {
  update4(this);
  return this._offCenterFrustum.computeCullingVolume(position, direction, up);
};
PerspectiveFrustum.prototype.getPixelDimensions = function(drawingBufferWidth, drawingBufferHeight, distance, pixelRatio, result) {
  update4(this);
  return this._offCenterFrustum.getPixelDimensions(
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    pixelRatio,
    result
  );
};
PerspectiveFrustum.prototype.clone = function(result) {
  if (!defined_default(result)) {
    result = new PerspectiveFrustum();
  }
  result.aspectRatio = this.aspectRatio;
  result.fov = this.fov;
  result.near = this.near;
  result.far = this.far;
  result._aspectRatio = void 0;
  result._fov = void 0;
  result._near = void 0;
  result._far = void 0;
  this._offCenterFrustum.clone(result._offCenterFrustum);
  return result;
};
PerspectiveFrustum.prototype.equals = function(other) {
  if (!defined_default(other) || !(other instanceof PerspectiveFrustum)) {
    return false;
  }
  update4(this);
  update4(other);
  return this.fov === other.fov && this.aspectRatio === other.aspectRatio && this._offCenterFrustum.equals(other._offCenterFrustum);
};
PerspectiveFrustum.prototype.equalsEpsilon = function(other, relativeEpsilon, absoluteEpsilon) {
  if (!defined_default(other) || !(other instanceof PerspectiveFrustum)) {
    return false;
  }
  update4(this);
  update4(other);
  return Math_default.equalsEpsilon(
    this.fov,
    other.fov,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    this.aspectRatio,
    other.aspectRatio,
    relativeEpsilon,
    absoluteEpsilon
  ) && this._offCenterFrustum.equalsEpsilon(
    other._offCenterFrustum,
    relativeEpsilon,
    absoluteEpsilon
  );
};
var PerspectiveFrustum_default = PerspectiveFrustum;

// packages/engine/Source/Core/FrustumGeometry.js
var PERSPECTIVE = 0;
var ORTHOGRAPHIC = 1;
function FrustumGeometry(options) {
  Check_default.typeOf.object("options", options);
  Check_default.typeOf.object("options.frustum", options.frustum);
  Check_default.typeOf.object("options.origin", options.origin);
  Check_default.typeOf.object("options.orientation", options.orientation);
  const frustum = options.frustum;
  const orientation = options.orientation;
  const origin = options.origin;
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  const drawNearPlane = defaultValue_default(options._drawNearPlane, true);
  let frustumType;
  let frustumPackedLength;
  if (frustum instanceof PerspectiveFrustum_default) {
    frustumType = PERSPECTIVE;
    frustumPackedLength = PerspectiveFrustum_default.packedLength;
  } else if (frustum instanceof OrthographicFrustum_default) {
    frustumType = ORTHOGRAPHIC;
    frustumPackedLength = OrthographicFrustum_default.packedLength;
  }
  this._frustumType = frustumType;
  this._frustum = frustum.clone();
  this._origin = Cartesian3_default.clone(origin);
  this._orientation = Quaternion_default.clone(orientation);
  this._drawNearPlane = drawNearPlane;
  this._vertexFormat = vertexFormat;
  this._workerName = "createFrustumGeometry";
  this.packedLength = 2 + frustumPackedLength + Cartesian3_default.packedLength + Quaternion_default.packedLength + VertexFormat_default.packedLength;
}
FrustumGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const frustumType = value._frustumType;
  const frustum = value._frustum;
  array[startingIndex++] = frustumType;
  if (frustumType === PERSPECTIVE) {
    PerspectiveFrustum_default.pack(frustum, array, startingIndex);
    startingIndex += PerspectiveFrustum_default.packedLength;
  } else {
    OrthographicFrustum_default.pack(frustum, array, startingIndex);
    startingIndex += OrthographicFrustum_default.packedLength;
  }
  Cartesian3_default.pack(value._origin, array, startingIndex);
  startingIndex += Cartesian3_default.packedLength;
  Quaternion_default.pack(value._orientation, array, startingIndex);
  startingIndex += Quaternion_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex] = value._drawNearPlane ? 1 : 0;
  return array;
};
var scratchPackPerspective = new PerspectiveFrustum_default();
var scratchPackOrthographic = new OrthographicFrustum_default();
var scratchPackQuaternion = new Quaternion_default();
var scratchPackorigin = new Cartesian3_default();
var scratchVertexFormat = new VertexFormat_default();
FrustumGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const frustumType = array[startingIndex++];
  let frustum;
  if (frustumType === PERSPECTIVE) {
    frustum = PerspectiveFrustum_default.unpack(
      array,
      startingIndex,
      scratchPackPerspective
    );
    startingIndex += PerspectiveFrustum_default.packedLength;
  } else {
    frustum = OrthographicFrustum_default.unpack(
      array,
      startingIndex,
      scratchPackOrthographic
    );
    startingIndex += OrthographicFrustum_default.packedLength;
  }
  const origin = Cartesian3_default.unpack(array, startingIndex, scratchPackorigin);
  startingIndex += Cartesian3_default.packedLength;
  const orientation = Quaternion_default.unpack(
    array,
    startingIndex,
    scratchPackQuaternion
  );
  startingIndex += Quaternion_default.packedLength;
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const drawNearPlane = array[startingIndex] === 1;
  if (!defined_default(result)) {
    return new FrustumGeometry({
      frustum,
      origin,
      orientation,
      vertexFormat,
      _drawNearPlane: drawNearPlane
    });
  }
  const frustumResult = frustumType === result._frustumType ? result._frustum : void 0;
  result._frustum = frustum.clone(frustumResult);
  result._frustumType = frustumType;
  result._origin = Cartesian3_default.clone(origin, result._origin);
  result._orientation = Quaternion_default.clone(orientation, result._orientation);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._drawNearPlane = drawNearPlane;
  return result;
};
function getAttributes(offset, normals, tangents, bitangents, st, normal, tangent, bitangent) {
  const stOffset = offset / 3 * 2;
  for (let i = 0; i < 4; ++i) {
    if (defined_default(normals)) {
      normals[offset] = normal.x;
      normals[offset + 1] = normal.y;
      normals[offset + 2] = normal.z;
    }
    if (defined_default(tangents)) {
      tangents[offset] = tangent.x;
      tangents[offset + 1] = tangent.y;
      tangents[offset + 2] = tangent.z;
    }
    if (defined_default(bitangents)) {
      bitangents[offset] = bitangent.x;
      bitangents[offset + 1] = bitangent.y;
      bitangents[offset + 2] = bitangent.z;
    }
    offset += 3;
  }
  st[stOffset] = 0;
  st[stOffset + 1] = 0;
  st[stOffset + 2] = 1;
  st[stOffset + 3] = 0;
  st[stOffset + 4] = 1;
  st[stOffset + 5] = 1;
  st[stOffset + 6] = 0;
  st[stOffset + 7] = 1;
}
var scratchRotationMatrix = new Matrix3_default();
var scratchViewMatrix = new Matrix4_default();
var scratchInverseMatrix = new Matrix4_default();
var scratchXDirection = new Cartesian3_default();
var scratchYDirection = new Cartesian3_default();
var scratchZDirection = new Cartesian3_default();
var scratchNegativeX = new Cartesian3_default();
var scratchNegativeY = new Cartesian3_default();
var scratchNegativeZ = new Cartesian3_default();
var frustumSplits = new Array(3);
var frustumCornersNDC = new Array(4);
frustumCornersNDC[0] = new Cartesian4_default(-1, -1, 1, 1);
frustumCornersNDC[1] = new Cartesian4_default(1, -1, 1, 1);
frustumCornersNDC[2] = new Cartesian4_default(1, 1, 1, 1);
frustumCornersNDC[3] = new Cartesian4_default(-1, 1, 1, 1);
var scratchFrustumCorners = new Array(4);
for (let i = 0; i < 4; ++i) {
  scratchFrustumCorners[i] = new Cartesian4_default();
}
FrustumGeometry._computeNearFarPlanes = function(origin, orientation, frustumType, frustum, positions, xDirection, yDirection, zDirection) {
  const rotationMatrix = Matrix3_default.fromQuaternion(
    orientation,
    scratchRotationMatrix
  );
  let x = defaultValue_default(xDirection, scratchXDirection);
  let y = defaultValue_default(yDirection, scratchYDirection);
  let z = defaultValue_default(zDirection, scratchZDirection);
  x = Matrix3_default.getColumn(rotationMatrix, 0, x);
  y = Matrix3_default.getColumn(rotationMatrix, 1, y);
  z = Matrix3_default.getColumn(rotationMatrix, 2, z);
  Cartesian3_default.normalize(x, x);
  Cartesian3_default.normalize(y, y);
  Cartesian3_default.normalize(z, z);
  Cartesian3_default.negate(x, x);
  const view = Matrix4_default.computeView(origin, z, y, x, scratchViewMatrix);
  let inverseView;
  let inverseViewProjection;
  const projection = frustum.projectionMatrix;
  if (frustumType === PERSPECTIVE) {
    const viewProjection = Matrix4_default.multiply(
      projection,
      view,
      scratchInverseMatrix
    );
    inverseViewProjection = Matrix4_default.inverse(
      viewProjection,
      scratchInverseMatrix
    );
  } else {
    inverseView = Matrix4_default.inverseTransformation(view, scratchInverseMatrix);
  }
  if (defined_default(inverseViewProjection)) {
    frustumSplits[0] = frustum.near;
    frustumSplits[1] = frustum.far;
  } else {
    frustumSplits[0] = 0;
    frustumSplits[1] = frustum.near;
    frustumSplits[2] = frustum.far;
  }
  for (let i = 0; i < 2; ++i) {
    for (let j = 0; j < 4; ++j) {
      let corner = Cartesian4_default.clone(
        frustumCornersNDC[j],
        scratchFrustumCorners[j]
      );
      if (!defined_default(inverseViewProjection)) {
        const offCenterFrustum = frustum.offCenterFrustum;
        if (defined_default(offCenterFrustum)) {
          frustum = offCenterFrustum;
        }
        const near = frustumSplits[i];
        const far = frustumSplits[i + 1];
        corner.x = (corner.x * (frustum.right - frustum.left) + frustum.left + frustum.right) * 0.5;
        corner.y = (corner.y * (frustum.top - frustum.bottom) + frustum.bottom + frustum.top) * 0.5;
        corner.z = (corner.z * (near - far) - near - far) * 0.5;
        corner.w = 1;
        Matrix4_default.multiplyByVector(inverseView, corner, corner);
      } else {
        corner = Matrix4_default.multiplyByVector(
          inverseViewProjection,
          corner,
          corner
        );
        const w = 1 / corner.w;
        Cartesian3_default.multiplyByScalar(corner, w, corner);
        Cartesian3_default.subtract(corner, origin, corner);
        Cartesian3_default.normalize(corner, corner);
        const fac = Cartesian3_default.dot(z, corner);
        Cartesian3_default.multiplyByScalar(corner, frustumSplits[i] / fac, corner);
        Cartesian3_default.add(corner, origin, corner);
      }
      positions[12 * i + j * 3] = corner.x;
      positions[12 * i + j * 3 + 1] = corner.y;
      positions[12 * i + j * 3 + 2] = corner.z;
    }
  }
};
FrustumGeometry.createGeometry = function(frustumGeometry) {
  const frustumType = frustumGeometry._frustumType;
  const frustum = frustumGeometry._frustum;
  const origin = frustumGeometry._origin;
  const orientation = frustumGeometry._orientation;
  const drawNearPlane = frustumGeometry._drawNearPlane;
  const vertexFormat = frustumGeometry._vertexFormat;
  const numberOfPlanes = drawNearPlane ? 6 : 5;
  let positions = new Float64Array(3 * 4 * 6);
  FrustumGeometry._computeNearFarPlanes(
    origin,
    orientation,
    frustumType,
    frustum,
    positions
  );
  let offset = 3 * 4 * 2;
  positions[offset] = positions[3 * 4];
  positions[offset + 1] = positions[3 * 4 + 1];
  positions[offset + 2] = positions[3 * 4 + 2];
  positions[offset + 3] = positions[0];
  positions[offset + 4] = positions[1];
  positions[offset + 5] = positions[2];
  positions[offset + 6] = positions[3 * 3];
  positions[offset + 7] = positions[3 * 3 + 1];
  positions[offset + 8] = positions[3 * 3 + 2];
  positions[offset + 9] = positions[3 * 7];
  positions[offset + 10] = positions[3 * 7 + 1];
  positions[offset + 11] = positions[3 * 7 + 2];
  offset += 3 * 4;
  positions[offset] = positions[3 * 5];
  positions[offset + 1] = positions[3 * 5 + 1];
  positions[offset + 2] = positions[3 * 5 + 2];
  positions[offset + 3] = positions[3];
  positions[offset + 4] = positions[3 + 1];
  positions[offset + 5] = positions[3 + 2];
  positions[offset + 6] = positions[0];
  positions[offset + 7] = positions[1];
  positions[offset + 8] = positions[2];
  positions[offset + 9] = positions[3 * 4];
  positions[offset + 10] = positions[3 * 4 + 1];
  positions[offset + 11] = positions[3 * 4 + 2];
  offset += 3 * 4;
  positions[offset] = positions[3];
  positions[offset + 1] = positions[3 + 1];
  positions[offset + 2] = positions[3 + 2];
  positions[offset + 3] = positions[3 * 5];
  positions[offset + 4] = positions[3 * 5 + 1];
  positions[offset + 5] = positions[3 * 5 + 2];
  positions[offset + 6] = positions[3 * 6];
  positions[offset + 7] = positions[3 * 6 + 1];
  positions[offset + 8] = positions[3 * 6 + 2];
  positions[offset + 9] = positions[3 * 2];
  positions[offset + 10] = positions[3 * 2 + 1];
  positions[offset + 11] = positions[3 * 2 + 2];
  offset += 3 * 4;
  positions[offset] = positions[3 * 2];
  positions[offset + 1] = positions[3 * 2 + 1];
  positions[offset + 2] = positions[3 * 2 + 2];
  positions[offset + 3] = positions[3 * 6];
  positions[offset + 4] = positions[3 * 6 + 1];
  positions[offset + 5] = positions[3 * 6 + 2];
  positions[offset + 6] = positions[3 * 7];
  positions[offset + 7] = positions[3 * 7 + 1];
  positions[offset + 8] = positions[3 * 7 + 2];
  positions[offset + 9] = positions[3 * 3];
  positions[offset + 10] = positions[3 * 3 + 1];
  positions[offset + 11] = positions[3 * 3 + 2];
  if (!drawNearPlane) {
    positions = positions.subarray(3 * 4);
  }
  const attributes = new GeometryAttributes_default({
    position: new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: positions
    })
  });
  if (defined_default(vertexFormat.normal) || defined_default(vertexFormat.tangent) || defined_default(vertexFormat.bitangent) || defined_default(vertexFormat.st)) {
    const normals = defined_default(vertexFormat.normal) ? new Float32Array(3 * 4 * numberOfPlanes) : void 0;
    const tangents = defined_default(vertexFormat.tangent) ? new Float32Array(3 * 4 * numberOfPlanes) : void 0;
    const bitangents = defined_default(vertexFormat.bitangent) ? new Float32Array(3 * 4 * numberOfPlanes) : void 0;
    const st = defined_default(vertexFormat.st) ? new Float32Array(2 * 4 * numberOfPlanes) : void 0;
    const x = scratchXDirection;
    const y = scratchYDirection;
    const z = scratchZDirection;
    const negativeX = Cartesian3_default.negate(x, scratchNegativeX);
    const negativeY = Cartesian3_default.negate(y, scratchNegativeY);
    const negativeZ = Cartesian3_default.negate(z, scratchNegativeZ);
    offset = 0;
    if (drawNearPlane) {
      getAttributes(offset, normals, tangents, bitangents, st, negativeZ, x, y);
      offset += 3 * 4;
    }
    getAttributes(offset, normals, tangents, bitangents, st, z, negativeX, y);
    offset += 3 * 4;
    getAttributes(
      offset,
      normals,
      tangents,
      bitangents,
      st,
      negativeX,
      negativeZ,
      y
    );
    offset += 3 * 4;
    getAttributes(
      offset,
      normals,
      tangents,
      bitangents,
      st,
      negativeY,
      negativeZ,
      negativeX
    );
    offset += 3 * 4;
    getAttributes(offset, normals, tangents, bitangents, st, x, z, y);
    offset += 3 * 4;
    getAttributes(offset, normals, tangents, bitangents, st, y, z, negativeX);
    if (defined_default(normals)) {
      attributes.normal = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: normals
      });
    }
    if (defined_default(tangents)) {
      attributes.tangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: tangents
      });
    }
    if (defined_default(bitangents)) {
      attributes.bitangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: bitangents
      });
    }
    if (defined_default(st)) {
      attributes.st = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 2,
        values: st
      });
    }
  }
  const indices = new Uint16Array(6 * numberOfPlanes);
  for (let i = 0; i < numberOfPlanes; ++i) {
    const indexOffset = i * 6;
    const index = i * 4;
    indices[indexOffset] = index;
    indices[indexOffset + 1] = index + 1;
    indices[indexOffset + 2] = index + 2;
    indices[indexOffset + 3] = index;
    indices[indexOffset + 4] = index + 2;
    indices[indexOffset + 5] = index + 3;
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere: BoundingSphere_default.fromVertices(positions)
  });
};
var FrustumGeometry_default = FrustumGeometry;

export {
  OrthographicFrustum_default,
  PerspectiveFrustum_default,
  FrustumGeometry_default
};
