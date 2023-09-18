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
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/EllipsoidGeodesic.js
function setConstants(ellipsoidGeodesic) {
  const uSquared = ellipsoidGeodesic._uSquared;
  const a = ellipsoidGeodesic._ellipsoid.maximumRadius;
  const b = ellipsoidGeodesic._ellipsoid.minimumRadius;
  const f = (a - b) / a;
  const cosineHeading = Math.cos(ellipsoidGeodesic._startHeading);
  const sineHeading = Math.sin(ellipsoidGeodesic._startHeading);
  const tanU = (1 - f) * Math.tan(ellipsoidGeodesic._start.latitude);
  const cosineU = 1 / Math.sqrt(1 + tanU * tanU);
  const sineU = cosineU * tanU;
  const sigma = Math.atan2(tanU, cosineHeading);
  const sineAlpha = cosineU * sineHeading;
  const sineSquaredAlpha = sineAlpha * sineAlpha;
  const cosineSquaredAlpha = 1 - sineSquaredAlpha;
  const cosineAlpha = Math.sqrt(cosineSquaredAlpha);
  const u2Over4 = uSquared / 4;
  const u4Over16 = u2Over4 * u2Over4;
  const u6Over64 = u4Over16 * u2Over4;
  const u8Over256 = u4Over16 * u4Over16;
  const a0 = 1 + u2Over4 - 3 * u4Over16 / 4 + 5 * u6Over64 / 4 - 175 * u8Over256 / 64;
  const a1 = 1 - u2Over4 + 15 * u4Over16 / 8 - 35 * u6Over64 / 8;
  const a2 = 1 - 3 * u2Over4 + 35 * u4Over16 / 4;
  const a3 = 1 - 5 * u2Over4;
  const distanceRatio = a0 * sigma - a1 * Math.sin(2 * sigma) * u2Over4 / 2 - a2 * Math.sin(4 * sigma) * u4Over16 / 16 - a3 * Math.sin(6 * sigma) * u6Over64 / 48 - Math.sin(8 * sigma) * 5 * u8Over256 / 512;
  const constants = ellipsoidGeodesic._constants;
  constants.a = a;
  constants.b = b;
  constants.f = f;
  constants.cosineHeading = cosineHeading;
  constants.sineHeading = sineHeading;
  constants.tanU = tanU;
  constants.cosineU = cosineU;
  constants.sineU = sineU;
  constants.sigma = sigma;
  constants.sineAlpha = sineAlpha;
  constants.sineSquaredAlpha = sineSquaredAlpha;
  constants.cosineSquaredAlpha = cosineSquaredAlpha;
  constants.cosineAlpha = cosineAlpha;
  constants.u2Over4 = u2Over4;
  constants.u4Over16 = u4Over16;
  constants.u6Over64 = u6Over64;
  constants.u8Over256 = u8Over256;
  constants.a0 = a0;
  constants.a1 = a1;
  constants.a2 = a2;
  constants.a3 = a3;
  constants.distanceRatio = distanceRatio;
}
function computeC(f, cosineSquaredAlpha) {
  return f * cosineSquaredAlpha * (4 + f * (4 - 3 * cosineSquaredAlpha)) / 16;
}
function computeDeltaLambda(f, sineAlpha, cosineSquaredAlpha, sigma, sineSigma, cosineSigma, cosineTwiceSigmaMidpoint) {
  const C = computeC(f, cosineSquaredAlpha);
  return (1 - C) * f * sineAlpha * (sigma + C * sineSigma * (cosineTwiceSigmaMidpoint + C * cosineSigma * (2 * cosineTwiceSigmaMidpoint * cosineTwiceSigmaMidpoint - 1)));
}
function vincentyInverseFormula(ellipsoidGeodesic, major, minor, firstLongitude, firstLatitude, secondLongitude, secondLatitude) {
  const eff = (major - minor) / major;
  const l = secondLongitude - firstLongitude;
  const u1 = Math.atan((1 - eff) * Math.tan(firstLatitude));
  const u2 = Math.atan((1 - eff) * Math.tan(secondLatitude));
  const cosineU1 = Math.cos(u1);
  const sineU1 = Math.sin(u1);
  const cosineU2 = Math.cos(u2);
  const sineU2 = Math.sin(u2);
  const cc = cosineU1 * cosineU2;
  const cs = cosineU1 * sineU2;
  const ss = sineU1 * sineU2;
  const sc = sineU1 * cosineU2;
  let lambda = l;
  let lambdaDot = Math_default.TWO_PI;
  let cosineLambda = Math.cos(lambda);
  let sineLambda = Math.sin(lambda);
  let sigma;
  let cosineSigma;
  let sineSigma;
  let cosineSquaredAlpha;
  let cosineTwiceSigmaMidpoint;
  do {
    cosineLambda = Math.cos(lambda);
    sineLambda = Math.sin(lambda);
    const temp = cs - sc * cosineLambda;
    sineSigma = Math.sqrt(
      cosineU2 * cosineU2 * sineLambda * sineLambda + temp * temp
    );
    cosineSigma = ss + cc * cosineLambda;
    sigma = Math.atan2(sineSigma, cosineSigma);
    let sineAlpha;
    if (sineSigma === 0) {
      sineAlpha = 0;
      cosineSquaredAlpha = 1;
    } else {
      sineAlpha = cc * sineLambda / sineSigma;
      cosineSquaredAlpha = 1 - sineAlpha * sineAlpha;
    }
    lambdaDot = lambda;
    cosineTwiceSigmaMidpoint = cosineSigma - 2 * ss / cosineSquaredAlpha;
    if (!isFinite(cosineTwiceSigmaMidpoint)) {
      cosineTwiceSigmaMidpoint = 0;
    }
    lambda = l + computeDeltaLambda(
      eff,
      sineAlpha,
      cosineSquaredAlpha,
      sigma,
      sineSigma,
      cosineSigma,
      cosineTwiceSigmaMidpoint
    );
  } while (Math.abs(lambda - lambdaDot) > Math_default.EPSILON12);
  const uSquared = cosineSquaredAlpha * (major * major - minor * minor) / (minor * minor);
  const A = 1 + uSquared * (4096 + uSquared * (uSquared * (320 - 175 * uSquared) - 768)) / 16384;
  const B = uSquared * (256 + uSquared * (uSquared * (74 - 47 * uSquared) - 128)) / 1024;
  const cosineSquaredTwiceSigmaMidpoint = cosineTwiceSigmaMidpoint * cosineTwiceSigmaMidpoint;
  const deltaSigma = B * sineSigma * (cosineTwiceSigmaMidpoint + B * (cosineSigma * (2 * cosineSquaredTwiceSigmaMidpoint - 1) - B * cosineTwiceSigmaMidpoint * (4 * sineSigma * sineSigma - 3) * (4 * cosineSquaredTwiceSigmaMidpoint - 3) / 6) / 4);
  const distance = minor * A * (sigma - deltaSigma);
  const startHeading = Math.atan2(
    cosineU2 * sineLambda,
    cs - sc * cosineLambda
  );
  const endHeading = Math.atan2(cosineU1 * sineLambda, cs * cosineLambda - sc);
  ellipsoidGeodesic._distance = distance;
  ellipsoidGeodesic._startHeading = startHeading;
  ellipsoidGeodesic._endHeading = endHeading;
  ellipsoidGeodesic._uSquared = uSquared;
}
var scratchCart1 = new Cartesian3_default();
var scratchCart2 = new Cartesian3_default();
function computeProperties(ellipsoidGeodesic, start, end, ellipsoid) {
  const firstCartesian = Cartesian3_default.normalize(
    ellipsoid.cartographicToCartesian(start, scratchCart2),
    scratchCart1
  );
  const lastCartesian = Cartesian3_default.normalize(
    ellipsoid.cartographicToCartesian(end, scratchCart2),
    scratchCart2
  );
  Check_default.typeOf.number.greaterThanOrEquals(
    "value",
    Math.abs(
      Math.abs(Cartesian3_default.angleBetween(firstCartesian, lastCartesian)) - Math.PI
    ),
    0.0125
  );
  vincentyInverseFormula(
    ellipsoidGeodesic,
    ellipsoid.maximumRadius,
    ellipsoid.minimumRadius,
    start.longitude,
    start.latitude,
    end.longitude,
    end.latitude
  );
  ellipsoidGeodesic._start = Cartographic_default.clone(
    start,
    ellipsoidGeodesic._start
  );
  ellipsoidGeodesic._end = Cartographic_default.clone(end, ellipsoidGeodesic._end);
  ellipsoidGeodesic._start.height = 0;
  ellipsoidGeodesic._end.height = 0;
  setConstants(ellipsoidGeodesic);
}
function EllipsoidGeodesic(start, end, ellipsoid) {
  const e = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  this._ellipsoid = e;
  this._start = new Cartographic_default();
  this._end = new Cartographic_default();
  this._constants = {};
  this._startHeading = void 0;
  this._endHeading = void 0;
  this._distance = void 0;
  this._uSquared = void 0;
  if (defined_default(start) && defined_default(end)) {
    computeProperties(this, start, end, e);
  }
}
Object.defineProperties(EllipsoidGeodesic.prototype, {
  /**
   * Gets the ellipsoid.
   * @memberof EllipsoidGeodesic.prototype
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function() {
      return this._ellipsoid;
    }
  },
  /**
   * Gets the surface distance between the start and end point
   * @memberof EllipsoidGeodesic.prototype
   * @type {number}
   * @readonly
   */
  surfaceDistance: {
    get: function() {
      Check_default.defined("distance", this._distance);
      return this._distance;
    }
  },
  /**
   * Gets the initial planetodetic point on the path.
   * @memberof EllipsoidGeodesic.prototype
   * @type {Cartographic}
   * @readonly
   */
  start: {
    get: function() {
      return this._start;
    }
  },
  /**
   * Gets the final planetodetic point on the path.
   * @memberof EllipsoidGeodesic.prototype
   * @type {Cartographic}
   * @readonly
   */
  end: {
    get: function() {
      return this._end;
    }
  },
  /**
   * Gets the heading at the initial point.
   * @memberof EllipsoidGeodesic.prototype
   * @type {number}
   * @readonly
   */
  startHeading: {
    get: function() {
      Check_default.defined("distance", this._distance);
      return this._startHeading;
    }
  },
  /**
   * Gets the heading at the final point.
   * @memberof EllipsoidGeodesic.prototype
   * @type {number}
   * @readonly
   */
  endHeading: {
    get: function() {
      Check_default.defined("distance", this._distance);
      return this._endHeading;
    }
  }
});
EllipsoidGeodesic.prototype.setEndPoints = function(start, end) {
  Check_default.defined("start", start);
  Check_default.defined("end", end);
  computeProperties(this, start, end, this._ellipsoid);
};
EllipsoidGeodesic.prototype.interpolateUsingFraction = function(fraction, result) {
  return this.interpolateUsingSurfaceDistance(
    this._distance * fraction,
    result
  );
};
EllipsoidGeodesic.prototype.interpolateUsingSurfaceDistance = function(distance, result) {
  Check_default.defined("distance", this._distance);
  const constants = this._constants;
  const s = constants.distanceRatio + distance / constants.b;
  const cosine2S = Math.cos(2 * s);
  const cosine4S = Math.cos(4 * s);
  const cosine6S = Math.cos(6 * s);
  const sine2S = Math.sin(2 * s);
  const sine4S = Math.sin(4 * s);
  const sine6S = Math.sin(6 * s);
  const sine8S = Math.sin(8 * s);
  const s2 = s * s;
  const s3 = s * s2;
  const u8Over256 = constants.u8Over256;
  const u2Over4 = constants.u2Over4;
  const u6Over64 = constants.u6Over64;
  const u4Over16 = constants.u4Over16;
  let sigma = 2 * s3 * u8Over256 * cosine2S / 3 + s * (1 - u2Over4 + 7 * u4Over16 / 4 - 15 * u6Over64 / 4 + 579 * u8Over256 / 64 - (u4Over16 - 15 * u6Over64 / 4 + 187 * u8Over256 / 16) * cosine2S - (5 * u6Over64 / 4 - 115 * u8Over256 / 16) * cosine4S - 29 * u8Over256 * cosine6S / 16) + (u2Over4 / 2 - u4Over16 + 71 * u6Over64 / 32 - 85 * u8Over256 / 16) * sine2S + (5 * u4Over16 / 16 - 5 * u6Over64 / 4 + 383 * u8Over256 / 96) * sine4S - s2 * ((u6Over64 - 11 * u8Over256 / 2) * sine2S + 5 * u8Over256 * sine4S / 2) + (29 * u6Over64 / 96 - 29 * u8Over256 / 16) * sine6S + 539 * u8Over256 * sine8S / 1536;
  const theta = Math.asin(Math.sin(sigma) * constants.cosineAlpha);
  const latitude = Math.atan(constants.a / constants.b * Math.tan(theta));
  sigma = sigma - constants.sigma;
  const cosineTwiceSigmaMidpoint = Math.cos(2 * constants.sigma + sigma);
  const sineSigma = Math.sin(sigma);
  const cosineSigma = Math.cos(sigma);
  const cc = constants.cosineU * cosineSigma;
  const ss = constants.sineU * sineSigma;
  const lambda = Math.atan2(
    sineSigma * constants.sineHeading,
    cc - ss * constants.cosineHeading
  );
  const l = lambda - computeDeltaLambda(
    constants.f,
    constants.sineAlpha,
    constants.cosineSquaredAlpha,
    sigma,
    sineSigma,
    cosineSigma,
    cosineTwiceSigmaMidpoint
  );
  if (defined_default(result)) {
    result.longitude = this._start.longitude + l;
    result.latitude = latitude;
    result.height = 0;
    return result;
  }
  return new Cartographic_default(this._start.longitude + l, latitude, 0);
};
var EllipsoidGeodesic_default = EllipsoidGeodesic;

export {
  EllipsoidGeodesic_default
};
