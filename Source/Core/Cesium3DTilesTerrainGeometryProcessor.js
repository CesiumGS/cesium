import MeshoptDecoder from "../ThirdParty/meshoptimizer.js";
import AttributeCompression from "./AttributeCompression.js";
import Axis from "../Scene/Axis.js";
import AxisAlignedBoundingBox from "./AxisAlignedBoundingBox.js";
import binarySearch from "./binarySearch.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import Ellipsoid from "./Ellipsoid.js";
import EllipsoidalOccluder from "./EllipsoidalOccluder.js";
import Matrix4 from "./Matrix4.js";
import mergeSort from "./mergeSort.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import Rectangle from "./Rectangle.js";
import TerrainEncoding from "./TerrainEncoding.js";
import TerrainMesh from "./TerrainMesh.js";
import TerrainProvider from "./TerrainProvider.js";
import Transforms from "./Transforms.js";
import WebMercatorProjection from "./WebMercatorProjection.js";

const scratchMinUV = new Cartesian2();
const scratchMaxUV = new Cartesian2();
const scratchPolygonIndices = new Array(6);
const scratchUvA = new Cartesian2();
const scratchUvB = new Cartesian2();
const scratchUvC = new Cartesian2();
const scratchNormalA = new Cartesian3();
const scratchNormalB = new Cartesian3();
const scratchNormalC = new Cartesian3();
const scratchCenterCartographic = new Cartographic();
const scratchCenterCartographicUpsample = new Cartographic();
const scratchCenterCartesian = new Cartesian3();
const scratchCenterCartesianUpsample = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchCartographicSkirt = new Cartographic();
const scratchCartographicUpsample = new Cartographic();
const scratchPosEcef = new Cartesian3();
const scratchPosEcefSkirt = new Cartesian3();
const scratchPosEcefUpsample = new Cartesian3();
const scratchPosEnu = new Cartesian3();
const scratchPosEnuSkirt = new Cartesian3();
const scratchPosEnuUpsample = new Cartesian3();
const scratchPosLocal = new Cartesian3();
const scratchMinimumPositionENU = new Cartesian3();
const scratchMaximumPositionENU = new Cartesian3();
const scratchMinimumPositionENUSkirt = new Cartesian3();
const scratchMaximumPositionENUSkirt = new Cartesian3();
const scratchMinimumPositionENUUpsample = new Cartesian3();
const scratchMaximumPositionENUUpsample = new Cartesian3();
const scratchEnuToEcef = new Matrix4();
const scratchEnuToEcefUpsample = new Matrix4();
const scratchEcefToEnu = new Matrix4();
const scratchEcefToEnuUpsample = new Matrix4();
const scratchTilesetTransform = new Matrix4();
const scratchUV = new Cartesian2();
const scratchUVSkirt = new Cartesian2();
const scratchUVUpsample = new Cartesian2();
const scratchHorizonOcclusionPoint = new Cartesian3();
const scratchBoundingSphere = new BoundingSphere();
const scratchOrientedBoundingBox = new OrientedBoundingBox();
const scratchAABBEnuSkirt = new AxisAlignedBoundingBox();
const scratchNormal = new Cartesian3();
const scratchNormalUpsample = new Cartesian3();
const scratchNormalOct = new Cartesian2();
const scratchNormalOctSkirt = new Cartesian2();
const scratchNormalOctUpsample = new Cartesian2();
const scratchGeodeticSurfaceNormal = new Cartesian3();
const scratchGeodeticSurfaceNormalSkirt = new Cartesian3();
const scratchGeodeticSurfaceNormalUpsample = new Cartesian3();

/**
 * @param {Object.<string,*>} gltf
 * @returns {Float32Array}
 */
