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
  var context = scene.context;

  var globeDepth;
  if (context.depthTexture) {
    globeDepth = new GlobeDepth();
  }

  var oit;
  if (scene._useOIT && context.depthTexture) {
    oit = new OIT(context);
  }

  var passState = new PassState(context);
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

var scratchPosition0 = new Cartesian3();
var scratchPosition1 = new Cartesian3();
function maxComponent(a, b) {
  var x = Math.max(Math.abs(a.x), Math.abs(b.x));
  var y = Math.max(Math.abs(a.y), Math.abs(b.y));
  var z = Math.max(Math.abs(a.z), Math.abs(b.z));
  return Math.max(Math.max(x, y), z);
}

function cameraEqual(camera0, camera1, epsilon) {
  var scalar =
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
  var camera = this.camera;
  var cameraClone = this._cameraClone;
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
  var frameState = scene.frameState;
  var camera = frameState.camera;
  var farToNearRatio = frameState.useLogDepth
    ? scene.logarithmicDepthFarToNearRatio
    : scene.farToNearRatio;
  var is2D = scene.mode === SceneMode.SCENE2D;
  var nearToFarDistance2D = scene.nearToFarDistance2D;

  // Extend the far plane slightly further to prevent geometry clipping against the far plane.
  far *= 1.0 + CesiumMath.EPSILON2;

  // The computed near plane must be between the user defined near and far planes.
  // The computed far plane must between the user defined far and computed near.
  // This will handle the case where the computed near plane is further than the user defined far plane.
  near = Math.min(Math.max(near, camera.frustum.near), camera.frustum.far);
  far = Math.max(Math.min(far, camera.frustum.far), near);

  var numFrustums;
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

  var frustumCommandsList = view.frustumCommandsList;
  frustumCommandsList.length = numFrustums;
  for (var m = 0; m < numFrustums; ++m) {
    var curNear;
    var curFar;

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
    var frustumCommands = frustumCommandsList[m];
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

  var frustumCommandsList = view.frustumCommandsList;
  var length = frustumCommandsList.length;

  for (var i = 0; i < length; ++i) {
    var frustumCommands = frustumCommandsList[i];
    var curNear = frustumCommands.near;
    var curFar = frustumCommands.far;

    if (commandNear > curFar) {
      continue;
    }

    if (commandFar < curNear) {
      break;
    }

    var pass = command.pass;
    var index = frustumCommands.indices[pass]++;
    frustumCommands.commands[pass][index] = command;

    if (scene.debugShowFrustums) {
      command.debugOverlappingFrustums |= 1 << i;
    }

    if (command.executeInClosestFrustum) {
      break;
    }
  }

  if (scene.debugShowFrustums) {
    var cf = view.debugFrustumStatistics.commandsInFrustums;
    cf[command.debugOverlappingFrustums] = defined(
      cf[command.debugOverlappingFrustums]
    )
      ? cf[command.debugOverlappingFrustums] + 1
      : 1;
    ++view.debugFrustumStatistics.totalCommands;
  }

  scene.updateDerivedCommands(command);
}

var scratchCullingVolume = new CullingVolume();
var scratchNearFarInterval = new Interval();

View.prototype.createPotentiallyVisibleSet = function (scene) {
  var frameState = scene.frameState;
  var camera = frameState.camera;
  var direction = camera.directionWC;
  var position = camera.positionWC;

  var computeList = scene._computeCommandList;
  var overlayList = scene._overlayCommandList;
  var commandList = frameState.commandList;

  if (scene.debugShowFrustums) {
    this.debugFrustumStatistics = {
      totalCommands: 0,
      commandsInFrustums: {},
    };
  }

  var frustumCommandsList = this.frustumCommandsList;
  var numberOfFrustums = frustumCommandsList.length;
  var numberOfPasses = Pass.NUMBER_OF_PASSES;
  for (var n = 0; n < numberOfFrustums; ++n) {
    for (var p = 0; p < numberOfPasses; ++p) {
      frustumCommandsList[n].indices[p] = 0;
    }
  }

  computeList.length = 0;
  overlayList.length = 0;

  var commandExtents = this._commandExtents;
  var commandExtentCapacity = commandExtents.length;
  var commandExtentCount = 0;

  var near = +Number.MAX_VALUE;
  var far = -Number.MAX_VALUE;

  var shadowsEnabled = frameState.shadowState.shadowsEnabled;
  var shadowNear = +Number.MAX_VALUE;
  var shadowFar = -Number.MAX_VALUE;
  var shadowClosestObjectSize = Number.MAX_VALUE;

  var occluder =
    frameState.mode === SceneMode.SCENE3D ? frameState.occluder : undefined;
  var cullingVolume = frameState.cullingVolume;

  // get user culling volume minus the far plane.
  var planes = scratchCullingVolume.planes;
  for (var k = 0; k < 5; ++k) {
    planes[k] = cullingVolume.planes[k];
  }
  cullingVolume = scratchCullingVolume;

  var length = commandList.length;
  for (var i = 0; i < length; ++i) {
    var command = commandList[i];
    var pass = command.pass;

    if (pass === Pass.COMPUTE) {
      computeList.push(command);
    } else if (pass === Pass.OVERLAY) {
      overlayList.push(command);
    } else {
      var commandNear;
      var commandFar;

      var boundingVolume = command.boundingVolume;
      if (defined(boundingVolume)) {
        if (!scene.isVisible(command, cullingVolume, occluder)) {
          continue;
        }

        var nearFarInterval = boundingVolume.computePlaneDistances(
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
          var size = commandFar - commandNear;
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

      var extent = commandExtents[commandExtentCount];
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

  var c;
  var ce;

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

  var numFrustums = frustumCommandsList.length;
  var frustumSplits = frameState.frustumSplits;
  frustumSplits.length = numFrustums + 1;
  for (var j = 0; j < numFrustums; ++j) {
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

  var i;
  var length;

  var pickDepths = this.pickDepths;
  length = pickDepths.length;
  for (i = 0; i < length; ++i) {
    pickDepths[i].destroy();
  }
};
export default View;
