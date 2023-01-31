import CompressedTextureBuffer from "../Core/CompressedTextureBuffer.js";
import defined from "../Core/defined.js";
import PixelFormat from "../Core/PixelFormat.js";
import RuntimeError from "../Core/RuntimeError.js";
import crunch from "../ThirdParty/crunch.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

// Modified from texture-tester
// See:
//     https://github.com/toji/texture-tester/blob/master/js/webgl-texture-util.js
//     http://toji.github.io/texture-tester/

/**
 * @license
 *
 * Copyright (c) 2014, Brandon Jones. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Taken from crnlib.h
var CRN_FORMAT = {
  cCRNFmtInvalid: -1,

  cCRNFmtDXT1: 0,
  // cCRNFmtDXT3 is not currently supported when writing to CRN - only DDS.
  cCRNFmtDXT3: 1,
  cCRNFmtDXT5: 2,

  // Crunch supports more formats than this, but we can't use them here.
};

// Mapping of Crunch formats to DXT formats.
var DXT_FORMAT_MAP = {};
DXT_FORMAT_MAP[CRN_FORMAT.cCRNFmtDXT1] = PixelFormat.RGB_DXT1;
DXT_FORMAT_MAP[CRN_FORMAT.cCRNFmtDXT3] = PixelFormat.RGBA_DXT3;
DXT_FORMAT_MAP[CRN_FORMAT.cCRNFmtDXT5] = PixelFormat.RGBA_DXT5;

var dst;
var dxtData;
var cachedDstSize = 0;

// Copy an array of bytes into or out of the emscripten heap.
function arrayBufferCopy(src, dst, dstByteOffset, numBytes) {
  var i;
  var dst32Offset = dstByteOffset / 4;
  var tail = numBytes % 4;
  var src32 = new Uint32Array(src.buffer, 0, (numBytes - tail) / 4);
  var dst32 = new Uint32Array(dst.buffer);
  for (i = 0; i < src32.length; i++) {
    dst32[dst32Offset + i] = src32[i];
  }
  for (i = numBytes - tail; i < numBytes; i++) {
    dst[dstByteOffset + i] = src[i];
  }
}

/**
 * @private
 */
function transcodeCRNToDXT(arrayBuffer, transferableObjects) {
  // Copy the contents of the arrayBuffer into emscriptens heap.
  var srcSize = arrayBuffer.byteLength;
  var bytes = new Uint8Array(arrayBuffer);
  var src = crunch._malloc(srcSize);
  arrayBufferCopy(bytes, crunch.HEAPU8, src, srcSize);

  // Determine what type of compressed data the file contains.
  var crnFormat = crunch._crn_get_dxt_format(src, srcSize);
  var format = DXT_FORMAT_MAP[crnFormat];
  if (!defined(format)) {
    throw new RuntimeError("Unsupported compressed format.");
  }

  // Gather basic metrics about the DXT data.
  var levels = crunch._crn_get_levels(src, srcSize);
  var width = crunch._crn_get_width(src, srcSize);
  var height = crunch._crn_get_height(src, srcSize);

  // Determine the size of the decoded DXT data.
  var dstSize = 0;
  var i;
  for (i = 0; i < levels; ++i) {
    dstSize += PixelFormat.compressedTextureSizeInBytes(
      format,
      width >> i,
      height >> i
    );
  }

  // Allocate enough space on the emscripten heap to hold the decoded DXT data
  // or reuse the existing allocation if a previous call to this function has
  // already acquired a large enough buffer.
  if (cachedDstSize < dstSize) {
    if (defined(dst)) {
      crunch._free(dst);
    }
    dst = crunch._malloc(dstSize);
    dxtData = new Uint8Array(crunch.HEAPU8.buffer, dst, dstSize);
    cachedDstSize = dstSize;
  }

  // Decompress the DXT data from the Crunch file into the allocated space.
  crunch._crn_decompress(src, srcSize, dst, dstSize, 0, levels);

  // Release the crunch file data from the emscripten heap.
  crunch._free(src);

  // Mipmaps are unsupported, so copy the level 0 texture
  // When mipmaps are supported, a copy will still be necessary as dxtData is a view on the heap.
  var length = PixelFormat.compressedTextureSizeInBytes(format, width, height);

  // Get a copy of the 0th mip level. dxtData will exceed length when there are more mip levels.
  // Equivalent to dxtData.slice(0, length), which is not supported in IE11
  var level0DXTDataView = dxtData.subarray(0, length);
  var level0DXTData = new Uint8Array(length);
  level0DXTData.set(level0DXTDataView, 0);

  transferableObjects.push(level0DXTData.buffer);
  return new CompressedTextureBuffer(format, width, height, level0DXTData);
}
export default createTaskProcessorWorker(transcodeCRNToDXT);
