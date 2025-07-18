import * as Cesium from "cesium";

// Cesium World Terrain height system doesn't match to I3S datasets height system in some locations even with geoid conversion.
// Set ArcGIS Tiled Elevation Terrain gravity related height system to get closer results.
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: new Cesium.Terrain(
    Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
      "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
    ),
  ),
  animation: false,
  timeline: false,
  orderIndependentTranslucency: false,
});

// More datasets to tour can be added here...
// The url passed to I3SDataProvider supports loading a single Indexed 3D Scene (I3S) layer (.<host>/SceneServer/layers/<id>) or a collection of scene layers (.<host>/SceneServer) from a SceneServer.
const tours = {
  "Turanga Library":
    "https://tiles.arcgis.com/tiles/cFEFS0EWrhfDeVw9/arcgis/rest/services/Turanga_Library/SceneServer",
};

try {
  // Create i3s options to pass optional parameters useful for debugging and visualizing
  const i3sOptions = {
    adjustMaterialAlphaMode: true, // force the alpha mode to be set for transparent geometry
    showFeatures: true, // creates 3D object for each feature and allows to apply attributes filter
    applySymbology: true, // applies outlines based on the I3S layer renderer details
    calculateNormals: true, // generates flat normals if they are missing in I3S buffers
  };

  // Create I3S data provider
  const i3sProvider = await Cesium.I3SDataProvider.fromUrl(
    tours["Turanga Library"],
    i3sOptions,
  );

  Cesium.I3SBuildingSceneLayerExplorer("toolbar", i3sProvider);

  // Add the i3s layer provider as a primitive data type
  viewer.scene.primitives.add(i3sProvider);

  // Center camera on I3S once it's loaded
  const center = Cesium.Rectangle.center(i3sProvider.extent);
  center.height = 300.0;
  // Adjust camera height by the I3S BSL extent
  let bslLayer = i3sProvider.data;
  if (Cesium.defined(bslLayer.layers) && bslLayer.layers.length > 0) {
    bslLayer = bslLayer.layers[0];
  }
  if (
    Cesium.defined(bslLayer.fullExtent) &&
    Cesium.defined(bslLayer.fullExtent.zmax)
  ) {
    center.height += bslLayer.fullExtent.zmax;
  }
  const destination = Cesium.Ellipsoid.WGS84.cartographicToCartesian(center);
  viewer.camera.setView({
    destination: destination,
  });

  // Override home button to center the camera on I3S
  viewer.homeButton.viewModel._command = Cesium.createCommand(function () {
    viewer.camera.flyTo({
      destination: destination,
    });
  });
} catch (error) {
  console.error(`There was an error creating the I3S Data Provider: ${error}`);
}

// Information about the currently selected feature
const selected = {
  feature: undefined,
  originalColor: new Cesium.Color(),
};

// An entity object which will hold info about the currently selected feature for infobox display
const selectedEntity = new Cesium.Entity();
// Show metadata in the InfoBox.
viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
  const selectedFeature = selected.feature;

  // Pick a new feature
  const pickedFeature = viewer.scene.pick(movement.position);
  if (selectedFeature === pickedFeature) {
    return;
  }

  // If a feature was previously selected, undo the highlight
  if (Cesium.defined(selected.feature)) {
    selected.feature.color = selected.originalColor;
    selected.feature = undefined;
  }

  if (
    !Cesium.defined(pickedFeature) ||
    !Cesium.defined(pickedFeature.content) ||
    !Cesium.defined(pickedFeature.content.tile.i3sNode)
  ) {
    viewer.selectedEntity = undefined;
    return;
  }

  // Highlight newly selected feature
  selected.feature = pickedFeature;
  Cesium.Color.clone(pickedFeature.color, selected.originalColor);
  pickedFeature.color = Cesium.Color.BLUE;

  const i3sNode = pickedFeature.content.tile.i3sNode;
  i3sNode.loadFields().then(function () {
    let description = "No attributes";
    let name;

    const fields = i3sNode.getFieldsForFeature(pickedFeature.featureId);
    if (Object.keys(fields).length > 0) {
      description = '<table class="cesium-infoBox-defaultTable"><tbody>';
      for (const fieldName in fields) {
        if (i3sNode.fields.hasOwnProperty(fieldName)) {
          description += `<tr><th>${fieldName}</th><td>`;
          description += `${fields[fieldName]}</td></tr>`;
          if (!Cesium.defined(name) && isNameProperty(fieldName)) {
            name = fields[fieldName];
          }
        }
      }
      description += `</tbody></table>`;
    }
    if (!Cesium.defined(name)) {
      name = "unknown";
    }
    selectedEntity.name = name;
    selectedEntity.description = description;
    viewer.selectedEntity = selectedEntity;
  });
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

function isNameProperty(propertyName) {
  const name = propertyName.toLowerCase();
  if (
    name.localeCompare("name") === 0 ||
    name.localeCompare("objname") === 0 ||
    name.localeCompare("category") === 0
  ) {
    return true;
  }
  return false;
}
