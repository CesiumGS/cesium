import DeveloperError from "../Core/DeveloperError.js";

/**
 * Describes a geometry type that can be converted into a {@link Geometry}.
 * <p>
 * Implementations of this interface are the core geometry "description" classes
 * such as {@link BoxGeometry}, {@link RectangleGeometry},
 * {@link EllipsoidGeometry}, and other classes with a static
 * <code>createGeometry</code> function. Instances of these classes can be
 * passed to {@link GeometryInstance} and {@link Primitive} to have their
 * vertices and indices created either asynchronously on a web worker or
 * synchronously on the main thread.
 * </p>
 * <p>
 * This type describes an interface and is not intended to be instantiated
 * directly.
 * </p>
 *
 * @alias GeometryFactory
 * @constructor
 * @abstract
 *
 * @see BoxGeometry
 * @see BoxOutlineGeometry
 * @see CircleGeometry
 * @see CircleOutlineGeometry
 * @see CoplanarPolygonGeometry
 * @see CoplanarPolygonOutlineGeometry
 * @see CorridorGeometry
 * @see CorridorOutlineGeometry
 * @see CylinderGeometry
 * @see CylinderOutlineGeometry
 * @see EllipseGeometry
 * @see EllipseOutlineGeometry
 * @see EllipsoidGeometry
 * @see EllipsoidOutlineGeometry
 * @see FrustumGeometry
 * @see FrustumOutlineGeometry
 * @see GroundPolylineGeometry
 * @see PlaneGeometry
 * @see PlaneOutlineGeometry
 * @see PolygonGeometry
 * @see PolygonOutlineGeometry
 * @see PolylineGeometry
 * @see PolylineVolumeGeometry
 * @see PolylineVolumeOutlineGeometry
 * @see RectangleGeometry
 * @see RectangleOutlineGeometry
 * @see SimplePolylineGeometry
 * @see SphereGeometry
 * @see SphereOutlineGeometry
 * @see WallGeometry
 * @see WallOutlineGeometry
 */
function GeometryFactory() {
  DeveloperError.throwInstantiationError();
}

/**
 * Creates a {@link Geometry} from a geometry description.
 * <p>
 * Concrete geometry classes (for example {@link RectangleGeometry}) implement
 * this function as a static method that takes an instance of the corresponding
 * geometry description and returns the computed vertices and indices.
 * </p>
 *
 * @param {GeometryFactory} geometryFactory The geometry description to create.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
GeometryFactory.createGeometry = function (geometryFactory) {
  DeveloperError.throwInstantiationError();
};

export default GeometryFactory;
