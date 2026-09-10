/**
 * The type of the parent geometry a snap resolved to, reported by
 * {@link IonSnapService#snap} as {@link IonSnapService.Result} <code>parentGeometryType</code>.
 * Values match the iTwin.js
 * {@link https://www.itwinjs.org/reference/core-frontend/locatingelements/hitparentgeomtype/|HitParentGeomType} enum.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
const IonSnapParentGeometryType = {
  /**
   * No parent geometry type.
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * A wire body.
   * @type {number}
   * @constant
   */
  WIRE: 1,
  /**
   * A sheet body.
   * @type {number}
   * @constant
   */
  SHEET: 2,
  /**
   * A solid body.
   * @type {number}
   * @constant
   */
  SOLID: 3,
  /**
   * A mesh.
   * @type {number}
   * @constant
   */
  MESH: 4,
  /**
   * Text.
   * @type {number}
   * @constant
   */
  TEXT: 5,
};

Object.freeze(IonSnapParentGeometryType);

export default IonSnapParentGeometryType;
