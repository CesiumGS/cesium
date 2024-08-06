/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.120
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  PrimitivePipeline_default
} from "./chunk-ARYL26GX.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-VEZ7HYKG.js";
import "./chunk-RMQEAQOW.js";
import "./chunk-UYD7VKLC.js";
import "./chunk-H2LNVRQK.js";
import "./chunk-2JFYCC4M.js";
import "./chunk-BV4EB65S.js";
import "./chunk-P7OMCKJ5.js";
import "./chunk-QWYE75PG.js";
import "./chunk-EQPKKCOB.js";
import "./chunk-YMBYIWRS.js";
import "./chunk-JFRY2XUS.js";
import "./chunk-IKEVZXU4.js";
import "./chunk-RQMS6UV3.js";
import "./chunk-FIBS72KH.js";
import "./chunk-HOXR7V6R.js";
import "./chunk-ZYWSMCFH.js";
import "./chunk-I3VEM5YN.js";
import {
  defaultValue_default
} from "./chunk-SWIXUPD2.js";
import {
  DeveloperError_default
} from "./chunk-L7PKE5VE.js";
import {
  __glob,
  __require,
  defined_default
} from "./chunk-D3NRMS7O.js";

// import("./**/*.js") in packages/engine/Source/Workers/createGeometry.js
var globImport_js = __glob({
  "./combineGeometry.js": () => import("./combineGeometry.js"),
  "./createBoxGeometry.js": () => import("./createBoxGeometry.js"),
  "./createBoxOutlineGeometry.js": () => import("./createBoxOutlineGeometry.js"),
  "./createCircleGeometry.js": () => import("./createCircleGeometry.js"),
  "./createCircleOutlineGeometry.js": () => import("./createCircleOutlineGeometry.js"),
  "./createCoplanarPolygonGeometry.js": () => import("./createCoplanarPolygonGeometry.js"),
  "./createCoplanarPolygonOutlineGeometry.js": () => import("./createCoplanarPolygonOutlineGeometry.js"),
  "./createCorridorGeometry.js": () => import("./createCorridorGeometry.js"),
  "./createCorridorOutlineGeometry.js": () => import("./createCorridorOutlineGeometry.js"),
  "./createCylinderGeometry.js": () => import("./createCylinderGeometry.js"),
  "./createCylinderOutlineGeometry.js": () => import("./createCylinderOutlineGeometry.js"),
  "./createEllipseGeometry.js": () => import("./createEllipseGeometry.js"),
  "./createEllipseOutlineGeometry.js": () => import("./createEllipseOutlineGeometry.js"),
  "./createEllipsoidGeometry.js": () => import("./createEllipsoidGeometry.js"),
  "./createEllipsoidOutlineGeometry.js": () => import("./createEllipsoidOutlineGeometry.js"),
  "./createFrustumGeometry.js": () => import("./createFrustumGeometry.js"),
  "./createFrustumOutlineGeometry.js": () => import("./createFrustumOutlineGeometry.js"),
  "./createGeometry.js": () => import("./createGeometry.js"),
  "./createGroundPolylineGeometry.js": () => import("./createGroundPolylineGeometry.js"),
  "./createPlaneGeometry.js": () => import("./createPlaneGeometry.js"),
  "./createPlaneOutlineGeometry.js": () => import("./createPlaneOutlineGeometry.js"),
  "./createPolygonGeometry.js": () => import("./createPolygonGeometry.js"),
  "./createPolygonOutlineGeometry.js": () => import("./createPolygonOutlineGeometry.js"),
  "./createPolylineGeometry.js": () => import("./createPolylineGeometry.js"),
  "./createPolylineVolumeGeometry.js": () => import("./createPolylineVolumeGeometry.js"),
  "./createPolylineVolumeOutlineGeometry.js": () => import("./createPolylineVolumeOutlineGeometry.js"),
  "./createRectangleGeometry.js": () => import("./createRectangleGeometry.js"),
  "./createRectangleOutlineGeometry.js": () => import("./createRectangleOutlineGeometry.js"),
  "./createSimplePolylineGeometry.js": () => import("./createSimplePolylineGeometry.js"),
  "./createSphereGeometry.js": () => import("./createSphereGeometry.js"),
  "./createSphereOutlineGeometry.js": () => import("./createSphereOutlineGeometry.js"),
  "./createTaskProcessorWorker.js": () => import("./createTaskProcessorWorker.js"),
  "./createVectorTileClampedPolylines.js": () => import("./createVectorTileClampedPolylines.js"),
  "./createVectorTileGeometries.js": () => import("./createVectorTileGeometries.js"),
  "./createVectorTilePoints.js": () => import("./createVectorTilePoints.js"),
  "./createVectorTilePolygons.js": () => import("./createVectorTilePolygons.js"),
  "./createVectorTilePolylines.js": () => import("./createVectorTilePolylines.js"),
  "./createVerticesFromGoogleEarthEnterpriseBuffer.js": () => import("./createVerticesFromGoogleEarthEnterpriseBuffer.js"),
  "./createVerticesFromHeightmap.js": () => import("./createVerticesFromHeightmap.js"),
  "./createVerticesFromQuantizedTerrainMesh.js": () => import("./createVerticesFromQuantizedTerrainMesh.js"),
  "./createWallGeometry.js": () => import("./createWallGeometry.js"),
  "./createWallOutlineGeometry.js": () => import("./createWallOutlineGeometry.js"),
  "./decodeDraco.js": () => import("./decodeDraco.js"),
  "./decodeGoogleEarthEnterprisePacket.js": () => import("./decodeGoogleEarthEnterprisePacket.js"),
  "./decodeI3S.js": () => import("./decodeI3S.js"),
  "./transcodeKTX2.js": () => import("./transcodeKTX2.js"),
  "./transferTypedArrayTest.js": () => import("./transferTypedArrayTest.js"),
  "./upsampleQuantizedTerrainMesh.js": () => import("./upsampleQuantizedTerrainMesh.js")
});

