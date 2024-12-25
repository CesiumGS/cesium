import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import EasingFunction from "../Core/EasingFunction.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import OrthographicOffCenterFrustum from "../Core/OrthographicOffCenterFrustum.js";
import PerspectiveFrustum from "../Core/PerspectiveFrustum.js";
import Ray from "../Core/Ray.js";
import ScreenSpaceEventHandler from "../Core/ScreenSpaceEventHandler.js";
import ScreenSpaceEventType from "../Core/ScreenSpaceEventType.js";
import Transforms from "../Core/Transforms.js";
import Camera from "./Camera.js";
import SceneMode from "./SceneMode.js";

/**
 * @private
 */
function SceneTransitioner(scene) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("scene", scene);
  //>>includeEnd('debug');

  this._scene = scene;
  this._currentTweens = [];
  this._morphHandler = undefined;
  this._morphCancelled = false;
  this._completeMorph = undefined;
  this._morphToOrthographic = false;
}

SceneTransitioner.prototype.completeMorph = function () {
  if (defined(this._completeMorph)) {
    this._completeMorph();
  }
};

SceneTransitioner.prototype.morphTo2D = function (duration, ellipsoid) {
  if (defined(this._completeMorph)) {
    this._completeMorph();
  }

  const scene = this._scene;
  this._previousMode = scene.mode;
  this._morphToOrthographic =
    scene.camera.frustum instanceof OrthographicFrustum;

  if (
    this._previousMode === SceneMode.SCENE2D ||
    this._previousMode === SceneMode.MORPHING
  ) {
    return;
  }
  this._scene.morphStart.raiseEvent(
    this,
    this._previousMode,
    SceneMode.SCENE2D,
    true,
  );

  scene._mode = SceneMode.MORPHING;
  scene.camera._setTransform(Matrix4.IDENTITY);

  if (this._previousMode === SceneMode.COLUMBUS_VIEW) {
    morphFromColumbusViewTo2D(this, duration);
  } else {
    morphFrom3DTo2D(this, duration, ellipsoid);
  }

  if (duration === 0.0 && defined(this._completeMorph)) {
    this._completeMorph();
  }
};

const scratchToCVPosition = new Cartesian3();
const scratchToCVDirection = new Cartesian3();
const scratchToCVUp = new Cartesian3();
const scratchToCVPosition2D = new Cartesian3();
const scratchToCVDirection2D = new Cartesian3();
const scratchToCVUp2D = new Cartesian3();
const scratchToCVSurfacePosition = new Cartesian3();
const scratchToCVCartographic = new Cartographic();
const scratchToCVToENU = new Matrix4();
const scratchToCVFrustumPerspective = new PerspectiveFrustum();
const scratchToCVFrustumOrthographic = new OrthographicFrustum();
const scratchToCVCamera = {
  position: undefined,
  direction: undefined,
  up: undefined,
  position2D: undefined,
  direction2D: undefined,
  up2D: undefined,
  frustum: undefined,
};

