import * as Cesium from "cesium";

// Browse the hierarchical element tree of an architectural design model with
// the Cesium ion Asset Elements API using
// Cesium.IonAssetElementService.getElementTreeChildren. Expanding a node
// fetches its children on demand. Click a 3D element to reveal its ancestors in
// the tree, highlight it, and fly the camera to it.

// Asset 3784
const ION_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IndWd3ZVWWtlMXdfYVd3ZFYiLCJqdGkiOiJjNmU5NWIyMS0zOGRhLTQ2MTQtYmYxMi03ZDBjOWQyMmIzNGEiLCJpZCI6MjM1LCJzdWIiOiJydmVlbnN0cmErZWFzdHVzIiwiaXNzIjoiaHR0cHM6Ly9hcGkuaW9uLWRldmVsb3BtZW50LmNlc2l1bS5jb20iLCJhdWQiOiJRdWVyeWluZyBBUEkgV3JhcHBlciBEZW1vIiwiaWF0IjoxNzkyNDk2MjUxfQ.u1N6cRr7Wi24IxeNnkXllwbHPwZyfjtsHgRlWsiq3B8";
Cesium.Ion.defaultAccessToken = ION_ACCESS_TOKEN;

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
  infoBox: false,
});

const tileset = viewer.scene.primitives.add(
  await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID),
);
await viewer.zoomTo(tileset);

// The element id currently selected in the tree. Its feature renders green;
// everything else fades back.
let selectedElementId;
let activeSelection = 0;

const style = new Cesium.Cesium3DTileStyle();
style.color = {
  evaluateColor: function (feature, result) {
    if (!Cesium.defined(selectedElementId)) {
      return Cesium.Color.clone(Cesium.Color.WHITE, result);
    }
    const id = Cesium.IonAssetElementService.getElementId(feature);
    return id === selectedElementId
      ? Cesium.Color.clone(Cesium.Color.LIME, result)
      : Cesium.Color.clone(Cesium.Color.WHITE.withAlpha(0.05), result);
  },
};
tileset.style = style;

const treeRoot = document.getElementById("treeRoot");
const resetViewButton = document.getElementById("resetViewButton");
const treeNodesByKey = new Map();

function selectTreeLabel(label) {
  document
    .querySelectorAll(".treeLabel.selected")
    .forEach((selectedLabel) => selectedLabel.classList.remove("selected"));
  label.classList.add("selected");
}

function clearSelection() {
  activeSelection++;
  selectedElementId = undefined;
  tileset.makeStyleDirty();
  viewer.selectedEntity = undefined;
  document
    .querySelectorAll(".treeLabel.selected")
    .forEach((selectedLabel) => selectedLabel.classList.remove("selected"));
}

function collapseTree() {
  for (const treeNode of treeNodesByKey.values()) {
    treeNode.collapse();
  }
}

resetViewButton.addEventListener("click", function () {
  clearSelection();
  collapseTree();
  resetViewButton.hidden = true;
  viewer.zoomTo(tileset).catch(console.error);
});

// Highlight an element and fly the camera to its location when available.
async function selectElement(elementId, selection) {
  selectedElementId = elementId;
  tileset.makeStyleDirty();
  let element;
  try {
    element = await elementService.getElement(elementId);
  } catch (error) {
    console.error("Failed to fetch element:", error);
  }
  if (selection !== activeSelection || !Cesium.defined(element)) {
    return;
  }

  const boundingSphere =
    Cesium.IonAssetElementService.getBoundingSphere(element);
  if (Cesium.defined(boundingSphere)) {
    resetViewButton.hidden = false;
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-30), 0),
      duration: 1.5,
    });
  }
}

// Find a tree node by its kind and ID, which together identify a path entry.
function findPathNode(nodes, pathEntry) {
  return nodes.find(
    (node) =>
      node.kind === pathEntry.kind && String(node.id) === String(pathEntry.id),
  );
}

