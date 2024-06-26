import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import HeadingPitchRange from "../Core/HeadingPitchRange.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import Transforms from "../Core/Transforms.js";
import SceneMode from "../Scene/SceneMode.js";

const updateTransformMatrix3Scratch1 = new Matrix3();
const updateTransformMatrix3Scratch2 = new Matrix3();
const updateTransformMatrix3Scratch3 = new Matrix3();
const updateTransformMatrix4Scratch = new Matrix4();
const updateTransformCartesian3Scratch1 = new Cartesian3();
const updateTransformCartesian3Scratch2 = new Cartesian3();
const updateTransformCartesian3Scratch3 = new Cartesian3();
const updateTransformCartesian3Scratch4 = new Cartesian3();
const updateTransformCartesian3Scratch5 = new Cartesian3();
const updateTransformCartesian3Scratch6 = new Cartesian3();
const deltaTime = new JulianDate();
const northUpAxisFactor = 1.25; // times ellipsoid's maximum radius

function updateTransform(
  that,
  camera,
  updateLookAt,
  saveCamera,
  positionProperty,
  time,
  ellipsoid
) {
  const mode = that.scene.mode;
  let cartesian = positionProperty.getValue(time, that._lastCartesian);
  if (defined(cartesian)) {
    let hasBasis = false;
    let invertVelocity = false;
    let xBasis;
    let yBasis;
    let zBasis;

    if (mode === SceneMode.SCENE3D) {
      // The time delta was determined based on how fast satellites move compared to vehicles near the surface.
      // Slower moving vehicles will most likely default to east-north-up, while faster ones will be VVLH.
      JulianDate.addSeconds(time, 0.001, deltaTime);
      let deltaCartesian = positionProperty.getValue(
        deltaTime,
        updateTransformCartesian3Scratch1
      );

      // If no valid position at (time + 0.001), sample at (time - 0.001) and invert the vector
      if (!defined(deltaCartesian)) {
        JulianDate.addSeconds(time, -0.001, deltaTime);
        deltaCartesian = positionProperty.getValue(
          deltaTime,
          updateTransformCartesian3Scratch1
        );
        invertVelocity = true;
      }

      if (defined(deltaCartesian)) {
        let toInertial = Transforms.computeFixedToIcrfMatrix(
          time,
          updateTransformMatrix3Scratch1
        );
        let toInertialDelta = Transforms.computeFixedToIcrfMatrix(
          deltaTime,
          updateTransformMatrix3Scratch2
        );
        let toFixed;

        if (!defined(toInertial) || !defined(toInertialDelta)) {
          toFixed = Transforms.computeTemeToPseudoFixedMatrix(
            time,
            updateTransformMatrix3Scratch3
          );
          toInertial = Matrix3.transpose(
            toFixed,
            updateTransformMatrix3Scratch1
          );
          toInertialDelta = Transforms.computeTemeToPseudoFixedMatrix(
            deltaTime,
            updateTransformMatrix3Scratch2
          );
          Matrix3.transpose(toInertialDelta, toInertialDelta);
        } else {
          toFixed = Matrix3.transpose(
            toInertial,
            updateTransformMatrix3Scratch3
          );
        }

        const inertialCartesian = Matrix3.multiplyByVector(
          toInertial,
          cartesian,
          updateTransformCartesian3Scratch5
        );
        const inertialDeltaCartesian = Matrix3.multiplyByVector(
          toInertialDelta,
          deltaCartesian,
          updateTransformCartesian3Scratch6
        );

        Cartesian3.subtract(
          inertialCartesian,
          inertialDeltaCartesian,
          updateTransformCartesian3Scratch4
        );
        const inertialVelocity =
          Cartesian3.magnitude(updateTransformCartesian3Scratch4) * 1000.0; // meters/sec

        const mu = CesiumMath.GRAVITATIONALPARAMETER; // m^3 / sec^2
        const semiMajorAxis =
          -mu /
          (inertialVelocity * inertialVelocity -
            (2 * mu) / Cartesian3.magnitude(inertialCartesian));

        if (
          semiMajorAxis < 0 ||
          semiMajorAxis > northUpAxisFactor * ellipsoid.maximumRadius
        ) {
          // North-up viewing from deep space.

          // X along the nadir
          xBasis = updateTransformCartesian3Scratch2;
          Cartesian3.normalize(cartesian, xBasis);
          Cartesian3.negate(xBasis, xBasis);

          // Z is North
          zBasis = Cartesian3.clone(
            Cartesian3.UNIT_Z,
            updateTransformCartesian3Scratch3
          );

          // Y is along the cross of z and x (right handed basis / in the direction of motion)
          yBasis = Cartesian3.cross(
            zBasis,
            xBasis,
            updateTransformCartesian3Scratch1
          );
          if (Cartesian3.magnitude(yBasis) > CesiumMath.EPSILON7) {
            Cartesian3.normalize(xBasis, xBasis);
            Cartesian3.normalize(yBasis, yBasis);

            zBasis = Cartesian3.cross(
              xBasis,
              yBasis,
              updateTransformCartesian3Scratch3
            );
            Cartesian3.normalize(zBasis, zBasis);

            hasBasis = true;
          }
        } else if (
          !Cartesian3.equalsEpsilon(
            cartesian,
            deltaCartesian,
            CesiumMath.EPSILON7
          )
        ) {
          // Approximation of VVLH (Vehicle Velocity Local Horizontal) with the Z-axis flipped.

          // Z along the position
          zBasis = updateTransformCartesian3Scratch2;
          Cartesian3.normalize(inertialCartesian, zBasis);
          Cartesian3.normalize(inertialDeltaCartesian, inertialDeltaCartesian);

          // Y is along the angular momentum vector (e.g. "orbit normal")
          yBasis = Cartesian3.cross(
            zBasis,
            inertialDeltaCartesian,
            updateTransformCartesian3Scratch3
          );

          if (invertVelocity) {
            yBasis = Cartesian3.multiplyByScalar(yBasis, -1, yBasis);
          }

          if (
            !Cartesian3.equalsEpsilon(
              yBasis,
              Cartesian3.ZERO,
              CesiumMath.EPSILON7
            )
          ) {
            // X is along the cross of y and z (right handed basis / in the direction of motion)
            xBasis = Cartesian3.cross(
              yBasis,
              zBasis,
              updateTransformCartesian3Scratch1
            );

            Matrix3.multiplyByVector(toFixed, xBasis, xBasis);
            Matrix3.multiplyByVector(toFixed, yBasis, yBasis);
            Matrix3.multiplyByVector(toFixed, zBasis, zBasis);

            Cartesian3.normalize(xBasis, xBasis);
            Cartesian3.normalize(yBasis, yBasis);
            Cartesian3.normalize(zBasis, zBasis);

            hasBasis = true;
          }
        }
      }
    }

    if (defined(that.boundingSphere)) {
      cartesian = that.boundingSphere.center;
    }

    let position;
    let direction;
    let up;

    if (saveCamera) {
      position = Cartesian3.clone(
        camera.position,
        updateTransformCartesian3Scratch4
      );
      direction = Cartesian3.clone(
        camera.direction,
        updateTransformCartesian3Scratch5
      );
      up = Cartesian3.clone(camera.up, updateTransformCartesian3Scratch6);
    }

    const transform = updateTransformMatrix4Scratch;
    if (hasBasis) {
      transform[0] = xBasis.x;
      transform[1] = xBasis.y;
      transform[2] = xBasis.z;
      transform[3] = 0.0;
      transform[4] = yBasis.x;
      transform[5] = yBasis.y;
      transform[6] = yBasis.z;
      transform[7] = 0.0;
      transform[8] = zBasis.x;
      transform[9] = zBasis.y;
      transform[10] = zBasis.z;
      transform[11] = 0.0;
      transform[12] = cartesian.x;
      transform[13] = cartesian.y;
      transform[14] = cartesian.z;
      transform[15] = 0.0;
    } else {
      // Stationary or slow-moving, low-altitude objects use East-North-Up.
      Transforms.eastNorthUpToFixedFrame(cartesian, ellipsoid, transform);
    }

    camera._setTransform(transform);

    if (saveCamera) {
      Cartesian3.clone(position, camera.position);
      Cartesian3.clone(direction, camera.direction);
      Cartesian3.clone(up, camera.up);
      Cartesian3.cross(direction, up, camera.right);
    }
  }

  if (updateLookAt) {
    const offset =
      mode === SceneMode.SCENE2D ||
      Cartesian3.equals(that._offset3D, Cartesian3.ZERO)
        ? undefined
        : that._offset3D;
    camera.lookAtTransform(camera.transform, offset);
  }
}

