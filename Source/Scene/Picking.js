import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import OrthographicOffCenterFrustum from "../Core/OrthographicOffCenterFrustum.js";
import PerspectiveFrustum from "../Core/PerspectiveFrustum.js";
import PerspectiveOffCenterFrustum from "../Core/PerspectiveOffCenterFrustum.js";
import Ray from "../Core/Ray.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import when from "../ThirdParty/when.js";
import Camera from "./Camera.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import PickDepth from "./PickDepth.js";
import PrimitiveCollection from "./PrimitiveCollection.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";
import View from "./View.js";

var offscreenDefaultWidth = 0.1;

var mostDetailedPreloadTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.MOST_DETAILED_PRELOAD,
});

var mostDetailedPickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.MOST_DETAILED_PICK,
});

var pickTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PICK,
});

/**
 * @private
 */
function Picking(scene) {
  this._mostDetailedRayPicks = [];
  this.pickRenderStateCache = {};
  this._pickPositionCache = {};
  this._pickPositionCacheDirty = false;

  var pickOffscreenViewport = new BoundingRectangle(0, 0, 1, 1);
  var pickOffscreenCamera = new Camera(scene);
  pickOffscreenCamera.frustum = new OrthographicFrustum({
    width: offscreenDefaultWidth,
    aspectRatio: 1.0,
    near: 0.1,
  });

  this._pickOffscreenView = new View(
    scene,
    pickOffscreenCamera,
    pickOffscreenViewport
  );
}

Picking.prototype.update = function () {
  this._pickPositionCacheDirty = true;
};

Picking.prototype.getPickDepth = function (scene, index) {
  var pickDepths = scene.view.pickDepths;
  var pickDepth = pickDepths[index];
  if (!defined(pickDepth)) {
    pickDepth = new PickDepth();
    pickDepths[index] = pickDepth;
  }
  return pickDepth;
};

var scratchOrthoPickingFrustum = new OrthographicOffCenterFrustum();
var scratchOrthoOrigin = new Cartesian3();
var scratchOrthoDirection = new Cartesian3();
var scratchOrthoPixelSize = new Cartesian2();
var scratchOrthoPickVolumeMatrix4 = new Matrix4();

function getPickOrthographicCullingVolume(
  scene,
  drawingBufferPosition,
  width,
  height,
  viewport
) {
  var camera = scene.camera;
  var frustum = camera.frustum;
  if (defined(frustum._offCenterFrustum)) {
    frustum = frustum._offCenterFrustum;
  }

  var x = (2.0 * (drawingBufferPosition.x - viewport.x)) / viewport.width - 1.0;
  x *= (frustum.right - frustum.left) * 0.5;
  var y =
    (2.0 * (viewport.height - drawingBufferPosition.y - viewport.y)) /
      viewport.height -
    1.0;
  y *= (frustum.top - frustum.bottom) * 0.5;

  var transform = Matrix4.clone(
    camera.transform,
    scratchOrthoPickVolumeMatrix4
  );
  camera._setTransform(Matrix4.IDENTITY);

  var origin = Cartesian3.clone(camera.position, scratchOrthoOrigin);
  Cartesian3.multiplyByScalar(camera.right, x, scratchOrthoDirection);
  Cartesian3.add(scratchOrthoDirection, origin, origin);
  Cartesian3.multiplyByScalar(camera.up, y, scratchOrthoDirection);
  Cartesian3.add(scratchOrthoDirection, origin, origin);

  camera._setTransform(transform);

  if (scene.mode === SceneMode.SCENE2D) {
    Cartesian3.fromElements(origin.z, origin.x, origin.y, origin);
  }

  var pixelSize = frustum.getPixelDimensions(
    viewport.width,
    viewport.height,
    1.0,
    1.0,
    scratchOrthoPixelSize
  );

  var ortho = scratchOrthoPickingFrustum;
  ortho.right = pixelSize.x * 0.5;
  ortho.left = -ortho.right;
  ortho.top = pixelSize.y * 0.5;
  ortho.bottom = -ortho.top;
  ortho.near = frustum.near;
  ortho.far = frustum.far;

  return ortho.computeCullingVolume(origin, camera.directionWC, camera.upWC);
}

