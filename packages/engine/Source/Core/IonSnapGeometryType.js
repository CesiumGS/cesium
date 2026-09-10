/**
 * The type of geometry a snap resolved to, reported by {@link IonSnapService#snap}
 * as {@link IonSnapService.Result} <code>geometryType</code>. Values match the iTwin.js
 * {@link https://www.itwinjs.org/reference/core-frontend/locatingelements/hitgeomtype/|HitGeomType} enum.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
const IonSnapGeometryType = {
  /**
   * No geometry type.
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * A point.
   * @type {number}
   * @constant
   */
  POINT: 1,
  /**
   * A line segment.
   * @type {number}
   * @constant
   */
  SEGMENT: 2,
  /**
   * A curve.
   * @type {number}
   * @constant
   */
  CURVE: 3,
  /**
   * An arc.
   * @type {number}
   * @constant
   */
  ARC: 4,
  /**
   * A surface.
   * <p>
   * With {@link IonSnapMode} <code>NEAREST</code>, this value indicates
   * the snap tracked the surface under the cursor because no edge was within
   * the snap aperture. This means the snap point was not pulled to an edge.
   * Edge snaps report one of the other types along with the edge geometry in
   * {@link IonSnapService.Result} <code>curve</code>, which is absent when
   * tracking a surface.
   * </p>
   * @type {number}
   * @constant
   */
  SURFACE: 5,
};

Object.freeze(IonSnapGeometryType);

export default IonSnapGeometryType;
