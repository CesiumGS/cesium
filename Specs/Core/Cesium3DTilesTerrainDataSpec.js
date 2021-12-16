import { Axis } from "../../Source/Cesium.js";
import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Cesium3DTilesTerrainData } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { TerrainData } from "../../Source/Cesium.js";
import { TerrainMesh } from "../../Source/Cesium.js";
import { TerrainProvider } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";
import { OrientedBoundingBox } from "../../Source/Cesium.js";
import { EllipsoidalOccluder } from "../../Source/Cesium.js";

/**
 * @param {Float32Array|Uint8Array|Uint16Array|Uint32Array} buffer
 * @returns
 */
function getPadding(buffer) {
  return (4 - (buffer.byteLength % 4)) % 4;
}

/**
 * @param {Object} options
 * @param {TilingScheme} options.tilingScheme,
 * @param {Number} options.tileLevel,
 * @param {Number} options.tileX,
 * @param {Number} options.tileY,
 * @param {Cartographic[]} options.positionsCartographic
 * @param {Cartesian3[]} options.normals
 * @param {Uint16Array|Uint32Array} options.indices
 * @param {Uint16Array|Uint32Array} options.edgeIndicesWest
 * @param {Uint16Array|Uint32Array} options.edgeIndicesSouth
 * @param {Uint16Array|Uint32Array} options.edgeIndicesEast
 * @param {Uint16Array|Uint32Array} options.edgeIndicesNorth
 * @param {Number} [options.childTileMask]
 * @returns {Cesium3DTilesTerrainData}
 */
function createTerrainDataFromScratch(options) {
  const tilingScheme = options.tilingScheme;
  const ellipsoid = tilingScheme.ellipsoid;
  const positionsCartographic = options.positionsCartographic;
  const vertexCount = positionsCartographic.length;
  const normals = options.normals;
  const tileLevel = options.tileLevel;
  const tileX = options.tileX;
  const tileY = options.tileY;
  const rectangle = tilingScheme.tileXYToRectangle(tileX, tileY, tileLevel);
  const childTileMask = options.childTileMask;

  let minimumHeight = +Number.MAX_VALUE;
  let maximumHeight = -Number.MAX_VALUE;
  for (let i = 0; i < vertexCount; i++) {
    const positionCartographic = positionsCartographic[i];
    minimumHeight = Math.min(minimumHeight, positionCartographic.height);
    maximumHeight = Math.max(maximumHeight, positionCartographic.height);
  }

  const positionsCartesian = ellipsoid.cartographicArrayToCartesianArray(
    positionsCartographic
  );

  const centerCartographic = Rectangle.center(rectangle);
  centerCartographic.height = 0.5 * (minimumHeight + maximumHeight);
  const centerCartesian = ellipsoid.cartographicToCartesian(centerCartographic);
  const enuToFf = Transforms.eastNorthUpToFixedFrame(
    centerCartesian,
    ellipsoid
  );
  const gltfTransform = Matrix4.multiply(
    Axis.Z_UP_TO_Y_UP,
    enuToFf,
    new Matrix4()
  );
  const gltfTransformAsArray = Matrix4.pack(gltfTransform, new Array(16));
  const ffToEnu = Matrix4.inverseTransformation(enuToFf, new Matrix4());
  const boundingSphere = BoundingSphere.fromRectangle3D(
    rectangle,
    ellipsoid,
    centerCartographic.height
  );
  const orientedBoundingBox = OrientedBoundingBox.fromRectangle(
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid
  );
  const ellipsoidalOccluser = new EllipsoidalOccluder(ellipsoid);
  let horizonOcclusionPoint = ellipsoidalOccluser.computeHorizonCullingPoint(
    centerCartesian,
    positionsCartesian
  );

  // Hemisphere sized tiles can produce undefined occlusion points
  if (horizonOcclusionPoint === undefined) {
    horizonOcclusionPoint = new Cartesian3();
  }

  const positionsLocal = new Array(vertexCount);
  let minPositionLocal = Cartesian3.fromElements(
    +Number.MAX_VALUE,
    +Number.MAX_VALUE,
    +Number.MAX_VALUE
  );

  let maxPositionLocal = Cartesian3.fromElements(
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
    -Number.MAX_VALUE
  );

  for (let i = 0; i < vertexCount; i++) {
    const global = positionsCartesian[i];
    const local = Matrix4.multiplyByPoint(ffToEnu, global, new Cartesian3());
    positionsLocal[i] = local;

    minPositionLocal = Cartesian3.minimumByComponent(
      local,
      minPositionLocal,
      minPositionLocal
    );
    maxPositionLocal = Cartesian3.maximumByComponent(
      local,
      maxPositionLocal,
      maxPositionLocal
    );
  }

  const positionsBuffer = Cartesian3.packArray(
    positionsLocal,
    new Float32Array(3 * vertexCount)
  );

  const normalsBuffer = Cartesian3.packArray(
    normals,
    new Float32Array(3 * vertexCount)
  );

  const indices = options.indices;
  const edgeIndicesWest = options.edgeIndicesWest;
  const edgeIndicesSouth = options.edgeIndicesSouth;
  const edgeIndicesEast = options.edgeIndicesEast;
  const edgeIndicesNorth = options.edgeIndicesNorth;

  let binByteOffset = 0;
  const positionsByteOffset = binByteOffset;
  binByteOffset += positionsBuffer.byteLength;
  binByteOffset += getPadding(positionsBuffer);

  const normalsByteOffset = binByteOffset;
  binByteOffset += normalsBuffer.byteLength;
  binByteOffset += getPadding(normalsBuffer);

  const indicesByteOffset = binByteOffset;
  binByteOffset += indices.byteLength;
  binByteOffset += getPadding(indices);

  const edgeIndicesWestByteOffset = binByteOffset;
  binByteOffset += edgeIndicesWest.byteLength;
  binByteOffset += getPadding(edgeIndicesWest);

  const edgeIndicesSouthByteOffset = binByteOffset;
  binByteOffset += edgeIndicesSouth.byteLength;
  binByteOffset += getPadding(edgeIndicesSouth);

  const edgeIndicesEastByteOffset = binByteOffset;
  binByteOffset += edgeIndicesEast.byteLength;
  binByteOffset += getPadding(edgeIndicesEast);

  const edgeIndicesNorthByteOffset = binByteOffset;
  binByteOffset += edgeIndicesNorth.byteLength;
  binByteOffset += getPadding(edgeIndicesNorth);

  // Copy buffers into the same buffer
  // Typed Array contents are initialized to zero, so there's no need to clear the padding bytes
  const binBuffer = new Uint8Array(binByteOffset);
  binBuffer.set(new Uint8Array(positionsBuffer.buffer), positionsByteOffset);
  binBuffer.set(new Uint8Array(normalsBuffer.buffer), normalsByteOffset);
  binBuffer.set(new Uint8Array(indices.buffer), indicesByteOffset);
  binBuffer.set(
    new Uint8Array(edgeIndicesWest.buffer),
    edgeIndicesWestByteOffset
  );
  binBuffer.set(
    new Uint8Array(edgeIndicesSouth.buffer),
    edgeIndicesSouthByteOffset
  );
  binBuffer.set(
    new Uint8Array(edgeIndicesEast.buffer),
    edgeIndicesEastByteOffset
  );
  binBuffer.set(
    new Uint8Array(edgeIndicesNorth.buffer),
    edgeIndicesNorthByteOffset
  );

  const gltf = {
    asset: {
      version: "2.0",
    },
    buffers: [
      {
        byteLength: binBuffer.byteLength,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: positionsByteOffset,
        byteLength: positionsBuffer.byteLength,
      },
      {
        buffer: 0,
        byteOffset: normalsByteOffset,
        byteLength: normalsBuffer.byteLength,
      },
      {
        buffer: 0,
        byteOffset: indicesByteOffset,
        byteLength: indices.byteLength,
      },
      {
        buffer: 0,
        byteOffset: edgeIndicesWestByteOffset,
        byteLength: edgeIndicesWest.byteLength,
      },
      {
        buffer: 0,
        byteOffset: edgeIndicesSouthByteOffset,
        byteLength: edgeIndicesSouth.byteLength,
      },
      {
        buffer: 0,
        byteOffset: edgeIndicesEastByteOffset,
        byteLength: edgeIndicesEast.byteLength,
      },
      {
        buffer: 0,
        byteOffset: edgeIndicesNorthByteOffset,
        byteLength: edgeIndicesNorth.byteLength,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        type: "VEC3",
        min: [minPositionLocal.x, minPositionLocal.y, minPositionLocal.z],
        max: [maxPositionLocal.x, maxPositionLocal.y, maxPositionLocal.z],
        count: vertexCount,
      },
      {
        bufferView: 1,
        componentType: 5126, // FLOAT
        type: "VEC3",
        count: vertexCount,
      },
      {
        bufferView: 2,
        componentType: 5123, // UINT16
        type: "SCALAR",
        count: indices.length,
      },
      {
        bufferView: 3,
        componentType: 5123, // UINT16
        type: "SCALAR",
        count: edgeIndicesWest.length,
      },
      {
        bufferView: 4,
        componentType: 5123, // UINT16
        type: "SCALAR",
        count: edgeIndicesSouth.length,
      },
      {
        bufferView: 5,
        componentType: 5123, // UINT16
        type: "SCALAR",
        count: edgeIndicesEast.length,
      },
      {
        bufferView: 6,
        componentType: 5123, // UINT16
        type: "SCALAR",
        count: edgeIndicesNorth.length,
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
            },
            indices: 2,
            extensions: {
              CESIUM_tile_edges: { left: 3, bottom: 4, right: 5, top: 6 },
            },
          },
        ],
      },
    ],
    nodes: [
      {
        mesh: 0,
        matrix: gltfTransformAsArray,
      },
    ],
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    extensionsUsed: ["CESIUM_tile_edges"],
  };

  const jsonString = JSON.stringify(gltf);
  const jsonBytes = new Uint8Array(new TextEncoder().encode(jsonString));
  const jsonPaddingByteLength = getPadding(jsonBytes);
  const jsonByteLengthWithPadding =
    jsonBytes.byteLength + jsonPaddingByteLength;

  const glbByteLength =
    12 + // Header
    8 + // JSON chunk header
    jsonByteLengthWithPadding + // JSON bytes + padding
    8 + // BIN chunk header
    binBuffer.byteLength; // BIN bytes (already has padding)

  const glbBytes = new Uint8Array(glbByteLength);
  const glbDataView = new DataView(glbBytes.buffer);
  let glbByteOffset = 0;

  // Write binary glTF header (magic, version, length)
  glbDataView.setUint32(glbByteOffset, 0x46546c67, true);
  glbByteOffset += 4;
  glbDataView.setUint32(glbByteOffset, 2, true);
  glbByteOffset += 4;
  glbDataView.setUint32(glbByteOffset, glbByteLength, true);
  glbByteOffset += 4;

  // Write JSON Chunk header (length, type)
  glbDataView.setUint32(glbByteOffset, jsonByteLengthWithPadding, true);
  glbByteOffset += 4;
  glbDataView.setUint32(glbByteOffset, 0x4e4f534a, true);
  glbByteOffset += 4;

  // Write JSON Chunk
  glbBytes.set(jsonBytes, glbByteOffset);
  glbByteOffset += jsonBytes.byteLength;

  if (jsonPaddingByteLength > 0) {
    // fill with spaces (0x20)
    glbBytes.fill(0x20, glbByteOffset, glbByteOffset + jsonPaddingByteLength);
    glbByteOffset += jsonPaddingByteLength;
  }

  // Write Binary Chunk header (length, type)
  glbDataView.setUint32(glbByteOffset, binBuffer.byteLength, true);
  glbByteOffset += 4;
  glbDataView.setUint32(glbByteOffset, 0x004e4942, true);
  glbByteOffset += 4;

  // Write Binary Chunk
  glbBytes.set(binBuffer, glbByteOffset);
  glbByteOffset += binBuffer.byteLength;

  const terrainData = new Cesium3DTilesTerrainData({
    buffer: glbBytes,
    minimumHeight: minimumHeight,
    maximumHeight: maximumHeight,
    boundingSphere: boundingSphere,
    orientedBoundingBox: orientedBoundingBox,
    horizonOcclusionPoint: horizonOcclusionPoint,
    skirtHeight: 1.0,
    requestVertexNormals: true,
    requestWaterMask: false,
    credits: undefined,
    childTileMask: childTileMask,
  });
  return terrainData;
}

