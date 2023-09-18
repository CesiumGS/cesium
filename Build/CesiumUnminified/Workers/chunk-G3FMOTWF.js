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
  FeatureDetection_default
} from "./chunk-FS4DCO6P.js";
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

// packages/engine/Source/Core/Color.js
function hue2rgb(m1, m2, h) {
  if (h < 0) {
    h += 1;
  }
  if (h > 1) {
    h -= 1;
  }
  if (h * 6 < 1) {
    return m1 + (m2 - m1) * 6 * h;
  }
  if (h * 2 < 1) {
    return m2;
  }
  if (h * 3 < 2) {
    return m1 + (m2 - m1) * (2 / 3 - h) * 6;
  }
  return m1;
}
function Color(red, green, blue, alpha) {
  this.red = defaultValue_default(red, 1);
  this.green = defaultValue_default(green, 1);
  this.blue = defaultValue_default(blue, 1);
  this.alpha = defaultValue_default(alpha, 1);
}
Color.fromCartesian4 = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  if (!defined_default(result)) {
    return new Color(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  }
  result.red = cartesian.x;
  result.green = cartesian.y;
  result.blue = cartesian.z;
  result.alpha = cartesian.w;
  return result;
};
Color.fromBytes = function(red, green, blue, alpha, result) {
  red = Color.byteToFloat(defaultValue_default(red, 255));
  green = Color.byteToFloat(defaultValue_default(green, 255));
  blue = Color.byteToFloat(defaultValue_default(blue, 255));
  alpha = Color.byteToFloat(defaultValue_default(alpha, 255));
  if (!defined_default(result)) {
    return new Color(red, green, blue, alpha);
  }
  result.red = red;
  result.green = green;
  result.blue = blue;
  result.alpha = alpha;
  return result;
};
Color.fromAlpha = function(color, alpha, result) {
  Check_default.typeOf.object("color", color);
  Check_default.typeOf.number("alpha", alpha);
  if (!defined_default(result)) {
    return new Color(color.red, color.green, color.blue, alpha);
  }
  result.red = color.red;
  result.green = color.green;
  result.blue = color.blue;
  result.alpha = alpha;
  return result;
};
var scratchArrayBuffer;
var scratchUint32Array;
var scratchUint8Array;
if (FeatureDetection_default.supportsTypedArrays()) {
  scratchArrayBuffer = new ArrayBuffer(4);
  scratchUint32Array = new Uint32Array(scratchArrayBuffer);
  scratchUint8Array = new Uint8Array(scratchArrayBuffer);
}
Color.fromRgba = function(rgba, result) {
  scratchUint32Array[0] = rgba;
  return Color.fromBytes(
    scratchUint8Array[0],
    scratchUint8Array[1],
    scratchUint8Array[2],
    scratchUint8Array[3],
    result
  );
};
Color.fromHsl = function(hue, saturation, lightness, alpha, result) {
  hue = defaultValue_default(hue, 0) % 1;
  saturation = defaultValue_default(saturation, 0);
  lightness = defaultValue_default(lightness, 0);
  alpha = defaultValue_default(alpha, 1);
  let red = lightness;
  let green = lightness;
  let blue = lightness;
  if (saturation !== 0) {
    let m2;
    if (lightness < 0.5) {
      m2 = lightness * (1 + saturation);
    } else {
      m2 = lightness + saturation - lightness * saturation;
    }
    const m1 = 2 * lightness - m2;
    red = hue2rgb(m1, m2, hue + 1 / 3);
    green = hue2rgb(m1, m2, hue);
    blue = hue2rgb(m1, m2, hue - 1 / 3);
  }
  if (!defined_default(result)) {
    return new Color(red, green, blue, alpha);
  }
  result.red = red;
  result.green = green;
  result.blue = blue;
  result.alpha = alpha;
  return result;
};
Color.fromRandom = function(options, result) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  let red = options.red;
  if (!defined_default(red)) {
    const minimumRed = defaultValue_default(options.minimumRed, 0);
    const maximumRed = defaultValue_default(options.maximumRed, 1);
    Check_default.typeOf.number.lessThanOrEquals("minimumRed", minimumRed, maximumRed);
    red = minimumRed + Math_default.nextRandomNumber() * (maximumRed - minimumRed);
  }
  let green = options.green;
  if (!defined_default(green)) {
    const minimumGreen = defaultValue_default(options.minimumGreen, 0);
    const maximumGreen = defaultValue_default(options.maximumGreen, 1);
    Check_default.typeOf.number.lessThanOrEquals(
      "minimumGreen",
      minimumGreen,
      maximumGreen
    );
    green = minimumGreen + Math_default.nextRandomNumber() * (maximumGreen - minimumGreen);
  }
  let blue = options.blue;
  if (!defined_default(blue)) {
    const minimumBlue = defaultValue_default(options.minimumBlue, 0);
    const maximumBlue = defaultValue_default(options.maximumBlue, 1);
    Check_default.typeOf.number.lessThanOrEquals(
      "minimumBlue",
      minimumBlue,
      maximumBlue
    );
    blue = minimumBlue + Math_default.nextRandomNumber() * (maximumBlue - minimumBlue);
  }
  let alpha = options.alpha;
  if (!defined_default(alpha)) {
    const minimumAlpha = defaultValue_default(options.minimumAlpha, 0);
    const maximumAlpha = defaultValue_default(options.maximumAlpha, 1);
    Check_default.typeOf.number.lessThanOrEquals(
      "minumumAlpha",
      minimumAlpha,
      maximumAlpha
    );
    alpha = minimumAlpha + Math_default.nextRandomNumber() * (maximumAlpha - minimumAlpha);
  }
  if (!defined_default(result)) {
    return new Color(red, green, blue, alpha);
  }
  result.red = red;
  result.green = green;
  result.blue = blue;
  result.alpha = alpha;
  return result;
};
var rgbaMatcher = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
var rrggbbaaMatcher = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
var rgbParenthesesMatcher = /^rgba?\s*\(\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i;
var hslParenthesesMatcher = /^hsla?\s*\(\s*([0-9.]+)\s*[,\s]+\s*([0-9.]+%)\s*[,\s]+\s*([0-9.]+%)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i;
Color.fromCssColorString = function(color, result) {
  Check_default.typeOf.string("color", color);
  if (!defined_default(result)) {
    result = new Color();
  }
  color = color.trim();
  const namedColor = Color[color.toUpperCase()];
  if (defined_default(namedColor)) {
    Color.clone(namedColor, result);
    return result;
  }
  let matches = rgbaMatcher.exec(color);
  if (matches !== null) {
    result.red = parseInt(matches[1], 16) / 15;
    result.green = parseInt(matches[2], 16) / 15;
    result.blue = parseInt(matches[3], 16) / 15;
    result.alpha = parseInt(defaultValue_default(matches[4], "f"), 16) / 15;
    return result;
  }
  matches = rrggbbaaMatcher.exec(color);
  if (matches !== null) {
    result.red = parseInt(matches[1], 16) / 255;
    result.green = parseInt(matches[2], 16) / 255;
    result.blue = parseInt(matches[3], 16) / 255;
    result.alpha = parseInt(defaultValue_default(matches[4], "ff"), 16) / 255;
    return result;
  }
  matches = rgbParenthesesMatcher.exec(color);
  if (matches !== null) {
    result.red = parseFloat(matches[1]) / ("%" === matches[1].substr(-1) ? 100 : 255);
    result.green = parseFloat(matches[2]) / ("%" === matches[2].substr(-1) ? 100 : 255);
    result.blue = parseFloat(matches[3]) / ("%" === matches[3].substr(-1) ? 100 : 255);
    result.alpha = parseFloat(defaultValue_default(matches[4], "1.0"));
    return result;
  }
  matches = hslParenthesesMatcher.exec(color);
  if (matches !== null) {
    return Color.fromHsl(
      parseFloat(matches[1]) / 360,
      parseFloat(matches[2]) / 100,
      parseFloat(matches[3]) / 100,
      parseFloat(defaultValue_default(matches[4], "1.0")),
      result
    );
  }
  result = void 0;
  return result;
};
Color.packedLength = 4;
Color.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.red;
  array[startingIndex++] = value.green;
  array[startingIndex++] = value.blue;
  array[startingIndex] = value.alpha;
  return array;
};
Color.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Color();
  }
  result.red = array[startingIndex++];
  result.green = array[startingIndex++];
  result.blue = array[startingIndex++];
  result.alpha = array[startingIndex];
  return result;
};
Color.byteToFloat = function(number) {
  return number / 255;
};
Color.floatToByte = function(number) {
  return number === 1 ? 255 : number * 256 | 0;
};
Color.clone = function(color, result) {
  if (!defined_default(color)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Color(color.red, color.green, color.blue, color.alpha);
  }
  result.red = color.red;
  result.green = color.green;
  result.blue = color.blue;
  result.alpha = color.alpha;
  return result;
};
Color.equals = function(left, right) {
  return left === right || //
  defined_default(left) && //
  defined_default(right) && //
  left.red === right.red && //
  left.green === right.green && //
  left.blue === right.blue && //
  left.alpha === right.alpha;
};
Color.equalsArray = function(color, array, offset) {
  return color.red === array[offset] && color.green === array[offset + 1] && color.blue === array[offset + 2] && color.alpha === array[offset + 3];
};
Color.prototype.clone = function(result) {
  return Color.clone(this, result);
};
Color.prototype.equals = function(other) {
  return Color.equals(this, other);
};
Color.prototype.equalsEpsilon = function(other, epsilon) {
  return this === other || //
  defined_default(other) && //
  Math.abs(this.red - other.red) <= epsilon && //
  Math.abs(this.green - other.green) <= epsilon && //
  Math.abs(this.blue - other.blue) <= epsilon && //
  Math.abs(this.alpha - other.alpha) <= epsilon;
};
Color.prototype.toString = function() {
  return `(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
};
Color.prototype.toCssColorString = function() {
  const red = Color.floatToByte(this.red);
  const green = Color.floatToByte(this.green);
  const blue = Color.floatToByte(this.blue);
  if (this.alpha === 1) {
    return `rgb(${red},${green},${blue})`;
  }
  return `rgba(${red},${green},${blue},${this.alpha})`;
};
Color.prototype.toCssHexString = function() {
  let r = Color.floatToByte(this.red).toString(16);
  if (r.length < 2) {
    r = `0${r}`;
  }
  let g = Color.floatToByte(this.green).toString(16);
  if (g.length < 2) {
    g = `0${g}`;
  }
  let b = Color.floatToByte(this.blue).toString(16);
  if (b.length < 2) {
    b = `0${b}`;
  }
  if (this.alpha < 1) {
    let hexAlpha = Color.floatToByte(this.alpha).toString(16);
    if (hexAlpha.length < 2) {
      hexAlpha = `0${hexAlpha}`;
    }
    return `#${r}${g}${b}${hexAlpha}`;
  }
  return `#${r}${g}${b}`;
};
Color.prototype.toBytes = function(result) {
  const red = Color.floatToByte(this.red);
  const green = Color.floatToByte(this.green);
  const blue = Color.floatToByte(this.blue);
  const alpha = Color.floatToByte(this.alpha);
  if (!defined_default(result)) {
    return [red, green, blue, alpha];
  }
  result[0] = red;
  result[1] = green;
  result[2] = blue;
  result[3] = alpha;
  return result;
};
Color.prototype.toRgba = function() {
  scratchUint8Array[0] = Color.floatToByte(this.red);
  scratchUint8Array[1] = Color.floatToByte(this.green);
  scratchUint8Array[2] = Color.floatToByte(this.blue);
  scratchUint8Array[3] = Color.floatToByte(this.alpha);
  return scratchUint32Array[0];
};
Color.prototype.brighten = function(magnitude, result) {
  Check_default.typeOf.number("magnitude", magnitude);
  Check_default.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0);
  Check_default.typeOf.object("result", result);
  magnitude = 1 - magnitude;
  result.red = 1 - (1 - this.red) * magnitude;
  result.green = 1 - (1 - this.green) * magnitude;
  result.blue = 1 - (1 - this.blue) * magnitude;
  result.alpha = this.alpha;
  return result;
};
Color.prototype.darken = function(magnitude, result) {
  Check_default.typeOf.number("magnitude", magnitude);
  Check_default.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0);
  Check_default.typeOf.object("result", result);
  magnitude = 1 - magnitude;
  result.red = this.red * magnitude;
  result.green = this.green * magnitude;
  result.blue = this.blue * magnitude;
  result.alpha = this.alpha;
  return result;
};
Color.prototype.withAlpha = function(alpha, result) {
  return Color.fromAlpha(this, alpha, result);
};
Color.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red + right.red;
  result.green = left.green + right.green;
  result.blue = left.blue + right.blue;
  result.alpha = left.alpha + right.alpha;
  return result;
};
Color.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red - right.red;
  result.green = left.green - right.green;
  result.blue = left.blue - right.blue;
  result.alpha = left.alpha - right.alpha;
  return result;
};
Color.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red * right.red;
  result.green = left.green * right.green;
  result.blue = left.blue * right.blue;
  result.alpha = left.alpha * right.alpha;
  return result;
};
Color.divide = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red / right.red;
  result.green = left.green / right.green;
  result.blue = left.blue / right.blue;
  result.alpha = left.alpha / right.alpha;
  return result;
};
Color.mod = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red % right.red;
  result.green = left.green % right.green;
  result.blue = left.blue % right.blue;
  result.alpha = left.alpha % right.alpha;
  return result;
};
Color.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  result.red = Math_default.lerp(start.red, end.red, t);
  result.green = Math_default.lerp(start.green, end.green, t);
  result.blue = Math_default.lerp(start.blue, end.blue, t);
  result.alpha = Math_default.lerp(start.alpha, end.alpha, t);
  return result;
};
Color.multiplyByScalar = function(color, scalar, result) {
  Check_default.typeOf.object("color", color);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.red = color.red * scalar;
  result.green = color.green * scalar;
  result.blue = color.blue * scalar;
  result.alpha = color.alpha * scalar;
  return result;
};
Color.divideByScalar = function(color, scalar, result) {
  Check_default.typeOf.object("color", color);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.red = color.red / scalar;
  result.green = color.green / scalar;
  result.blue = color.blue / scalar;
  result.alpha = color.alpha / scalar;
  return result;
};
Color.ALICEBLUE = Object.freeze(Color.fromCssColorString("#F0F8FF"));
Color.ANTIQUEWHITE = Object.freeze(Color.fromCssColorString("#FAEBD7"));
Color.AQUA = Object.freeze(Color.fromCssColorString("#00FFFF"));
Color.AQUAMARINE = Object.freeze(Color.fromCssColorString("#7FFFD4"));
Color.AZURE = Object.freeze(Color.fromCssColorString("#F0FFFF"));
Color.BEIGE = Object.freeze(Color.fromCssColorString("#F5F5DC"));
Color.BISQUE = Object.freeze(Color.fromCssColorString("#FFE4C4"));
Color.BLACK = Object.freeze(Color.fromCssColorString("#000000"));
Color.BLANCHEDALMOND = Object.freeze(Color.fromCssColorString("#FFEBCD"));
Color.BLUE = Object.freeze(Color.fromCssColorString("#0000FF"));
Color.BLUEVIOLET = Object.freeze(Color.fromCssColorString("#8A2BE2"));
Color.BROWN = Object.freeze(Color.fromCssColorString("#A52A2A"));
Color.BURLYWOOD = Object.freeze(Color.fromCssColorString("#DEB887"));
Color.CADETBLUE = Object.freeze(Color.fromCssColorString("#5F9EA0"));
Color.CHARTREUSE = Object.freeze(Color.fromCssColorString("#7FFF00"));
Color.CHOCOLATE = Object.freeze(Color.fromCssColorString("#D2691E"));
Color.CORAL = Object.freeze(Color.fromCssColorString("#FF7F50"));
Color.CORNFLOWERBLUE = Object.freeze(Color.fromCssColorString("#6495ED"));
Color.CORNSILK = Object.freeze(Color.fromCssColorString("#FFF8DC"));
Color.CRIMSON = Object.freeze(Color.fromCssColorString("#DC143C"));
Color.CYAN = Object.freeze(Color.fromCssColorString("#00FFFF"));
Color.DARKBLUE = Object.freeze(Color.fromCssColorString("#00008B"));
Color.DARKCYAN = Object.freeze(Color.fromCssColorString("#008B8B"));
Color.DARKGOLDENROD = Object.freeze(Color.fromCssColorString("#B8860B"));
Color.DARKGRAY = Object.freeze(Color.fromCssColorString("#A9A9A9"));
Color.DARKGREEN = Object.freeze(Color.fromCssColorString("#006400"));
Color.DARKGREY = Color.DARKGRAY;
Color.DARKKHAKI = Object.freeze(Color.fromCssColorString("#BDB76B"));
Color.DARKMAGENTA = Object.freeze(Color.fromCssColorString("#8B008B"));
Color.DARKOLIVEGREEN = Object.freeze(Color.fromCssColorString("#556B2F"));
Color.DARKORANGE = Object.freeze(Color.fromCssColorString("#FF8C00"));
Color.DARKORCHID = Object.freeze(Color.fromCssColorString("#9932CC"));
Color.DARKRED = Object.freeze(Color.fromCssColorString("#8B0000"));
Color.DARKSALMON = Object.freeze(Color.fromCssColorString("#E9967A"));
Color.DARKSEAGREEN = Object.freeze(Color.fromCssColorString("#8FBC8F"));
Color.DARKSLATEBLUE = Object.freeze(Color.fromCssColorString("#483D8B"));
Color.DARKSLATEGRAY = Object.freeze(Color.fromCssColorString("#2F4F4F"));
Color.DARKSLATEGREY = Color.DARKSLATEGRAY;
Color.DARKTURQUOISE = Object.freeze(Color.fromCssColorString("#00CED1"));
Color.DARKVIOLET = Object.freeze(Color.fromCssColorString("#9400D3"));
Color.DEEPPINK = Object.freeze(Color.fromCssColorString("#FF1493"));
Color.DEEPSKYBLUE = Object.freeze(Color.fromCssColorString("#00BFFF"));
Color.DIMGRAY = Object.freeze(Color.fromCssColorString("#696969"));
Color.DIMGREY = Color.DIMGRAY;
Color.DODGERBLUE = Object.freeze(Color.fromCssColorString("#1E90FF"));
Color.FIREBRICK = Object.freeze(Color.fromCssColorString("#B22222"));
Color.FLORALWHITE = Object.freeze(Color.fromCssColorString("#FFFAF0"));
Color.FORESTGREEN = Object.freeze(Color.fromCssColorString("#228B22"));
Color.FUCHSIA = Object.freeze(Color.fromCssColorString("#FF00FF"));
Color.GAINSBORO = Object.freeze(Color.fromCssColorString("#DCDCDC"));
Color.GHOSTWHITE = Object.freeze(Color.fromCssColorString("#F8F8FF"));
Color.GOLD = Object.freeze(Color.fromCssColorString("#FFD700"));
Color.GOLDENROD = Object.freeze(Color.fromCssColorString("#DAA520"));
Color.GRAY = Object.freeze(Color.fromCssColorString("#808080"));
Color.GREEN = Object.freeze(Color.fromCssColorString("#008000"));
Color.GREENYELLOW = Object.freeze(Color.fromCssColorString("#ADFF2F"));
Color.GREY = Color.GRAY;
Color.HONEYDEW = Object.freeze(Color.fromCssColorString("#F0FFF0"));
Color.HOTPINK = Object.freeze(Color.fromCssColorString("#FF69B4"));
Color.INDIANRED = Object.freeze(Color.fromCssColorString("#CD5C5C"));
Color.INDIGO = Object.freeze(Color.fromCssColorString("#4B0082"));
Color.IVORY = Object.freeze(Color.fromCssColorString("#FFFFF0"));
Color.KHAKI = Object.freeze(Color.fromCssColorString("#F0E68C"));
Color.LAVENDER = Object.freeze(Color.fromCssColorString("#E6E6FA"));
Color.LAVENDAR_BLUSH = Object.freeze(Color.fromCssColorString("#FFF0F5"));
Color.LAWNGREEN = Object.freeze(Color.fromCssColorString("#7CFC00"));
Color.LEMONCHIFFON = Object.freeze(Color.fromCssColorString("#FFFACD"));
Color.LIGHTBLUE = Object.freeze(Color.fromCssColorString("#ADD8E6"));
Color.LIGHTCORAL = Object.freeze(Color.fromCssColorString("#F08080"));
Color.LIGHTCYAN = Object.freeze(Color.fromCssColorString("#E0FFFF"));
Color.LIGHTGOLDENRODYELLOW = Object.freeze(Color.fromCssColorString("#FAFAD2"));
Color.LIGHTGRAY = Object.freeze(Color.fromCssColorString("#D3D3D3"));
Color.LIGHTGREEN = Object.freeze(Color.fromCssColorString("#90EE90"));
Color.LIGHTGREY = Color.LIGHTGRAY;
Color.LIGHTPINK = Object.freeze(Color.fromCssColorString("#FFB6C1"));
Color.LIGHTSEAGREEN = Object.freeze(Color.fromCssColorString("#20B2AA"));
Color.LIGHTSKYBLUE = Object.freeze(Color.fromCssColorString("#87CEFA"));
Color.LIGHTSLATEGRAY = Object.freeze(Color.fromCssColorString("#778899"));
Color.LIGHTSLATEGREY = Color.LIGHTSLATEGRAY;
Color.LIGHTSTEELBLUE = Object.freeze(Color.fromCssColorString("#B0C4DE"));
Color.LIGHTYELLOW = Object.freeze(Color.fromCssColorString("#FFFFE0"));
Color.LIME = Object.freeze(Color.fromCssColorString("#00FF00"));
Color.LIMEGREEN = Object.freeze(Color.fromCssColorString("#32CD32"));
Color.LINEN = Object.freeze(Color.fromCssColorString("#FAF0E6"));
Color.MAGENTA = Object.freeze(Color.fromCssColorString("#FF00FF"));
Color.MAROON = Object.freeze(Color.fromCssColorString("#800000"));
Color.MEDIUMAQUAMARINE = Object.freeze(Color.fromCssColorString("#66CDAA"));
Color.MEDIUMBLUE = Object.freeze(Color.fromCssColorString("#0000CD"));
Color.MEDIUMORCHID = Object.freeze(Color.fromCssColorString("#BA55D3"));
Color.MEDIUMPURPLE = Object.freeze(Color.fromCssColorString("#9370DB"));
Color.MEDIUMSEAGREEN = Object.freeze(Color.fromCssColorString("#3CB371"));
Color.MEDIUMSLATEBLUE = Object.freeze(Color.fromCssColorString("#7B68EE"));
Color.MEDIUMSPRINGGREEN = Object.freeze(Color.fromCssColorString("#00FA9A"));
Color.MEDIUMTURQUOISE = Object.freeze(Color.fromCssColorString("#48D1CC"));
Color.MEDIUMVIOLETRED = Object.freeze(Color.fromCssColorString("#C71585"));
Color.MIDNIGHTBLUE = Object.freeze(Color.fromCssColorString("#191970"));
Color.MINTCREAM = Object.freeze(Color.fromCssColorString("#F5FFFA"));
Color.MISTYROSE = Object.freeze(Color.fromCssColorString("#FFE4E1"));
Color.MOCCASIN = Object.freeze(Color.fromCssColorString("#FFE4B5"));
Color.NAVAJOWHITE = Object.freeze(Color.fromCssColorString("#FFDEAD"));
Color.NAVY = Object.freeze(Color.fromCssColorString("#000080"));
Color.OLDLACE = Object.freeze(Color.fromCssColorString("#FDF5E6"));
Color.OLIVE = Object.freeze(Color.fromCssColorString("#808000"));
Color.OLIVEDRAB = Object.freeze(Color.fromCssColorString("#6B8E23"));
Color.ORANGE = Object.freeze(Color.fromCssColorString("#FFA500"));
Color.ORANGERED = Object.freeze(Color.fromCssColorString("#FF4500"));
Color.ORCHID = Object.freeze(Color.fromCssColorString("#DA70D6"));
Color.PALEGOLDENROD = Object.freeze(Color.fromCssColorString("#EEE8AA"));
Color.PALEGREEN = Object.freeze(Color.fromCssColorString("#98FB98"));
Color.PALETURQUOISE = Object.freeze(Color.fromCssColorString("#AFEEEE"));
Color.PALEVIOLETRED = Object.freeze(Color.fromCssColorString("#DB7093"));
Color.PAPAYAWHIP = Object.freeze(Color.fromCssColorString("#FFEFD5"));
Color.PEACHPUFF = Object.freeze(Color.fromCssColorString("#FFDAB9"));
Color.PERU = Object.freeze(Color.fromCssColorString("#CD853F"));
Color.PINK = Object.freeze(Color.fromCssColorString("#FFC0CB"));
Color.PLUM = Object.freeze(Color.fromCssColorString("#DDA0DD"));
Color.POWDERBLUE = Object.freeze(Color.fromCssColorString("#B0E0E6"));
Color.PURPLE = Object.freeze(Color.fromCssColorString("#800080"));
Color.RED = Object.freeze(Color.fromCssColorString("#FF0000"));
Color.ROSYBROWN = Object.freeze(Color.fromCssColorString("#BC8F8F"));
Color.ROYALBLUE = Object.freeze(Color.fromCssColorString("#4169E1"));
Color.SADDLEBROWN = Object.freeze(Color.fromCssColorString("#8B4513"));
Color.SALMON = Object.freeze(Color.fromCssColorString("#FA8072"));
Color.SANDYBROWN = Object.freeze(Color.fromCssColorString("#F4A460"));
Color.SEAGREEN = Object.freeze(Color.fromCssColorString("#2E8B57"));
Color.SEASHELL = Object.freeze(Color.fromCssColorString("#FFF5EE"));
Color.SIENNA = Object.freeze(Color.fromCssColorString("#A0522D"));
Color.SILVER = Object.freeze(Color.fromCssColorString("#C0C0C0"));
Color.SKYBLUE = Object.freeze(Color.fromCssColorString("#87CEEB"));
Color.SLATEBLUE = Object.freeze(Color.fromCssColorString("#6A5ACD"));
Color.SLATEGRAY = Object.freeze(Color.fromCssColorString("#708090"));
Color.SLATEGREY = Color.SLATEGRAY;
Color.SNOW = Object.freeze(Color.fromCssColorString("#FFFAFA"));
Color.SPRINGGREEN = Object.freeze(Color.fromCssColorString("#00FF7F"));
Color.STEELBLUE = Object.freeze(Color.fromCssColorString("#4682B4"));
Color.TAN = Object.freeze(Color.fromCssColorString("#D2B48C"));
Color.TEAL = Object.freeze(Color.fromCssColorString("#008080"));
Color.THISTLE = Object.freeze(Color.fromCssColorString("#D8BFD8"));
Color.TOMATO = Object.freeze(Color.fromCssColorString("#FF6347"));
Color.TURQUOISE = Object.freeze(Color.fromCssColorString("#40E0D0"));
Color.VIOLET = Object.freeze(Color.fromCssColorString("#EE82EE"));
Color.WHEAT = Object.freeze(Color.fromCssColorString("#F5DEB3"));
Color.WHITE = Object.freeze(Color.fromCssColorString("#FFFFFF"));
Color.WHITESMOKE = Object.freeze(Color.fromCssColorString("#F5F5F5"));
Color.YELLOW = Object.freeze(Color.fromCssColorString("#FFFF00"));
Color.YELLOWGREEN = Object.freeze(Color.fromCssColorString("#9ACD32"));
Color.TRANSPARENT = Object.freeze(new Color(0, 0, 0, 0));
var Color_default = Color;

export {
  Color_default
};
