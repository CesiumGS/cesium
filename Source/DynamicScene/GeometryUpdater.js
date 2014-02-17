/*global define*/
define(['../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * Defines the interface for a geometry updater.  A GeometryUpdater maps
     * geometry defined as part of a {@link DynamicObject} into {@link Geometry}
     * and {@link Appearance} instances.  These instances are then visualized by
     * {@link GeometryVisualizer}.
     *
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias GeometryUpdater
     * @constructor
     *
     * @param {DynamicObject} dynamicObject The instance containing the geometry to be visualized.
     *
     * @see EllipseGeometryUpdater
     * @see EllipsoidGeometryUpdater
     * @see PolygonGeometryUpdater
     * @see PolylineGeometryUpdater
     */
    var GeometryUpdater = function(dynamicObject) {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(GeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based material geometry.
         * @memberof GeometryUpdater
         * @type {Appearance}
         */
        PerInstanceColorAppearanceType : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof GeometryUpdater
         * @type {Appearance}
         */
        MaterialAppearanceType : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        }
    });

    defineProperties(GeometryUpdater.prototype, {
        /**
         * Gets the object associated with this geometry.
         * @memberof GeometryUpdater.prototype
         * @type {DynamicObject}
         */
        dynamicObject : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets a value indicating if the geometry has a fill component.
         * @memberof GeometryUpdater.prototype
         * @type {Boolean}
         */
        fillEnabled : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets a value indicating if fill visibility varies with simulation time.
         * @memberof GeometryUpdater.prototype
         * @type {Boolean}
         */
        hasConstantFill : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets the material property used to fill the geometry.
         * @memberof GeometryUpdater.prototype
         * @type {MaterialProperty}
         */
        fillMaterialProperty : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets a value indicating if the geometry has an outline component.
         * @memberof GeometryUpdater.prototype
         * @type {Boolean}
         */
        outlineEnabled : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets a value indicating if outline visibility varies with simulation time.
         * @memberof GeometryUpdater.prototype
         * @type {Boolean}
         */
        hasConstantOutline : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets the {@link Color} property for the geometry outline.
         * @memberof GeometryUpdater.prototype
         * @type {Property}
         */
        outlineColorProperty : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets a value indicating if the geometry is time-varying.
         * If true, all visualization is delegated to the {@link DynamicGeometryUpdater}
         * returned by GeometryUpdater#createDynamicUpdater.
         *
         * @memberof GeometryUpdater.prototype
         * @type {Boolean}
         */
        isDynamic : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets a value indicating if the geometry is closed.
         * @memberof GeometryUpdater.prototype
         * @type {Boolean}
         */
        isClosed : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        },
        /**
         * Gets an event that is raised whenever the public properties
         * of this updater change.
         * @memberof GeometryUpdater.prototype
         * @type {Boolean}
         */
        geometryChanged : {
            get : function() {
                DeveloperError.throwInstantiationError();
            }
        }
    });

    /**
     * Checks if the geometry is outlined at the provided time.
     * @memberof GeometryUpdater
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is outlined at the provided time, false otherwise.
     */
    GeometryUpdater.prototype.isOutlineVisible = function(time) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Checks if the geometry is filled at the provided time.
     * @memberof GeometryUpdater
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    GeometryUpdater.prototype.isFilled = function(time) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     * @memberof GeometryUpdater
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    GeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     * @memberof GeometryUpdater
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    GeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * @memberof GeometryUpdater
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    GeometryUpdater.prototype.isDestroyed = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     * @memberof GeometryUpdater
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    GeometryUpdater.prototype.destroy = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Creates the dynamic updater to be used when GeometryUpdater#isDynamic is true.
     * @memberof GeometryUpdater
     *
     * @param {CompositePrimitive} primitives The primitive collection to use.
     * @returns {DynamicGeometryUpdater} The dynamic updater used to update the geometry each frame.
     *
     * @exception {DeveloperError} This instance does not represent dynamic geometry.
     */
    GeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        DeveloperError.throwInstantiationError();
    };

    return GeometryUpdater;
});