function decodePositions(gltf) {
  let positions;

  const primitive = gltf.meshes[0].primitives[0];
  const accessor = gltf.accessors[primitive.attributes["POSITION"]];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const positionCount = accessor.count;

  const bufferViewMeshOpt = bufferView.extensions
    ? bufferView.extensions["EXT_meshopt_compression"]
    : undefined;
  let buffer;

  if (bufferViewMeshOpt !== undefined) {
    buffer = gltf.buffers[bufferViewMeshOpt.buffer].extras._pipeline.source;

    const compressedBuffer = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset + // offset from the start of the glb
        defaultValue(bufferViewMeshOpt.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      bufferViewMeshOpt.byteLength
    );

    const positionByteLength = bufferViewMeshOpt.byteStride;
    const PositionType = positionByteLength === 4 ? Uint8Array : Uint16Array;
    const positionsResult = new PositionType(positionCount * 4);
    // @ts-ignore
    MeshoptDecoder.decodeVertexBuffer(
      new Uint8Array(positionsResult.buffer),
      positionCount,
      positionByteLength,
      compressedBuffer
    );

    const positionStorageValueMax =
      (1 << (positionsResult.BYTES_PER_ELEMENT * 8)) - 1;
    positions = new Float32Array(positionCount * 3);
    for (let p = 0; p < positionCount; p++) {
      // only the first 3 components are used
      positions[p * 3 + 0] =
        positionsResult[p * 4 + 0] / positionStorageValueMax;
      positions[p * 3 + 1] =
        positionsResult[p * 4 + 1] / positionStorageValueMax;
      positions[p * 3 + 2] =
        positionsResult[p * 4 + 2] / positionStorageValueMax;
      // fourth component is not used
    }
  } else {
    buffer = gltf.buffers[bufferView.buffer].extras._pipeline.source;

    positions = new Float32Array(
      buffer.buffer,
      buffer.byteOffset + // offset from the start of the glb
        defaultValue(bufferView.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      positionCount * 3
    );
  }

  return positions;
}

/**
 * @param {Object.<string,*>} gltf
 * @returns {Float32Array}
 */
function decodeNormals(gltf) {
  let normals;

  const primitive = gltf.meshes[0].primitives[0];
  const accessor = gltf.accessors[primitive.attributes["NORMAL"]];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const normalCount = accessor.count;

  const bufferViewMeshOpt = bufferView.extensions
    ? bufferView.extensions["EXT_meshopt_compression"]
    : undefined;
  let buffer;

  if (bufferViewMeshOpt !== undefined) {
    buffer = gltf.buffers[bufferViewMeshOpt.buffer].extras._pipeline.source;

    const compressedBuffer = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset + // offset from the start of the glb
        defaultValue(bufferViewMeshOpt.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      bufferViewMeshOpt.byteLength
    );

    const normalByteLengh = bufferViewMeshOpt.byteStride;
    const normalsResult = new Int8Array(normalCount * normalByteLengh);

    // @ts-ignore
    MeshoptDecoder.decodeVertexBuffer(
      new Uint8Array(normalsResult.buffer),
      normalCount,
      normalByteLengh,
      compressedBuffer
    );

    normals = new Float32Array(normalCount * 3);
    for (let i = 0; i < normalCount; i++) {
      // AttributeCompression.octDecodeInRange is not compatible with KHR_mesh_quantization, so do the oct decode manually
      // The quantization puts values between -127 and +127, but clamp in case it has -128
      // The third component is unused until normals support non-8-bit quantization
      // The fourth component is always unused
      let octX = Math.max(normalsResult[i * 4 + 0] / 127.0, -1.0);
      let octY = Math.max(normalsResult[i * 4 + 1] / 127.0, -1.0);
      const octZ = 1.0 - (Math.abs(octX) + Math.abs(octY));

      if (octZ < 0.0) {
        const oldX = octX;
        const oldY = octY;
        octX = (1.0 - Math.abs(oldY)) * CesiumMath.signNotZero(oldX);
        octY = (1.0 - Math.abs(oldX)) * CesiumMath.signNotZero(oldY);
      }

      let normal = scratchNormal;
      normal.x = octX;
      normal.y = octY;
      normal.z = octZ;
      normal = Cartesian3.normalize(normal, scratchNormal);

      normals[i * 3 + 0] = normal.x;
      normals[i * 3 + 1] = normal.y;
      normals[i * 3 + 2] = normal.z;
    }
  } else {
    buffer = gltf.buffers[bufferView.buffer].extras._pipeline.source;

    normals = new Float32Array(
      buffer.buffer,
      buffer.byteOffset + // offset from the start of the glb
        defaultValue(bufferView.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      normalCount * 3
    );
  }

  return normals;
}

/**
 * @param {Object.<string,*>} gltf
 * @returns {Uint16Array|Uint32Array}
 */
function decodeIndices(gltf) {
  let indices;

  const primitive = gltf.meshes[0].primitives[0];
  const accessor = gltf.accessors[primitive.indices];
  const bufferView = gltf.bufferViews[accessor.bufferView];

  const indexCount = accessor.count;

  const SizedIndexType =
    accessor.componentType === ComponentDatatype.UNSIGNED_SHORT
      ? Uint16Array
      : Uint32Array;

  const bufferViewMeshOpt = bufferView.extensions
    ? bufferView.extensions["EXT_meshopt_compression"]
    : undefined;
  let buffer;

  if (bufferViewMeshOpt !== undefined) {
    buffer = gltf.buffers[bufferViewMeshOpt.buffer].extras._pipeline.source;
    const compressedBuffer = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset + // offset from the start of the glb
        defaultValue(bufferViewMeshOpt.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      bufferViewMeshOpt.byteLength
    );
    indices = new SizedIndexType(indexCount);

    const indexByteLength = bufferViewMeshOpt.byteStride;
    // @ts-ignore
    MeshoptDecoder.decodeIndexBuffer(
      new Uint8Array(indices.buffer),
      indexCount,
      indexByteLength,
      compressedBuffer
    );
  } else {
    buffer = gltf.buffers[bufferView.buffer].extras._pipeline.source;
    indices = new SizedIndexType(
      buffer.buffer,
      buffer.byteOffset + // offset from the glb
        defaultValue(bufferView.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      indexCount
    );
  }

  return indices;
}

/**
 * @param {Object.<string,*>} gltf
 * @param {String} name
 * @returns {Uint16Array|Uint32Array}
 */
function decodeEdgeIndices(gltf, name) {
  let indices;

  const primitive = gltf.meshes[0].primitives[0];
  const accessor = gltf.accessors[primitive.extensions.CESIUM_tile_edges[name]];
  const bufferView = gltf.bufferViews[accessor.bufferView];

  const indexCount = accessor.count;
  const SizedIndexType =
    accessor.componentType === ComponentDatatype.UNSIGNED_SHORT
      ? Uint16Array
      : Uint32Array;

  const bufferViewMeshOpt = bufferView.extensions
    ? bufferView.extensions["EXT_meshopt_compression"]
    : undefined;
  let buffer;

  if (bufferViewMeshOpt !== undefined) {
    buffer = gltf.buffers[bufferViewMeshOpt.buffer].extras._pipeline.source;

    const compressedBuffer = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset + // offset from the start of the glb
        defaultValue(bufferViewMeshOpt.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      bufferViewMeshOpt.byteLength
    );
    indices = new SizedIndexType(indexCount);

    const indexByteLength = bufferViewMeshOpt.byteStride;
    // @ts-ignore
    MeshoptDecoder.decodeIndexSequence(
      new Uint8Array(indices.buffer),
      indexCount,
      indexByteLength,
      compressedBuffer
    );
  } else {
    buffer = gltf.buffers[bufferView.buffer].extras._pipeline.source;

    indices = new SizedIndexType(
      buffer.buffer,
      buffer.byteOffset + // offset from the glb
        defaultValue(bufferView.byteOffset, 0) +
        defaultValue(accessor.byteOffset, 0),
      indexCount
    );
  }

  return indices;
}

/**
 * @private
 * @typedef GltfInfo
 *
 * @property {Float32Array} positions
 * @property {Float32Array|undefined} normals
 * @property {Uint16Array|Uint32Array} indices
 * @property {Uint16Array|Uint32Array} edgeIndicesWest
 * @property {Uint16Array|Uint32Array} edgeIndicesSouth
 * @property {Uint16Array|Uint32Array} edgeIndicesEast
 * @property {Uint16Array|Uint32Array} edgeIndicesNorth
 */

const scratchGltfInfo = {
  positions: undefined,
  normals: undefined,
  indices: undefined,
  edgeIndicesWest: undefined,
  edgeIndicesSouth: undefined,
  edgeIndicesEast: undefined,
  edgeIndicesNorth: undefined,
};

/**
 * @param {Object.<string,*>} gltf
 * @param {Boolean} hasNormals
 * @param {GltfInfo} result
 * @returns {GltfInfo}
 */
function decodeGltf(gltf, hasNormals, result) {
  result.positions = decodePositions(gltf);
  result.normals = hasNormals ? decodeNormals(gltf) : undefined;
  result.indices = decodeIndices(gltf);
  result.edgeIndicesWest = decodeEdgeIndices(gltf, "left");
  result.edgeIndicesSouth = decodeEdgeIndices(gltf, "bottom");
  result.edgeIndicesEast = decodeEdgeIndices(gltf, "right");
  result.edgeIndicesNorth = decodeEdgeIndices(gltf, "top");
  return result;
}

/**
 * @param {Number} a
 * @param {Number} b
 * @returns {Number}
 */
const sortedEdgeCompare = function (a, b) {
  return a - b;
};

/**
 * Contains functions to create a mesh from 3D Tiles terrain data.
 *
 * @namespace Cesium3DTilesTerrainGeometryProcessor
 *
 * @private
 */
const Cesium3DTilesTerrainGeometryProcessor = {};

/**
 * Creates a {@link TerrainMesh} from this terrain data.
 * @function
 *
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {Ellipsoid} options.ellipsoid
 * @param {Rectangle} options.rectangle
 * @param {Boolean} options.hasVertexNormals
 * @param {Boolean} options.hasWebMercatorT
 * @param {Object.<string,*>} options.gltf
 * @param {Number} options.minimumHeight
 * @param {Number} options.maximumHeight
 * @param {BoundingSphere} options.boundingSphere
 * @param {OrientedBoundingBox} options.orientedBoundingBox
 * @param {Cartesian3} options.horizonOcclusionPoint
 * @param {Number} options.skirtHeight
 * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {Number} [options.exaggerationRelativeHeight=0.0] The height relative to which terrain is exaggerated.
 * @returns {Promise.<TerrainMesh>} A promise to a terrain mesh.
 */
Cesium3DTilesTerrainGeometryProcessor.createMesh = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.ellipsoid", options.ellipsoid);
  Check.typeOf.object("options.rectangle", options.rectangle);
  Check.typeOf.bool("options.hasVertexNormals", options.hasVertexNormals);
  Check.typeOf.bool("options.hasWebMercatorT", options.hasWebMercatorT);
  Check.typeOf.object("options.gltf", options.gltf);
  Check.typeOf.number("options.minimumHeight", options.minimumHeight);
  Check.typeOf.number("options.maximumHeight", options.maximumHeight);
  Check.typeOf.object("options.boundingSphere", options.boundingSphere);
  Check.typeOf.object(
    "options.orientedBoundingBox",
    options.orientedBoundingBox
  );
  Check.typeOf.object(
    "options.horizonOcclusionPoint",
    options.horizonOcclusionPoint
  );
  Check.typeOf.number("options.skirtHeight", options.skirtHeight);
  //>>includeEnd('debug');

  const exaggeration = defaultValue(options.exaggeration, 1.0);
  const exaggerationRelativeHeight = defaultValue(
    options.exaggerationRelativeHeight,
    0.0
  );
  const hasVertexNormals = options.hasVertexNormals;
  const hasWebMercatorT = options.hasWebMercatorT;
  const hasExaggeration = exaggeration !== 1.0;
  const hasGeodeticSurfaceNormals = hasExaggeration;
  const gltf = options.gltf;

  const minimumHeight = options.minimumHeight;
  const maximumHeight = options.maximumHeight;
  const boundingSphere = BoundingSphere.clone(
    options.boundingSphere,
    new BoundingSphere()
  );
  const orientedBoundingBox = OrientedBoundingBox.clone(
    options.orientedBoundingBox,
    new OrientedBoundingBox()
  );
  const horizonOcclusionPoint = Cartesian3.clone(
    options.horizonOcclusionPoint,
    new Cartesian3()
  );
  const skirtHeight = options.skirtHeight;
  const ellipsoid = Ellipsoid.clone(options.ellipsoid, new Ellipsoid());
  const rectangle = Rectangle.clone(options.rectangle, new Rectangle());

  const hasMeshOptCompression =
    gltf.extensionsRequired !== undefined &&
    gltf.extensionsRequired.indexOf("EXT_meshopt_compression") !== -1;

  const decoderPromise = hasMeshOptCompression
    ? MeshoptDecoder.ready
    : Promise.resolve(undefined);

  return decoderPromise.then(function () {
    // @ts-ignore
    const tileMinLongitude = rectangle.west;
    // @ts-ignore
    const tileMinLatitude = rectangle.south;
    // @ts-ignore
    const tileMaxLatitude = rectangle.north;
    // @ts-ignore
    const tileLengthLongitude = rectangle.width;
    // @ts-ignore
    const tileLengthLatitude = rectangle.height;

    const approximateCenterCartographic = Rectangle.center(
      rectangle,
      scratchCenterCartographic
    );
    approximateCenterCartographic.height =
      0.5 * (minimumHeight + maximumHeight);

    const approximateCenterPosition = Cartographic.toCartesian(
      approximateCenterCartographic,
      ellipsoid,
      scratchCenterCartesian
    );

    const enuToEcef = Transforms.eastNorthUpToFixedFrame(
      approximateCenterPosition,
      ellipsoid,
      scratchEnuToEcef
    );
    const ecefToEnu = Matrix4.inverseTransformation(
      enuToEcef,
      scratchEcefToEnu
    );

    let tilesetTransform = Matrix4.unpack(
      gltf.nodes[0].matrix,
      0,
      scratchTilesetTransform
    );

    tilesetTransform = Matrix4.multiply(
      Axis.Y_UP_TO_Z_UP,
      tilesetTransform,
      tilesetTransform
    );

    // @ts-ignore
    const gltfInfo = decodeGltf(gltf, hasVertexNormals, scratchGltfInfo);

    // @ts-ignore
    const skirtVertexCount = TerrainProvider.getSkirtVertexCount(
      gltfInfo.edgeIndicesWest,
      gltfInfo.edgeIndicesSouth,
      gltfInfo.edgeIndicesEast,
      gltfInfo.edgeIndicesNorth
    );

    const positionsLocalWithoutSkirts = gltfInfo.positions;
    const normalsWithoutSkirts = gltfInfo.normals;
    const indicesWithoutSkirts = gltfInfo.indices;
    const vertexCountWithoutSkirts = positionsLocalWithoutSkirts.length / 3;
    const vertexCountWithSkirts = vertexCountWithoutSkirts + skirtVertexCount;
    const indexCountWithoutSkirts = indicesWithoutSkirts.length;
    // @ts-ignore
    const skirtIndexCount = TerrainProvider.getSkirtIndexCountWithFilledCorners(
      skirtVertexCount
    );
    const indexCountWithSkirts = indexCountWithoutSkirts + skirtIndexCount;

    // For consistency with glTF spec, 16 bit index buffer can't contain 65535
    const SizedIndexTypeWithSkirts =
      vertexCountWithSkirts <= 65535 ? Uint16Array : Uint32Array;
    const indexBufferWithSkirts = new SizedIndexTypeWithSkirts(
      indexCountWithSkirts
    );
    indexBufferWithSkirts.set(indicesWithoutSkirts);

    const westIndicesCount = gltfInfo.edgeIndicesWest.length;
    const westIndices = new SizedIndexTypeWithSkirts(westIndicesCount);
    westIndices.set(gltfInfo.edgeIndicesWest);

    const southIndicesCount = gltfInfo.edgeIndicesSouth.length;
    const southIndices = new SizedIndexTypeWithSkirts(southIndicesCount);
    southIndices.set(gltfInfo.edgeIndicesSouth);

    const eastIndicesCount = gltfInfo.edgeIndicesEast.length;
    const eastIndices = new SizedIndexTypeWithSkirts(eastIndicesCount);
    eastIndices.set(gltfInfo.edgeIndicesEast);

    const northIndicesCount = gltfInfo.edgeIndicesNorth.length;
    const northIndices = new SizedIndexTypeWithSkirts(northIndicesCount);
    northIndices.set(gltfInfo.edgeIndicesNorth);

    const sortedWestIndices = new SizedIndexTypeWithSkirts(westIndices.length);
    sortedWestIndices.set(westIndices);
    mergeSort(sortedWestIndices, sortedEdgeCompare);

    const sortedSouthIndices = new SizedIndexTypeWithSkirts(
      southIndices.length
    );
    sortedSouthIndices.set(southIndices);
    mergeSort(sortedSouthIndices, sortedEdgeCompare);

    const sortedEastIndices = new SizedIndexTypeWithSkirts(eastIndices.length);
    sortedEastIndices.set(eastIndices);
    mergeSort(sortedEastIndices, sortedEdgeCompare);

    const sortedNorthIndices = new SizedIndexTypeWithSkirts(
      northIndices.length
    );
    sortedNorthIndices.set(northIndices);
    mergeSort(sortedNorthIndices, sortedEdgeCompare);

    const southMerc = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      tileMinLatitude
    );
    const northMerc = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      tileMaxLatitude
    );

    const oneOverMercatorHeight = 1.0 / (northMerc - southMerc);

    // Use a terrain encoding without quantization.
    // This is just an easier way to save intermediate state

    let minPosEnu = scratchMinimumPositionENU;
    minPosEnu.x = Number.POSITIVE_INFINITY;
    minPosEnu.y = Number.POSITIVE_INFINITY;
    minPosEnu.z = Number.POSITIVE_INFINITY;

    let maxPosEnu = scratchMaximumPositionENU;
    maxPosEnu.x = Number.NEGATIVE_INFINITY;
    maxPosEnu.y = Number.NEGATIVE_INFINITY;
    maxPosEnu.z = Number.NEGATIVE_INFINITY;

    const tempTerrainEncoding = new TerrainEncoding(
      boundingSphere.center,
      undefined,
      undefined,
      undefined,
      undefined,
      hasVertexNormals,
      hasWebMercatorT,
      hasGeodeticSurfaceNormals,
      exaggeration,
      exaggerationRelativeHeight
    );

    const tempBufferStride = tempTerrainEncoding.stride;
    const tempBuffer = new Float32Array(
      vertexCountWithSkirts * tempBufferStride
    );
    let tempBufferOffset = 0;

    for (let i = 0; i < vertexCountWithoutSkirts; i++) {
      const posLocal = Cartesian3.unpack(
        positionsLocalWithoutSkirts,
        i * 3,
        scratchPosLocal
      );

      const posECEF = Matrix4.multiplyByPoint(
        tilesetTransform,
        posLocal,
        scratchPosEcef
      );

      const cartographic = Cartographic.fromCartesian(
        posECEF,
        ellipsoid,
        scratchCartographic
      );

      const longitude = cartographic.longitude;
      const latitude = cartographic.latitude;
      const height = cartographic.height;

      // If a vertex is an edge vertex we already know its exact UV and don't need to derive it from the position (which can have accuracy issues).

      let u = (longitude - tileMinLongitude) / tileLengthLongitude;
      let v = (latitude - tileMinLatitude) / tileLengthLatitude;

      // Clamp the UVs to the valid range
      // This should only happen when the cartesian to cartographic conversion introduces error on a point that is already very close the edge
      u = CesiumMath.clamp(u, 0.0, 1.0);
      v = CesiumMath.clamp(v, 0.0, 1.0);

      if (binarySearch(sortedWestIndices, i, sortedEdgeCompare) >= 0) {
        u = 0.0;
      } else if (binarySearch(sortedEastIndices, i, sortedEdgeCompare) >= 0) {
        u = 1.0;
      }

      if (binarySearch(sortedSouthIndices, i, sortedEdgeCompare) >= 0) {
        v = 0.0;
      } else if (binarySearch(sortedNorthIndices, i, sortedEdgeCompare) >= 0) {
        v = 1.0;
      }

      const uv = Cartesian2.fromElements(u, v, scratchUV);

      let normalOct;
      if (hasVertexNormals) {
        const normal = scratchNormal;
        // @ts-ignore
        normal.x = normalsWithoutSkirts[i * 3 + 0];
        // @ts-ignore
        normal.y = normalsWithoutSkirts[i * 3 + 1];
        // @ts-ignore
        normal.z = normalsWithoutSkirts[i * 3 + 2];
        normalOct = AttributeCompression.octEncode(normal, scratchNormalOct);
      }

      let webMercatorT;
      if (hasWebMercatorT) {
        const mercatorAngle = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
          latitude
        );
        webMercatorT = (mercatorAngle - southMerc) * oneOverMercatorHeight;
      }

      let geodeticSurfaceNormal;
      if (hasGeodeticSurfaceNormals) {
        geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
          posECEF,
          scratchGeodeticSurfaceNormal
        );
      }

      tempBufferOffset = tempTerrainEncoding.encode(
        tempBuffer,
        tempBufferOffset,
        posECEF,
        uv,
        height,
        normalOct,
        webMercatorT,
        geodeticSurfaceNormal
      );

      const posEnu = Matrix4.multiplyByPoint(ecefToEnu, posECEF, scratchPosEnu);
      minPosEnu = Cartesian3.minimumByComponent(posEnu, minPosEnu, minPosEnu);
      maxPosEnu = Cartesian3.maximumByComponent(posEnu, maxPosEnu, maxPosEnu);
    }

    const mesh = new TerrainMesh(
      Cartesian3.clone(tempTerrainEncoding.center, new Cartesian3()),
      tempBuffer,
      indexBufferWithSkirts,
      indexCountWithoutSkirts,
      vertexCountWithoutSkirts,
      minimumHeight,
      maximumHeight,
      BoundingSphere.clone(boundingSphere, new BoundingSphere()),
      Cartesian3.clone(horizonOcclusionPoint, new Cartesian3()),
      tempBufferStride,
      OrientedBoundingBox.clone(orientedBoundingBox, new OrientedBoundingBox()),
      tempTerrainEncoding,
      westIndices,
      southIndices,
      eastIndices,
      northIndices
    );

    addSkirtsToMesh(
      mesh,
      rectangle,
      ellipsoid,
      minPosEnu,
      maxPosEnu,
      enuToEcef,
      ecefToEnu,
      skirtHeight
    );

    return Promise.resolve(mesh);
  });
};

