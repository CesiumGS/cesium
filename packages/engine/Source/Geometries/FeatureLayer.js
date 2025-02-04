import Intersect from "../Core/Intersect.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Visibility from "../Core/Visibility.js";
import PrimitiveCollection from "../Scene/PrimitiveCollection.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import CesiumMath from "../Core/Math";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Matrix3 from "../Core/Matrix3.js";
import FeatureLayerPrimitive from "./FeatureLayerPrimitive.js";
import Material from "../Scene/Material";
import FeatureGeometryFactory from "./FeatureGeometryFactory.js";
import VertexFormat from "../Core/VertexFormat.js";
import PrimitivePipeline from "../Scene/PrimitivePipeline.js";
import Matrix4 from "../Core/Matrix4.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import defined from "../Core/defined.js";
import Rectangle from "../Core/Rectangle.js";
import Feature from "./Feature.js";
import PolygonFeatureGeometry from "./PolygonFeatureGeometry.js";
import destroyObject from "../Core/destroyObject.js";
import Event from "../Core/Event.js";
import RectangleCollisionChecker from "../Core/RectangleCollisionChecker.js";

const scratchViewRectangle = new Rectangle();
const scratchPixelSize = new Cartesian2();
const scratchObbHalfScale = new Cartesian3();
const geometryByType = {
  Polygon: PolygonFeatureGeometry,
  MultiPolygon: PolygonFeatureGeometry,
};

class FeatureLayer {
  constructor({ name, features, rectangle, ellipsoid = Ellipsoid.default }) {
    this._name = name;

    this._primitives = new PrimitiveCollection();
    this._ellipsoid = ellipsoid;

    this._features = features ?? [];

    // TODO: Credits

    // TODO: Name or ID

    this._show = true;
    this._rectangle = rectangle;

    // TODO: Could change with height
    this._minimumHeight = 0;
    this._maximumHeight = 0;
    this._boundingVolume = undefined;

    // TODO: Does styling live here?
    this._material = Material.fromType(Material.ColorType); // TODO: Styling or expose?
    this._vertexFormat = VertexFormat.POSITION_ONLY;

    this._screenSpaceErrorMultiplier = 2;
    this._currentScreenSpaceError = Infinity;
    this._screenSpaceErrorFactor = 2;
    this._geometryIsDirty = false;

    this._viewChanged = new Event();
    this._viewReady = new Event();

    this.computeBoundingVolume();
  }

  get show() {
    return this._show;
  }
  set show(value) {
    this._show = value;
  }

  get primitives() {
    return this._primitives;
  }

  get length() {
    return this._primitives.length;
  }

  get featureCount() {
    return this._features.length;
  }

  /**
   * The event fired when the view changes such that feature geometries will be reprocessed fro the updated view.
   *
   * @type {Event}
   *
   * @example
   * layer.viewChanged.addEventListener(function() {
   *     console.log('VIEW CHANGED');
   * });
   *
   */
  get viewChanged() {
    return this._viewChanged;
  }

  /**
   * The event fired to indicate that all tiles that all feature geometries rendered at the current view are visible.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   *
   * @example
   * layer.viewReady.addEventListener(function() {
   *     console.log('READY');
   * });
   *
   */
  get viewReady() {
    return this._viewReady;
  }

  // TODO
  computeBoundingVolume() {
    if (!defined(this._rectangle)) {
      return;
    }

    this._boundingVolume = OrientedBoundingBox.fromRectangle(
      this._rectangle,
      this._minimumHeight,
      this._maximumHeight,
      this._ellipsoid,
    );

    const halfScale = Matrix3.getScale(
      this._boundingVolume.halfAxes,
      scratchObbHalfScale,
    );
    this._approximateSizeInMeters =
      2.0 * Cartesian3.maximumComponent(halfScale);
  }

  addGeoJson(json) {
    if (json.type !== "FeatureCollection") {
      return;
    }

    for (const feature of json.features) {
      this.addGeoJsonFeature(feature);
    }
  }

  addGeoJsonFeature(json) {
    if (json.type !== "Feature") {
      return;
    }

    const featureGeometryType = geometryByType[json.geometry.type];
    if (!defined(featureGeometryType)) {
      // TODO
      console.log(`Feature type ${json.geometry.type} not supported`);
      return;
    }

    const id = json.id;
    const geometry = featureGeometryType.fromGeoJsonGeometry(json.geometry);
    const feature = new Feature({
      id,
      geometry, // TODO: Multiple geometries per one feature
    });

    this.add(feature);

    return feature;
  }

  // TODO
  add(feature) {
    this._features.push(feature);

    if (!defined(this._rectangle)) {
      this._rectangle = Rectangle.clone(feature.geometry.rectangle);
    } else {
      this._rectangle = Rectangle.union(
        this._rectangle,
        feature.geometry.rectangle,
        this._rectangle,
      );
    }

    this.computeBoundingVolume();
    this._geometryIsDirty = true;

    return feature;
  }

  // TODO
  remove(feature) {
    this._geometryIsDirty = true;
  }

  /**
   * Gets the rectangle of this layer.  If this rectangle is smaller than the rectangle of the
   * {@link FeatureProvider}, only a portion of the data is shown.
   * @type {Rectangle}
   * @readonly
   */
  get rectangle() {
    return this._rectangle;
  }

