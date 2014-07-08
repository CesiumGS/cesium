/*global define*/
define([
        '../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * Defines the interface for a geometry updater.  A GeometryUpdater maps
     * geometry defined as part of a {@link Entity} into {@link Geometry}
     * instances.  These instances are then visualized by {@link GeometryVisualizer}.
     *
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias GeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     *
     * @see EllipseGeometryUpdater
     * @see EllipsoidGeometryUpdater
     * @see PolygonGeometryUpdater
     * @see PolylineGeometryUpdater
     */
    var GeometryUpdater = function(entity, scene) {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(GeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof GeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof GeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            get : DeveloperError.throwInstantiationError
        }
    });

    defineProperties(GeometryUpdater.prototype, {
        /**
         * Gets the entity associated with this geometry.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Entity}
         * @readonly
         */
        entity : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets a value indicating if the geometry has a fill component.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        fillEnabled : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets a value indicating if fill visibility varies with simulation time.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantFill : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the material property used to fill the geometry.
         * @memberof GeometryUpdater.prototype
         *
         * @type {MaterialProperty}
         * @readonly
         */
        fillMaterialProperty : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets a value indicating if the geometry has an outline component.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        outlineEnabled : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets a value indicating if outline visibility varies with simulation time.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantOutline : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the {@link Color} property for the geometry outline.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Property}
         * @readonly
         */
        outlineColorProperty : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets a value indicating if the geometry is time-varying.
         * If true, all visualization is delegated to the {@link DynamicGeometryUpdater}
         * returned by GeometryUpdater#createDynamicUpdater.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isDynamic : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets a value indicating if the geometry is closed.
         * This property is only valid for static geometry.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isClosed : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets an event that is raised whenever the public properties
         * of this updater change.
         * @memberof GeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        geometryChanged : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Checks if the geometry is outlined at the provided time.
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is outlined at the provided time, false otherwise.
     */
    GeometryUpdater.prototype.isOutlineVisible = DeveloperError.throwInstantiationError;

    /**
     * Checks if the geometry is filled at the provided time.
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    GeometryUpdater.prototype.isFilled = DeveloperError.throwInstantiationError;

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     * @function
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    GeometryUpdater.prototype.createFillGeometryInstance = DeveloperError.throwInstantiationError;

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     * @function
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    GeometryUpdater.prototype.createOutlineGeometryInstance = DeveloperError.throwInstantiationError;

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * @function
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    GeometryUpdater.prototype.isDestroyed = DeveloperError.throwInstantiationError;

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     * @function
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    GeometryUpdater.prototype.destroy = DeveloperError.throwInstantiationError;

    /**
     * Creates the dynamic updater to be used when GeometryUpdater#isDynamic is true.
     * @function
     *
     * @param {PrimitiveCollection} primitives The primitive collection to use.
     * @returns {DynamicGeometryUpdater} The dynamic updater used to update the geometry each frame.
     *
     * @exception {DeveloperError} This instance does not represent dynamic geometry.
     */
    GeometryUpdater.prototype.createDynamicUpdater = DeveloperError.throwInstantiationError;

    return GeometryUpdater;
});