/**
 * @private
 * @param {Object} options
 * @param {Boolean} options.isEastChild
 * @param {Boolean} options.isNorthChild
 * @param {Rectangle} options.rectangle
 * @param {Ellipsoid} options.ellipsoid
 * @param {Number} options.skirtHeight
 * @param {Float32Array} options.parentVertices
 * @param {Uint8Array|Uint16Array|Uint32Array} options.parentIndices
 * @param {Number} options.parentVertexCountWithoutSkirts
 * @param {Number} options.parentIndexCountWithoutSkirts
 * @param {Number} options.parentMinimumHeight
 * @param {Number} options.parentMaximumHeight
 * @param {TerrainEncoding} options.parentEncoding
 * @returns {TerrainMesh}
 */
Cesium3DTilesTerrainGeometryProcessor.upsampleMesh = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug)
  Check.typeOf.bool("options.isEastChild", options.isEastChild);
  Check.typeOf.bool("options.isNorthChild", options.isNorthChild);
  Check.typeOf.object("options.parentVertices", options.parentVertices);
  Check.typeOf.object("options.parentIndices", options.parentIndices);
  Check.typeOf.number(
    "options.parentVertexCountWithoutSkirts",
    options.parentVertexCountWithoutSkirts
  );
  Check.typeOf.number(
    "options.parentIndexCountWithoutSkirts",
    options.parentIndexCountWithoutSkirts
  );
  Check.typeOf.number(
    "options.parentMinimumHeight",
    options.parentMinimumHeight
  );
  Check.typeOf.number(
    "options.parentMaximumHeight",
    options.parentMaximumHeight
  );
  Check.typeOf.object("options.parentEncoding", options.parentEncoding);
  Check.typeOf.object("options.rectangle", options.rectangle);
  Check.typeOf.number("options.skirtHeight", options.skirtHeight);
  Check.typeOf.object("options.ellipsoid", options.ellipsoid);
  //>>includeEnd('debug');

  // Overview: Only include triangles that are inside the UV clipping region. If a triangle is partly outside, it will be clipped at the border. The clipping function returns a polygon where each point is a barcentric coordinate of the input triangle. Most of the time the triangle will not be clipped, so the polygon will be the three barycentric coordinates of the input triangle. If the triangle is completely outside the clipping region, the polygon will have no points and will be ignored. If the triangle is clipped, the polygon will have between four and six points and needs to be trianglulated. Vertex data for points that fall inside the triangle will be interpolated using the barycentric coordinates. Each vertex in the polygon is added to the new vertex list, with some special handling to avoid duplicate points between triangles.

  const indexCount = options.parentIndexCountWithoutSkirts;
  const indices = options.parentIndices;
  const vertexCount = options.parentVertexCountWithoutSkirts;
  const vertexBuffer = options.parentVertices;
  const encoding = TerrainEncoding.clone(
    options.parentEncoding,
    new TerrainEncoding()
  );
  const hasVertexNormals = encoding.hasVertexNormals;
  const hasWebMercatorT = encoding.hasWebMercatorT;
  const exaggeration = encoding.exaggeration;
  const exaggerationRelativeHeight = encoding.exaggerationRelativeHeight;
  const hasExaggeration = exaggeration !== 1.0;
  const hasGeodeticSurfaceNormals = hasExaggeration;
  const isEastChild = options.isEastChild;
  const isNorthChild = options.isNorthChild;
  const upsampleRectangle = Rectangle.clone(options.rectangle, new Rectangle());
  const parentMinimumHeight = options.parentMinimumHeight;
  const parentMaximumHeight = options.parentMaximumHeight;
  const ellipsoid = Ellipsoid.clone(options.ellipsoid);
  const skirtHeight = options.skirtHeight;

  /** @type Number[] */
  const upsampledTriIDs = [];
  /** @type Number[] */
  const upsampledUVs = [];
  /** @type Number[] */
  const upsampledBarys = [];
  /** @type Number[] */
  const upsampledIndices = [];
  /** @type Number[] */
  const upsampledWestIndices = [];
  /** @type Number[] */
  const upsampledSouthIndices = [];
  /** @type Number[] */
  const upsampledEastIndices = [];
  /** @type Number[] */
  const upsampledNorthIndices = [];

  clipTileFromQuadrant(
    isEastChild,
    isNorthChild,
    indexCount,
    indices,
    vertexCount,
    vertexBuffer,
    encoding,
    upsampledIndices,
    upsampledWestIndices,
    upsampledSouthIndices,
    upsampledEastIndices,
    upsampledNorthIndices,
    upsampledTriIDs,
    upsampledBarys,
    upsampledUVs
  );

  // Don't know the min and max height of the upsampled positions yet, so calculate a center point from the parent's min and max height
  const approximateCenterCartographic = Rectangle.center(
    upsampleRectangle,
    scratchCenterCartographicUpsample
  );
  approximateCenterCartographic.height =
    0.5 * (parentMinimumHeight + parentMaximumHeight);
  const approximateCenterPosition = Cartographic.toCartesian(
    approximateCenterCartographic,
    ellipsoid,
    scratchCenterCartesianUpsample
  );

  const upsampledVertexCountWithoutSkirts = upsampledTriIDs.length;
  const upsampledTerrainEncoding = new TerrainEncoding(
    approximateCenterPosition,
    undefined,
    undefined,
    undefined,
    undefined,
    hasVertexNormals,
    hasWebMercatorT,
    hasGeodeticSurfaceNormals,
    exaggeration,
    exaggerationRelativeHeight
  );
  const upsampledVertexBufferStride = upsampledTerrainEncoding.stride;

  // @ts-ignore
  const upsampledSkirtVertexCount = TerrainProvider.getSkirtVertexCount(
    upsampledWestIndices,
    upsampledSouthIndices,
    upsampledEastIndices,
    upsampledNorthIndices
  );
  const upsampledVertexCountWithSkirts =
    upsampledVertexCountWithoutSkirts + upsampledSkirtVertexCount;
  const upsampledIndexCountWithoutSkirts = upsampledIndices.length;
  // @ts-ignore
  const upsampledSkirtIndexCount = TerrainProvider.getSkirtIndexCountWithFilledCorners(
    upsampledSkirtVertexCount
  );
  const upsampledIndexCountWithSkirts =
    upsampledIndexCountWithoutSkirts + upsampledSkirtIndexCount;
  // For consistency with glTF spec, 16 bit index buffer can't contain 65535
  const SizedIndexTypeWithSkirts =
    upsampledVertexCountWithSkirts <= 65535 ? Uint16Array : Uint32Array;
  const upsampledIndexBuffer = new SizedIndexTypeWithSkirts(
    upsampledIndexCountWithSkirts
  );
  upsampledIndexBuffer.set(upsampledIndices);

  const upsampledWestIndicesBuffer = new SizedIndexTypeWithSkirts(
    upsampledWestIndices.length
  );
  upsampledWestIndicesBuffer.set(upsampledWestIndices);

  const upsampledSouthIndicesBuffer = new SizedIndexTypeWithSkirts(
    upsampledSouthIndices.length
  );
  upsampledSouthIndicesBuffer.set(upsampledSouthIndices);

  const upsampledEastIndicesBuffer = new SizedIndexTypeWithSkirts(
    upsampledEastIndices.length
  );
  upsampledEastIndicesBuffer.set(upsampledEastIndices);

  const upsampledNorthIndicesBuffer = new SizedIndexTypeWithSkirts(
    upsampledNorthIndices.length
  );
  upsampledNorthIndicesBuffer.set(upsampledNorthIndices);

  const upsampledVertexBuffer = new Float32Array(
    upsampledVertexCountWithSkirts * upsampledVertexBufferStride
  );
  let upsampledVertexBufferOffset = 0;

  const enuToEcef = Transforms.eastNorthUpToFixedFrame(
    approximateCenterPosition,
    ellipsoid,
    scratchEnuToEcefUpsample
  );
  const ecefToEnu = Matrix4.inverseTransformation(
    enuToEcef,
    scratchEcefToEnuUpsample
  );

  const minimumLongitude = upsampleRectangle.west;
  const maximumLongitude = upsampleRectangle.east;
  const minimumLatitude = upsampleRectangle.south;
  const maximumLatitude = upsampleRectangle.north;

  const southMerc = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
    minimumLatitude
  );
  const northMerc = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
    maximumLatitude
  );
  const oneOverMercatorHeight = 1.0 / (northMerc - southMerc);

  let minimumHeight = Number.POSITIVE_INFINITY;
  let maximumHeight = Number.NEGATIVE_INFINITY;

  let minPosEnu = scratchMinimumPositionENUUpsample;
  minPosEnu.x = Number.POSITIVE_INFINITY;
  minPosEnu.y = Number.POSITIVE_INFINITY;
  minPosEnu.z = Number.POSITIVE_INFINITY;

  let maxPosEnu = scratchMaximumPositionENUUpsample;
  maxPosEnu.x = Number.NEGATIVE_INFINITY;
  maxPosEnu.y = Number.NEGATIVE_INFINITY;
  maxPosEnu.z = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < upsampledVertexCountWithoutSkirts; i++) {
    const triId = upsampledTriIDs[i];
    const indexA = indices[triId * 3 + 0];
    const indexB = indices[triId * 3 + 1];
    const indexC = indices[triId * 3 + 2];

    const uv = scratchUVUpsample;
    uv.x = upsampledUVs[i * 2 + 0];
    uv.y = upsampledUVs[i * 2 + 1];
    const u = uv.x;
    const v = uv.y;

    const baryA = upsampledBarys[i * 2 + 0];
    const baryB = upsampledBarys[i * 2 + 1];
    const baryC = 1.0 - baryA - baryB;

    const heightA = encoding.decodeHeight(vertexBuffer, indexA);
    const heightB = encoding.decodeHeight(vertexBuffer, indexB);
    const heightC = encoding.decodeHeight(vertexBuffer, indexC);

    const height = heightA * baryA + heightB * baryB + heightC * baryC;
    minimumHeight = Math.min(height, minimumHeight);
    maximumHeight = Math.max(height, maximumHeight);

    const lon = CesiumMath.lerp(minimumLongitude, maximumLongitude, u);
    const lat = CesiumMath.lerp(minimumLatitude, maximumLatitude, v);
    const carto = Cartographic.fromRadians(
      lon,
      lat,
      height,
      scratchCartographicUpsample
    );
    const position = Cartographic.toCartesian(
      carto,
      ellipsoid,
      scratchPosEcefUpsample
    );

    const posEnu = Matrix4.multiplyByPoint(
      ecefToEnu,
      position,
      scratchPosEnuUpsample
    );
    minPosEnu = Cartesian3.minimumByComponent(posEnu, minPosEnu, minPosEnu);
    maxPosEnu = Cartesian3.maximumByComponent(posEnu, maxPosEnu, maxPosEnu);

    let normalOct;
    if (hasVertexNormals) {
      const normalA = encoding.decodeNormal(
        vertexBuffer,
        indexA,
        scratchNormalA
      );
      const normalB = encoding.decodeNormal(
        vertexBuffer,
        indexB,
        scratchNormalB
      );
      const normalC = encoding.decodeNormal(
        vertexBuffer,
        indexC,
        scratchNormalC
      );

      let normal = Cartesian3.fromElements(
        normalA.x * baryA + normalB.x * baryB + normalC.x * baryC,
        normalA.y * baryA + normalB.y * baryB + normalC.y * baryC,
        normalA.z * baryA + normalB.z * baryB + normalC.z * baryC,
        scratchNormalUpsample
      );
      normal = Cartesian3.normalize(normal, scratchNormalUpsample);
      normalOct = AttributeCompression.octEncode(
        normal,
        scratchNormalOctUpsample
      );
    }

    let webMercatorT;
    if (hasWebMercatorT) {
      const mercatorAngle = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
        lat
      );
      webMercatorT = (mercatorAngle - southMerc) * oneOverMercatorHeight;
    }

    let geodeticSurfaceNormal;
    if (hasGeodeticSurfaceNormals) {
      geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
        position,
        scratchGeodeticSurfaceNormalUpsample
      );
    }

    upsampledVertexBufferOffset = upsampledTerrainEncoding.encode(
      upsampledVertexBuffer,
      upsampledVertexBufferOffset,
      position,
      uv,
      height,
      normalOct,
      webMercatorT,
      geodeticSurfaceNormal
    );
  }

  // Now generate the more tight-fitting bounding volumes that are used for culling and other things
  const orientedBoundingBox = OrientedBoundingBox.fromRectangle(
    upsampleRectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid,
    scratchOrientedBoundingBox
  );
  const boundingSphere = BoundingSphere.fromVertices(
    upsampledVertexBuffer,
    upsampledTerrainEncoding.center,
    upsampledVertexBufferStride,
    scratchBoundingSphere
  );
  const occluder = new EllipsoidalOccluder(ellipsoid);
  const horizonOcclusionPoint = occluder.computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid(
    upsampledTerrainEncoding.center, // vector from ellipsoid center to horizon occlusion point
    upsampledVertexBuffer,
    upsampledVertexBufferStride,
    upsampledTerrainEncoding.center,
    minimumHeight,
    scratchHorizonOcclusionPoint
  );

  const upsampledMesh = new TerrainMesh(
    Cartesian3.clone(upsampledTerrainEncoding.center, new Cartesian3()),
    upsampledVertexBuffer,
    upsampledIndexBuffer,
    upsampledIndexCountWithoutSkirts,
    upsampledVertexCountWithoutSkirts,
    minimumHeight,
    maximumHeight,
    BoundingSphere.clone(boundingSphere),
    Cartesian3.clone(horizonOcclusionPoint),
    upsampledVertexBufferStride,
    OrientedBoundingBox.clone(orientedBoundingBox),
    upsampledTerrainEncoding,
    upsampledWestIndicesBuffer,
    upsampledSouthIndicesBuffer,
    upsampledEastIndicesBuffer,
    upsampledNorthIndicesBuffer
  );

  addSkirtsToMesh(
    upsampledMesh,
    upsampleRectangle,
    ellipsoid,
    minPosEnu,
    maxPosEnu,
    enuToEcef,
    ecefToEnu,
    skirtHeight
  );

  return upsampledMesh;
};

