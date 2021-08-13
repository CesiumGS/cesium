import loaderProcess from "./loaderProcess.js";
import pollToPromise from "./pollToPromise.js";

export default function waitForLoaderProcess(loader, scene) {
  var loaderFinished = false;
  loader.promise.always(function () {
    loaderFinished = true;
  });
  return pollToPromise(function () {
    loaderProcess(loader, scene);
    return loaderFinished;
  }).then(function () {
    return loader.promise;
  });
}
