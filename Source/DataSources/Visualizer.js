import DeveloperError from "../Core/DeveloperError.js";

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
function Visualizer() {
  DeveloperError.throwInstantiationError();
}

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
 * Computes a bounding sphere which encloses the visualization produced for the specified entity.
 * The bounding sphere is in the fixed frame of the scene's globe.
 *
 * @param {Entity} entity The entity whose bounding sphere to compute.
 * @param {BoundingSphere} result The bounding sphere onto which to store the result.
 * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
 *                       BoundingSphereState.PENDING if the result is still being computed, or
 *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
 * @private
 */
Visualizer.prototype.getBoundingSphere = DeveloperError.throwInstantiationError;

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
export default Visualizer;