var scratchPerspPickingFrustum = new PerspectiveOffCenterFrustum();
var scratchPerspPixelSize = new Cartesian2();

function getPickPerspectiveCullingVolume(
  scene,
  drawingBufferPosition,
  width,
  height,
  viewport
) {
  var camera = scene.camera;
  var frustum = camera.frustum;
  var near = frustum.near;

  var tanPhi = Math.tan(frustum.fovy * 0.5);
  var tanTheta = frustum.aspectRatio * tanPhi;

  var x = (2.0 * (drawingBufferPosition.x - viewport.x)) / viewport.width - 1.0;
  var y =
    (2.0 * (viewport.height - drawingBufferPosition.y - viewport.y)) /
      viewport.height -
    1.0;

  var xDir = x * near * tanTheta;
  var yDir = y * near * tanPhi;

  var pixelSize = frustum.getPixelDimensions(
    viewport.width,
    viewport.height,
    1.0,
    1.0,
    scratchPerspPixelSize
  );
  var pickWidth = pixelSize.x * width * 0.5;
  var pickHeight = pixelSize.y * height * 0.5;

  var offCenter = scratchPerspPickingFrustum;
  offCenter.top = yDir + pickHeight;
  offCenter.bottom = yDir - pickHeight;
  offCenter.right = xDir + pickWidth;
  offCenter.left = xDir - pickWidth;
  offCenter.near = near;
  offCenter.far = frustum.far;

  return offCenter.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC
  );
}

function getPickCullingVolume(
  scene,
  drawingBufferPosition,
  width,
  height,
  viewport
) {
  var frustum = scene.camera.frustum;
  if (
    frustum instanceof OrthographicFrustum ||
    frustum instanceof OrthographicOffCenterFrustum
  ) {
    return getPickOrthographicCullingVolume(
      scene,
      drawingBufferPosition,
      width,
      height,
      viewport
    );
  }

  return getPickPerspectiveCullingVolume(
    scene,
    drawingBufferPosition,
    width,
    height,
    viewport
  );
}

// pick rectangle width and height, assumed odd
var scratchRectangleWidth = 3.0;
var scratchRectangleHeight = 3.0;
var scratchRectangle = new BoundingRectangle(
  0.0,
  0.0,
  scratchRectangleWidth,
  scratchRectangleHeight
);
var scratchPosition = new Cartesian2();
var scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);

Picking.prototype.pick = function (scene, windowPosition, width, height) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(windowPosition)) {
    throw new DeveloperError("windowPosition is undefined.");
  }
  //>>includeEnd('debug');

  scratchRectangleWidth = defaultValue(width, 3.0);
  scratchRectangleHeight = defaultValue(height, scratchRectangleWidth);

  var context = scene.context;
  var us = context.uniformState;
  var frameState = scene.frameState;

  var view = scene.defaultView;
  scene.view = view;

  var viewport = view.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  var passState = view.passState;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

  var drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(
    scene,
    windowPosition,
    scratchPosition
  );

  scene.jobScheduler.disableThisFrame();

  scene.updateFrameState();
  frameState.cullingVolume = getPickCullingVolume(
    scene,
    drawingBufferPosition,
    scratchRectangleWidth,
    scratchRectangleHeight,
    viewport
  );
  frameState.invertClassification = false;
  frameState.passes.pick = true;
  frameState.tilesetPassState = pickTilesetPassState;

  us.update(frameState);

  scene.updateEnvironment();

  scratchRectangle.x =
    drawingBufferPosition.x - (scratchRectangleWidth - 1.0) * 0.5;
  scratchRectangle.y =
    scene.drawingBufferHeight -
    drawingBufferPosition.y -
    (scratchRectangleHeight - 1.0) * 0.5;
  scratchRectangle.width = scratchRectangleWidth;
  scratchRectangle.height = scratchRectangleHeight;
  passState = view.pickFramebuffer.begin(scratchRectangle, view.viewport);

  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  var object = view.pickFramebuffer.end(scratchRectangle);
  context.endFrame();
  return object;
};

