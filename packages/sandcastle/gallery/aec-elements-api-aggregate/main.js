import * as Cesium from "cesium";

// Compute aggregate statistics (count, min, max, average, and sum) for numeric
// element properties across a structural design model with the Cesium ion
// Asset Elements API using Cesium.IonAssetElementService.aggregate.

const ASSET_ID = 6093178; // Snowdon Towers Sample Structural.ifc

// Create a service for querying this asset's element properties and aggregates.
const elementService = Cesium.IonAssetElementService.fromAssetId(ASSET_ID);

// Query one IFC class per request; all classes use the same concrete material.
const IFC_CLASS_SUMMARY = [
  "ifcwall",
  "ifcslab",
  "ifcbeam",
  "ifcfooting",
  "ifccolumn",
];
// Physical Material ID for "Concrete, Cast-in-Place gray".
const CONCRETE_PHYSICAL_MATERIAL_ID = "3298534883346";
const NET_VOLUME_PROPERTY = "Volume Aspect.Net Volume";

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

// Show aggregate results in a small overlay above the globe.
const resultPanel = document.getElementById("resultPanel");
const resultHeader = document.getElementById("resultHeader");
const resultsBody = document.getElementById("resultsBody");

function formatNumber(value) {
  // Keep the table readable while retaining useful volume precision.
  return typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : value;
}

async function loadIfcClassSummary() {
  resultPanel.style.display = "block";
  resultHeader.textContent = "Concrete net volume by IFC class — computing...";
  resultsBody.innerHTML = "";

  try {
    // Run the independent class queries concurrently. `total` is the number
    // of matching elements; the aggregate also reports statistics for values
    // that actually have a numeric net-volume value.
    const rows = await Promise.all(
      IFC_CLASS_SUMMARY.map(async (ifcClass) => {
        const result = await elementService.aggregate({
          propertyKeys: [NET_VOLUME_PROPERTY],
          filter: {
            "IFC Class Name": { $eq: ifcClass },
            "Physical Material": { $eq: CONCRETE_PHYSICAL_MATERIAL_ID },
          },
        });
        return {
          ifcClass: ifcClass,
          elements: result.total,
          ...result.aggregations[0],
        };
      }),
    );

    resultHeader.textContent = "Concrete net volume by IFC class";
    for (const result of rows) {
      const row = document.createElement("tr");
      const values = [
        result.ifcClass,
        result.elements,
        formatNumber(result.sum ?? 0),
        formatNumber(result.min ?? "—"),
        formatNumber(result.max ?? "—"),
        formatNumber(result.avg ?? "—"),
      ];
      // Use textContent so returned property values are displayed as text.
      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }
      resultsBody.appendChild(row);
    }
  } catch (error) {
    resultHeader.textContent = `Aggregation failed: ${error.message}`;
  }
}

await loadIfcClassSummary();
