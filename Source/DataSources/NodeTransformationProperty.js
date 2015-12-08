/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        '../Core/Quaternion',
        './createPropertyDescriptor',
        './NodeTransformation',
        './Property'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        Event,
        Quaternion,
        createPropertyDescriptor,
        NodeTransformation,
        Property) {
    "use strict";

    var defaultNodeTransformation = new NodeTransformation();

    /**
     * A {@link Property} that produces {@link NodeTransformation} data.
     * @alias NodeTransformationProperty
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.scale=new Cartesian3(1.0, 1.0, 1.0)] A {@link Cartesian3} Property specifying the (x, y, z) scaling to apply to the node.
     * @param {Property} [options.translation=Cartesian3.ZERO] A {@link Cartesian3} Property specifying the (x, y, z) translation to apply to the node.
     * @param {Property} [options.rotation=Quaternion.IDENTITY] A {@link Quaternion} Property specifying the (x, y, z, w) rotation to apply to the node.
     */
    var NodeTransformationProperty = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._definitionChanged = new Event();
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._translation = undefined;
        this._translationSubscription = undefined;
        this._rotation = undefined;
        this._rotationSubscription = undefined;

        this.scale = options.scale;
        this.translation = options.translation;
        this.rotation = options.rotation;
    };

    defineProperties(NodeTransformationProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof NodeTransformationProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._scale) &&
                       Property.isConstant(this._translation) &&
                       Property.isConstant(this._rotation);
            }
        },

        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof NodeTransformationProperty.prototype
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
         * @memberof NodeTransformationProperty.prototype
         * @type {Property}
         * @default new Cartesian3(1.0, 1.0, 1.0)
         */
        scale : createPropertyDescriptor('scale'),

        /**
         * Gets or sets the {@link Cartesian3} Property specifying the (x, y, z) translation to apply to the node.
         * @memberof NodeTransformationProperty.prototype
         * @type {Property}
         * @default Cartesian3.ZERO
         */
        translation : createPropertyDescriptor('translation'),

        /**
         * Gets or sets the {@link Quaternion} Property specifying the (x, y, z, w) rotation to apply to the node.
         * @memberof NodeTransformationProperty.prototype
         * @type {Property}
         * @default Quaternion.IDENTITY
         */
        rotation : createPropertyDescriptor('rotation')
    });

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {NodeTransformation} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {NodeTransformation} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    NodeTransformationProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = new NodeTransformation();
        }

        result.scale = Property.getValueOrClonedDefault(this._scale, time, defaultNodeTransformation.scale, result.scale);
        result.translation = Property.getValueOrClonedDefault(this._translation, time, defaultNodeTransformation.translation, result.translation);
        result.rotation = Property.getValueOrClonedDefault(this._rotation, time, defaultNodeTransformation.rotation, result.rotation);
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    NodeTransformationProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof NodeTransformationProperty && //
                Property.equals(this._scale, other._scale) && //
                Property.equals(this._translation, other._translation) && //
                Property.equals(this._rotation, other._rotation));
    };

    return NodeTransformationProperty;
});
