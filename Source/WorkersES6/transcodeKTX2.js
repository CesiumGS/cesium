/* global require */
import defined from "../Core/defined.js";
import parseKTX2 from "../Core/parseKTX2.js";

import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var transcoderModule;

function transcode(parameters, transferableObjects) {
  var ktx2Buffer = parameters.ktx2Buffer;
  var supportedTargetFormats = parameters.supportedTargetFormats;
  return parseKTX2(
    ktx2Buffer,
    supportedTargetFormats,
    transcoderModule,
    transferableObjects
  );
}

function initWorker(compiledModule) {
  transcoderModule = compiledModule;
  transcoderModule.initializeBasis();

  self.onmessage = createTaskProcessorWorker(transcode);
  self.postMessage(true);
}

function transcodeKTX2(event) {
  var data = event.data;

  // Expect the first message to be to load a web assembly module
  var wasmConfig = data.webAssemblyConfig;
  if (defined(wasmConfig)) {
    // Require and compile WebAssembly module, or use fallback if not supported
    return require([wasmConfig.modulePath], function (mscBasisTranscoder) {
      if (defined(wasmConfig.wasmBinaryFile)) {
        if (!defined(mscBasisTranscoder)) {
          mscBasisTranscoder = self.MSC_TRANSCODER;
        }

        mscBasisTranscoder(wasmConfig).then(function (compiledModule) {
          initWorker(compiledModule);
        });
      } else {
        return mscBasisTranscoder().then(function (transcoder) {
          initWorker(transcoder);
        });
      }
    });
  }
}
export default transcodeKTX2;
