import Cesium3DTilesTerrainGeometryProcessor from "../Core/Cesium3DTilesTerrainGeometryProcessor.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

/**
 * @private
 *
 * @param {object} options Object with the following properties:
 * @param {Ellipsoid} options.ellipsoid
 * @param {Rectangle} options.rectangle
 * @param {boolean} options.hasVertexNormals
 * @param {boolean} options.hasWebMercatorT
 * @param {Object.<string,*>} options.gltf
 * @param {number} options.minimumHeight
 * @param {number} options.maximumHeight
 * @param {BoundingSphere} options.boundingSphere
 * @param {OrientedBoundingBox} options.orientedBoundingBox
 * @param {Cartesian3} options.horizonOcclusionPoint
 * @param {number} options.skirtHeight
 * @param {number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
 * @param {ArrayBuffer[]} transferableObjects
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
    const encoding = mesh.encoding;

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
      encoding: encoding,
      westIndicesBuffer: westIndicesBuffer,
      southIndicesBuffer: southIndicesBuffer,
      eastIndicesBuffer: eastIndicesBuffer,
      northIndicesBuffer: northIndicesBuffer,
    };
  });
}

export default createTaskProcessorWorker(
  // @ts-ignore
  createVerticesFromCesium3DTilesTerrain,
);
