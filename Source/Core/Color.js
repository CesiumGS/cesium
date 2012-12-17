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
     * Creates a Color instance from a HSL values.
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
    Color.fromHSL = function(hue, saturation, lightness, alpha) {
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
     * @param {String} color The CSS color value.
     * @param {Color} [defaultColor=Color.WHITE] The default color.
     * @param {Boolean} [throwIfUnsupported=false] Whether unsuported values
     *     should return the default value or throw
     *
     * @return {Color} The color object.
     *
     * @exception {DeveloperError} unsupported CSS color value.
     * @see <a href="http://www.w3.org/TR/css3-color">CSS color values</a>
     */
    Color.fromCSSColor = function(color, defaultColor, throwIfUnsupported) {
        if(typeof color === 'undefined') {
            throw new DeveloperError('color is required');
        }

        color = color.replace(/\s/g, '');
        defaultColor = defaultValue(defaultColor, Color.WHITE);
        throwIfUnsupported = defaultValue(throwIfUnsupported, false);

        var matches;

        if (null !== (matches = /^#([0-9a-z])([0-9a-z])([0-9a-z])$/i.exec(color))) {
            return new Color(
                parseInt(matches[1], 16) / 15.0,
                parseInt(matches[2], 16) / 15.0,
                parseInt(matches[3], 16) / 15.0
            );
        }

        if (null !== (matches = /^#([0-9a-z]{2})([0-9a-z]{2})([0-9a-z]{2})$/i.exec(color))) {
            return new Color(
                parseInt(matches[1], 16) / 255.0,
                parseInt(matches[2], 16) / 255.0,
                parseInt(matches[3], 16) / 255.0
            );
        }

        if (Color.NAMED_COLORS.hasOwnProperty(color.toLowerCase())) {
            return Color.fromCSSColor(Color.NAMED_COLORS[color.toLowerCase()]);
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
    Color.prototype.toCSSColor = function() {
        var r = Color.floatToByte(this.red);
        var g = Color.floatToByte(this.green);
        var b = Color.floatToByte(this.blue);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    /**
     * An immutable Color instance initialized to white, RGBA (1.0, 1.0, 1.0, 1.0).
     * @memberof Color
     */
    Color.WHITE = freezeObject(new Color(1.0, 1.0, 1.0, 1.0));

    /**
     * An immutable Color instance initialized to black, RGBA (0.0, 0.0, 0.0, 1.0).
     * @memberof Color
     */
    Color.BLACK = freezeObject(new Color(0.0, 0.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to red, RGBA (1.0, 0.0, 0.0, 1.0).
     * @memberof Color
     */
    Color.RED = freezeObject(new Color(1.0, 0.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to green, RGBA (0.0, 1.0, 0.0, 1.0).
     * @memberof Color
     */
    Color.GREEN = freezeObject(new Color(0.0, 1.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to blue, RGBA (0.0, 0.0, 1.0, 1.0).
     * @memberof Color
     */
    Color.BLUE = freezeObject(new Color(0.0, 0.0, 1.0, 1.0));

    /**
     * An immutable Color instance initialized to yellow, RGBA (1.0, 1.0, 0.0, 1.0).
     * @memberof Color
     */
    Color.YELLOW = freezeObject(new Color(1.0, 1.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to magenta, RGBA (1.0, 0.0, 1.0, 1.0).
     * @memberof Color
     */
    Color.MAGENTA = freezeObject(new Color(1.0, 0.0, 1.0, 1.0));

    /**
     * An immutable Color instance initialized to cyan, RGBA (0.0, 1.0, 1.0, 1.0).
     * @memberof Color
     */
    Color.CYAN = freezeObject(new Color(0.0, 1.0, 1.0, 1.0));

    /**
     * An immutable named colors map
     * @memberof Color
     *
     * @see <a href="http://www.w3.org/TR/css3-color/#svg-color">CSS color values</a>
     */
    Color.NAMED_COLORS = freezeObject({
        'aliceblue': '#F0F8FF',
        'antiquewhite': '#FAEBD7',
        'aqua': '#00FFFF',
        'aquamarine': '#7FFFD4',
        'azure': '#F0FFFF',
        'beige': '#F5F5DC',
        'bisque': '#FFE4C4',
        'black': '#000000',
        'blanchedalmond': '#FFEBCD',
        'blue': '#0000FF',
        'blueviolet': '#8A2BE2',
        'brown': '#A52A2A',
        'burlywood': '#DEB887',
        'cadetblue': '#5F9EA0',
        'chartreuse': '#7FFF00',
        'chocolate': '#D2691E',
        'coral': '#FF7F50',
        'cornflowerblue': '#6495ED',
        'cornsilk': '#FFF8DC',
        'crimson': '#DC143C',
        'cyan': '#00FFFF',
        'darkblue': '#00008B',
        'darkcyan': '#008B8B',
        'darkgoldenrod': '#B8860B',
        'darkgray': '#A9A9A9',
        'darkgreen': '#006400',
        'darkgrey': '#A9A9A9',
        'darkkhaki': '#BDB76B',
        'darkmagenta': '#8B008B',
        'darkolivegreen': '#556B2F',
        'darkorange': '#FF8C00',
        'darkorchid': '#9932CC',
        'darkred': '#8B0000',
        'darksalmon': '#E9967A',
        'darkseagreen': '#8FBC8F',
        'darkslateblue': '#483D8B',
        'darkslategray': '#2F4F4F',
        'darkslategrey': '#2F4F4F',
        'darkturquoise': '#00CED1',
        'darkviolet': '#9400D3',
        'deeppink': '#FF1493',
        'deepskyblue': '#00BFFF',
        'dimgray': '#696969',
        'dimgrey': '#696969',
        'dodgerblue': '#1E90FF',
        'firebrick': '#B22222',
        'floralwhite': '#FFFAF0',
        'forestgreen': '#228B22',
        'fuchsia': '#FF00FF',
        'gainsboro': '#DCDCDC',
        'ghostwhite': '#F8F8FF',
        'gold': '#FFD700',
        'goldenrod': '#DAA520',
        'gray': '#808080',
        'green': '#008000',
        'greenyellow': '#ADFF2F',
        'grey': '#808080',
        'honeydew': '#F0FFF0',
        'hotpink': '#FF69B4',
        'indianred': '#CD5C5C',
        'indigo': '#4B0082',
        'ivory': '#FFFFF0',
        'khaki': '#F0E68C',
        'lavender': '#E6E6FA',
        'lavenderblush': '#FFF0F5',
        'lawngreen': '#7CFC00',
        'lemonchiffon': '#FFFACD',
        'lightblue': '#ADD8E6',
        'lightcoral': '#F08080',
        'lightcyan': '#E0FFFF',
        'lightgoldenrodyellow': '#FAFAD2',
        'lightgray': '#D3D3D3',
        'lightgreen': '#90EE90',
        'lightgrey': '#D3D3D3',
        'lightpink': '#FFB6C1',
        'lightsalmon': '#FFA07A',
        'lightseagreen': '#20B2AA',
        'lightskyblue': '#87CEFA',
        'lightslategray': '#778899',
        'lightslategrey': '#778899',
        'lightsteelblue': '#B0C4DE',
        'lightyellow': '#FFFFE0',
        'lime': '#00FF00',
        'limegreen': '#32CD32',
        'linen': '#FAF0E6',
        'magenta': '#FF00FF',
        'maroon': '#800000',
        'mediumaquamarine': '#66CDAA',
        'mediumblue': '#0000CD',
        'mediumorchid': '#BA55D3',
        'mediumpurple': '#9370DB',
        'mediumseagreen': '#3CB371',
        'mediumslateblue': '#7B68EE',
        'mediumspringgreen': '#00FA9A',
        'mediumturquoise': '#48D1CC',
        'mediumvioletred': '#C71585',
        'midnightblue': '#191970',
        'mintcream': '#F5FFFA',
        'mistyrose': '#FFE4E1',
        'moccasin': '#FFE4B5',
        'navajowhite': '#FFDEAD',
        'navy': '#000080',
        'oldlace': '#FDF5E6',
        'olive': '#808000',
        'olivedrab': '#6B8E23',
        'orange': '#FFA500',
        'orangered': '#FF4500',
        'orchid': '#DA70D6',
        'palegoldenrod': '#EEE8AA',
        'palegreen': '#98FB98',
        'paleturquoise': '#AFEEEE',
        'palevioletred': '#DB7093',
        'papayawhip': '#FFEFD5',
        'peachpuff': '#FFDAB9',
        'peru': '#CD853F',
        'pink': '#FFC0CB',
        'plum': '#DDA0DD',
        'powderblue': '#B0E0E6',
        'purple': '#800080',
        'red': '#FF0000',
        'rosybrown': '#BC8F8F',
        'royalblue': '#4169E1',
        'saddlebrown': '#8B4513',
        'salmon': '#FA8072',
        'sandybrown': '#F4A460',
        'seagreen': '#2E8B57',
        'seashell': '#FFF5EE',
        'sienna': '#A0522D',
        'silver': '#C0C0C0',
        'skyblue': '#87CEEB',
        'slateblue': '#6A5ACD',
        'slategray': '#708090',
        'slategrey': '#708090',
        'snow': '#FFFAFA',
        'springgreen': '#00FF7F',
        'steelblue': '#4682B4',
        'tan': '#D2B48C',
        'teal': '#008080',
        'thistle': '#D8BFD8',
        'tomato': '#FF6347',
        'turquoise': '#40E0D0',
        'violet': '#EE82EE',
        'wheat': '#F5DEB3',
        'white': '#FFFFFF',
        'whitesmoke': '#F5F5F5',
        'yellow': '#FFFF00',
        'yellowgreen': '#9ACD32'
    });

    return Color;
});