/**
 * @param {Cartesian3} positionA
 * @param {Cartesian3} positionB
 * @returns {Boolean}
 */
function positionEqual(positionA, positionB) {
  return Cartesian3.equalsEpsilon(positionA, positionB, undefined, 1.0);
}

/**
 * @param {Cartesian3} normalA
 * @param {Cartesian3} normalB
 * @returns {Boolean}
 */
function normalEqual(normalA, normalB) {
  return Cartesian3.equalsEpsilon(
    normalA,
    normalB,
    undefined,
    CesiumMath.EPSILON2
  );
}

/**
 * @param {Object} options
 * @param {TerrainMesh} options.mesh
 * @param {Cartographic[]} options.positionsCartographic
 * @param {Cartesian3[]} options.normals
 * @param {Uint16Array|Uint32Array} options.indices
 * @param {Uint16Array|Uint32Array} options.edgeIndicesWest
 * @param {Uint16Array|Uint32Array} options.edgeIndicesSouth
 * @param {Uint16Array|Uint32Array} options.edgeIndicesEast
 * @param {Uint16Array|Uint32Array} options.edgeIndicesNorth
 * @param {Ellipsoid} options.ellipsoid
 */
function checkMeshGeometry(options) {
  const mesh = options.mesh;
  const positionsCartographic = options.positionsCartographic;
  const normals = options.normals;
  const indices = options.indices;
  const edgeIndicesWest = options.edgeIndicesWest;
  const edgeIndicesSouth = options.edgeIndicesSouth;
  const edgeIndicesEast = options.edgeIndicesEast;
  const edgeIndicesNorth = options.edgeIndicesNorth;
  const ellipsoid = options.ellipsoid;

  expect(mesh).toBeInstanceOf(TerrainMesh);

  // Check vertex and index count with and without skirts
  expect(mesh.vertexCountWithoutSkirts).toBe(positionsCartographic.length);
  expect(mesh.vertexCountWithoutSkirts).toBe(normals.length);
  expect(mesh.indexCountWithoutSkirts).toBe(indices.length);

  const expectedSkirtVertexCount = TerrainProvider.getSkirtVertexCount(
    mesh.westIndicesSouthToNorth,
    mesh.southIndicesEastToWest,
    mesh.eastIndicesNorthToSouth,
    mesh.northIndicesWestToEast
  );

  const expectedSkirtIndexCount = TerrainProvider.getSkirtIndexCountWithFilledCorners(
    expectedSkirtVertexCount
  );

  const indexCount = mesh.indices.length;
  const vertexCount = mesh.vertices.length / mesh.stride;

  expect(vertexCount).toBe(
    positionsCartographic.length + expectedSkirtVertexCount
  );
  expect(indexCount).toBe(indices.length + expectedSkirtIndexCount);

  // Check positions, normals, indices
  for (let i = 0; i < mesh.indexCountWithoutSkirts; i += 3) {
    const indexMesh0 = mesh.indices[i + 0];
    const indexMesh1 = mesh.indices[i + 1];
    const indexMesh2 = mesh.indices[i + 2];
    const positionMesh0 = mesh.encoding.decodePosition(
      mesh.vertices,
      indexMesh0,
      new Cartesian3()
    );
    const positionMesh1 = mesh.encoding.decodePosition(
      mesh.vertices,
      indexMesh1,
      new Cartesian3()
    );
    const positionMesh2 = mesh.encoding.decodePosition(
      mesh.vertices,
      indexMesh2,
      new Cartesian3()
    );
    const normalMesh0 = mesh.encoding.decodeNormal(
      mesh.vertices,
      indexMesh0,
      new Cartesian3()
    );
    const normalMesh1 = mesh.encoding.decodeNormal(
      mesh.vertices,
      indexMesh1,
      new Cartesian3()
    );
    const normalMesh2 = mesh.encoding.decodeNormal(
      mesh.vertices,
      indexMesh2,
      new Cartesian3()
    );

    let foundTriangle = false;
    for (let j = 0; j < indices.length && !foundTriangle; j += 3) {
      // Loop over all three edges to find the matching edge
      for (let p = 0; p < 3 && !foundTriangle; p++) {
        const indexOther0 = indices[j + ((p + 0) % 3)];
        const indexOther1 = indices[j + ((p + 1) % 3)];
        const indexOther2 = indices[j + ((p + 2) % 3)];

        const positionOther0 = ellipsoid.cartographicToCartesian(
          positionsCartographic[indexOther0],
          new Cartesian3()
        );
        const positionOther1 = ellipsoid.cartographicToCartesian(
          positionsCartographic[indexOther1],
          new Cartesian3()
        );
        const positionOther2 = ellipsoid.cartographicToCartesian(
          positionsCartographic[indexOther2],
          new Cartesian3()
        );
        const normalOther0 = normals[indexOther0];
        const normalOther1 = normals[indexOther1];
        const normalOther2 = normals[indexOther2];

        if (
          positionEqual(positionMesh0, positionOther0) &&
          positionEqual(positionMesh1, positionOther1) &&
          positionEqual(positionMesh2, positionOther2) &&
          normalEqual(normalMesh0, normalOther0) &&
          normalEqual(normalMesh1, normalOther1) &&
          normalEqual(normalMesh2, normalOther2)
        ) {
          foundTriangle = true;
        }
      }
    }
    expect(foundTriangle).toBe(true);
  }

  // Check edge indices
  const edgesMesh = [
    mesh.westIndicesSouthToNorth,
    mesh.southIndicesEastToWest,
    mesh.eastIndicesNorthToSouth,
    mesh.northIndicesWestToEast,
  ];
  const edgesOther = [
    edgeIndicesWest,
    edgeIndicesSouth,
    edgeIndicesEast,
    edgeIndicesNorth,
  ];
  for (let e = 0; e < 4; e++) {
    const edgeOther = edgesOther[e];
    const edgeMesh = edgesMesh[e];
    expect(edgeOther.length).toEqual(edgeMesh.length);

    for (let ei = 0; ei < edgeMesh.length; ei++) {
      const indexMesh = edgeMesh[ei];
      const indexOther = edgeOther[ei];

      const positionMesh = mesh.encoding.decodePosition(
        mesh.vertices,
        indexMesh,
        new Cartesian3()
      );
      const positionOther = ellipsoid.cartographicToCartesian(
        positionsCartographic[indexOther],
        new Cartesian3()
      );

      expect(positionEqual(positionMesh, positionOther)).toBe(true);
    }
  }
}

