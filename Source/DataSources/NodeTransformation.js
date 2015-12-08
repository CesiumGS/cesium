/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/Matrix4',
        '../Core/Quaternion'
    ], function(
        Cartesian3,
        defaultValue,
        Matrix4,
        Quaternion) {
    "use strict";

    var defaultScale = new Cartesian3(1.0, 1.0, 1.0);
    var defaultTranslation = Cartesian3.ZERO;
    var defaultRotation = Quaternion.IDENTITY;

    /**
     * A set of transformations to apply to a particular node in a {@link Model}.
     * @alias NodeTransformation
     * @constructor
     *
     * @param {Cartesian3} [scale=new Cartesian3(1.0, 1.0, 1.0)] A {@link Cartesian3} specifying the (x, y, z) scaling to apply to the node.
     * @param {Cartesian3} [translation=Cartesian3.ZERO] A {@link Cartesian3} specifying the (x, y, z) translation to apply to the node.
     * @param {Quaternion.IDENTITY} [rotation=Quaternion.IDENTITY] A {@link Quaternion} specifying the (x, y, z, w) rotation to apply to the node.
     */
    var NodeTransformation = function(scale, translation, rotation) {
        /**
         * The (x, y, z) scaling to apply to the node.
         * @type {Cartesian3}
         * @default new Cartesian3(1.0, 1.0, 1.0)
         */
        this.scale = Cartesian3.clone(defaultValue(scale, defaultScale));

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
    };

    /**
     * Combine this transformation into a single {@link Matrix4}.
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     */
    NodeTransformation.prototype.toMatrix = function(result) {
        return Matrix4.fromTranslationQuaternionRotationScale(this.translation, this.rotation, this.scale, result);
    };

    return NodeTransformation;
});
