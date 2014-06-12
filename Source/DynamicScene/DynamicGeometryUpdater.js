/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Defines the interface for a dynamic geometry updater.  A DynamicGeometryUpdater
     * is responsible for handling visualization of a specific type of geometry
     * that needs to be recomputed based on simulation time.
     * This object is never used directly by client code, but is instead created by
     * {@link GeometryUpdater} implementations which contain dynamic geometry.
     *
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias DynamicGeometryUpdater
     * @constructor
     */
    var DynamicGeometryUpdater = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Updates the geometry to the specified time.
     * @memberof DynamicGeometryUpdater
     *
     * @param {JulianDate} time The current time.
     */
    DynamicGeometryUpdater.prototype.update = DeveloperError.throwInstantiationError;

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * @memberof DynamicGeometryUpdater
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    DynamicGeometryUpdater.prototype.isDestroyed = DeveloperError.throwInstantiationError;

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     * @memberof DynamicGeometryUpdater
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    DynamicGeometryUpdater.prototype.destroy = DeveloperError.throwInstantiationError;

    return DynamicGeometryUpdater;
});