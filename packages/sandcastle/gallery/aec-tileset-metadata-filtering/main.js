import * as Cesium from "cesium";

// Demonstrates reading tileset-level metadata arrays and building a dynamic
// category/subcategory filter panel. Supports CTRL+click solo, Hide by Pick mode,
// and hover tooltips.

// ─── Configuration ─────────────────────────────────────────────────────────────

const ION_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYTNiMTEyNS0wZWZhLTQ2YTYtOGJjYi1jYjYyOTQxN2NiN2UiLCJpZCI6MjU5LCJzdWIiOiJDZXNpdW1KUyIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJEZXNpZ24gSW5nZXN0aW9uIEdUTSIsImlhdCI6MTc3OTc1MDAxM30.pwnHFphGrT_eReSLU-QRmanDIeNTksS64Tp6rrUJheI";
Cesium.Ion.defaultAccessToken = ION_ACCESS_TOKEN;

const ASSET_ID = 4856290; // Snowdon Towers Architectural — uploaded with Advanced Features enabled

// ─── Viewer Setup ──────────────────────────────────────────────────────────────

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());

// ─── State ─────────────────────────────────────────────────────────────────────

let tileset;
const hiddenCategories = new Set(); // BigInt category IDs to hide
const hiddenSubcategories = new Set(); // BigInt subcategory IDs to hide
let hideByPickActive = false;

// Lookup maps built from tileset metadata
const categoryNameLookup = new Map(); // BigInt categoryId -> display name
const subsByParent = new Map(); // string categoryId -> [{id: BigInt, name: string}]

// UI element references
const allCatCheckboxes = []; // {catId: BigInt, cb: HTMLInputElement}
const allSubCheckboxes = []; // HTMLInputElement[]
const catIdToCheckbox = new Map(); // BigInt categoryId -> checkbox element

// ─── Style ─────────────────────────────────────────────────────────────────────

function applyStyle() {
  if (!tileset) {
    return;
  }
  tileset.style = undefined;
  tileset.style = new Cesium.Cesium3DTileStyle();
  tileset.style.show = {
    evaluate: function (feature) {
      if (hiddenCategories.has(feature.getProperty("category"))) {
        return false;
      }
      if (hiddenSubcategories.has(feature.getProperty("subcategory"))) {
        return false;
      }
      return true;
    },
  };
}

// ─── Category Panel ────────────────────────────────────────────────────────────

