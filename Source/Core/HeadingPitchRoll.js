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
     * A rotation expressed as a heading, pitch, and roll. Heading is the rotation about the
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
        this.heading = defaultValue(heading, 0.0);
        this.pitch = defaultValue(pitch, 0.0);
        this.roll = defaultValue(roll, 0.0);
    };

    /**
     * Computes the heading, pitch and roll from a quaternion (see http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles )
     *
     * @param {Quaternion} quaternion The quaternion from which to retrieve heading, pitch, and roll, all expressed in radians.
     * @param {Quaternion} [result] The object in which to store the result. If not provided, a new instance is created and returned.
     * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if one was not provided.
     */
    HeadingPitchRoll.fromQuaternion = function (quaternion, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(quaternion)) {
            throw new DeveloperError('quaternion is required');
        }
        //>>includeEnd('debug');
        result = defaultValue(result, new HeadingPitchRoll());
        var test = 2 * (quaternion.w * quaternion.y - quaternion.z * quaternion.x);
        var denominatorRoll = 1 - 2 * (quaternion.x * quaternion.x + quaternion.y * quaternion.y);
        var  numeratorRoll = 2 * (quaternion.w * quaternion.x + quaternion.y * quaternion.z);
        var denominatorHeading = 1 - 2 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z);
        var numeratorHeading = 2 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y);

        result.heading = -Math.atan2(numeratorHeading, denominatorHeading);
        result.roll = Math.atan2( numeratorRoll, denominatorRoll);
        result.pitch = -Math.asin(test);

        return result;
    };

    /**
     * Returns a new HeadingPitchRoll instance from angles given in degrees.
     *
     * @param {Number} heading the heading in degrees
     * @param {Number} pitch the pitch in degrees
     * @param {Number} roll the heading in degrees
     * @param {HeadingPitchRoll} [result] The object in which to store the result. If not provided, a new instance is created and returned.
     * @returns {HeadingPitchRoll} A new HeadingPitchRoll instance
     */
    HeadingPitchRoll.fromDegrees = function (heading, pitch, roll,result) {
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

        result = defaultValue(result, new HeadingPitchRoll());
        result.heading = heading * CesiumMath.RADIANS_PER_DEGREE;
        result.pitch = pitch * CesiumMath.RADIANS_PER_DEGREE;
        result.roll = roll * CesiumMath.RADIANS_PER_DEGREE;

        return result;
    };

    return HeadingPitchRoll;
});



