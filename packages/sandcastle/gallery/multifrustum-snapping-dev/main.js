import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Multifrustum test harness for Scene.snap. Forces multifrustum rendering
// (log depth off, small farToNearRatio) with edge-bearing geometry in
// different frustums: a NEAR EdgeVisibility.glb model and a FAR tileset.
// Marker: cyan = edge snap, yellow = surface snap, red = snap miss
// (pickPosition fallback). Orange = two-click measurement line.

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
});
const scene = viewer.scene;

// Log depth normally collapses the scene into a single frustum.
scene.logarithmicDepthBuffer = false;
scene.farToNearRatio = 100.0;

const snapInfo = document.getElementById("snapInfo");

let tileset;
let nearModel;

try {
  tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4665927);
  scene.primitives.add(tileset);
  tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_AND_EDGES;

  // FAR target: pull the camera back several km.
  const radius = tileset.boundingSphere.radius;
  const tilesetRange = radius * 12.0;
  await viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(0.0, -0.25, tilesetRange),
  );

  // NEAR target. A frustum spans far/near = farToNearRatio, so a 110x
  // distance ratio guarantees a different frustum at ratios <= 100.
  const camera = scene.camera;
  const nearDistance = tilesetRange / 110.0;
  const nearPos = Cesium.Cartesian3.add(
    camera.positionWC,
    Cesium.Cartesian3.add(
      Cesium.Cartesian3.multiplyByScalar(
        camera.directionWC,
        nearDistance,
        new Cesium.Cartesian3(),
      ),
      Cesium.Cartesian3.multiplyByScalar(
        camera.rightWC,
        nearDistance * 0.3,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    ),
    new Cesium.Cartesian3(),
  );

  nearModel = scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: "../../../Specs/Data/Models/glTF-2.0/EdgeVisibility/glTF-Binary/EdgeVisibility.glb",
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(nearPos),
      color: Cesium.Color.LIGHTGRAY,
    }),
  );
  nearModel.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_AND_EDGES;

  // Scale once the bounding sphere is known.
  await new Promise((resolve) => {
    if (nearModel.ready) {
      resolve();
    } else {
      nearModel.readyEvent.addEventListener(resolve);
    }
  });
  nearModel.scale = Math.max(
    1.0,
    nearDistance / 8.0 / nearModel.boundingSphere.radius,
  );
} catch (error) {
  window.alert(`Error loading scene content: ${error}`);
}

// --- Toolbar ---

function setEdgeMode(mode) {
  tileset.edgeDisplayMode = mode;
  nearModel.edgeDisplayMode = mode;
}

Sandcastle.addToolbarMenu([
  {
    text: "Surfaces + Edges",
    onselect: () => setEdgeMode(Cesium.EdgeDisplayMode.SURFACES_AND_EDGES),
  },
  {
    text: "Edges Only",
    onselect: () => setEdgeMode(Cesium.EdgeDisplayMode.EDGES_ONLY),
  },
  {
    text: "Surfaces Only",
    onselect: () => setEdgeMode(Cesium.EdgeDisplayMode.SURFACES_ONLY),
  },
]);

Sandcastle.addToolbarMenu([
  {
    text: "farToNearRatio: 100",
    onselect: () => (scene.farToNearRatio = 100.0),
  },
  {
    text: "farToNearRatio: 10 (more frustums)",
    onselect: () => (scene.farToNearRatio = 10.0),
  },
  {
    text: "farToNearRatio: 1000 (default)",
    onselect: () => (scene.farToNearRatio = 1000.0),
  },
]);

Sandcastle.addToggleButton("Log depth (1 frustum)", false, function (checked) {
  scene.logarithmicDepthBuffer = checked;
});

Sandcastle.addToggleButton("Show frustums", false, function (checked) {
  scene.debugShowFrustums = checked;
});

Sandcastle.addToggleButton("World terrain", false, function (checked) {
  if (checked) {
    scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
  } else {
    scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  }
});

// --- Snap marker + diagnostics ---

const markers = scene.primitives.add(new Cesium.PointPrimitiveCollection());
const marker = markers.add({
  color: Cesium.Color.YELLOW,
  pixelSize: 10,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  show: false,
});

// --- Measurement line (two clicks) ---

const measurements = scene.primitives.add(new Cesium.PrimitiveCollection());
const measurementPoints = measurements.add(
  new Cesium.PointPrimitiveCollection(),
);
const firstPoint = measurementPoints.add({
  color: Cesium.Color.ORANGE,
  pixelSize: 8,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  show: false,
});
const secondPoint = measurementPoints.add({
  color: Cesium.Color.ORANGE,
  pixelSize: 8,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  show: false,
});

let polyline;
let measuredDistance;

const polylines = measurements.add(new Cesium.PolylineCollection());

function createPolyline(startPosition, endPosition) {
  // Update in place; recreating a Primitive per mouse move flickers black.
  if (!Cesium.defined(polyline)) {
    polyline = polylines.add({
      width: 2.0,
      material: Cesium.Material.fromType("Color", {
        color: Cesium.Color.ORANGE,
      }),
    });
  }
  polyline.positions = [startPosition, endPosition];
  polyline.show = true;
  measuredDistance = Cesium.Cartesian3.distance(startPosition, endPosition);
}

