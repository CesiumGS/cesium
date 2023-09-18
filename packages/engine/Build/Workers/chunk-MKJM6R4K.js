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
  Interval_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian3_default,
  Cartographic_default,
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

// packages/engine/Source/Core/QuadraticRealPolynomial.js
var QuadraticRealPolynomial = {};
QuadraticRealPolynomial.computeDiscriminant = function(a, b, c) {
  if (typeof a !== "number") {
    throw new DeveloperError_default("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError_default("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError_default("c is a required number.");
  }
  const discriminant = b * b - 4 * a * c;
  return discriminant;
};
function addWithCancellationCheck(left, right, tolerance) {
  const difference = left + right;
  if (Math_default.sign(left) !== Math_default.sign(right) && Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance) {
    return 0;
  }
  return difference;
}
QuadraticRealPolynomial.computeRealRoots = function(a, b, c) {
  if (typeof a !== "number") {
    throw new DeveloperError_default("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError_default("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError_default("c is a required number.");
  }
  let ratio;
  if (a === 0) {
    if (b === 0) {
      return [];
    }
    return [-c / b];
  } else if (b === 0) {
    if (c === 0) {
      return [0, 0];
    }
    const cMagnitude = Math.abs(c);
    const aMagnitude = Math.abs(a);
    if (cMagnitude < aMagnitude && cMagnitude / aMagnitude < Math_default.EPSILON14) {
      return [0, 0];
    } else if (cMagnitude > aMagnitude && aMagnitude / cMagnitude < Math_default.EPSILON14) {
      return [];
    }
    ratio = -c / a;
    if (ratio < 0) {
      return [];
    }
    const root = Math.sqrt(ratio);
    return [-root, root];
  } else if (c === 0) {
    ratio = -b / a;
    if (ratio < 0) {
      return [ratio, 0];
    }
    return [0, ratio];
  }
  const b2 = b * b;
  const four_ac = 4 * a * c;
  const radicand = addWithCancellationCheck(b2, -four_ac, Math_default.EPSILON14);
  if (radicand < 0) {
    return [];
  }
  const q = -0.5 * addWithCancellationCheck(
    b,
    Math_default.sign(b) * Math.sqrt(radicand),
    Math_default.EPSILON14
  );
  if (b > 0) {
    return [q / a, c / q];
  }
  return [c / q, q / a];
};
var QuadraticRealPolynomial_default = QuadraticRealPolynomial;

// packages/engine/Source/Core/CubicRealPolynomial.js
var CubicRealPolynomial = {};
CubicRealPolynomial.computeDiscriminant = function(a, b, c, d) {
  if (typeof a !== "number") {
    throw new DeveloperError_default("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError_default("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError_default("c is a required number.");
  }
  if (typeof d !== "number") {
    throw new DeveloperError_default("d is a required number.");
  }
  const a2 = a * a;
  const b2 = b * b;
  const c2 = c * c;
  const d2 = d * d;
  const discriminant = 18 * a * b * c * d + b2 * c2 - 27 * a2 * d2 - 4 * (a * c2 * c + b2 * b * d);
  return discriminant;
};
function computeRealRoots(a, b, c, d) {
  const A = a;
  const B = b / 3;
  const C = c / 3;
  const D = d;
  const AC = A * C;
  const BD = B * D;
  const B2 = B * B;
  const C2 = C * C;
  const delta1 = A * C - B2;
  const delta2 = A * D - B * C;
  const delta3 = B * D - C2;
  const discriminant = 4 * delta1 * delta3 - delta2 * delta2;
  let temp;
  let temp1;
  if (discriminant < 0) {
    let ABar;
    let CBar;
    let DBar;
    if (B2 * BD >= AC * C2) {
      ABar = A;
      CBar = delta1;
      DBar = -2 * B * delta1 + A * delta2;
    } else {
      ABar = D;
      CBar = delta3;
      DBar = -D * delta2 + 2 * C * delta3;
    }
    const s = DBar < 0 ? -1 : 1;
    const temp0 = -s * Math.abs(ABar) * Math.sqrt(-discriminant);
    temp1 = -DBar + temp0;
    const x = temp1 / 2;
    const p = x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3);
    const q = temp1 === temp0 ? -p : -CBar / p;
    temp = CBar <= 0 ? p + q : -DBar / (p * p + q * q + CBar);
    if (B2 * BD >= AC * C2) {
      return [(temp - B) / A];
    }
    return [-D / (temp + C)];
  }
  const CBarA = delta1;
  const DBarA = -2 * B * delta1 + A * delta2;
  const CBarD = delta3;
  const DBarD = -D * delta2 + 2 * C * delta3;
  const squareRootOfDiscriminant = Math.sqrt(discriminant);
  const halfSquareRootOf3 = Math.sqrt(3) / 2;
  let theta = Math.abs(Math.atan2(A * squareRootOfDiscriminant, -DBarA) / 3);
  temp = 2 * Math.sqrt(-CBarA);
  let cosine = Math.cos(theta);
  temp1 = temp * cosine;
  let temp3 = temp * (-cosine / 2 - halfSquareRootOf3 * Math.sin(theta));
  const numeratorLarge = temp1 + temp3 > 2 * B ? temp1 - B : temp3 - B;
  const denominatorLarge = A;
  const root1 = numeratorLarge / denominatorLarge;
  theta = Math.abs(Math.atan2(D * squareRootOfDiscriminant, -DBarD) / 3);
  temp = 2 * Math.sqrt(-CBarD);
  cosine = Math.cos(theta);
  temp1 = temp * cosine;
  temp3 = temp * (-cosine / 2 - halfSquareRootOf3 * Math.sin(theta));
  const numeratorSmall = -D;
  const denominatorSmall = temp1 + temp3 < 2 * C ? temp1 + C : temp3 + C;
  const root3 = numeratorSmall / denominatorSmall;
  const E = denominatorLarge * denominatorSmall;
  const F = -numeratorLarge * denominatorSmall - denominatorLarge * numeratorSmall;
  const G = numeratorLarge * numeratorSmall;
  const root2 = (C * F - B * G) / (-B * F + C * E);
  if (root1 <= root2) {
    if (root1 <= root3) {
      if (root2 <= root3) {
        return [root1, root2, root3];
      }
      return [root1, root3, root2];
    }
    return [root3, root1, root2];
  }
  if (root1 <= root3) {
    return [root2, root1, root3];
  }
  if (root2 <= root3) {
    return [root2, root3, root1];
  }
  return [root3, root2, root1];
}
CubicRealPolynomial.computeRealRoots = function(a, b, c, d) {
  if (typeof a !== "number") {
    throw new DeveloperError_default("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError_default("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError_default("c is a required number.");
  }
  if (typeof d !== "number") {
    throw new DeveloperError_default("d is a required number.");
  }
  let roots;
  let ratio;
  if (a === 0) {
    return QuadraticRealPolynomial_default.computeRealRoots(b, c, d);
  } else if (b === 0) {
    if (c === 0) {
      if (d === 0) {
        return [0, 0, 0];
      }
      ratio = -d / a;
      const root = ratio < 0 ? -Math.pow(-ratio, 1 / 3) : Math.pow(ratio, 1 / 3);
      return [root, root, root];
    } else if (d === 0) {
      roots = QuadraticRealPolynomial_default.computeRealRoots(a, 0, c);
      if (roots.Length === 0) {
        return [0];
      }
      return [roots[0], 0, roots[1]];
    }
    return computeRealRoots(a, 0, c, d);
  } else if (c === 0) {
    if (d === 0) {
      ratio = -b / a;
      if (ratio < 0) {
        return [ratio, 0, 0];
      }
      return [0, 0, ratio];
    }
    return computeRealRoots(a, b, 0, d);
  } else if (d === 0) {
    roots = QuadraticRealPolynomial_default.computeRealRoots(a, b, c);
    if (roots.length === 0) {
      return [0];
    } else if (roots[1] <= 0) {
      return [roots[0], roots[1], 0];
    } else if (roots[0] >= 0) {
      return [0, roots[0], roots[1]];
    }
    return [roots[0], 0, roots[1]];
  }
  return computeRealRoots(a, b, c, d);
};
var CubicRealPolynomial_default = CubicRealPolynomial;

// packages/engine/Source/Core/QuarticRealPolynomial.js
var QuarticRealPolynomial = {};
QuarticRealPolynomial.computeDiscriminant = function(a, b, c, d, e) {
  if (typeof a !== "number") {
    throw new DeveloperError_default("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError_default("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError_default("c is a required number.");
  }
  if (typeof d !== "number") {
    throw new DeveloperError_default("d is a required number.");
  }
  if (typeof e !== "number") {
    throw new DeveloperError_default("e is a required number.");
  }
  const a2 = a * a;
  const a3 = a2 * a;
  const b2 = b * b;
  const b3 = b2 * b;
  const c2 = c * c;
  const c3 = c2 * c;
  const d2 = d * d;
  const d3 = d2 * d;
  const e2 = e * e;
  const e3 = e2 * e;
  const discriminant = b2 * c2 * d2 - 4 * b3 * d3 - 4 * a * c3 * d2 + 18 * a * b * c * d3 - 27 * a2 * d2 * d2 + 256 * a3 * e3 + e * (18 * b3 * c * d - 4 * b2 * c3 + 16 * a * c2 * c2 - 80 * a * b * c2 * d - 6 * a * b2 * d2 + 144 * a2 * c * d2) + e2 * (144 * a * b2 * c - 27 * b2 * b2 - 128 * a2 * c2 - 192 * a2 * b * d);
  return discriminant;
};
function original(a3, a2, a1, a0) {
  const a3Squared = a3 * a3;
  const p = a2 - 3 * a3Squared / 8;
  const q = a1 - a2 * a3 / 2 + a3Squared * a3 / 8;
  const r = a0 - a1 * a3 / 4 + a2 * a3Squared / 16 - 3 * a3Squared * a3Squared / 256;
  const cubicRoots = CubicRealPolynomial_default.computeRealRoots(
    1,
    2 * p,
    p * p - 4 * r,
    -q * q
  );
  if (cubicRoots.length > 0) {
    const temp = -a3 / 4;
    const hSquared = cubicRoots[cubicRoots.length - 1];
    if (Math.abs(hSquared) < Math_default.EPSILON14) {
      const roots = QuadraticRealPolynomial_default.computeRealRoots(1, p, r);
      if (roots.length === 2) {
        const root0 = roots[0];
        const root1 = roots[1];
        let y;
        if (root0 >= 0 && root1 >= 0) {
          const y0 = Math.sqrt(root0);
          const y1 = Math.sqrt(root1);
          return [temp - y1, temp - y0, temp + y0, temp + y1];
        } else if (root0 >= 0 && root1 < 0) {
          y = Math.sqrt(root0);
          return [temp - y, temp + y];
        } else if (root0 < 0 && root1 >= 0) {
          y = Math.sqrt(root1);
          return [temp - y, temp + y];
        }
      }
      return [];
    } else if (hSquared > 0) {
      const h = Math.sqrt(hSquared);
      const m = (p + hSquared - q / h) / 2;
      const n = (p + hSquared + q / h) / 2;
      const roots1 = QuadraticRealPolynomial_default.computeRealRoots(1, h, m);
      const roots2 = QuadraticRealPolynomial_default.computeRealRoots(1, -h, n);
      if (roots1.length !== 0) {
        roots1[0] += temp;
        roots1[1] += temp;
        if (roots2.length !== 0) {
          roots2[0] += temp;
          roots2[1] += temp;
          if (roots1[1] <= roots2[0]) {
            return [roots1[0], roots1[1], roots2[0], roots2[1]];
          } else if (roots2[1] <= roots1[0]) {
            return [roots2[0], roots2[1], roots1[0], roots1[1]];
          } else if (roots1[0] >= roots2[0] && roots1[1] <= roots2[1]) {
            return [roots2[0], roots1[0], roots1[1], roots2[1]];
          } else if (roots2[0] >= roots1[0] && roots2[1] <= roots1[1]) {
            return [roots1[0], roots2[0], roots2[1], roots1[1]];
          } else if (roots1[0] > roots2[0] && roots1[0] < roots2[1]) {
            return [roots2[0], roots1[0], roots2[1], roots1[1]];
          }
          return [roots1[0], roots2[0], roots1[1], roots2[1]];
        }
        return roots1;
      }
      if (roots2.length !== 0) {
        roots2[0] += temp;
        roots2[1] += temp;
        return roots2;
      }
      return [];
    }
  }
  return [];
}
function neumark(a3, a2, a1, a0) {
  const a1Squared = a1 * a1;
  const a2Squared = a2 * a2;
  const a3Squared = a3 * a3;
  const p = -2 * a2;
  const q = a1 * a3 + a2Squared - 4 * a0;
  const r = a3Squared * a0 - a1 * a2 * a3 + a1Squared;
  const cubicRoots = CubicRealPolynomial_default.computeRealRoots(1, p, q, r);
  if (cubicRoots.length > 0) {
    const y = cubicRoots[0];
    const temp = a2 - y;
    const tempSquared = temp * temp;
    const g1 = a3 / 2;
    const h1 = temp / 2;
    const m = tempSquared - 4 * a0;
    const mError = tempSquared + 4 * Math.abs(a0);
    const n = a3Squared - 4 * y;
    const nError = a3Squared + 4 * Math.abs(y);
    let g2;
    let h2;
    if (y < 0 || m * nError < n * mError) {
      const squareRootOfN = Math.sqrt(n);
      g2 = squareRootOfN / 2;
      h2 = squareRootOfN === 0 ? 0 : (a3 * h1 - a1) / squareRootOfN;
    } else {
      const squareRootOfM = Math.sqrt(m);
      g2 = squareRootOfM === 0 ? 0 : (a3 * h1 - a1) / squareRootOfM;
      h2 = squareRootOfM / 2;
    }
    let G;
    let g;
    if (g1 === 0 && g2 === 0) {
      G = 0;
      g = 0;
    } else if (Math_default.sign(g1) === Math_default.sign(g2)) {
      G = g1 + g2;
      g = y / G;
    } else {
      g = g1 - g2;
      G = y / g;
    }
    let H;
    let h;
    if (h1 === 0 && h2 === 0) {
      H = 0;
      h = 0;
    } else if (Math_default.sign(h1) === Math_default.sign(h2)) {
      H = h1 + h2;
      h = a0 / H;
    } else {
      h = h1 - h2;
      H = a0 / h;
    }
    const roots1 = QuadraticRealPolynomial_default.computeRealRoots(1, G, H);
    const roots2 = QuadraticRealPolynomial_default.computeRealRoots(1, g, h);
    if (roots1.length !== 0) {
      if (roots2.length !== 0) {
        if (roots1[1] <= roots2[0]) {
          return [roots1[0], roots1[1], roots2[0], roots2[1]];
        } else if (roots2[1] <= roots1[0]) {
          return [roots2[0], roots2[1], roots1[0], roots1[1]];
        } else if (roots1[0] >= roots2[0] && roots1[1] <= roots2[1]) {
          return [roots2[0], roots1[0], roots1[1], roots2[1]];
        } else if (roots2[0] >= roots1[0] && roots2[1] <= roots1[1]) {
          return [roots1[0], roots2[0], roots2[1], roots1[1]];
        } else if (roots1[0] > roots2[0] && roots1[0] < roots2[1]) {
          return [roots2[0], roots1[0], roots2[1], roots1[1]];
        }
        return [roots1[0], roots2[0], roots1[1], roots2[1]];
      }
      return roots1;
    }
    if (roots2.length !== 0) {
      return roots2;
    }
  }
  return [];
}
QuarticRealPolynomial.computeRealRoots = function(a, b, c, d, e) {
  if (typeof a !== "number") {
    throw new DeveloperError_default("a is a required number.");
  }
  if (typeof b !== "number") {
    throw new DeveloperError_default("b is a required number.");
  }
  if (typeof c !== "number") {
    throw new DeveloperError_default("c is a required number.");
  }
  if (typeof d !== "number") {
    throw new DeveloperError_default("d is a required number.");
  }
  if (typeof e !== "number") {
    throw new DeveloperError_default("e is a required number.");
  }
  if (Math.abs(a) < Math_default.EPSILON15) {
    return CubicRealPolynomial_default.computeRealRoots(b, c, d, e);
  }
  const a3 = b / a;
  const a2 = c / a;
  const a1 = d / a;
  const a0 = e / a;
  let k = a3 < 0 ? 1 : 0;
  k += a2 < 0 ? k + 1 : k;
  k += a1 < 0 ? k + 1 : k;
  k += a0 < 0 ? k + 1 : k;
  switch (k) {
    case 0:
      return original(a3, a2, a1, a0);
    case 1:
      return neumark(a3, a2, a1, a0);
    case 2:
      return neumark(a3, a2, a1, a0);
    case 3:
      return original(a3, a2, a1, a0);
    case 4:
      return original(a3, a2, a1, a0);
    case 5:
      return neumark(a3, a2, a1, a0);
    case 6:
      return original(a3, a2, a1, a0);
    case 7:
      return original(a3, a2, a1, a0);
    case 8:
      return neumark(a3, a2, a1, a0);
    case 9:
      return original(a3, a2, a1, a0);
    case 10:
      return original(a3, a2, a1, a0);
    case 11:
      return neumark(a3, a2, a1, a0);
    case 12:
      return original(a3, a2, a1, a0);
    case 13:
      return original(a3, a2, a1, a0);
    case 14:
      return original(a3, a2, a1, a0);
    case 15:
      return original(a3, a2, a1, a0);
    default:
      return void 0;
  }
};
var QuarticRealPolynomial_default = QuarticRealPolynomial;

// packages/engine/Source/Core/Ray.js
function Ray(origin, direction) {
  direction = Cartesian3_default.clone(defaultValue_default(direction, Cartesian3_default.ZERO));
  if (!Cartesian3_default.equals(direction, Cartesian3_default.ZERO)) {
    Cartesian3_default.normalize(direction, direction);
  }
  this.origin = Cartesian3_default.clone(defaultValue_default(origin, Cartesian3_default.ZERO));
  this.direction = direction;
}
Ray.clone = function(ray, result) {
  if (!defined_default(ray)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Ray(ray.origin, ray.direction);
  }
  result.origin = Cartesian3_default.clone(ray.origin);
  result.direction = Cartesian3_default.clone(ray.direction);
  return result;
};
Ray.getPoint = function(ray, t, result) {
  Check_default.typeOf.object("ray", ray);
  Check_default.typeOf.number("t", t);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  result = Cartesian3_default.multiplyByScalar(ray.direction, t, result);
  return Cartesian3_default.add(ray.origin, result, result);
};
var Ray_default = Ray;

// packages/engine/Source/Core/IntersectionTests.js
var IntersectionTests = {};
IntersectionTests.rayPlane = function(ray, plane, result) {
  if (!defined_default(ray)) {
    throw new DeveloperError_default("ray is required.");
  }
  if (!defined_default(plane)) {
    throw new DeveloperError_default("plane is required.");
  }
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  const origin = ray.origin;
  const direction = ray.direction;
  const normal = plane.normal;
  const denominator = Cartesian3_default.dot(normal, direction);
  if (Math.abs(denominator) < Math_default.EPSILON15) {
    return void 0;
  }
  const t = (-plane.distance - Cartesian3_default.dot(normal, origin)) / denominator;
  if (t < 0) {
    return void 0;
  }
  result = Cartesian3_default.multiplyByScalar(direction, t, result);
  return Cartesian3_default.add(origin, result, result);
};
var scratchEdge0 = new Cartesian3_default();
var scratchEdge1 = new Cartesian3_default();
var scratchPVec = new Cartesian3_default();
var scratchTVec = new Cartesian3_default();
var scratchQVec = new Cartesian3_default();
IntersectionTests.rayTriangleParametric = function(ray, p0, p1, p2, cullBackFaces) {
  if (!defined_default(ray)) {
    throw new DeveloperError_default("ray is required.");
  }
  if (!defined_default(p0)) {
    throw new DeveloperError_default("p0 is required.");
  }
  if (!defined_default(p1)) {
    throw new DeveloperError_default("p1 is required.");
  }
  if (!defined_default(p2)) {
    throw new DeveloperError_default("p2 is required.");
  }
  cullBackFaces = defaultValue_default(cullBackFaces, false);
  const origin = ray.origin;
  const direction = ray.direction;
  const edge0 = Cartesian3_default.subtract(p1, p0, scratchEdge0);
  const edge1 = Cartesian3_default.subtract(p2, p0, scratchEdge1);
  const p = Cartesian3_default.cross(direction, edge1, scratchPVec);
  const det = Cartesian3_default.dot(edge0, p);
  let tvec;
  let q;
  let u;
  let v;
  let t;
  if (cullBackFaces) {
    if (det < Math_default.EPSILON6) {
      return void 0;
    }
    tvec = Cartesian3_default.subtract(origin, p0, scratchTVec);
    u = Cartesian3_default.dot(tvec, p);
    if (u < 0 || u > det) {
      return void 0;
    }
    q = Cartesian3_default.cross(tvec, edge0, scratchQVec);
    v = Cartesian3_default.dot(direction, q);
    if (v < 0 || u + v > det) {
      return void 0;
    }
    t = Cartesian3_default.dot(edge1, q) / det;
  } else {
    if (Math.abs(det) < Math_default.EPSILON6) {
      return void 0;
    }
    const invDet = 1 / det;
    tvec = Cartesian3_default.subtract(origin, p0, scratchTVec);
    u = Cartesian3_default.dot(tvec, p) * invDet;
    if (u < 0 || u > 1) {
      return void 0;
    }
    q = Cartesian3_default.cross(tvec, edge0, scratchQVec);
    v = Cartesian3_default.dot(direction, q) * invDet;
    if (v < 0 || u + v > 1) {
      return void 0;
    }
    t = Cartesian3_default.dot(edge1, q) * invDet;
  }
  return t;
};
IntersectionTests.rayTriangle = function(ray, p0, p1, p2, cullBackFaces, result) {
  const t = IntersectionTests.rayTriangleParametric(
    ray,
    p0,
    p1,
    p2,
    cullBackFaces
  );
  if (!defined_default(t) || t < 0) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  Cartesian3_default.multiplyByScalar(ray.direction, t, result);
  return Cartesian3_default.add(ray.origin, result, result);
};
var scratchLineSegmentTriangleRay = new Ray_default();
IntersectionTests.lineSegmentTriangle = function(v0, v1, p0, p1, p2, cullBackFaces, result) {
  if (!defined_default(v0)) {
    throw new DeveloperError_default("v0 is required.");
  }
  if (!defined_default(v1)) {
    throw new DeveloperError_default("v1 is required.");
  }
  if (!defined_default(p0)) {
    throw new DeveloperError_default("p0 is required.");
  }
  if (!defined_default(p1)) {
    throw new DeveloperError_default("p1 is required.");
  }
  if (!defined_default(p2)) {
    throw new DeveloperError_default("p2 is required.");
  }
  const ray = scratchLineSegmentTriangleRay;
  Cartesian3_default.clone(v0, ray.origin);
  Cartesian3_default.subtract(v1, v0, ray.direction);
  Cartesian3_default.normalize(ray.direction, ray.direction);
  const t = IntersectionTests.rayTriangleParametric(
    ray,
    p0,
    p1,
    p2,
    cullBackFaces
  );
  if (!defined_default(t) || t < 0 || t > Cartesian3_default.distance(v0, v1)) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  Cartesian3_default.multiplyByScalar(ray.direction, t, result);
  return Cartesian3_default.add(ray.origin, result, result);
};
function solveQuadratic(a, b, c, result) {
  const det = b * b - 4 * a * c;
  if (det < 0) {
    return void 0;
  } else if (det > 0) {
    const denom = 1 / (2 * a);
    const disc = Math.sqrt(det);
    const root0 = (-b + disc) * denom;
    const root1 = (-b - disc) * denom;
    if (root0 < root1) {
      result.root0 = root0;
      result.root1 = root1;
    } else {
      result.root0 = root1;
      result.root1 = root0;
    }
    return result;
  }
  const root = -b / (2 * a);
  if (root === 0) {
    return void 0;
  }
  result.root0 = result.root1 = root;
  return result;
}
var raySphereRoots = {
  root0: 0,
  root1: 0
};
function raySphere(ray, sphere, result) {
  if (!defined_default(result)) {
    result = new Interval_default();
  }
  const origin = ray.origin;
  const direction = ray.direction;
  const center = sphere.center;
  const radiusSquared = sphere.radius * sphere.radius;
  const diff = Cartesian3_default.subtract(origin, center, scratchPVec);
  const a = Cartesian3_default.dot(direction, direction);
  const b = 2 * Cartesian3_default.dot(direction, diff);
  const c = Cartesian3_default.magnitudeSquared(diff) - radiusSquared;
  const roots = solveQuadratic(a, b, c, raySphereRoots);
  if (!defined_default(roots)) {
    return void 0;
  }
  result.start = roots.root0;
  result.stop = roots.root1;
  return result;
}
IntersectionTests.raySphere = function(ray, sphere, result) {
  if (!defined_default(ray)) {
    throw new DeveloperError_default("ray is required.");
  }
  if (!defined_default(sphere)) {
    throw new DeveloperError_default("sphere is required.");
  }
  result = raySphere(ray, sphere, result);
  if (!defined_default(result) || result.stop < 0) {
    return void 0;
  }
  result.start = Math.max(result.start, 0);
  return result;
};
var scratchLineSegmentRay = new Ray_default();
IntersectionTests.lineSegmentSphere = function(p0, p1, sphere, result) {
  if (!defined_default(p0)) {
    throw new DeveloperError_default("p0 is required.");
  }
  if (!defined_default(p1)) {
    throw new DeveloperError_default("p1 is required.");
  }
  if (!defined_default(sphere)) {
    throw new DeveloperError_default("sphere is required.");
  }
  const ray = scratchLineSegmentRay;
  Cartesian3_default.clone(p0, ray.origin);
  const direction = Cartesian3_default.subtract(p1, p0, ray.direction);
  const maxT = Cartesian3_default.magnitude(direction);
  Cartesian3_default.normalize(direction, direction);
  result = raySphere(ray, sphere, result);
  if (!defined_default(result) || result.stop < 0 || result.start > maxT) {
    return void 0;
  }
  result.start = Math.max(result.start, 0);
  result.stop = Math.min(result.stop, maxT);
  return result;
};
var scratchQ = new Cartesian3_default();
var scratchW = new Cartesian3_default();
IntersectionTests.rayEllipsoid = function(ray, ellipsoid) {
  if (!defined_default(ray)) {
    throw new DeveloperError_default("ray is required.");
  }
  if (!defined_default(ellipsoid)) {
    throw new DeveloperError_default("ellipsoid is required.");
  }
  const inverseRadii = ellipsoid.oneOverRadii;
  const q = Cartesian3_default.multiplyComponents(inverseRadii, ray.origin, scratchQ);
  const w = Cartesian3_default.multiplyComponents(
    inverseRadii,
    ray.direction,
    scratchW
  );
  const q2 = Cartesian3_default.magnitudeSquared(q);
  const qw = Cartesian3_default.dot(q, w);
  let difference, w2, product, discriminant, temp;
  if (q2 > 1) {
    if (qw >= 0) {
      return void 0;
    }
    const qw2 = qw * qw;
    difference = q2 - 1;
    w2 = Cartesian3_default.magnitudeSquared(w);
    product = w2 * difference;
    if (qw2 < product) {
      return void 0;
    } else if (qw2 > product) {
      discriminant = qw * qw - product;
      temp = -qw + Math.sqrt(discriminant);
      const root0 = temp / w2;
      const root1 = difference / temp;
      if (root0 < root1) {
        return new Interval_default(root0, root1);
      }
      return {
        start: root1,
        stop: root0
      };
    }
    const root = Math.sqrt(difference / w2);
    return new Interval_default(root, root);
  } else if (q2 < 1) {
    difference = q2 - 1;
    w2 = Cartesian3_default.magnitudeSquared(w);
    product = w2 * difference;
    discriminant = qw * qw - product;
    temp = -qw + Math.sqrt(discriminant);
    return new Interval_default(0, temp / w2);
  }
  if (qw < 0) {
    w2 = Cartesian3_default.magnitudeSquared(w);
    return new Interval_default(0, -qw / w2);
  }
  return void 0;
};
function addWithCancellationCheck2(left, right, tolerance) {
  const difference = left + right;
  if (Math_default.sign(left) !== Math_default.sign(right) && Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance) {
    return 0;
  }
  return difference;
}
function quadraticVectorExpression(A, b, c, x, w) {
  const xSquared = x * x;
  const wSquared = w * w;
  const l2 = (A[Matrix3_default.COLUMN1ROW1] - A[Matrix3_default.COLUMN2ROW2]) * wSquared;
  const l1 = w * (x * addWithCancellationCheck2(
    A[Matrix3_default.COLUMN1ROW0],
    A[Matrix3_default.COLUMN0ROW1],
    Math_default.EPSILON15
  ) + b.y);
  const l0 = A[Matrix3_default.COLUMN0ROW0] * xSquared + A[Matrix3_default.COLUMN2ROW2] * wSquared + x * b.x + c;
  const r1 = wSquared * addWithCancellationCheck2(
    A[Matrix3_default.COLUMN2ROW1],
    A[Matrix3_default.COLUMN1ROW2],
    Math_default.EPSILON15
  );
  const r0 = w * (x * addWithCancellationCheck2(A[Matrix3_default.COLUMN2ROW0], A[Matrix3_default.COLUMN0ROW2]) + b.z);
  let cosines;
  const solutions = [];
  if (r0 === 0 && r1 === 0) {
    cosines = QuadraticRealPolynomial_default.computeRealRoots(l2, l1, l0);
    if (cosines.length === 0) {
      return solutions;
    }
    const cosine0 = cosines[0];
    const sine0 = Math.sqrt(Math.max(1 - cosine0 * cosine0, 0));
    solutions.push(new Cartesian3_default(x, w * cosine0, w * -sine0));
    solutions.push(new Cartesian3_default(x, w * cosine0, w * sine0));
    if (cosines.length === 2) {
      const cosine1 = cosines[1];
      const sine1 = Math.sqrt(Math.max(1 - cosine1 * cosine1, 0));
      solutions.push(new Cartesian3_default(x, w * cosine1, w * -sine1));
      solutions.push(new Cartesian3_default(x, w * cosine1, w * sine1));
    }
    return solutions;
  }
  const r0Squared = r0 * r0;
  const r1Squared = r1 * r1;
  const l2Squared = l2 * l2;
  const r0r1 = r0 * r1;
  const c4 = l2Squared + r1Squared;
  const c3 = 2 * (l1 * l2 + r0r1);
  const c2 = 2 * l0 * l2 + l1 * l1 - r1Squared + r0Squared;
  const c1 = 2 * (l0 * l1 - r0r1);
  const c0 = l0 * l0 - r0Squared;
  if (c4 === 0 && c3 === 0 && c2 === 0 && c1 === 0) {
    return solutions;
  }
  cosines = QuarticRealPolynomial_default.computeRealRoots(c4, c3, c2, c1, c0);
  const length = cosines.length;
  if (length === 0) {
    return solutions;
  }
  for (let i = 0; i < length; ++i) {
    const cosine = cosines[i];
    const cosineSquared = cosine * cosine;
    const sineSquared = Math.max(1 - cosineSquared, 0);
    const sine = Math.sqrt(sineSquared);
    let left;
    if (Math_default.sign(l2) === Math_default.sign(l0)) {
      left = addWithCancellationCheck2(
        l2 * cosineSquared + l0,
        l1 * cosine,
        Math_default.EPSILON12
      );
    } else if (Math_default.sign(l0) === Math_default.sign(l1 * cosine)) {
      left = addWithCancellationCheck2(
        l2 * cosineSquared,
        l1 * cosine + l0,
        Math_default.EPSILON12
      );
    } else {
      left = addWithCancellationCheck2(
        l2 * cosineSquared + l1 * cosine,
        l0,
        Math_default.EPSILON12
      );
    }
    const right = addWithCancellationCheck2(
      r1 * cosine,
      r0,
      Math_default.EPSILON15
    );
    const product = left * right;
    if (product < 0) {
      solutions.push(new Cartesian3_default(x, w * cosine, w * sine));
    } else if (product > 0) {
      solutions.push(new Cartesian3_default(x, w * cosine, w * -sine));
    } else if (sine !== 0) {
      solutions.push(new Cartesian3_default(x, w * cosine, w * -sine));
      solutions.push(new Cartesian3_default(x, w * cosine, w * sine));
      ++i;
    } else {
      solutions.push(new Cartesian3_default(x, w * cosine, w * sine));
    }
  }
  return solutions;
}
var firstAxisScratch = new Cartesian3_default();
var secondAxisScratch = new Cartesian3_default();
var thirdAxisScratch = new Cartesian3_default();
var referenceScratch = new Cartesian3_default();
var bCart = new Cartesian3_default();
var bScratch = new Matrix3_default();
var btScratch = new Matrix3_default();
var diScratch = new Matrix3_default();
var dScratch = new Matrix3_default();
var cScratch = new Matrix3_default();
var tempMatrix = new Matrix3_default();
var aScratch = new Matrix3_default();
var sScratch = new Cartesian3_default();
var closestScratch = new Cartesian3_default();
var surfPointScratch = new Cartographic_default();
IntersectionTests.grazingAltitudeLocation = function(ray, ellipsoid) {
  if (!defined_default(ray)) {
    throw new DeveloperError_default("ray is required.");
  }
  if (!defined_default(ellipsoid)) {
    throw new DeveloperError_default("ellipsoid is required.");
  }
  const position = ray.origin;
  const direction = ray.direction;
  if (!Cartesian3_default.equals(position, Cartesian3_default.ZERO)) {
    const normal = ellipsoid.geodeticSurfaceNormal(position, firstAxisScratch);
    if (Cartesian3_default.dot(direction, normal) >= 0) {
      return position;
    }
  }
  const intersects = defined_default(this.rayEllipsoid(ray, ellipsoid));
  const f = ellipsoid.transformPositionToScaledSpace(
    direction,
    firstAxisScratch
  );
  const firstAxis = Cartesian3_default.normalize(f, f);
  const reference = Cartesian3_default.mostOrthogonalAxis(f, referenceScratch);
  const secondAxis = Cartesian3_default.normalize(
    Cartesian3_default.cross(reference, firstAxis, secondAxisScratch),
    secondAxisScratch
  );
  const thirdAxis = Cartesian3_default.normalize(
    Cartesian3_default.cross(firstAxis, secondAxis, thirdAxisScratch),
    thirdAxisScratch
  );
  const B = bScratch;
  B[0] = firstAxis.x;
  B[1] = firstAxis.y;
  B[2] = firstAxis.z;
  B[3] = secondAxis.x;
  B[4] = secondAxis.y;
  B[5] = secondAxis.z;
  B[6] = thirdAxis.x;
  B[7] = thirdAxis.y;
  B[8] = thirdAxis.z;
  const B_T = Matrix3_default.transpose(B, btScratch);
  const D_I = Matrix3_default.fromScale(ellipsoid.radii, diScratch);
  const D = Matrix3_default.fromScale(ellipsoid.oneOverRadii, dScratch);
  const C = cScratch;
  C[0] = 0;
  C[1] = -direction.z;
  C[2] = direction.y;
  C[3] = direction.z;
  C[4] = 0;
  C[5] = -direction.x;
  C[6] = -direction.y;
  C[7] = direction.x;
  C[8] = 0;
  const temp = Matrix3_default.multiply(
    Matrix3_default.multiply(B_T, D, tempMatrix),
    C,
    tempMatrix
  );
  const A = Matrix3_default.multiply(
    Matrix3_default.multiply(temp, D_I, aScratch),
    B,
    aScratch
  );
  const b = Matrix3_default.multiplyByVector(temp, position, bCart);
  const solutions = quadraticVectorExpression(
    A,
    Cartesian3_default.negate(b, firstAxisScratch),
    0,
    0,
    1
  );
  let s;
  let altitude;
  const length = solutions.length;
  if (length > 0) {
    let closest = Cartesian3_default.clone(Cartesian3_default.ZERO, closestScratch);
    let maximumValue = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < length; ++i) {
      s = Matrix3_default.multiplyByVector(
        D_I,
        Matrix3_default.multiplyByVector(B, solutions[i], sScratch),
        sScratch
      );
      const v = Cartesian3_default.normalize(
        Cartesian3_default.subtract(s, position, referenceScratch),
        referenceScratch
      );
      const dotProduct = Cartesian3_default.dot(v, direction);
      if (dotProduct > maximumValue) {
        maximumValue = dotProduct;
        closest = Cartesian3_default.clone(s, closest);
      }
    }
    const surfacePoint = ellipsoid.cartesianToCartographic(
      closest,
      surfPointScratch
    );
    maximumValue = Math_default.clamp(maximumValue, 0, 1);
    altitude = Cartesian3_default.magnitude(
      Cartesian3_default.subtract(closest, position, referenceScratch)
    ) * Math.sqrt(1 - maximumValue * maximumValue);
    altitude = intersects ? -altitude : altitude;
    surfacePoint.height = altitude;
    return ellipsoid.cartographicToCartesian(surfacePoint, new Cartesian3_default());
  }
  return void 0;
};
var lineSegmentPlaneDifference = new Cartesian3_default();
IntersectionTests.lineSegmentPlane = function(endPoint0, endPoint1, plane, result) {
  if (!defined_default(endPoint0)) {
    throw new DeveloperError_default("endPoint0 is required.");
  }
  if (!defined_default(endPoint1)) {
    throw new DeveloperError_default("endPoint1 is required.");
  }
  if (!defined_default(plane)) {
    throw new DeveloperError_default("plane is required.");
  }
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  const difference = Cartesian3_default.subtract(
    endPoint1,
    endPoint0,
    lineSegmentPlaneDifference
  );
  const normal = plane.normal;
  const nDotDiff = Cartesian3_default.dot(normal, difference);
  if (Math.abs(nDotDiff) < Math_default.EPSILON6) {
    return void 0;
  }
  const nDotP0 = Cartesian3_default.dot(normal, endPoint0);
  const t = -(plane.distance + nDotP0) / nDotDiff;
  if (t < 0 || t > 1) {
    return void 0;
  }
  Cartesian3_default.multiplyByScalar(difference, t, result);
  Cartesian3_default.add(endPoint0, result, result);
  return result;
};
IntersectionTests.trianglePlaneIntersection = function(p0, p1, p2, plane) {
  if (!defined_default(p0) || !defined_default(p1) || !defined_default(p2) || !defined_default(plane)) {
    throw new DeveloperError_default("p0, p1, p2, and plane are required.");
  }
  const planeNormal = plane.normal;
  const planeD = plane.distance;
  const p0Behind = Cartesian3_default.dot(planeNormal, p0) + planeD < 0;
  const p1Behind = Cartesian3_default.dot(planeNormal, p1) + planeD < 0;
  const p2Behind = Cartesian3_default.dot(planeNormal, p2) + planeD < 0;
  let numBehind = 0;
  numBehind += p0Behind ? 1 : 0;
  numBehind += p1Behind ? 1 : 0;
  numBehind += p2Behind ? 1 : 0;
  let u1, u2;
  if (numBehind === 1 || numBehind === 2) {
    u1 = new Cartesian3_default();
    u2 = new Cartesian3_default();
  }
  if (numBehind === 1) {
    if (p0Behind) {
      IntersectionTests.lineSegmentPlane(p0, p1, plane, u1);
      IntersectionTests.lineSegmentPlane(p0, p2, plane, u2);
      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          0,
          3,
          4,
          // In front
          1,
          2,
          4,
          1,
          4,
          3
        ]
      };
    } else if (p1Behind) {
      IntersectionTests.lineSegmentPlane(p1, p2, plane, u1);
      IntersectionTests.lineSegmentPlane(p1, p0, plane, u2);
      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          1,
          3,
          4,
          // In front
          2,
          0,
          4,
          2,
          4,
          3
        ]
      };
    } else if (p2Behind) {
      IntersectionTests.lineSegmentPlane(p2, p0, plane, u1);
      IntersectionTests.lineSegmentPlane(p2, p1, plane, u2);
      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          2,
          3,
          4,
          // In front
          0,
          1,
          4,
          0,
          4,
          3
        ]
      };
    }
  } else if (numBehind === 2) {
    if (!p0Behind) {
      IntersectionTests.lineSegmentPlane(p1, p0, plane, u1);
      IntersectionTests.lineSegmentPlane(p2, p0, plane, u2);
      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          1,
          2,
          4,
          1,
          4,
          3,
          // In front
          0,
          3,
          4
        ]
      };
    } else if (!p1Behind) {
      IntersectionTests.lineSegmentPlane(p2, p1, plane, u1);
      IntersectionTests.lineSegmentPlane(p0, p1, plane, u2);
      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          2,
          0,
          4,
          2,
          4,
          3,
          // In front
          1,
          3,
          4
        ]
      };
    } else if (!p2Behind) {
      IntersectionTests.lineSegmentPlane(p0, p2, plane, u1);
      IntersectionTests.lineSegmentPlane(p1, p2, plane, u2);
      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          0,
          1,
          4,
          0,
          4,
          3,
          // In front
          2,
          3,
          4
        ]
      };
    }
  }
  return void 0;
};
var IntersectionTests_default = IntersectionTests;

export {
  Ray_default,
  IntersectionTests_default
};