/**
 * A utility object for tracking an entity with the camera.
 * @alias EntityView
 * @constructor
 *
 * @param {Entity} entity The entity to track with the camera.
 * @param {Scene} scene The scene to use.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid to use for orienting the camera.
 */
function EntityView(entity, scene, ellipsoid) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("entity", entity);
  Check.defined("scene", scene);
  //>>includeEnd('debug');

  /**
   * The entity to track with the camera.
   * @type {Entity}
   */
  this.entity = entity;

  /**
   * The scene in which to track the object.
   * @type {Scene}
   */
  this.scene = scene;

  /**
   * The ellipsoid to use for orienting the camera.
   * @type {Ellipsoid}
   */
  this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.default);

  /**
   * The bounding sphere of the object.
   * @type {BoundingSphere}
   */
  this.boundingSphere = undefined;

  // Shadow copies of the objects so we can detect changes.
  this._lastEntity = undefined;
  this._mode = undefined;

  this._lastCartesian = new Cartesian3();
  this._defaultOffset3D = undefined;

  this._offset3D = new Cartesian3();
}

// STATIC properties defined here, not per-instance.
Object.defineProperties(EntityView, {
  /**
   * Gets or sets a camera offset that will be used to
   * initialize subsequent EntityViews.
   * @memberof EntityView
   * @type {Cartesian3}
   */
  defaultOffset3D: {
    get: function () {
      return this._defaultOffset3D;
    },
    set: function (vector) {
      this._defaultOffset3D = Cartesian3.clone(vector, new Cartesian3());
    },
  },
});