/**
 * @param {Object} options
 * @param {TilingScheme} options.tilingScheme,
 * @param {Number} options.tileLevel,
 * @param {Number} options.tileX,
 * @param {Number} options.tileY,
 * @param {Cartographic[]} options.positionsCartographic,
 * @param {Cartesian3[]} options.normals,
 * @param {Uint16Array|Uint32Array} options.indices,
 * @param {Uint16Array|Uint32Array} options.edgeIndicesWest,
 * @param {Uint16Array|Uint32Array} options.edgeIndicesSouth,
 * @param {Uint16Array|Uint32Array} options.edgeIndicesEast,
 * @param {Uint16Array|Uint32Array} options.edgeIndicesNorth,
 * @param {Cartesian3[]} options.swPositionsCartographic,
 * @param {Cartesian3[]} options.swNormals,
 * @param {Uint16Array|Uint32Array} options.swIndices,
 * @param {Uint16Array|Uint32Array} options.swEdgeIndicesWest,
 * @param {Uint16Array|Uint32Array} options.swEdgeIndicesSouth,
 * @param {Uint16Array|Uint32Array} options.swEdgeIndicesEast,
 * @param {Uint16Array|Uint32Array} options.swEdgeIndicesNorth,
 * @param {Cartesian3[]} options.nwPositionsCartographic,
 * @param {Cartesian3[]} options.nwNormals,
 * @param {Uint16Array|Uint32Array} options.nwIndices,
 * @param {Uint16Array|Uint32Array} options.nwEdgeIndicesWest,
 * @param {Uint16Array|Uint32Array} options.nwEdgeIndicesSouth,
 * @param {Uint16Array|Uint32Array} options.nwEdgeIndicesEast,
 * @param {Uint16Array|Uint32Array} options.nwEdgeIndicesNorth,
 * @param {Cartesian3[]} options.sePositionsCartographic,
 * @param {Cartesian3[]} options.seNormals,
 * @param {Uint16Array|Uint32Array} options.seIndices,
 * @param {Uint16Array|Uint32Array} options.seEdgeIndicesWest,
 * @param {Uint16Array|Uint32Array} options.seEdgeIndicesSouth,
 * @param {Uint16Array|Uint32Array} options.seEdgeIndicesEast,
 * @param {Uint16Array|Uint32Array} options.seEdgeIndicesNorth,
 * @param {Cartesian3[]} options.nePositionsCartographic,
 * @param {Cartesian3[]} options.neNormals,
 * @param {Uint16Array|Uint32Array} options.neIndices,
 * @param {Uint16Array|Uint32Array} options.neEdgeIndicesWest,
 * @param {Uint16Array|Uint32Array} options.neEdgeIndicesSouth,
 * @param {Uint16Array|Uint32Array} options.neEdgeIndicesEast,
 * @param {Uint16Array|Uint32Array} options.neEdgeIndicesNorth
 * @returns {TerrainData[]}
 */
