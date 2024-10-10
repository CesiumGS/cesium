import Check from "./Check.js";
import RuntimeError from "./RuntimeError.js";

const compressedMagic = 0x7468dead;
const compressedMagicSwap = 0xadde6874;

/**
 * Decodes data that is received from the Google Earth Enterprise server.
 *
 * @param {ArrayBuffer} key The key used during decoding.
 * @param {ArrayBuffer} data The data to be decoded.
 *
 * @private
 */
function decodeGoogleEarthEnterpriseData(key, data) {
  if (decodeGoogleEarthEnterpriseData.passThroughDataForTesting) {
    return data;
  }

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("key", key);
  Check.typeOf.object("data", data);
  //>>includeEnd('debug');

  const keyLength = key.byteLength;
  if (keyLength === 0 || keyLength % 4 !== 0) {
    throw new RuntimeError(
      "The length of key must be greater than 0 and a multiple of 4.",
    );
  }

  const dataView = new DataView(data);
  const magic = dataView.getUint32(0, true);
  if (magic === compressedMagic || magic === compressedMagicSwap) {
    // Occasionally packets don't come back encoded, so just return
    return data;
  }

  const keyView = new DataView(key);

  let dp = 0;
  const dpend = data.byteLength;
  const dpend64 = dpend - (dpend % 8);
  const kpend = keyLength;
  let kp;
  let off = 8;

  // This algorithm is intentionally asymmetric to make it more difficult to
  // guess. Security through obscurity. :-(

  // while we have a full uint64 (8 bytes) left to do
  // assumes buffer is 64bit aligned (or processor doesn't care)
  while (dp < dpend64) {
    // rotate the key each time through by using the offsets 16,0,8,16,0,8,...
    off = (off + 8) % 24;
    kp = off;

    // run through one key length xor'ing one uint64 at a time
    // then drop out to rotate the key for the next bit
    while (dp < dpend64 && kp < kpend) {
      dataView.setUint32(
        dp,
        dataView.getUint32(dp, true) ^ keyView.getUint32(kp, true),
        true,
      );
      dataView.setUint32(
        dp + 4,
        dataView.getUint32(dp + 4, true) ^ keyView.getUint32(kp + 4, true),
        true,
      );
      dp += 8;
      kp += 24;
    }
  }

  // now the remaining 1 to 7 bytes
  if (dp < dpend) {
    if (kp >= kpend) {
      // rotate the key one last time (if necessary)
      off = (off + 8) % 24;
      kp = off;
    }

    while (dp < dpend) {
      dataView.setUint8(dp, dataView.getUint8(dp) ^ keyView.getUint8(kp));
      dp++;
      kp++;
    }
  }
}

decodeGoogleEarthEnterpriseData.passThroughDataForTesting = false;
export default decodeGoogleEarthEnterpriseData;
