import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian3 from "../Core/Cartesian3.js";
import CullingVolume from "../Core/CullingVolume.js";
import defined from "../Core/defined.js";
import getTimestamp from "../Core/getTimestamp.js";
import Interval from "../Core/Interval.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import Pass from "../Renderer/Pass.js";
import PassState from "../Renderer/PassState.js";
import Camera from "./Camera.js";
import FrustumCommands from "./FrustumCommands.js";
import GlobeDepth from "./GlobeDepth.js";
import GlobeTranslucencyFramebuffer from "./GlobeTranslucencyFramebuffer.js";
import OIT from "./OIT.js";
import PickDepthFramebuffer from "./PickDepthFramebuffer.js";
import PickFramebuffer from "./PickFramebuffer.js";
import SceneFramebuffer from "./SceneFramebuffer.js";
import SceneMode from "./SceneMode.js";
import ShadowMap from "./ShadowMap.js";
import TranslucentTileClassification from "./TranslucentTileClassification.js";

function CommandExtent() {
  this.command = undefined;
  this.near = undefined;
  this.far = undefined;
}

/**
 * @alias View
 * @constructor
 *
 * @param {Scene} scene
 * @param {Camera} camera
 * @param {BoundingRectangle} viewport
 *
 * @private
 */
function View(scene, camera, viewport) {
  const context = scene.context;

  let globeDepth;
  if (context.depthTexture) {
    globeDepth = new GlobeDepth();
  }

  let oit;
  if (scene._useOIT && context.depthTexture) {
    oit = new OIT(context);
  }

  const passState = new PassState(context);
  passState.viewport = BoundingRectangle.clone(viewport);

  this.camera = camera;
  this._cameraClone = Camera.clone(camera);
  this._cameraStartFired = false;
  this._cameraMovedTime = undefined;

  this.viewport = viewport;
  this.passState = passState;
  this.pickFramebuffer = new PickFramebuffer(context);
  this.pickDepthFramebuffer = new PickDepthFramebuffer();
  this.sceneFramebuffer = new SceneFramebuffer();
  this.globeDepth = globeDepth;
  this.globeTranslucencyFramebuffer = new GlobeTranslucencyFramebuffer();
  this.oit = oit;
  this.translucentTileClassification = new TranslucentTileClassification(
    context,
  );
  /**
   * @type {PickDepth[]}
   */
  this.pickDepths = [];
  this.frustumCommandsList = [];
  this.debugFrustumStatistics = undefined;

  // Array of all commands that get rendered into frustums along with their near / far values.
  // Acts similar to a ManagedArray.
  this._commandExtents = [];
}

const scratchPosition0 = new Cartesian3();
const scratchPosition1 = new Cartesian3();
/**
 * Check if two cameras have the same view.
 *
 * @param {Camera} camera0 The first camera for comparison.
 * @param {Camera} camera1 The second camera for comparison.
 * @param {number} epsilon The epsilon tolerance to use for equality testing.
 * @returns {boolean} <code>true</code> if the cameras are equal.
 *
 * @private
 */
function cameraEqual(camera0, camera1, epsilon) {
  const maximumPositionComponent = Math.max(
    Cartesian3.maximumComponent(
      Cartesian3.abs(camera0.position, scratchPosition0),
    ),
    Cartesian3.maximumComponent(
      Cartesian3.abs(camera1.position, scratchPosition1),
    ),
  );
  const scalar = 1 / Math.max(1, maximumPositionComponent);
  Cartesian3.multiplyByScalar(camera0.position, scalar, scratchPosition0);
  Cartesian3.multiplyByScalar(camera1.position, scalar, scratchPosition1);
  return (
    Cartesian3.equalsEpsilon(scratchPosition0, scratchPosition1, epsilon) &&
    Cartesian3.equalsEpsilon(camera0.direction, camera1.direction, epsilon) &&
    Cartesian3.equalsEpsilon(camera0.up, camera1.up, epsilon) &&
    Cartesian3.equalsEpsilon(camera0.right, camera1.right, epsilon) &&
    Matrix4.equalsEpsilon(camera0.transform, camera1.transform, epsilon) &&
    camera0.frustum.equalsEpsilon(camera1.frustum, epsilon)
  );
}

