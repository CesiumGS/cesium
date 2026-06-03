import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Demonstrates the Asset Elements API: click-to-pick element metadata,
// hover highlighting, pre-built queries with progressive results,
// and camera navigation to queried elements.

// ─── Configuration ─────────────────────────────────────────────────────────────

const ION_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYTNiMTEyNS0wZWZhLTQ2YTYtOGJjYi1jYjYyOTQxN2NiN2UiLCJpZCI6MjU5LCJzdWIiOiJDZXNpdW1KUyIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJEZXNpZ24gSW5nZXN0aW9uIEdUTSIsImlhdCI6MTc3OTc1MDAxM30.pwnHFphGrT_eReSLU-QRmanDIeNTksS64Tp6rrUJheI";
Cesium.Ion.defaultAccessToken = ION_ACCESS_TOKEN;

const ASSET_ID = 4823245; // Snowdon Towers Sample Architectural.rvt
const ELEMENTS_API_BASE = "https://api.cesium.com";

// ─── Pre-built Queries ─────────────────────────────────────────────────────────

const QUERIES = [
  {
    label: "All Walls (SQL)",
    style: "sql",
    where: "iFCClassName = 'ifcwall'",
  },
  {
    label: "All Walls (JSON)",
    style: "json",
    filter: { iFCClassName: "ifcwall" },
  },
  {
    label: "Large Spaces > 450 sq ft",
    style: "sql",
    where: "iFCClassName = 'ifcspace' AND footprintArea > 450",
  },
  {
    label: "Doors and Windows",
    style: "json",
    filter: { iFCClassName: { $in: ["ifcdoor", "ifcwindow"] } },
  },
  {
    label: "Labels containing 'Exterior'",
    style: "sql",
    where: "userLabel LIKE '%Exterior%'",
  },
  {
    label: "Structural Elements",
    style: "json",
    filter: {
      iFCClassName: { $in: ["ifccolumn", "ifcbeam", "ifcslab", "ifcfooting"] },
    },
  },
];

// ─── Viewer Setup ──────────────────────────────────────────────────────────────

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.globe.translucency.enabled = true;

// ─── State ─────────────────────────────────────────────────────────────────────

let selectedElementId = null; // BigInt or null
let hoveredElementId = null; // BigInt or null
const hiddenElementIds = new Set(); // BigInt element IDs (2D elements to hide)
const matchedElementIds = new Set(); // BigInt element IDs (query results)
let activeQueryController = null;

// ─── UI References ─────────────────────────────────────────────────────────────

const resultPanel = document.getElementById("resultPanel");
const resultHeader = document.getElementById("resultHeader");
const resultsList = document.getElementById("resultsList");

// ─── Utility Functions ─────────────────────────────────────────────────────────

