import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Hybrid Snapping Sandcastle
//
// This sandcastle demonstrates the suggested way to combine the two snapping
// APIs into a single, responsive snapping experience:
//
//   1. Hover — client-side Scene.snap on every mouse move. It is GPU-based
//      and involves no network latency, so it can run continuously. It snaps
//      to the rendered geometry, so it is an approximation, but a fast
//      calculation. It provides two pieces of information that the server API
//      cannot, namely which element is under the cursor, and where on the
//      geometry the user is hovering.
//
//   2. Click — calls server-side IonSnapService.snap. The ion element
//      snap endpoint runs the native iTwin snap functionality against the
//      true iModel geometry, giving an authoritative, precision result. But it
//      is per-element. The caller must supply an element id and a world-space
//      test point. It cannot discover geometry on its own, hence client-side
//      Scene.snap is used to find the element and seed the test point.
//
// The key idea is that the client snap feeds the server snap. On click, the
// element id comes from the client hit's picked feature, and the client snap
// point becomes the server request's testPoint. The client has already
// answered "which feature did the user mean?"; the server's job is to refine
// that choice against the source geometry. Seeding the server snap from the
// client hit (rather than re-picking or using a raw cursor ray) guarantees
// the element id and the test point refer to the same geometry, and gives the
// server a test point that is already on (and edge-refined toward) that
// geometry.
//
// Because the client result is instant and the server result is authoritative,
// the sandcastles shows the client point immediately on click, then replaces
// it when the server responds.
//
// Requires a geolocated iModel-backed asset on an account with the asset
// elements feature enabled, and, for the client-side half of hybrid snapping
// to work fully, that tileset must be exported with edge visibility data, as
// described in this glTF extension:
// https://github.com/KhronosGroup/glTF/pull/2479

// An iModel-backed ion asset id (numeric), on an account with the asset
// elements feature enabled.
const ASSET_ID = 0;

// To test against a non-production ion deployment (e.g. while the feature is
// behind a beta flag), set these before the Viewer is created so its base
// imagery, the tileset, and the snapper all use that deployment:
//   Cesium.Ion.defaultServer = "https://api.ion-development.cesium.com";
//   Cesium.Ion.defaultAccessToken = "<token for that deployment>";

const viewer = new Cesium.Viewer("cesiumContainer");

// Include translucent geometry in the depth used by pickPosition, so clicking
// transparent surfaces yields a test point on the surface rather than on
// whatever opaque geometry lies behind it. If you'd rather snap / pick through
// transparent surfaces, set this to false.
viewer.scene.pickTranslucentDepth = true;

// Color scheme (kept in sync with the on-screen legend).
const COLORS = {
  hoverEdge: {
    fill: Cesium.Color.CYAN,
    swatch: "#00ffff",
  },
  hoverSurface: {
    fill: Cesium.Color.YELLOW,
    swatch: "#ffff00",
  },
  client: {
    fill: Cesium.Color.LIME,
    swatch: "#00ff00",
  },
  server: {
    fill: Cesium.Color.RED,
    swatch: "#ff0000",
  },
  serverSurface: {
    fill: Cesium.Color.ORANGE,
    swatch: "#ffa500",
  },
};

addLegend();
const statsOverlay = addStatsOverlay();

// All markers live in one collection so they can be hidden while picking, and
// so they never steal Scene.pick from the tileset underneath the cursor.
const markers = viewer.scene.primitives.add(new Cesium.PrimitiveCollection());
const points = markers.add(new Cesium.PointPrimitiveCollection());
const lines = markers.add(new Cesium.PolylineCollection());

// The hover indicator, driven by client-side Scene.snap on mouse move.
const hoverPoint = points.add({
  show: false,
  pixelSize: 10,
  outlineColor: Cesium.Color.WHITE,
  outlineWidth: 2,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
});

// The committed pair: client-side result and server result, with a line
// showing the deviation between them.
const clientPoint = points.add({
  show: false,
  color: COLORS.client.fill,
  pixelSize: 8,
  outlineColor: Cesium.Color.WHITE,
  outlineWidth: 2,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
});
const serverPoint = points.add({
  show: false,
  pixelSize: 14,
  outlineColor: Cesium.Color.WHITE,
  outlineWidth: 2,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
});
const deviationLine = lines.add({
  show: false,
  width: 2,
  material: Cesium.Material.fromType("Color", {
    color: Cesium.Color.WHITE,
  }),
});

const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID);
tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_AND_EDGES;
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// These options demonstrate that the client-side portion of this sandcastle
// functions properly whether edges are visible or not, so long as they are
// present in the dataset.
Sandcastle.addToolbarMenu([
  {
    text: "Surfaces + Edges",
    onselect: function () {
      tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_AND_EDGES;
    },
  },
  {
    text: "Surfaces Only",
    onselect: function () {
      tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_ONLY;
    },
  },
  {
    text: "Edges Only",
    onselect: function () {
      tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.EDGES_ONLY;
    },
  },
]);

// ============================ Hybrid Snapping ===============================