// packages/engine/Source/Workers/createGeometry.js
var moduleCache = {};
async function getModule(moduleName, modulePath) {
  let module = defaultValue_default(moduleCache[modulePath], moduleCache[moduleName]);
  if (defined_default(module)) {
    return module;
  }
  if (defined_default(modulePath)) {
    if (typeof exports === "object") {
      module = __require(modulePath);
    } else {
      const result = await import(modulePath);
      module = result.default;
    }
    moduleCache[modulePath] = module;
    return module;
  }
  if (typeof exports === "object") {
    module = __require(`Workers/${moduleName}`);
  } else {
    const result = defined_default(modulePath) ? await import(modulePath) : await globImport_js(`./${moduleName}.js`);
    module = result.default;
  }
  moduleCache[moduleName] = module;
  return module;
}
async function createGeometry(parameters, transferableObjects) {
  const subTasks = parameters.subTasks;
  const length = subTasks.length;
  const resultsOrPromises = new Array(length);
  for (let i = 0; i < length; i++) {
    const task = subTasks[i];
    const geometry = task.geometry;
    const moduleName = task.moduleName;
    const modulePath = task.modulePath;
    if (defined_default(moduleName) && defined_default(modulePath)) {
      throw new DeveloperError_default("Must only set moduleName or modulePath");
    }
    if (defined_default(moduleName) || defined_default(modulePath)) {
      resultsOrPromises[i] = getModule(
        moduleName,
        modulePath
      ).then((createFunction) => createFunction(geometry, task.offset));
    } else {
      resultsOrPromises[i] = geometry;
    }
  }
  return Promise.all(resultsOrPromises).then(function(results) {
    return PrimitivePipeline_default.packCreateGeometryResults(
      results,
      transferableObjects
    );
  });
}
var createGeometry_default = createTaskProcessorWorker_default(createGeometry);
export {
  createGeometry_default as default
};
