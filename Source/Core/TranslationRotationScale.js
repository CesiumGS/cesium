/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './defined',
        './Matrix4',
        './Quaternion'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        Matrix4,
        Quaternion) {
    'use strict';

    var defaultScale = new Cartesian3(1.0, 1.0, 1.0);
    var defaultTranslation = Cartesian3.ZERO;
    var defaultRotation = Quaternion.IDENTITY;

    /**
     * An affine transformation defined by a translation, rotation, and scale.
     * @alias TranslationRotationScale
     * @constructor
     *
     * @param {Cartesian3} [translation=Cartesian3.ZERO] A {@link Cartesian3} specifying the (x, y, z) translation to apply to the node.
     * @param {Quaternion} [rotation=Quaternion.IDENTITY] A {@link Quaternion} specifying the (x, y, z, w) rotation to apply to the node.
     * @param {Cartesian3} [scale=new Cartesian3(1.0, 1.0, 1.0)] A {@link Cartesian3} specifying the (x, y, z) scaling to apply to the node.
     */
    var TranslationRotationScale = function(translation, rotation, scale) {
        /**
         * Gets or sets the (x, y, z) translation to apply to the node.
         * @type {Cartesian3}
         * @default Cartesian3.ZERO
         */
        this.translation = Cartesian3.clone(defaultValue(translation, defaultTranslation));

        /**
         * Gets or sets the (x, y, z, w) rotation to apply to the node.
         * @type {Quaternion}
         * @default Quaternion.IDENTITY
         */
        this.rotation = Quaternion.clone(defaultValue(rotation, defaultRotation));

        /**
         * Gets or sets the (x, y, z) scaling to apply to the node.
         * @type {Cartesian3}
         * @default new Cartesian3(1.0, 1.0, 1.0)
         */
        this.scale = Cartesian3.clone(defaultValue(scale, defaultScale));
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
