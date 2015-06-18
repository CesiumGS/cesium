/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        '../Core/Quaternion',
        './createPropertyDescriptor',
        './Property'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        Event,
        Quaternion,
        createPropertyDescriptor,
        Property) {
    "use strict";

    var defaultScale = new Cartesian3(1, 1, 1);
    var defaultTranslate = Cartesian3.ZERO;
    var defaultRotate = Quaternion.IDENTITY;

    /**
     * A {@link Property} that maps to {@link ModelTransform} animations.
     * @alias ModelTransformProperty
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.scale=new Cartesian3(1.0, 1.0, 1.0)] A {@link Cartesian3} Property specifying the (x, y, z) scaling to apply to the node.
     * @param {Property} [options.translate=Cartesian3.ZERO] A {@link Cartesian3} Property specifying the (x, y, z) translation to apply to the node.
     * @param {Property} [options.rotate=Quaternion.IDENTITY] A {@link Quaternion} Property specifying the (x, y, z, w) rotation to apply to the node.
     */
    var ModelTransformProperty = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._definitionChanged = new Event();
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._translate = undefined;
        this._translateSubscription = undefined;
        this._rotate = undefined;
        this._rotateSubscription = undefined;

        this.scale = options.scale;
        this.translate = options.translate;
        this.rotate = options.rotate;
    };

    defineProperties(ModelTransformProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof ModelTransformProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._scale) &&
                Property.isConstant(this._translate) &&
                Property.isConstant(this._rotate);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof ModelTransformProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the {@link Cartesian3} Property specifying the (x, y, z) scaling to apply to the node.
         * @memberof ModelTransformProperty.prototype
         * @type {Property}
         * @default new Cartesian3(1.0, 1.0, 1.0)
         */
        scale : createPropertyDescriptor('scale'),

        /**
         * Gets or sets the {@link Cartesian3} Property specifying the (x, y, z) translation to apply to the node.
         * @memberof ModelTransformProperty.prototype
         * @type {Property}
         * @default Cartesian3.ZERO
         */
        translate : createPropertyDescriptor('translate'),

        /**
         * Gets or sets the {@link Quaternion} Property specifying the (x, y, z, w) rotation to apply to the node.
         * @memberof ModelTransformProperty.prototype
         * @type {Property}
         * @default Quaternion.IDENTITY
         */
        rotate : createPropertyDescriptor('rotate')
    });

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ModelTransformProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }

        result.scale = Property.getValueOrClonedDefault(this._scale, time, defaultScale, result.scale);
        result.translate = Property.getValueOrClonedDefault(this._translate, time, defaultTranslate, result.translate);
        result.rotate = Property.getValueOrClonedDefault(this._rotate, time, defaultRotate, result.rotate);
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ModelTransformProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof ModelTransformProperty && //
                Property.equals(this._scale, other._scale) && //
                Property.equals(this._translate, other._translate) && //
                Property.equals(this._rotate, other._rotate));
    };

    return ModelTransformProperty;
});
