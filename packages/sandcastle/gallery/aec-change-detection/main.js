import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// This example discovers the two latest versions of a BIM/CAD Database model,
// reads their pre-created change detection report, and highlights the changed
// elements.
//
// The asset must be tiled with BIM/CAD Tiler with Database or added from
// Bentley Infrastructure Cloud, with at least two related 3D Tiles versions.
// A change detection report for the latest pair must also have been created
// in Cesium ion, either with the Detect changes button or with the API. The
// report is itself an ion asset.

// --- Configuration ---

// A token with assets:read is sufficient for the whole application: it can
// discover revisions, read the report asset, and stream both tilesets.
const API_URL = "https://api.ion.cesium.com";
const ION_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImtPcFFoaHp3SFZRM1VrTVEiLCJqdGkiOiI1ZTk3NDYzYS0zMjU5LTRlNjUtYjk4OS02NzMzNTg5NTEzN2UiLCJpZCI6MjU5LCJzdWIiOiJDZXNpdW1KUyIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJzYW5kY2FzdGxlLWNoYW5nZS1kZXRlY3Rpb24tc21hbGwtaG91c2Utb2N0LXVwZGF0ZS1yZWFkb25seSIsImlhdCI6MTc5MzI0MjA0NX0.3CDpDU-3-2nTTzyFTRrH5ljmELGuaShEnZDKhL0geF4";
const BIM_CAD_DATABASE_ASSET_ID = 5855373;
const CHANGE_DETECTION_ASSET_ID = 5994439;

Cesium.Ion.defaultServer = `${API_URL}/`;
Cesium.Ion.defaultAccessToken = ION_ACCESS_TOKEN;

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  sceneModePicker: false,
});

// --- Change Tracking State ---

// Element IDs from the change detection report, grouped by operation. The
// API reports only Inserted, Updated, and Deleted.
const changes = {
  inserted: new Set(),
  updated: new Set(),
  deleted: new Set(),
};
// Which change categories the user currently wants highlighted.
const visibility = {
  inserted: true,
  updated: true,
  deleted: true,
};

let currentTileset;
let previousTileset;
let currentStyle;
let previousStyle;

// --- Change Styling ---

// Each category has a tint. With the default HIGHLIGHT blend, white keeps the
// original material and colors multiply into it, so the models stay readable.
const highlightColors = {
  inserted: Cesium.Color.LIME,
  updated: Cesium.Color.ORANGE,
  deleted: Cesium.Color.RED,
};

// --- Change Detection API ---

