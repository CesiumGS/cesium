import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// =============================================================================
// Interactive iModel snapping demo (snapping-dev)
//
// WHAT THIS DOES
// Renders an iModel as 3D Tiles and lets you left-click to snap-to-geometry.
// Each click picks the element + cursor world position, asks the backend to run
// the iTwin native `requestSnap`, and draws the returned snap/hit points. This
// client speaks WGS84; the backend bridges WGS84 <-> iModel coordinates.
//
// WHAT IT REQUIRES
//   - The `cesium-ion-imodel-api-prototype` server on `SERVER` (default :3000)
//     with the `snapathon` branch checked out. It exposes the two endpoints used
//     here: GET `.../imodel-conn` (-> ecefTransform) and POST `.../request-snap`.
//     Serve this sandcastle from an origin the server's CORS allows (default
//     :8081). See the server's QUICKSTART-SNAPPING.md.
//   - `ASSET_ID` must be a geolocated iModel, and `tilesetUrl` (below) must point
//     at its exported 3D Tiles.
//
// WHY IT NEEDS ecefTransform
// Native `requestSnap` wants a `worldToView` matrix mapping iModel-world ->
// pixels, but Cesium lives in ECEF. The iModel's geolocation `E` (iModel-spatial
// -> ECEF) bridges the two; it's constant per asset, so it's fetched ONCE from
// `imodel-conn` and cached in `ecefFromIModel`. Per click we compose
// `worldToView = V * P * Vm * E` (see `buildWorldToView`) and send it, along with
// the element `id` and the cursor as a WGS84 `testPoint`, to `request-snap`.
// =============================================================================

console.warn = () => {};
const viewer = new Cesium.Viewer("cesiumContainer", {});
viewer.scene.globe.show = true;
viewer.scene.debugShowFramesPerSecond = true;

const SERVER = "http://localhost:3000";
const ASSET_ID = "844c3411-0a0c-4ed5-b608-34dae75d3982";

// 4x4 identity (array-of-rows) — the original view-blind behavior, used as the
// "A" side of the A/B comparison.
const IDENTITY_ROWS = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

// Color scheme (kept in sync with the on-screen legend).
const COLORS = {
  picked: {
    fill: Cesium.Color.LIME,
    outline: Cesium.Color.CYAN,
    swatch: "#00ff00",
  },
  snapComputed: {
    fill: Cesium.Color.RED,
    outline: Cesium.Color.YELLOW,
    swatch: "#ff0000",
  },
  hitComputed: {
    fill: Cesium.Color.PINK,
    outline: Cesium.Color.FUCHSIA,
    swatch: "#ffc0cb",
  },
  snapIdentity: {
    fill: Cesium.Color.GRAY,
    outline: Cesium.Color.WHITE,
    swatch: "#808080",
  },
};

// A/B comparison: when on, every click also snaps with an identity worldToView
// so the view-blind result can be compared against the view-correct one.
let abTestEnabled = false;
Sandcastle.addToggleButton(
  "A/B compare worldToView (identity vs computed)",
  abTestEnabled,
  function (checked) {
    abTestEnabled = checked;
  },
);

addLegend();

// Need to replace this with tileset url from mesh export service
// Use the following APIs to get that URL:
// - https://developer.bentley.com/apis/mesh-export/operations/get-exports/
// - https://developer.bentley.com/apis/mesh-export/operations/get-export/
// NB: the URL returned will not include tileset.json at the end, so you will need to append that to the URL before using it here.
const tilesetUrl = "";
const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl);
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// iModel-spatial -> ECEF transform (Cesium.Matrix4). Fetched once; the iModel's
// geolocation is static, so this never changes for a given asset.
const ecefFromIModel = await fetchEcefFromIModel();

