/*global define*/
define(function() {
    "use strict";

    function isEqual(a, b) {
        if (typeof a !== 'undefined' && typeof a.equals !== 'undefined') {
            return a.equals(b);
        }

        return a === b;
    }

    function isEqualEpsilon(a, b, epsilon) {
        return Math.abs(a - b) <= epsilon;
    }

    function isArrayEqual(a, b, f) {
        if (a.length !== b.length) {
            return false;
        }

        if (!f) {
            f = isEqual;
        }

        var args = new Array(2).concat(Array.prototype.slice.call(arguments, 3));

        for ( var i = 0; i < a.length; i++) {
            args[0] = a[i];
            args[1] = b[i];
            if (!f.apply(null, args)) {
                return false;
            }
        }

        return true;
    }

    return function() {
        this.addMatchers({
            toEqualProperties : function(value) {
                for ( var key in value) {
                    if (value.hasOwnProperty(key)) {
                        if (this.actual[key] !== value[key]) {
                            return false;
                        }
                    }
                }

                return true;
            },

            toBeIn : function(values) {
                var actual = this.actual;

                for ( var i = 0; i < values.length; ++i) {
                    if (actual === values[i]) {
                        return true;
                    }
                }

                return false;
            },

            toBeGreaterThanOrEqualTo : function(value, epsilon) {
                return this.actual >= value;
            },

            toBeLessThanOrEqualTo : function(value, epsilon) {
                return this.actual <= value;
            },

            toEqualArray : function(expected) {
                return isArrayEqual(this.actual, expected);
            },

            toEqualEpsilon : function(expected, epsilon) {
                return isEqualEpsilon(this.actual, expected, epsilon);
            },

            toEqualArrayEpsilon : function(expected, epsilon) {
                return isArrayEqual(this.actual, expected, isEqualEpsilon, epsilon);
            },

            toBeBetween : function(lower, upper) {
                if (lower > upper) {
                    var tmp = upper;
                    upper = lower;
                    lower = tmp;
                }
                return this.actual >= lower && this.actual <= upper;
            }
        });
    };
});