function buildCategoryPanel() {
  // Read parallel metadata arrays from the tileset
  const catIds = tileset.metadata.getProperty("categoryIds");
  const catNames = tileset.metadata.getProperty("categoryNames");
  const subIds = tileset.metadata.getProperty("subcategoryIds");
  const subNames = tileset.metadata.getProperty("subcategoryNames");
  const subParentIds = tileset.metadata.getProperty("subcategoryParentIds");

  if (!catIds || !catNames || catIds.length === 0) {
    console.warn("No category metadata found. Is Advanced Features enabled?");
    return;
  }

  // Build lookup: BigInt categoryId -> display name
  catIds.forEach((id, i) => categoryNameLookup.set(BigInt(id), catNames[i]));

  // Group subcategories by parent category ID
  for (let i = 0; i < subIds.length; i++) {
    const parentId = subParentIds[i];
    if (!subsByParent.has(parentId)) {
      subsByParent.set(parentId, []);
    }
    subsByParent
      .get(parentId)
      .push({ id: BigInt(subIds[i]), name: subNames[i] });
  }

  // Deduplicate and sort categories alphabetically
  const uniqueCats = new Map();
  catIds.forEach((id, i) => {
    if (!uniqueCats.has(id)) {
      uniqueCats.set(id, catNames[i]);
    }
  });
  const sortedCats = [...uniqueCats.entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  console.log(
    `Loaded ${sortedCats.length} categories, ${subIds.length} subcategories`,
  );

  // Build UI
  const panel = document.getElementById("categoryPanel");

  // Toolbar buttons: Hide by Pick + Reset
  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";

  const pickBtn = document.createElement("button");
  pickBtn.textContent = "Hide by Pick";
  pickBtn.title = "Click features in the viewport to hide their category";
  pickBtn.addEventListener("click", function () {
    hideByPickActive = !hideByPickActive;
    pickBtn.style.background = hideByPickActive ? "#c44" : "#333";
    pickBtn.textContent = hideByPickActive
      ? "Hide by Pick (ON)"
      : "Hide by Pick";
    if (!hideByPickActive) {
      hoverLabel.style.display = "none";
    }
  });

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  resetBtn.title = "Show all categories and subcategories";
  resetBtn.addEventListener("click", function () {
    hiddenCategories.clear();
    hiddenSubcategories.clear();
    allCatCheckboxes.forEach((c) => (c.cb.checked = true));
    allSubCheckboxes.forEach((cb) => (cb.checked = true));
    applyStyle();
  });

  btnRow.appendChild(pickBtn);
  btnRow.appendChild(resetBtn);
  panel.appendChild(btnRow);

  // Build category rows with collapsible subcategories
  for (const [catIdStr, catName] of sortedCats) {
    const catId = BigInt(catIdStr);
    const subs = (subsByParent.get(catIdStr) || []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const row = document.createElement("div");
    row.className = "cat-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.title = "CTRL+click to solo this category";

    allCatCheckboxes.push({ catId, cb });
    catIdToCheckbox.set(catId, cb);

    // CTRL+click: solo this category (hide all others)
    cb.addEventListener("click", function (e) {
      if (e.ctrlKey) {
        e.preventDefault();
        const isAlreadySolo =
          hiddenCategories.size === allCatCheckboxes.length - 1 &&
          !hiddenCategories.has(catId);
        if (isAlreadySolo) {
          // Unsolo: show all
          hiddenCategories.clear();
          allCatCheckboxes.forEach((c) => (c.cb.checked = true));
        } else {
          // Solo: hide everything except this one
          hiddenCategories.clear();
          allCatCheckboxes.forEach((c) => {
            if (c.catId === catId) {
              c.cb.checked = true;
            } else {
              hiddenCategories.add(c.catId);
              c.cb.checked = false;
            }
          });
        }
        applyStyle();
      }
    });

    // Normal click: toggle this category
    cb.addEventListener("change", function () {
      if (cb.checked) {
        hiddenCategories.delete(catId);
      } else {
        hiddenCategories.add(catId);
      }
      applyStyle();
    });

    const label = document.createElement("span");
    label.className = "cat-label";
    label.textContent = catName;

    row.appendChild(cb);
    row.appendChild(label);
    panel.appendChild(row);

    // Subcategory list (collapsed by default)
    if (subs.length > 0) {
      const subsDiv = document.createElement("div");
      subsDiv.className = "subs";

      label.addEventListener("click", function () {
        label.classList.toggle("open");
        subsDiv.classList.toggle("open");
      });

      for (const sub of subs) {
        const subLabel = document.createElement("label");
        const subCb = document.createElement("input");
        subCb.type = "checkbox";
        subCb.checked = true;
        subCb.addEventListener("change", function () {
          if (subCb.checked) {
            hiddenSubcategories.delete(sub.id);
          } else {
            hiddenSubcategories.add(sub.id);
          }
          applyStyle();
        });
        allSubCheckboxes.push(subCb);
        subLabel.appendChild(subCb);
        subLabel.appendChild(document.createTextNode(` ${sub.name}`));
        subsDiv.appendChild(subLabel);
      }
      panel.appendChild(subsDiv);
    }
  }
}

// ─── Hover Tooltip ─────────────────────────────────────────────────────────────
// Shows category name next to cursor when Hide by Pick is active.

const hoverLabel = document.createElement("div");
hoverLabel.style.cssText =
  "position:fixed; padding:4px 8px; background:rgba(0,0,0,0.85); color:#fff; font-size:12px; pointer-events:none; display:none; z-index:1000; border-radius:3px; white-space:nowrap;";
document.body.appendChild(hoverLabel);

// ─── Event Handlers ────────────────────────────────────────────────────────────

// Click: identify category or hide it (in Hide by Pick mode)
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  if (!tileset) {
    return;
  }
  const feature = viewer.scene.pick(movement.position);
  if (
    !Cesium.defined(feature) ||
    !(feature instanceof Cesium.Cesium3DTileFeature)
  ) {
    return;
  }

  const catId = feature.getProperty("category");
  const catName = categoryNameLookup.get(catId) || "Unknown";

  if (hideByPickActive) {
    hiddenCategories.add(catId);
    const cb = catIdToCheckbox.get(catId);
    if (cb) {
      cb.checked = false;
    }
    applyStyle();
    console.log("Hidden category:", catName);
  } else {
    const subId = feature.getProperty("subcategory");
    console.log(
      `Clicked: ${catName} (category: ${catId}, subcategory: ${subId})`,
    );
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Hover: show tooltip in Hide by Pick mode
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  if (!hideByPickActive) {
    hoverLabel.style.display = "none";
    return;
  }
  if (!tileset) {
    return;
  }
  const feature = viewer.scene.pick(movement.endPosition);
  if (
    Cesium.defined(feature) &&
    feature instanceof Cesium.Cesium3DTileFeature
  ) {
    const catId = feature.getProperty("category");
    const catName = categoryNameLookup.get(catId) || "Unknown";
    hoverLabel.textContent = catName;
    hoverLabel.style.display = "block";
    hoverLabel.style.left = `${movement.endPosition.x + 15}px`;
    hoverLabel.style.top = `${movement.endPosition.y + 5}px`;
  } else {
    hoverLabel.style.display = "none";
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// ─── Initialize ────────────────────────────────────────────────────────────────

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
  buildCategoryPanel();
  applyStyle();
}

initialize();