// Requests an ion API path with the public token and returns parsed JSON.
async function fetchIonJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
      Authorization: `Bearer ${ION_ACCESS_TOKEN}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Ion request failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

// Every processed version of the model is a related 3D Tiles asset. Pick the
// two most recent as the comparison pair.
async function getLatestRevisions() {
  const { items } = await fetchIonJson(
    `/assets/${BIM_CAD_DATABASE_ASSET_ID}/tileset-revisions?limit=2`,
  );
  if (!Array.isArray(items) || items.length < 2) {
    throw new Error("At least two model revisions are required.");
  }

  // Related revisions are returned newest first.
  const [toRevision, fromRevision] = items;

  return {
    fromAssetId: fromRevision.assetId,
    toAssetId: toRevision.assetId,
  };
}

// Waits for the change detection report asset to finish, then fetches the
// report through the asset's endpoint.
async function getComparisonReport(assetId) {
  // For your own data, this POST creates the report asset from the pair
  // returned by getLatestRevisions(). It needs assets:write, so keep that
  // token private. The response is the new asset's metadata. Use its id as
  // CHANGE_DETECTION_ASSET_ID. This public gallery instead uses a report
  // created ahead of time and an assets:read token.
  // const { id } = await fetch(`${API_URL}/v1/assets/compare`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: "Bearer YOUR_PRIVATE_WRITE_TOKEN",
  //   },
  //   body: JSON.stringify({ fromAssetId, toAssetId }),
  // }).then((response) => response.json());

  let asset = await fetchIonJson(`/v1/assets/${assetId}`);

  // The report is generated asynchronously. Poll the asset until it completes
  // or the request reaches the time limit.
  const pending = ["AWAITING_FILES", "NOT_STARTED", "QUEUED", "IN_PROGRESS"];
  const deadline = Date.now() + 120000;
  while (pending.includes(asset.status)) {
    if (Date.now() >= deadline) {
      throw new Error("Change detection report timed out.");
    }
    status.textContent = `Comparing revisions (${asset.status.toLowerCase()})...`;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    asset = await fetchIonJson(`/v1/assets/${assetId}`);
  }

  if (asset.status !== "COMPLETE") {
    throw new Error(`Change detection report ${asset.status.toLowerCase()}.`);
  }

  // The endpoint provides the report URL and a short-lived token scoped to
  // this asset. Use that token here, not the account token.
  const endpoint = await fetchIonJson(`/v1/assets/${assetId}/endpoint`);
  const reportResponse = await fetch(endpoint.url, {
    headers: { Authorization: `Bearer ${endpoint.accessToken}` },
  });
  if (!reportResponse.ok) {
    throw new Error(
      `Report request failed: ${reportResponse.status} ${reportResponse.statusText}`,
    );
  }
  const items = await reportResponse.json();
  if (!Array.isArray(items)) {
    throw new Error(
      "The change detection report does not contain an element list.",
    );
  }
  return items;
}

// --- Report Helpers ---

function normalizeElementId(value) {
  // BigInt preserves IDs that exceed JavaScript's safe integer range.
  return BigInt(value).toString();
}

// Groups the report's changed element IDs by operation: Inserted, Updated,
// or Deleted. The report lists every changed instance, including non-element
// rows such as schema metadata. Those IDs never match a feature and are
// harmless.
function readChanges(items) {
  for (const item of items) {
    const type = item.$meta.op.toLowerCase();
    changes[type].add(normalizeElementId(item.ECInstanceId));
  }
}

// Reads the element ID that links a loaded feature back to the report.
function getElementId(feature) {
  const id = feature.getProperty("element");
  return id === undefined ? undefined : normalizeElementId(id);
}

// Classifies a latest-revision feature. Returns undefined for elements the
// report does not list
function getCurrentFeatureType(feature) {
  const id = getElementId(feature);
  return changes.inserted.has(id)
    ? "inserted"
    : changes.updated.has(id)
      ? "updated"
      : undefined;
}

// --- UI Controls ---

const status = document.createElement("span");
status.style.marginLeft = "8px";
document.getElementById("toolbar").appendChild(status);

// Switches between the previous revision, the latest revision, and the
// latest revision with change detection highlights.
function showRevision(mode) {
  if (!currentTileset) {
    return;
  }
  previousTileset.show = mode !== "latest";
  currentTileset.show = mode !== "previous";
  previousTileset.style = mode === "changes" ? previousStyle : undefined;
  currentTileset.style = mode === "changes" ? currentStyle : undefined;
}

// Adds a category toggle with a small swatch matching its highlight color.
function addVisibilityToggle(label, type, color) {
  Sandcastle.addToggleButton(label, true, function (value) {
    visibility[type] = value;
    showRevision("changes");
    // Only the deleted category affects the previous tileset's style.
    if (type === "deleted") {
      previousTileset?.makeStyleDirty();
    } else {
      currentTileset?.makeStyleDirty();
    }
  });

  const swatch = document.createElement("span");
  swatch.style.cssText = `background:${color.toCssColorString()};display:inline-block;width:10px;height:10px;margin-left:6px;border:1px solid white`;
  swatch.setAttribute("aria-hidden", "true");
  document
    .getElementById("toolbar")
    .lastElementChild.querySelector("label")
    .appendChild(swatch);
}

addVisibilityToggle("Inserted", "inserted", highlightColors.inserted);
addVisibilityToggle("Updated", "updated", highlightColors.updated);
addVisibilityToggle("Deleted", "deleted", highlightColors.deleted);
Sandcastle.addToolbarButton("Show previous revision only", () =>
  showRevision("previous"),
);
Sandcastle.addToolbarButton("Show latest revision only", () =>
  showRevision("latest"),
);
document.getElementById("toolbar").appendChild(document.createElement("br"));
Sandcastle.addToolbarButton(
  "Show latest revision with change detection filters",
  () => showRevision("changes"),
);

// --- Application Flow ---

try {
  status.textContent = "Discovering model revisions...";
  const revisions = await getLatestRevisions();

  status.textContent = "Reading change detection report...";
  readChanges(await getComparisonReport(CHANGE_DETECTION_ASSET_ID));

  // The latest tileset contains inserted, updated, and unchanged elements. The
  // earlier tileset is also needed because deleted geometry no longer exists
  // in the latest version.
  [previousTileset, currentTileset] = await Promise.all([
    Cesium.Cesium3DTileset.fromIonAssetId(revisions.fromAssetId),
    Cesium.Cesium3DTileset.fromIonAssetId(revisions.toAssetId),
  ]);
  viewer.scene.primitives.add(previousTileset);
  viewer.scene.primitives.add(currentTileset);

  // Tint each changed latest-revision element by its category, or leave it
  // white to keep the original material
  currentStyle = new Cesium.Cesium3DTileStyle({
    color: {
      evaluateColor(feature, result) {
        const type = getCurrentFeatureType(feature);
        return Cesium.Color.clone(
          type && visibility[type] ? highlightColors[type] : Cesium.Color.WHITE,
          result,
        );
      },
    },
  });

  // Deleted geometry exists only in the previous revision.
  previousStyle = new Cesium.Cesium3DTileStyle({
    color: {
      evaluateColor(feature, result) {
        const deleted = changes.deleted.has(getElementId(feature));
        return Cesium.Color.clone(
          deleted && visibility.deleted
            ? highlightColors.deleted
            : Cesium.Color.TRANSPARENT,
          result,
        );
      },
    },
  });

  showRevision("changes");

  await viewer.zoomTo(currentTileset);
  status.textContent =
    `Assets ${revisions.fromAssetId} to ${revisions.toAssetId}: ` +
    `${changes.inserted.size} inserted, ${changes.updated.size} updated, ` +
    `${changes.deleted.size} deleted.`;
} catch (error) {
  console.error(error);
  status.textContent = error.message;
}