function renderTranslucentDepthForPick(scene, drawingBufferPosition) {
  // PERFORMANCE_IDEA: render translucent only and merge with the previous frame
  var context = scene.context;
  var frameState = scene.frameState;
  var environmentState = scene.environmentState;

  var view = scene.defaultView;
  scene.view = view;

  var viewport = view.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  var passState = view.passState;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

  scene.clearPasses(frameState.passes);
  frameState.passes.pick = true;
  frameState.passes.depth = true;
  frameState.cullingVolume = getPickCullingVolume(
    scene,
    drawingBufferPosition,
    1,
    1,
    viewport
  );
  frameState.tilesetPassState = pickTilesetPassState;

  scene.updateEnvironment();
  environmentState.renderTranslucentDepthForPick = true;
  passState = view.pickDepthFramebuffer.update(
    context,
    drawingBufferPosition,
    viewport
  );

  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  context.endFrame();
}

var scratchPerspectiveFrustum = new PerspectiveFrustum();
var scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
var scratchOrthographicFrustum = new OrthographicFrustum();
var scratchOrthographicOffCenterFrustum = new OrthographicOffCenterFrustum();

Picking.prototype.pickPositionWorldCoordinates = function (
  scene,
  windowPosition,
  result
) {
  if (!scene.useDepthPicking) {
    return undefined;
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(windowPosition)) {
    throw new DeveloperError("windowPosition is undefined.");
  }
  if (!scene.context.depthTexture) {
    throw new DeveloperError(
      "Picking from the depth buffer is not supported. Check pickPositionSupported."
    );
  }
  //>>includeEnd('debug');

  var cacheKey = windowPosition.toString();

  if (this._pickPositionCacheDirty) {
    this._pickPositionCache = {};
    this._pickPositionCacheDirty = false;
  } else if (this._pickPositionCache.hasOwnProperty(cacheKey)) {
    return Cartesian3.clone(this._pickPositionCache[cacheKey], result);
  }

  var frameState = scene.frameState;
  var context = scene.context;
  var uniformState = context.uniformState;

  var view = scene.defaultView;
  scene.view = view;

  var drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(
    scene,
    windowPosition,
    scratchPosition
  );
  if (scene.pickTranslucentDepth) {
    renderTranslucentDepthForPick(scene, drawingBufferPosition);
  } else {
    scene.updateFrameState();
    uniformState.update(frameState);
    scene.updateEnvironment();
  }
  drawingBufferPosition.y = scene.drawingBufferHeight - drawingBufferPosition.y;

  var camera = scene.camera;

  // Create a working frustum from the original camera frustum.
  var frustum;
  if (defined(camera.frustum.fov)) {
    frustum = camera.frustum.clone(scratchPerspectiveFrustum);
  } else if (defined(camera.frustum.infiniteProjectionMatrix)) {
    frustum = camera.frustum.clone(scratchPerspectiveOffCenterFrustum);
  } else if (defined(camera.frustum.width)) {
    frustum = camera.frustum.clone(scratchOrthographicFrustum);
  } else {
    frustum = camera.frustum.clone(scratchOrthographicOffCenterFrustum);
  }

  var frustumCommandsList = view.frustumCommandsList;
  var numFrustums = frustumCommandsList.length;
  for (var i = 0; i < numFrustums; ++i) {
    var pickDepth = this.getPickDepth(scene, i);
    var depth = pickDepth.getDepth(
      context,
      drawingBufferPosition.x,
      drawingBufferPosition.y
    );
    if (!defined(depth)) {
      continue;
    }
    if (depth > 0.0 && depth < 1.0) {
      var renderedFrustum = frustumCommandsList[i];
      var height2D;
      if (scene.mode === SceneMode.SCENE2D) {
        height2D = camera.position.z;
        camera.position.z = height2D - renderedFrustum.near + 1.0;
        frustum.far = Math.max(1.0, renderedFrustum.far - renderedFrustum.near);
        frustum.near = 1.0;
        uniformState.update(frameState);
        uniformState.updateFrustum(frustum);
      } else {
        frustum.near =
          renderedFrustum.near *
          (i !== 0 ? scene.opaqueFrustumNearOffset : 1.0);
        frustum.far = renderedFrustum.far;
        uniformState.updateFrustum(frustum);
      }

      result = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        drawingBufferPosition,
        depth,
        result
      );

      if (scene.mode === SceneMode.SCENE2D) {
        camera.position.z = height2D;
        uniformState.update(frameState);
      }

      this._pickPositionCache[cacheKey] = Cartesian3.clone(result);
      return result;
    }
  }

  this._pickPositionCache[cacheKey] = undefined;
  return undefined;
};