  /**
   * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
   * get the draw commands needed to render this primitive.
   * <p>
   * Do not call this function directly.  This is documented just to
   * list the exceptions that may be propagated when the scene is rendered:
   * </p>
   *
   * @param {FrameState} frameState
   *
   * @exception {DeveloperError} All instance geometries must have the same primitiveType.
   * @exception {DeveloperError} Appearance and material have a uniform with the same name.
   * @exception {DeveloperError} Primitive.modelMatrix is only supported in 3D mode.
   * @exception {RuntimeError} Vertex texture fetch support is required to render primitives with per-instance attributes. The maximum number of vertex texture image units must be greater than zero.
   */
  update(frameState) {
    // TODO: Update bounding volume?

    const visibility = this.computeVisibility(frameState);
    if (visibility === Visibility.NONE) {
      return;
    }

    // If the current screenspace error changes beyond the tolerance,
    // geometry will need to be recomputed

    // TODO: Screenspace error is really this / 1, right?
    const screenSpaceError = this.computeScreenSpaceError(frameState);
    const factor =
      Math.abs(this._currentScreenSpaceError - screenSpaceError) /
      screenSpaceError;
    if (factor * this._screenSpaceErrorFactor > 1.0) {
      this._currentScreenSpaceError = screenSpaceError;
      this._geometryIsDirty = true;

      // TODO: Any parameters?
      this._viewChanged.raiseEvent();
    }

    // Queue render commands
    this._primitives.update(frameState);

    if (!this._geometryIsDirty) {
      return;
    }

    // Queue the updates after the frame is rendered to avoid flashes
    frameState.afterRender.push(() => {
      this.updateGeometry(frameState);
      this._geometryIsDirty = false;

      // TODO: Handle async event
      // TODO: Pass features or primitives?
      this._viewReady.raiseEvent();

      return true;
    });
  }

  // TODO
  computeVisibility(frameState) {
    // TODO: Other visibility checks: Occlusion, fog, etc.

    const cullingVolume = frameState.cullingVolume;
    const boundingVolume = this._boundingVolume;
    const intersection = cullingVolume.computeVisibility(boundingVolume);

    if (intersection === Intersect.INTERSECTING) {
      return Visibility.PARTIAL;
    }

    if (intersection === Intersect.INSIDE) {
      return Visibility.FULL;
    }

    return Visibility.NONE;
  }

  // TODO
  computeScreenSpaceError(frameState) {
    const { camera, context, pixelRatio } = frameState;
    const { positionWC, frustum } = camera;

    const boundingVolume = this._boundingVolume;
    const cameraPosition = positionWC;

    // TODO: Does camera height have anything to do with this?
    // TODO: Should we provide a multiplier?

    let distance = Math.sqrt(boundingVolume.distanceSquaredTo(cameraPosition));
    // Avoid divide-by-zero when viewer is inside the bounding volume.
    distance = Math.max(distance, CesiumMath.EPSILON7);

    const metersPerPixel = frustum.getPixelDimensions(
      context.drawingBufferWidth,
      context.drawingBufferHeight,
      distance,
      pixelRatio,
      scratchPixelSize,
    );
    const maxMetersPerPixel = Cartesian2.maximumComponent(metersPerPixel);

    return (
      this._approximateSizeInMeters /
      maxMetersPerPixel /
      this._screenSpaceErrorMultiplier
    );
  }

  // TODO
  updateGeometry({ mapProjection, camera }) {
    // TODO: Instead of deleting, should we update?
    // TODO: When asynchronous, don't remove until new data is ready
    this._primitives.removeAll();

    const material = this._material;
    const ellipsoid = this._ellipsoid;

    // TODO: Asynchronously create/update geometry with web workers
    // TODO: SharedArrayBuffers?
    // TODO: Worker pool? Multiple workers?

    // Create geometry for each feature

    // TODO: Only need to build the tree once when features are added/removed
    const collisionChecker = new RectangleCollisionChecker();
    for (const feature of this._features) {
      const featureGeometry = feature.geometry;

      collisionChecker.insert(feature, featureGeometry.rectangle);

      // TODO: Metadata
    }

    const cameraView = camera.computeViewRectangle(
      ellipsoid,
      scratchViewRectangle,
    );
    const featuresInView = collisionChecker.search(cameraView);

    const instances = [];
    for (const feature of featuresInView) {
      const featureGeometry = feature.geometry;

      const simplificationTolerance =
        this._approximateSizeInMeters / this._currentScreenSpaceError;
      const vertexFormat = this._vertexFormat;
      const geometry = FeatureGeometryFactory.createGeometry(featureGeometry, {
        ellipsoid,
        simplificationTolerance,
        vertexFormat,
      });

      // Geometries too small are skipped
      if (defined(geometry)) {
        instances.push(
          new GeometryInstance({
            geometry,
            id: feature.id,
          }),
        );
      }

      // TODO: Metadata
    }

    // Batch geometries by primitive type

    const { attributeLocations, geometries } =
      PrimitivePipeline.combineGeometry({
        instances,
        ellipsoid,
        projection: mapProjection,
        scene3DOnly: true,
        modelMatrix: Matrix4.IDENTITY.clone(),
      });

    if (!defined(geometries) || geometries.length === 0) {
      return;
    }

    for (const geometry of geometries) {
      const primitive = new FeatureLayerPrimitive({
        geometry,
        attributeLocations,
        material,
      });
      this._primitives.add(primitive);
    }
  }

  // TODO: Iterator?

  // TODO: Visible iterator?

  // TODO: Get intersection of available rectangle and specified rectangle

  // TODO: Caching?

  // TODO
  isDestroyed() {
    return false;
  }

  // TODO
  destroy() {
    return destroyObject(this);
  }
}

export default FeatureLayer;
