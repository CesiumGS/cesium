/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './createPropertyDescriptor',
        './Property'
    ], function(
        Cartesian2,
        defined,
        defineProperties,
        Event,
        createPropertyDescriptor,
        Property) {
    "use strict";

    var defaultRepeat = new Cartesian2(1, 1);

    /**
     * A {@link MaterialProperty} that maps to image {@link Material} uniforms.
     * @alias ImageMaterialProperty
     * @constructor
     */
    var ImageMaterialProperty = function() {
        this._definitionChanged = new Event();
        this._image = undefined;
        this._imageSubscription = undefined;
        this._repeat = undefined;
        this._repeatSubscription = undefined;
    };

    defineProperties(ImageMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof ImageMaterialProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._image) && Property.isConstant(this._repeat);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof ImageMaterialProperty.prototype
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
         * Gets or sets the string property which is the url of the desired image.
         * @memberof ImageMaterialProperty.prototype
         * @type {Property}
         */
        image : createPropertyDescriptor('image'),
        /**
         * Gets or sets the {@link Cartesian2} property which determines the number of times the image repeats in each direction.
         * @memberof ImageMaterialProperty.prototype
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1, 1))
         */
        repeat : createPropertyDescriptor('repeat')
    });

    /**
     * Gets the {@link Material} type at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    ImageMaterialProperty.prototype.getType = function(time) {
        return 'Image';
    };

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ImageMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }

        result.image = Property.getValueOrUndefined(this._image, time);
        result.repeat = Property.getValueOrClonedDefault(this._repeat, time, defaultRepeat, result.repeat);
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ImageMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof ImageMaterialProperty && //
                Property.equals(this._image, other._image) && //
                Property.equals(this._repeat, other._repeat));
    };

    /**
     * @private
     */
    ImageMaterialProperty.prototype._raiseDefinitionChanged = function(){
        this._definitionChanged.raiseEvent(this);
    };

    return ImageMaterialProperty;
});