// Step 0 — create the server-side snapper once. fromAssetId retrieves the
// asset's iModel -> ECEF transform a single time; every snap() reuses it.
const snapper = await Cesium.IonSnapService.fromAssetId(ASSET_ID);

// This function performs a client-side snap at a requested screen position.
function clientSnap(screenPos) {
  markers.show = false;
  const hit = viewer.scene.snap(screenPos);
  markers.show = true;
  return hit;
}

// Step 1 — continuous client-side snapping while the cursor moves and hovers.
// Scene.snap prefers edges when they are within reach and falls back to the
// surface under the cursor, approximating the server's Nearest behavior. While
// hovering and moving, the snap hit is used for visual feedback so the user
// can tell what will be the snap point committed once they decide to click.
viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
  const hit = clientSnap(movement.endPosition);
  hoverPoint.show = Cesium.defined(hit);
  if (Cesium.defined(hit)) {
    hoverPoint.position = hit.position;
    hoverPoint.color = hit.isEdge
      ? COLORS.hoverEdge.fill
      : COLORS.hoverSurface.fill;
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

const stats = {
  count: 0,
  minPixels: Number.POSITIVE_INFINITY,
  maxPixels: 0,
  sumPixels: 0,
  minMeters: Number.POSITIVE_INFINITY,
  maxMeters: 0,
  sumMeters: 0,
};

// Guards against a stale server response landing after a newer click.
// The server snap is async: any production implementation needs a way for a
// newer click to supersede one still in flight.
let clickSequence = 0;

let lastPair;

// Step 2 — upon click, commit the snap. This is the heart of hybrid snapping:
// run the client snap one more time at the click position, then use its hit
// to seed the server request. The hit's feature supplies the element id and
// the hit's position supplies the testPoint.
viewer.screenSpaceEventHandler.setInputAction(async function onLeftClick(
  movement,
) {
  const screenPos = Cesium.Cartesian2.clone(movement.position);
  const sequence = ++clickSequence;

  const clientHit = clientSnap(screenPos);

  // Step 2a — Which element? The server snap is per-element, and element
  // discovery is inherently client-side. Prefer the client-snapped feature so
  // the element id and the test point are guaranteed to refer to the same
  // geometry. Only when the client snap found nothing, fall back to a region
  // pick so an element slightly off-cursor can still be found.
  let pickFeature = clientHit?.object;
  if (!Cesium.defined(pickFeature)) {
    markers.show = false;
    pickFeature = viewer.scene.pick(screenPos, 25, 25);
    markers.show = true;
  }
  if (
    !Cesium.defined(pickFeature) ||
    !Cesium.defined(pickFeature.getProperty)
  ) {
    console.warn("no element under cursor");
    return;
  }
  const element = pickFeature.getProperty("element");
  const elementId = `0x${element.toString(16)}`;

  // Step 2b — Where? Seed the server's testPoint from the client snap point.
  // The click means "commit what the hover showed": the client hit is already
  // on the chosen geometry (and pulled toward its nearest edge), which makes
  // it a far better testPoint than a raw cursor pick. The server then only
  // has to refine it against the true iModel geometry, and any remaining
  // client-vs-server separation cleanly measures the client snap's error.
  const testPoint = clientHit?.position ?? viewer.scene.pickPosition(screenPos);
  if (!Cesium.defined(testPoint)) {
    console.warn("no position under cursor");
    return;
  }

  // Step 2c — show the client result immediately, realizing that the
  // more authoritative server result later.
  clientPoint.position = testPoint;
  clientPoint.show = true;
  serverPoint.show = false;
  deviationLine.show = false;

  // Step 2d — the server-side snap. The camera and canvas dimensions let
  // the service compose the view matrix the native snapper uses.
  let result;
  try {
    const canvas = viewer.scene.canvas;
    result = await snapper.snap({
      elementId: elementId,
      testPoint: testPoint,
      camera: viewer.camera,
      canvasWidth: canvas.clientWidth,
      canvasHeight: canvas.clientHeight,
      snapMode: Cesium.IonSnapMode.NEAREST,
    });
  } catch (error) {
    console.error("server snap failed:", error);
    return;
  }
  if (sequence !== clickSequence) {
    // A newer click superseded this one.
    return;
  }
  if (!Cesium.defined(result) || !Cesium.defined(result.snapPoint)) {
    console.warn("no server snap possible for this element/point");
    return;
  }

  // Step 3 — plot the server respone. geometryType SURFACE means the server
  // snap tracked the surface under the cursor; any other type means it was
  // snapped to an edge.
  const onSurface = result.geometryType === Cesium.IonSnapGeometryType.SURFACE;
  serverPoint.position = result.snapPoint;
  serverPoint.color = onSurface
    ? COLORS.serverSurface.fill
    : COLORS.server.fill;
  serverPoint.show = true;

  reportDeviation(clientHit, testPoint, result, onSurface);
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Measure the client-server deviation.
function reportDeviation(clientHit, clientPosition, serverResult, onSurface) {
  const serverPosition = serverResult.snapPoint;
  const meters = Cesium.Cartesian3.distance(clientPosition, serverPosition);
  const pixels = pixelSeparation(clientPosition, serverPosition);

  deviationLine.positions = [clientPosition, serverPosition];
  deviationLine.show = meters > 0.001;

  stats.count++;
  stats.minMeters = Math.min(stats.minMeters, meters);
  stats.maxMeters = Math.max(stats.maxMeters, meters);
  stats.sumMeters += meters;
  if (Cesium.defined(pixels)) {
    stats.minPixels = Math.min(stats.minPixels, pixels);
    stats.maxPixels = Math.max(stats.maxPixels, pixels);
    stats.sumPixels += pixels;
  }

  const kind = `client ${clientHit?.isEdge ? "edge" : "surface"} vs server ${
    onSurface ? "surface" : "edge"
  }`;
  lastPair = {
    clientPosition: Cesium.Cartesian3.clone(clientPosition),
    serverPosition: Cesium.Cartesian3.clone(serverPosition),
    meters: meters,
  };
  statsHtml =
    `<div>at click: ${formatPixels(pixels)}, ${meters.toFixed(3)} m (${kind})</div>` +
    `<div>pixels min/mean/max: ${formatPixels(stats.minPixels)} / ` +
    `${formatPixels(stats.sumPixels / stats.count)} / ${formatPixels(stats.maxPixels)}</div>` +
    `<div>meters min/mean/max: ${stats.minMeters.toFixed(3)} / ` +
    `${(stats.sumMeters / stats.count).toFixed(3)} / ${stats.maxMeters.toFixed(3)}</div>` +
    `<div>samples: ${stats.count}</div>`;
  updateOverlay();

  console.log(
    `deviation: ${formatPixels(pixels)}, ${meters.toFixed(3)} m (${kind})`,
    serverResult,
  );
}

// Project the frozen world-space pair to the canvas and measure the 2D
// separation, or undefined when either point is off-screen/behind the camera.
function pixelSeparation(clientPosition, serverPosition) {
  const clientScreen =
    viewer.scene.cartesianToCanvasCoordinates(clientPosition);
  const serverScreen =
    viewer.scene.cartesianToCanvasCoordinates(serverPosition);
  return Cesium.defined(clientScreen) && Cesium.defined(serverScreen)
    ? Cesium.Cartesian2.distance(clientScreen, serverScreen)
    : undefined;
}

// The accumulated per-click stats html; the "current" line is prepended live.
let statsHtml = "<div>click the model to sample</div>";
let lastCurrentLine = "";

function updateOverlay(currentLine = "") {
  statsOverlay.innerHTML = `<b>Deviation (client vs server)</b>${currentLine}${statsHtml}`;
}

// Live readout: the world-space deviation is frozen at click time; only its
// projection changes with the camera. No re-snapping happens here. Zooming
// in simply shows the same fixed error spanning more pixels.
viewer.scene.postRender.addEventListener(function () {
  if (!Cesium.defined(lastPair)) {
    return;
  }
  const pixels = pixelSeparation(
    lastPair.clientPosition,
    lastPair.serverPosition,
  );
  const currentLine = `<div><b>current: ${formatPixels(pixels)}</b>, ${lastPair.meters.toFixed(3)} m (frozen pair)</div>`;
  if (currentLine !== lastCurrentLine) {
    lastCurrentLine = currentLine;
    updateOverlay(currentLine);
  }
});

function formatPixels(pixels) {
  return Cesium.defined(pixels) && pixels !== Number.POSITIVE_INFINITY
    ? `${pixels.toFixed(1)} px`
    : "? px";
}

// On-screen legend describing what each colored point means.
function addLegend() {
  const entries = [
    [COLORS.hoverEdge.swatch, "Hover snap (edge, client)"],
    [COLORS.hoverSurface.swatch, "Hover snap (surface, client)"],
    [COLORS.client.swatch, "Committed client snap"],
    [COLORS.server.swatch, "Server snap (edge)"],
    [COLORS.serverSurface.swatch, "Server snap (surface)"],
  ];

  const legend = document.createElement("div");
  legend.style.cssText =
    "position:absolute; top:10px; right:10px; z-index:1000; background:rgba(0,0,0,0.7);" +
    "color:#fff; padding:10px 12px; font:12px/1.5 sans-serif; border-radius:6px; pointer-events:none;";

  let html = "<b>Legend</b>";
  for (const [swatch, label] of entries) {
    html +=
      `<div style="margin-top:4px; display:flex; align-items:center;">` +
      `<span style="display:inline-block; width:12px; height:12px; border-radius:50%;` +
      ` background:${swatch}; border:2px solid #fff; margin-right:6px;"></span>${label}</div>`;
  }
  legend.innerHTML = html;
  viewer.container.appendChild(legend);
}

// On-screen deviation stats, updated per click.
function addStatsOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:absolute; bottom:30px; right:10px; z-index:1000; background:rgba(0,0,0,0.7);" +
    "color:#fff; padding:10px 12px; font:12px/1.5 sans-serif; border-radius:6px; pointer-events:none;";
  overlay.innerHTML =
    "<b>Deviation (client vs server)</b><div>click the model to sample</div>";
  viewer.container.appendChild(overlay);
  return overlay;
}
