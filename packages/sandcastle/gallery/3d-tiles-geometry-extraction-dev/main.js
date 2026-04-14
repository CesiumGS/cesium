import * as Cesium from "cesium";

function primitiveTypeName(primitiveType) {
  return (
    Object.keys(Cesium.PrimitiveType).find(
      (key) => Cesium.PrimitiveType[key] === primitiveType,
    ) ?? `unknown (${primitiveType})`
  );
}

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;
const infoDiv = document.getElementById("info");

// Load a batched 3D Tiles tileset.
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);

viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// Collection for point markers at each extracted vertex
const pointEntities = [];

// Highlight color for the selected feature
const highlightColor = Cesium.Color.YELLOW.withAlpha(0.5);
let selectedFeature;

function clearVisualization() {
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

function getGeometryResultByPredicate(geometryList, predicate) {
  const result = {
    positions: [],
    colors: [],
  };
  for (let i = 0; i < geometryList.length; i++) {
    const geometry = geometryList[i];
    const positions = geometry.getPositions();
    const colors = geometry.getColors();
    for (let j = 0; j < geometry.count * geometry.instances; j++) {
      if (predicate(geometry, j)) {
        result.primitiveType = geometry.primitiveType;
        if (positions) {
          result.positions.push(positions[j]);
        }
        if (colors) {
          result.colors.push(colors[j]);
        }
      }
    }
  }
  return result;
}

// On left click, pick a feature and extract its vertex positions
const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
handler.setInputAction(async function (movement) {
  clearVisualization();

  const pickedFeature = scene.pick(movement.position);
  if (!Cesium.defined(pickedFeature)) {
    return;
  }

  // Highlight the selected feature
  if (pickedFeature instanceof Cesium.Cesium3DTileFeature) {
    selectedFeature = pickedFeature;
    selectedFeature.color = highlightColor;
  }

  // Extract world-space vertex positions and vertex colors via content.getGeometry
  const content = pickedFeature.content;

  const geometryMap = await content.getGeometry({
    attributes: ["POSITION", "COLOR", "_FEATURE_ID"],
  });

  const geometry = getGeometryResultByPredicate(
    geometryMap,
    (geometry, index) => {
      if (Cesium.defined(pickedFeature.featureId)) {
        const featureIds = geometry.getFeatureIds();
        if (Cesium.defined(featureIds)) {
          return pickedFeature.featureId === featureIds[index];
        }
        return false;
      }
      return true;
    },
  );
  if (!Cesium.defined(geometry)) {
    infoDiv.textContent = "No geometry available for this feature.";
    return;
  }

  const positions = geometry.positions ?? [];
  const colors = geometry.colors ?? [];
  const primitiveType = geometry.primitiveType;

  if (positions.length === 0) {
    infoDiv.textContent = "No positions available for this feature.";
    return;
  }

  const hasColors = colors.length > 0;
  infoDiv.textContent =
    `Extracted ${positions.length} vertices` +
    `${hasColors ? `, ${colors.length} vertex colors` : ", no vertex colors"}` +
    `, primitiveType: ${primitiveTypeName(primitiveType)}` +
    ` (feature id: ${pickedFeature.featureId})`;

  // Add point markers at each unique vertex position, using the
  // vertex color when available or falling back to red.
  for (let i = 0; i < positions.length; i++) {
    const pointColor =
      hasColors && i < colors.length ? colors[i] : Cesium.Color.RED;
    const entity = viewer.entities.add({
      position: positions[i],
      point: {
        pixelSize: 6,
        color: pointColor,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    pointEntities.push(entity);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