const MeasurementState = {
  READY: 0,
  STARTED: 1,
  FINISHED: 2,
};

let measurementState = MeasurementState.READY;

function describeObject(hit) {
  const primitive = hit?.object?.primitive ?? hit?.object;
  if (!Cesium.defined(primitive)) {
    return "?";
  }
  if (primitive === nearModel) {
    return "NEAR model";
  }
  if (primitive === tileset || primitive?.tileset === tileset) {
    return "FAR tileset";
  }
  return primitive.constructor?.name ?? "?";
}

let colorFrustums = 0;
scene.postRender.addEventListener(function () {
  colorFrustums = scene.numberOfFrustums;
});

// Which frustum slice of the snap render contained the hit.
function describeHitFrustum(hitPosition) {
  const camera = scene.camera;
  const toHit = Cesium.Cartesian3.subtract(
    hitPosition,
    camera.positionWC,
    new Cesium.Cartesian3(),
  );
  const eyeDepth = Cesium.Cartesian3.dot(toHit, camera.directionWC);
  const list = scene.frustumCommandsList;
  for (let i = 0; i < list.length; ++i) {
    if (eyeDepth >= list[i].near && eyeDepth <= list[i].far) {
      return `${i + 1}/${list.length} (${list[i].near.toFixed(0)}-${list[i].far.toFixed(0)} m, depth ${eyeDepth.toFixed(1)} m)`;
    }
  }
  return `none?! (depth ${eyeDepth.toFixed(1)} m)`;
}

function doSnap(screenPos, logToConsole) {
  // Hide overlay primitives so they don't interfere with picking.
  markers.show = false;
  measurements.show = false;
  const hit = scene.snap(screenPos, 25, 25);
  // Read frustum state of the snap render before the next color frame.
  const snapFrustums = scene.numberOfFrustums;
  const hitFrustum = Cesium.defined(hit)
    ? describeHitFrustum(hit.position)
    : undefined;
  const pickPos = scene.pickPosition(screenPos);
  markers.show = true;
  measurements.show = true;

  const lines = [
    `scene frustums: ${colorFrustums}`,
    `snap frustums:  ${snapFrustums}`,
  ];
  let position;

  if (Cesium.defined(hit)) {
    position = hit.position;
    marker.position = hit.position;
    marker.color = hit.isEdge ? Cesium.Color.CYAN : Cesium.Color.YELLOW;
    marker.show = true;

    const err = Cesium.defined(pickPos)
      ? Cesium.Cartesian3.distance(hit.position, pickPos).toFixed(3)
      : "n/a";
    const carto = Cesium.Cartographic.fromCartesian(hit.position);
    lines.push(
      `hit:      ${describeObject(hit)}`,
      `frustum:  ${hitFrustum}`,
      `isEdge:   ${hit.isEdge}  (dx=${hit.x}, dy=${hit.y})`,
      `err vs pickPosition: ${err} m`,
      `height:   ${carto.height.toFixed(2)} m`,
    );
  } else {
    lines.push("hit:      (none)");
    if (Cesium.defined(pickPos)) {
      position = pickPos;
      marker.position = pickPos;
      marker.color = Cesium.Color.RED;
      marker.show = true;
      lines.push("marker:   pickPosition fallback (red)");
    } else {
      marker.show = false;
    }
  }

  if (Cesium.defined(measuredDistance)) {
    lines.push(`measured: ${measuredDistance.toFixed(3)} m`);
  }

  snapInfo.textContent = lines.join("\n");

  if (logToConsole) {
    console.log("snap diagnostic", {
      screenPos: screenPos.clone(),
      hit: hit,
      snapFrustums: snapFrustums,
      pickPosition: pickPos,
      farToNearRatio: scene.farToNearRatio,
      logDepth: scene.logarithmicDepthBuffer,
      edgeDisplayMode: tileset?.edgeDisplayMode,
    });
  }

  return position;
}

viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  const position = doSnap(movement.endPosition, false);
  if (
    measurementState === MeasurementState.STARTED &&
    Cesium.defined(position)
  ) {
    secondPoint.position = position;
    secondPoint.show = true;
    createPolyline(firstPoint.position, secondPoint.position);
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// Click: console diagnostic + measurement (A -> B -> reset).
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  const position = doSnap(movement.position, true);
  if (!Cesium.defined(position)) {
    return;
  }
  if (measurementState === MeasurementState.READY) {
    firstPoint.position = position;
    firstPoint.show = true;
    secondPoint.show = false;
    measurementState = MeasurementState.STARTED;
  } else if (measurementState === MeasurementState.STARTED) {
    secondPoint.position = position;
    secondPoint.show = true;
    createPolyline(firstPoint.position, secondPoint.position);
    measurementState = MeasurementState.FINISHED;
  } else {
    firstPoint.show = false;
    secondPoint.show = false;
    if (Cesium.defined(polyline)) {
      polyline.show = false;
    }
    measuredDistance = undefined;
    measurementState = MeasurementState.READY;
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