SceneTransitioner.prototype.morphToColumbusView = function (
  duration,
  ellipsoid,
) {
  if (defined(this._completeMorph)) {
    this._completeMorph();
  }

  const scene = this._scene;
  this._previousMode = scene.mode;

  if (
    this._previousMode === SceneMode.COLUMBUS_VIEW ||
    this._previousMode === SceneMode.MORPHING
  ) {
    return;
  }
  this._scene.morphStart.raiseEvent(
    this,
    this._previousMode,
    SceneMode.COLUMBUS_VIEW,
    true,
  );

  scene.camera._setTransform(Matrix4.IDENTITY);

  let position = scratchToCVPosition;
  const direction = scratchToCVDirection;
  const up = scratchToCVUp;

  if (duration > 0.0) {
    position.x = 0.0;
    position.y = -1.0;
    position.z = 1.0;
    position = Cartesian3.multiplyByScalar(
      Cartesian3.normalize(position, position),
      5.0 * ellipsoid.maximumRadius,
      position,
    );

    Cartesian3.negate(Cartesian3.normalize(position, direction), direction);
    Cartesian3.cross(Cartesian3.UNIT_X, direction, up);
  } else {
    const camera = scene.camera;
    if (this._previousMode === SceneMode.SCENE2D) {
      Cartesian3.clone(camera.position, position);
      position.z = camera.frustum.right - camera.frustum.left;
      Cartesian3.negate(Cartesian3.UNIT_Z, direction);
      Cartesian3.clone(Cartesian3.UNIT_Y, up);
    } else {
      Cartesian3.clone(camera.positionWC, position);
      Cartesian3.clone(camera.directionWC, direction);
      Cartesian3.clone(camera.upWC, up);

      const surfacePoint = ellipsoid.scaleToGeodeticSurface(
        position,
        scratchToCVSurfacePosition,
      );
      const toENU = Transforms.eastNorthUpToFixedFrame(
        surfacePoint,
        ellipsoid,
        scratchToCVToENU,
      );
      Matrix4.inverseTransformation(toENU, toENU);

      scene.mapProjection.project(
        ellipsoid.cartesianToCartographic(position, scratchToCVCartographic),
        position,
      );
      Matrix4.multiplyByPointAsVector(toENU, direction, direction);
      Matrix4.multiplyByPointAsVector(toENU, up, up);
    }
  }

  let frustum;
  if (this._morphToOrthographic) {
    frustum = scratchToCVFrustumOrthographic;
    frustum.width = scene.camera.frustum.right - scene.camera.frustum.left;
    frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
  } else {
    frustum = scratchToCVFrustumPerspective;
    frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
    frustum.fov = CesiumMath.toRadians(60.0);
  }

  const cameraCV = scratchToCVCamera;
  cameraCV.position = position;
  cameraCV.direction = direction;
  cameraCV.up = up;
  cameraCV.frustum = frustum;

  const complete = completeColumbusViewCallback(cameraCV);
  createMorphHandler(this, complete);

  if (this._previousMode === SceneMode.SCENE2D) {
    morphFrom2DToColumbusView(this, duration, cameraCV, complete);
  } else {
    cameraCV.position2D = Matrix4.multiplyByPoint(
      Camera.TRANSFORM_2D,
      position,
      scratchToCVPosition2D,
    );
    cameraCV.direction2D = Matrix4.multiplyByPointAsVector(
      Camera.TRANSFORM_2D,
      direction,
      scratchToCVDirection2D,
    );
    cameraCV.up2D = Matrix4.multiplyByPointAsVector(
      Camera.TRANSFORM_2D,
      up,
      scratchToCVUp2D,
    );

    scene._mode = SceneMode.MORPHING;
    morphFrom3DToColumbusView(this, duration, cameraCV, complete);
  }

  if (duration === 0.0 && defined(this._completeMorph)) {
    this._completeMorph();
  }
};

const scratchCVTo3DCamera = {
  position: new Cartesian3(),
  direction: new Cartesian3(),
  up: new Cartesian3(),
  frustum: undefined,
};
const scratch2DTo3DFrustumPersp = new PerspectiveFrustum();

