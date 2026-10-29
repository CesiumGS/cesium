/**
 * WASM decoders used by content workers, loaded on first use:
 * - Draco (KHR_draco_mesh_compression), the official `draco3d` build.
 * - Basis Universal (KHR_texture_basisu), Binomial's transcoder.
 */
import createDracoModule from "draco3d/draco_decoder_nodejs.js";
import dracoWasmUrl from "draco3d/draco_decoder.wasm?url";
import { read as readKtx2 } from "ktx-parse";
// The Basis transcoder has no official npm package. For the PoC this uses the
// copy vendored in the repo (Binomial's build, Apache-2.0); a published
// @cesium/next would vendor its own copy.
import basisSource from "../../../engine/Source/ThirdParty/Workers/basis_transcoder.js?raw";
import basisWasmUrl from "../../../engine/Source/ThirdParty/basis_transcoder.wasm?url";
import type { CompressedImage, CompressedFormat } from "./gltfTypes.ts";

/* eslint-disable @typescript-eslint/no-explicit-any -- Emscripten modules are untyped */

let draco: Promise<any> | undefined;
let basis: Promise<any> | undefined;

async function wasm(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return response.arrayBuffer();
}

function dracoModule(): Promise<any> {
  draco ??= wasm(dracoWasmUrl).then((wasmBinary) =>
    (createDracoModule as (options: object) => Promise<any>)({ wasmBinary }),
  );
  return draco;
}

function basisModule(): Promise<any> {
  basis ??= (async () => {
    // The transcoder ships as a UMD script; evaluate it to get its factory.

    const factory = new Function(
      "module",
      "exports",
      `${basisSource}\nreturn module.exports;`,
    )({ exports: {} }, {}) as (options: object) => Promise<any>;
    const module = await factory({ wasmBinary: await wasm(basisWasmUrl) });
    module.initializeBasis();
    return module;
  })();
  return basis;
}

export interface DracoAttributeRequest {
  /** Draco attribute unique id from the glTF extension. */
  id: number;
  components: number;
  /** Integer component type that must be normalized to [0, 1] / [-1, 1]. */
  normalizeFrom?: number;
}

export interface DracoResult {
  attributes: Map<string, Float32Array>;
  indices: Uint32Array;
}

/** Decodes a Draco-compressed triangle mesh into float streams and uint32 indices. */
export async function decodeDraco(
  data: Uint8Array,
  requests: Map<string, DracoAttributeRequest>,
): Promise<DracoResult> {
  const d = await dracoModule();
  const decoder = new d.Decoder();
  const buffer = new d.DecoderBuffer();
  buffer.Init(data, data.byteLength);
  if (decoder.GetEncodedGeometryType(buffer) !== d.TRIANGULAR_MESH) {
    d.destroy(buffer);
    d.destroy(decoder);
    throw new Error("Draco: only triangle meshes are supported.");
  }
  const mesh = new d.Mesh();
  const status = decoder.DecodeBufferToMesh(buffer, mesh);
  d.destroy(buffer);
  if (!status.ok() || mesh.ptr === 0) {
    d.destroy(mesh);
    d.destroy(decoder);
    throw new Error(`Draco: ${status.error_msg()}`);
  }

  const points = mesh.num_points();
  const attributes = new Map<string, Float32Array>();
  for (const [name, request] of requests) {
    const attribute = decoder.GetAttributeByUniqueId(mesh, request.id);
    const count = points * request.components;
    const bytes = count * 4;
    const ptr = d._malloc(bytes);
    decoder.GetAttributeDataArrayForAllPoints(
      mesh,
      attribute,
      d.DT_FLOAT32,
      bytes,
      ptr,
    );
    const values = new Float32Array(d.HEAPF32.buffer, ptr, count).slice();
    d._free(ptr);
    if (request.normalizeFrom !== undefined) {
      const max = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[
        request.normalizeFrom as 5120
      ];
      if (max) {
        for (let i = 0; i < values.length; i++) {
          values[i] = Math.max(values[i]! / max, -1);
        }
      }
    }
    attributes.set(name, values);
  }

  const indexCount = mesh.num_faces() * 3;
  const indexBytes = indexCount * 4;
  const indexPtr = d._malloc(indexBytes);
  decoder.GetTrianglesUInt32Array(mesh, indexBytes, indexPtr);
  const indices = new Uint32Array(
    d.HEAPU32.buffer,
    indexPtr,
    indexCount,
  ).slice();
  d._free(indexPtr);
  d.destroy(mesh);
  d.destroy(decoder);
  return { attributes, indices };
}

export interface TextureFormatSupport {
  bc: boolean;
  etc2: boolean;
  astc: boolean;
}

/**
 * Transcodes a KTX2 (Basis ETC1S or UASTC) image to the best block format the
 * device supports: BC7, then ASTC 4×4, then ETC2, else uncompressed RGBA8.
 */
export async function transcodeKtx2(
  data: Uint8Array,
  support: TextureFormatSupport,
): Promise<CompressedImage> {
  const b = await basisModule();
  const header = readKtx2(data);
  const file = new b.KTX2File(data);
  try {
    if (!file.isValid()) {
      throw new Error("KTX2: invalid file.");
    }
    const width: number = file.getWidth();
    const height: number = file.getHeight();
    const blockAligned = width % 4 === 0 && height % 4 === 0;
    const formats = b.transcoder_texture_format;
    let format: CompressedFormat = "rgba8";
    let target = formats.cTFRGBA32;
    if (blockAligned && support.bc) {
      format = "bc7";
      target = formats.cTFBC7_RGBA;
    } else if (blockAligned && support.astc) {
      format = "astc-4x4";
      target = formats.cTFASTC_4x4_RGBA;
    } else if (blockAligned && support.etc2) {
      format = "etc2-rgba8";
      target = formats.cTFETC2_RGBA;
    }
    if (!file.startTranscoding()) {
      throw new Error("KTX2: startTranscoding failed.");
    }
    const levels: Uint8Array[] = [];
    for (let level = 0; level < Math.max(1, header.levels.length); level++) {
      const size: number = file.getImageTranscodedSizeInBytes(
        level,
        0,
        0,
        target.value,
      );
      const out = new Uint8Array(size);
      if (!file.transcodeImage(out, level, 0, 0, target.value, 0, -1, -1)) {
        throw new Error(`KTX2: transcoding level ${level} failed.`);
      }
      levels.push(out);
    }
    return { kind: "compressed", format, width, height, levels };
  } finally {
    file.close();
    file.delete();
  }
}