viewer.screenSpaceEventHandler.setInputAction(async function onLeftClick(
  movement,
) {
  const pickPosition = viewer.scene.pickPosition(movement.position);
  const pickFeature = viewer.scene.pick(movement.position);
  if (!pickPosition || !pickFeature) {
    return;
  }
  const element = pickFeature.getProperty("element");
  const elementId = `0x${element.toString(16)}`;

  const cartoRad = Cesium.Cartographic.fromCartesian(pickPosition);
  const carto = {
    longitude: Cesium.Math.toDegrees(cartoRad.longitude),
    latitude: Cesium.Math.toDegrees(cartoRad.latitude),
    height: cartoRad.height,
  };
  console.log("picked carto:", carto);
  console.log("elementId:", elementId);

  // Validation check #1: does our ECEF -> pixel projection reproduce the click?
  pixelProjectionCheck(viewer.scene.camera, pickPosition, movement.position);

  // Build the world(iModel) -> view(pixels) matrix the native requestSnap wants.
  const computedRows = matrix4ToRows(
    buildWorldToView(
      viewer.scene.camera,
      viewer.scene.context.drawingBufferWidth,
      viewer.scene.context.drawingBufferHeight,
      ecefFromIModel,
    ),
  );

  // "B" — snap with the real, view-correct matrix.
  const snapB = await doSnap(elementId, carto, computedRows);
  console.log("snap result (computed worldToView):", snapB);

  // Validation check #2: iModel transform vs server geo-coordinate service.
  frameConsistencyCheck(ecefFromIModel, snapB, carto);

  // Always show the picked cursor position.
  addPoint(carto, COLORS.picked);

  if (snapIsOk(snapB)) {
    addPoint(snapB.snapPoint, COLORS.snapComputed);
    addPoint(snapB.hitPoint, COLORS.hitComputed);
  } else {
    console.warn("computed snap was not successful:", snapB && snapB.status);
  }

  if (!abTestEnabled) {
    return;
  }

  // "A" — snap with identity worldToView (the original view-blind behavior).
  const snapA = await doSnap(elementId, carto, IDENTITY_ROWS);
  console.log("snap result (identity worldToView):", snapA);

  if (snapIsOk(snapA)) {
    addPoint(snapA.snapPoint, COLORS.snapIdentity);
  } else {
    console.warn("identity snap was not successful:", snapA && snapA.status);
  }

  if (snapIsOk(snapA) && snapIsOk(snapB)) {
    logSnapSeparation(snapA.snapPoint, snapB.snapPoint);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

function snapIsOk(snapResult) {
  return (
    snapResult && (snapResult.status === undefined || snapResult.status === 0)
  );
}

async function doSnap(elementId, carto, worldToViewRows) {
  console.log("sending worldToView:", worldToViewRows);
  const response = await fetch(
    `${SERVER}/api/assets/${ASSET_ID}/template/request-snap`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: elementId,
        testPoint: {
          latitude: carto.latitude,
          longitude: carto.longitude,
          height: carto.height,
        },
        worldToView: worldToViewRows,
      }),
    },
  );
  return response.json();
}

// Plot a WGS84 { longitude, latitude, height } point with the given color pair.
function addPoint(wgs, color) {
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      wgs.longitude,
      wgs.latitude,
      wgs.height,
    ),
    point: {
      color: color.fill,
      pixelSize: 10,
      outlineColor: color.outline,
      outlineWidth: 3,
    },
  });
}

// Report how far the identity (A) and computed (B) snap points are apart, in
// world meters and in screen pixels (pixels is the meaningful number, since
// snapping is a screen-space operation).
function logSnapSeparation(snapA, snapB) {
  const a = Cesium.Cartesian3.fromDegrees(
    snapA.longitude,
    snapA.latitude,
    snapA.height,
  );
  const b = Cesium.Cartesian3.fromDegrees(
    snapB.longitude,
    snapB.latitude,
    snapB.height,
  );
  const meters = Cesium.Cartesian3.distance(a, b);

  const aPx = viewer.scene.cartesianToCanvasCoordinates(
    a,
    new Cesium.Cartesian2(),
  );
  const bPx = viewer.scene.cartesianToCanvasCoordinates(
    b,
    new Cesium.Cartesian2(),
  );
  const pixels = aPx && bPx ? Cesium.Cartesian2.distance(aPx, bPx) : Number.NaN;

  console.log(
    `A/B separation: identity vs computed snapPoint = ${meters.toFixed(3)} m / ${pixels.toFixed(1)} px`,
  );
}

// Fetch the iModel-spatial -> ECEF transform from the imodel-conn endpoint and
// return it as a Cesium.Matrix4.
async function fetchEcefFromIModel() {
  const response = await fetch(
    `${SERVER}/api/assets/${ASSET_ID}/template/imodel-conn`,
  );
  const data = await response.json();
  if (!data.ecefTransform) {
    throw new Error(
      "imodel-conn returned no ecefTransform — is the iModel geolocated?",
    );
  }
  return matrix4FromRows(data.ecefTransform);
}

// world(iModel) -> view(pixels) = V * P * Vm * E
//   E  : iModel -> ECEF        (from the iModel geolocation)
//   Vm : ECEF -> eye           (camera.viewMatrix)
//   P  : eye -> clip           (camera.frustum.projectionMatrix)
//   V  : clip -> pixels        (viewport matrix, y-down, z -> [0,1])
function buildWorldToView(camera, width, height, ecefFromIModelMatrix) {
  const Vm = camera.viewMatrix;
  const P = camera.frustum.projectionMatrix;
  const V = viewportMatrix(width, height);

  const VmE = Cesium.Matrix4.multiply(
    Vm,
    ecefFromIModelMatrix,
    new Cesium.Matrix4(),
  );
  const PVmE = Cesium.Matrix4.multiply(P, VmE, new Cesium.Matrix4());
  return Cesium.Matrix4.multiply(V, PVmE, new Cesium.Matrix4());
}

// clip-space -> view (pixel) space, projective.
//   px = (ndcX * 0.5 + 0.5) * width
//   py = (1 - (ndcY * 0.5 + 0.5)) * height   (y-down, top-left origin)
//   pz = ndcZ * 0.5 + 0.5                     ([-1,1] -> [0,1] depth)
function viewportMatrix(width, height) {
  return new Cesium.Matrix4(
    width / 2,
    0,
    0,
    width / 2,
    0,
    -height / 2,
    0,
    height / 2,
    0,
    0,
    0.5,
    0.5,
    0,
    0,
    0,
    1,
  );
}

