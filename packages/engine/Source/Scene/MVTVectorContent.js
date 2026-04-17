// @ts-check

import Axis from "./Axis.js";
import Matrix4 from "../Core/Matrix4.js";
import buildVectorGltfFromDecodedTile from "./buildVectorGltfFromDecodedTile.js";
import decodeMVT from "./decodeMVT.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js";

/** @import Resource from "../Core/Resource.js"; */
/** @import FrameState from "./FrameState.js"; */

class MVTVectorContent {
  /**
   * @param {VectorGltf3DTileContent} vectorContent
   * @param {*} tilesetAdapter
   */
  constructor(vectorContent, tilesetAdapter) {
    this._vectorContent = vectorContent;
    this._tilesetAdapter = tilesetAdapter;
  }

  get featuresLength() {
    return this._vectorContent.featuresLength;
  }

  get pointsLength() {
    return this._vectorContent.pointsLength;
  }

  get trianglesLength() {
    return this._vectorContent.trianglesLength;
  }

  get geometryByteLength() {
    return this._vectorContent.geometryByteLength;
  }

  get texturesByteLength() {
    return this._vectorContent.texturesByteLength;
  }

  get ready() {
    return this._vectorContent.ready;
  }

  get url() {
    return this._vectorContent.url;
  }

  /**
   * @param {FrameState} frameState
   */
  update(frameState) {
    this._vectorContent.update(this._tilesetAdapter, frameState);
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this._vectorContent.destroy();
    return destroyObject(this);
  }

  /**
   * @param {Resource} resource
   * @param {ArrayBuffer} arrayBuffer
   * @param {{tileX:number, tileY:number, tileZ:number}} [tileCoordinates] Tile coordinates for this payload.
   * @returns {Promise<MVTVectorContent|undefined>}
   */
  static async fromArrayBuffer(resource, arrayBuffer, tileCoordinates) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      arrayBuffer = await decompressGzip(arrayBuffer);
    }

    const decoded = decodeMVT(arrayBuffer);
    let tileX = tileCoordinates?.tileX;
    let tileY = tileCoordinates?.tileY;
    let tileZ = tileCoordinates?.tileZ;
    if (
      !Number.isFinite(tileX) ||
      !Number.isFinite(tileY) ||
      !Number.isFinite(tileZ)
    ) {
      const parsedTileCoordinates = parseTileCoords(
        resource.getUrlComponent(true),
      );
      tileX = parsedTileCoordinates.tileX;
      tileY = parsedTileCoordinates.tileY;
      tileZ = parsedTileCoordinates.tileZ;
    }

    const gltf = buildVectorGltfFromDecodedTile(decoded, {
      tileX: tileX,
      tileY: tileY,
      tileZ: tileZ,
    });
    if (!defined(gltf)) {
      return undefined;
    }

    const tilesetAdapter = createTilesetAdapter();
    const tileAdapter = createTileAdapter();
    const vectorContent = await VectorGltf3DTileContent.fromGltf(
      tilesetAdapter,
      tileAdapter,
      resource,
      gltf,
    );

    return new MVTVectorContent(vectorContent, tilesetAdapter);
  }
}

/**
 * @returns {*}
 */
function createTilesetAdapter() {
  return {
    _modelUpAxis: Axis.Z,
    _modelForwardAxis: Axis.X,
    _projectTo2D: false,
    _enablePick: true,
    _enableDebugWireframe: false,
    featureIdLabel: "featureId_0",
    instanceFeatureIdLabel: "instanceFeatureId_0",
  };
}

/**
 * @returns {*}
 */
function createTileAdapter() {
  return {
    computedTransform: Matrix4.clone(Matrix4.IDENTITY),
  };
}

/**
 * @param {string} url
 * @returns {{tileZ:number, tileX:number, tileY:number}}
 */
function parseTileCoords(url) {
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(?:pbf|mvt)(?:[?#]|$)/i);
  if (!match) {
    return { tileZ: 0, tileX: 0, tileY: 0 };
  }
  return {
    tileZ: parseInt(match[1], 10),
    tileX: parseInt(match[2], 10),
    tileY: parseInt(match[3], 10),
  };
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<ArrayBuffer>}
 */
async function decompressGzip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (typeof DecompressionStream === "function") {
    try {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).arrayBuffer();
    } catch {
      console.warn(
        "MVT gzip decompress failed in DecompressionStream; falling back to pako. This MVT tile must be readable as uncompressed data after decompression.",
      );
    }
  }

  const { inflate } = await import("pako");
  const out = inflate(bytes);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

export default MVTVectorContent;