var scratchPickPositionCartographic = new Cartographic();

Picking.prototype.pickPosition = function (scene, windowPosition, result) {
  result = this.pickPositionWorldCoordinates(scene, windowPosition, result);
  if (defined(result) && scene.mode !== SceneMode.SCENE3D) {
    Cartesian3.fromElements(result.y, result.z, result.x, result);

    var projection = scene.mapProjection;
    var ellipsoid = projection.ellipsoid;

    var cart = projection.unproject(result, scratchPickPositionCartographic);
    ellipsoid.cartographicToCartesian(cart, result);
  }

  return result;
};

function drillPick(limit, pickCallback) {
  // PERFORMANCE_IDEA: This function calls each primitive's update for each pass. Instead
  // we could update the primitive once, and then just execute their commands for each pass,
  // and cull commands for picked primitives.  e.g., base on the command's owner.
  var i;
  var attributes;
  var result = [];
  var pickedPrimitives = [];
  var pickedAttributes = [];
  var pickedFeatures = [];
  if (!defined(limit)) {
    limit = Number.MAX_VALUE;
  }

  var pickedResult = pickCallback();
  while (defined(pickedResult)) {
    var object = pickedResult.object;
    var position = pickedResult.position;
    var exclude = pickedResult.exclude;

    if (defined(position) && !defined(object)) {
      result.push(pickedResult);
      break;
    }

    if (!defined(object) || !defined(object.primitive)) {
      break;
    }

    if (!exclude) {
      result.push(pickedResult);
      if (0 >= --limit) {
        break;
      }
    }

    var primitive = object.primitive;
    var hasShowAttribute = false;

    // If the picked object has a show attribute, use it.
    if (typeof primitive.getGeometryInstanceAttributes === "function") {
      if (defined(object.id)) {
        attributes = primitive.getGeometryInstanceAttributes(object.id);
        if (defined(attributes) && defined(attributes.show)) {
          hasShowAttribute = true;
          attributes.show = ShowGeometryInstanceAttribute.toValue(
            false,
            attributes.show
          );
          pickedAttributes.push(attributes);
        }
      }
    }

    if (object instanceof Cesium3DTileFeature) {
      hasShowAttribute = true;
      object.show = false;
      pickedFeatures.push(object);
    }

    // Otherwise, hide the entire primitive
    if (!hasShowAttribute) {
      primitive.show = false;
      pickedPrimitives.push(primitive);
    }

    pickedResult = pickCallback();
  }

  // Unhide everything we hid while drill picking
  for (i = 0; i < pickedPrimitives.length; ++i) {
    pickedPrimitives[i].show = true;
  }

  for (i = 0; i < pickedAttributes.length; ++i) {
    attributes = pickedAttributes[i];
    attributes.show = ShowGeometryInstanceAttribute.toValue(
      true,
      attributes.show
    );
  }

  for (i = 0; i < pickedFeatures.length; ++i) {
    pickedFeatures[i].show = true;
  }

  return result;
}

Picking.prototype.drillPick = function (
  scene,
  windowPosition,
  limit,
  width,
  height
) {
  var that = this;
  var pickCallback = function () {
    var object = that.pick(scene, windowPosition, width, height);
    if (defined(object)) {
      return {
        object: object,
        position: undefined,
        exclude: false,
      };
    }
  };
  var objects = drillPick(limit, pickCallback);
  return objects.map(function (element) {
    return element.object;
  });
};