// Expand ancestors from the parent endpoint's root-first path and reveal the
// matching element row in the tree panel.
async function revealElementInTree(elementId, selection) {
  const result = await elementService.getElementTreeParents(elementId);
  if (
    selection !== activeSelection ||
    !Cesium.defined(result) ||
    result.path.length === 0
  ) {
    return;
  }

  let nodes = rootNodes;
  let treeNode;
  for (let i = 0; i < result.path.length; i++) {
    const pathEntry = result.path[i];
    const node = findPathNode(nodes, pathEntry);
    if (!node) {
      return;
    }

    treeNode = treeNodesByKey.get(node.key);
    if (!treeNode) {
      return;
    }
    if (i < result.path.length - 1) {
      nodes = await treeNode.expand();
      if (selection !== activeSelection) {
        return;
      }
    }
  }

  selectTreeLabel(treeNode.label);
  treeNode.label.scrollIntoView({ block: "nearest" });
}

// Build a list item for one tree node, wiring up lazy expansion and selection.
function createNodeElement(node) {
  const li = document.createElement("li");
  li.className = "treeNode";

  const row = document.createElement("div");
  row.className = "treeRow";

  const toggle = document.createElement("span");
  toggle.className = "treeToggle";
  toggle.textContent = node.hasChildren ? "▶" : "";

  const label = document.createElement("span");
  label.className = "treeLabel";
  label.textContent = node.label || node.className || node.id;

  row.appendChild(toggle);
  row.appendChild(label);
  li.appendChild(row);

  const childList = document.createElement("ul");
  childList.className = "treeChildren";
  li.appendChild(childList);

  let loaded = false;
  let loadedChildren = [];
  let expanded = false;
  let loading;

  async function expandNode() {
    if (!node.hasChildren) {
      return [];
    }
    expanded = true;
    li.classList.add("expanded");
    toggle.textContent = "▼";

    if (!loaded) {
      toggle.textContent = "…";
      // Pass the opaque node key as nodeKey to fetch this node's children.
      if (!loading) {
        loading = (async () => {
          const response = await elementService.getElementTreeChildren({
            nodeKey: node.key,
          });
          const children = response?.nodes ?? [];
          loadedChildren = children;
          for (const child of children) {
            childList.appendChild(createNodeElement(child));
          }
          loaded = true;
          return children;
        })();
      }
      try {
        return await loading;
      } finally {
        loading = undefined;
        toggle.textContent = expanded ? "▼" : "▶";
      }
    }
    return loadedChildren;
  }

  async function toggleExpand() {
    if (!node.hasChildren) {
      return;
    }
    if (expanded) {
      expanded = false;
      li.classList.remove("expanded");
      toggle.textContent = "▶";
      return;
    }
    await expandNode();
  }

  function collapseNode() {
    expanded = false;
    li.classList.remove("expanded");
    toggle.textContent = node.hasChildren ? "▶" : "";
  }

  const treeNode = {
    node: node,
    label: label,
    expand: expandNode,
    collapse: collapseNode,
  };
  treeNodesByKey.set(node.key, treeNode);

  toggle.addEventListener("click", toggleExpand);
  label.addEventListener("click", () => {
    selectTreeLabel(label);
    if (node.kind === "element") {
      selectElement(node.id, ++activeSelection).catch(console.error);
    } else {
      activeSelection++;
    }
  });

  return li;
}

// Seed the tree with the root nodes (getElementTreeChildren with no key).
const { nodes: rootNodes } = await elementService.getElementTreeChildren();
for (const node of rootNodes) {
  treeRoot.appendChild(createNodeElement(node));
}

// Picking a feature in the 3D view selects it and expands its tree ancestors.
const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
clickHandler.setInputAction(async function (movement) {
  const feature = viewer.scene.pick(movement.position);
  const elementId = Cesium.IonAssetElementService.getElementId(feature);
  if (!Cesium.defined(elementId)) {
    clearSelection();
    return;
  }

  try {
    const selection = ++activeSelection;
    // Fetch element details for camera framing and its tree path in parallel.
    await Promise.all([
      selectElement(elementId, selection),
      revealElementInTree(elementId, selection),
    ]);
  } catch (error) {
    console.error(error);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
