/*global define*/
define([
        './defaultValue',
        './freezeObject',
        './DeveloperError',
        './NamedColors'
    ], function(
        defaultValue,
        freezeObject,
        DeveloperError,
        NamedColors) {
    "use strict";

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
        red = defaultValue(red, 255.0);
        green = defaultValue(green, 255.0);
        blue = defaultValue(blue, 255.0);
        alpha = defaultValue(alpha, 255.0);
        return new Color(red / 255.0, green / 255.0, blue / 255.0, alpha / 255.0);
    };

    /**
     * Creates a Color instance from H, S, L values.
     * @memberof Color
     *
     * @param {Number} [hue=0] The hue angle 0...1
     * @param {Number} [saturation=0] The saturation value 0...1
     * @param {Number} [lightness=0] The lightness value 0...1
     * @param {Number} [alpha=1.0] The alpha component 0...1
     * @return {Color} The color object.
     *
     * @exception {DeveloperError} unsupported CSS color value.
     * @see <a href="http://www.w3.org/TR/css3-color/#hsl-color">CSS color values</a>
     */
    Color.fromHsl = function(hue, saturation, lightness, alpha) {
        hue = defaultValue(hue, 0);
        saturation = defaultValue(saturation, 0);
        lightness = defaultValue(lightness, 0);
        alpha = defaultValue(alpha, 1.0);

        var r, g, b, m1, m2;

        var hue2rgb = function(m1, m2, h) {
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
        };

        if (0 === saturation) {
            r = g = b = lightness;
        } else {
            m2 = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
            m1 = 2 * lightness - m2;
            r = hue2rgb(m1, m2, hue + 1 / 3);
            g = hue2rgb(m1, m2, hue);
            b = hue2rgb(m1, m2, hue - 1 / 3);
        }

        return new Color(r, g, b, alpha);
    };

    /**
     * Creates a Color instance from a CSS color value.
     * @memberof Color
     *
     * @param {String} color The CSS color value in #rgb, #rrggbb, rgb(), rgba(), hsl(), or hsla() format.
     * @param {Color} [defaultColor=Color.WHITE] The default color.
     * @param {Boolean} [throwIfUnsupported=false] Whether unsuported values
     *     should return the default value or throw
     *
     * @return {Color} The color object.
     *
     * @exception {DeveloperError} unsupported CSS color value.
     * @see <a href="http://www.w3.org/TR/css3-color">CSS color values</a>
     */
    Color.fromCssColorString = function(color, defaultColor, throwIfUnsupported) {
        if(typeof color === 'undefined') {
            throw new DeveloperError('color is required');
        }

        color = color.replace(/\s/g, '');
        defaultColor = defaultValue(defaultColor, new Color(1.0, 1.0, 1.0, 1.0));
        throwIfUnsupported = defaultValue(throwIfUnsupported, false);

        var matches;

        if (null !== (matches = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color))) {
            return new Color(
                parseInt(matches[1], 16) / 15.0,
                parseInt(matches[2], 16) / 15.0,
                parseInt(matches[3], 16) / 15.0
            );
        }

        if (null !== (matches = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color))) {
            return new Color(
                parseInt(matches[1], 16) / 255.0,
                parseInt(matches[2], 16) / 255.0,
                parseInt(matches[3], 16) / 255.0
            );
        }

        for (var c in NamedColors) {
            if (NamedColors[c].name === color.toLowerCase()) {
                return Color.fromCssColorString(NamedColors[c].value);
            }
        }

        if (null !== (matches = /^rgba?\(([0-9.]+%?),([0-9.]+%?),([0-9.]+%?)(?:,([0-9.]+))?\)$/i.exec(color))) {
            return new Color(
                parseFloat(matches[1], 10) / ('%' === matches[1].substr(-1) ? 100.0 : 255.0),
                parseFloat(matches[2], 10) / ('%' === matches[2].substr(-1) ? 100.0 : 255.0),
                parseFloat(matches[3], 10) / ('%' === matches[3].substr(-1) ? 100.0 : 255.0),
                parseFloat(defaultValue(matches[4], '1.0'))
            );
        }

        if (null !== (matches = /^hsla?\(([0-9.]+),([0-9.]+%),([0-9.]+%)(?:,([0-9.]+))?\)$/i.exec(color))) {
            return new Color(
                parseFloat(matches[1], 10) / 360.0,
                parseFloat(matches[2], 10) / 100.0,
                parseFloat(matches[3], 10) / 100.0,
                parseFloat(defaultValue(matches[4], '1.0'))
            );
        }

        if (throwIfUnsupported) {
            throw new DeveloperError('unsupported CSS color value: ' + color);
        }

        return defaultColor;
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
        var r = Color.floatToByte(this.red);
        var g = Color.floatToByte(this.green);
        var b = Color.floatToByte(this.blue);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    return Color;
});