// Initialize the static property.
EntityView.defaultOffset3D = new Cartesian3(-14000, 3500, 3500);

const scratchHeadingPitchRange = new HeadingPitchRange();
const scratchCartesian = new Cartesian3();

/**
 * Should be called each animation frame to update the camera
 * to the latest settings.
 * @param {JulianDate} time The current animation time.
 * @param {BoundingSphere} [boundingSphere] bounding sphere of the object.
 */
EntityView.prototype.update = function (time, boundingSphere) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  const scene = this.scene;
  const ellipsoid = this.ellipsoid;
  const sceneMode = scene.mode;
  if (sceneMode === SceneMode.MORPHING) {
    return;
  }

  const entity = this.entity;
  const positionProperty = entity.position;
  if (!defined(positionProperty)) {
    return;
  }
  const objectChanged = entity !== this._lastEntity;
  const sceneModeChanged = sceneMode !== this._mode;

  const camera = scene.camera;

  let updateLookAt = objectChanged || sceneModeChanged;
  let saveCamera = true;

  if (objectChanged) {
    const viewFromProperty = entity.viewFrom;
    const hasViewFrom = defined(viewFromProperty);

    if (!hasViewFrom && defined(boundingSphere)) {
      // The default HPR is not ideal for high altitude objects so
      // we scale the pitch as we get further from the earth for a more
      // downward view.
      scratchHeadingPitchRange.pitch = -CesiumMath.PI_OVER_FOUR;
      scratchHeadingPitchRange.range = 0;
      const position = positionProperty.getValue(time, scratchCartesian);
      if (defined(position)) {
        const factor =
          2 -
          1 /
            Math.max(
              1,
              Cartesian3.magnitude(position) / ellipsoid.maximumRadius
            );
        scratchHeadingPitchRange.pitch *= factor;
      }

      camera.viewBoundingSphere(boundingSphere, scratchHeadingPitchRange);
      this.boundingSphere = boundingSphere;
      updateLookAt = false;
      saveCamera = false;
    } else if (
      !hasViewFrom ||
      !defined(viewFromProperty.getValue(time, this._offset3D))
    ) {
      Cartesian3.clone(EntityView._defaultOffset3D, this._offset3D);
    }
  } else if (!sceneModeChanged && this._mode !== SceneMode.SCENE2D) {
    Cartesian3.clone(camera.position, this._offset3D);
  }

  this._lastEntity = entity;
  this._mode = sceneMode;

  updateTransform(
    this,
    camera,
    updateLookAt,
    saveCamera,
    positionProperty,
    time,
    ellipsoid
  );
};
export default EntityView;