var scratchRight = new Cartesian3();
var scratchUp = new Cartesian3();

function MostDetailedRayPick(ray, width, tilesets) {
  this.ray = ray;
  this.width = width;
  this.tilesets = tilesets;
  this.ready = false;
  this.deferred = when.defer();
  this.promise = this.deferred.promise;
}

function updateOffscreenCameraFromRay(picking, ray, width, camera) {
  var direction = ray.direction;
  var orthogonalAxis = Cartesian3.mostOrthogonalAxis(direction, scratchRight);
  var right = Cartesian3.cross(direction, orthogonalAxis, scratchRight);
  var up = Cartesian3.cross(direction, right, scratchUp);

  camera.position = ray.origin;
  camera.direction = direction;
  camera.up = up;
  camera.right = right;

  camera.frustum.width = defaultValue(width, offscreenDefaultWidth);
  return camera.frustum.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC
  );
}

function updateMostDetailedRayPick(picking, scene, rayPick) {
  var frameState = scene.frameState;

  var ray = rayPick.ray;
  var width = rayPick.width;
  var tilesets = rayPick.tilesets;

  var camera = picking._pickOffscreenView.camera;
  var cullingVolume = updateOffscreenCameraFromRay(picking, ray, width, camera);

  var tilesetPassState = mostDetailedPreloadTilesetPassState;
  tilesetPassState.camera = camera;
  tilesetPassState.cullingVolume = cullingVolume;

  var ready = true;
  var tilesetsLength = tilesets.length;
  for (var i = 0; i < tilesetsLength; ++i) {
    var tileset = tilesets[i];
    if (tileset.show && scene.primitives.contains(tileset)) {
      // Only update tilesets that are still contained in the scene's primitive collection and are still visible
      // Update tilesets continually until all tilesets are ready. This way tiles are never removed from the cache.
      tileset.updateForPass(frameState, tilesetPassState);
      ready = ready && tilesetPassState.ready;
    }
  }

  if (ready) {
    rayPick.deferred.resolve();
  }

  return ready;
}

Picking.prototype.updateMostDetailedRayPicks = function (scene) {
  // Modifies array during iteration
  var rayPicks = this._mostDetailedRayPicks;
  for (var i = 0; i < rayPicks.length; ++i) {
    if (updateMostDetailedRayPick(this, scene, rayPicks[i])) {
      rayPicks.splice(i--, 1);
    }
  }
};

function getTilesets(primitives, objectsToExclude, tilesets) {
  var length = primitives.length;
  for (var i = 0; i < length; ++i) {
    var primitive = primitives.get(i);
    if (primitive.show) {
      if (defined(primitive.isCesium3DTileset)) {
        if (
          !defined(objectsToExclude) ||
          objectsToExclude.indexOf(primitive) === -1
        ) {
          tilesets.push(primitive);
        }
      } else if (primitive instanceof PrimitiveCollection) {
        getTilesets(primitive, objectsToExclude, tilesets);
      }
    }
  }
}

function launchMostDetailedRayPick(
  picking,
  scene,
  ray,
  objectsToExclude,
  width,
  callback
) {
  var tilesets = [];
  getTilesets(scene.primitives, objectsToExclude, tilesets);
  if (tilesets.length === 0) {
    return when.resolve(callback());
  }

  var rayPick = new MostDetailedRayPick(ray, width, tilesets);
  picking._mostDetailedRayPicks.push(rayPick);
  return rayPick.promise.then(function () {
    return callback();
  });
}

function isExcluded(object, objectsToExclude) {
  if (
    !defined(object) ||
    !defined(objectsToExclude) ||
    objectsToExclude.length === 0
  ) {
    return false;
  }
  return (
    objectsToExclude.indexOf(object) > -1 ||
    objectsToExclude.indexOf(object.primitive) > -1 ||
    objectsToExclude.indexOf(object.id) > -1
  );
}