function parseLinkHeader(header) {
  if (!header) {
    return null;
  }
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

function buildDescription(properties) {
  const rows = Object.entries(properties)
    .map(([key, value]) => `<tr><td><b>${key}</b></td><td>${value}</td></tr>`)
    .join("");
  return `<table class="cesium-infoBox-defaultTable"><tbody>${rows}</tbody></table>`;
}

function isLocationValid(center) {
  if (!center) {
    return false;
  }
  if (!Number.isFinite(center.longitude) || !Number.isFinite(center.latitude)) {
    return false;
  }
  if (center.longitude === 0 && center.latitude === 0) {
    return false;
  }

  const elementCartesian = Cesium.Cartesian3.fromDegrees(
    center.longitude,
    center.latitude,
    center.height || 0,
  );
  const tilesetCenter = tileset.boundingSphere.center;
  const distance = Cesium.Cartesian3.distance(elementCartesian, tilesetCenter);
  const maxDistance = Math.max(tileset.boundingSphere.radius * 5, 1000);
  return distance <= maxDistance;
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
      const id = feature.getProperty("element");

      // Hidden elements (2D grid lines): fully transparent
      if (hiddenElementIds.has(id)) {
        return Cesium.Color.clone(Cesium.Color.TRANSPARENT, result);
      }
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

async function queryElements(assetId, options = {}) {
  const { where, filter, limit = 1000, signal, onPage } = options;

  const params = new URLSearchParams();
  if (where) {
    params.set("where", where);
  }
  if (filter) {
    params.set("filter", JSON.stringify(filter));
  }
  params.set("limit", String(limit));
  let nextUrl = `${ELEMENTS_API_BASE}/assets/${assetId}/elements?${params}`;

  let totalFetched = 0;
  let totalElements;

  while (nextUrl) {
    const resp = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${ION_ACCESS_TOKEN}` },
      signal,
    });
    if (!resp.ok) {
      throw new Error(`Query failed: HTTP ${resp.status}`);
    }
    const data = await resp.json();

    totalFetched += data.items.length;
    if (data.total !== undefined) {
      totalElements = data.total;
    }

    if (onPage) {
      onPage(data.items, totalFetched, totalElements);
    }

    nextUrl = parseLinkHeader(resp.headers.get("Link"));
  }

  return { total: totalElements ?? totalFetched };
}

// ─── Hide 2D Grid Lines ────────────────────────────────────────────────────────

async function hideGridLines() {
  try {
    await queryElements(ASSET_ID, {
      where: "iFCClassName = 'ifcgrid'",
      onPage(items) {
        for (const el of items) {
          hiddenElementIds.add(BigInt(el.id));
        }
        tileset.makeStyleDirty();
      },
    });
    if (hiddenElementIds.size > 0) {
      console.log(`Hidden ${hiddenElementIds.size} 2D grid elements`);
    }
  } catch (err) {
    console.warn("Failed to hide grid lines:", err.message);
  }
}

// ─── Select Element: Highlight + Navigate + Element Properties ─────────────────

async function selectElement(elementId, location, options = {}) {
  const { flyTo = true } = options;
  selectedElementId = elementId;
  tileset.makeStyleDirty();
  viewer.scene.globe.translucency.frontFaceAlpha = 0.25;

  // Fly to the element if location is valid and flyTo is enabled
  if (flyTo) {
    const center = location?.center;
    if (isLocationValid(center)) {
      flyToSphere(
        center.longitude,
        center.latitude,
        center.height,
        location.radius || 5,
      );
    } else {
      viewer.zoomTo(tileset);
    }
  }

  // Fetch element properties and show in InfoBox
  elementPropertiesEntity.name = `Element ${elementId}`;
  elementPropertiesEntity.description = "Loading...";
  elementPropertiesEntity.show = true;
  viewer.selectedEntity = elementPropertiesEntity;

  try {
    const url = `${ELEMENTS_API_BASE}/assets/${ASSET_ID}/elements/${encodeURIComponent(elementId)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${ION_ACCESS_TOKEN}` },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const element = await resp.json();
    elementPropertiesEntity.description = buildDescription(
      element.properties || {},
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
    label.textContent =
      el.properties?.userLabel || el.properties?.iFCClassName || el.id;
    li.appendChild(label);

    const detail = document.createElement("div");
    detail.className = "result-detail";
    const props = el.properties
      ? Object.entries(el.properties).slice(0, 3)
      : [];
    detail.textContent = props.map(([k, v]) => `${k}: ${v}`).join(" | ");
    li.appendChild(detail);

    li.addEventListener("click", () =>
      selectElement(BigInt(el.id), el.location),
    );
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
    const params = {};
    if (query.style === "sql") {
      params.where = query.where;
    }
    if (query.style === "json") {
      params.filter = query.filter;
    }

    const result = await queryElements(ASSET_ID, {
      ...params,
      signal,
      onPage(pageItems, totalSoFar, totalElements) {
        for (const el of pageItems) {
          matchedElementIds.add(BigInt(el.id));
        }
        tileset.makeStyleDirty();
        appendResultItems(pageItems);

        const totalLabel =
          totalElements !== undefined ? ` of ${totalElements}` : "";
        resultHeader.textContent = `${query.label} — ${totalSoFar}${totalLabel} results`;
      },
    });

    resultHeader.textContent = `${query.label} — ${result.total} result${result.total !== 1 ? "s" : ""}`;
  } catch (err) {
    if (err.name === "AbortError") {
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

  const rawId = feature.getProperty("element");
  if (!Cesium.defined(rawId)) {
    return;
  }

  await selectElement(rawId, null, { flyTo: false });
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Hover: preview highlight
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  const feature = viewer.scene.pick(movement.endPosition);
  if (
    Cesium.defined(feature) &&
    feature instanceof Cesium.Cesium3DTileFeature
  ) {
    const rawId = feature.getProperty("element");
    if (Cesium.defined(rawId)) {
      if (rawId !== hoveredElementId) {
        hoveredElementId = rawId;
        tileset.makeStyleDirty();
      }
      return;
    }
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

function flyToSphere(lon, lat, height, radius) {
  const center = Cesium.Cartesian3.fromDegrees(lon, lat, height);
  const boundingSphere = new Cesium.BoundingSphere(center, radius * 1.5);
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

  // Hide 2D grid lines in the background
  hideGridLines();
}

initialize();