/**
 * Check if the camera position or direction has changed.
 *
 * @param {Scene} scene
 * @returns {boolean} <code>true</code> if the camera has been updated
 *
 * @private
 */
View.prototype.checkForCameraUpdates = function (scene) {
  const camera = this.camera;
  const cameraClone = this._cameraClone;
  if (!cameraEqual(camera, cameraClone, CesiumMath.EPSILON15)) {
    if (!this._cameraStartFired) {
      camera.moveStart.raiseEvent();
      this._cameraStartFired = true;
    }
    this._cameraMovedTime = getTimestamp();
    Camera.clone(camera, cameraClone);

    return true;
  }

  if (
    this._cameraStartFired &&
    getTimestamp() - this._cameraMovedTime > scene.cameraEventWaitTime
  ) {
    camera.moveEnd.raiseEvent();
    this._cameraStartFired = false;
  }

  return false;
};

/**
 * Split the depth range of the scene into multiple frustums, and initialize
 * a list of {@link FrustumCommands} with the distances to the near and far
 * planes for each frustum.
 *
 * @param {View} view The view to which the frustum commands list is attached.
 * @param {Scene} scene The scene to be rendered.
 * @param {number} near The distance to the nearest object in the scene.
 * @param {number} far The distance to the farthest object in the scene.
 *
 * @private
 */
function updateFrustums(view, scene, near, far) {
  const { frameState } = scene;
  const { camera, useLogDepth } = frameState;
  const farToNearRatio = useLogDepth
    ? scene.logarithmicDepthFarToNearRatio
    : scene.farToNearRatio;
  const is2D = scene.mode === SceneMode.SCENE2D;
  const nearToFarDistance2D = scene.nearToFarDistance2D;

  // Extend the far plane slightly further to prevent geometry clipping against the far plane.
  far *= 1.0 + CesiumMath.EPSILON2;

  // The computed near plane must be between the user defined near and far planes.
  // The computed far plane must between the user defined far and computed near.
  // This will handle the case where the computed near plane is further than the user defined far plane.
  near = Math.min(Math.max(near, camera.frustum.near), camera.frustum.far);
  far = Math.max(Math.min(far, camera.frustum.far), near);

  let numFrustums;
  if (is2D) {
    // The multifrustum for 2D is uniformly distributed. To avoid z-fighting in 2D,
    // the camera is moved to just before the frustum and the frustum depth is scaled
    // to be in [1.0, nearToFarDistance2D].
    far = Math.min(far, camera.position.z + scene.nearToFarDistance2D);
    near = Math.min(near, far);
    numFrustums = Math.ceil(
      Math.max(1.0, far - near) / scene.nearToFarDistance2D,
    );
  } else {
    // The multifrustum for 3D/CV is non-uniformly distributed.
    numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
  }

  const { frustumCommandsList } = view;
  frustumCommandsList.length = numFrustums;
  for (let m = 0; m < numFrustums; ++m) {
    let curNear;
    let curFar;

    if (is2D) {
      curNear = Math.min(
        far - nearToFarDistance2D,
        near + m * nearToFarDistance2D,
      );
      curFar = Math.min(far, curNear + nearToFarDistance2D);
    } else {
      curNear = Math.max(near, Math.pow(farToNearRatio, m) * near);
      curFar = Math.min(far, farToNearRatio * curNear);
    }
    let frustumCommands = frustumCommandsList[m];
    if (!defined(frustumCommands)) {
      frustumCommands = frustumCommandsList[m] = new FrustumCommands(
        curNear,
        curFar,
      );
    } else {
      frustumCommands.near = curNear;
      frustumCommands.far = curFar;
    }
  }
}

/**
 * Insert a command into the appropriate {@link FrustumCommands} based on the
 * range of depths covered by its bounding volume.
 *
 * @param {View} view
 * @param {Scene} scene
 * @param {CommandExtent} commandExtent
 *
 * @private
 */
