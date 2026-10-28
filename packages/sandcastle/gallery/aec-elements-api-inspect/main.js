import * as Cesium from "cesium";

// Click any part of an architectural design model to read that element's
// metadata from the Cesium ion Asset Elements API using
// Cesium.IonAssetElementService.

const ION_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IndWd3ZVWWtlMXdfYVd3ZFYiLCJqdGkiOiJjNmU5NWIyMS0zOGRhLTQ2MTQtYmYxMi03ZDBjOWQyMmIzNGEiLCJpZCI6MjM1LCJzdWIiOiJydmVlbnN0cmErZWFzdHVzIiwiaXNzIjoiaHR0cHM6Ly9hcGkuaW9uLWRldmVsb3BtZW50LmNlc2l1bS5jb20iLCJhdWQiOiJRdWVyeWluZyBBUEkgV3JhcHBlciBEZW1vIiwiaWF0IjoxNzkyNDk2MjUxfQ.u1N6cRr7Wi24IxeNnkXllwbHPwZyfjtsHgRlWsiq3B8";
Cesium.Ion.defaultAccessToken = ION_ACCESS_TOKEN;

// Point CesiumJS at the ion development server, where the Asset Elements
// aggregate and tree endpoints are deployed.
Cesium.Ion.defaultServer = new Cesium.Resource({
  url: "https://api.ion-development.cesium.com/",
});

const ASSET_ID = 3784; // Snowdon Towers Sample Structural

// A service bound to the asset that talks to the ion Asset Elements API.
const elementService = Cesium.IonAssetElementService.fromAssetId(ASSET_ID);

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

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
      return `<tr><td><b>${key}</b></td><td>${text}</td></tr>`;
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
