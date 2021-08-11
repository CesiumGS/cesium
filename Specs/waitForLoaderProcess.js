import pollToPromise from "./pollToPromise.js";

export default function waitForLoaderProcess(loader, scene) {
  var loaderFinished = false;
  loader.texturesLoadedPromise.always(function () {
    loaderFinished = true;
  });
  return pollToPromise(function () {
    loader.process(scene.frameState);
    return loaderFinished;
  }).then(function () {
    return loader.texturesLoadedPromise;
  });
}
