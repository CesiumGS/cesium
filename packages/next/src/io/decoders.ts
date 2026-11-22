/**
 * WASM decoders used by content workers, loaded on first use:
 * - Draco (KHR_draco_mesh_compression), the official `draco3d` build.
 * - Basis Universal (KHR_texture_basisu), Binomial's transcoder.
 */
import { engineFetch } from "./fetchProvider.ts";
import createDracoModule from "draco3d/draco_decoder_nodejs.js";
import dracoWasmUrl from "draco3d/draco_decoder.wasm?url";
import { read as readKtx2 } from "ktx-parse";
// The Basis transcoder has no official npm package. 2.0 keeps its own pinned
// copy in ThirdParty/: Binomial's build (Apache-2.0), byte for byte the one
// 1.x vendored at @cesium/engine 26.5.0, moved here when 1.x left the branch
// (CS-611). CS-811 decides how 2.0 builds its decoders. `?basis-esm` loads
// it as an ES module that generates no code at runtime
// (basisTranscoderEsm.ts), so workers need no 'unsafe-eval' under a Content
// Security Policy.
import createBasisModule from "./ThirdParty/basis_transcoder.js?basis-esm";
import basisWasmUrl from "./ThirdParty/basis_transcoder.wasm?url";
import type { CompressedImage, CompressedFormat } from "./gltfTypes.ts";
import type { TextureTranscodePath } from "../profile/paths.ts";

/* eslint-disable @typescript-eslint/no-explicit-any -- Emscripten modules are untyped */

let draco: Promise<any> | undefined;
let basis: Promise<any> | undefined;

async function wasm(url: string): Promise<ArrayBuffer> {
  const response = await engineFetch(url, { kind: "engine" });
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
    const module = await createBasisModule({
      wasmBinary: await wasm(basisWasmUrl),
    });
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

/**
 * Transcodes a KTX2 (Basis ETC1S or UASTC) image to `target`, the engine's
 * `textureTranscode` path (src/profile/paths.ts, chosen from the device's
 * block formats). An image that isn't a whole number of 4 × 4 blocks is
 * uncompressed RGBA8 whatever the target.
 */
export async function transcodeKtx2(
  data: Uint8Array,
  target: TextureTranscodePath,
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
    const format: CompressedFormat = blockAligned ? target : "rgba8";
    const transcodeTo = {
      bc7: formats.cTFBC7_RGBA,
      "astc-4x4": formats.cTFASTC_4x4_RGBA,
      "etc2-rgba8": formats.cTFETC2_RGBA,
      rgba8: formats.cTFRGBA32,
    }[format];
    if (!file.startTranscoding()) {
      throw new Error("KTX2: startTranscoding failed.");
    }
    const levels: Uint8Array[] = [];
    for (let level = 0; level < Math.max(1, header.levels.length); level++) {
      const size: number = file.getImageTranscodedSizeInBytes(
        level,
        0,
        0,
        transcodeTo.value,
      );
      const out = new Uint8Array(size);
      if (
        !file.transcodeImage(out, level, 0, 0, transcodeTo.value, 0, -1, -1)
      ) {
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