function insertIntoBin(view, scene, commandExtent) {
  const { command, near, far } = commandExtent;

  if (scene.debugShowFrustums) {
    command.debugOverlappingFrustums = 0;
  }

  const { frustumCommandsList } = view;

  for (let i = 0; i < frustumCommandsList.length; ++i) {
    const frustumCommands = frustumCommandsList[i];

    if (near > frustumCommands.far) {
      continue;
    }

    if (far < frustumCommands.near) {
      break;
    }

    const pass = command.pass;
    const index = frustumCommands.indices[pass]++;
    frustumCommands.commands[pass][index] = command;

    if (scene.debugShowFrustums) {
      command.debugOverlappingFrustums |= 1 << i;
    }

    if (command.executeInClosestFrustum) {
      break;
    }
  }

  if (scene.debugShowFrustums) {
    const { debugFrustumStatistics } = view;
    const { debugOverlappingFrustums } = command;
    const cf = debugFrustumStatistics.commandsInFrustums;
    cf[debugOverlappingFrustums] = defined(cf[debugOverlappingFrustums])
      ? cf[debugOverlappingFrustums] + 1
      : 1;
    ++debugFrustumStatistics.totalCommands;
  }

  scene.updateDerivedCommands(command);
}

const scratchCullingVolume = new CullingVolume();
const scratchNearFarInterval = new Interval();

