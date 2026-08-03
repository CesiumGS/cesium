window.cspTestResult = {
  errors: [],
  featureCompleted: false,
  featureDetails: undefined,
  imported: false,
  ready: false,
  violations: [],
  wasmBlocked: false,
};

window.addEventListener("error", (event) => {
  window.cspTestResult.errors.push(event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  window.cspTestResult.errors.push(String(event.reason));
});

window.addEventListener("securitypolicyviolation", (event) => {
  window.cspTestResult.violations.push({
    blockedURI: event.blockedURI,
    effectiveDirective: event.effectiveDirective,
    sourceFile: event.sourceFile,
  });
});

async function loadSpz(Cesium) {
  const spzDataBase64 =
    "H4sIAAAAAAAAA71SwQnDQAw7uG836Cfb9FcKXag7dIe8O4JHySAB162JHgEHKYQInzGOLHTn3G/PR2+tXeP0S6RpbkP/RRboRI4IZJ3IIj+taGjmSEplXomgCUABBtCHPQT0wUcf4vAGJjxMs9d41XjXMdbxORpxDzvrbLxGCWlo6733q5oyYIoNmriQaRsuqNOiILMTtlihyIqPP5m2YYoNZSmmLMWUpci/Bm3DFXlnVUGmbZhiQ3kOV5bi/FK+X6yM/usGAAA=";
  const spzData = Uint8Array.from(atob(spzDataBase64), (character) =>
    character.charCodeAt(0),
  );
  const gltf = { accessors: [{ count: 27 }] };
  const primitive = {
    attributes: {
      POSITION: 0,
      _SH_DEGREE_3_COEF_0: 1,
    },
  };
  const bufferViewLoader = {
    typedArray: spzData,
    load: () => Promise.resolve(),
  };
  const resourceCache = function () {};
  resourceCache.getBufferViewLoader = () => bufferViewLoader;
  resourceCache.unload = () => {};
  const loader = new Cesium.GltfSpzLoader({
    resourceCache: resourceCache,
    gltf: gltf,
    primitive: primitive,
    spz: { bufferView: 0 },
    gltfResource: {},
    baseResource: {},
  });

  await loader.load();
  for (let i = 0; i < 1000; i++) {
    if (loader.process({})) {
      const { gcloud } = loader.decodedData;
      const result = {
        numPoints: gcloud.numPoints,
        shDegree: gcloud.shDegree,
      };
      if (gcloud.strictCspChecks !== undefined) {
        result.strictCspChecks = gcloud.strictCspChecks;
      }
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("Timed out waiting for SPZ decoding");
}

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function runWorkerTask(Cesium, workerName, parameters, transfers) {
  const taskProcessor = new Cesium.TaskProcessor(workerName);
  try {
    return await taskProcessor.scheduleTask(parameters, transfers);
  } finally {
    taskProcessor.destroy();
  }
}

async function decodeMeshopt(Cesium) {
  const source = decodeBase64(
    "oAUZJkCZgAQAAAU/P8D/fn1+fX59fn1+fX7ADAAAfX4FAAhISEgAAAAFAAzMzH1+fX59zAAAAH59BQhAmYBmZgAABQzA/8B9fn1+fX59//8AAH59fn1+fX59AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8//z8AAA==",
  );
  const result = await runWorkerTask(
    Cesium,
    "decodeMeshopt",
    {
      count: 24,
      byteStride: 8,
      source: source,
      mode: "ATTRIBUTES",
    },
    [source.buffer],
  );

  if (result.byteLength !== 192) {
    throw new Error(`Unexpected meshopt result length: ${result.byteLength}`);
  }
}

async function transcodeKtx2(Cesium) {
  const response = await fetch("/Specs/Data/Images/Green4x4_ETC1S.ktx2");
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

async function compileWasmOnMainThread() {
  try {
    await WebAssembly.compile(
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
    );
  } catch (error) {
    window.cspTestResult.wasmBlocked = true;
  }
}

async function renderMeshoptTerrain(Cesium) {
  const provider = await Cesium.Cesium3DTilesTerrainProvider.fromUrl(
    "/Specs/Data/Cesium3DTiles/Terrain/Test/tileset.json",
    { requestVertexNormals: true },
  );
  const host = document.createElement("div");
  host.style.width = "640px";
  host.style.height = "480px";
  document.body.append(host);

  const widget = new Cesium.CesiumWidget(host, {
    terrainProvider: provider,
    baseLayer: false,
    requestRenderMode: false,
    skyBox: false,
    skyAtmosphere: false,
  });

  try {
    widget.scene.globe.baseColor = Cesium.Color.RED;
    widget.scene.backgroundColor = Cesium.Color.BLACK;
    widget.camera.setView({
      destination: Cesium.Rectangle.fromDegrees(-179.0, -89.0, -1.0, 89.0),
    });

    let renderedTile;
    for (let i = 0; i < 240; i++) {
      widget.render();
      renderedTile = widget.scene.globe._surface._tilesToRender.find(
        (tile) => tile.renderable && tile.data?.mesh,
      );
      if (widget.scene.globe.tilesLoaded && renderedTile) {
        break;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (!renderedTile) {
      throw new Error("Timed out waiting for compressed terrain rendering");
    }

    const mesh = renderedTile.data.mesh;
    const context = widget.scene.context._gl;
    const pixel = new Uint8Array(4);
    context.readPixels(
      Math.floor(widget.canvas.width / 2),
      Math.floor(widget.canvas.height / 2),
      1,
      1,
      context.RGBA,
      context.UNSIGNED_BYTE,
      pixel,
    );

    if (
      mesh.vertexCountWithoutSkirts !== 248 ||
      mesh.indexCountWithoutSkirts !== 1380 ||
      pixel[0] <= pixel[1] ||
      pixel[0] <= pixel[2] ||
      pixel[3] !== 255
    ) {
      throw new Error("Compressed terrain did not produce the expected mesh");
    }

    return {
      indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
      pixel: Array.from(pixel),
      tile: {
        level: renderedTile.level,
        x: renderedTile.x,
        y: renderedTile.y,
      },
      vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
    };
  } finally {
    widget.destroy();
    host.remove();
  }
}

try {
  const workerPolicy = new URLSearchParams(window.location.search).get(
    "workerPolicy",
  );
  window.CESIUM_BASE_URL =
    workerPolicy === "denied"
      ? "/packages/engine/Build/UnminifiedDenied/"
      : "/packages/engine/Build/Unminified/";
  const Cesium = await import("/packages/engine/Build/Unminified/index.js");
  window.cspTestResult.imported = true;

  const feature = new URLSearchParams(window.location.search).get("feature");
  if (feature === "spz") {
    const spzWorker = new URLSearchParams(window.location.search).get(
      "spzWorker",
    );
    if (spzWorker === "strict") {
      Cesium.SpzDecoder.workerModuleUrl = new URL(
        "/Specs/e2e/csp/workers/strictSpzDecoder.js",
        window.location.href,
      ).href;
    }
    window.cspTestResult.featureDetails = await loadSpz(Cesium);
    window.cspTestResult.featureCompleted = true;
  } else if (feature === "meshopt") {
    await decodeMeshopt(Cesium);
    window.cspTestResult.featureCompleted = true;
  } else if (feature === "ktx2") {
    window.cspTestResult.featureDetails = await transcodeKtx2(Cesium);
    window.cspTestResult.featureCompleted = true;
  } else if (feature === "terrain") {
    window.cspTestResult.featureDetails = await renderMeshoptTerrain(Cesium);
    window.cspTestResult.featureCompleted = true;
  } else if (feature === "main-wasm") {
    await compileWasmOnMainThread();
  }
} catch (error) {
  window.cspTestResult.errors.push(String(error));
}

setTimeout(() => {
  window.cspTestResult.ready = true;
}, 250);
