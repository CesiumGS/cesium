/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
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
} from "./chunk-7WM3SKEO.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-V2Y7GTNU.js";
import "./chunk-BWREGNKG.js";
import "./chunk-NMEDZZL7.js";
import "./chunk-IJT7RSPE.js";
import "./chunk-54JVCS3Y.js";
import "./chunk-MKJM6R4K.js";
import "./chunk-PY3JQBWU.js";
import "./chunk-VOS2BACB.js";
import "./chunk-CHKMKWJP.js";
import "./chunk-LBUZCHJN.js";
import "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import "./chunk-5G2JRFMX.js";
import "./chunk-3UWS6LZS.js";
import "./chunk-A7FTZEKI.js";
import "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
import "./chunk-63W23YZY.js";
import "./chunk-J64Y4DQH.js";
import {
  __glob,
  __require,
  defined_default
} from "./chunk-7KX4PCVC.js";

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
async function getModule(moduleName) {
  let module = moduleCache[moduleName];
  if (!defined_default(module)) {
    if (typeof exports === "object") {
      moduleCache[module] = module = __require(`Workers/${moduleName}`);
    } else {
      const result = await globImport_js(`./${moduleName}.js`);
      module = result.default;
      moduleCache[module] = module;
    }
  }
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
    if (defined_default(moduleName)) {
      resultsOrPromises[i] = getModule(moduleName).then(
        (createFunction) => createFunction(geometry, task.offset)
      );
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
