/*global define*/
define([
        './defaultValue',
        './freezeObject',
        './DeveloperError'
    ], function(
        defaultValue,
        freezeObject,
        DeveloperError) {
    "use strict";

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

    /**
     * A color, specified using red, green, blue, and alpha values,
     * which range from <code>0</code> (no intensity) to <code>1.0</code> (full intensity).
     * @param {Number} [red=1.0] The red component.
     * @param {Number} [green=1.0] The green component.
     * @param {Number} [blue=1.0] The blue component.
     * @param {Number} [alpha=1.0] The alpha component.
     *
     * @constructor
     * @alias Color
     */
    var Color = function(red, green, blue, alpha) {
        /**
         * The red component.
         */
        this.red = defaultValue(red, 1.0);
        /**
         * The green component.
         */
        this.green = defaultValue(green, 1.0);
        /**
         * The blue component.
         */
        this.blue = defaultValue(blue, 1.0);
        /**
         * The alpha component.
         */
        this.alpha = defaultValue(alpha, 1.0);
    };

    /**
     * Creates a new Color specified using red, green, blue, and alpha values
     * that are in the range of 0 to 255, converting them internally to a
     * range of 0.0 to 1.0.
     * @memberof Color
     *
     * @param {Number} [red=255] The red component.
     * @param {Number} [green=255] The green component.
     * @param {Number} [blue=255] The blue component.
     * @param {Number} [alpha=255] The alpha component.
     * @returns {Color} A new color instance.
     */
    Color.fromBytes = function(red, green, blue, alpha) {
        red = defaultValue(red, 255.0) / 255.0;
        green = defaultValue(green, 255.0) / 255.0;
        blue = defaultValue(blue, 255.0) / 255.0;
        alpha = defaultValue(alpha, 255.0) / 255.0;
        return new Color(red, green, blue, alpha);
    };

    /**
     * Creates a Color instance from hue, saturation, and lightness.
     * @memberof Color
     *
     * @param {Number} [hue=0] The hue angle 0...1
     * @param {Number} [saturation=0] The saturation value 0...1
     * @param {Number} [lightness=0] The lightness value 0...1
     * @param {Number} [alpha=1.0] The alpha component 0...1
     * @return {Color} The color object.
     *
     * @see <a href="http://www.w3.org/TR/css3-color/#hsl-color">CSS color values</a>
     */
    Color.fromHsl = function(hue, saturation, lightness, alpha) {
        hue = defaultValue(hue, 0.0) % 1.0;
        saturation = defaultValue(saturation, 0.0);
        lightness = defaultValue(lightness, 0.0);
        alpha = defaultValue(alpha, 1.0);

        var red = lightness;
        var green = lightness;
        var blue = lightness;

        if (saturation !== 0) {
            var m2;
            if (lightness < 0.5) {
                m2 = lightness * (1 + saturation);
            } else {
                m2 = lightness + saturation - lightness * saturation;
            }

            var m1 = 2.0 * lightness - m2;
            red = hue2rgb(m1, m2, hue + 1 / 3);
            green = hue2rgb(m1, m2, hue);
            blue = hue2rgb(m1, m2, hue - 1 / 3);
        }

        return new Color(red, green, blue, alpha);
    };

    //#rgb
    var rgbMatcher = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
    //#rrggbb
    var rrggbbMatcher = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
    //rgb(), rgba(), or rgb%()
    var rgbParenthesesMatcher = /^rgba?\(\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)(?:\s*,\s*([0-9.]+))?\s*\)$/i;
    //hsl(), hsla(), or hsl%()
    var hslParenthesesMatcher = /^hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+%)\s*,\s*([0-9.]+%)(?:\s*,\s*([0-9.]+))?\s*\)$/i;

    /**
     * Creates a Color instance from a CSS color value.
     * @memberof Color
     *
     * @param {String} color The CSS color value in #rgb, #rrggbb, rgb(), rgba(), hsl(), or hsla() format.
     * @return {Color} The color object, or undefined if the string was not a valid CSS color.
     *
     * @exception {DeveloperError} color is required.
     *
     * @example
     * var cesiumBlue = Color.fromCssColorString('#67ADDF');
     * var green = Color.fromCssColorString('green');
     *
     * @see <a href="http://www.w3.org/TR/css3-color">CSS color values</a>
     */
    Color.fromCssColorString = function(color) {
        if (typeof color === 'undefined') {
            throw new DeveloperError('color is required');
        }

        var namedColor = Color[color.toUpperCase()];
        if (typeof namedColor !== 'undefined') {
            return namedColor.clone();
        }

        var matches = rgbMatcher.exec(color);
        if (matches !== null) {
            return new Color(
                    parseInt(matches[1], 16) / 15.0,
                    parseInt(matches[2], 16) / 15.0,
                    parseInt(matches[3], 16) / 15.0);
        }

        matches = rrggbbMatcher.exec(color);
        if (matches !== null) {
            return new Color(
                    parseInt(matches[1], 16) / 255.0,
                    parseInt(matches[2], 16) / 255.0,
                    parseInt(matches[3], 16) / 255.0);
        }

        matches = rgbParenthesesMatcher.exec(color);
        if (matches !== null) {
            return new Color(
                    parseFloat(matches[1], 10) / ('%' === matches[1].substr(-1) ? 100.0 : 255.0),
                    parseFloat(matches[2], 10) / ('%' === matches[2].substr(-1) ? 100.0 : 255.0),
                    parseFloat(matches[3], 10) / ('%' === matches[3].substr(-1) ? 100.0 : 255.0),
                    parseFloat(defaultValue(matches[4], '1.0')));
        }

        matches = hslParenthesesMatcher.exec(color);
        if (matches !== null) {
            return Color.fromHsl(
                    parseFloat(matches[1], 10) / 360.0,
                    parseFloat(matches[2], 10) / 100.0,
                    parseFloat(matches[3], 10) / 100.0,
                    parseFloat(defaultValue(matches[4], '1.0')));
        }

        return undefined;
    };

    /**
     * Converts a 'byte' color component in the range of 0 to 255 into
     * a 'float' color component range of 0 to 1.0.
     * @memberof Color
     *
     * @param {Number} number The number to be converted.
     * @returns {number} The converted number.
     */
    Color.byteToFloat = function(number) {
        return number / 255.0;
    };

    /**
     * Converts a 'float' color component in the range of 0 to 1.0 into
     * a 'byte' color component range of 0 to 255.
     * @memberof Color
     *
     * @param {Number} number The number to be converted.
     * @returns {number} The converted number.
     */
    Color.floatToByte = function(number) {
        return number === 1.0 ? 255.0 : (number * 256.0) | 0;
    };

    /**
     * Duplicates a Color.
     * @memberof Color
     *
     * @param {Color} color The Color to duplicate.
     * @param {Color} [result] The object to store the result in, if undefined a new instance will be created.
     * @return {Color} The modified result parameter or a new instance if result was undefined.
     */
    Color.clone = function(color, result) {
        if (typeof result === 'undefined') {
            return new Color(color.red, color.green, color.blue, color.alpha);
        }
        result.red = color.red;
        result.green = color.green;
        result.blue = color.blue;
        result.alpha = color.alpha;
        return result;
    };

    /**
     * Returns true if the first Color equals the second color.
     * @memberof Color
     *
     * @param {Color} left The first Color to compare for equality.
     * @param {Color} right The second Color to compare for equality.
     * @return {Boolean} <code>true</code> if the Colors are equal; otherwise, <code>false</code>.
     */
    Color.equals = function(left, right) {
        return (left === right) ||
               (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
                left.red === right.red &&
                left.green === right.green &&
                left.blue === right.blue &&
                left.alpha === right.alpha);
    };

    /**
     * Returns a duplicate of a Color instance.
     * @memberof Color
     *
     * @param {Color} [result] The object to store the result in, if undefined a new instance will be created.
     * @return {Color} The modified result parameter or a new instance if result was undefined.
     */
    Color.prototype.clone = function(result) {
        return Color.clone(this, result);
    };

    /**
     * Returns true if this Color equals other.
     * @memberof Color
     *
     * @param {Color} other The Color to compare for equality.
     * @return {Boolean} <code>true</code> if the Colors are equal; otherwise, <code>false</code>.
     */
    Color.prototype.equals = function(other) {
        return Color.equals(this, other);
    };

    /**
     * Returns <code>true</code> if this Color equals other componentwise within the specified epsilon.
     * @memberof Color
     *
     * @param {Color} other The Color to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if the Colors are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Color.prototype.equalsEpsilon = function(other, epsilon) {
        return (this === other) ||
               ((typeof other !== 'undefined') &&
                (Math.abs(this.red - other.red) <= epsilon) &&
                (Math.abs(this.green - other.green) <= epsilon) &&
                (Math.abs(this.blue - other.blue) <= epsilon) &&
                (Math.abs(this.alpha - other.alpha) <= epsilon));
    };

    /**
     * Creates a string representing this Color in the format '(red, green, blue, alpha)'.
     * @memberof Color
     *
     * @return {String} A string representing this Color in the format '(red, green, blue, alpha)'.
     */
    Color.prototype.toString = function() {
        return '(' + this.red + ', ' + this.green + ', ' + this.blue + ', ' + this.alpha + ')';
    };

    /**
     * Creates a string containing the CSS color value for this color.
     * @memberof Color
     *
     * @return {String} The CSS equivalent of this color.
     * @see <a href="http://www.w3.org/TR/css3-color/#rgba-color">CSS RGBA color values</a>
     */
    Color.prototype.toCssColorString = function() {
        var red = Color.floatToByte(this.red);
        var green = Color.floatToByte(this.green);
        var blue = Color.floatToByte(this.blue);
        return 'rgba(' + red + ',' + green + ',' + blue + ',' + this.alpha + ')';
    };

    /**
     * An immutable Color instance initialized to CSS color #F0F8FF
     *
     * @constant
     * @type {Color}
     */
    Color.ALICEBLUE = freezeObject(Color.fromCssColorString('#F0F8FF'));

    /**
     * An immutable Color instance initialized to CSS color #FAEBD7
     *
     * @constant
     * @type {Color}
     */
    Color.ANTIQUEWHITE = freezeObject(Color.fromCssColorString('#FAEBD7'));

    /**
     * An immutable Color instance initialized to CSS color #00FFFF
     *
     * @constant
     * @type {Color}
     */
    Color.AQUA = freezeObject(Color.fromCssColorString('#00FFFF'));

    /**
     * An immutable Color instance initialized to CSS color #7FFFD4
     *
     * @constant
     * @type {Color}
     */
    Color.AQUAMARINE = freezeObject(Color.fromCssColorString('#7FFFD4'));

    /**
     * An immutable Color instance initialized to CSS color #F0FFFF
     *
     * @constant
     * @type {Color}
     */
    Color.AZURE = freezeObject(Color.fromCssColorString('#F0FFFF'));

    /**
     * An immutable Color instance initialized to CSS color #F5F5DC
     *
     * @constant
     * @type {Color}
     */
    Color.BEIGE = freezeObject(Color.fromCssColorString('#F5F5DC'));

    /**
     * An immutable Color instance initialized to CSS color #FFE4C4
     *
     * @constant
     * @type {Color}
     */
    Color.BISQUE = freezeObject(Color.fromCssColorString('#FFE4C4'));

    /**
     * An immutable Color instance initialized to CSS color #000000
     *
     * @constant
     * @type {Color}
     */
    Color.BLACK = freezeObject(Color.fromCssColorString('#000000'));

    /**
     * An immutable Color instance initialized to CSS color #FFEBCD
     *
     * @constant
     * @type {Color}
     */
    Color.BLANCHEDALMOND = freezeObject(Color.fromCssColorString('#FFEBCD'));

    /**
     * An immutable Color instance initialized to CSS color #0000FF
     *
     * @constant
     * @type {Color}
     */
    Color.BLUE = freezeObject(Color.fromCssColorString('#0000FF'));

    /**
     * An immutable Color instance initialized to CSS color #8A2BE2
     *
     * @constant
     * @type {Color}
     */
    Color.BLUEVIOLET = freezeObject(Color.fromCssColorString('#8A2BE2'));

    /**
     * An immutable Color instance initialized to CSS color #A52A2A
     *
     * @constant
     * @type {Color}
     */
    Color.BROWN = freezeObject(Color.fromCssColorString('#A52A2A'));

    /**
     * An immutable Color instance initialized to CSS color #DEB887
     *
     * @constant
     * @type {Color}
     */
    Color.BURLYWOOD = freezeObject(Color.fromCssColorString('#DEB887'));

    /**
     * An immutable Color instance initialized to CSS color #5F9EA0
     *
     * @constant
     * @type {Color}
     */
    Color.CADETBLUE = freezeObject(Color.fromCssColorString('#5F9EA0'));
    /**
     * An immutable Color instance initialized to CSS color #7FFF00
     *
     * @constant
     * @type {Color}
     */
    Color.CHARTREUSE = freezeObject(Color.fromCssColorString('#7FFF00'));

    /**
     * An immutable Color instance initialized to CSS color #D2691E
     *
     * @constant
     * @type {Color}
     */
    Color.CHOCOLATE = freezeObject(Color.fromCssColorString('#D2691E'));

    /**
     * An immutable Color instance initialized to CSS color #FF7F50
     *
     * @constant
     * @type {Color}
     */
    Color.CORAL = freezeObject(Color.fromCssColorString('#FF7F50'));

    /**
     * An immutable Color instance initialized to CSS color #6495ED
     *
     * @constant
     * @type {Color}
     */
    Color.CORNFLOWERBLUE = freezeObject(Color.fromCssColorString('#6495ED'));

    /**
     * An immutable Color instance initialized to CSS color #FFF8DC
     *
     * @constant
     * @type {Color}
     */
    Color.CORNSILK = freezeObject(Color.fromCssColorString('#FFF8DC'));

    /**
     * An immutable Color instance initialized to CSS color #DC143C
     *
     * @constant
     * @type {Color}
     */
    Color.CRIMSON = freezeObject(Color.fromCssColorString('#DC143C'));

    /**
     * An immutable Color instance initialized to CSS color #00FFFF
     *
     * @constant
     * @type {Color}
     */
    Color.CYAN = freezeObject(Color.fromCssColorString('#00FFFF'));

    /**
     * An immutable Color instance initialized to CSS color #00008B
     *
     * @constant
     * @type {Color}
     */
    Color.DARKBLUE = freezeObject(Color.fromCssColorString('#00008B'));

    /**
     * An immutable Color instance initialized to CSS color #008B8B
     *
     * @constant
     * @type {Color}
     */
    Color.DARKCYAN = freezeObject(Color.fromCssColorString('#008B8B'));

    /**
     * An immutable Color instance initialized to CSS color #B8860B
     *
     * @constant
     * @type {Color}
     */
    Color.DARKGOLDENROD = freezeObject(Color.fromCssColorString('#B8860B'));

    /**
     * An immutable Color instance initialized to CSS color #A9A9A9
     *
     * @constant
     * @type {Color}
     */
    Color.DARKGRAY = freezeObject(Color.fromCssColorString('#A9A9A9'));

    /**
     * An immutable Color instance initialized to CSS color #006400
     *
     * @constant
     * @type {Color}
     */
    Color.DARKGREEN = freezeObject(Color.fromCssColorString('#006400'));

    /**
     * An immutable Color instance initialized to CSS color #A9A9A9
     *
     * @constant
     * @type {Color}
     */
    Color.DARKGREY = Color.DARKGRAY;

    /**
     * An immutable Color instance initialized to CSS color #BDB76B
     *
     * @constant
     * @type {Color}
     */
    Color.DARKKHAKI = freezeObject(Color.fromCssColorString('#BDB76B'));

    /**
     * An immutable Color instance initialized to CSS color #8B008B
     *
     * @constant
     * @type {Color}
     */
    Color.DARKMAGENTA = freezeObject(Color.fromCssColorString('#8B008B'));

    /**
     * An immutable Color instance initialized to CSS color #556B2F
     *
     * @constant
     * @type {Color}
     */
    Color.DARKOLIVEGREEN = freezeObject(Color.fromCssColorString('#556B2F'));

    /**
     * An immutable Color instance initialized to CSS color #FF8C00
     *
     * @constant
     * @type {Color}
     */
    Color.DARKORANGE = freezeObject(Color.fromCssColorString('#FF8C00'));

    /**
     * An immutable Color instance initialized to CSS color #9932CC
     *
     * @constant
     * @type {Color}
     */
    Color.DARKORCHID = freezeObject(Color.fromCssColorString('#9932CC'));

    /**
     * An immutable Color instance initialized to CSS color #8B0000
     *
     * @constant
     * @type {Color}
     */
    Color.DARKRED = freezeObject(Color.fromCssColorString('#8B0000'));

    /**
     * An immutable Color instance initialized to CSS color #E9967A
     *
     * @constant
     * @type {Color}
     */
    Color.DARKSALMON = freezeObject(Color.fromCssColorString('#E9967A'));

    /**
     * An immutable Color instance initialized to CSS color #8FBC8F
     *
     * @constant
     * @type {Color}
     */
    Color.DARKSEAGREEN = freezeObject(Color.fromCssColorString('#8FBC8F'));

    /**
     * An immutable Color instance initialized to CSS color #483D8B
     *
     * @constant
     * @type {Color}
     */
    Color.DARKSLATEBLUE = freezeObject(Color.fromCssColorString('#483D8B'));

    /**
     * An immutable Color instance initialized to CSS color #2F4F4F
     *
     * @constant
     * @type {Color}
     */
    Color.DARKSLATEGRAY = freezeObject(Color.fromCssColorString('#2F4F4F'));

    /**
     * An immutable Color instance initialized to CSS color #2F4F4F
     *
     * @constant
     * @type {Color}
     */
    Color.DARKSLATEGREY = Color.DARKSLATEGRAY;

    /**
     * An immutable Color instance initialized to CSS color #00CED1
     *
     * @constant
     * @type {Color}
     */
    Color.DARKTURQUOISE = freezeObject(Color.fromCssColorString('#00CED1'));

    /**
     * An immutable Color instance initialized to CSS color #9400D3
     *
     * @constant
     * @type {Color}
     */
    Color.DARKVIOLET = freezeObject(Color.fromCssColorString('#9400D3'));

    /**
     * An immutable Color instance initialized to CSS color #FF1493
     *
     * @constant
     * @type {Color}
     */
    Color.DEEPPINK = freezeObject(Color.fromCssColorString('#FF1493'));

    /**
     * An immutable Color instance initialized to CSS color #00BFFF
     *
     * @constant
     * @type {Color}
     */
    Color.DEEPSKYBLUE = freezeObject(Color.fromCssColorString('#00BFFF'));

    /**
     * An immutable Color instance initialized to CSS color #696969
     *
     * @constant
     * @type {Color}
     */
    Color.DIMGRAY = freezeObject(Color.fromCssColorString('#696969'));

    /**
     * An immutable Color instance initialized to CSS color #696969
     *
     * @constant
     * @type {Color}
     */
    Color.DIMGREY = Color.DIMGRAY;

    /**
     * An immutable Color instance initialized to CSS color #1E90FF
     *
     * @constant
     * @type {Color}
     */
    Color.DODGERBLUE = freezeObject(Color.fromCssColorString('#1E90FF'));

    /**
     * An immutable Color instance initialized to CSS color #B22222
     *
     * @constant
     * @type {Color}
     */
    Color.FIREBRICK = freezeObject(Color.fromCssColorString('#B22222'));

    /**
     * An immutable Color instance initialized to CSS color #FFFAF0
     *
     * @constant
     * @type {Color}
     */
    Color.FLORALWHITE = freezeObject(Color.fromCssColorString('#FFFAF0'));

    /**
     * An immutable Color instance initialized to CSS color #228B22
     *
     * @constant
     * @type {Color}
     */
    Color.FORESTGREEN = freezeObject(Color.fromCssColorString('#228B22'));

    /**
     * An immutable Color instance initialized to CSS color #FF00FF
     *
     * @constant
     * @type {Color}
     */
    Color.FUSCHIA = freezeObject(Color.fromCssColorString('#FF00FF'));

    /**
     * An immutable Color instance initialized to CSS color #DCDCDC
     *
     * @constant
     * @type {Color}
     */
    Color.GAINSBORO = freezeObject(Color.fromCssColorString('#DCDCDC'));

    /**
     * An immutable Color instance initialized to CSS color #F8F8FF
     *
     * @constant
     * @type {Color}
     */
    Color.GHOSTWHITE = freezeObject(Color.fromCssColorString('#F8F8FF'));

    /**
     * An immutable Color instance initialized to CSS color #FFD700
     *
     * @constant
     * @type {Color}
     */
    Color.GOLD = freezeObject(Color.fromCssColorString('#FFD700'));

    /**
     * An immutable Color instance initialized to CSS color #DAA520
     *
     * @constant
     * @type {Color}
     */
    Color.GOLDENROD = freezeObject(Color.fromCssColorString('#DAA520'));

    /**
     * An immutable Color instance initialized to CSS color #808080
     *
     * @constant
     * @type {Color}
     */
    Color.GRAY = freezeObject(Color.fromCssColorString('#808080'));

    /**
     * An immutable Color instance initialized to CSS color #008000
     *
     * @constant
     * @type {Color}
     */
    Color.GREEN = freezeObject(Color.fromCssColorString('#008000'));

    /**
     * An immutable Color instance initialized to CSS color #ADFF2F
     *
     * @constant
     * @type {Color}
     */
    Color.GREENYELLOW = freezeObject(Color.fromCssColorString('#ADFF2F'));

    /**
     * An immutable Color instance initialized to CSS color #808080
     *
     * @constant
     * @type {Color}
     */
    Color.GREY = Color.GRAY;

    /**
     * An immutable Color instance initialized to CSS color #F0FFF0
     *
     * @constant
     * @type {Color}
     */
    Color.HONEYDEW = freezeObject(Color.fromCssColorString('#F0FFF0'));

    /**
     * An immutable Color instance initialized to CSS color #FF69B4
     *
     * @constant
     * @type {Color}
     */
    Color.HOTPINK = freezeObject(Color.fromCssColorString('#FF69B4'));

    /**
     * An immutable Color instance initialized to CSS color #CD5C5C
     *
     * @constant
     * @type {Color}
     */
    Color.INDIANRED = freezeObject(Color.fromCssColorString('#CD5C5C'));

    /**
     * An immutable Color instance initialized to CSS color #4B0082
     *
     * @constant
     * @type {Color}
     */
    Color.INDIGO = freezeObject(Color.fromCssColorString('#4B0082'));

    /**
     * An immutable Color instance initialized to CSS color #FFFFF0
     *
     * @constant
     * @type {Color}
     */
    Color.IVORY = freezeObject(Color.fromCssColorString('#FFFFF0'));

    /**
     * An immutable Color instance initialized to CSS color #F0E68C
     *
     * @constant
     * @type {Color}
     */
    Color.KHAKI = freezeObject(Color.fromCssColorString('#F0E68C'));

    /**
     * An immutable Color instance initialized to CSS color #E6E6FA
     *
     * @constant
     * @type {Color}
     */
    Color.LAVENDER = freezeObject(Color.fromCssColorString('#E6E6FA'));

    /**
     * An immutable Color instance initialized to CSS color #FF00FF
     *
     * @constant
     * @type {Color}
     */
    Color.LAVENDAR_BLUSH = freezeObject(Color.fromCssColorString('#FFF0F5'));

    /**
     * An immutable Color instance initialized to CSS color #FF00FF
     *
     * @constant
     * @type {Color}
     */
    Color.LAWNGREEN = freezeObject(Color.fromCssColorString('#7CFC00'));

    /**
     * An immutable Color instance initialized to CSS color #FFFACD
     *
     * @constant
     * @type {Color}
     */
    Color.LEMONCHIFFON = freezeObject(Color.fromCssColorString('#FFFACD'));

    /**
     * An immutable Color instance initialized to CSS color #ADD8E6
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTBLUE = freezeObject(Color.fromCssColorString('#ADD8E6'));

    /**
     * An immutable Color instance initialized to CSS color #F08080
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTCORAL = freezeObject(Color.fromCssColorString('#F08080'));

    /**
     * An immutable Color instance initialized to CSS color #E0FFFF
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTCYAN = freezeObject(Color.fromCssColorString('#E0FFFF'));

    /**
     * An immutable Color instance initialized to CSS color #FAFAD2
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTGOLDENRODYELLOW = freezeObject(Color.fromCssColorString('#FAFAD2'));

    /**
     * An immutable Color instance initialized to CSS color #D3D3D3
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTGRAY = freezeObject(Color.fromCssColorString('#D3D3D3'));

    /**
     * An immutable Color instance initialized to CSS color #90EE90
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTGREEN = freezeObject(Color.fromCssColorString('#90EE90'));

    /**
     * An immutable Color instance initialized to CSS color #D3D3D3
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTGREY = Color.LIGHTGRAY;

    /**
     * An immutable Color instance initialized to CSS color #FFB6C1
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTPINK = freezeObject(Color.fromCssColorString('#FFB6C1'));

    /**
     * An immutable Color instance initialized to CSS color #20B2AA
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTSEAGREEN = freezeObject(Color.fromCssColorString('#20B2AA'));

    /**
     * An immutable Color instance initialized to CSS color #87CEFA
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTSKYBLUE = freezeObject(Color.fromCssColorString('#87CEFA'));

    /**
     * An immutable Color instance initialized to CSS color #778899
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTSLATEGRAY = freezeObject(Color.fromCssColorString('#778899'));

    /**
     * An immutable Color instance initialized to CSS color #778899
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTSLATEGREY = Color.LIGHTSLATEGRAY;

    /**
     * An immutable Color instance initialized to CSS color #B0C4DE
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTSTEELBLUE = freezeObject(Color.fromCssColorString('#B0C4DE'));

    /**
     * An immutable Color instance initialized to CSS color #FFFFE0
     *
     * @constant
     * @type {Color}
     */
    Color.LIGHTYELLOW = freezeObject(Color.fromCssColorString('#FFFFE0'));

    /**
     * An immutable Color instance initialized to CSS color #00FF00
     *
     * @constant
     * @type {Color}
     */
    Color.LIME = freezeObject(Color.fromCssColorString('#00FF00'));

    /**
     * An immutable Color instance initialized to CSS color #32CD32
     *
     * @constant
     * @type {Color}
     */
    Color.LIMEGREEN = freezeObject(Color.fromCssColorString('#32CD32'));

    /**
     * An immutable Color instance initialized to CSS color #FAF0E6
     *
     * @constant
     * @type {Color}
     */
    Color.LINEN = freezeObject(Color.fromCssColorString('#FAF0E6'));

    /**
     * An immutable Color instance initialized to CSS color #FF00FF
     *
     * @constant
     * @type {Color}
     */
    Color.MAGENTA = freezeObject(Color.fromCssColorString('#FF00FF'));

    /**
     * An immutable Color instance initialized to CSS color #800000
     *
     * @constant
     * @type {Color}
     */
    Color.MAROON = freezeObject(Color.fromCssColorString('#800000'));

    /**
     * An immutable Color instance initialized to CSS color #66CDAA
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMAQUAMARINE = freezeObject(Color.fromCssColorString('#66CDAA'));

    /**
     * An immutable Color instance initialized to CSS color #0000CD
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMBLUE = freezeObject(Color.fromCssColorString('#0000CD'));

    /**
     * An immutable Color instance initialized to CSS color #BA55D3
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMORCHID = freezeObject(Color.fromCssColorString('#BA55D3'));

    /**
     * An immutable Color instance initialized to CSS color #9370DB
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMPURPLE = freezeObject(Color.fromCssColorString('#9370DB'));

    /**
     * An immutable Color instance initialized to CSS color #3CB371
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMSEAGREEN = freezeObject(Color.fromCssColorString('#3CB371'));

    /**
     * An immutable Color instance initialized to CSS color #7B68EE
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMSLATEBLUE = freezeObject(Color.fromCssColorString('#7B68EE'));

    /**
     * An immutable Color instance initialized to CSS color #00FA9A
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMSPRINGGREEN = freezeObject(Color.fromCssColorString('#00FA9A'));

    /**
     * An immutable Color instance initialized to CSS color #48D1CC
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMTURQUOISE = freezeObject(Color.fromCssColorString('#48D1CC'));

    /**
     * An immutable Color instance initialized to CSS color #C71585
     *
     * @constant
     * @type {Color}
     */
    Color.MEDIUMVIOLETRED = freezeObject(Color.fromCssColorString('#C71585'));

    /**
     * An immutable Color instance initialized to CSS color #191970
     *
     * @constant
     * @type {Color}
     */
    Color.MIDNIGHTBLUE = freezeObject(Color.fromCssColorString('#191970'));

    /**
     * An immutable Color instance initialized to CSS color #F5FFFA
     *
     * @constant
     * @type {Color}
     */
    Color.MINTCREAM = freezeObject(Color.fromCssColorString('#F5FFFA'));

    /**
     * An immutable Color instance initialized to CSS color #FFE4E1
     *
     * @constant
     * @type {Color}
     */
    Color.MISTYROSE = freezeObject(Color.fromCssColorString('#FFE4E1'));

    /**
     * An immutable Color instance initialized to CSS color #FFE4B5
     *
     * @constant
     * @type {Color}
     */
    Color.MOCCASIN = freezeObject(Color.fromCssColorString('#FFE4B5'));

    /**
     * An immutable Color instance initialized to CSS color #FFDEAD
     *
     * @constant
     * @type {Color}
     */
    Color.NAVAJOWHITE = freezeObject(Color.fromCssColorString('#FFDEAD'));

    /**
     * An immutable Color instance initialized to CSS color #000080
     *
     * @constant
     * @type {Color}
     */
    Color.NAVY = freezeObject(Color.fromCssColorString('#000080'));

    /**
     * An immutable Color instance initialized to CSS color #FDF5E6
     *
     * @constant
     * @type {Color}
     */
    Color.OLDLACE = freezeObject(Color.fromCssColorString('#FDF5E6'));

    /**
     * An immutable Color instance initialized to CSS color #808000
     *
     * @constant
     * @type {Color}
     */
    Color.OLIVE = freezeObject(Color.fromCssColorString('#808000'));

    /**
     * An immutable Color instance initialized to CSS color #6B8E23
     *
     * @constant
     * @type {Color}
     */
    Color.OLIVEDRAB = freezeObject(Color.fromCssColorString('#6B8E23'));

    /**
     * An immutable Color instance initialized to CSS color #FFA500
     *
     * @constant
     * @type {Color}
     */
    Color.ORANGE = freezeObject(Color.fromCssColorString('#FFA500'));

    /**
     * An immutable Color instance initialized to CSS color #FF4500
     *
     * @constant
     * @type {Color}
     */
    Color.ORANGERED = freezeObject(Color.fromCssColorString('#FF4500'));

    /**
     * An immutable Color instance initialized to CSS color #DA70D6
     *
     * @constant
     * @type {Color}
     */
    Color.ORCHID = freezeObject(Color.fromCssColorString('#DA70D6'));

    /**
     * An immutable Color instance initialized to CSS color #EEE8AA
     *
     * @constant
     * @type {Color}
     */
    Color.PALEGOLDENROD = freezeObject(Color.fromCssColorString('#EEE8AA'));

    /**
     * An immutable Color instance initialized to CSS color #98FB98
     *
     * @constant
     * @type {Color}
     */
    Color.PALEGREEN = freezeObject(Color.fromCssColorString('#98FB98'));

    /**
     * An immutable Color instance initialized to CSS color #AFEEEE
     *
     * @constant
     * @type {Color}
     */
    Color.PALETURQUOISE = freezeObject(Color.fromCssColorString('#AFEEEE'));

    /**
     * An immutable Color instance initialized to CSS color #DB7093
     *
     * @constant
     * @type {Color}
     */
    Color.PALEVIOLETRED = freezeObject(Color.fromCssColorString('#DB7093'));

    /**
     * An immutable Color instance initialized to CSS color #FFEFD5
     *
     * @constant
     * @type {Color}
     */
    Color.PAPAYAWHIP = freezeObject(Color.fromCssColorString('#FFEFD5'));

    /**
     * An immutable Color instance initialized to CSS color #FFDAB9
     *
     * @constant
     * @type {Color}
     */
    Color.PEACHPUFF = freezeObject(Color.fromCssColorString('#FFDAB9'));

    /**
     * An immutable Color instance initialized to CSS color #CD853F
     *
     * @constant
     * @type {Color}
     */
    Color.PERU = freezeObject(Color.fromCssColorString('#CD853F'));

    /**
     * An immutable Color instance initialized to CSS color #FFC0CB
     *
     * @constant
     * @type {Color}
     */
    Color.PINK = freezeObject(Color.fromCssColorString('#FFC0CB'));

    /**
     * An immutable Color instance initialized to CSS color #DDA0DD
     *
     * @constant
     * @type {Color}
     */
    Color.PLUM = freezeObject(Color.fromCssColorString('#DDA0DD'));

    /**
     * An immutable Color instance initialized to CSS color #B0E0E6
     *
     * @constant
     * @type {Color}
     */
    Color.POWDERBLUE = freezeObject(Color.fromCssColorString('#B0E0E6'));

    /**
     * An immutable Color instance initialized to CSS color #800080
     *
     * @constant
     * @type {Color}
     */
    Color.PURPLE = freezeObject(Color.fromCssColorString('#800080'));

    /**
     * An immutable Color instance initialized to CSS color #FF0000
     *
     * @constant
     * @type {Color}
     */
    Color.RED = freezeObject(Color.fromCssColorString('#FF0000'));

    /**
     * An immutable Color instance initialized to CSS color #BC8F8F
     *
     * @constant
     * @type {Color}
     */
    Color.ROSYBROWN = freezeObject(Color.fromCssColorString('#BC8F8F'));

    /**
     * An immutable Color instance initialized to CSS color #4169E1
     *
     * @constant
     * @type {Color}
     */
    Color.ROYALBLUE = freezeObject(Color.fromCssColorString('#4169E1'));

    /**
     * An immutable Color instance initialized to CSS color #8B4513
     *
     * @constant
     * @type {Color}
     */
    Color.SADDLEBROWN = freezeObject(Color.fromCssColorString('#8B4513'));

    /**
     * An immutable Color instance initialized to CSS color #FA8072
     *
     * @constant
     * @type {Color}
     */
    Color.SALMON = freezeObject(Color.fromCssColorString('#FA8072'));

    /**
     * An immutable Color instance initialized to CSS color #F4A460
     *
     * @constant
     * @type {Color}
     */
    Color.SANDYBROWN = freezeObject(Color.fromCssColorString('#F4A460'));

    /**
     * An immutable Color instance initialized to CSS color #2E8B57
     *
     * @constant
     * @type {Color}
     */
    Color.SEAGREEN = freezeObject(Color.fromCssColorString('#2E8B57'));

    /**
     * An immutable Color instance initialized to CSS color #FFF5EE
     *
     * @constant
     * @type {Color}
     */
    Color.SEASHELL = freezeObject(Color.fromCssColorString('#FFF5EE'));

    /**
     * An immutable Color instance initialized to CSS color #A0522D
     *
     * @constant
     * @type {Color}
     */
    Color.SIENNA = freezeObject(Color.fromCssColorString('#A0522D'));

    /**
     * An immutable Color instance initialized to CSS color #C0C0C0
     *
     * @constant
     * @type {Color}
     */
    Color.SILVER = freezeObject(Color.fromCssColorString('#C0C0C0'));

    /**
     * An immutable Color instance initialized to CSS color #87CEEB
     *
     * @constant
     * @type {Color}
     */
    Color.SKYBLUE = freezeObject(Color.fromCssColorString('#87CEEB'));

    /**
     * An immutable Color instance initialized to CSS color #6A5ACD
     *
     * @constant
     * @type {Color}
     */
    Color.SLATEBLUE = freezeObject(Color.fromCssColorString('#6A5ACD'));

    /**
     * An immutable Color instance initialized to CSS color #708090
     *
     * @constant
     * @type {Color}
     */
    Color.SLATEGRAY = freezeObject(Color.fromCssColorString('#708090'));

    /**
     * An immutable Color instance initialized to CSS color #708090
     *
     * @constant
     * @type {Color}
     */
    Color.SLATEGREY = Color.SLATEGRAY;

    /**
     * An immutable Color instance initialized to CSS color #FFFAFA
     *
     * @constant
     * @type {Color}
     */
    Color.SNOW = freezeObject(Color.fromCssColorString('#FFFAFA'));

    /**
     * An immutable Color instance initialized to CSS color #00FF7F
     *
     * @constant
     * @type {Color}
     */
    Color.SPRINGGREEN = freezeObject(Color.fromCssColorString('#00FF7F'));

    /**
     * An immutable Color instance initialized to CSS color #98FB98
     *
     * @constant
     * @type {Color}
     */
    Color.STEELBLUE = freezeObject(Color.fromCssColorString('#4682B4'));

    /**
     * An immutable Color instance initialized to CSS color #D2B48C
     *
     * @constant
     * @type {Color}
     */
    Color.TAN = freezeObject(Color.fromCssColorString('#D2B48C'));

    /**
     * An immutable Color instance initialized to CSS color #008080
     *
     * @constant
     * @type {Color}
     */
    Color.TEAL = freezeObject(Color.fromCssColorString('#008080'));

    /**
     * An immutable Color instance initialized to CSS color #D8BFD8
     *
     * @constant
     * @type {Color}
     */
    Color.THISTLE = freezeObject(Color.fromCssColorString('#D8BFD8'));

    /**
     * An immutable Color instance initialized to CSS color #FF6347
     *
     * @constant
     * @type {Color}
     */
    Color.TOMATO = freezeObject(Color.fromCssColorString('#FF6347'));

    /**
     * An immutable Color instance initialized to CSS color #40E0D0
     *
     * @constant
     * @type {Color}
     */
    Color.TURQUOISE = freezeObject(Color.fromCssColorString('#40E0D0'));

    /**
     * An immutable Color instance initialized to CSS color #EE82EE
     *
     * @constant
     * @type {Color}
     */
    Color.VIOLET = freezeObject(Color.fromCssColorString('#EE82EE'));

    /**
     * An immutable Color instance initialized to CSS color #F5DEB3
     *
     * @constant
     * @type {Color}
     */
    Color.WHEAT = freezeObject(Color.fromCssColorString('#F5DEB3'));

    /**
     * An immutable Color instance initialized to CSS color #FFFFFF
     *
     * @constant
     * @type {Color}
     */
    Color.WHITE = freezeObject(Color.fromCssColorString('#FFFFFF'));

    /**
     * An immutable Color instance initialized to CSS color #F5F5F5
     *
     * @constant
     * @type {Color}
     */
    Color.WHITESMOKE = freezeObject(Color.fromCssColorString('#F5F5F5'));

    /**
     * An immutable Color instance initialized to CSS color #FFFF00
     *
     * @constant
     * @type {Color}
     */
    Color.YELLOW = freezeObject(Color.fromCssColorString('#FFFF00'));

    /**
     * An immutable Color instance initialized to CSS color #9ACD32
     *
     * @constant
     * @type {Color}
     */
    Color.YELLOWGREEN = freezeObject(Color.fromCssColorString('#9ACD32'));

    return Color;
});