function checkUpsampledTerrainData(options) {
  const terrainData = createTerrainDataFromScratch({
    tilingScheme: options.tilingScheme,
    tileLevel: options.tileLevel,
    tileX: options.tileX,
    tileY: options.tileY,
    positionsCartographic: options.positionsCartographic,
    normals: options.normals,
    indices: options.indices,
    edgeIndicesWest: options.edgeIndicesWest,
    edgeIndicesSouth: options.edgeIndicesSouth,
    edgeIndicesEast: options.edgeIndicesEast,
    edgeIndicesNorth: options.edgeIndicesNorth,
  });
  expect(terrainData.wasCreatedByUpsampling()).toBe(false);

  const expectedUpsampledPositionsCartographic = [
    options.swPositionsCartographic,
    options.nwPositionsCartographic,
    options.sePositionsCartographic,
    options.nePositionsCartographic,
  ];
  const expectedUpsampledNormals = [
    options.swNormals,
    options.nwNormals,
    options.seNormals,
    options.neNormals,
  ];
  const expectedUpsampledIndices = [
    options.swIndices,
    options.nwIndices,
    options.seIndices,
    options.neIndices,
  ];
  const expectedUpsampledEdgeIndicesWest = [
    options.swEdgeIndicesWest,
    options.nwEdgeIndicesWest,
    options.seEdgeIndicesWest,
    options.neEdgeIndicesWest,
  ];
  const expectedUpsampledEdgeIndicesSouth = [
    options.swEdgeIndicesSouth,
    options.nwEdgeIndicesSouth,
    options.seEdgeIndicesSouth,
    options.neEdgeIndicesSouth,
  ];
  const expectedUpsampledEdgeIndicesEast = [
    options.swEdgeIndicesEast,
    options.nwEdgeIndicesEast,
    options.seEdgeIndicesEast,
    options.neEdgeIndicesEast,
  ];
  const expectedUpsampledEdgeIndicesNorth = [
    options.swEdgeIndicesNorth,
    options.nwEdgeIndicesNorth,
    options.seEdgeIndicesNorth,
    options.neEdgeIndicesNorth,
  ];

  return Promise.resolve(
    terrainData.createMesh({
      tilingScheme: options.tilingScheme,
      x: options.tileX,
      y: options.tileY,
      level: options.tileLevel,
    })
  )
    .then(function (terrainMesh) {
      checkMeshGeometry({
        mesh: terrainMesh,
        positionsCartographic: options.positionsCartographic,
        normals: options.normals,
        indices: options.indices,
        edgeIndicesWest: options.edgeIndicesWest,
        edgeIndicesSouth: options.edgeIndicesSouth,
        edgeIndicesEast: options.edgeIndicesEast,
        edgeIndicesNorth: options.edgeIndicesNorth,
        ellipsoid: options.tilingScheme.ellipsoid,
      });

      const swPromise = terrainData.upsample(
        options.tilingScheme,
        options.tileX,
        options.tileY,
        options.tileLevel,
        options.tileX * 2 + 0,
        options.tileY * 2 + 1,
        options.tileLevel + 1
      );
      const nwPromise = terrainData.upsample(
        options.tilingScheme,
        options.tileX,
        options.tileY,
        options.tileLevel,
        options.tileX * 2 + 0,
        options.tileY * 2 + 0,
        options.tileLevel + 1
      );
      const sePromise = terrainData.upsample(
        options.tilingScheme,
        options.tileX,
        options.tileY,
        options.tileLevel,
        options.tileX * 2 + 1,
        options.tileY * 2 + 1,
        options.tileLevel + 1
      );
      const nePromise = terrainData.upsample(
        options.tilingScheme,
        options.tileX,
        options.tileY,
        options.tileLevel,
        options.tileX * 2 + 1,
        options.tileY * 2 + 0,
        options.tileLevel + 1
      );
      return Promise.all([swPromise, nwPromise, sePromise, nePromise]);
    })
    .then(function (upsampledTerrainDatas) {
      expect(upsampledTerrainDatas.length).toBe(4);

      for (let i = 0; i < upsampledTerrainDatas.length; ++i) {
        const upsampledTerrainData = upsampledTerrainDatas[i];
        expect(upsampledTerrainData).toBeDefined();
        expect(upsampledTerrainData.wasCreatedByUpsampling()).toBe(true);

        checkMeshGeometry({
          mesh: upsampledTerrainData._mesh,
          positionsCartographic: expectedUpsampledPositionsCartographic[i],
          normals: expectedUpsampledNormals[i],
          indices: expectedUpsampledIndices[i],
          edgeIndicesWest: expectedUpsampledEdgeIndicesWest[i],
          edgeIndicesSouth: expectedUpsampledEdgeIndicesSouth[i],
          edgeIndicesEast: expectedUpsampledEdgeIndicesEast[i],
          edgeIndicesNorth: expectedUpsampledEdgeIndicesNorth[i],
          ellipsoid: options.tilingScheme.ellipsoid,
        });
      }

      return upsampledTerrainDatas;
    });
}

/**
 * @param {Cartographic} cartographicA
 * @param {Cartographic} cartographicB
 * @param {Number} t
 * @returns {Cartographic}
 */
function lerpCartographic(cartographicA, cartographicB, t) {
  return new Cartographic(
    CesiumMath.lerp(cartographicA.longitude, cartographicB.longitude, t),
    CesiumMath.lerp(cartographicA.latitude, cartographicB.latitude, t),
    CesiumMath.lerp(cartographicA.height, cartographicB.height, t)
  );
}

/**
 * @param {Cartographic} cartographicA
 * @param {Cartographic} cartographicB
 * @param {Cartographic} cartographicC
 * @param {Cartesian3} barycentricCoordinates
 * @returns {Cartographic}
 */
function barycentricCartographic(
  cartographicA,
  cartographicB,
  cartographicC,
  barycentricCoordinates
) {
  const longitude =
    cartographicA.longitude * barycentricCoordinates.x +
    cartographicB.longitude * barycentricCoordinates.y +
    cartographicC.longitude * barycentricCoordinates.z;

  const latitude =
    cartographicA.latitude * barycentricCoordinates.x +
    cartographicB.latitude * barycentricCoordinates.y +
    cartographicC.latitude * barycentricCoordinates.z;

  const height =
    cartographicA.height * barycentricCoordinates.x +
    cartographicB.height * barycentricCoordinates.y +
    cartographicC.height * barycentricCoordinates.z;

  return new Cartographic(longitude, latitude, height);
}

