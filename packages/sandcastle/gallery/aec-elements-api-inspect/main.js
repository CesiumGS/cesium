import * as Cesium from "cesium";

// Click any part of a structural design model to read that element's
// metadata from the Cesium ion Asset Elements API using
// Cesium.IonAssetElementService.

const ASSET_ID = 6093105; // Snowdon Towers Sample Structural.rvt

// A service bound to the asset that talks to the ion Asset Elements API.
const elementService = Cesium.IonAssetElementService.fromAssetId(ASSET_ID);

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

// Set to 1 PM Philadelphia time in UTC
viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
  "2024-11-22T18:00:00Z",
);

const tileset = viewer.scene.primitives.add(
  await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID),
);
await viewer.zoomTo(tileset);

let selectedElementId;
let activeSelection = 0;
tileset.style = new Cesium.Cesium3DTileStyle({
  color: {
    evaluateColor(feature, result) {
      const id = Cesium.IonAssetElementService.getElementId(feature);
      const color =
        Cesium.defined(selectedElementId) && id === selectedElementId
          ? Cesium.Color.LIME
          : Cesium.Color.WHITE;
      return Cesium.Color.clone(color, result);
    },
  },
});

// An entity used only to display the fetched properties in the InfoBox.
const infoEntity = viewer.entities.add(new Cesium.Entity({ show: false }));

function propertiesTable(properties) {
  const rows = Object.entries(properties)
    .map(([key, property]) => {
      // displayValue already includes formatted units.
      const text = property?.displayValue ?? property?.value ?? property;
      const row = document.createElement("tr");
      const nameCell = row.insertCell();
      const name = document.createElement("b");
      name.textContent = key;
      nameCell.appendChild(name);
      row.insertCell().textContent = String(text);
      return row.outerHTML;
    })
    .join("");
  return `<table class="cesium-infoBox-defaultTable"><tbody>${rows}</tbody></table>`;
}

// On click, read the element id off the picked feature and fetch its metadata.
viewer.screenSpaceEventHandler.setInputAction(async function (movement) {
  const selection = ++activeSelection;
  const feature = viewer.scene.pick(movement.position);

  // getElementId reads the element id a rendered feature belongs to.
  const elementId = Cesium.IonAssetElementService.getElementId(feature);
  if (!Cesium.defined(elementId)) {
    selectedElementId = undefined;
    tileset.makeStyleDirty();
    infoEntity.show = false;
    viewer.selectedEntity = undefined;
    return;
  }

  selectedElementId = elementId;
  tileset.makeStyleDirty();
  infoEntity.name = `Element ${elementId}`;
  infoEntity.description = "Loading...";
  infoEntity.show = true;
  viewer.selectedEntity = infoEntity;

  try {
    const element = await elementService.getElement(elementId);
    if (selection !== activeSelection) {
      return;
    }
    infoEntity.description = propertiesTable(element?.properties ?? {});
  } catch (error) {
    if (selection === activeSelection) {
      infoEntity.description = `<p style="color:#ff6b6b;">${error.message}</p>`;
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
