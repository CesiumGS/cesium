import * as Cesium from "cesium";

// Hybrid snapping uses an immediate client-side snap to identify the element
// and test point, then asks the server to refine that choice against the source
// geometry. The client result keeps interaction responsive while the
// more precise server result is in flight.

// This demo requires an asset hosted in Cesium Ion that was tiled using either
// the Design Tiler or the BIM/CAD Tiler with Database (ie on upload for "What
// kind of data is this?" either BIM/CAD (3D Tiles) or BIM/CAD (3D Tiles +
// Database) was selected)

// ============================ Setup ===============================

const ASSET_ID = 5161569;

const viewer = new Cesium.Viewer("cesiumContainer");

// The ellipsoid would intersect this model, so use real-world terrain and
// discard model fragments hidden beneath it.
viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
viewer.scene.globe.depthTestAgainstTerrain = true;

// Set this to false if your application should pick through translucent
// surfaces instead of treating them as snap targets.
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

// Keep the markers together so the entire collection can be excluded from
// client-side snapping and picking passes.
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
  // Existing point markers can occlude model geometry in the snap pass even
  // though they are not themselves snap candidates.
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

  // Terrain and sky positions have no element ID, so they provide hover
  // feedback but cannot seed a server-side snap.
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

// Create the snapper once. It retrieves the asset's to-ECEF transform,
// which can then be reused for every request.
const snapper = await Cesium.IonSnapService.fromAssetId(ASSET_ID);

// Ignore a server response if a newer click occurs while it is in flight.
let clickSequence = 0;

viewer.screenSpaceEventHandler.setInputAction(async function (movement) {
  const screenPosition = Cesium.Cartesian2.clone(movement.position);
  const sequence = ++clickSequence;
  const clientHit = clientSnap(screenPosition);

  // Server snapping operates on one element. Prefer the feature returned by
  // Scene.snap so the element and test point refer to the same geometry. The
  // fallback uses Scene.snap's default 25-pixel search region.
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

  // An edge can look different in the tileset than it does in the source
  // model. Use a nearby point on the same surface to help the server snap to
  // the correct object.
  const testPoint = clientHit?.isEdge
    ? (clientHit.surfacePosition ?? clientPosition)
    : clientPosition;

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
  serverPoint.position = result.snapPoint;
  serverPoint.color = onSurface
    ? COLORS.serverSurface.fill
    : COLORS.server.fill;
  serverPoint.show = true;
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