describe("Core/Cesium3DTilesTerrainData", function () {
  it("conforms to TerrainData interface", function () {
    expect(Cesium3DTilesTerrainData).toConformToInterface(TerrainData);
  });

  describe("constructor", function () {
    it("requires buffer", function () {
      expect(function () {
        return new Cesium3DTilesTerrainData({
          buffer: undefined,
          minimumHeight: 0,
          maximumHeight: 0,
          boundingSphere: new BoundingSphere(),
          orientedBoundingBox: new OrientedBoundingBox(),
          horizonOcclusionPoint: new Cartesian3(),
          skirtHeight: 1.0,
        });
      }).toThrowDeveloperError();
    });
    it("requires minimumHeight", function () {
      expect(function () {
        return new Cesium3DTilesTerrainData({
          buffer: new ArrayBuffer(0),
          minimumHeight: undefined,
          maximumHeight: 0,
          boundingSphere: new BoundingSphere(),
          orientedBoundingBox: new OrientedBoundingBox(),
          horizonOcclusionPoint: new Cartesian3(),
          skirtHeight: 1.0,
        });
      }).toThrowDeveloperError();
    });
    it("requires maximumHeight", function () {
      expect(function () {
        return new Cesium3DTilesTerrainData({
          buffer: new ArrayBuffer(0),
          minimumHeight: 0,
          maximumHeight: undefined,
          boundingSphere: new BoundingSphere(),
          orientedBoundingBox: new OrientedBoundingBox(),
          horizonOcclusionPoint: new Cartesian3(),
          skirtHeight: 1.0,
        });
      }).toThrowDeveloperError();
    });
    it("requires boundingSphere", function () {
      expect(function () {
        return new Cesium3DTilesTerrainData({
          buffer: new ArrayBuffer(0),
          minimumHeight: 0,
          maximumHeight: 0,
          boundingSphere: undefined,
          orientedBoundingBox: new OrientedBoundingBox(),
          horizonOcclusionPoint: new Cartesian3(),
          skirtHeight: 1.0,
        });
      }).toThrowDeveloperError();
    });
    it("requires orientedBoundingBox", function () {
      expect(function () {
        return new Cesium3DTilesTerrainData({
          buffer: new ArrayBuffer(0),
          minimumHeight: 0,
          maximumHeight: 0,
          boundingSphere: new BoundingSphere(),
          orientedBoundingBox: undefined,
          horizonOcclusionPoint: new Cartesian3(),
          skirtHeight: 1.0,
        });
      }).toThrowDeveloperError();
    });
    it("requires horizonOcclusionPoint", function () {
      expect(function () {
        return new Cesium3DTilesTerrainData({
          buffer: new ArrayBuffer(0),
          minimumHeight: 0,
          maximumHeight: 0,
          boundingSphere: new BoundingSphere(),
          orientedBoundingBox: new OrientedBoundingBox(),
          horizonOcclusionPoint: undefined,
          skirtHeight: 1.0,
        });
      }).toThrowDeveloperError();
    });
    it("requires skirtHeight", function () {
      expect(function () {
        return new Cesium3DTilesTerrainData({
          buffer: new ArrayBuffer(0),
          minimumHeight: 0,
          maximumHeight: 0,
          boundingSphere: new BoundingSphere(),
          orientedBoundingBox: new OrientedBoundingBox(),
          horizonOcclusionPoint: new Cartesian3(),
          skirtHeight: undefined,
        });
      }).toThrowDeveloperError();
    });
  });

  describe("upsample", function () {
    it("throws if level difference is greater than 1", function () {
      const tilingScheme = new GeographicTilingScheme();
      const level = 0;
      const x = 0;
      const y = 0;
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      const sw = new Cartographic(rectangle.west, rectangle.south, 0.0);
      const nw = new Cartographic(rectangle.west, rectangle.north, 1.0);
      const se = new Cartographic(rectangle.east, rectangle.south, 2.0);
      const ne = new Cartographic(rectangle.east, rectangle.north, 3.0);

      const data = createTerrainDataFromScratch({
        tilingScheme: tilingScheme,
        tileLevel: level,
        tileX: x,
        tileY: y,
        positionsCartographic: [sw, nw, se, ne],
        normals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        edgeIndicesWest: new Uint16Array([0, 1]),
        edgeIndicesSouth: new Uint16Array([2, 0]),
        edgeIndicesEast: new Uint16Array([3, 2]),
        edgeIndicesNorth: new Uint16Array([1, 3]),
      });

      return data
        .createMesh({
          tilingScheme: tilingScheme,
          x: x,
          y: y,
          level: level,
        })
        .then(function () {
          expect(function () {
            return data.upsample(
              tilingScheme,
              x,
              y,
              level,
              x * 4,
              y * 4,
              level + 2
            );
          }).toThrowDeveloperError();
        });
    });

    it("cannot upsample until mesh has been created", function () {
      const tilingScheme = new GeographicTilingScheme();
      const level = 0;
      const x = 0;
      const y = 0;
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      const sw = new Cartographic(rectangle.west, rectangle.south, 0.0);
      const nw = new Cartographic(rectangle.west, rectangle.north, 1.0);
      const se = new Cartographic(rectangle.east, rectangle.south, 2.0);
      const ne = new Cartographic(rectangle.east, rectangle.north, 3.0);

      const data = createTerrainDataFromScratch({
        tilingScheme: tilingScheme,
        tileLevel: level,
        tileX: x,
        tileY: y,
        positionsCartographic: [sw, nw, se, ne],
        normals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        edgeIndicesWest: new Uint16Array([0, 1]),
        edgeIndicesSouth: new Uint16Array([2, 0]),
        edgeIndicesEast: new Uint16Array([3, 2]),
        edgeIndicesNorth: new Uint16Array([1, 3]),
      });

      expect(
        data.upsample(tilingScheme, x, y, level, x * 2, y * 2, level + 1)
      ).toBeUndefined();
    });

    it("works for all four children of a simple quad", function () {
      const tilingScheme = new GeographicTilingScheme();
      const tileLevel = 0;
      const tileX = 0;
      const tileY = 0;
      const rectangle = tilingScheme.tileXYToRectangle(tileX, tileY, tileLevel);
      const sw = new Cartographic(rectangle.west, rectangle.south, 0.0);
      const nw = new Cartographic(rectangle.west, rectangle.north, 1.0);
      const se = new Cartographic(rectangle.east, rectangle.south, 2.0);
      const ne = new Cartographic(rectangle.east, rectangle.north, 3.0);
      const cw = lerpCartographic(sw, nw, 0.5);
      const ce = lerpCartographic(se, ne, 0.5);
      const sc = lerpCartographic(sw, se, 0.5);
      const nc = lerpCartographic(nw, ne, 0.5);
      const cc = lerpCartographic(cw, ce, 0.5);

      return checkUpsampledTerrainData({
        tilingScheme: tilingScheme,
        tileLevel: tileLevel,
        tileX: tileX,
        tileY: tileY,
        positionsCartographic: [sw, nw, se, ne],
        normals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        edgeIndicesWest: new Uint16Array([0, 1]),
        edgeIndicesSouth: new Uint16Array([2, 0]),
        edgeIndicesEast: new Uint16Array([3, 2]),
        edgeIndicesNorth: new Uint16Array([1, 3]),
        swPositionsCartographic: [sw, cw, sc, cc],
        swNormals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        swIndices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        swEdgeIndicesWest: new Uint16Array([0, 1]),
        swEdgeIndicesSouth: new Uint16Array([2, 0]),
        swEdgeIndicesEast: new Uint16Array([3, 2]),
        swEdgeIndicesNorth: new Uint16Array([1, 3]),
        nwPositionsCartographic: [cw, nw, cc, nc],
        nwNormals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        nwIndices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        nwEdgeIndicesWest: new Uint16Array([0, 1]),
        nwEdgeIndicesSouth: new Uint16Array([2, 0]),
        nwEdgeIndicesEast: new Uint16Array([3, 2]),
        nwEdgeIndicesNorth: new Uint16Array([1, 3]),
        sePositionsCartographic: [sc, cc, se, ce],
        seNormals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        seIndices: new Uint16Array([0, 2, 1, 2, 3, 1]),
        seEdgeIndicesWest: new Uint16Array([0, 1]),
        seEdgeIndicesSouth: new Uint16Array([2, 0]),
        seEdgeIndicesEast: new Uint16Array([3, 2]),
        seEdgeIndicesNorth: new Uint16Array([1, 3]),
        nePositionsCartographic: [cc, nc, ce, ne],
        neNormals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        neIndices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        neEdgeIndicesWest: new Uint16Array([0, 1]),
        neEdgeIndicesSouth: new Uint16Array([2, 0]),
        neEdgeIndicesEast: new Uint16Array([3, 2]),
        neEdgeIndicesNorth: new Uint16Array([1, 3]),
      });
    });

    it("works for a quad with an extra vertex in the northwest child", function () {
      const tilingScheme = new GeographicTilingScheme();
      const tileLevel = 0;
      const tileX = 0;
      const tileY = 0;
      const rectangle = tilingScheme.tileXYToRectangle(tileX, tileY, tileLevel);
      const sw = new Cartographic(rectangle.west, rectangle.south, 0.0);
      const nw = new Cartographic(rectangle.west, rectangle.north, 1.0);
      const se = new Cartographic(rectangle.east, rectangle.south, 2.0);
      const ne = new Cartographic(rectangle.east, rectangle.north, 3.0);
      const extra = new Cartographic(
        CesiumMath.lerp(rectangle.west, rectangle.east, 0.25),
        CesiumMath.lerp(rectangle.south, rectangle.north, 0.75),
        4.0
      );
      const cw = lerpCartographic(sw, nw, 0.5);
      const ce = lerpCartographic(se, ne, 0.5);
      const sc = lerpCartographic(sw, se, 0.5);
      const nc = lerpCartographic(nw, ne, 0.5);
      const cc = lerpCartographic(se, extra, 0.666666666);
      const swIx = lerpCartographic(sw, extra, 0.666666666);
      const neIx = lerpCartographic(ne, extra, 0.666666666);

      return checkUpsampledTerrainData({
        tilingScheme: tilingScheme,
        tileLevel: tileLevel,
        tileX: tileX,
        tileY: tileY,
        positionsCartographic: [sw, nw, se, ne, extra],
        normals: new Array(5).fill(new Cartesian3(1.0, 0.0, 0.0)),
        indices: new Uint16Array([0, 4, 1, 0, 2, 4, 1, 4, 3, 3, 4, 2]),
        edgeIndicesWest: new Uint16Array([0, 1]),
        edgeIndicesSouth: new Uint16Array([2, 0]),
        edgeIndicesEast: new Uint16Array([3, 2]),
        edgeIndicesNorth: new Uint16Array([1, 3]),
        swPositionsCartographic: [sw, cw, swIx, cc, sc],
        swNormals: new Array(5).fill(new Cartesian3(1.0, 0.0, 0.0)),
        swIndices: new Uint16Array([2, 1, 0, 2, 0, 4, 2, 4, 3]),
        swEdgeIndicesWest: new Uint16Array([0, 1]),
        swEdgeIndicesSouth: new Uint16Array([4, 0]),
        swEdgeIndicesEast: new Uint16Array([3, 4]),
        swEdgeIndicesNorth: new Uint16Array([1, 2, 3]),
        nwPositionsCartographic: [cw, nw, nc, neIx, cc, swIx, extra],
        nwNormals: new Array(7).fill(new Cartesian3(1.0, 0.0, 0.0)),
        // prettier-ignore
        nwIndices: new Uint16Array([6, 1, 0, 6, 2, 1, 6, 3, 2, 6, 4, 3, 6, 5, 4, 6, 0, 5]),
        nwEdgeIndicesWest: new Uint16Array([0, 1]),
        nwEdgeIndicesSouth: new Uint16Array([4, 5, 0]),
        nwEdgeIndicesEast: new Uint16Array([2, 3, 4]),
        nwEdgeIndicesNorth: new Uint16Array([1, 2]),
        sePositionsCartographic: [sc, cc, ce, se],
        seNormals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        seIndices: new Uint16Array([0, 3, 1, 1, 3, 2]),
        seEdgeIndicesWest: new Uint16Array([0, 1]),
        seEdgeIndicesSouth: new Uint16Array([3, 0]),
        seEdgeIndicesEast: new Uint16Array([2, 3]),
        seEdgeIndicesNorth: new Uint16Array([1, 2]),
        nePositionsCartographic: [cc, neIx, nc, ne, ce],
        neNormals: new Array(5).fill(new Cartesian3(1.0, 0.0, 0.0)),
        neIndices: new Uint16Array([1, 3, 2, 1, 4, 3, 1, 0, 4]),
        neEdgeIndicesWest: new Uint16Array([0, 1, 2]),
        neEdgeIndicesSouth: new Uint16Array([4, 0]),
        neEdgeIndicesEast: new Uint16Array([3, 4]),
        neEdgeIndicesNorth: new Uint16Array([2, 3]),
      });
    });

    it("works for a quad with an extra vertex on the splitting plane", function () {
      const tilingScheme = new GeographicTilingScheme();
      const tileLevel = 0;
      const tileX = 0;
      const tileY = 0;
      const rectangle = tilingScheme.tileXYToRectangle(tileX, tileY, tileLevel);
      const sw = new Cartographic(rectangle.west, rectangle.south, 0.0);
      const nw = new Cartographic(rectangle.west, rectangle.north, 1.0);
      const se = new Cartographic(rectangle.east, rectangle.south, 2.0);
      const ne = new Cartographic(rectangle.east, rectangle.north, 3.0);
      const extra = new Cartographic(
        CesiumMath.lerp(rectangle.west, rectangle.east, 0.5),
        CesiumMath.lerp(rectangle.south, rectangle.north, 0.75),
        4.0
      );
      const cw = lerpCartographic(sw, nw, 0.5);
      const ce = lerpCartographic(se, ne, 0.5);
      const sc = lerpCartographic(sw, se, 0.5);
      const nc = lerpCartographic(nw, ne, 0.5);
      const centerBary = new Cartesian3(0.166666666, 0.166666666, 0.666666666);
      const cc = barycentricCartographic(sw, se, extra, centerBary);
      const swIx = lerpCartographic(sw, extra, 0.666666666);
      const seIx = lerpCartographic(se, extra, 0.666666666);

      return checkUpsampledTerrainData({
        tilingScheme: tilingScheme,
        tileLevel: tileLevel,
        tileX: tileX,
        tileY: tileY,
        positionsCartographic: [sw, nw, ne, se, extra],
        normals: new Array(5).fill(new Cartesian3(1.0, 0.0, 0.0)),
        indices: new Uint16Array([4, 1, 0, 4, 2, 1, 4, 3, 2, 4, 0, 3]),
        edgeIndicesWest: new Uint16Array([0, 1]),
        edgeIndicesSouth: new Uint16Array([3, 0]),
        edgeIndicesEast: new Uint16Array([2, 3]),
        edgeIndicesNorth: new Uint16Array([1, 2]),
        swPositionsCartographic: [sw, cw, swIx, cc, sc],
        swNormals: new Array(5).fill(new Cartesian3(1.0, 0.0, 0.0)),
        swIndices: new Uint16Array([0, 2, 1, 0, 3, 2, 0, 4, 3]),
        swEdgeIndicesWest: new Uint16Array([0, 1]),
        swEdgeIndicesSouth: new Uint16Array([4, 0]),
        swEdgeIndicesEast: new Uint16Array([3, 4]),
        swEdgeIndicesNorth: new Uint16Array([1, 2, 3]),
        nwPositionsCartographic: [cw, nw, nc, extra, cc, swIx],
        nwNormals: new Array(6).fill(new Cartesian3(1.0, 0.0, 0.0)),
        nwIndices: new Uint16Array([0, 5, 1, 1, 3, 2, 1, 5, 3, 3, 5, 4]),
        nwEdgeIndicesWest: new Uint16Array([0, 1]),
        nwEdgeIndicesSouth: new Uint16Array([4, 5, 0]),
        nwEdgeIndicesEast: new Uint16Array([2, 3, 4]),
        nwEdgeIndicesNorth: new Uint16Array([1, 2]),
        sePositionsCartographic: [sc, cc, seIx, ce, se],
        seNormals: new Array(5).fill(new Cartesian3(1.0, 0.0, 0.0)),
        seIndices: new Uint16Array([0, 2, 1, 2, 4, 3, 0, 4, 2]),
        seEdgeIndicesWest: new Uint16Array([0, 1]),
        seEdgeIndicesSouth: new Uint16Array([4, 0]),
        seEdgeIndicesEast: new Uint16Array([3, 4]),
        seEdgeIndicesNorth: new Uint16Array([1, 2, 3]),
        nePositionsCartographic: [cc, extra, nc, ne, ce, seIx],
        neNormals: new Array(6).fill(new Cartesian3(1.0, 0.0, 0.0)),
        neIndices: new Uint16Array([0, 5, 1, 1, 3, 2, 1, 4, 3, 1, 5, 4]),
        neEdgeIndicesWest: new Uint16Array([0, 1, 2]),
        neEdgeIndicesSouth: new Uint16Array([4, 5, 0]),
        neEdgeIndicesEast: new Uint16Array([3, 4]),
        neEdgeIndicesNorth: new Uint16Array([2, 3]),
      });
    });

    it("upsamples an upsampled tile", function () {
      const tilingScheme = new GeographicTilingScheme();
      const tileLevel = 0;
      const tileX = 0;
      const tileY = 0;
      // Southwest-most tile
      const upsampledTileLevel = tileLevel + 1;
      const upsampledTileX = tileX * 2 + 0;
      const upsampledTileY = tileY * 2 + 1;
      // Southwest-most tile
      const doublyUpsampledTileLevel = upsampledTileLevel + 1;
      const doublyUpsampledTileX = upsampledTileX * 2 + 0;
      const doublyUpsampledTileY = upsampledTileY * 2 + 1;
      const rectangle = tilingScheme.tileXYToRectangle(tileX, tileY, tileLevel);
      const sw = new Cartographic(rectangle.west, rectangle.south, 0.0);
      const nw = new Cartographic(rectangle.west, rectangle.north, 1.0);
      const se = new Cartographic(rectangle.east, rectangle.south, 2.0);
      const ne = new Cartographic(rectangle.east, rectangle.north, 3.0);

      const data = createTerrainDataFromScratch({
        tilingScheme: tilingScheme,
        tileLevel: tileLevel,
        tileX: tileX,
        tileY: tileY,
        positionsCartographic: [sw, nw, se, ne],
        normals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        edgeIndicesWest: new Uint16Array([0, 1]),
        edgeIndicesSouth: new Uint16Array([2, 0]),
        edgeIndicesEast: new Uint16Array([3, 2]),
        edgeIndicesNorth: new Uint16Array([1, 3]),
      });

      expect(data.wasCreatedByUpsampling()).toBe(false);
      return data
        .createMesh({
          tilingScheme: tilingScheme,
          x: tileX,
          y: tileY,
          level: tileLevel,
        })
        .then(function () {
          return data
            .upsample(
              tilingScheme,
              tileX,
              tileY,
              tileLevel,
              upsampledTileX,
              upsampledTileY,
              upsampledTileLevel
            )
            .then(function (upsampledTerrainData) {
              expect(upsampledTerrainData.wasCreatedByUpsampling()).toBe(true);
              return upsampledTerrainData
                .createMesh({
                  tilingScheme: tilingScheme,
                  x: upsampledTileX,
                  y: upsampledTileY,
                  level: upsampledTileLevel,
                })
                .then(function () {
                  return upsampledTerrainData
                    .upsample(
                      tilingScheme,
                      upsampledTileX,
                      upsampledTileY,
                      upsampledTileLevel,
                      doublyUpsampledTileX,
                      doublyUpsampledTileY,
                      doublyUpsampledTileLevel
                    )
                    .then(function (doublyUpsampleTerrainData) {
                      expect(
                        doublyUpsampleTerrainData.wasCreatedByUpsampling()
                      ).toBe(true);
                      return doublyUpsampleTerrainData
                        .createMesh({
                          tilingScheme: tilingScheme,
                          x: doublyUpsampledTileX,
                          y: doublyUpsampledTileY,
                          level: doublyUpsampledTileLevel,
                        })
                        .then(function (doublyUpsampledMesh) {
                          const sw2 = sw;
                          const nw2 = lerpCartographic(sw, nw, 0.25);
                          const se2 = lerpCartographic(sw, se, 0.25);
                          const ne2 = lerpCartographic(sw, ne, 0.25);

                          checkMeshGeometry({
                            mesh: doublyUpsampledMesh,
                            positionsCartographic: [sw2, nw2, ne2, se2],
                            normals: new Array(4).fill(
                              new Cartesian3(1.0, 0.0, 0.0)
                            ),
                            indices: new Uint16Array([0, 2, 1, 0, 3, 2]),
                            edgeIndicesWest: new Uint16Array([0, 1]),
                            edgeIndicesSouth: new Uint16Array([3, 0]),
                            edgeIndicesEast: new Uint16Array([2, 3]),
                            edgeIndicesNorth: new Uint16Array([1, 2]),
                            ellipsoid: tilingScheme.ellipsoid,
                          });
                        });
                    });
                });
            });
        });
    });
  });

  describe("createMesh", function () {
    const tilingScheme = new GeographicTilingScheme();
    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const rectangle = tilingScheme.tileXYToRectangle(tileX, tileY, tileLevel);
    const sw = new Cartographic(rectangle.west, rectangle.south, 0.0);
    const nw = new Cartographic(rectangle.west, rectangle.north, 1.0);
    const se = new Cartographic(rectangle.east, rectangle.south, 2.0);
    const ne = new Cartographic(rectangle.east, rectangle.north, 3.0);
    const tilePositionsCartographic = [sw, nw, se, ne];
    const tileNormals = new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0));
    const tileIndices = new Uint16Array([0, 3, 1, 0, 2, 3]);
    const tileEdgeIndicesWest = new Uint16Array([0, 1]);
    const tileEdgeIndicesSouth = new Uint16Array([2, 0]);
    const tileEdgeIndicesEast = new Uint16Array([3, 2]);
    const tileEdgeIndicesNorth = new Uint16Array([1, 3]);

    function createSampleTerrain() {
      return createTerrainDataFromScratch({
        tilingScheme: tilingScheme,
        tileLevel: tileLevel,
        tileX: tileX,
        tileY: tileY,
        positionsCartographic: tilePositionsCartographic,
        normals: tileNormals,
        indices: tileIndices,
        edgeIndicesWest: tileEdgeIndicesWest,
        edgeIndicesSouth: tileEdgeIndicesSouth,
        edgeIndicesEast: tileEdgeIndicesEast,
        edgeIndicesNorth: tileEdgeIndicesNorth,
      });
    }

    it("requires tilingScheme", function () {
      expect(function () {
        const data = createSampleTerrain();
        return data.createMesh({
          tilingScheme: undefined,
          x: tileX,
          y: tileY,
          level: tileLevel,
        });
      }).toThrowDeveloperError();
    });

    it("requires x", function () {
      expect(function () {
        const data = createSampleTerrain();
        return data.createMesh({
          tilingScheme: tilingScheme,
          x: undefined,
          y: tileY,
          level: tileLevel,
        });
      }).toThrowDeveloperError();
    });

    it("requires y", function () {
      expect(function () {
        const data = createSampleTerrain();
        return data.createMesh({
          tilingScheme: tilingScheme,
          x: tileX,
          y: undefined,
          level: tileLevel,
        });
      }).toThrowDeveloperError();
    });

    it("requires level", function () {
      expect(function () {
        const data = createSampleTerrain();
        return data.createMesh({
          tilingScheme: tilingScheme,
          x: tileX,
          y: tileY,
          level: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("creates specified vertices plus skirt vertices", function () {
      const data = createSampleTerrain();
      return data
        .createMesh({
          tilingScheme: tilingScheme,
          x: tileX,
          y: tileY,
          level: tileLevel,
        })
        .then(function (mesh) {
          checkMeshGeometry({
            mesh: mesh,
            positionsCartographic: tilePositionsCartographic,
            normals: tileNormals,
            indices: tileIndices,
            edgeIndicesWest: tileEdgeIndicesWest,
            edgeIndicesSouth: tileEdgeIndicesSouth,
            edgeIndicesEast: tileEdgeIndicesEast,
            edgeIndicesNorth: tileEdgeIndicesNorth,
            ellipsoid: tilingScheme.ellipsoid,
          });
          expect(mesh.minimumHeight).toBe(data._minimumHeight);
          expect(mesh.maximumHeight).toBe(data._maximumHeight);
          expect(mesh.boundingSphere3D).toEqual(data._boundingSphere);
          expect(mesh.orientedBoundingBox).toEqual(data._orientedBoundingBox);
          expect(mesh.occludeePointInScaledSpace).toEqual(
            data._horizonOcclusionPoint
          );
        });
    });

    it("exaggerates mesh", function () {
      const data = createSampleTerrain();
      return data
        .createMesh({
          tilingScheme: tilingScheme,
          x: tileX,
          y: tileY,
          level: tileLevel,
          exaggeration: 2,
        })
        .then(function (mesh) {
          checkMeshGeometry({
            mesh: mesh,
            positionsCartographic: tilePositionsCartographic,
            normals: tileNormals,
            indices: tileIndices,
            edgeIndicesWest: tileEdgeIndicesWest,
            edgeIndicesSouth: tileEdgeIndicesSouth,
            edgeIndicesEast: tileEdgeIndicesEast,
            edgeIndicesNorth: tileEdgeIndicesNorth,
            ellipsoid: tilingScheme.ellipsoid,
          });
          // Even though there's exaggeration, it doesn't affect the mesh's
          // height, bounding sphere, or any other bounding volumes.
          // The exaggeration is instead stored in the mesh's TerrainEncoding
          expect(mesh.encoding.exaggeration).toBe(2);
          expect(mesh.minimumHeight).toBe(data._minimumHeight);
          expect(mesh.maximumHeight).toBe(data._maximumHeight);
          expect(mesh.boundingSphere3D).toEqual(data._boundingSphere);
          expect(mesh.orientedBoundingBox).toEqual(data._orientedBoundingBox);
          expect(mesh.occludeePointInScaledSpace).toEqual(
            data._horizonOcclusionPoint
          );
        });
    });

    it("enables throttling for asynchronous tasks", function () {
      const data = createSampleTerrain();
      const taskCount = TerrainData.maximumAsynchronousTasks + 1;
      const promises = new Array();
      for (let i = 0; i < taskCount; i++) {
        const promise = data.createMesh({
          tilingScheme: tilingScheme,
          x: tileX,
          y: tileY,
          level: tileLevel,
          throttle: true,
        });
        if (defined(promise)) {
          promises.push(promise);
        }
      }
      expect(promises.length).toBe(TerrainData.maximumAsynchronousTasks);
      return Promise.all(promises);
    });

    it("disables throttling for asynchronous tasks", function () {
      const data = createSampleTerrain();
      const taskCount = TerrainData.maximumAsynchronousTasks + 1;
      const promises = new Array();
      for (let i = 0; i < taskCount; i++) {
        const promise = data.createMesh({
          tilingScheme: tilingScheme,
          x: tileX,
          y: tileY,
          level: tileLevel,
          throttle: false,
        });
        if (defined(promise)) {
          promises.push(promise);
        }
      }
      expect(promises.length).toBe(taskCount);
      return Promise.all(promises);
    });
  });

  describe("interpolateHeight", function () {
    const tilingScheme = new GeographicTilingScheme();
    const tileLevel = 5;
    const tileX = 7;
    const tileY = 6;
    const rect = tilingScheme.tileXYToRectangle(tileX, tileY, tileLevel);
    const sw = new Cartographic(rect.west, rect.south, 0.0);
    const nw = new Cartographic(rect.west, rect.north, 1.0);
    const se = new Cartographic(rect.east, rect.south, 2.0);
    const ne = new Cartographic(rect.east, rect.north, 3.0);

    const createMeshOptions = {
      tilingScheme: tilingScheme,
      x: tileX,
      y: tileY,
      level: tileLevel,
    };

    function createSampleTerrainData() {
      return createTerrainDataFromScratch({
        tilingScheme: tilingScheme,
        tileLevel: tileLevel,
        tileX: tileX,
        tileY: tileY,
        positionsCartographic: [sw, nw, se, ne],
        normals: new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0)),
        indices: new Uint16Array([0, 3, 1, 0, 2, 3]),
        edgeIndicesWest: new Uint16Array([0, 1]),
        edgeIndicesSouth: new Uint16Array([2, 0]),
        edgeIndicesEast: new Uint16Array([3, 2]),
        edgeIndicesNorth: new Uint16Array([1, 3]),
      });
    }

    it("cannot interpolate height until mesh has been created", function () {
      const data = createSampleTerrainData();
      const height = data.interpolateHeight(rect, rect.east, rect.south);
      expect(height).toBeUndefined();
    });

    it("clamps coordinates if given a position outside the mesh", function () {
      const data = createSampleTerrainData();
      return data.createMesh(createMeshOptions).then(function () {
        const outside = data.interpolateHeight(rect, 0.0, 0.0);
        const inside = data.interpolateHeight(rect, rect.east, rect.south);
        expect(outside).toBe(inside);
      });
    });

    it("returns a height interpolated from the correct triangle", function () {
      const data = createSampleTerrainData();
      return data.createMesh(createMeshOptions).then(function () {
        let longitude;
        let latitude;
        let height;
        let interpolatedHeight;

        // position in the northwest quadrant of the tile.
        longitude = CesiumMath.lerp(rect.west, rect.east, 0.25);
        latitude = CesiumMath.lerp(rect.south, rect.north, 0.75);
        height = nw.height * 0.5 + sw.height * 0.25 + ne.height * 0.25;
        interpolatedHeight = data.interpolateHeight(rect, longitude, latitude);
        expect(interpolatedHeight).toEqualEpsilon(height, CesiumMath.EPSILON3);

        // position in the southeast quadrant of the tile
        longitude = CesiumMath.lerp(rect.west, rect.east, 0.75);
        latitude = CesiumMath.lerp(rect.south, rect.north, 0.25);
        height = se.height * 0.5 + sw.height * 0.25 + ne.height * 0.25;
        interpolatedHeight = data.interpolateHeight(rect, longitude, latitude);
        expect(interpolatedHeight).toEqualEpsilon(height, CesiumMath.EPSILON3);

        // position on the line between the southwest and northeast corners.
        longitude = CesiumMath.lerp(rect.west, rect.east, 0.5);
        latitude = CesiumMath.lerp(rect.south, rect.north, 0.5);
        height = sw.height * 0.5 + ne.height * 0.5;
        interpolatedHeight = data.interpolateHeight(rect, longitude, latitude);
        expect(interpolatedHeight).toEqualEpsilon(height, CesiumMath.EPSILON3);
      });
    });
  });

  describe("isChildAvailable", function () {
    const level = 5;
    const x = 7;
    const y = 6;

    /**
     * @param {Number} [childTileMask]
     */
    function createSampleTerrainData(childTileMask) {
      const tilingScheme = new GeographicTilingScheme();
      const rect = tilingScheme.tileXYToRectangle(x, y, level);

      const sw = new Cartographic(rect.west, rect.south, 0.0);
      const nw = new Cartographic(rect.west, rect.north, 1.0);
      const se = new Cartographic(rect.east, rect.south, 2.0);
      const ne = new Cartographic(rect.east, rect.north, 3.0);

      const positionsCartographic = [sw, nw, se, ne];
      const normals = new Array(4).fill(new Cartesian3(1.0, 0.0, 0.0));
      const indices = new Uint16Array([0, 3, 1, 0, 2, 3]);
      const edgeIndicesWest = new Uint16Array([0, 1]);
      const edgeIndicesSouth = new Uint16Array([2, 0]);
      const edgeIndicesEast = new Uint16Array([3, 2]);
      const edgeIndicesNorth = new Uint16Array([1, 3]);

      const data = createTerrainDataFromScratch({
        tilingScheme: tilingScheme,
        tileLevel: level,
        tileX: x,
        tileY: y,
        positionsCartographic: positionsCartographic,
        normals: normals,
        indices: indices,
        edgeIndicesWest: edgeIndicesWest,
        edgeIndicesSouth: edgeIndicesSouth,
        edgeIndicesEast: edgeIndicesEast,
        edgeIndicesNorth: edgeIndicesNorth,
        childTileMask: childTileMask,
      });
      return data;
    }

    it("requires thisX", function () {
      expect(function () {
        const childTileMask = 15;
        const terrainData = createSampleTerrainData(childTileMask);
        return terrainData.isChildAvailable(undefined, 0, 0, 0);
      }).toThrowDeveloperError();
    });

    it("requires thisY", function () {
      expect(function () {
        const childTileMask = 15;
        const terrainData = createSampleTerrainData(childTileMask);
        return terrainData.isChildAvailable(0, undefined, 0, 0);
      }).toThrowDeveloperError();
    });

    it("requires childX", function () {
      expect(function () {
        const childTileMask = 15;
        const terrainData = createSampleTerrainData(childTileMask);
        return terrainData.isChildAvailable(0, 0, undefined, 0);
      }).toThrowDeveloperError();
    });

    it("requires childY", function () {
      expect(function () {
        const childTileMask = 15;
        const terrainData = createSampleTerrainData(childTileMask);
        return terrainData.isChildAvailable(0, 0, 0, undefined);
      }).toThrowDeveloperError();
    });

    it("returns true for all children when child mask is not explicitly specified", function () {
      let childTileMask;
      const data = createSampleTerrainData(childTileMask);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 0)).toBe(true);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 0)).toBe(true);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 1)).toBe(true);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 1)).toBe(true);
    });

    it("works when only southwest child is available", function () {
      const childTileMask = 1;
      const data = createSampleTerrainData(childTileMask);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 0)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 0)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 1)).toBe(true);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 1)).toBe(false);
    });

    it("works when only southeast child is available", function () {
      const childTileMask = 2;
      const data = createSampleTerrainData(childTileMask);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 0)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 0)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 1)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 1)).toBe(true);
    });

    it("works when only northwest child is available", function () {
      const childTileMask = 4;
      const data = createSampleTerrainData(childTileMask);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 0)).toBe(true);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 0)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 1)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 1)).toBe(false);
    });

    it("works when only northeast child is available", function () {
      const childTileMask = 8;
      const data = createSampleTerrainData(childTileMask);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 0)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 0)).toBe(true);
      expect(data.isChildAvailable(x, y, x * 2 + 0, y * 2 + 1)).toBe(false);
      expect(data.isChildAvailable(x, y, x * 2 + 1, y * 2 + 1)).toBe(false);
    });
  });
});