/**
 * Helper function that adds skirts to a TerrainMesh. The mesh's vertex and index
 * buffers are expected to be pre-allocated to fit the skirts.
 * The mesh's vertex buffer must have quantization disabled.
 * If the final quantization changes, a new vertex buffer will be allocated using the new quantization.
 * Currently skirts do not affect the tile's bounding volume.
 * @private
 * @param {TerrainMesh} mesh
 * @param {Rectangle} rectangle
 * @param {Ellipsoid} ellipsoid
 * @param {Cartesian3} enuMinimum
 * @param {Cartesian3} enuMaximum
 * @param {Matrix4} enuToEcef
 * @param {Matrix4} ecefToEnu
 * @param {Number} skirtHeight
 */
function addSkirtsToMesh(
  mesh,
  rectangle,
  ellipsoid,
  enuMinimum,
  enuMaximum,
  enuToEcef,
  ecefToEnu,
  skirtHeight
) {
  const encoding = mesh.encoding;
  const vertexStride = encoding.stride;
  const vertexBuffer = mesh.vertices;
  const hasVertexNormals = encoding.hasVertexNormals;
  const hasWebMercatorT = encoding.hasWebMercatorT;
  const exaggeration = encoding.exaggeration;
  const exaggerationRelativeHeight = encoding.exaggerationRelativeHeight;
  const hasExaggeration = exaggeration !== 1.0;
  const hasGeodeticSurfaceNormals = hasExaggeration;

  const vertexCountWithoutSkirts = mesh.vertexCountWithoutSkirts;
  let vertexBufferOffset = vertexCountWithoutSkirts * vertexStride;
  const vertexCountWithSkirts = vertexBuffer.length / vertexStride;
  const skirtVertexCount = vertexCountWithSkirts - vertexCountWithoutSkirts;
  const indices = mesh.indices;
  const indexCountWithoutSkirts = mesh.indexCountWithoutSkirts;

  const westIndices = mesh.westIndicesSouthToNorth;
  const southIndices = mesh.southIndicesEastToWest;
  const eastIndices = mesh.eastIndicesNorthToSouth;
  const northIndices = mesh.northIndicesWestToEast;

  // @ts-ignore
  TerrainProvider.addSkirtIndicesWithFilledCorners(
    westIndices,
    southIndices,
    eastIndices,
    northIndices,
    vertexCountWithoutSkirts,
    indices,
    indexCountWithoutSkirts
  );

  const westOffset = 0;
  const southOffset = westOffset + westIndices.length;
  const eastOffset = southOffset + southIndices.length;
  const northOffset = eastOffset + eastIndices.length;
  const edges = [westIndices, southIndices, eastIndices, northIndices];
  const edgeIndexOffset = [westOffset, southOffset, eastOffset, northOffset];
  const edgeLongitudeSign = [-1.0, 0.0, +1.0, 0.0];
  const edgeLatitudeSign = [0.0, -1.0, 0.0, +1.0];

  const minimumPositionENUWithSkirts = Cartesian3.clone(
    enuMinimum,
    scratchMinimumPositionENUSkirt
  );
  const maximumPositionENUWithSkirts = Cartesian3.clone(
    enuMaximum,
    scratchMaximumPositionENUSkirt
  );
  const maximumHeight = mesh.maximumHeight;
  const minimumHeightWithSkirts = mesh.minimumHeight - skirtHeight;
  for (let skirtId = 0; skirtId < skirtVertexCount; skirtId++) {
    let side = 0;
    for (side = 0; side < 3; side++) {
      if (skirtId < edgeIndexOffset[side + 1]) {
        break;
      }
    }
    const vertexIndex = edges[side][skirtId - edgeIndexOffset[side]];

    const uv = encoding.decodeTextureCoordinates(
      vertexBuffer,
      vertexIndex,
      scratchUVSkirt
    );

    const skirtLonLatOffsetPercent = 0.0001;
    const longitudeT =
      uv.x + edgeLongitudeSign[side] * skirtLonLatOffsetPercent;
    const latitudeT = uv.y + edgeLatitudeSign[side] * skirtLonLatOffsetPercent;

    const longitude = CesiumMath.lerp(
      rectangle.west,
      rectangle.east,
      longitudeT
    );
    // Don't offset the skirt past the poles, it will screw up the cartographic -> cartesian
    const latitude = CesiumMath.clamp(
      CesiumMath.lerp(rectangle.south, rectangle.north, latitudeT),
      -CesiumMath.PI_OVER_TWO,
      +CesiumMath.PI_OVER_TWO
    );

    const vertHeight = encoding.decodeHeight(vertexBuffer, vertexIndex);
    const height = vertHeight - skirtHeight;

    const cartographic = Cartographic.fromRadians(
      longitude,
      latitude,
      height,
      scratchCartographicSkirt
    );

    const positionEcef = Cartographic.toCartesian(
      cartographic,
      ellipsoid,
      scratchPosEcefSkirt
    );

    let normalOct;
    if (hasVertexNormals) {
      normalOct = encoding.getOctEncodedNormal(
        vertexBuffer,
        vertexIndex,
        scratchNormalOctSkirt
      );
    }

    let webMercatorT;
    if (hasWebMercatorT) {
      webMercatorT = encoding.decodeWebMercatorT(vertexBuffer, vertexIndex);
    }

    let geodeticSurfaceNormal;
    if (hasGeodeticSurfaceNormals) {
      geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
        positionEcef,
        scratchGeodeticSurfaceNormalSkirt
      );
    }

    vertexBufferOffset = encoding.encode(
      vertexBuffer,
      vertexBufferOffset,
      positionEcef,
      uv,
      height,
      normalOct,
      webMercatorT,
      geodeticSurfaceNormal
    );

    const positionENU = Matrix4.multiplyByPoint(
      ecefToEnu,
      positionEcef,
      scratchPosEnuSkirt
    );
    Cartesian3.minimumByComponent(
      positionENU,
      minimumPositionENUWithSkirts,
      minimumPositionENUWithSkirts
    );
    Cartesian3.maximumByComponent(
      positionENU,
      maximumPositionENUWithSkirts,
      maximumPositionENUWithSkirts
    );
  }

  const aabbEnuWithSkirts = AxisAlignedBoundingBox.fromCorners(
    minimumPositionENUWithSkirts,
    maximumPositionENUWithSkirts,
    scratchAABBEnuSkirt
  );

  // Check if the final terrain encoding has a different quantization. If so,
  // the vertices need to be re-encoded with the new quantization. Otherwise,
  // use the vertex buffer as-is.
  const encodingWithSkirts = new TerrainEncoding(
    encoding.center,
    aabbEnuWithSkirts,
    minimumHeightWithSkirts,
    maximumHeight,
    enuToEcef,
    encoding.hasVertexNormals,
    encoding.hasWebMercatorT,
    hasGeodeticSurfaceNormals,
    exaggeration,
    exaggerationRelativeHeight
  );
  if (encoding.quantization !== encodingWithSkirts.quantization) {
    const finalEncoding = encodingWithSkirts;
    const finalVertexStride = finalEncoding.stride;
    const finalVertexBuffer = new Float32Array(
      vertexCountWithSkirts * finalVertexStride
    );
    let finalVertexBufferOffset = 0;
    for (let i = 0; i < vertexCountWithSkirts; i++) {
      finalVertexBufferOffset = finalEncoding.encode(
        finalVertexBuffer,
        finalVertexBufferOffset,
        encoding.decodePosition(vertexBuffer, i, scratchPosEcefSkirt),
        encoding.decodeTextureCoordinates(vertexBuffer, i, scratchUVSkirt),
        encoding.decodeHeight(vertexBuffer, i),
        encoding.hasVertexNormals
          ? encoding.getOctEncodedNormal(vertexBuffer, i, scratchNormalOctSkirt)
          : undefined,
        encoding.hasWebMercatorT
          ? encoding.decodeWebMercatorT(vertexBuffer, i)
          : undefined,
        encoding.hasGeodeticSurfaceNormals
          ? encoding.decodeGeodeticSurfaceNormal(
              vertexBuffer,
              i,
              scratchGeodeticSurfaceNormalSkirt
            )
          : undefined
      );
    }
    mesh.vertices = finalVertexBuffer;
    mesh.stride = finalVertexStride;
    mesh.encoding = finalEncoding;
  }

  return mesh;
}

