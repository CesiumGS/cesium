import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;
const infoDiv = document.getElementById("info");

// Load a batched 3D Tiles tileset with enableGeometryExtraction.
// This retains vertex positions on the CPU so they can be read back per feature.
/*
const tileset = await Cesium.Cesium3DTileset.fromUrl(
  `../../SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json`,
  {
    enableGeometryExtraction: true,
  },
);
*/
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2533124);
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// Entity used to draw a polygon from the extracted positions
let polygonEntity;

// Collection for point markers at each extracted vertex
const pointEntities = [];

// Highlight color for the selected feature
const highlightColor = Cesium.Color.YELLOW.withAlpha(0.5);
let selectedFeature;

function clearVisualization() {
  // Remove previous polygon
  if (Cesium.defined(polygonEntity)) {
    viewer.entities.remove(polygonEntity);
    polygonEntity = undefined;
  }

  // Remove previous points
  for (let i = 0; i < pointEntities.length; i++) {
    viewer.entities.remove(pointEntities[i]);
  }
  pointEntities.length = 0;

  // Reset highlight
  if (Cesium.defined(selectedFeature)) {
    selectedFeature.color = Cesium.Color.WHITE;
    selectedFeature = undefined;
  }

  infoDiv.textContent = "";
}

// Simple 2D convex hull (Graham scan) on lon/lat
function computeConvexHull(cartographics) {
  if (cartographics.length < 3) {
    return cartographics.slice();
  }

  const points = cartographics.map((c) => ({
    x: c.longitude,
    y: c.latitude,
    original: c,
  }));

  // Find bottom-most (then left-most) point
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (
      points[i].y < points[start].y ||
      (points[i].y === points[start].y && points[i].x < points[start].x)
    ) {
      start = i;
    }
  }
  const tmp = points[0];
  points[0] = points[start];
  points[start] = tmp;

  const pivot = points[0];

  // Sort by polar angle
  points.sort(function (a, b) {
    if (a === pivot) {
        return -1;
    }
    if (b === pivot) {
        return 1;
    }
    const cross =
      (a.x - pivot.x) * (b.y - pivot.y) - (a.y - pivot.y) * (b.x - pivot.x);
    if (cross === 0) {
      // Collinear — keep closer point first
      const da =
        (a.x - pivot.x) * (a.x - pivot.x) +
        (a.y - pivot.y) * (a.y - pivot.y);
      const db =
        (b.x - pivot.x) * (b.x - pivot.x) +
        (b.y - pivot.y) * (b.y - pivot.y);
      return da - db;
    }
    return -cross;
  });

  const stack = [points[0], points[1]];
  for (let i = 2; i < points.length; i++) {
    while (stack.length > 1) {
      const top = stack[stack.length - 1];
      const second = stack[stack.length - 2];
      const cross =
        (top.x - second.x) * (points[i].y - second.y) -
        (top.y - second.y) * (points[i].x - second.x);
      if (cross <= 0) {
        stack.pop();
      } else {
        break;
      }
    }
    stack.push(points[i]);
  }

  return stack.map((p) => p.original);
}

// On left click, pick a feature and extract its vertex positions
const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
handler.setInputAction(function (movement) {
  clearVisualization();

  const pickedFeature = scene.pick(movement.position);
  if (!Cesium.defined(pickedFeature)) {
    return;
  }
  if (!(pickedFeature instanceof Cesium.Cesium3DTileFeature)) {
    return;
  }

  // Highlight the selected feature
  selectedFeature = pickedFeature;
  selectedFeature.color = highlightColor;

  // Extract world-space vertex positions for this feature
  const positions = pickedFeature.getPositions();

  if (!Cesium.defined(positions) || positions.length === 0) {
    infoDiv.textContent = "No positions available for this feature.";
    return;
  }

  infoDiv.textContent = `Extracted ${positions.length} vertices (feature id: ${pickedFeature.getProperty("id")})`;

  // Convert positions to Cartographic for clamped visualization
  const cartographics = positions.map((pos) =>
    Cesium.Cartographic.fromCartesian(pos),
  );

  // Add point markers at each unique vertex position
  for (let i = 0; i < positions.length; i++) {
    const entity = viewer.entities.add({
      position: positions[i],
      point: {
        pixelSize: 6,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    pointEntities.push(entity);
  }

  // Build a polygon from the convex hull of the extracted positions
  // projected onto the ground. This gives a rough footprint outline.
  const hull = computeConvexHull(cartographics);
  if (hull.length >= 3) {
    const hullCartesians = hull.map((c) =>
      Cesium.Cartesian3.fromRadians(c.longitude, c.latitude),
    );
    polygonEntity = viewer.entities.add({
      polygon: {
        hierarchy: hullCartesians,
        material: Cesium.Color.CYAN.withAlpha(0.4),
        classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
      },
      polyline: {
        positions: hullCartesians.concat(hullCartesians[0]),
        width: 3,
        material: Cesium.Color.CYAN,
        clampToGround: true,
      },
    });
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
