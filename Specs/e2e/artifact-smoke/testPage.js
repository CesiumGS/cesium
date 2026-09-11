/*
 * These probes exercise every WASM path changed or used by the worker move:
 * KTX2, Draco, Gaussian splats, and the embedded Meshopt decoder.
 */

window.artifactSmokeResult = {
  errors: [],
  featureCompleted: false,
  featureDetails: undefined,
  imported: false,
  ready: false,
};

window.addEventListener("error", (event) => {
  window.artifactSmokeResult.errors.push(event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  window.artifactSmokeResult.errors.push(String(event.reason));
});

async function loadCesium(entry, distribution) {
  if (distribution === "esm") {
    return import(entry);
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = entry;
    script.addEventListener("load", resolve);
    script.addEventListener("error", () => {
      reject(new Error("Unable to load the combined CesiumJS build"));
    });
    document.head.append(script);
  });

  if (window.Cesium === undefined) {
    throw new Error("The combined CesiumJS build did not define Cesium");
  }

  return window.Cesium;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function renderUntil(widget, condition) {
  for (let i = 0; i < 240; ++i) {
    widget.render();
    if (condition()) {
      return;
    }
    await nextFrame();
  }

  throw new Error("Timed out waiting for rendering");
}

function createWidget(Cesium) {
  const host = document.createElement("div");
  host.style.width = "640px";
  host.style.height = "480px";
  document.body.append(host);

  const widget = new Cesium.CesiumWidget(host, {
    baseLayer: false,
    globe: false,
    requestRenderMode: false,
    skyAtmosphere: false,
    skyBox: false,
    useDefaultRenderLoop: false,
  });

  return { host, widget };
}

async function transcodeKtx2(Cesium, fixture) {
  const response = await fetch(fixture);
  if (!response.ok) {
    throw new Error(`Unable to load KTX2 fixture: ${response.status}`);
  }

  const result = await Cesium.KTX2Transcoder.transcode(
    await response.arrayBuffer(),
    { etc: true },
  );

  if (result.width !== 4 || result.height !== 4) {
    throw new Error(
      `Unexpected KTX2 dimensions: ${result.width}x${result.height}`,
    );
  }

  return {
    byteLength: result.bufferView.byteLength,
    height: result.height,
    width: result.width,
  };
}

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function decodeMeshopt(Cesium) {
  const source = decodeBase64(
    "oAUZJkCZgAQAAAU/P8D/fn1+fX59fn1+fX7ADAAAfX4FAAhISEgAAAAFAAzMzH1+fX59zAAAAH59BQhAmYBmZgAABQzA/8B9fn1+fX59//8AAH59fn1+fX59AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8//z8AAA==",
  );
  const taskProcessor = new Cesium.TaskProcessor("decodeMeshopt");

  try {
    const result = await taskProcessor.scheduleTask(
      {
        count: 24,
        byteStride: 8,
        mode: "ATTRIBUTES",
        source,
      },
      [source.buffer],
    );

    if (result.byteLength !== 192) {
      throw new Error(`Unexpected meshopt result length: ${result.byteLength}`);
    }

    return { byteLength: result.byteLength };
  } finally {
    taskProcessor.destroy();
  }
}

async function loadDracoModel(Cesium, fixture) {
  const { host, widget } = createWidget(Cesium);
  try {
    const model = await Cesium.Model.fromGltfAsync({ url: fixture });
    widget.scene.primitives.add(model);
    await renderUntil(widget, () => model.ready);
    return { ready: model.ready };
  } finally {
    widget.destroy();
    host.remove();
  }
}

async function loadDracoPointCloud(Cesium, fixture) {
  const { host, widget } = createWidget(Cesium);
  try {
    const tileset = await Cesium.Cesium3DTileset.fromUrl(fixture);
    widget.scene.primitives.add(tileset);
    widget.camera.viewBoundingSphere(
      tileset.boundingSphere,
      new Cesium.HeadingPitchRange(
        0.0,
        -0.5,
        tileset.boundingSphere.radius * 2.0,
      ),
    );
    await renderUntil(widget, () => tileset.tilesLoaded);
    return { tilesLoaded: tileset.tilesLoaded };
  } finally {
    widget.destroy();
    host.remove();
  }
}

async function loadGaussianSplats(Cesium, fixture) {
  const { host, widget } = createWidget(Cesium);
  try {
    const tileset = await Cesium.Cesium3DTileset.fromUrl(fixture);
    widget.scene.primitives.add(tileset);
    widget.camera.viewBoundingSphere(
      tileset.boundingSphere,
      new Cesium.HeadingPitchRange(
        0.0,
        -0.5,
        tileset.boundingSphere.radius * 2.0,
      ),
    );
    await renderUntil(widget, () => tileset.tilesLoaded);
    return { tilesLoaded: tileset.tilesLoaded };
  } finally {
    widget.destroy();
    host.remove();
  }
}

async function runSmokeTest() {
  const query = new URLSearchParams(window.location.search);
  const entry = query.get("entry");
  const base = query.get("base");
  const ktx2Fixture = query.get("ktx2Fixture");
  const dracoModelFixture = query.get("dracoModelFixture");
  const dracoPointCloudFixture = query.get("dracoPointCloudFixture");
  const gaussianSplatsFixture = query.get("gaussianSplatsFixture");
  const distribution = query.get("distribution");

  if (
    !entry ||
    !base ||
    !ktx2Fixture ||
    !dracoModelFixture ||
    !dracoPointCloudFixture ||
    !gaussianSplatsFixture ||
    !distribution
  ) {
    throw new Error("Artifact smoke test configuration is incomplete");
  }

  window.CESIUM_BASE_URL = base;
  const Cesium = await loadCesium(entry, distribution);
  window.artifactSmokeResult.imported = true;
  window.artifactSmokeResult.featureDetails = {
    dracoGeometry: await loadDracoModel(Cesium, dracoModelFixture),
    dracoPointCloud: await loadDracoPointCloud(Cesium, dracoPointCloudFixture),
    gaussianSplats: await loadGaussianSplats(Cesium, gaussianSplatsFixture),
    ktx2: await transcodeKtx2(Cesium, ktx2Fixture),
    meshopt: await decodeMeshopt(Cesium),
  };
  window.artifactSmokeResult.featureCompleted = true;
}

runSmokeTest()
  .catch((error) => {
    window.artifactSmokeResult.errors.push(String(error));
  })
  .finally(() => {
    window.artifactSmokeResult.ready = true;
  });
