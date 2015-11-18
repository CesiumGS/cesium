/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './createPropertyDescriptor',
        './Property'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        defineProperties,
        Event,
        createPropertyDescriptor,
        Property) {
    "use strict";

    var defaultRepeat = new Cartesian2(1, 1);
    var defaultAlpha = 1.0;

    /**
     * A {@link MaterialProperty} that maps to image {@link Material} uniforms.
     * @alias ImageMaterialProperty
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.image] A Property specifying the Image, URL, Canvas, or Video.
     * @param {Property} [options.repeat=new Cartesian2(1.0, 1.0)] A {@link Cartesian2} Property specifying the number of times the image repeats in each direction.
     */
    var ImageMaterialProperty = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._definitionChanged = new Event();
        this._image = undefined;
        this._imageSubscription = undefined;
        this._repeat = undefined;
        this._repeatSubscription = undefined;
        this._alpha = undefined;
        this._alphaSubscription = undefined;

        this.image = options.image;
        this.repeat = options.repeat;
        this.alpha = options.alpha;
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
         * Gets or sets the Property specifying Image, URL, Canvas, or Video to use.
         * @memberof ImageMaterialProperty.prototype
         * @type {Property}
         */
        image : createPropertyDescriptor('image'),
        /**
         * Gets or sets the {@link Cartesian2} Property specifying the number of times the image repeats in each direction.
         * @memberof ImageMaterialProperty.prototype
         * @type {Property}
         * @default new Cartesian2(1, 1)
         */
        repeat : createPropertyDescriptor('repeat'),
        /**
         * Gets or sets the Number Property specifying the desired opacity of the overall image.
         * @memberof ImageMaterialProperty.prototype
         * @type {Property}
         * @default 1.0
         */
        alpha : createPropertyDescriptor('alpha')
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
        result.alpha = Property.getValueOrDefault(this._alpha, time, defaultAlpha);

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
                Property.equals(this._alpha, other._alpha) && //
                Property.equals(this._repeat, other._repeat));
    };

    return ImageMaterialProperty;
});
