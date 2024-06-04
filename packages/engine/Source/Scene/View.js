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
    context
  );
  this.pickDepths = [];
  this.frustumCommandsList = [];
  this.debugFrustumStatistics = undefined;

  // Array of all commands that get rendered into frustums along with their near / far values.
  // Acts similar to a ManagedArray.
  this._commandExtents = [];
}

const scratchPosition0 = new Cartesian3();
const scratchPosition1 = new Cartesian3();
function maxComponent(a, b) {
  const x = Math.max(Math.abs(a.x), Math.abs(b.x));
  const y = Math.max(Math.abs(a.y), Math.abs(b.y));
  const z = Math.max(Math.abs(a.z), Math.abs(b.z));
  return Math.max(Math.max(x, y), z);
}

function cameraEqual(camera0, camera1, epsilon) {
  const scalar =
    1 / Math.max(1, maxComponent(camera0.position, camera1.position));
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

function updateFrustums(view, scene, near, far) {
  const frameState = scene.frameState;
  const camera = frameState.camera;
  const farToNearRatio = frameState.useLogDepth
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
      Math.max(1.0, far - near) / scene.nearToFarDistance2D
    );
  } else {
    // The multifrustum for 3D/CV is non-uniformly distributed.
    numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
  }

  const frustumCommandsList = view.frustumCommandsList;
  frustumCommandsList.length = numFrustums;
  for (let m = 0; m < numFrustums; ++m) {
    let curNear;
    let curFar;

    if (is2D) {
      curNear = Math.min(
        far - nearToFarDistance2D,
        near + m * nearToFarDistance2D
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
        curFar
      );
    } else {
      frustumCommands.near = curNear;
      frustumCommands.far = curFar;
    }
  }
}

function insertIntoBin(view, scene, command, commandNear, commandFar) {
  if (scene.debugShowFrustums) {
    command.debugOverlappingFrustums = 0;
  }

  const frustumCommandsList = view.frustumCommandsList;
  const length = frustumCommandsList.length;

  for (let i = 0; i < length; ++i) {
    const frustumCommands = frustumCommandsList[i];
    const curNear = frustumCommands.near;
    const curFar = frustumCommands.far;

    if (commandNear > curFar) {
      continue;
    }

    if (commandFar < curNear) {
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
    const cf = view.debugFrustumStatistics.commandsInFrustums;
    cf[command.debugOverlappingFrustums] = defined(
      cf[command.debugOverlappingFrustums]
    )
      ? cf[command.debugOverlappingFrustums] + 1
      : 1;
    ++view.debugFrustumStatistics.totalCommands;
  }

  scene.updateDerivedCommands(command);
}

const scratchCullingVolume = new CullingVolume();
const scratchNearFarInterval = new Interval();

View.prototype.createPotentiallyVisibleSet = function (scene) {
  const frameState = scene.frameState;
  const camera = frameState.camera;
  const direction = camera.directionWC;
  const position = camera.positionWC;

  const computeList = scene._computeCommandList;
  const overlayList = scene._overlayCommandList;
  const commandList = frameState.commandList;

  if (scene.debugShowFrustums) {
    this.debugFrustumStatistics = {
      totalCommands: 0,
      commandsInFrustums: {},
    };
  }

  const frustumCommandsList = this.frustumCommandsList;
  const numberOfFrustums = frustumCommandsList.length;
  const numberOfPasses = Pass.NUMBER_OF_PASSES;
  for (let n = 0; n < numberOfFrustums; ++n) {
    for (let p = 0; p < numberOfPasses; ++p) {
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

  const shadowsEnabled = frameState.shadowState.shadowsEnabled;
  let shadowNear = +Number.MAX_VALUE;
  let shadowFar = -Number.MAX_VALUE;
  let shadowClosestObjectSize = Number.MAX_VALUE;

  const occluder =
    frameState.mode === SceneMode.SCENE3D ? frameState.occluder : undefined;
  let cullingVolume = frameState.cullingVolume;

  // get user culling volume minus the far plane.
  const planes = scratchCullingVolume.planes;
  for (let k = 0; k < 5; ++k) {
    planes[k] = cullingVolume.planes[k];
  }
  cullingVolume = scratchCullingVolume;

  const length = commandList.length;
  for (let i = 0; i < length; ++i) {
    const command = commandList[i];
    const pass = command.pass;

    if (pass === Pass.COMPUTE) {
      computeList.push(command);
    } else if (pass === Pass.OVERLAY) {
      overlayList.push(command);
    } else {
      let commandNear;
      let commandFar;

      const boundingVolume = command.boundingVolume;
      if (defined(boundingVolume)) {
        if (!scene.isVisible(command, cullingVolume, occluder)) {
          continue;
        }

        const nearFarInterval = boundingVolume.computePlaneDistances(
          position,
          direction,
          scratchNearFarInterval
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
        commandNear = camera.frustum.near;
        commandFar = camera.frustum.far;
      } else {
        // If command has no bounding volume we need to use the camera's
        // worst-case near and far planes to avoid clipping something important.
        commandNear = camera.frustum.near;
        commandFar = camera.frustum.far;
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
    shadowNear = Math.min(
      Math.max(shadowNear, camera.frustum.near),
      camera.frustum.far
    );
    shadowFar = Math.max(Math.min(shadowFar, camera.frustum.far), shadowNear);
  }

  // Use the computed near and far for shadows
  if (shadowsEnabled) {
    frameState.shadowState.nearPlane = shadowNear;
    frameState.shadowState.farPlane = shadowFar;
    frameState.shadowState.closestObjectSize = shadowClosestObjectSize;
  }

  updateFrustums(this, scene, near, far);

  let c;
  let ce;

  for (c = 0; c < commandExtentCount; c++) {
    ce = commandExtents[c];
    insertIntoBin(this, scene, ce.command, ce.near, ce.far);
  }

  // Dereference old commands
  if (commandExtentCount < commandExtentCapacity) {
    for (c = commandExtentCount; c < commandExtentCapacity; c++) {
      ce = commandExtents[c];
      if (!defined(ce.command)) {
        // If the command is undefined, it's assumed that all
        // subsequent commmands were set to undefined as well,
        // so no need to loop over them all
        break;
      }
      ce.command = undefined;
    }
  }

  const numFrustums = frustumCommandsList.length;
  const frustumSplits = frameState.frustumSplits;
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

  let i;
  const pickDepths = this.pickDepths;
  const length = pickDepths.length;
  for (i = 0; i < length; ++i) {
    pickDepths[i].destroy();
  }
};
export default View;
