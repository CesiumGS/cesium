/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Defines the interface for visualizers. Visualizers are plug-ins to
     * {@link DataSourceDisplay} that render data associated with
     * {@link DataSource} instances.
     * This object is an interface for documentation purposes and is not intended
     * to be instantiated directly.
     * @alias Visualizer
     * @constructor
     *
     * @see BillboardVisualizer
     * @see LabelVisualizer
     * @see ModelVisualizer
     * @see PathVisualizer
     * @see PointVisualizer
     * @see GeometryVisualizer
     */
    var Visualizer = function() {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Updates the visualization to the provided time.
     * @function
     *
     * @param {JulianDate} time The time.
     *
     * @returns {Boolean} True if the display was updated to the provided time,
     * false if the visualizer is waiting for an asynchronous operation to
     * complete before data can be updated.
     */
    Visualizer.prototype.update = DeveloperError.throwInstantiationError;

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * @function
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    Visualizer.prototype.isDestroyed = DeveloperError.throwInstantiationError;

    /**
     * Removes all visualization and cleans up any resources associated with this instance.
     * @function
     */
    Visualizer.prototype.destroy = DeveloperError.throwInstantiationError;

    return Visualizer;
});