function getRayIntersection(
  picking,
  scene,
  ray,
  objectsToExclude,
  width,
  requirePosition,
  mostDetailed
) {
  var context = scene.context;
  var uniformState = context.uniformState;
  var frameState = scene.frameState;

  var view = picking._pickOffscreenView;
  scene.view = view;

  updateOffscreenCameraFromRay(picking, ray, width, view.camera);

  scratchRectangle = BoundingRectangle.clone(view.viewport, scratchRectangle);

  var passState = view.pickFramebuffer.begin(scratchRectangle, view.viewport);

  scene.jobScheduler.disableThisFrame();

  scene.updateFrameState();
  frameState.invertClassification = false;
  frameState.passes.pick = true;
  frameState.passes.offscreen = true;

  if (mostDetailed) {
    frameState.tilesetPassState = mostDetailedPickTilesetPassState;
  } else {
    frameState.tilesetPassState = pickTilesetPassState;
  }

  uniformState.update(frameState);

  scene.updateEnvironment();
  scene.updateAndExecuteCommands(passState, scratchColorZero);
  scene.resolveFramebuffers(passState);

  var position;
  var object = view.pickFramebuffer.end(scratchRectangle);

  if (scene.context.depthTexture) {
    var numFrustums = view.frustumCommandsList.length;
    for (var i = 0; i < numFrustums; ++i) {
      var pickDepth = picking.getPickDepth(scene, i);
      var depth = pickDepth.getDepth(context, 0, 0);
      if (!defined(depth)) {
        continue;
      }
      if (depth > 0.0 && depth < 1.0) {
        var renderedFrustum = view.frustumCommandsList[i];
        var near =
          renderedFrustum.near *
          (i !== 0 ? scene.opaqueFrustumNearOffset : 1.0);
        var far = renderedFrustum.far;
        var distance = near + depth * (far - near);
        position = Ray.getPoint(ray, distance);
        break;
      }
    }
  }

  scene.view = scene.defaultView;
  context.endFrame();

  if (defined(object) || defined(position)) {
    return {
      object: object,
      position: position,
      exclude:
        (!defined(position) && requirePosition) ||
        isExcluded(object, objectsToExclude),
    };
  }
}

function getRayIntersections(
  picking,
  scene,
  ray,
  limit,
  objectsToExclude,
  width,
  requirePosition,
  mostDetailed
) {
  var pickCallback = function () {
    return getRayIntersection(
      picking,
      scene,
      ray,
      objectsToExclude,
      width,
      requirePosition,
      mostDetailed
    );
  };
  return drillPick(limit, pickCallback);
}

function pickFromRay(
  picking,
  scene,
  ray,
  objectsToExclude,
  width,
  requirePosition,
  mostDetailed
) {
  var results = getRayIntersections(
    picking,
    scene,
    ray,
    1,
    objectsToExclude,
    width,
    requirePosition,
    mostDetailed
  );
  if (results.length > 0) {
    return results[0];
  }
}

function drillPickFromRay(
  picking,
  scene,
  ray,
  limit,
  objectsToExclude,
  width,
  requirePosition,
  mostDetailed
) {
  return getRayIntersections(
    picking,
    scene,
    ray,
    limit,
    objectsToExclude,
    width,
    requirePosition,
    mostDetailed
  );
}

function deferPromiseUntilPostRender(scene, promise) {
  // Resolve promise after scene's postRender in case entities are created when the promise resolves.
  // Entities can't be created between viewer._onTick and viewer._postRender.
  var deferred = when.defer();
  promise
    .then(function (result) {
      var removeCallback = scene.postRender.addEventListener(function () {
        deferred.resolve(result);
        removeCallback();
      });
      scene.requestRender();
    })
    .otherwise(function (error) {
      deferred.reject(error);
    });
  return deferred.promise;
}

Picking.prototype.pickFromRay = function (scene, ray, objectsToExclude, width) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode."
    );
  }
  //>>includeEnd('debug');

  return pickFromRay(this, scene, ray, objectsToExclude, width, false, false);
};