const EDGE_ID_LEFT = 0;
const EDGE_ID_TOP = 1;
const EDGE_ID_RIGHT = 2;
const EDGE_ID_BOTTOM = 3;
const EDGE_COUNT = 4;

const scratchIntersection = new Cartesian3();

const scratchInBarys = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];
const scratchInPoints = [
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
];

const scratchOutBarys = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];
const scratchOutPoints = [
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
  new Cartesian2(),
];

/**
 * @private
 * @param {Cartesian2} boxMinimum
 * @param {Cartesian2} boxMaximum
 * @param {Number} edgeId
 * @param {Cartesian2} p
 * @returns {Number}
 */
function inside(boxMinimum, boxMaximum, edgeId, p) {
  switch (edgeId) {
    case EDGE_ID_LEFT:
      return CesiumMath.sign(p.x - boxMinimum.x);
    case EDGE_ID_RIGHT:
      return CesiumMath.sign(boxMaximum.x - p.x);
    case EDGE_ID_BOTTOM:
      return CesiumMath.sign(p.y - boxMinimum.y);
    default:
      // EDGE_ID_TOP
      return CesiumMath.sign(boxMaximum.y - p.y);
  }
}

/**
 * @private
 * @param {Cartesian2} boxMinimum
 * @param {Cartesian2} boxMaximum
 * @param {Number} edgeId
 * @param {Cartesian2} a
 * @param {Cartesian2} b
 * @param {Cartesian3} result
 * @returns {Cartesian3}
 */
