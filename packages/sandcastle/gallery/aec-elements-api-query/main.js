// @ts-nocheck

import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Demonstrates Cesium.IonAssetElementService: click-to-pick element metadata,
// hover highlighting, pre-built queries with progressive results,
// and camera navigation to queried elements.

// ─── Configuration ─────────────────────────────────────────────────────────────

const ASSET_ID = 6093184; // Snowdon Towers Sample Architectural.ifc

// A service bound to the asset that talks to the ion Asset Elements API.
const elementService = Cesium.IonAssetElementService.fromAssetId(ASSET_ID);

// ─── Pre-built Queries ─────────────────────────────────────────────────────────

// JSON filters match element property names using operators such as $in and $like.
const QUERIES = [
  {
    label: "All Walls",
    filter: { "IFC Class Name": "ifcwall" },
  },
  {
    // Multiple keys in one object are combined with AND.
    label: "Exterior Walls",
    filter: { "IFC Class Name": "ifcwall", "Pset_WallCommon.IsExternal": true },
  },
  {
    label: "Large Spaces > 450 sq ft",
    filter: {
      // FootprintArea is in m²; 450 sq ft ≈ 41.8 m².
      $and: [
        { "IFC Class Name": "ifcspace" },
        { FootprintArea: { $gt: 41.8 } },
      ],
    },
  },
  {
    label: "Doors and Windows",
    filter: { "IFC Class Name": { $in: ["ifcdoor", "ifcwindow"] } },
  },
  {
    label: "Leasable Spaces (Retail, Office, or Commercial)",
    filter: {
      "IFC Class Name": "ifcspace",
      $or: [
        { "@label": { $like: "%Retail%" } },
        { "@label": { $like: "%Office%" } },
        { "@label": { $like: "%Commercial%" } },
      ],
    },
  },
];

// ─── Viewer Setup ──────────────────────────────────────────────────────────────

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

// Set to 1 PM Philadelphia time in UTC
viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
  "2024-11-22T18:00:00Z",
);

viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.globe.translucency.enabled = true;

// ─── State ─────────────────────────────────────────────────────────────────────

// Element ids are decimal strings, as returned by IonAssetElementService.
let selectedElementId = null;
let hoveredElementId = null;
const matchedElementIds = new Set(); // query results
let activeQueryController = null;

// ─── UI References ─────────────────────────────────────────────────────────────

const resultPanel = document.getElementById("resultPanel");
const resultHeader = document.getElementById("resultHeader");
const resultsList = document.getElementById("resultsList");

// ─── Utility Functions ─────────────────────────────────────────────────────────

function buildDescription(properties) {
  const rows = Object.entries(properties)
    .map(([key, property]) => {
      // displayValue already includes formatted units.
      const text = property.displayValue ?? property.value;
      return `<tr><td><b>${key}</b></td><td>${text}</td></tr>`;
    })
    .join("");
  return `<table class="cesium-infoBox-defaultTable"><tbody>${rows}</tbody></table>`;
}

// ─── Element Properties Entity (for InfoBox display) ────────────────────────────

const elementPropertiesEntity = new Cesium.Entity({
  name: "Element",
  show: false,
});
viewer.entities.add(elementPropertiesEntity);

// ─── Style ─────────────────────────────────────────────────────────────────────

function applyStyle() {
  const style = new Cesium.Cesium3DTileStyle();
  style.color = {
    evaluateColor: function (feature, result) {
      const id = Cesium.IonAssetElementService.getElementId(feature);

      // Selected: yellow
      if (id === selectedElementId) {
        return Cesium.Color.clone(Cesium.Color.YELLOW, result);
      }
      // Hovered: cyan
      if (id === hoveredElementId) {
        return Cesium.Color.clone(Cesium.Color.CYAN.withAlpha(0.7), result);
      }
      // Query match: green
      if (matchedElementIds.size > 0 && matchedElementIds.has(id)) {
        return Cesium.Color.clone(Cesium.Color.LIME, result);
      }
      // Faded when selection or query is active
      if (selectedElementId || matchedElementIds.size > 0) {
        return Cesium.Color.clone(Cesium.Color.WHITE.withAlpha(0.02), result);
      }
      // Default
      return Cesium.Color.clone(Cesium.Color.WHITE, result);
    },
  };
  tileset.style = style;
}

