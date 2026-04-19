import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import buildVectorGltfFromDecodedTile from "./buildVectorGltfFromDecodedTile.js";
import decodeMVT from "./decodeMVT.js";
import VectorTileDataProviderBase from "./VectorTileDataProviderBase.js";
import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js";

/**
 * @alias MVTDataProvider
 * @constructor
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 * @param {object} [options] Provider options.
 * @param {number} [options.minZoom=0] Minimum requested zoom level.
 * @param {number} [options.maxZoom=14] Maximum requested zoom level.
 * @param {Rectangle} [options.extent] Optional geographic extent in radians to limit tile requests.
 */
function MVTDataProvider(urlTemplate, options) {
  options = options ?? {};
  this._urlTemplate = urlTemplate;
  VectorTileDataProviderBase.call(this, options);
}

MVTDataProvider.prototype = Object.create(VectorTileDataProviderBase.prototype);
MVTDataProvider.prototype.constructor = MVTDataProvider;

/**
 * Creates a provider from an MVT URL template.
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 * @param {object} [options] Provider options.
 * @param {number} [options.minZoom=0] Minimum requested zoom level.
 * @param {number} [options.maxZoom=14] Maximum requested zoom level.
 * @param {Rectangle} [options.extent] Optional geographic extent in radians to limit tile requests.
 * @returns {Promise<MVTDataProvider>}
 */
MVTDataProvider.fromUrlTemplate = async function (urlTemplate, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("urlTemplate", urlTemplate);
  if (defined(options)) {
    if (defined(options.minZoom)) {
      Check.typeOf.number("options.minZoom", options.minZoom);
    }
    if (defined(options.maxZoom)) {
      Check.typeOf.number("options.maxZoom", options.maxZoom);
    }
    if (defined(options.extent)) {
      Check.typeOf.object("options.extent", options.extent);
    }
  }
  //>>includeEnd('debug');
  return new MVTDataProvider(urlTemplate, options);
};

MVTDataProvider.prototype.createTileSource = function () {
  return createUrlTemplateSource(this._urlTemplate);
};

MVTDataProvider.prototype.createTileDecoder = function () {
  return mvtTileDecoder;
};

MVTDataProvider.prototype.createTileContentBuilder = function () {
  return vectorGltfTileContentBuilder;
};

function createUrlTemplateSource(urlTemplate) {
  const resource = Resource.createIfNeeded(urlTemplate);
  const template = resource.url;
  return {
    resource: resource,
    urlTemplate: template,
    fetchTile: async function fetchTile(level, x, y) {
      const url = template
        .replace(/\{z\}/gi, `${level}`)
        .replace(/\{x\}/gi, `${x}`)
        .replace(/\{y\}/gi, `${y}`);
      const tileResource = resource.getDerivedResource({ url: url });

      try {
        const arrayBuffer = await tileResource.fetchArrayBuffer();
        if (!defined(arrayBuffer)) {
          return undefined;
        }
        return {
          status: "ready",
          resource: tileResource,
          arrayBuffer: arrayBuffer,
        };
      } catch (error) {
        if (isMissingError(error)) {
          return { status: "missing" };
        }
        throw error;
      }
    },
  };
}

function isMissingError(error) {
  if (!defined(error)) {
    return false;
  }
  const statusCode = error.statusCode;
  return statusCode === 404 || statusCode === 204;
}

const mvtTileDecoder = {
  decode: async function decode(resource, arrayBuffer) {
    void resource;
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      arrayBuffer = await decompressGzip(arrayBuffer);
    }
    return decodeMVT(arrayBuffer);
  },
};

const vectorGltfTileContentBuilder = {
  build: async function build(tileset, resource, decodedTile, tileCoordinates) {
    const gltf = buildVectorGltfFromDecodedTile(decodedTile, tileCoordinates);
    if (!defined(gltf)) {
      return undefined;
    }

    const tileAdapter = {
      computedTransform: Matrix4.clone(Matrix4.IDENTITY),
    };
    return VectorGltf3DTileContent.fromGltf(
      tileset,
      tileAdapter,
      resource,
      gltf,
    );
  },
};

async function decompressGzip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (typeof DecompressionStream === "function") {
    try {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).arrayBuffer();
    } catch {
      // Fallback to pako.
    }
  }

  const { inflate } = await import("pako");
  const out = inflate(bytes);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

export default MVTDataProvider;