function intersect(boxMinimum, boxMaximum, edgeId, a, b, result) {
  let t, intersectX, intersectY;
  switch (edgeId) {
    case EDGE_ID_LEFT:
      t = (boxMinimum.x - a.x) / (b.x - a.x);
      intersectX = boxMinimum.x;
      intersectY = a.y + (b.y - a.y) * t;
      break;
    case EDGE_ID_RIGHT:
      t = (boxMaximum.x - a.x) / (b.x - a.x);
      intersectX = boxMaximum.x;
      intersectY = a.y + (b.y - a.y) * t;
      break;
    case EDGE_ID_BOTTOM:
      t = (boxMinimum.y - a.y) / (b.y - a.y);
      intersectX = a.x + (b.x - a.x) * t;
      intersectY = boxMinimum.y;
      break;
    default:
      // EDGE_ID_TOP
      t = (boxMaximum.y - a.y) / (b.y - a.y);
      intersectX = a.x + (b.x - a.x) * t;
      intersectY = boxMaximum.y;
      break;
  }
  return Cartesian3.fromElements(intersectX, intersectY, t, result);
}

/**
 * @private
 * @typedef PolygonResult
 *
 * @property {Number} length
 * @property {Cartesian2[]} coordinates A pre-allocated array of six 2D coordinates.
 * @property {Cartesian3[]} barycentricCoordinates A pre-allocated array of six barycentric coordinates.
 */