// ─── Paginated Query Function ──────────────────────────────────────────────────

async function queryElements(filter, options = {}) {
  const { signal, onPage } = options;

  let totalFetched = 0;
  let total;
  let continuationToken;

  do {
    const page = await elementService.listElements({
      filter,
      top: 1000,
      continuationToken,
    });
    // listElements is not cancelable, so drop pages for superseded queries.
    if (signal?.aborted) {
      return { aborted: true };
    }

    totalFetched += page.items.length;
    total = page.total;
    if (onPage) {
      onPage(page.items, totalFetched, total);
    }

    continuationToken = page.continuationToken;
  } while (Cesium.defined(continuationToken));

  return { total: total ?? totalFetched };
}

// ─── Select Element: Highlight + Navigate + Element Properties ─────────────────

async function selectElement(element, options = {}) {
  const { flyTo = true } = options;
  const elementId = element.id;
  selectedElementId = elementId;
  tileset.makeStyleDirty();
  viewer.scene.globe.translucency.frontFaceAlpha = 0.25;

  if (flyTo) {
    flyToElement(element);
  }

  // Fetch element properties and show in InfoBox
  elementPropertiesEntity.name = element.label ?? `Element ${elementId}`;
  elementPropertiesEntity.description = "Loading...";
  elementPropertiesEntity.show = true;
  viewer.selectedEntity = elementPropertiesEntity;

  try {
    const details = await elementService.getElement(elementId);
    if (elementId !== selectedElementId) {
      return;
    }
    elementPropertiesEntity.name = details.label ?? `Element ${elementId}`;
    elementPropertiesEntity.description = buildDescription(
      details.properties ?? {},
    );
  } catch (err) {
    elementPropertiesEntity.description = `<p style="color:#ff6b6b;">Error: ${err.message}</p>`;
  }

  viewer.selectedEntity = undefined;
  viewer.selectedEntity = elementPropertiesEntity;
}

// ─── Result Panel ──────────────────────────────────────────────────────────────

function appendResultItems(items) {
  for (const el of items) {
    const li = document.createElement("li");

    const label = document.createElement("div");
    label.className = "result-label";
    label.textContent = el.label ?? el.id;
    li.appendChild(label);

    const detail = document.createElement("div");
    detail.className = "result-detail";
    detail.textContent = `Element ${el.id}`;
    li.appendChild(detail);

    li.addEventListener("click", () => selectElement(el));
    resultsList.appendChild(li);
  }
}

// ─── Run a Query ───────────────────────────────────────────────────────────────

async function runQuery(query) {
  // Cancel any in-flight query
  if (activeQueryController) {
    activeQueryController.abort();
  }
  activeQueryController = new AbortController();
  const { signal } = activeQueryController;

  // Clear previous state
  selectedElementId = null;
  matchedElementIds.clear();
  if (tileset) {
    tileset.makeStyleDirty();
  }
  viewer.selectedEntity = undefined;
  resultsList.innerHTML = "";

  resultHeader.textContent = `${query.label} — loading...`;
  resultPanel.style.display = "block";
  viewer.scene.globe.translucency.frontFaceAlpha = 0.25;

  try {
    const result = await queryElements(query.filter, {
      signal,
      onPage(pageItems, totalSoFar, totalElements) {
        for (const el of pageItems) {
          matchedElementIds.add(el.id);
        }
        tileset.makeStyleDirty();
        appendResultItems(pageItems);

        const totalLabel =
          totalElements !== undefined ? ` of ${totalElements}` : "";
        resultHeader.textContent = `${query.label} — ${totalSoFar}${totalLabel} results`;
      },
    });
    if (result.aborted) {
      return;
    }

    resultHeader.textContent = `${query.label} — ${result.total} result${result.total !== 1 ? "s" : ""}`;
  } catch (err) {
    if (signal.aborted) {
      return;
    }
    resultHeader.textContent = `Error: ${err.message}`;
  }
}

