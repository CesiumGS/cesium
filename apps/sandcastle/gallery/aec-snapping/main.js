import * as Cesium from "cesium";

// Hybrid snapping shows a client-side result immediately, then uses
// IonSnapService to refine it against the source geometry.

// This demo requires a geolocated BIM/CAD asset in Cesium ion that supports
// server-side element snapping. Edge data is required for client-side edge
// snaps.

// ============================ Setup ===============================

const ASSET_ID = 5161569;

const viewer = new Cesium.Viewer("cesiumContainer");

// The WGS84 ellipsoid intersects this model. Use Cesium World Terrain and hide
// model geometry below the terrain.
viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
viewer.scene.globe.depthTestAgainstTerrain = true;

// Include translucent surfaces in depth picking. Set this to false to pick
// opaque geometry behind them.
viewer.scene.pickTranslucentDepth = true;

const COLORS = {
  hoverEdge: {
    fill: Cesium.Color.CYAN,
  },
  hoverSurface: {
    fill: Cesium.Color.YELLOW,
  },
  hoverTerrain: {
    fill: Cesium.Color.GRAY,
  },
  client: {
    fill: Cesium.Color.LIME,
  },
  server: {
    fill: Cesium.Color.RED,
  },
  serverSurface: {
    fill: Cesium.Color.ORANGE,
  },
};

// Keep track of the markers so they can be excluded from snapping and position
// picking.
const markers = viewer.scene.primitives.add(new Cesium.PrimitiveCollection());
const points = markers.add(new Cesium.PointPrimitiveCollection());

const hoverPoint = points.add({
  show: false,
  pixelSize: 10,
  outlineColor: Cesium.Color.WHITE,
  outlineWidth: 2,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
});

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

const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID);

// Edge display mode controls visibility only. The asset must contain edge data
// for Scene.snap to return edge results.
tileset.edgeDisplayMode = Cesium.EdgeDisplayMode.SURFACES_AND_EDGES;
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// ============================ Client-side snapping ===============================

function clientSnap(screenPosition) {
  // Hide the markers because they can occlude the model during snapping, even
  // though they are not snap targets.
  markers.show = false;
  const hit = viewer.scene.snap(screenPosition);
  markers.show = true;
  return hit;
}

const scratchPickRay = new Cesium.Ray();

viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  const hit = clientSnap(movement.endPosition);
  if (Cesium.defined(hit)) {
    hoverPoint.show = true;
    hoverPoint.position = hit.position;
    hoverPoint.color = hit.isEdge
      ? COLORS.hoverEdge.fill
      : COLORS.hoverSurface.fill;
    return;
  }

  // Terrain and sky can provide hover feedback only, but they cannot
  // be used to trigger a server-side snap.
  markers.show = false;
  let position = viewer.scene.pickPosition(movement.endPosition);
  markers.show = true;
  if (!Cesium.defined(position)) {
    position = viewer.camera.pickEllipsoid(
      movement.endPosition,
      viewer.scene.ellipsoid,
    );
  }
  if (!Cesium.defined(position)) {
    const ray = viewer.camera.getPickRay(movement.endPosition, scratchPickRay);
    if (Cesium.defined(ray)) {
      const distance = Math.max(viewer.camera.positionCartographic.height, 1.0);
      position = Cesium.Ray.getPoint(ray, distance);
    }
  }

  hoverPoint.show = Cesium.defined(position);
  if (Cesium.defined(position)) {
    hoverPoint.position = position;
    hoverPoint.color = COLORS.hoverTerrain.fill;
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// ============================ Hybrid snapping ===============================

// Create the service once so its asset transform can be reused for each click.
const snapper = await Cesium.IonSnapService.fromAssetId(ASSET_ID);

// Ignore a server response if a newer click occurs while it is in flight.
let clickSequence = 0;

// CSS Pixel distance threshold from client test point before rejecting a surface result
const MAX_SURFACE_RESULT_DISTANCE_PIXELS = 24;

viewer.screenSpaceEventHandler.setInputAction(async function (movement) {
  const screenPosition = Cesium.Cartesian2.clone(movement.position);
  const sequence = ++clickSequence;
  const clientHit = clientSnap(screenPosition);

  // IonSnapService snaps one source element at a time. Prefer the feature
  // returned by Scene.snap. If no snap was found, search the same 25-pixel
  // square for an element.
  let feature = clientHit?.object;
  if (!Cesium.defined(feature)) {
    markers.show = false;
    feature = viewer.scene.pick(screenPosition, 25, 25);
    markers.show = true;
  }
  if (!Cesium.defined(feature) || typeof feature.getProperty !== "function") {
    console.warn("No element under the cursor");
    return;
  }

  const element = feature.getProperty("element");
  if (!Cesium.defined(element)) {
    console.warn("The selected feature does not have an element ID");
    return;
  }
  const elementId = `0x${element.toString(16)}`;

  // The client result is shown immediately. If server snapping succeeds, its
  // authoritative result is added after the asynchronous request completes.
  const clientPosition =
    clientHit?.position ?? viewer.scene.pickPosition(screenPosition);
  if (!Cesium.defined(clientPosition)) {
    console.warn("No position under the cursor");
    return;
  }
  clientPoint.position = clientPosition;
  clientPoint.show = true;
  serverPoint.show = false;

  // testPoint tells the server where to start looking on the selected element.
  // If the client-snapped position lies exactly on the perceived edge of the mesh,
  // that may not be a geometric edge (think about viewing a sphere in 2D - the
  // edge you see is not a true geometric edge). This can produce an unexpected
  // result (the server may snap to other geometry). Instead, use surfacePosition,
  // which is the world-space position of the same object's surface fragment
  // nearest the snap point. This is assured to be on the same object, but off its
  // silhouette.
  const testPoint = clientHit?.isEdge
    ? (clientHit.surfacePosition ?? clientPosition)
    : clientPosition;

  // snapAperture is measured in CSS pixels. We use a two-pixel "aperture" for
  // surface clicks to reduce the chance that nearby source edges pull the
  // result away.
  // This is because the native geometry may contain wireframe edges on curved
  // solids and use them for snapping, in which case the default value of 12
  // can snap undesirably
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
      snapAperture: clientHit?.isEdge ? undefined : 2,
    });
  } catch (error) {
    console.error("Server-side snap failed", error);
    return;
  }

  if (sequence !== clickSequence) {
    return;
  }
  if (!Cesium.defined(result) || !Cesium.defined(result.snapPoint)) {
    console.warn("No server-side snap was found for this element and point");
    return;
  }

  const onSurface = result.geometryType === Cesium.IonSnapGeometryType.SURFACE;

  // Here we guard against a server-side result that is on the surface of the
  // model but is far away from the test point. IonSnapHeat rates how close
  // the result is to closePoint. IonSnapHeat.NONE means the result is not
  // close to the cursor. We then reject a surface result that is also more
  // than 24 pixels from testPoint.
  const distanceFromTestPointPixels = pixelSeparation(
    result.snapPoint,
    testPoint,
  );
  if (
    onSurface &&
    result.heat === Cesium.IonSnapHeat.NONE &&
    Cesium.defined(distanceFromTestPointPixels) &&
    distanceFromTestPointPixels > MAX_SURFACE_RESULT_DISTANCE_PIXELS
  ) {
    console.warn(
      `Rejected distant surface result: ${distanceFromTestPointPixels.toFixed(1)} px from test point`,
      result,
    );
    return;
  }

  serverPoint.position = result.snapPoint;
  serverPoint.color = onSurface
    ? COLORS.serverSurface.fill
    : COLORS.server.fill;
  serverPoint.show = true;
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

function pixelSeparation(firstPosition, secondPosition) {
  const firstScreen = viewer.scene.cartesianToCanvasCoordinates(firstPosition);
  const secondScreen =
    viewer.scene.cartesianToCanvasCoordinates(secondPosition);
  return Cesium.defined(firstScreen) && Cesium.defined(secondScreen)
    ? Cesium.Cartesian2.distance(firstScreen, secondScreen)
    : undefined;
}
