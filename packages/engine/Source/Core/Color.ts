import Check from "./Check.js";
import Frozen from "./Frozen.js";
import defined from "./defined.js";
import FeatureDetection from "./FeatureDetection.js";
import CesiumMath from "./Math.js";

/**
 * Interface for Cartesian4-like objects used in fromCartesian4
 */
interface Cartesian4Like {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Options for Color.fromRandom
 */
interface FromRandomOptions {
  red?: number;
  minimumRed?: number;
  maximumRed?: number;
  green?: number;
  minimumGreen?: number;
  maximumGreen?: number;
  blue?: number;
  minimumBlue?: number;
  maximumBlue?: number;
  alpha?: number;
  minimumAlpha?: number;
  maximumAlpha?: number;
}

/**
 * Helper function for HSL to RGB conversion
 */
function hue2rgb(m1: number, m2: number, h: number): number {
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

// Shared typed arrays for byte conversion
let scratchArrayBuffer: ArrayBuffer | undefined;
let scratchUint32Array: Uint32Array | undefined;
let scratchUint8Array: Uint8Array | undefined;
if (FeatureDetection.supportsTypedArrays()) {
  scratchArrayBuffer = new ArrayBuffer(4);
  scratchUint32Array = new Uint32Array(scratchArrayBuffer);
  scratchUint8Array = new Uint8Array(scratchArrayBuffer);
}

// CSS color regex patterns
const rgbaMatcher = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
const rrggbbaaMatcher =
  /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
const rgbParenthesesMatcher =
  /^rgba?\s*\(\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i;
const hslParenthesesMatcher =
  /^hsla?\s*\(\s*([0-9.]+)\s*[,\s]+\s*([0-9.]+%)\s*[,\s]+\s*([0-9.]+%)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i;

/**
 * A color, specified using red, green, blue, and alpha values,
 * which range from <code>0</code> (no intensity) to <code>1.0</code> (full intensity).
 *
 * @see Packable
 */
class Color {
  /**
   * The red component.
   * @default 1.0
   */
  red: number;

  /**
   * The green component.
   * @default 1.0
   */
  green: number;

  /**
   * The blue component.
   * @default 1.0
   */
  blue: number;

  /**
   * The alpha component.
   * @default 1.0
   */
  alpha: number;

  /**
   * The number of elements used to pack the object into an array.
   */
  static packedLength: number = 4;

  // Static color constants - declared here, assigned after class definition
  static ALICEBLUE: Color;
  static ANTIQUEWHITE: Color;
  static AQUA: Color;
  static AQUAMARINE: Color;
  static AZURE: Color;
  static BEIGE: Color;
  static BISQUE: Color;
  static BLACK: Color;
  static BLANCHEDALMOND: Color;
  static BLUE: Color;
  static BLUEVIOLET: Color;
  static BROWN: Color;
  static BURLYWOOD: Color;
  static CADETBLUE: Color;
  static CHARTREUSE: Color;
  static CHOCOLATE: Color;
  static CORAL: Color;
  static CORNFLOWERBLUE: Color;
  static CORNSILK: Color;
  static CRIMSON: Color;
  static CYAN: Color;
  static DARKBLUE: Color;
  static DARKCYAN: Color;
  static DARKGOLDENROD: Color;
  static DARKGRAY: Color;
  static DARKGREEN: Color;
  static DARKGREY: Color;
  static DARKKHAKI: Color;
  static DARKMAGENTA: Color;
  static DARKOLIVEGREEN: Color;
  static DARKORANGE: Color;
  static DARKORCHID: Color;
  static DARKRED: Color;
  static DARKSALMON: Color;
  static DARKSEAGREEN: Color;
  static DARKSLATEBLUE: Color;
  static DARKSLATEGRAY: Color;
  static DARKSLATEGREY: Color;
  static DARKTURQUOISE: Color;
  static DARKVIOLET: Color;
  static DEEPPINK: Color;
  static DEEPSKYBLUE: Color;
  static DIMGRAY: Color;
  static DIMGREY: Color;
  static DODGERBLUE: Color;
  static FIREBRICK: Color;
  static FLORALWHITE: Color;
  static FORESTGREEN: Color;
  static FUCHSIA: Color;
  static GAINSBORO: Color;
  static GHOSTWHITE: Color;
  static GOLD: Color;
  static GOLDENROD: Color;
  static GRAY: Color;
  static GREEN: Color;
  static GREENYELLOW: Color;
  static GREY: Color;
  static HONEYDEW: Color;
  static HOTPINK: Color;
  static INDIANRED: Color;
  static INDIGO: Color;
  static IVORY: Color;
  static KHAKI: Color;
  static LAVENDER: Color;
  static LAVENDAR_BLUSH: Color;
  static LAWNGREEN: Color;
  static LEMONCHIFFON: Color;
  static LIGHTBLUE: Color;
  static LIGHTCORAL: Color;
  static LIGHTCYAN: Color;
  static LIGHTGOLDENRODYELLOW: Color;
  static LIGHTGRAY: Color;
  static LIGHTGREEN: Color;
  static LIGHTGREY: Color;
  static LIGHTPINK: Color;
  static LIGHTSEAGREEN: Color;
  static LIGHTSKYBLUE: Color;
  static LIGHTSLATEGRAY: Color;
  static LIGHTSLATEGREY: Color;
  static LIGHTSTEELBLUE: Color;
  static LIGHTYELLOW: Color;
  static LIME: Color;
  static LIMEGREEN: Color;
  static LINEN: Color;
  static MAGENTA: Color;
  static MAROON: Color;
  static MEDIUMAQUAMARINE: Color;
  static MEDIUMBLUE: Color;
  static MEDIUMORCHID: Color;
  static MEDIUMPURPLE: Color;
  static MEDIUMSEAGREEN: Color;
  static MEDIUMSLATEBLUE: Color;
  static MEDIUMSPRINGGREEN: Color;
  static MEDIUMTURQUOISE: Color;
  static MEDIUMVIOLETRED: Color;
  static MIDNIGHTBLUE: Color;
  static MINTCREAM: Color;
  static MISTYROSE: Color;
  static MOCCASIN: Color;
  static NAVAJOWHITE: Color;
  static NAVY: Color;
  static OLDLACE: Color;
  static OLIVE: Color;
  static OLIVEDRAB: Color;
  static ORANGE: Color;
  static ORANGERED: Color;
  static ORCHID: Color;
  static PALEGOLDENROD: Color;
  static PALEGREEN: Color;
  static PALETURQUOISE: Color;
  static PALEVIOLETRED: Color;
  static PAPAYAWHIP: Color;
  static PEACHPUFF: Color;
  static PERU: Color;
  static PINK: Color;
  static PLUM: Color;
  static POWDERBLUE: Color;
  static PURPLE: Color;
  static RED: Color;
  static ROSYBROWN: Color;
  static ROYALBLUE: Color;
  static SADDLEBROWN: Color;
  static SALMON: Color;
  static SANDYBROWN: Color;
  static SEAGREEN: Color;
  static SEASHELL: Color;
  static SIENNA: Color;
  static SILVER: Color;
  static SKYBLUE: Color;
  static SLATEBLUE: Color;
  static SLATEGRAY: Color;
  static SLATEGREY: Color;
  static SNOW: Color;
  static SPRINGGREEN: Color;
  static STEELBLUE: Color;
  static TAN: Color;
  static TEAL: Color;
  static THISTLE: Color;
  static TOMATO: Color;
  static TURQUOISE: Color;
  static VIOLET: Color;
  static WHEAT: Color;
  static WHITE: Color;
  static WHITESMOKE: Color;
  static YELLOW: Color;
  static YELLOWGREEN: Color;
  static TRANSPARENT: Color;

  // Index signature for dynamic access (used in fromCssColorString)
  [key: string]: any;

  /**
   * Creates a Color instance.
   * @param red - The red component.
   * @param green - The green component.
   * @param blue - The blue component.
   * @param alpha - The alpha component.
   */
  constructor(
    red: number = 1.0,
    green: number = 1.0,
    blue: number = 1.0,
    alpha: number = 1.0
  ) {
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = alpha;
  }

  /**
   * Creates a Color instance from a {@link Cartesian4}. <code>x</code>, <code>y</code>, <code>z</code>,
   * and <code>w</code> map to <code>red</code>, <code>green</code>, <code>blue</code>, and <code>alpha</code>, respectively.
   *
   * @param cartesian - The source cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Color instance if one was not provided.
   */
  static fromCartesian4(cartesian: Cartesian4Like, result?: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    if (!defined(result)) {
      return new Color(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    }

    result!.red = cartesian.x;
    result!.green = cartesian.y;
    result!.blue = cartesian.z;
    result!.alpha = cartesian.w;
    return result!;
  }

  /**
   * Creates a new Color specified using red, green, blue, and alpha values
   * that are in the range of 0 to 255, converting them internally to a range of 0.0 to 1.0.
   *
   * @param red - The red component.
   * @param green - The green component.
   * @param blue - The blue component.
   * @param alpha - The alpha component.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Color instance if one was not provided.
   */
  static fromBytes(
    red: number = 255,
    green: number = 255,
    blue: number = 255,
    alpha: number = 255,
    result?: Color
  ): Color {
    const r = Color.byteToFloat(red);
    const g = Color.byteToFloat(green);
    const b = Color.byteToFloat(blue);
    const a = Color.byteToFloat(alpha);

    if (!defined(result)) {
      return new Color(r, g, b, a);
    }

    result!.red = r;
    result!.green = g;
    result!.blue = b;
    result!.alpha = a;
    return result!;
  }

  /**
   * Creates a new Color that has the same red, green, and blue components
   * of the specified color, but with the specified alpha value.
   *
   * @param color - The base color
   * @param alpha - The new alpha component.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Color instance if one was not provided.
   *
   * @example const translucentRed = Cesium.Color.fromAlpha(Cesium.Color.RED, 0.9);
   */
  static fromAlpha(color: Color, alpha: number, result?: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("color", color);
    Check.typeOf.number("alpha", alpha);
    //>>includeEnd('debug');

    if (!defined(result)) {
      return new Color(color.red, color.green, color.blue, alpha);
    }

    result!.red = color.red;
    result!.green = color.green;
    result!.blue = color.blue;
    result!.alpha = alpha;
    return result!;
  }

  /**
   * Creates a new Color from a single numeric unsigned 32-bit RGBA value, using the endianness
   * of the system.
   *
   * @param rgba - A single numeric unsigned 32-bit RGBA value.
   * @param result - The object to store the result in, if undefined a new instance will be created.
   * @returns The color object.
   *
   * @example
   * const color = Cesium.Color.fromRgba(0x67ADDFFF);
   *
   * @see Color#toRgba
   */
  static fromRgba(rgba: number, result?: Color): Color {
    // scratchUint32Array and scratchUint8Array share an underlying array buffer
    scratchUint32Array![0] = rgba;
    return Color.fromBytes(
      scratchUint8Array![0],
      scratchUint8Array![1],
      scratchUint8Array![2],
      scratchUint8Array![3],
      result
    );
  }

  /**
   * Creates a Color instance from hue, saturation, and lightness.
   *
   * @param hue - The hue angle 0...1
   * @param saturation - The saturation value 0...1
   * @param lightness - The lightness value 0...1
   * @param alpha - The alpha component 0...1
   * @param result - The object to store the result in, if undefined a new instance will be created.
   * @returns The color object.
   *
   * @see {@link http://www.w3.org/TR/css3-color/#hsl-color|CSS color values}
   */
  static fromHsl(
    hue: number = 0,
    saturation: number = 0,
    lightness: number = 0,
    alpha: number = 1.0,
    result?: Color
  ): Color {
    hue = hue % 1.0;

    let red = lightness;
    let green = lightness;
    let blue = lightness;

    if (saturation !== 0) {
      let m2: number;
      if (lightness < 0.5) {
        m2 = lightness * (1 + saturation);
      } else {
        m2 = lightness + saturation - lightness * saturation;
      }

      const m1 = 2.0 * lightness - m2;
      red = hue2rgb(m1, m2, hue + 1 / 3);
      green = hue2rgb(m1, m2, hue);
      blue = hue2rgb(m1, m2, hue - 1 / 3);
    }

    if (!defined(result)) {
      return new Color(red, green, blue, alpha);
    }

    result!.red = red;
    result!.green = green;
    result!.blue = blue;
    result!.alpha = alpha;
    return result!;
  }

  /**
   * Creates a random color using the provided options. For reproducible random colors, you should
   * call {@link CesiumMath#setRandomNumberSeed} once at the beginning of your application.
   *
   * @param options - Object with the following properties:
   * @param options.red - If specified, the red component to use instead of a randomized value.
   * @param options.minimumRed - The maximum red value to generate if none was specified.
   * @param options.maximumRed - The minimum red value to generate if none was specified.
   * @param options.green - If specified, the green component to use instead of a randomized value.
   * @param options.minimumGreen - The maximum green value to generate if none was specified.
   * @param options.maximumGreen - The minimum green value to generate if none was specified.
   * @param options.blue - If specified, the blue component to use instead of a randomized value.
   * @param options.minimumBlue - The maximum blue value to generate if none was specified.
   * @param options.maximumBlue - The minimum blue value to generate if none was specified.
   * @param options.alpha - If specified, the alpha component to use instead of a randomized value.
   * @param options.minimumAlpha - The maximum alpha value to generate if none was specified.
   * @param options.maximumAlpha - The minimum alpha value to generate if none was specified.
   * @param result - The object to store the result in, if undefined a new instance will be created.
   * @returns The modified result parameter or a new instance if result was undefined.
   *
   * @exception {DeveloperError} minimumRed must be less than or equal to maximumRed.
   * @exception {DeveloperError} minimumGreen must be less than or equal to maximumGreen.
   * @exception {DeveloperError} minimumBlue must be less than or equal to maximumBlue.
   * @exception {DeveloperError} minimumAlpha must be less than or equal to maximumAlpha.
   *
   * @example
   * //Create a completely random color
   * const color = Cesium.Color.fromRandom();
   *
   * //Create a random shade of yellow.
   * const color1 = Cesium.Color.fromRandom({
   *     red : 1.0,
   *     green : 1.0,
   *     alpha : 1.0
   * });
   *
   * //Create a random bright color.
   * const color2 = Cesium.Color.fromRandom({
   *     minimumRed : 0.75,
   *     minimumGreen : 0.75,
   *     minimumBlue : 0.75,
   *     alpha : 1.0
   * });
   */
  static fromRandom(options?: FromRandomOptions, result?: Color): Color {
    const opts = options ?? (Frozen.EMPTY_OBJECT as FromRandomOptions);

    let red = opts.red;
    if (!defined(red)) {
      const minimumRed = opts.minimumRed ?? 0;
      const maximumRed = opts.maximumRed ?? 1.0;

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.lessThanOrEquals("minimumRed", minimumRed, maximumRed);
      //>>includeEnd('debug');

      red =
        minimumRed + CesiumMath.nextRandomNumber() * (maximumRed - minimumRed);
    }

    let green = opts.green;
    if (!defined(green)) {
      const minimumGreen = opts.minimumGreen ?? 0;
      const maximumGreen = opts.maximumGreen ?? 1.0;

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.lessThanOrEquals(
        "minimumGreen",
        minimumGreen,
        maximumGreen
      );
      //>>includeEnd('debug');
      green =
        minimumGreen +
        CesiumMath.nextRandomNumber() * (maximumGreen - minimumGreen);
    }

    let blue = opts.blue;
    if (!defined(blue)) {
      const minimumBlue = opts.minimumBlue ?? 0;
      const maximumBlue = opts.maximumBlue ?? 1.0;

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.lessThanOrEquals(
        "minimumBlue",
        minimumBlue,
        maximumBlue
      );
      //>>includeEnd('debug');

      blue =
        minimumBlue + CesiumMath.nextRandomNumber() * (maximumBlue - minimumBlue);
    }

    let alpha = opts.alpha;
    if (!defined(alpha)) {
      const minimumAlpha = opts.minimumAlpha ?? 0;
      const maximumAlpha = opts.maximumAlpha ?? 1.0;

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.lessThanOrEquals(
        "minimumAlpha",
        minimumAlpha,
        maximumAlpha
      );
      //>>includeEnd('debug');

      alpha =
        minimumAlpha +
        CesiumMath.nextRandomNumber() * (maximumAlpha - minimumAlpha);
    }

    if (!defined(result)) {
      return new Color(red, green, blue, alpha);
    }

    result!.red = red!;
    result!.green = green!;
    result!.blue = blue!;
    result!.alpha = alpha!;
    return result!;
  }

  /**
   * Creates a Color instance from a CSS color value.
   *
   * @param color - The CSS color value in #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), or hsla() format.
   * @param result - The object to store the result in, if undefined a new instance will be created.
   * @returns The color object, or undefined if the string was not a valid CSS color.
   *
   * @example
   * const cesiumBlue = Cesium.Color.fromCssColorString('#67ADDF');
   * const green = Cesium.Color.fromCssColorString('green');
   *
   * @see {@link http://www.w3.org/TR/css3-color|CSS color values}
   */
  static fromCssColorString(color: string, result?: Color): Color | undefined {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("color", color);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Color();
    }

    // Remove all surrounding whitespaces from the color string
    color = color.trim();

    const namedColor = (Color as any)[color.toUpperCase()] as Color | undefined;
    if (defined(namedColor)) {
      Color.clone(namedColor!, result);
      return result;
    }

    let matches = rgbaMatcher.exec(color);
    if (matches !== null) {
      result!.red = parseInt(matches[1], 16) / 15;
      result!.green = parseInt(matches[2], 16) / 15.0;
      result!.blue = parseInt(matches[3], 16) / 15.0;
      result!.alpha = parseInt(matches[4] ?? "f", 16) / 15.0;
      return result;
    }

    matches = rrggbbaaMatcher.exec(color);
    if (matches !== null) {
      result!.red = parseInt(matches[1], 16) / 255.0;
      result!.green = parseInt(matches[2], 16) / 255.0;
      result!.blue = parseInt(matches[3], 16) / 255.0;
      result!.alpha = parseInt(matches[4] ?? "ff", 16) / 255.0;
      return result;
    }

    matches = rgbParenthesesMatcher.exec(color);
    if (matches !== null) {
      result!.red =
        parseFloat(matches[1]) / ("%" === matches[1].substr(-1) ? 100.0 : 255.0);
      result!.green =
        parseFloat(matches[2]) / ("%" === matches[2].substr(-1) ? 100.0 : 255.0);
      result!.blue =
        parseFloat(matches[3]) / ("%" === matches[3].substr(-1) ? 100.0 : 255.0);
      result!.alpha = parseFloat(matches[4] ?? "1.0");
      return result;
    }

    matches = hslParenthesesMatcher.exec(color);
    if (matches !== null) {
      return Color.fromHsl(
        parseFloat(matches[1]) / 360.0,
        parseFloat(matches[2]) / 100.0,
        parseFloat(matches[3]) / 100.0,
        parseFloat(matches[4] ?? "1.0"),
        result
      );
    }

    return undefined;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param value - The value to pack.
   * @param array - The array to pack into.
   * @param startingIndex - The index into the array at which to start packing the elements.
   * @returns The array that was packed into
   */
  static pack(
    value: Color,
    array: number[],
    startingIndex: number = 0
  ): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.defined("array", array);
    //>>includeEnd('debug');

    array[startingIndex++] = value.red;
    array[startingIndex++] = value.green;
    array[startingIndex++] = value.blue;
    array[startingIndex] = value.alpha;

    return array;
  }

  /**
   * Retrieves an instance from a packed array.
   *
   * @param array - The packed array.
   * @param startingIndex - The starting index of the element to be unpacked.
   * @param result - The object into which to store the result.
   * @returns The modified result parameter or a new Color instance if one was not provided.
   */
  static unpack(
    array: number[],
    startingIndex: number = 0,
    result?: Color
  ): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Color();
    }
    result!.red = array[startingIndex++];
    result!.green = array[startingIndex++];
    result!.blue = array[startingIndex++];
    result!.alpha = array[startingIndex];
    return result!;
  }

  /**
   * Converts a 'byte' color component in the range of 0 to 255 into
   * a 'float' color component in the range of 0 to 1.0.
   *
   * @param number - The number to be converted.
   * @returns The converted number.
   */
  static byteToFloat(number: number): number {
    return number / 255.0;
  }

  /**
   * Converts a 'float' color component in the range of 0 to 1.0 into
   * a 'byte' color component in the range of 0 to 255.
   *
   * @param number - The number to be converted.
   * @returns The converted number.
   */
  static floatToByte(number: number): number {
    return number === 1.0 ? 255.0 : (number * 256.0) | 0;
  }

  /**
   * Duplicates a Color.
   *
   * @param color - The Color to duplicate.
   * @param result - The object to store the result in, if undefined a new instance will be created.
   * @returns The modified result parameter or a new instance if result was undefined. (Returns undefined if color is undefined)
   */
  static clone(color: Color, result?: Color): Color;
  static clone(color: undefined, result?: Color): undefined;
  static clone(color: Color | undefined, result?: Color): Color | undefined;
  static clone(color: Color | undefined, result?: Color): Color | undefined {
    if (!defined(color)) {
      return undefined;
    }
    if (!defined(result)) {
      return new Color(color!.red, color!.green, color!.blue, color!.alpha);
    }
    result!.red = color!.red;
    result!.green = color!.green;
    result!.blue = color!.blue;
    result!.alpha = color!.alpha;
    return result;
  }

  /**
   * Returns true if the first Color equals the second color.
   *
   * @param left - The first Color to compare for equality.
   * @param right - The second Color to compare for equality.
   * @returns <code>true</code> if the Colors are equal; otherwise, <code>false</code>.
   */
  static equals(left?: Color, right?: Color): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left!.red === right!.red &&
        left!.green === right!.green &&
        left!.blue === right!.blue &&
        left!.alpha === right!.alpha)
    );
  }

  /**
   * @private
   */
  static equalsArray(color: Color, array: number[], offset: number): boolean {
    return (
      color.red === array[offset] &&
      color.green === array[offset + 1] &&
      color.blue === array[offset + 2] &&
      color.alpha === array[offset + 3]
    );
  }

  /**
   * Computes the componentwise sum of two Colors.
   *
   * @param left - The first Color.
   * @param right - The second Color.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static add(left: Color, right: Color, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = left.red + right.red;
    result.green = left.green + right.green;
    result.blue = left.blue + right.blue;
    result.alpha = left.alpha + right.alpha;
    return result;
  }

  /**
   * Computes the componentwise difference of two Colors.
   *
   * @param left - The first Color.
   * @param right - The second Color.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static subtract(left: Color, right: Color, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = left.red - right.red;
    result.green = left.green - right.green;
    result.blue = left.blue - right.blue;
    result.alpha = left.alpha - right.alpha;
    return result;
  }

  /**
   * Computes the componentwise product of two Colors.
   *
   * @param left - The first Color.
   * @param right - The second Color.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiply(left: Color, right: Color, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = left.red * right.red;
    result.green = left.green * right.green;
    result.blue = left.blue * right.blue;
    result.alpha = left.alpha * right.alpha;
    return result;
  }

  /**
   * Computes the componentwise quotient of two Colors.
   *
   * @param left - The first Color.
   * @param right - The second Color.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divide(left: Color, right: Color, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = left.red / right.red;
    result.green = left.green / right.green;
    result.blue = left.blue / right.blue;
    result.alpha = left.alpha / right.alpha;
    return result;
  }

  /**
   * Computes the componentwise modulus of two Colors.
   *
   * @param left - The first Color.
   * @param right - The second Color.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static mod(left: Color, right: Color, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = left.red % right.red;
    result.green = left.green % right.green;
    result.blue = left.blue % right.blue;
    result.alpha = left.alpha % right.alpha;
    return result;
  }

  /**
   * Computes the linear interpolation or extrapolation at t between the provided colors.
   *
   * @param start - The color corresponding to t at 0.0.
   * @param end - The color corresponding to t at 1.0.
   * @param t - The point along t at which to interpolate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static lerp(start: Color, end: Color, t: number, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("start", start);
    Check.typeOf.object("end", end);
    Check.typeOf.number("t", t);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = CesiumMath.lerp(start.red, end.red, t);
    result.green = CesiumMath.lerp(start.green, end.green, t);
    result.blue = CesiumMath.lerp(start.blue, end.blue, t);
    result.alpha = CesiumMath.lerp(start.alpha, end.alpha, t);
    return result;
  }

  /**
   * Multiplies the provided Color componentwise by the provided scalar.
   *
   * @param color - The Color to be scaled.
   * @param scalar - The scalar to multiply with.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyByScalar(color: Color, scalar: number, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("color", color);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = color.red * scalar;
    result.green = color.green * scalar;
    result.blue = color.blue * scalar;
    result.alpha = color.alpha * scalar;
    return result;
  }

  /**
   * Divides the provided Color componentwise by the provided scalar.
   *
   * @param color - The Color to be divided.
   * @param scalar - The scalar to divide with.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divideByScalar(color: Color, scalar: number, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("color", color);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.red = color.red / scalar;
    result.green = color.green / scalar;
    result.blue = color.blue / scalar;
    result.alpha = color.alpha / scalar;
    return result;
  }

  /**
   * Converts RGBA values in bytes to a single numeric unsigned 32-bit RGBA value, using the endianness
   * of the system.
   *
   * @param red - The red byte value.
   * @param green - The green byte value.
   * @param blue - The blue byte value.
   * @param alpha - The alpha byte value.
   * @returns A single numeric unsigned 32-bit RGBA value.
   *
   * @see Color.toRgba
   */
  static bytesToRgba(
    red: number,
    green: number,
    blue: number,
    alpha: number
  ): number {
    // scratchUint32Array and scratchUint8Array share an underlying array buffer
    scratchUint8Array![0] = red;
    scratchUint8Array![1] = green;
    scratchUint8Array![2] = blue;
    scratchUint8Array![3] = alpha;
    return scratchUint32Array![0];
  }

  /**
   * Returns a duplicate of a Color instance.
   *
   * @param result - The object to store the result in, if undefined a new instance will be created.
   * @returns The modified result parameter or a new instance if result was undefined.
   */
  clone(result?: Color): Color {
    return Color.clone(this, result)!;
  }

  /**
   * Returns true if this Color equals other.
   *
   * @param other - The Color to compare for equality.
   * @returns <code>true</code> if the Colors are equal; otherwise, <code>false</code>.
   */
  equals(other?: Color): boolean {
    return Color.equals(this, other);
  }

  /**
   * Returns <code>true</code> if this Color equals other componentwise within the specified epsilon.
   *
   * @param other - The Color to compare for equality.
   * @param epsilon - The epsilon to use for equality testing.
   * @returns <code>true</code> if the Colors are equal within the specified epsilon; otherwise, <code>false</code>.
   */
  equalsEpsilon(other: Color, epsilon: number = 0): boolean {
    return (
      this === other ||
      (defined(other) &&
        Math.abs(this.red - other.red) <= epsilon &&
        Math.abs(this.green - other.green) <= epsilon &&
        Math.abs(this.blue - other.blue) <= epsilon &&
        Math.abs(this.alpha - other.alpha) <= epsilon)
    );
  }

  /**
   * Creates a string representing this Color in the format '(red, green, blue, alpha)'.
   *
   * @returns A string representing this Color in the format '(red, green, blue, alpha)'.
   */
  toString(): string {
    return `(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
  }

  /**
   * Creates a string containing the CSS color value for this color.
   *
   * @returns The CSS equivalent of this color.
   *
   * @see {@link http://www.w3.org/TR/css3-color/#rgba-color|CSS RGB or RGBA color values}
   */
  toCssColorString(): string {
    const red = Color.floatToByte(this.red);
    const green = Color.floatToByte(this.green);
    const blue = Color.floatToByte(this.blue);
    if (this.alpha === 1) {
      return `rgb(${red},${green},${blue})`;
    }
    return `rgba(${red},${green},${blue},${this.alpha})`;
  }

  /**
   * Creates a string containing CSS hex string color value for this color.
   *
   * @returns The CSS hex string equivalent of this color.
   */
  toCssHexString(): string {
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
  }

  /**
   * Converts this color to an array of red, green, blue, and alpha values
   * that are in the range of 0 to 255.
   *
   * @param result - The array to store the result in, if undefined a new instance will be created.
   * @returns The modified result parameter or a new instance if result was undefined.
   */
  toBytes(result?: number[]): number[] {
    const red = Color.floatToByte(this.red);
    const green = Color.floatToByte(this.green);
    const blue = Color.floatToByte(this.blue);
    const alpha = Color.floatToByte(this.alpha);

    if (!defined(result)) {
      return [red, green, blue, alpha];
    }
    result![0] = red;
    result![1] = green;
    result![2] = blue;
    result![3] = alpha;
    return result!;
  }

  /**
   * Converts this color to a single numeric unsigned 32-bit RGBA value, using the endianness
   * of the system.
   *
   * @returns A single numeric unsigned 32-bit RGBA value.
   *
   * @example
   * const rgba = Cesium.Color.BLUE.toRgba();
   *
   * @see Color.fromRgba
   */
  toRgba(): number {
    return Color.bytesToRgba(
      Color.floatToByte(this.red),
      Color.floatToByte(this.green),
      Color.floatToByte(this.blue),
      Color.floatToByte(this.alpha)
    );
  }

  /**
   * Brightens this color by the provided magnitude.
   *
   * @param magnitude - A positive number indicating the amount to brighten.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @example
   * const brightBlue = Cesium.Color.BLUE.brighten(0.5, new Cesium.Color());
   */
  brighten(magnitude: number, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("magnitude", magnitude);
    Check.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0.0);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    magnitude = 1.0 - magnitude;
    result.red = 1.0 - (1.0 - this.red) * magnitude;
    result.green = 1.0 - (1.0 - this.green) * magnitude;
    result.blue = 1.0 - (1.0 - this.blue) * magnitude;
    result.alpha = this.alpha;
    return result;
  }

  /**
   * Darkens this color by the provided magnitude.
   *
   * @param magnitude - A positive number indicating the amount to darken.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   *
   * @example
   * const darkBlue = Cesium.Color.BLUE.darken(0.5, new Cesium.Color());
   */
  darken(magnitude: number, result: Color): Color {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("magnitude", magnitude);
    Check.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0.0);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    magnitude = 1.0 - magnitude;
    result.red = this.red * magnitude;
    result.green = this.green * magnitude;
    result.blue = this.blue * magnitude;
    result.alpha = this.alpha;
    return result;
  }

  /**
   * Creates a new Color that has the same red, green, and blue components
   * as this Color, but with the specified alpha value.
   *
   * @param alpha - The new alpha component.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Color instance if one was not provided.
   *
   * @example const translucentRed = Cesium.Color.RED.withAlpha(0.9);
   */
  withAlpha(alpha: number, result?: Color): Color {
    return Color.fromAlpha(this, alpha, result);
  }
}

// Initialize static color constants
// Using non-null assertion since fromCssColorString always returns Color for valid CSS color strings

/**
 * An immutable Color instance initialized to CSS color #F0F8FF
 * <span class="colorSwath" style="background: #F0F8FF;"></span>
 */
Color.ALICEBLUE = Object.freeze(Color.fromCssColorString("#F0F8FF")!);

/**
 * An immutable Color instance initialized to CSS color #FAEBD7
 * <span class="colorSwath" style="background: #FAEBD7;"></span>
 */
Color.ANTIQUEWHITE = Object.freeze(Color.fromCssColorString("#FAEBD7")!);

/**
 * An immutable Color instance initialized to CSS color #00FFFF
 * <span class="colorSwath" style="background: #00FFFF;"></span>
 */
Color.AQUA = Object.freeze(Color.fromCssColorString("#00FFFF")!);

/**
 * An immutable Color instance initialized to CSS color #7FFFD4
 * <span class="colorSwath" style="background: #7FFFD4;"></span>
 */
Color.AQUAMARINE = Object.freeze(Color.fromCssColorString("#7FFFD4")!);

/**
 * An immutable Color instance initialized to CSS color #F0FFFF
 * <span class="colorSwath" style="background: #F0FFFF;"></span>
 */
Color.AZURE = Object.freeze(Color.fromCssColorString("#F0FFFF")!);

/**
 * An immutable Color instance initialized to CSS color #F5F5DC
 * <span class="colorSwath" style="background: #F5F5DC;"></span>
 */
Color.BEIGE = Object.freeze(Color.fromCssColorString("#F5F5DC")!);

/**
 * An immutable Color instance initialized to CSS color #FFE4C4
 * <span class="colorSwath" style="background: #FFE4C4;"></span>
 */
Color.BISQUE = Object.freeze(Color.fromCssColorString("#FFE4C4")!);

/**
 * An immutable Color instance initialized to CSS color #000000
 * <span class="colorSwath" style="background: #000000;"></span>
 */
Color.BLACK = Object.freeze(Color.fromCssColorString("#000000")!);

/**
 * An immutable Color instance initialized to CSS color #FFEBCD
 * <span class="colorSwath" style="background: #FFEBCD;"></span>
 */
Color.BLANCHEDALMOND = Object.freeze(Color.fromCssColorString("#FFEBCD")!);

/**
 * An immutable Color instance initialized to CSS color #0000FF
 * <span class="colorSwath" style="background: #0000FF;"></span>
 */
Color.BLUE = Object.freeze(Color.fromCssColorString("#0000FF")!);

/**
 * An immutable Color instance initialized to CSS color #8A2BE2
 * <span class="colorSwath" style="background: #8A2BE2;"></span>
 */
Color.BLUEVIOLET = Object.freeze(Color.fromCssColorString("#8A2BE2")!);

/**
 * An immutable Color instance initialized to CSS color #A52A2A
 * <span class="colorSwath" style="background: #A52A2A;"></span>
 */
Color.BROWN = Object.freeze(Color.fromCssColorString("#A52A2A")!);

/**
 * An immutable Color instance initialized to CSS color #DEB887
 * <span class="colorSwath" style="background: #DEB887;"></span>
 */
Color.BURLYWOOD = Object.freeze(Color.fromCssColorString("#DEB887")!);

/**
 * An immutable Color instance initialized to CSS color #5F9EA0
 * <span class="colorSwath" style="background: #5F9EA0;"></span>
 */
Color.CADETBLUE = Object.freeze(Color.fromCssColorString("#5F9EA0")!);

/**
 * An immutable Color instance initialized to CSS color #7FFF00
 * <span class="colorSwath" style="background: #7FFF00;"></span>
 */
Color.CHARTREUSE = Object.freeze(Color.fromCssColorString("#7FFF00")!);

/**
 * An immutable Color instance initialized to CSS color #D2691E
 * <span class="colorSwath" style="background: #D2691E;"></span>
 */
Color.CHOCOLATE = Object.freeze(Color.fromCssColorString("#D2691E")!);

/**
 * An immutable Color instance initialized to CSS color #FF7F50
 * <span class="colorSwath" style="background: #FF7F50;"></span>
 */
Color.CORAL = Object.freeze(Color.fromCssColorString("#FF7F50")!);

/**
 * An immutable Color instance initialized to CSS color #6495ED
 * <span class="colorSwath" style="background: #6495ED;"></span>
 */
Color.CORNFLOWERBLUE = Object.freeze(Color.fromCssColorString("#6495ED")!);

/**
 * An immutable Color instance initialized to CSS color #FFF8DC
 * <span class="colorSwath" style="background: #FFF8DC;"></span>
 */
Color.CORNSILK = Object.freeze(Color.fromCssColorString("#FFF8DC")!);

/**
 * An immutable Color instance initialized to CSS color #DC143C
 * <span class="colorSwath" style="background: #DC143C;"></span>
 */
Color.CRIMSON = Object.freeze(Color.fromCssColorString("#DC143C")!);

/**
 * An immutable Color instance initialized to CSS color #00FFFF
 * <span class="colorSwath" style="background: #00FFFF;"></span>
 */
Color.CYAN = Object.freeze(Color.fromCssColorString("#00FFFF")!);

/**
 * An immutable Color instance initialized to CSS color #00008B
 * <span class="colorSwath" style="background: #00008B;"></span>
 */
Color.DARKBLUE = Object.freeze(Color.fromCssColorString("#00008B")!);

/**
 * An immutable Color instance initialized to CSS color #008B8B
 * <span class="colorSwath" style="background: #008B8B;"></span>
 */
Color.DARKCYAN = Object.freeze(Color.fromCssColorString("#008B8B")!);

/**
 * An immutable Color instance initialized to CSS color #B8860B
 * <span class="colorSwath" style="background: #B8860B;"></span>
 */
Color.DARKGOLDENROD = Object.freeze(Color.fromCssColorString("#B8860B")!);

/**
 * An immutable Color instance initialized to CSS color #A9A9A9
 * <span class="colorSwath" style="background: #A9A9A9;"></span>
 */
Color.DARKGRAY = Object.freeze(Color.fromCssColorString("#A9A9A9")!);

/**
 * An immutable Color instance initialized to CSS color #006400
 * <span class="colorSwath" style="background: #006400;"></span>
 */
Color.DARKGREEN = Object.freeze(Color.fromCssColorString("#006400")!);

/**
 * An immutable Color instance initialized to CSS color #A9A9A9
 * <span class="colorSwath" style="background: #A9A9A9;"></span>
 */
Color.DARKGREY = Color.DARKGRAY;

/**
 * An immutable Color instance initialized to CSS color #BDB76B
 * <span class="colorSwath" style="background: #BDB76B;"></span>
 */
Color.DARKKHAKI = Object.freeze(Color.fromCssColorString("#BDB76B")!);

/**
 * An immutable Color instance initialized to CSS color #8B008B
 * <span class="colorSwath" style="background: #8B008B;"></span>
 */
Color.DARKMAGENTA = Object.freeze(Color.fromCssColorString("#8B008B")!);

/**
 * An immutable Color instance initialized to CSS color #556B2F
 * <span class="colorSwath" style="background: #556B2F;"></span>
 */
Color.DARKOLIVEGREEN = Object.freeze(Color.fromCssColorString("#556B2F")!);

/**
 * An immutable Color instance initialized to CSS color #FF8C00
 * <span class="colorSwath" style="background: #FF8C00;"></span>
 */
Color.DARKORANGE = Object.freeze(Color.fromCssColorString("#FF8C00")!);

/**
 * An immutable Color instance initialized to CSS color #9932CC
 * <span class="colorSwath" style="background: #9932CC;"></span>
 */
Color.DARKORCHID = Object.freeze(Color.fromCssColorString("#9932CC")!);

/**
 * An immutable Color instance initialized to CSS color #8B0000
 * <span class="colorSwath" style="background: #8B0000;"></span>
 */
Color.DARKRED = Object.freeze(Color.fromCssColorString("#8B0000")!);

/**
 * An immutable Color instance initialized to CSS color #E9967A
 * <span class="colorSwath" style="background: #E9967A;"></span>
 */
Color.DARKSALMON = Object.freeze(Color.fromCssColorString("#E9967A")!);

/**
 * An immutable Color instance initialized to CSS color #8FBC8F
 * <span class="colorSwath" style="background: #8FBC8F;"></span>
 */
Color.DARKSEAGREEN = Object.freeze(Color.fromCssColorString("#8FBC8F")!);

/**
 * An immutable Color instance initialized to CSS color #483D8B
 * <span class="colorSwath" style="background: #483D8B;"></span>
 */
Color.DARKSLATEBLUE = Object.freeze(Color.fromCssColorString("#483D8B")!);

/**
 * An immutable Color instance initialized to CSS color #2F4F4F
 * <span class="colorSwath" style="background: #2F4F4F;"></span>
 */
Color.DARKSLATEGRAY = Object.freeze(Color.fromCssColorString("#2F4F4F")!);

/**
 * An immutable Color instance initialized to CSS color #2F4F4F
 * <span class="colorSwath" style="background: #2F4F4F;"></span>
 */
Color.DARKSLATEGREY = Color.DARKSLATEGRAY;

/**
 * An immutable Color instance initialized to CSS color #00CED1
 * <span class="colorSwath" style="background: #00CED1;"></span>
 */
Color.DARKTURQUOISE = Object.freeze(Color.fromCssColorString("#00CED1")!);

/**
 * An immutable Color instance initialized to CSS color #9400D3
 * <span class="colorSwath" style="background: #9400D3;"></span>
 */
Color.DARKVIOLET = Object.freeze(Color.fromCssColorString("#9400D3")!);

/**
 * An immutable Color instance initialized to CSS color #FF1493
 * <span class="colorSwath" style="background: #FF1493;"></span>
 */
Color.DEEPPINK = Object.freeze(Color.fromCssColorString("#FF1493")!);

/**
 * An immutable Color instance initialized to CSS color #00BFFF
 * <span class="colorSwath" style="background: #00BFFF;"></span>
 */
Color.DEEPSKYBLUE = Object.freeze(Color.fromCssColorString("#00BFFF")!);

/**
 * An immutable Color instance initialized to CSS color #696969
 * <span class="colorSwath" style="background: #696969;"></span>
 */
Color.DIMGRAY = Object.freeze(Color.fromCssColorString("#696969")!);

/**
 * An immutable Color instance initialized to CSS color #696969
 * <span class="colorSwath" style="background: #696969;"></span>
 */
Color.DIMGREY = Color.DIMGRAY;

/**
 * An immutable Color instance initialized to CSS color #1E90FF
 * <span class="colorSwath" style="background: #1E90FF;"></span>
 */
Color.DODGERBLUE = Object.freeze(Color.fromCssColorString("#1E90FF")!);

/**
 * An immutable Color instance initialized to CSS color #B22222
 * <span class="colorSwath" style="background: #B22222;"></span>
 */
Color.FIREBRICK = Object.freeze(Color.fromCssColorString("#B22222")!);

/**
 * An immutable Color instance initialized to CSS color #FFFAF0
 * <span class="colorSwath" style="background: #FFFAF0;"></span>
 */
Color.FLORALWHITE = Object.freeze(Color.fromCssColorString("#FFFAF0")!);

/**
 * An immutable Color instance initialized to CSS color #228B22
 * <span class="colorSwath" style="background: #228B22;"></span>
 */
Color.FORESTGREEN = Object.freeze(Color.fromCssColorString("#228B22")!);

/**
 * An immutable Color instance initialized to CSS color #FF00FF
 * <span class="colorSwath" style="background: #FF00FF;"></span>
 */
Color.FUCHSIA = Object.freeze(Color.fromCssColorString("#FF00FF")!);

/**
 * An immutable Color instance initialized to CSS color #DCDCDC
 * <span class="colorSwath" style="background: #DCDCDC;"></span>
 */
Color.GAINSBORO = Object.freeze(Color.fromCssColorString("#DCDCDC")!);

/**
 * An immutable Color instance initialized to CSS color #F8F8FF
 * <span class="colorSwath" style="background: #F8F8FF;"></span>
 */
Color.GHOSTWHITE = Object.freeze(Color.fromCssColorString("#F8F8FF")!);

/**
 * An immutable Color instance initialized to CSS color #FFD700
 * <span class="colorSwath" style="background: #FFD700;"></span>
 */
Color.GOLD = Object.freeze(Color.fromCssColorString("#FFD700")!);

/**
 * An immutable Color instance initialized to CSS color #DAA520
 * <span class="colorSwath" style="background: #DAA520;"></span>
 */
Color.GOLDENROD = Object.freeze(Color.fromCssColorString("#DAA520")!);

/**
 * An immutable Color instance initialized to CSS color #808080
 * <span class="colorSwath" style="background: #808080;"></span>
 */
Color.GRAY = Object.freeze(Color.fromCssColorString("#808080")!);

/**
 * An immutable Color instance initialized to CSS color #008000
 * <span class="colorSwath" style="background: #008000;"></span>
 */
Color.GREEN = Object.freeze(Color.fromCssColorString("#008000")!);

/**
 * An immutable Color instance initialized to CSS color #ADFF2F
 * <span class="colorSwath" style="background: #ADFF2F;"></span>
 */
Color.GREENYELLOW = Object.freeze(Color.fromCssColorString("#ADFF2F")!);

/**
 * An immutable Color instance initialized to CSS color #808080
 * <span class="colorSwath" style="background: #808080;"></span>
 */
Color.GREY = Color.GRAY;

/**
 * An immutable Color instance initialized to CSS color #F0FFF0
 * <span class="colorSwath" style="background: #F0FFF0;"></span>
 */
Color.HONEYDEW = Object.freeze(Color.fromCssColorString("#F0FFF0")!);

/**
 * An immutable Color instance initialized to CSS color #FF69B4
 * <span class="colorSwath" style="background: #FF69B4;"></span>
 */
Color.HOTPINK = Object.freeze(Color.fromCssColorString("#FF69B4")!);

/**
 * An immutable Color instance initialized to CSS color #CD5C5C
 * <span class="colorSwath" style="background: #CD5C5C;"></span>
 */
Color.INDIANRED = Object.freeze(Color.fromCssColorString("#CD5C5C")!);

/**
 * An immutable Color instance initialized to CSS color #4B0082
 * <span class="colorSwath" style="background: #4B0082;"></span>
 */
Color.INDIGO = Object.freeze(Color.fromCssColorString("#4B0082")!);

/**
 * An immutable Color instance initialized to CSS color #FFFFF0
 * <span class="colorSwath" style="background: #FFFFF0;"></span>
 */
Color.IVORY = Object.freeze(Color.fromCssColorString("#FFFFF0")!);

/**
 * An immutable Color instance initialized to CSS color #F0E68C
 * <span class="colorSwath" style="background: #F0E68C;"></span>
 */
Color.KHAKI = Object.freeze(Color.fromCssColorString("#F0E68C")!);

/**
 * An immutable Color instance initialized to CSS color #E6E6FA
 * <span class="colorSwath" style="background: #E6E6FA;"></span>
 */
Color.LAVENDER = Object.freeze(Color.fromCssColorString("#E6E6FA")!);

/**
 * An immutable Color instance initialized to CSS color #FFF0F5
 * <span class="colorSwath" style="background: #FFF0F5;"></span>
 */
Color.LAVENDAR_BLUSH = Object.freeze(Color.fromCssColorString("#FFF0F5")!);

/**
 * An immutable Color instance initialized to CSS color #7CFC00
 * <span class="colorSwath" style="background: #7CFC00;"></span>
 */
Color.LAWNGREEN = Object.freeze(Color.fromCssColorString("#7CFC00")!);

/**
 * An immutable Color instance initialized to CSS color #FFFACD
 * <span class="colorSwath" style="background: #FFFACD;"></span>
 */
Color.LEMONCHIFFON = Object.freeze(Color.fromCssColorString("#FFFACD")!);

/**
 * An immutable Color instance initialized to CSS color #ADD8E6
 * <span class="colorSwath" style="background: #ADD8E6;"></span>
 */
Color.LIGHTBLUE = Object.freeze(Color.fromCssColorString("#ADD8E6")!);

/**
 * An immutable Color instance initialized to CSS color #F08080
 * <span class="colorSwath" style="background: #F08080;"></span>
 */
Color.LIGHTCORAL = Object.freeze(Color.fromCssColorString("#F08080")!);

/**
 * An immutable Color instance initialized to CSS color #E0FFFF
 * <span class="colorSwath" style="background: #E0FFFF;"></span>
 */
Color.LIGHTCYAN = Object.freeze(Color.fromCssColorString("#E0FFFF")!);

/**
 * An immutable Color instance initialized to CSS color #FAFAD2
 * <span class="colorSwath" style="background: #FAFAD2;"></span>
 */
Color.LIGHTGOLDENRODYELLOW = Object.freeze(Color.fromCssColorString("#FAFAD2")!);

/**
 * An immutable Color instance initialized to CSS color #D3D3D3
 * <span class="colorSwath" style="background: #D3D3D3;"></span>
 */
Color.LIGHTGRAY = Object.freeze(Color.fromCssColorString("#D3D3D3")!);

/**
 * An immutable Color instance initialized to CSS color #90EE90
 * <span class="colorSwath" style="background: #90EE90;"></span>
 */
Color.LIGHTGREEN = Object.freeze(Color.fromCssColorString("#90EE90")!);

/**
 * An immutable Color instance initialized to CSS color #D3D3D3
 * <span class="colorSwath" style="background: #D3D3D3;"></span>
 */
Color.LIGHTGREY = Color.LIGHTGRAY;

/**
 * An immutable Color instance initialized to CSS color #FFB6C1
 * <span class="colorSwath" style="background: #FFB6C1;"></span>
 */
Color.LIGHTPINK = Object.freeze(Color.fromCssColorString("#FFB6C1")!);

/**
 * An immutable Color instance initialized to CSS color #FFA07A
 * <span class="colorSwath" style="background: #FFA07A;"></span>
 */
Color.LIGHTSEAGREEN = Object.freeze(Color.fromCssColorString("#20B2AA")!);

/**
 * An immutable Color instance initialized to CSS color #87CEFA
 * <span class="colorSwath" style="background: #87CEFA;"></span>
 */
Color.LIGHTSKYBLUE = Object.freeze(Color.fromCssColorString("#87CEFA")!);

/**
 * An immutable Color instance initialized to CSS color #778899
 * <span class="colorSwath" style="background: #778899;"></span>
 */
Color.LIGHTSLATEGRAY = Object.freeze(Color.fromCssColorString("#778899")!);

/**
 * An immutable Color instance initialized to CSS color #778899
 * <span class="colorSwath" style="background: #778899;"></span>
 */
Color.LIGHTSLATEGREY = Color.LIGHTSLATEGRAY;

/**
 * An immutable Color instance initialized to CSS color #B0C4DE
 * <span class="colorSwath" style="background: #B0C4DE;"></span>
 */
Color.LIGHTSTEELBLUE = Object.freeze(Color.fromCssColorString("#B0C4DE")!);

/**
 * An immutable Color instance initialized to CSS color #FFFFE0
 * <span class="colorSwath" style="background: #FFFFE0;"></span>
 */
Color.LIGHTYELLOW = Object.freeze(Color.fromCssColorString("#FFFFE0")!);

/**
 * An immutable Color instance initialized to CSS color #00FF00
 * <span class="colorSwath" style="background: #00FF00;"></span>
 */
Color.LIME = Object.freeze(Color.fromCssColorString("#00FF00")!);

/**
 * An immutable Color instance initialized to CSS color #32CD32
 * <span class="colorSwath" style="background: #32CD32;"></span>
 */
Color.LIMEGREEN = Object.freeze(Color.fromCssColorString("#32CD32")!);

/**
 * An immutable Color instance initialized to CSS color #FAF0E6
 * <span class="colorSwath" style="background: #FAF0E6;"></span>
 */
Color.LINEN = Object.freeze(Color.fromCssColorString("#FAF0E6")!);

/**
 * An immutable Color instance initialized to CSS color #FF00FF
 * <span class="colorSwath" style="background: #FF00FF;"></span>
 */
Color.MAGENTA = Object.freeze(Color.fromCssColorString("#FF00FF")!);

/**
 * An immutable Color instance initialized to CSS color #800000
 * <span class="colorSwath" style="background: #800000;"></span>
 */
Color.MAROON = Object.freeze(Color.fromCssColorString("#800000")!);

/**
 * An immutable Color instance initialized to CSS color #66CDAA
 * <span class="colorSwath" style="background: #66CDAA;"></span>
 */
Color.MEDIUMAQUAMARINE = Object.freeze(Color.fromCssColorString("#66CDAA")!);

/**
 * An immutable Color instance initialized to CSS color #0000CD
 * <span class="colorSwath" style="background: #0000CD;"></span>
 */
Color.MEDIUMBLUE = Object.freeze(Color.fromCssColorString("#0000CD")!);

/**
 * An immutable Color instance initialized to CSS color #BA55D3
 * <span class="colorSwath" style="background: #BA55D3;"></span>
 */
Color.MEDIUMORCHID = Object.freeze(Color.fromCssColorString("#BA55D3")!);

/**
 * An immutable Color instance initialized to CSS color #9370DB
 * <span class="colorSwath" style="background: #9370DB;"></span>
 */
Color.MEDIUMPURPLE = Object.freeze(Color.fromCssColorString("#9370DB")!);

/**
 * An immutable Color instance initialized to CSS color #3CB371
 * <span class="colorSwath" style="background: #3CB371;"></span>
 */
Color.MEDIUMSEAGREEN = Object.freeze(Color.fromCssColorString("#3CB371")!);

/**
 * An immutable Color instance initialized to CSS color #7B68EE
 * <span class="colorSwath" style="background: #7B68EE;"></span>
 */
Color.MEDIUMSLATEBLUE = Object.freeze(Color.fromCssColorString("#7B68EE")!);

/**
 * An immutable Color instance initialized to CSS color #00FA9A
 * <span class="colorSwath" style="background: #00FA9A;"></span>
 */
Color.MEDIUMSPRINGGREEN = Object.freeze(Color.fromCssColorString("#00FA9A")!);

/**
 * An immutable Color instance initialized to CSS color #48D1CC
 * <span class="colorSwath" style="background: #48D1CC;"></span>
 */
Color.MEDIUMTURQUOISE = Object.freeze(Color.fromCssColorString("#48D1CC")!);

/**
 * An immutable Color instance initialized to CSS color #C71585
 * <span class="colorSwath" style="background: #C71585;"></span>
 */
Color.MEDIUMVIOLETRED = Object.freeze(Color.fromCssColorString("#C71585")!);

/**
 * An immutable Color instance initialized to CSS color #191970
 * <span class="colorSwath" style="background: #191970;"></span>
 */
Color.MIDNIGHTBLUE = Object.freeze(Color.fromCssColorString("#191970")!);

/**
 * An immutable Color instance initialized to CSS color #F5FFFA
 * <span class="colorSwath" style="background: #F5FFFA;"></span>
 */
Color.MINTCREAM = Object.freeze(Color.fromCssColorString("#F5FFFA")!);

/**
 * An immutable Color instance initialized to CSS color #FFE4E1
 * <span class="colorSwath" style="background: #FFE4E1;"></span>
 */
Color.MISTYROSE = Object.freeze(Color.fromCssColorString("#FFE4E1")!);

/**
 * An immutable Color instance initialized to CSS color #FFE4B5
 * <span class="colorSwath" style="background: #FFE4B5;"></span>
 */
Color.MOCCASIN = Object.freeze(Color.fromCssColorString("#FFE4B5")!);

/**
 * An immutable Color instance initialized to CSS color #FFDEAD
 * <span class="colorSwath" style="background: #FFDEAD;"></span>
 */
Color.NAVAJOWHITE = Object.freeze(Color.fromCssColorString("#FFDEAD")!);

/**
 * An immutable Color instance initialized to CSS color #000080
 * <span class="colorSwath" style="background: #000080;"></span>
 */
Color.NAVY = Object.freeze(Color.fromCssColorString("#000080")!);

/**
 * An immutable Color instance initialized to CSS color #FDF5E6
 * <span class="colorSwath" style="background: #FDF5E6;"></span>
 */
Color.OLDLACE = Object.freeze(Color.fromCssColorString("#FDF5E6")!);

/**
 * An immutable Color instance initialized to CSS color #808000
 * <span class="colorSwath" style="background: #808000;"></span>
 */
Color.OLIVE = Object.freeze(Color.fromCssColorString("#808000")!);

/**
 * An immutable Color instance initialized to CSS color #6B8E23
 * <span class="colorSwath" style="background: #6B8E23;"></span>
 */
Color.OLIVEDRAB = Object.freeze(Color.fromCssColorString("#6B8E23")!);

/**
 * An immutable Color instance initialized to CSS color #FFA500
 * <span class="colorSwath" style="background: #FFA500;"></span>
 */
Color.ORANGE = Object.freeze(Color.fromCssColorString("#FFA500")!);

/**
 * An immutable Color instance initialized to CSS color #FF4500
 * <span class="colorSwath" style="background: #FF4500;"></span>
 */
Color.ORANGERED = Object.freeze(Color.fromCssColorString("#FF4500")!);

/**
 * An immutable Color instance initialized to CSS color #DA70D6
 * <span class="colorSwath" style="background: #DA70D6;"></span>
 */
Color.ORCHID = Object.freeze(Color.fromCssColorString("#DA70D6")!);

/**
 * An immutable Color instance initialized to CSS color #EEE8AA
 * <span class="colorSwath" style="background: #EEE8AA;"></span>
 */
Color.PALEGOLDENROD = Object.freeze(Color.fromCssColorString("#EEE8AA")!);

/**
 * An immutable Color instance initialized to CSS color #98FB98
 * <span class="colorSwath" style="background: #98FB98;"></span>
 */
Color.PALEGREEN = Object.freeze(Color.fromCssColorString("#98FB98")!);

/**
 * An immutable Color instance initialized to CSS color #AFEEEE
 * <span class="colorSwath" style="background: #AFEEEE;"></span>
 */
Color.PALETURQUOISE = Object.freeze(Color.fromCssColorString("#AFEEEE")!);

/**
 * An immutable Color instance initialized to CSS color #DB7093
 * <span class="colorSwath" style="background: #DB7093;"></span>
 */
Color.PALEVIOLETRED = Object.freeze(Color.fromCssColorString("#DB7093")!);

/**
 * An immutable Color instance initialized to CSS color #FFEFD5
 * <span class="colorSwath" style="background: #FFEFD5;"></span>
 */
Color.PAPAYAWHIP = Object.freeze(Color.fromCssColorString("#FFEFD5")!);

/**
 * An immutable Color instance initialized to CSS color #FFDAB9
 * <span class="colorSwath" style="background: #FFDAB9;"></span>
 */
Color.PEACHPUFF = Object.freeze(Color.fromCssColorString("#FFDAB9")!);

/**
 * An immutable Color instance initialized to CSS color #CD853F
 * <span class="colorSwath" style="background: #CD853F;"></span>
 */
Color.PERU = Object.freeze(Color.fromCssColorString("#CD853F")!);

/**
 * An immutable Color instance initialized to CSS color #FFC0CB
 * <span class="colorSwath" style="background: #FFC0CB;"></span>
 */
Color.PINK = Object.freeze(Color.fromCssColorString("#FFC0CB")!);

/**
 * An immutable Color instance initialized to CSS color #DDA0DD
 * <span class="colorSwath" style="background: #DDA0DD;"></span>
 */
Color.PLUM = Object.freeze(Color.fromCssColorString("#DDA0DD")!);

/**
 * An immutable Color instance initialized to CSS color #B0E0E6
 * <span class="colorSwath" style="background: #B0E0E6;"></span>
 */
Color.POWDERBLUE = Object.freeze(Color.fromCssColorString("#B0E0E6")!);

/**
 * An immutable Color instance initialized to CSS color #800080
 * <span class="colorSwath" style="background: #800080;"></span>
 */
Color.PURPLE = Object.freeze(Color.fromCssColorString("#800080")!);

/**
 * An immutable Color instance initialized to CSS color #FF0000
 * <span class="colorSwath" style="background: #FF0000;"></span>
 */
Color.RED = Object.freeze(Color.fromCssColorString("#FF0000")!);

/**
 * An immutable Color instance initialized to CSS color #BC8F8F
 * <span class="colorSwath" style="background: #BC8F8F;"></span>
 */
Color.ROSYBROWN = Object.freeze(Color.fromCssColorString("#BC8F8F")!);

/**
 * An immutable Color instance initialized to CSS color #4169E1
 * <span class="colorSwath" style="background: #4169E1;"></span>
 */
Color.ROYALBLUE = Object.freeze(Color.fromCssColorString("#4169E1")!);

/**
 * An immutable Color instance initialized to CSS color #8B4513
 * <span class="colorSwath" style="background: #8B4513;"></span>
 */
Color.SADDLEBROWN = Object.freeze(Color.fromCssColorString("#8B4513")!);

/**
 * An immutable Color instance initialized to CSS color #FA8072
 * <span class="colorSwath" style="background: #FA8072;"></span>
 */
Color.SALMON = Object.freeze(Color.fromCssColorString("#FA8072")!);

/**
 * An immutable Color instance initialized to CSS color #F4A460
 * <span class="colorSwath" style="background: #F4A460;"></span>
 */
Color.SANDYBROWN = Object.freeze(Color.fromCssColorString("#F4A460")!);

/**
 * An immutable Color instance initialized to CSS color #2E8B57
 * <span class="colorSwath" style="background: #2E8B57;"></span>
 */
Color.SEAGREEN = Object.freeze(Color.fromCssColorString("#2E8B57")!);

/**
 * An immutable Color instance initialized to CSS color #FFF5EE
 * <span class="colorSwath" style="background: #FFF5EE;"></span>
 */
Color.SEASHELL = Object.freeze(Color.fromCssColorString("#FFF5EE")!);

/**
 * An immutable Color instance initialized to CSS color #A0522D
 * <span class="colorSwath" style="background: #A0522D;"></span>
 */
Color.SIENNA = Object.freeze(Color.fromCssColorString("#A0522D")!);

/**
 * An immutable Color instance initialized to CSS color #C0C0C0
 * <span class="colorSwath" style="background: #C0C0C0;"></span>
 */
Color.SILVER = Object.freeze(Color.fromCssColorString("#C0C0C0")!);

/**
 * An immutable Color instance initialized to CSS color #87CEEB
 * <span class="colorSwath" style="background: #87CEEB;"></span>
 */
Color.SKYBLUE = Object.freeze(Color.fromCssColorString("#87CEEB")!);

/**
 * An immutable Color instance initialized to CSS color #6A5ACD
 * <span class="colorSwath" style="background: #6A5ACD;"></span>
 */
Color.SLATEBLUE = Object.freeze(Color.fromCssColorString("#6A5ACD")!);

/**
 * An immutable Color instance initialized to CSS color #708090
 * <span class="colorSwath" style="background: #708090;"></span>
 */
Color.SLATEGRAY = Object.freeze(Color.fromCssColorString("#708090")!);

/**
 * An immutable Color instance initialized to CSS color #708090
 * <span class="colorSwath" style="background: #708090;"></span>
 */
Color.SLATEGREY = Color.SLATEGRAY;

/**
 * An immutable Color instance initialized to CSS color #FFFAFA
 * <span class="colorSwath" style="background: #FFFAFA;"></span>
 */
Color.SNOW = Object.freeze(Color.fromCssColorString("#FFFAFA")!);

/**
 * An immutable Color instance initialized to CSS color #00FF7F
 * <span class="colorSwath" style="background: #00FF7F;"></span>
 */
Color.SPRINGGREEN = Object.freeze(Color.fromCssColorString("#00FF7F")!);

/**
 * An immutable Color instance initialized to CSS color #4682B4
 * <span class="colorSwath" style="background: #4682B4;"></span>
 */
Color.STEELBLUE = Object.freeze(Color.fromCssColorString("#4682B4")!);

/**
 * An immutable Color instance initialized to CSS color #D2B48C
 * <span class="colorSwath" style="background: #D2B48C;"></span>
 */
Color.TAN = Object.freeze(Color.fromCssColorString("#D2B48C")!);

/**
 * An immutable Color instance initialized to CSS color #008080
 * <span class="colorSwath" style="background: #008080;"></span>
 */
Color.TEAL = Object.freeze(Color.fromCssColorString("#008080")!);

/**
 * An immutable Color instance initialized to CSS color #D8BFD8
 * <span class="colorSwath" style="background: #D8BFD8;"></span>
 */
Color.THISTLE = Object.freeze(Color.fromCssColorString("#D8BFD8")!);

/**
 * An immutable Color instance initialized to CSS color #FF6347
 * <span class="colorSwath" style="background: #FF6347;"></span>
 */
Color.TOMATO = Object.freeze(Color.fromCssColorString("#FF6347")!);

/**
 * An immutable Color instance initialized to CSS color #40E0D0
 * <span class="colorSwath" style="background: #40E0D0;"></span>
 */
Color.TURQUOISE = Object.freeze(Color.fromCssColorString("#40E0D0")!);

/**
 * An immutable Color instance initialized to CSS color #EE82EE
 * <span class="colorSwath" style="background: #EE82EE;"></span>
 */
Color.VIOLET = Object.freeze(Color.fromCssColorString("#EE82EE")!);

/**
 * An immutable Color instance initialized to CSS color #F5DEB3
 * <span class="colorSwath" style="background: #F5DEB3;"></span>
 */
Color.WHEAT = Object.freeze(Color.fromCssColorString("#F5DEB3")!);

/**
 * An immutable Color instance initialized to CSS color #FFFFFF
 * <span class="colorSwath" style="background: #FFFFFF;"></span>
 */
Color.WHITE = Object.freeze(Color.fromCssColorString("#FFFFFF")!);

/**
 * An immutable Color instance initialized to CSS color #F5F5F5
 * <span class="colorSwath" style="background: #F5F5F5;"></span>
 */
Color.WHITESMOKE = Object.freeze(Color.fromCssColorString("#F5F5F5")!);

/**
 * An immutable Color instance initialized to CSS color #FFFF00
 * <span class="colorSwath" style="background: #FFFF00;"></span>
 */
Color.YELLOW = Object.freeze(Color.fromCssColorString("#FFFF00")!);

/**
 * An immutable Color instance initialized to CSS color #9ACD32
 * <span class="colorSwath" style="background: #9ACD32;"></span>
 */
Color.YELLOWGREEN = Object.freeze(Color.fromCssColorString("#9ACD32")!);

/**
 * An immutable Color instance initialized to CSS transparent.
 * <span class="colorSwath" style="background: transparent;"></span>
 */
Color.TRANSPARENT = Object.freeze(new Color(0, 0, 0, 0));

export default Color;