// ─── Clear Query Results ───────────────────────────────────────────────────────

function clearResults() {
  if (activeQueryController) {
    activeQueryController.abort();
  }
  selectedElementId = null;
  matchedElementIds.clear();
  resultsList.innerHTML = "";
  resultPanel.style.display = "none";
  viewer.scene.globe.translucency.frontFaceAlpha = 1.0;
  viewer.selectedEntity = undefined;
  if (tileset) {
    tileset.makeStyleDirty();
  }
}

// ─── Input Handlers ────────────────────────────────────────────────────────────

// Click: pick element and fetch properties, or deselect on empty click
viewer.screenSpaceEventHandler.setInputAction(async function (movement) {
  const feature = viewer.scene.pick(movement.position);
  if (
    !Cesium.defined(feature) ||
    !(feature instanceof Cesium.Cesium3DTileFeature)
  ) {
    // Clicked empty space: clear selection (but keep query highlights)
    if (selectedElementId) {
      selectedElementId = null;
      viewer.selectedEntity = undefined;
      if (tileset) {
        tileset.makeStyleDirty();
      }
      if (matchedElementIds.size === 0) {
        viewer.scene.globe.translucency.frontFaceAlpha = 1.0;
      }
    }
    return;
  }

  const elementId = Cesium.IonAssetElementService.getElementId(feature);
  if (!Cesium.defined(elementId)) {
    return;
  }

  await selectElement({ id: elementId }, { flyTo: false });
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Hover: preview highlight
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  const feature = viewer.scene.pick(movement.endPosition);
  const elementId = Cesium.IonAssetElementService.getElementId(feature);
  if (Cesium.defined(elementId)) {
    if (elementId !== hoveredElementId) {
      hoveredElementId = elementId;
      tileset.makeStyleDirty();
    }
    return;
  }
  if (hoveredElementId !== null) {
    hoveredElementId = null;
    tileset.makeStyleDirty();
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// ─── Toolbar: Query Dropdown ───────────────────────────────────────────────────

Sandcastle.addToolbarMenu(
  [
    { text: "Select a query...", onselect: clearResults },
    ...QUERIES.map((query) => ({
      text: query.label,
      onselect: () => runQuery(query),
    })),
  ],
  "toolbar",
);

// Get a reference to the dropdown so the Clear button can reset it
const queryDropdown = document.querySelector("#toolbar select");

Sandcastle.addToolbarButton("Clear", function () {
  clearResults();
  if (queryDropdown) {
    queryDropdown.selectedIndex = 0;
  }
});

// ─── Camera Navigation ─────────────────────────────────────────────────────────

function flyToElement(element) {
  const boundingSphere =
    Cesium.IonAssetElementService.getBoundingSphere(element);
  if (!Cesium.defined(boundingSphere)) {
    viewer.zoomTo(tileset);
    return;
  }
  boundingSphere.radius = Math.max(boundingSphere.radius, 5) * 1.5;
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    offset: new Cesium.HeadingPitchRange(
      0,
      Cesium.Math.toRadians(-30),
      0, // auto-compute range to fit sphere
    ),
    duration: 2,
  });
}

// ─── Load Tileset and Initialize ───────────────────────────────────────────────

let tileset;

async function initialize() {
  try {
    tileset = viewer.scene.primitives.add(
      await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID),
    );
  } catch (err) {
    console.error("Failed to load tileset:", err.message);
    return;
  }

  await viewer.zoomTo(tileset);
  applyStyle();
}

initialize();
