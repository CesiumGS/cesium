import Cesium3DTilesTerrainGeometryProcessor from "../Core/Cesium3DTilesTerrainGeometryProcessor.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

/**
 * @private
 * @param {Object} options
 * @param {Boolean} options.isEastChild
 * @param {Boolean} options.isNorthChild
 * @param {Rectangle} options.rectangle
 * @param {Ellipsoid} options.ellipsoid
 * @param {Number} options.skirtHeight
 * @param {Float32Array} options.parentVertices
 * @param {Uint16Array|Uint32Array} options.parentIndices
 * @param {Number} options.parentVertexCountWithoutSkirts
 * @param {Number} options.parentIndexCountWithoutSkirts
 * @param {Number} options.parentMinimumHeight
 * @param {Number} options.parentMaximumHeight
 * @param {TerrainEncoding} options.parentEncoding
 * @param {ArrayBuffer[]} transferableObjects
 * @returns {TerrainMeshProxy}
 */

function upsampleVerticesFromCesium3DTilesTerrain(
  options,
  transferableObjects
) {
  const mesh = Cesium3DTilesTerrainGeometryProcessor.upsampleMesh(options);

  const verticesBuffer = mesh.vertices.buffer;
  const indicesBuffer = mesh.indices.buffer;
  const westIndicesBuffer = mesh.westIndicesSouthToNorth.buffer;
  const southIndicesBuffer = mesh.southIndicesEastToWest.buffer;
  const eastIndicesBuffer = mesh.eastIndicesNorthToSouth.buffer;
  const northIndicesBuffer = mesh.northIndicesWestToEast.buffer;
  const encoding = mesh.encoding;
  const minimumHeight = mesh.minimumHeight;
  const maximumHeight = mesh.maximumHeight;
  const boundingSphere = mesh.boundingSphere3D;
  const orientedBoundingBox = mesh.orientedBoundingBox;
  const horizonOcclusionPoint = mesh.horizonOcclusionPoint;

  transferableObjects.push(
    verticesBuffer,
    indicesBuffer,
    westIndicesBuffer,
    southIndicesBuffer,
    eastIndicesBuffer,
    northIndicesBuffer
  );

  /** @type {TerrainMeshProxy} */
  const result = {
    verticesBuffer: verticesBuffer,
    indicesBuffer: indicesBuffer,
    vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
    indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
    encoding: encoding,
    westIndicesBuffer: westIndicesBuffer,
    southIndicesBuffer: southIndicesBuffer,
    eastIndicesBuffer: eastIndicesBuffer,
    northIndicesBuffer: northIndicesBuffer,
    minimumHeight: minimumHeight,
    maximumHeight: maximumHeight,
    boundingSphere: boundingSphere,
    orientedBoundingBox: orientedBoundingBox,
    horizonOcclusionPoint: horizonOcclusionPoint,
  };
  return result;
}

export default createTaskProcessorWorker(
  upsampleVerticesFromCesium3DTilesTerrain
);