Picking.prototype.drillPickFromRay = function (
  scene,
  ray,
  limit,
  objectsToExclude,
  width
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode."
    );
  }
  //>>includeEnd('debug');

  return drillPickFromRay(
    this,
    scene,
    ray,
    limit,
    objectsToExclude,
    width,
    false,
    false
  );
};

Picking.prototype.pickFromRayMostDetailed = function (
  scene,
  ray,
  objectsToExclude,
  width
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode."
    );
  }
  //>>includeEnd('debug');

  var that = this;
  ray = Ray.clone(ray);
  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  return deferPromiseUntilPostRender(
    scene,
    launchMostDetailedRayPick(
      that,
      scene,
      ray,
      objectsToExclude,
      width,
      function () {
        return pickFromRay(
          that,
          scene,
          ray,
          objectsToExclude,
          width,
          false,
          true
        );
      }
    )
  );
};

Picking.prototype.drillPickFromRayMostDetailed = function (
  scene,
  ray,
  limit,
  objectsToExclude,
  width
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("ray", ray);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "Ray intersections are only supported in 3D mode."
    );
  }
  //>>includeEnd('debug');

  var that = this;
  ray = Ray.clone(ray);
  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  return deferPromiseUntilPostRender(
    scene,
    launchMostDetailedRayPick(
      that,
      scene,
      ray,
      objectsToExclude,
      width,
      function () {
        return drillPickFromRay(
          that,
          scene,
          ray,
          limit,
          objectsToExclude,
          width,
          false,
          true
        );
      }
    )
  );
};

var scratchSurfacePosition = new Cartesian3();
var scratchSurfaceNormal = new Cartesian3();
var scratchSurfaceRay = new Ray();
var scratchCartographic = new Cartographic();

function getRayForSampleHeight(scene, cartographic) {
  var globe = scene.globe;
  var ellipsoid = defined(globe)
    ? globe.ellipsoid
    : scene.mapProjection.ellipsoid;
  var height = ApproximateTerrainHeights._defaultMaxTerrainHeight;
  var surfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(
    cartographic,
    scratchSurfaceNormal
  );
  var surfacePosition = Cartographic.toCartesian(
    cartographic,
    ellipsoid,
    scratchSurfacePosition
  );
  var surfaceRay = scratchSurfaceRay;
  surfaceRay.origin = surfacePosition;
  surfaceRay.direction = surfaceNormal;
  var ray = new Ray();
  Ray.getPoint(surfaceRay, height, ray.origin);
  Cartesian3.negate(surfaceNormal, ray.direction);
  return ray;
}

function getRayForClampToHeight(scene, cartesian) {
  var globe = scene.globe;
  var ellipsoid = defined(globe)
    ? globe.ellipsoid
    : scene.mapProjection.ellipsoid;
  var cartographic = Cartographic.fromCartesian(
    cartesian,
    ellipsoid,
    scratchCartographic
  );
  return getRayForSampleHeight(scene, cartographic);
}

function getHeightFromCartesian(scene, cartesian) {
  var globe = scene.globe;
  var ellipsoid = defined(globe)
    ? globe.ellipsoid
    : scene.mapProjection.ellipsoid;
  var cartographic = Cartographic.fromCartesian(
    cartesian,
    ellipsoid,
    scratchCartographic
  );
  return cartographic.height;
}

function sampleHeightMostDetailed(
  picking,
  scene,
  cartographic,
  objectsToExclude,
  width
) {
  var ray = getRayForSampleHeight(scene, cartographic);
  return launchMostDetailedRayPick(
    picking,
    scene,
    ray,
    objectsToExclude,
    width,
    function () {
      var pickResult = pickFromRay(
        picking,
        scene,
        ray,
        objectsToExclude,
        width,
        true,
        true
      );
      if (defined(pickResult)) {
        return getHeightFromCartesian(scene, pickResult.position);
      }
    }
  );
}

