import loaderProcess from "./loaderProcess.js";
import pollToPromise from "./pollToPromise.js";

export default function waitForLoaderProcess(loader, scene) {
  return new Promise(function (resolve, reject) {
    let loaderFinished = false;

    pollToPromise(function () {
      loaderProcess(loader, scene);
      return loaderFinished;
    }).catch(function (e) {
      reject(e);
    });

    loader.promise
      .then(function (result) {
        resolve(result);
      })
      .catch(function (e) {
        reject(e);
      })
      .finally(function () {
        loaderFinished = true;
      });
  });
}
