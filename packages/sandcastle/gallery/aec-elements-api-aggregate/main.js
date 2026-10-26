import * as Cesium from "cesium";

// Compute aggregate statistics (count, min, max, average, and sum) for numeric
// element properties across an architectural design model with the Cesium ion
// Asset Elements API using Cesium.IonAssetElementService.aggregate.

const ION_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IndWd3ZVWWtlMXdfYVd3ZFYiLCJqdGkiOiJjNmU5NWIyMS0zOGRhLTQ2MTQtYmYxMi03ZDBjOWQyMmIzNGEiLCJpZCI6MjM1LCJzdWIiOiJydmVlbnN0cmErZWFzdHVzIiwiaXNzIjoiaHR0cHM6Ly9hcGkuaW9uLWRldmVsb3BtZW50LmNlc2l1bS5jb20iLCJhdWQiOiJRdWVyeWluZyBBUEkgV3JhcHBlciBEZW1vIiwiaWF0IjoxNzkyNDk2MjUxfQ.u1N6cRr7Wi24IxeNnkXllwbHPwZyfjtsHgRlWsiq3B8";
Cesium.Ion.defaultAccessToken = ION_ACCESS_TOKEN;

// Point CesiumJS at the ion development server, where the Asset Elements
// aggregate and tree endpoints are deployed.
Cesium.Ion.defaultServer = new Cesium.Resource({
  url: "https://api.ion-development.cesium.com/",
});

const ASSET_ID = 3784; // Snowdon Towers Sample Structural

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
// Physical Material ID for "Concrete, Cast-in-Place gray". The full element
// properties are returned when using engine=search.
const CONCRETE_PHYSICAL_MATERIAL_ID = "3298534883346";
const NET_VOLUME_PROPERTY = "Volume Aspect.Net Volume";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

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