/**
 * @private
 * @type {PolygonResult}
 */
const scratchPolygon = {
  length: 0,
  coordinates: [
    new Cartesian2(),
    new Cartesian2(),
    new Cartesian2(),
    new Cartesian2(),
    new Cartesian2(),
    new Cartesian2(),
  ],
  barycentricCoordinates: [
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
  ],
};

/**
 * Clips a 2D triangle against axis-aligned edges of a box using the Sutherland-Hodgman
 * clipping algorithm. The resulting polygon will have between 0 and 6 vertices.
 *
 * @private
 * @param {Number} edgeStart The first edge to clip against.
 * @param {Number} edgeCount The number of edges to clip against, starting from edgeStart.
 * @param {Cartesian2} boxMinimum The bottom-left corner of the axis-aligned box.
 * @param {Cartesian2} boxMaximum The top-right corner of the axis-aligned box.
 * @param {Cartesian2} p0 The coordinates of the first vertex in the triangle, in counter-clockwise order.
 * @param {Cartesian2} p1 The coordinates of the second vertex in the triangle, in counter-clockwise order.
 * @param {Cartesian2} p2 The coordinates of the third vertex in the triangle, in counter-clockwise order.
 * @param {PolygonResult} result The object into which to copy the result.
 * @returns {PolygonResult} The polygon that results after the clip, specified as a list of coordinates in counter-clockwise order.
 */
function clipTriangleAgainstBoxEdgeRange(
  edgeStart,
  edgeCount,
  boxMinimum,
  boxMaximum,
  p0,
  p1,
  p2,
  result
) {
  let inputLength = 0;
  let inputPoints = scratchInPoints;
  let inputBarys = scratchInBarys;

  let outputLength = 3;
  let outputPoints = scratchOutPoints;
  Cartesian2.clone(p0, outputPoints[0]);
  Cartesian2.clone(p1, outputPoints[1]);
  Cartesian2.clone(p2, outputPoints[2]);

  let outputBarys = scratchOutBarys;
  Cartesian3.fromElements(1, 0, 0, outputBarys[0]);
  Cartesian3.fromElements(0, 1, 0, outputBarys[1]);
  Cartesian3.fromElements(0, 0, 1, outputBarys[2]);

  // Loop over the clip window edges
  for (let e = 0; e < edgeCount; e++) {
    const edgeId = (edgeStart + e) % EDGE_COUNT;

    // Swap the input and output arrays
    const tempPoints = inputPoints;
    const tempBarys = inputBarys;

    inputPoints = outputPoints;
    inputBarys = outputBarys;
    inputLength = outputLength;

    outputPoints = tempPoints;
    outputBarys = tempBarys;
    outputLength = 0;

    // Check each polygon edge against each clip window edge
    let prevIdx = inputLength - 1;
    let prevPoint = inputPoints[prevIdx];
    let prevBary = inputBarys[prevIdx];
    let prevInside = inside(boxMinimum, boxMaximum, edgeId, prevPoint);

    for (let currIdx = 0; currIdx < inputLength; currIdx++) {
      const currPoint = inputPoints[currIdx];
      const currBary = inputBarys[currIdx];
      const currInside = inside(boxMinimum, boxMaximum, edgeId, currPoint);

      // Check if the two points are on opposite sides of the edge.
      // If so, there's an intersection, and a new point is created.
      if (prevInside * currInside === -1) {
        const intersection = intersect(
          boxMinimum,
          boxMaximum,
          edgeId,
          prevPoint,
          currPoint,
          scratchIntersection
        );
        const x = intersection.x;
        const y = intersection.y;
        const t = intersection.z;
        const tInv = 1.0 - t;

        // Interpolate the barycentric coordinates
        const baryA = prevBary.x * tInv + currBary.x * t;
        const baryB = prevBary.y * tInv + currBary.y * t;
        const baryC = prevBary.z * tInv + currBary.z * t;

        Cartesian2.fromElements(x, y, outputPoints[outputLength]);
        Cartesian3.fromElements(baryA, baryB, baryC, outputBarys[outputLength]);
        outputLength++;
      }

      // If the second point is on or inside, add it
      if (currInside >= 0) {
        Cartesian2.clone(currPoint, outputPoints[outputLength]);
        Cartesian3.clone(currBary, outputBarys[outputLength]);
        outputLength++;
      }

      prevIdx = currIdx;
      prevPoint = currPoint;
      prevBary = currBary;
      prevInside = currInside;
    }

    // All points were outside, so break early
    if (outputLength === 0) {
      break;
    }
  }

  result.length = outputLength;
  for (let i = 0; i < outputLength; i++) {
    Cartesian2.clone(outputPoints[i], result.coordinates[i]);
    Cartesian3.clone(outputBarys[i], result.barycentricCoordinates[i]);
  }
  return result;
}

/**
 * @private
 * @param {Boolean} isEastChild
 * @param {Boolean} isNorthChild
 * @param {Cartesian2} boxMinimum
 * @param {Cartesian2} boxMaximum
 * @param {Cartesian2} p0
 * @param {Cartesian2} p1
 * @param {Cartesian2} p2
 * @param {PolygonResult} result
 */
function clipTriangleFromQuadrant(
  isEastChild,
  isNorthChild,
  boxMinimum,
  boxMaximum,
  p0,
  p1,
  p2,
  result
) {
  const edgeStart = isEastChild
    ? isNorthChild
      ? EDGE_ID_BOTTOM
      : EDGE_ID_LEFT
    : isNorthChild
    ? EDGE_ID_RIGHT
    : EDGE_ID_TOP;

  return clipTriangleAgainstBoxEdgeRange(
    edgeStart,
    2,
    boxMinimum,
    boxMaximum,
    p0,
    p1,
    p2,
    result
  );
}

const lookUpTableBaryToPrim = [
  [], // 000
  [0], // 001
  [1], // 010
  [0, 1], // 011
  [2], // 100
  [0, 2], // 101
  [1, 2], // 110
  [0, 1, 2], // 111
];

