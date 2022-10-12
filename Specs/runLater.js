import { defaultValue } from "@cesium/engine";

function runLater(functionToRunLater, milliseconds) {
  milliseconds = defaultValue(milliseconds, 0);

  return new Promise((resolve, reject) => {
    setTimeout(function () {
      try {
        resolve(functionToRunLater());
      } catch (e) {
        reject(e);
      }
    }, milliseconds);
  });
}
export default runLater;