function clampToHeightMostDetailed(
  picking,
  scene,
  cartesian,
  objectsToExclude,
  width,
  result
) {
  var ray = getRayForClampToHeight(scene, cartesian);
  return launchMostDetailedRayPick(
    picking,
    scene,
    ray,
    objectsToExclude,
    width,
    function () {
      var pickResult = pickFromRay(
        picking,
        scene,
        ray,
        objectsToExclude,
        width,
        true,
        true
      );
      if (defined(pickResult)) {
        return Cartesian3.clone(pickResult.position, result);
      }
    }
  );
}

Picking.prototype.sampleHeight = function (
  scene,
  position,
  objectsToExclude,
  width
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("position", position);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError("sampleHeight is only supported in 3D mode.");
  }
  if (!scene.sampleHeightSupported) {
    throw new DeveloperError(
      "sampleHeight requires depth texture support. Check sampleHeightSupported."
    );
  }
  //>>includeEnd('debug');

  var ray = getRayForSampleHeight(scene, position);
  var pickResult = pickFromRay(
    this,
    scene,
    ray,
    objectsToExclude,
    width,
    true,
    false
  );
  if (defined(pickResult)) {
    return getHeightFromCartesian(scene, pickResult.position);
  }
};

Picking.prototype.clampToHeight = function (
  scene,
  cartesian,
  objectsToExclude,
  width,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesian", cartesian);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError("clampToHeight is only supported in 3D mode.");
  }
  if (!scene.clampToHeightSupported) {
    throw new DeveloperError(
      "clampToHeight requires depth texture support. Check clampToHeightSupported."
    );
  }
  //>>includeEnd('debug');

  var ray = getRayForClampToHeight(scene, cartesian);
  var pickResult = pickFromRay(
    this,
    scene,
    ray,
    objectsToExclude,
    width,
    true,
    false
  );
  if (defined(pickResult)) {
    return Cartesian3.clone(pickResult.position, result);
  }
};

Picking.prototype.sampleHeightMostDetailed = function (
  scene,
  positions,
  objectsToExclude,
  width
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "sampleHeightMostDetailed is only supported in 3D mode."
    );
  }
  if (!scene.sampleHeightSupported) {
    throw new DeveloperError(
      "sampleHeightMostDetailed requires depth texture support. Check sampleHeightSupported."
    );
  }
  //>>includeEnd('debug');

  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  var length = positions.length;
  var promises = new Array(length);
  for (var i = 0; i < length; ++i) {
    promises[i] = sampleHeightMostDetailed(
      this,
      scene,
      positions[i],
      objectsToExclude,
      width
    );
  }
  return deferPromiseUntilPostRender(
    scene,
    when.all(promises).then(function (heights) {
      var length = heights.length;
      for (var i = 0; i < length; ++i) {
        positions[i].height = heights[i];
      }
      return positions;
    })
  );
};

Picking.prototype.clampToHeightMostDetailed = function (
  scene,
  cartesians,
  objectsToExclude,
  width
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesians", cartesians);
  if (scene.mode !== SceneMode.SCENE3D) {
    throw new DeveloperError(
      "clampToHeightMostDetailed is only supported in 3D mode."
    );
  }
  if (!scene.clampToHeightSupported) {
    throw new DeveloperError(
      "clampToHeightMostDetailed requires depth texture support. Check clampToHeightSupported."
    );
  }
  //>>includeEnd('debug');

  objectsToExclude = defined(objectsToExclude)
    ? objectsToExclude.slice()
    : objectsToExclude;
  var length = cartesians.length;
  var promises = new Array(length);
  for (var i = 0; i < length; ++i) {
    promises[i] = clampToHeightMostDetailed(
      this,
      scene,
      cartesians[i],
      objectsToExclude,
      width,
      cartesians[i]
    );
  }
  return deferPromiseUntilPostRender(
    scene,
    when.all(promises).then(function (clampedCartesians) {
      var length = clampedCartesians.length;
      for (var i = 0; i < length; ++i) {
        cartesians[i] = clampedCartesians[i];
      }
      return cartesians;
    })
  );
};

Picking.prototype.destroy = function () {
  this._pickOffscreenView =
    this._pickOffscreenView && this._pickOffscreenView.destroy();
};
export default Picking;
