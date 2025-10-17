import Cesium3DTilesTerrainGeometryProcessor from "../Core/Cesium3DTilesTerrainGeometryProcessor.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

/**
 * @private
 *
 * @param {Cesium3DTilesTerrainGeometryProcessor.CreateMeshOptions} options An object describing options for mesh creation.
 * @param {ArrayBuffer[]} transferableObjects An array of buffers that can be transferred back to the main thread.
 * @returns {Promise<object>} A promise that resolves to an object containing selected info from the created TerrainMesh.
 */
function createVerticesFromCesium3DTilesTerrain(options, transferableObjects) {
  const meshPromise = Cesium3DTilesTerrainGeometryProcessor.createMesh(options);
  return meshPromise.then(function (mesh) {
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

    return {
      verticesBuffer: verticesBuffer,
      indicesBuffer: indicesBuffer,
      vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
      indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
      encoding: mesh.encoding,
      westIndicesBuffer: westIndicesBuffer,
      southIndicesBuffer: southIndicesBuffer,
      eastIndicesBuffer: eastIndicesBuffer,
      northIndicesBuffer: northIndicesBuffer,
    };
  });
}

export default createTaskProcessorWorker(
  createVerticesFromCesium3DTilesTerrain,
);
