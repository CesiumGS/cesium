import loaderProcess from "./loaderProcess.js";
import pollToPromise from "./pollToPromise.js";

function waitForLoaderProcess(loader, scene) {
  return pollToPromise(function () {
    if (loader.isDestroyed()) {
      return true;
    }

    return loaderProcess(loader, scene);
  });
}

export default waitForLoaderProcess;