// Cesium.Matrix4 (constructor is row-major) from an array-of-rows.
function matrix4FromRows(rows) {
  return new Cesium.Matrix4(
    rows[0][0],
    rows[0][1],
    rows[0][2],
    rows[0][3],
    rows[1][0],
    rows[1][1],
    rows[1][2],
    rows[1][3],
    rows[2][0],
    rows[2][1],
    rows[2][2],
    rows[2][3],
    rows[3][0],
    rows[3][1],
    rows[3][2],
    rows[3][3],
  );
}

// Cesium.Matrix4 -> array-of-rows (Matrix4dProps, row-major) for the JSON body.
function matrix4ToRows(matrix) {
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const row = Cesium.Matrix4.getRow(matrix, i, new Cesium.Cartesian4());
    rows.push([row.x, row.y, row.z, row.w]);
  }
  return rows;
}

// Project an ECEF point straight to pixels (V * P * Vm) and compare against the
// actual click location. Confirms the projection/viewport conventions.
function pixelProjectionCheck(camera, ecefPoint, clickPosition) {
  const V = viewportMatrix(
    viewer.scene.context.drawingBufferWidth,
    viewer.scene.context.drawingBufferHeight,
  );
  const PVm = Cesium.Matrix4.multiply(
    camera.frustum.projectionMatrix,
    camera.viewMatrix,
    new Cesium.Matrix4(),
  );
  const M = Cesium.Matrix4.multiply(V, PVm, new Cesium.Matrix4());

  const clip = Cesium.Matrix4.multiplyByVector(
    M,
    new Cesium.Cartesian4(ecefPoint.x, ecefPoint.y, ecefPoint.z, 1),
    new Cesium.Cartesian4(),
  );
  // The viewport matrix output is in drawing-buffer pixels; click is in CSS px.
  const pixelRatio = viewer.scene.pixelRatio || 1;
  const px = clip.x / clip.w / pixelRatio;
  const py = clip.y / clip.w / pixelRatio;

  const dx = px - clickPosition.x;
  const dy = py - clickPosition.y;
  const dist = Math.hypot(dx, dy);
  const tag = dist < 3 ? "PASS" : "CHECK";
  console.log(
    `[${tag}] pixel-projection: projected (${px.toFixed(1)}, ${py.toFixed(1)}) vs ` +
      `click (${clickPosition.x.toFixed(1)}, ${clickPosition.y.toFixed(1)}) — ${dist.toFixed(2)} px`,
  );
}

// Push the server's iModel-space test point through E -> ECEF -> WGS84 and
// compare with the WGS84 we sent. Confirms E (iModel geolocation) and the
// server's geo-coordinate service describe the same frame.
function frameConsistencyCheck(ecefFromIModelMatrix, snapResult, carto) {
  const local =
    snapResult && snapResult._debug && snapResult._debug.testPointLocal;
  if (!local) {
    console.log("[skip] frame-consistency: server did not echo testPointLocal");
    return;
  }
  const ecef = Cesium.Matrix4.multiplyByVector(
    ecefFromIModelMatrix,
    new Cesium.Cartesian4(local.x, local.y, local.z, 1),
    new Cesium.Cartesian4(),
  );
  const cartoRad = Cesium.Cartographic.fromCartesian(
    new Cesium.Cartesian3(ecef.x, ecef.y, ecef.z),
  );
  const back = {
    longitude: Cesium.Math.toDegrees(cartoRad.longitude),
    latitude: Cesium.Math.toDegrees(cartoRad.latitude),
    height: cartoRad.height,
  };
  const dLon = back.longitude - carto.longitude;
  const dLat = back.latitude - carto.latitude;
  const dH = back.height - carto.height;
  // ~1e-7 deg ~ 1 cm; allow a few cm of slop from conversion round-trips.
  const ok =
    Math.abs(dLon) < 1e-6 && Math.abs(dLat) < 1e-6 && Math.abs(dH) < 0.5;
  const tag = ok ? "PASS" : "CHECK";
  console.log(
    `[${tag}] frame-consistency: E(testPointLocal) -> WGS84 = ` +
      `(${back.latitude.toFixed(7)}, ${back.longitude.toFixed(7)}, ${back.height.toFixed(3)}) ` +
      `vs sent (${carto.latitude.toFixed(7)}, ${carto.longitude.toFixed(7)}, ${carto.height.toFixed(3)})`,
  );
}

// On-screen legend describing what each colored point means.
function addLegend() {
  const entries = [
    [COLORS.picked.swatch, "Picked position (cursor)"],
    [COLORS.snapComputed.swatch, "Snap point — computed worldToView (B)"],
    [COLORS.hitComputed.swatch, "Hit point — computed worldToView"],
    [
      COLORS.snapIdentity.swatch,
      "Snap point — identity worldToView (A, A/B only)",
    ],
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
