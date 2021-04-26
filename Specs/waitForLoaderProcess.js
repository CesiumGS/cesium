import { ResourceLoaderState } from "../Source/Cesium.js";

import pollToPromise from "./pollToPromise.js";

export default function waitForLoaderProcess(loader, scene) {
  return pollToPromise(function () {
    loader.process(scene.frameState);
    return (
      loader._state === ResourceLoaderState.READY ||
      loader._state === ResourceLoaderState.FAILED
    );
  }).then(function () {
    return loader.promise;
  });
}
