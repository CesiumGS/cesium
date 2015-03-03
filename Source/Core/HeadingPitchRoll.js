/*global define*/
define([
    './defaultValue',
    './defined',
    './DeveloperError',
    './freezeObject',
    './Math',
    './defineProperties'
], function (
        defaultValue,
        defined,
        DeveloperError,
        freezeObject,
        CesiumMath,
        defineProperties) {
    "use strict";

    /**
     * heading pitch roll type. Heading is the rotation about the
     * negative z axis. Pitch is the rotation about the negative y axis. Roll is the rotation about
     * the positive x axis.
     * @alias HeadingPitchRoll
     * @constructor
     *
     * @param {Number} [heading=0.0] The heading component in radians.
     * @param {Number} [pitch=0.0] The pitch component in radians.
     * @param {Number} [roll=0.0] The roll component in radians.
     */
    var HeadingPitchRoll = function (heading, pitch, roll) {
        this._heading = 0.0;
        this._pitch = 0.0;
        this._roll = 0.0;

        this.heading = defaultValue(heading, 0.0);
        this.pitch = defaultValue(pitch, 0.0);
        this.roll = defaultValue(roll, 0.0);
    };

    defineProperties(HeadingPitchRoll.prototype, {
        /**
         * The heading component in radians.
         * @type {Number}
         * @default 0.0
         */
        heading: {
            get: function () {
                return this._heading;
            },
            set: function (value) {
                value %= (2 * CesiumMath.PI);
                this._heading = value;
            }
        },
        /**
         * The pitch component in radians. must be between -PI/2 and PI/2 strictly
         * @type {Number}
         * @default 0.0
         */
        pitch: {get: function () {
                return this._pitch;
            },
            set: function (value) {
                if ((value > -CesiumMath.PI_OVER_TWO) &&
                        (value < CesiumMath.PI_OVER_TWO)) {
                    this._pitch = value;
                }
            }
        },
        /**
         * The roll component in radians.
         * @type {Number}
         * @default 0.0
         */
        roll: {
            get: function () {
                return this._roll;
            },
            set: function (value) {
                value %= (2 * CesiumMath.PI);
                this._roll = value;
            }
        }
    });

    /**
     * Computes the heading, pitch and roll from a quaternion (see http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles )
     *
     * @param {Quaternion} quaternion The quaternion to retrieve heading,pitch and roll in radians.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if none was provided retrieving from the quaternion in parameter
     */
    HeadingPitchRoll.fromQuaternion = function (quaternion, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        //>>includeEnd('debug');
        result = defaultValue(result, new HeadingPitchRoll());
        var test = 2 * (quaternion.w * quaternion.y - quaternion.z * quaternion.x);
        var denumRoll = 1 - 2 * (quaternion.x * quaternion.x + quaternion.y * quaternion.y);
        var numRoll = 2 * (quaternion.w * quaternion.x + quaternion.y * quaternion.z);
        var denumHeading = 1 - 2 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z);
        var numHeading = 2 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y);

        result.heading = -Math.atan2(numHeading, denumHeading);
        result.roll = Math.atan2(numRoll, denumRoll);
        result.pitch = -Math.asin(test);

        return result;
    };

    /**
     * generate a HeadingPitchRoll instance from angles in degrees.
     *
     * @param {Number} heading the heading in degrees
     * @param {Number} pitch the pitch in degrees
     * @param {Number} roll the heading in degrees
     * @returns {HeadingPitchRoll} A new HeadingPitchRoll instance
     */
    HeadingPitchRoll.fromDegrees = function (heading, pitch, roll) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(heading)) {
            throw new DeveloperError('heading is required');
        }
        if (!defined(pitch)) {
            throw new DeveloperError('pitch is required');
        }
        if (!defined(roll)) {
            throw new DeveloperError('roll is required');
        }
        //>>includeEnd('debug');

        var result = new HeadingPitchRoll();
        result.heading = heading * CesiumMath.RADIANS_PER_DEGREE;
        result.pitch = pitch * CesiumMath.RADIANS_PER_DEGREE;
        result.roll = roll * CesiumMath.RADIANS_PER_DEGREE;

        return result;
    };

    return HeadingPitchRoll;
});



