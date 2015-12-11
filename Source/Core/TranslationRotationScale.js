/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Matrix4',
        '../Core/Quaternion'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        Matrix4,
        Quaternion) {
    "use strict";

    var defaultScale = new Cartesian3(1.0, 1.0, 1.0);
    var defaultTranslation = Cartesian3.ZERO;
    var defaultRotation = Quaternion.IDENTITY;

    /**
     * A set of transformations to apply to a particular node in a {@link Model}.
     * @alias TranslationRotationScale
     * @constructor
     *
     * @param {Cartesian3} [translation=Cartesian3.ZERO] A {@link Cartesian3} specifying the (x, y, z) translation to apply to the node.
     * @param {Quaternion.IDENTITY} [rotation=Quaternion.IDENTITY] A {@link Quaternion} specifying the (x, y, z, w) rotation to apply to the node.
     * @param {Cartesian3} [scale=new Cartesian3(1.0, 1.0, 1.0)] A {@link Cartesian3} specifying the (x, y, z) scaling to apply to the node.
     */
    var TranslationRotationScale = function(translation, rotation, scale) {
        /**
         * The (x, y, z) translation to apply to the node.
         * @type {Cartesian3}
         * @default Cartesian3.ZERO
         */
        this.translation = Cartesian3.clone(defaultValue(translation, defaultTranslation));

        /**
         * The (x, y, z, w) rotation to apply to the node.
         * @type {Quaternion}
         * @default Quaternion.IDENTITY
         */
        this.rotation = Quaternion.clone(defaultValue(rotation, defaultRotation));

        /**
         * The (x, y, z) scaling to apply to the node.
         * @type {Cartesian3}
         * @default new Cartesian3(1.0, 1.0, 1.0)
         */
        this.scale = Cartesian3.clone(defaultValue(scale, defaultScale));
    };

    /**
     * Combine this transformation into a single {@link Matrix4}.
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     */
    TranslationRotationScale.prototype.toMatrix = function(result) {
        return Matrix4.fromTranslationQuaternionRotationScale(this.translation, this.rotation, this.scale, result);
    };

    /**
     * Compares this instance against the provided instance and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {TranslationRotationScale} [right] The right hand side TranslationRotationScale.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    TranslationRotationScale.prototype.equals = function(right) {
        return (this === right) ||
               (defined(right) &&
                Cartesian3.equals(this.translation, right.translation) &&
                Quaternion.equals(this.rotation, right.rotation) &&
                Cartesian3.equals(this.scale, right.scale));
    };

    return TranslationRotationScale;
});
