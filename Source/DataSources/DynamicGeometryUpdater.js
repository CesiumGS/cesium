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
     * @function
     *
     * @param {JulianDate} time The current time.
     */
    DynamicGeometryUpdater.prototype.update = DeveloperError.throwInstantiationError;

    /**
     * Computes a bounding sphere which encloses the visualization produced for the specified entity.
     * The bounding sphere is in the fixed frame of the scene's globe.
     * @function
     *
     * @param {Entity} entity The entity whose bounding sphere to compute.
     * @param {BoundingSphere} result The bounding sphere onto which to store the result.
     * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
     *                       BoundingSphereState.PENDING if the result is still being computed, or
     *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
     * @private
     */
    DynamicGeometryUpdater.prototype.getBoundingSphere = DeveloperError.throwInstantiationError;

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * @memberof DynamicGeometryUpdater
     * @function
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    DynamicGeometryUpdater.prototype.isDestroyed = DeveloperError.throwInstantiationError;

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     * @memberof DynamicGeometryUpdater
     * @function
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    DynamicGeometryUpdater.prototype.destroy = DeveloperError.throwInstantiationError;

    return DynamicGeometryUpdater;
});