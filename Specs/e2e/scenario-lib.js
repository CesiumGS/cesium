function loadPromise(tileset, timeout = 1000 * 10) {
  return new Promise((resolve, reject) => {
    tileset.allTilesLoaded.addEventListener(() => {
      resolve(undefined);
    });
    setTimeout(() => {
      console.log("tilesets timed out");
      reject();
    }, timeout);
  });
}

export async function waitForAllPrimitives(scene, timeout = 1000 * 10) {
  const promises = [];
  const prims = scene.primitives.length;
  for (let i = 0; i < prims; i++) {
    promises.push(loadPromise(scene.primitives.get(i), timeout));
  }
  const results = Promise.allSettled(promises);
  return results;
}

export function indicateTestDone() {
  window.specReady = true;
}
