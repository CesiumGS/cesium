import Cesium3DTilesTerrainGeometryProcessor from "../Core/Cesium3DTilesTerrainGeometryProcessor.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

/**
 * @private
 * @param {Cesium3DTilesTerrainGeometryProcessor.UpsampleMeshOptions} options An object describing options for mesh upsampling.
 * @param {ArrayBuffer[]} transferableObjects An array of buffers that can be transferred back to the main thread.
 * @returns {TerrainMeshProxy} An object containing selected info from the upsampled TerrainMesh.
 */

function upsampleVerticesFromCesium3DTilesTerrain(
  options,
  transferableObjects,
) {
  const mesh = Cesium3DTilesTerrainGeometryProcessor.upsampleMesh(options);

  const verticesBuffer = mesh.vertices.buffer;
  const indicesBuffer = mesh.indices.buffer;
  const westIndicesBuffer = mesh.westIndicesSouthToNorth.buffer;
  const southIndicesBuffer = mesh.southIndicesEastToWest.buffer;
  const eastIndicesBuffer = mesh.eastIndicesNorthToSouth.buffer;
  const northIndicesBuffer = mesh.northIndicesWestToEast.buffer;

  transferableObjects.push(
    verticesBuffer,
    indicesBuffer,
    westIndicesBuffer,
    southIndicesBuffer,
    eastIndicesBuffer,
    northIndicesBuffer,
  );

  /** @type {TerrainMeshProxy} */
  const result = {
    verticesBuffer: verticesBuffer,
    indicesBuffer: indicesBuffer,
    vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
    indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
    encoding: mesh.encoding,
    westIndicesBuffer: westIndicesBuffer,
    southIndicesBuffer: southIndicesBuffer,
    eastIndicesBuffer: eastIndicesBuffer,
    northIndicesBuffer: northIndicesBuffer,
    minimumHeight: mesh.minimumHeight,
    maximumHeight: mesh.maximumHeight,
    boundingSphere: mesh.boundingSphere3D,
    orientedBoundingBox: mesh.orientedBoundingBox,
    horizonOcclusionPoint: mesh.horizonOcclusionPoint,
  };
  return result;
}

export default createTaskProcessorWorker(
  upsampleVerticesFromCesium3DTilesTerrain,
);