View.prototype.createPotentiallyVisibleSet = function (scene) {
  const { frameState } = scene;
  const { camera, commandList, shadowState } = frameState;
  const { positionWC, directionWC, frustum } = camera;

  const computeList = scene._computeCommandList;
  const overlayList = scene._overlayCommandList;

  if (scene.debugShowFrustums) {
    this.debugFrustumStatistics = {
      totalCommands: 0,
      commandsInFrustums: {},
    };
  }

  const frustumCommandsList = this.frustumCommandsList;
  for (let n = 0; n < frustumCommandsList.length; ++n) {
    for (let p = 0; p < Pass.NUMBER_OF_PASSES; ++p) {
      frustumCommandsList[n].indices[p] = 0;
    }
  }

  computeList.length = 0;
  overlayList.length = 0;

  const commandExtents = this._commandExtents;
  const commandExtentCapacity = commandExtents.length;
  let commandExtentCount = 0;

  let near = +Number.MAX_VALUE;
  let far = -Number.MAX_VALUE;

  const { shadowsEnabled } = shadowState;
  let shadowNear = +Number.MAX_VALUE;
  let shadowFar = -Number.MAX_VALUE;
  let shadowClosestObjectSize = Number.MAX_VALUE;

  const occluder =
    frameState.mode === SceneMode.SCENE3D ? frameState.occluder : undefined;

  // get user culling volume minus the far plane.
  let { cullingVolume } = frameState;
  const planes = scratchCullingVolume.planes;
  for (let k = 0; k < 5; ++k) {
    planes[k] = cullingVolume.planes[k];
  }
  cullingVolume = scratchCullingVolume;

  for (let i = 0; i < commandList.length; ++i) {
    const command = commandList[i];
    const { pass, boundingVolume } = command;

    if (pass === Pass.COMPUTE) {
      computeList.push(command);
    } else if (pass === Pass.OVERLAY) {
      overlayList.push(command);
    } else {
      let commandNear;
      let commandFar;

      if (defined(boundingVolume)) {
        if (!scene.isVisible(cullingVolume, command, occluder)) {
          continue;
        }

        const nearFarInterval = boundingVolume.computePlaneDistances(
          positionWC,
          directionWC,
          scratchNearFarInterval,
        );
        commandNear = nearFarInterval.start;
        commandFar = nearFarInterval.stop;
        near = Math.min(near, commandNear);
        far = Math.max(far, commandFar);

        // Compute a tight near and far plane for commands that receive shadows. This helps compute
        // good splits for cascaded shadow maps. Ignore commands that exceed the maximum distance.
        // When moving the camera low LOD globe tiles begin to load, whose bounding volumes
        // throw off the near/far fitting for the shadow map. Only update for globe tiles that the
        // camera isn't inside.
        if (
          shadowsEnabled &&
          command.receiveShadows &&
          commandNear < ShadowMap.MAXIMUM_DISTANCE &&
          !(pass === Pass.GLOBE && commandNear < -100.0 && commandFar > 100.0)
        ) {
          // Get the smallest bounding volume the camera is near. This is used to place more shadow detail near the object.
          const size = commandFar - commandNear;
          if (pass !== Pass.GLOBE && commandNear < 100.0) {
            shadowClosestObjectSize = Math.min(shadowClosestObjectSize, size);
          }
          shadowNear = Math.min(shadowNear, commandNear);
          shadowFar = Math.max(shadowFar, commandFar);
        }
      } else if (command instanceof ClearCommand) {
        // Clear commands don't need a bounding volume - just add the clear to all frustums.
        commandNear = frustum.near;
        commandFar = frustum.far;
      } else {
        // If command has no bounding volume we need to use the camera's
        // worst-case near and far planes to avoid clipping something important.
        commandNear = frustum.near;
        commandFar = frustum.far;
        near = Math.min(near, commandNear);
        far = Math.max(far, commandFar);
      }

      let extent = commandExtents[commandExtentCount];
      if (!defined(extent)) {
        extent = commandExtents[commandExtentCount] = new CommandExtent();
      }
      extent.command = command;
      extent.near = commandNear;
      extent.far = commandFar;
      commandExtentCount++;
    }
  }

  if (shadowsEnabled) {
    shadowNear = Math.min(Math.max(shadowNear, frustum.near), frustum.far);
    shadowFar = Math.max(Math.min(shadowFar, frustum.far), shadowNear);
    // Use the computed near and far for shadows
    shadowState.nearPlane = shadowNear;
    shadowState.farPlane = shadowFar;
    shadowState.closestObjectSize = shadowClosestObjectSize;
  }

  updateFrustums(this, scene, near, far);

  for (let c = 0; c < commandExtentCount; c++) {
    insertIntoBin(this, scene, commandExtents[c]);
  }

  // Dereference old commands
  if (commandExtentCount < commandExtentCapacity) {
    for (let c = commandExtentCount; c < commandExtentCapacity; c++) {
      const commandExtent = commandExtents[c];
      if (!defined(commandExtent.command)) {
        // If the command is undefined, it's assumed that all
        // subsequent commmands were set to undefined as well,
        // so no need to loop over them all
        break;
      }
      commandExtent.command = undefined;
    }
  }

  const numFrustums = frustumCommandsList.length;
  const { frustumSplits } = frameState;
  frustumSplits.length = numFrustums + 1;
  for (let j = 0; j < numFrustums; ++j) {
    frustumSplits[j] = frustumCommandsList[j].near;
    if (j === numFrustums - 1) {
      frustumSplits[j + 1] = frustumCommandsList[j].far;
    }
  }
};

View.prototype.destroy = function () {
  this.pickFramebuffer = this.pickFramebuffer && this.pickFramebuffer.destroy();
  this.pickDepthFramebuffer =
    this.pickDepthFramebuffer && this.pickDepthFramebuffer.destroy();
  this.sceneFramebuffer =
    this.sceneFramebuffer && this.sceneFramebuffer.destroy();
  this.globeDepth = this.globeDepth && this.globeDepth.destroy();
  this.oit = this.oit && this.oit.destroy();
  this.translucentTileClassification =
    this.translucentTileClassification &&
    this.translucentTileClassification.destroy();
  this.globeTranslucencyFramebuffer =
    this.globeTranslucencyFramebuffer &&
    this.globeTranslucencyFramebuffer.destroy();

  const pickDepths = this.pickDepths;
  for (let i = 0; i < pickDepths.length; ++i) {
    pickDepths[i].destroy();
  }
};
export default View;
