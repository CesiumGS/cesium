define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './RuntimeError'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        RuntimeError) {
    'use strict';
    /*global TextDecoder*/

    /**
     * @private
     */
    function getStringFromTypedArray(uint8Array, byteOffset, byteLength) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(uint8Array)) {
            throw new DeveloperError('uint8Array is required.');
        }
        if (byteOffset < 0) {
            throw new DeveloperError('byteOffset cannot be negative.');
        }
        if (byteLength < 0) {
            throw new DeveloperError('byteLength cannot be negative.');
        }
        if ((byteOffset + byteLength) > uint8Array.byteLength) {
            throw new DeveloperError('sub-region exceeds array bounds.');
        }
        //>>includeEnd('debug');

        byteOffset = defaultValue(byteOffset, 0);
        byteLength = defaultValue(byteLength, uint8Array.byteLength - byteOffset);

        uint8Array = uint8Array.subarray(byteOffset, byteOffset + byteLength);

        return getStringFromTypedArray.decode(uint8Array);
    }

    // Exposed functions for testing
    getStringFromTypedArray.decodeWithTextDecoder = function(view) {
        var decoder = new TextDecoder('utf-8');
        return decoder.decode(view);
    };

    var code_point = 0;
    var bytes_seen = 0;
    var bytes_needed = 0;
    var lower_boundary = 0x80;
    var upper_boundary = 0xBF;

    getStringFromTypedArray.decodeWithFromCharCode = function(view) {
        code_point = bytes_needed = bytes_seen = 0;
        lower_boundary = 0x80;
        upper_boundary = 0xBF;

        var result = '';
        var length = view.length;
        var i, cp;
        var codePoints = [];
        for (i = 0; i < length; ++i) {
            cp = utf8Handler(view[i]);
            if (defined(cp)) {
                codePoints.push(cp);
            }
        }

        length = codePoints.length;
        for (i = 0; i < length; ++i) {
            cp = codePoints[i];
            if (cp <= 0xFFFF) {
                result += String.fromCharCode(cp);
            } else {
                cp -= 0x10000;
                result += String.fromCharCode((cp >> 10) + 0xD800,
                    (cp & 0x3FF) + 0xDC00);
            }

        }
        return result;
    };

    function inRange(a, min, max) {
        return min <= a && a <= max;
    }

    function utf8Handler(byte) {
        // If bytes_needed = 0, then we are starting a new character
        if (bytes_needed === 0) {
            // 1 Byte Ascii character
            if (inRange(byte, 0x00, 0x7F)) {
                // Return a code point whose value is byte.
                return byte;
            }

            // 2 Byte character
            else if (inRange(byte, 0xC2, 0xDF)) {
                bytes_needed = 1;

                // Set UTF-8 code point to byte & 0x1F.
                code_point = byte & 0x1F;
            }

            // 3 Byte character
            else if (inRange(byte, 0xE0, 0xEF)) {
                // If byte is 0xE0, set utf-8 lower boundary to 0xA0.
                if (byte === 0xE0) {
                    lower_boundary = 0xA0;
                }
                // If byte is 0xED, set utf-8 upper boundary to 0x9F.
                if (byte === 0xED) {
                    upper_boundary = 0x9F;
                }

                bytes_needed = 2;

                // Set UTF-8 code point to byte & 0xF.
                code_point = byte & 0xF;
            }

            // 4 Byte character
            else if (inRange(byte, 0xF0, 0xF4)) {
                // If byte is 0xF0, set utf-8 lower boundary to 0x90.
                if (byte === 0xF0) {
                    lower_boundary = 0x90;
                }
                // If byte is 0xF4, set utf-8 upper boundary to 0x8F.
                if (byte === 0xF4) {
                    upper_boundary = 0x8F;
                }

                bytes_needed = 3;

                // Set UTF-8 code point to byte & 0x7.
                code_point = byte & 0x7;
            } else {
                throw new RuntimeError('String decoding failed,');
            }

            return null;
        }

        // If byte is not in the range utf-8 lower boundary to utf-8
        // upper boundary, inclusive, run these substeps:
        if (!inRange(byte, lower_boundary, upper_boundary)) {
            throw new RuntimeError('String decoding failed,');
        }

        // Set utf-8 lower boundary to 0x80 and utf-8 upper boundary to 0xBF.
        lower_boundary = 0x80;
        upper_boundary = 0xBF;

        // 6. Set UTF-8 code point to (UTF-8 code point << 6) | (byte &
        // 0x3F)
        code_point = (code_point << 6) | (byte & 0x3F);

        // We need more bytes for this code point, so return null
        ++bytes_seen;
        if (bytes_seen !== bytes_needed) {
            return null;
        }

        var cp = code_point;
        code_point = bytes_needed = bytes_seen = 0;
        return cp;
    }

    if (typeof TextDecoder !== 'undefined') {
        getStringFromTypedArray.decode = getStringFromTypedArray.decodeWithTextDecoder;
    } else {
        getStringFromTypedArray.decode = getStringFromTypedArray.decodeWithFromCharCode;
    }

    return getStringFromTypedArray;
});