SceneTransitioner.prototype.morphTo3D = function (duration, ellipsoid) {
  if (defined(this._completeMorph)) {
    this._completeMorph();
  }

  const scene = this._scene;
  this._previousMode = scene.mode;

  if (
    this._previousMode === SceneMode.SCENE3D ||
    this._previousMode === SceneMode.MORPHING
  ) {
    return;
  }
  this._scene.morphStart.raiseEvent(
    this,
    this._previousMode,
    SceneMode.SCENE3D,
    true,
  );

  scene._mode = SceneMode.MORPHING;
  scene.camera._setTransform(Matrix4.IDENTITY);

  if (this._previousMode === SceneMode.SCENE2D) {
    morphFrom2DTo3D(this, duration, ellipsoid);
  } else {
    let camera3D;
    if (duration > 0.0) {
      camera3D = scratchCVTo3DCamera;
      Cartesian3.fromDegrees(
        0.0,
        0.0,
        5.0 * ellipsoid.maximumRadius,
        ellipsoid,
        camera3D.position,
      );
      Cartesian3.negate(camera3D.position, camera3D.direction);
      Cartesian3.normalize(camera3D.direction, camera3D.direction);
      Cartesian3.clone(Cartesian3.UNIT_Z, camera3D.up);
    } else {
      camera3D = getColumbusViewTo3DCamera(this, ellipsoid);
    }

    let frustum;
    const camera = scene.camera;
    if (camera.frustum instanceof OrthographicFrustum) {
      frustum = camera.frustum.clone();
    } else {
      frustum = scratch2DTo3DFrustumPersp;
      frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      frustum.fov = CesiumMath.toRadians(60.0);
    }
    camera3D.frustum = frustum;

    const complete = complete3DCallback(camera3D);
    createMorphHandler(this, complete);

    morphFromColumbusViewTo3D(this, duration, camera3D, complete);
  }

  if (duration === 0.0 && defined(this._completeMorph)) {
    this._completeMorph();
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
SceneTransitioner.prototype.isDestroyed = function () {
  return false;
};

/**
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * transitioner = transitioner && transitioner.destroy();
 */
SceneTransitioner.prototype.destroy = function () {
  destroyMorphHandler(this);
  return destroyObject(this);
};

function createMorphHandler(transitioner, completeMorphFunction) {
  if (transitioner._scene.completeMorphOnUserInput) {
    transitioner._morphHandler = new ScreenSpaceEventHandler(
      transitioner._scene.canvas,
    );

    const completeMorph = function () {
      transitioner._morphCancelled = true;
      transitioner._scene.camera.cancelFlight();
      completeMorphFunction(transitioner);
    };
    transitioner._completeMorph = completeMorph;
    transitioner._morphHandler.setInputAction(
      completeMorph,
      ScreenSpaceEventType.LEFT_DOWN,
    );
    transitioner._morphHandler.setInputAction(
      completeMorph,
      ScreenSpaceEventType.MIDDLE_DOWN,
    );
    transitioner._morphHandler.setInputAction(
      completeMorph,
      ScreenSpaceEventType.RIGHT_DOWN,
    );
    transitioner._morphHandler.setInputAction(
      completeMorph,
      ScreenSpaceEventType.WHEEL,
    );
  }
}

function destroyMorphHandler(transitioner) {
  const tweens = transitioner._currentTweens;
  for (let i = 0; i < tweens.length; ++i) {
    tweens[i].cancelTween();
  }
  transitioner._currentTweens.length = 0;
  transitioner._morphHandler =
    transitioner._morphHandler && transitioner._morphHandler.destroy();
}

const scratchCVTo3DCartographic = new Cartographic();
const scratchCVTo3DSurfacePoint = new Cartesian3();
const scratchCVTo3DFromENU = new Matrix4();

function getColumbusViewTo3DCamera(transitioner, ellipsoid) {
  const scene = transitioner._scene;
  const camera = scene.camera;

  const camera3D = scratchCVTo3DCamera;
  const position = camera3D.position;
  const direction = camera3D.direction;
  const up = camera3D.up;

  const positionCarto = scene.mapProjection.unproject(
    camera.position,
    scratchCVTo3DCartographic,
  );
  ellipsoid.cartographicToCartesian(positionCarto, position);
  const surfacePoint = ellipsoid.scaleToGeodeticSurface(
    position,
    scratchCVTo3DSurfacePoint,
  );

  const fromENU = Transforms.eastNorthUpToFixedFrame(
    surfacePoint,
    ellipsoid,
    scratchCVTo3DFromENU,
  );

  Matrix4.multiplyByPointAsVector(fromENU, camera.direction, direction);
  Matrix4.multiplyByPointAsVector(fromENU, camera.up, up);

  return camera3D;
}

const scratchCVTo3DStartPos = new Cartesian3();
const scratchCVTo3DStartDir = new Cartesian3();
const scratchCVTo3DStartUp = new Cartesian3();
const scratchCVTo3DEndPos = new Cartesian3();
const scratchCVTo3DEndDir = new Cartesian3();
const scratchCVTo3DEndUp = new Cartesian3();

function morphFromColumbusViewTo3D(
  transitioner,
  duration,
  endCamera,
  complete,
) {
  duration *= 0.5;

  const scene = transitioner._scene;
  const camera = scene.camera;

  const startPos = Cartesian3.clone(camera.position, scratchCVTo3DStartPos);
  const startDir = Cartesian3.clone(camera.direction, scratchCVTo3DStartDir);
  const startUp = Cartesian3.clone(camera.up, scratchCVTo3DStartUp);

  const endPos = Matrix4.multiplyByPoint(
    Camera.TRANSFORM_2D_INVERSE,
    endCamera.position,
    scratchCVTo3DEndPos,
  );
  const endDir = Matrix4.multiplyByPointAsVector(
    Camera.TRANSFORM_2D_INVERSE,
    endCamera.direction,
    scratchCVTo3DEndDir,
  );
  const endUp = Matrix4.multiplyByPointAsVector(
    Camera.TRANSFORM_2D_INVERSE,
    endCamera.up,
    scratchCVTo3DEndUp,
  );

  function update(value) {
    columbusViewMorph(startPos, endPos, value.time, camera.position);
    columbusViewMorph(startDir, endDir, value.time, camera.direction);
    columbusViewMorph(startUp, endUp, value.time, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);
    Cartesian3.normalize(camera.right, camera.right);
  }

  const tween = scene.tweens.add({
    duration: duration,
    easingFunction: EasingFunction.QUARTIC_OUT,
    startObject: {
      time: 0.0,
    },
    stopObject: {
      time: 1.0,
    },
    update: update,
    complete: function () {
      addMorphTimeAnimations(transitioner, scene, 0.0, 1.0, duration, complete);
    },
  });
  transitioner._currentTweens.push(tween);
}

const scratch2DTo3DFrustumOrtho = new OrthographicFrustum();
const scratch3DToCVStartPos = new Cartesian3();
const scratch3DToCVStartDir = new Cartesian3();
const scratch3DToCVStartUp = new Cartesian3();
const scratch3DToCVEndPos = new Cartesian3();
const scratch3DToCVEndDir = new Cartesian3();
const scratch3DToCVEndUp = new Cartesian3();

function morphFrom2DTo3D(transitioner, duration, ellipsoid) {
  duration /= 3.0;

  const scene = transitioner._scene;
  const camera = scene.camera;

  let camera3D;
  if (duration > 0.0) {
    camera3D = scratchCVTo3DCamera;
    Cartesian3.fromDegrees(
      0.0,
      0.0,
      5.0 * ellipsoid.maximumRadius,
      ellipsoid,
      camera3D.position,
    );
    Cartesian3.negate(camera3D.position, camera3D.direction);
    Cartesian3.normalize(camera3D.direction, camera3D.direction);
    Cartesian3.clone(Cartesian3.UNIT_Z, camera3D.up);
  } else {
    camera.position.z = camera.frustum.right - camera.frustum.left;

    camera3D = getColumbusViewTo3DCamera(transitioner, ellipsoid);
  }

  let frustum;
  if (transitioner._morphToOrthographic) {
    frustum = scratch2DTo3DFrustumOrtho;
    frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
    frustum.width = camera.frustum.right - camera.frustum.left;
  } else {
    frustum = scratch2DTo3DFrustumPersp;
    frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
    frustum.fov = CesiumMath.toRadians(60.0);
  }

  camera3D.frustum = frustum;

  const complete = complete3DCallback(camera3D);
  createMorphHandler(transitioner, complete);

  let morph;
  if (transitioner._morphToOrthographic) {
    morph = function () {
      morphFromColumbusViewTo3D(transitioner, duration, camera3D, complete);
    };
  } else {
    morph = function () {
      morphOrthographicToPerspective(
        transitioner,
        duration,
        camera3D,
        function () {
          morphFromColumbusViewTo3D(transitioner, duration, camera3D, complete);
        },
      );
    };
  }

  if (duration > 0.0) {
    scene._mode = SceneMode.SCENE2D;
    camera.flyTo({
      duration: duration,
      destination: Cartesian3.fromDegrees(
        0.0,
        0.0,
        5.0 * ellipsoid.maximumRadius,
        ellipsoid,
        scratch3DToCVEndPos,
      ),
      complete: function () {
        scene._mode = SceneMode.MORPHING;
        morph();
      },
    });
  } else {
    morph();
  }
}

function columbusViewMorph(startPosition, endPosition, time, result) {
  // Just linear for now.
  return Cartesian3.lerp(startPosition, endPosition, time, result);
}

function morphPerspectiveToOrthographic(
  transitioner,
  duration,
  endCamera,
  updateHeight,
  complete,
) {
  const scene = transitioner._scene;
  const camera = scene.camera;

  if (camera.frustum instanceof OrthographicFrustum) {
    return;
  }

  const startFOV = camera.frustum.fov;
  const endFOV = CesiumMath.RADIANS_PER_DEGREE * 0.5;
  const d = endCamera.position.z * Math.tan(startFOV * 0.5);
  camera.frustum.far = d / Math.tan(endFOV * 0.5) + 10000000.0;

  function update(value) {
    camera.frustum.fov = CesiumMath.lerp(startFOV, endFOV, value.time);
    const height = d / Math.tan(camera.frustum.fov * 0.5);
    updateHeight(camera, height);
  }
  const tween = scene.tweens.add({
    duration: duration,
    easingFunction: EasingFunction.QUARTIC_OUT,
    startObject: {
      time: 0.0,
    },
    stopObject: {
      time: 1.0,
    },
    update: update,
    complete: function () {
      camera.frustum = endCamera.frustum.clone();
      complete(transitioner);
    },
  });
  transitioner._currentTweens.push(tween);
}

const scratchCVTo2DStartPos = new Cartesian3();
const scratchCVTo2DStartDir = new Cartesian3();
const scratchCVTo2DStartUp = new Cartesian3();
const scratchCVTo2DEndPos = new Cartesian3();
const scratchCVTo2DEndDir = new Cartesian3();
const scratchCVTo2DEndUp = new Cartesian3();
const scratchCVTo2DFrustum = new OrthographicOffCenterFrustum();
const scratchCVTo2DRay = new Ray();
const scratchCVTo2DPickPos = new Cartesian3();
const scratchCVTo2DCamera = {
  position: undefined,
  direction: undefined,
  up: undefined,
  frustum: undefined,
};

function morphFromColumbusViewTo2D(transitioner, duration) {
  duration *= 0.5;

  const scene = transitioner._scene;
  const camera = scene.camera;

  const startPos = Cartesian3.clone(camera.position, scratchCVTo2DStartPos);
  const startDir = Cartesian3.clone(camera.direction, scratchCVTo2DStartDir);
  const startUp = Cartesian3.clone(camera.up, scratchCVTo2DStartUp);

  const endDir = Cartesian3.negate(Cartesian3.UNIT_Z, scratchCVTo2DEndDir);
  const endUp = Cartesian3.clone(Cartesian3.UNIT_Y, scratchCVTo2DEndUp);

  const endPos = scratchCVTo2DEndPos;

  if (duration > 0.0) {
    Cartesian3.clone(Cartesian3.ZERO, scratchCVTo2DEndPos);
    endPos.z = 5.0 * scene.ellipsoid.maximumRadius;
  } else {
    Cartesian3.clone(startPos, scratchCVTo2DEndPos);

    const ray = scratchCVTo2DRay;
    Matrix4.multiplyByPoint(Camera.TRANSFORM_2D, startPos, ray.origin);
    Matrix4.multiplyByPointAsVector(
      Camera.TRANSFORM_2D,
      startDir,
      ray.direction,
    );

    const globe = scene.globe;
    if (defined(globe)) {
      const pickPos = globe.pickWorldCoordinates(
        ray,
        scene,
        true,
        scratchCVTo2DPickPos,
      );
      if (defined(pickPos)) {
        Matrix4.multiplyByPoint(Camera.TRANSFORM_2D_INVERSE, pickPos, endPos);
        endPos.z += Cartesian3.distance(startPos, endPos);
      }
    }
  }

  const frustum = scratchCVTo2DFrustum;
  frustum.right = endPos.z * 0.5;
  frustum.left = -frustum.right;
  frustum.top =
    frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
  frustum.bottom = -frustum.top;

  const camera2D = scratchCVTo2DCamera;
  camera2D.position = endPos;
  camera2D.direction = endDir;
  camera2D.up = endUp;
  camera2D.frustum = frustum;

  const complete = complete2DCallback(camera2D);
  createMorphHandler(transitioner, complete);

  function updateCV(value) {
    columbusViewMorph(startPos, endPos, value.time, camera.position);
    columbusViewMorph(startDir, endDir, value.time, camera.direction);
    columbusViewMorph(startUp, endUp, value.time, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);
    Cartesian3.normalize(camera.right, camera.right);
    camera._adjustOrthographicFrustum(true);
  }

  function updateHeight(camera, height) {
    camera.position.z = height;
  }

  const tween = scene.tweens.add({
    duration: duration,
    easingFunction: EasingFunction.QUARTIC_OUT,
    startObject: {
      time: 0.0,
    },
    stopObject: {
      time: 1.0,
    },
    update: updateCV,
    complete: function () {
      morphPerspectiveToOrthographic(
        transitioner,
        duration,
        camera2D,
        updateHeight,
        complete,
      );
    },
  });
  transitioner._currentTweens.push(tween);
}

const scratch3DTo2DCartographic = new Cartographic();
const scratch3DTo2DCamera = {
  position: new Cartesian3(),
  direction: new Cartesian3(),
  up: new Cartesian3(),
  position2D: new Cartesian3(),
  direction2D: new Cartesian3(),
  up2D: new Cartesian3(),
  frustum: new OrthographicOffCenterFrustum(),
};
const scratch3DTo2DEndCamera = {
  position: new Cartesian3(),
  direction: new Cartesian3(),
  up: new Cartesian3(),
  frustum: undefined,
};
const scratch3DTo2DPickPosition = new Cartesian3();
const scratch3DTo2DRay = new Ray();
const scratch3DTo2DToENU = new Matrix4();
const scratch3DTo2DSurfacePoint = new Cartesian3();

function morphFrom3DTo2D(transitioner, duration, ellipsoid) {
  duration *= 0.5;

  const scene = transitioner._scene;
  const camera = scene.camera;
  const camera2D = scratch3DTo2DCamera;

  if (duration > 0.0) {
    Cartesian3.clone(Cartesian3.ZERO, camera2D.position);
    camera2D.position.z = 5.0 * ellipsoid.maximumRadius;
    Cartesian3.negate(Cartesian3.UNIT_Z, camera2D.direction);
    Cartesian3.clone(Cartesian3.UNIT_Y, camera2D.up);
  } else {
    ellipsoid.cartesianToCartographic(
      camera.positionWC,
      scratch3DTo2DCartographic,
    );
    scene.mapProjection.project(scratch3DTo2DCartographic, camera2D.position);

    Cartesian3.negate(Cartesian3.UNIT_Z, camera2D.direction);
    Cartesian3.clone(Cartesian3.UNIT_Y, camera2D.up);

    const ray = scratch3DTo2DRay;
    Cartesian3.clone(camera2D.position2D, ray.origin);
    const rayDirection = Cartesian3.clone(camera.directionWC, ray.direction);
    const surfacePoint = ellipsoid.scaleToGeodeticSurface(
      camera.positionWC,
      scratch3DTo2DSurfacePoint,
    );
    const toENU = Transforms.eastNorthUpToFixedFrame(
      surfacePoint,
      ellipsoid,
      scratch3DTo2DToENU,
    );
    Matrix4.inverseTransformation(toENU, toENU);
    Matrix4.multiplyByPointAsVector(toENU, rayDirection, rayDirection);
    Matrix4.multiplyByPointAsVector(
      Camera.TRANSFORM_2D,
      rayDirection,
      rayDirection,
    );

    const globe = scene.globe;
    if (defined(globe)) {
      const pickedPos = globe.pickWorldCoordinates(
        ray,
        scene,
        true,
        scratch3DTo2DPickPosition,
      );
      if (defined(pickedPos)) {
        const height = Cartesian3.distance(camera2D.position2D, pickedPos);
        pickedPos.x += height;
        Cartesian3.clone(pickedPos, camera2D.position2D);
      }
    }
  }

  function updateHeight(camera, height) {
    camera.position.x = height;
  }

  Matrix4.multiplyByPoint(
    Camera.TRANSFORM_2D,
    camera2D.position,
    camera2D.position2D,
  );
  Matrix4.multiplyByPointAsVector(
    Camera.TRANSFORM_2D,
    camera2D.direction,
    camera2D.direction2D,
  );
  Matrix4.multiplyByPointAsVector(
    Camera.TRANSFORM_2D,
    camera2D.up,
    camera2D.up2D,
  );

  const frustum = camera2D.frustum;
  frustum.right = camera2D.position.z * 0.5;
  frustum.left = -frustum.right;
  frustum.top =
    frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
  frustum.bottom = -frustum.top;

  const endCamera = scratch3DTo2DEndCamera;
  Matrix4.multiplyByPoint(
    Camera.TRANSFORM_2D_INVERSE,
    camera2D.position2D,
    endCamera.position,
  );
  Cartesian3.clone(camera2D.direction, endCamera.direction);
  Cartesian3.clone(camera2D.up, endCamera.up);
  endCamera.frustum = frustum;

  const complete = complete2DCallback(endCamera);
  createMorphHandler(transitioner, complete);

  function completeCallback() {
    morphPerspectiveToOrthographic(
      transitioner,
      duration,
      camera2D,
      updateHeight,
      complete,
    );
  }
  morphFrom3DToColumbusView(transitioner, duration, camera2D, completeCallback);
}

function morphOrthographicToPerspective(
  transitioner,
  duration,
  cameraCV,
  complete,
) {
  const scene = transitioner._scene;
  const camera = scene.camera;

  const height = camera.frustum.right - camera.frustum.left;
  camera.frustum = cameraCV.frustum.clone();

  const endFOV = camera.frustum.fov;
  const startFOV = CesiumMath.RADIANS_PER_DEGREE * 0.5;
  const d = height * Math.tan(endFOV * 0.5);
  camera.frustum.far = d / Math.tan(startFOV * 0.5) + 10000000.0;
  camera.frustum.fov = startFOV;

  function update(value) {
    camera.frustum.fov = CesiumMath.lerp(startFOV, endFOV, value.time);
    camera.position.z = d / Math.tan(camera.frustum.fov * 0.5);
  }
  const tween = scene.tweens.add({
    duration: duration,
    easingFunction: EasingFunction.QUARTIC_OUT,
    startObject: {
      time: 0.0,
    },
    stopObject: {
      time: 1.0,
    },
    update: update,
    complete: function () {
      complete(transitioner);
    },
  });
  transitioner._currentTweens.push(tween);
}

function morphFrom2DToColumbusView(transitioner, duration, cameraCV, complete) {
  duration *= 0.5;

  const scene = transitioner._scene;
  const camera = scene.camera;

  const endPos = Cartesian3.clone(cameraCV.position, scratch3DToCVEndPos);
  const endDir = Cartesian3.clone(cameraCV.direction, scratch3DToCVEndDir);
  const endUp = Cartesian3.clone(cameraCV.up, scratch3DToCVEndUp);

  scene._mode = SceneMode.MORPHING;

  function morph() {
    camera.frustum = cameraCV.frustum.clone();

    const startPos = Cartesian3.clone(camera.position, scratch3DToCVStartPos);
    const startDir = Cartesian3.clone(camera.direction, scratch3DToCVStartDir);
    const startUp = Cartesian3.clone(camera.up, scratch3DToCVStartUp);
    startPos.z = endPos.z;

    function update(value) {
      columbusViewMorph(startPos, endPos, value.time, camera.position);
      columbusViewMorph(startDir, endDir, value.time, camera.direction);
      columbusViewMorph(startUp, endUp, value.time, camera.up);
      Cartesian3.cross(camera.direction, camera.up, camera.right);
      Cartesian3.normalize(camera.right, camera.right);
    }
    const tween = scene.tweens.add({
      duration: duration,
      easingFunction: EasingFunction.QUARTIC_OUT,
      startObject: {
        time: 0.0,
      },
      stopObject: {
        time: 1.0,
      },
      update: update,
      complete: function () {
        complete(transitioner);
      },
    });
    transitioner._currentTweens.push(tween);
  }

  if (transitioner._morphToOrthographic) {
    morph();
  } else {
    morphOrthographicToPerspective(transitioner, 0.0, cameraCV, morph);
  }
}

function morphFrom3DToColumbusView(
  transitioner,
  duration,
  endCamera,
  complete,
) {
  const scene = transitioner._scene;
  const camera = scene.camera;

  const startPos = Cartesian3.clone(camera.position, scratch3DToCVStartPos);
  const startDir = Cartesian3.clone(camera.direction, scratch3DToCVStartDir);
  const startUp = Cartesian3.clone(camera.up, scratch3DToCVStartUp);

  const endPos = Cartesian3.clone(endCamera.position2D, scratch3DToCVEndPos);
  const endDir = Cartesian3.clone(endCamera.direction2D, scratch3DToCVEndDir);
  const endUp = Cartesian3.clone(endCamera.up2D, scratch3DToCVEndUp);

  function update(value) {
    columbusViewMorph(startPos, endPos, value.time, camera.position);
    columbusViewMorph(startDir, endDir, value.time, camera.direction);
    columbusViewMorph(startUp, endUp, value.time, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);
    Cartesian3.normalize(camera.right, camera.right);
    camera._adjustOrthographicFrustum(true);
  }
  const tween = scene.tweens.add({
    duration: duration,
    easingFunction: EasingFunction.QUARTIC_OUT,
    startObject: {
      time: 0.0,
    },
    stopObject: {
      time: 1.0,
    },
    update: update,
    complete: function () {
      addMorphTimeAnimations(transitioner, scene, 1.0, 0.0, duration, complete);
    },
  });
  transitioner._currentTweens.push(tween);
}

function addMorphTimeAnimations(
  transitioner,
  scene,
  start,
  stop,
  duration,
  complete,
) {
  // Later, this will be linear and each object will adjust, if desired, in its vertex shader.
  const options = {
    object: scene,
    property: "morphTime",
    startValue: start,
    stopValue: stop,
    duration: duration,
    easingFunction: EasingFunction.QUARTIC_OUT,
  };

  if (defined(complete)) {
    options.complete = function () {
      complete(transitioner);
    };
  }

  const tween = scene.tweens.addProperty(options);
  transitioner._currentTweens.push(tween);
}

function complete3DCallback(camera3D) {
  return function (transitioner) {
    const scene = transitioner._scene;
    scene._mode = SceneMode.SCENE3D;
    scene.morphTime = SceneMode.getMorphTime(SceneMode.SCENE3D);

    destroyMorphHandler(transitioner);

    const camera = scene.camera;
    if (
      transitioner._previousMode !== SceneMode.MORPHING ||
      transitioner._morphCancelled
    ) {
      transitioner._morphCancelled = false;

      Cartesian3.clone(camera3D.position, camera.position);
      Cartesian3.clone(camera3D.direction, camera.direction);
      Cartesian3.clone(camera3D.up, camera.up);
      Cartesian3.cross(camera.direction, camera.up, camera.right);
      Cartesian3.normalize(camera.right, camera.right);

      camera.frustum = camera3D.frustum.clone();
    }

    const frustum = camera.frustum;
    if (scene.frameState.useLogDepth) {
      frustum.near = 0.1;
      frustum.far = 10000000000.0;
    }

    const wasMorphing = defined(transitioner._completeMorph);
    transitioner._completeMorph = undefined;
    scene.camera.update(scene.mode);
    transitioner._scene.morphComplete.raiseEvent(
      transitioner,
      transitioner._previousMode,
      SceneMode.SCENE3D,
      wasMorphing,
    );
  };
}

function complete2DCallback(camera2D) {
  return function (transitioner) {
    const scene = transitioner._scene;

    scene._mode = SceneMode.SCENE2D;
    scene.morphTime = SceneMode.getMorphTime(SceneMode.SCENE2D);

    destroyMorphHandler(transitioner);

    const camera = scene.camera;
    Cartesian3.clone(camera2D.position, camera.position);
    camera.position.z = scene.ellipsoid.maximumRadius * 2.0;
    Cartesian3.clone(camera2D.direction, camera.direction);
    Cartesian3.clone(camera2D.up, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);
    Cartesian3.normalize(camera.right, camera.right);
    camera.frustum = camera2D.frustum.clone();

    const wasMorphing = defined(transitioner._completeMorph);
    transitioner._completeMorph = undefined;
    scene.camera.update(scene.mode);
    transitioner._scene.morphComplete.raiseEvent(
      transitioner,
      transitioner._previousMode,
      SceneMode.SCENE2D,
      wasMorphing,
    );
  };
}

function completeColumbusViewCallback(cameraCV) {
  return function (transitioner) {
    const scene = transitioner._scene;
    scene._mode = SceneMode.COLUMBUS_VIEW;
    scene.morphTime = SceneMode.getMorphTime(SceneMode.COLUMBUS_VIEW);

    destroyMorphHandler(transitioner);

    const camera = scene.camera;
    if (
      transitioner._previousModeMode !== SceneMode.MORPHING ||
      transitioner._morphCancelled
    ) {
      transitioner._morphCancelled = false;

      Cartesian3.clone(cameraCV.position, camera.position);
      Cartesian3.clone(cameraCV.direction, camera.direction);
      Cartesian3.clone(cameraCV.up, camera.up);
      Cartesian3.cross(camera.direction, camera.up, camera.right);
      Cartesian3.normalize(camera.right, camera.right);
    }

    const frustum = camera.frustum;
    if (scene.frameState.useLogDepth) {
      frustum.near = 0.1;
      frustum.far = 10000000000.0;
    }

    const wasMorphing = defined(transitioner._completeMorph);
    transitioner._completeMorph = undefined;
    scene.camera.update(scene.mode);
    transitioner._scene.morphComplete.raiseEvent(
      transitioner,
      transitioner._previousMode,
      SceneMode.COLUMBUS_VIEW,
      wasMorphing,
    );
  };
}
export default SceneTransitioner;