/**
 * Returns triangles that are clipped against a quadrant of a tile.
 * @private
 * @param {Boolean} isEastChild
 * @param {Boolean} isNorthChild
 * @param {Number} indexCount
 * @param {Uint8Array|Uint16Array|Uint32Array} indices
 * @param {Number} vertexCount
 * @param {Float32Array} vertices
 * @param {TerrainEncoding} vertexEncoding
 * @param {Number[]} resultIndices Indices of the clipped triangles
 * @param {Number[]} resultWestIndices Indices on the west edge
 * @param {Number[]} resultSouthIndices Indices on the south edge
 * @param {Number[]} resultEastIndices Indices on the east edge
 * @param {Number[]} resultNorthIndices Indices on the north edge
 * @param {Number[]} resultTriIds Per-vertex index to the originating triangle in indices
 * @param {Number[]} resultBary Per-vertex barycentric coordinate corresponding to the originating triangle
 * @param {Number[]} resultUVs Per-vertex UV within the quadrant
 */
function clipTileFromQuadrant(
  isEastChild,
  isNorthChild,
  indexCount,
  indices,
  vertexCount,
  vertices,
  vertexEncoding,
  resultIndices,
  resultWestIndices,
  resultSouthIndices,
  resultEastIndices,
  resultNorthIndices,
  resultTriIds,
  resultBary,
  resultUVs
) {
  /** @type Object.<number, number> */
  const upsampledVertexMap = {};

  const minU = isEastChild ? 0.5 : 0.0;
  const maxU = isEastChild ? 1.0 : 0.5;
  const minV = isNorthChild ? 0.5 : 0.0;
  const maxV = isNorthChild ? 1.0 : 0.5;

  const minUV = scratchMinUV;
  minUV.x = minU;
  minUV.y = minV;

  const maxUV = scratchMaxUV;
  maxUV.x = maxU;
  maxUV.y = maxV;

  let upsampledVertexCount = 0;

  // Loop over all the original triangles
  for (let i = 0; i < indexCount; i += 3) {
    const indexA = indices[i + 0];
    const indexB = indices[i + 1];
    const indexC = indices[i + 2];

    const uvA = vertexEncoding.decodeTextureCoordinates(
      vertices,
      indexA,
      scratchUvA
    );
    const uvB = vertexEncoding.decodeTextureCoordinates(
      vertices,
      indexB,
      scratchUvB
    );
    const uvC = vertexEncoding.decodeTextureCoordinates(
      vertices,
      indexC,
      scratchUvC
    );

    const clippedPolygon = clipTriangleFromQuadrant(
      isEastChild,
      isNorthChild,
      minUV,
      maxUV,
      uvA,
      uvB,
      uvC,
      scratchPolygon
    );
    const clippedPolygonLength = clippedPolygon.length;
    if (clippedPolygonLength < 3) {
      // Triangle is outside clipping window, so skip it
      continue;
    }

    const polygonUpsampledIndices = scratchPolygonIndices;

    for (let p = 0; p < clippedPolygonLength; p++) {
      const polygonBary = clippedPolygon.barycentricCoordinates[p];
      const bA = polygonBary.x;
      const bB = polygonBary.y;
      const bC = polygonBary.z;

      // Convert the barycentric coords to a bitfield to find out which vertices are involved
      const baryId =
        Math.ceil(bA) | (Math.ceil(bB) << 1) | (Math.ceil(bC) << 2);
      const primitiveIds = lookUpTableBaryToPrim[baryId];

      let upsampledIndex;
      let isNewVertex = false;

      if (primitiveIds.length === 1) {
        //-------------------------------------------------------
        // Vertex: Only one barycentric coord is set, so it's on a vertex
        //-------------------------------------------------------
        const pointPrimitiveId = primitiveIds[0];
        const pointIndex = indices[i + pointPrimitiveId];

        // Add the vertex if it doesn't exist already
        const pointKey = pointIndex;
        upsampledIndex = upsampledVertexMap[pointKey];
        if (upsampledIndex === undefined) {
          isNewVertex = true;
          upsampledIndex = upsampledVertexCount++;
          upsampledVertexMap[pointKey] = upsampledIndex;
        }
      } else if (primitiveIds.length === 2) {
        //-------------------------------------------------------
        // Edge: Only two barycentric coords are set, so it's on an edge
        //-------------------------------------------------------
        const edgePrimitiveIdA = primitiveIds[0];
        const edgePrimitiveIdB = primitiveIds[1];
        const edgeIndexA = indices[i + edgePrimitiveIdA];
        const edgeIndexB = indices[i + edgePrimitiveIdB];

        // Detect if a clipped position was already added by a triangle that shares the same edge.
        // The key is based on the two edge indices and whether it is the first or second clipped position on the edge (an edge can be clipped by a convex shape at most twice).
        const prevBary =
          clippedPolygon.barycentricCoordinates[
            (p + clippedPolygonLength - 1) % clippedPolygonLength
          ];
        const prevBaryId =
          Math.ceil(prevBary.x) |
          (Math.ceil(prevBary.y) << 1) |
          (Math.ceil(prevBary.z) << 2);
        const sameEdge = baryId === prevBaryId;

        // The winding order of the edge will consty between triangles (i.e. A -> B vs B -> A), so take the min/max to make the key consistent.
        const minIndex = Math.min(edgeIndexA, edgeIndexB);
        const maxIndex = Math.max(edgeIndexA, edgeIndexB);
        const baseKey = vertexCount + 2 * (minIndex * vertexCount + maxIndex);

        const firstKey = baseKey + 0;
        const secondKey = baseKey + 1;
        const firstEntry = upsampledVertexMap[firstKey];
        const secondEntry = upsampledVertexMap[secondKey];

        // !firstEntry && !sameEdge                -> firstEntry (undefined)
        // !secondEntry && sameEdge                -> secondEntry (undefined)
        // firstEntry && !secondEntry && !sameEdge -> firstEntry (reverse solo)
        // firstEntry && secondEntry && !sameEdge  -> secondEntry (reverse first)
        // firstEntry && secondEntry && sameEdge   -> firstEntry (reverse second)
        const useFirst =
          !sameEdge === (firstEntry === undefined || secondEntry === undefined);
        upsampledIndex = useFirst ? firstEntry : secondEntry;

        // Add the vertex if it doesn't already exist
        if (upsampledIndex === undefined) {
          isNewVertex = true;
          upsampledIndex = upsampledVertexCount++;
          const edgeKey = useFirst ? firstKey : secondKey;
          upsampledVertexMap[edgeKey] = upsampledIndex;
        }
      } else {
        //-------------------------------------------------------
        // Face: All three barycentric coords are set, so it's inside the triangle
        //-------------------------------------------------------
        isNewVertex = true;
        upsampledIndex = upsampledVertexCount++;
      }

      // Store the index for this point in the polygon
      polygonUpsampledIndices[p] = upsampledIndex;

      if (isNewVertex) {
        const triId = i / 3;
        resultTriIds.push(triId);
        const polygonUV = clippedPolygon.coordinates[p];
        const u = (polygonUV.x - minU) / (maxU - minU);
        const v = (polygonUV.y - minV) / (maxV - minV);

        resultUVs.push(u, v);
        resultBary.push(bA, bB);

        if (u === 0.0) {
          resultWestIndices.push(upsampledIndex);
        } else if (u === 1.0) {
          resultEastIndices.push(upsampledIndex);
        }
        if (v === 0.0) {
          resultSouthIndices.push(upsampledIndex);
        } else if (v === 1.0) {
          resultNorthIndices.push(upsampledIndex);
        }
      }
    }

    // Triangulate the polygon by connecting vertices in a fan shape
    const ui0 = polygonUpsampledIndices[0];
    let ui1 = polygonUpsampledIndices[1];
    let ui2 = polygonUpsampledIndices[2];
    resultIndices.push(ui0, ui1, ui2);
    for (let j = 3; j < clippedPolygonLength; j++) {
      ui1 = ui2;
      ui2 = polygonUpsampledIndices[j];
      resultIndices.push(ui0, ui1, ui2);
    }
  }

  resultWestIndices.sort(function (a, b) {
    return resultUVs[a * 2 + 1] - resultUVs[b * 2 + 1];
  });
  resultSouthIndices.sort(function (a, b) {
    return resultUVs[b * 2 + 0] - resultUVs[a * 2 + 0];
  });
  resultEastIndices.sort(function (a, b) {
    return resultUVs[b * 2 + 1] - resultUVs[a * 2 + 1];
  });
  resultNorthIndices.sort(function (a, b) {
    return resultUVs[a * 2 + 0] - resultUVs[b * 2 + 0];
  });
}

export default Cesium3DTilesTerrainGeometryProcessor;
