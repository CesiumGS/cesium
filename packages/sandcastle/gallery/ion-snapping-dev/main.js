import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Snap-to-geometry against an iModel-backed ion asset. Left-click the tileset
// to snap: the picked element and cursor position are sent to the ion element
// snap endpoint via Cesium.IonSnap, and the returned snap/hit points are
// plotted. Requires a geolocated iModel-backed asset on an account with the
// asset elements feature enabled.

const viewer = new Cesium.Viewer("cesiumContainer", {});
viewer.scene.globe.show = true;
viewer.scene.debugShowFramesPerSecond = true;

// An iModel-backed ion asset id (numeric).
const ASSET_ID = 0;

// Snap tolerance in CSS pixels, adjustable live via the slider.
const DEFAULT_SNAP_APERTURE = 12;
let snapAperture = DEFAULT_SNAP_APERTURE;

// Color scheme (kept in sync with the on-screen legend).
const COLORS = {
  picked: {
    fill: Cesium.Color.LIME,
    outline: Cesium.Color.CYAN,
    swatch: "#00ff00",
  },
  snap: {
    fill: Cesium.Color.RED,
    outline: Cesium.Color.YELLOW,
    swatch: "#ff0000",
  },
  hit: {
    fill: Cesium.Color.PINK,
    outline: Cesium.Color.FUCHSIA,
    swatch: "#ffc0cb",
  },
};

// Snap mode selector — with keypoint modes (nearest keypoint, center) the snap
// point (red) visibly separates from the hit point (pink); with Nearest they
// coincide by design.
let snapMode = Cesium.IonSnap.SnapMode.NEAREST;
Sandcastle.addToolbarMenu(
  Object.entries(Cesium.IonSnap.SnapMode).map(([name, value]) => ({
    text: `Snap mode: ${name}`,
    onselect: function () {
      snapMode = value;
    },
  })),
);

addSnapApertureSlider();
addLegend();

const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(ASSET_ID);
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// Fetches the asset's iModel -> ECEF transform once; snaps reuse it.
const snapper = await Cesium.IonSnap.fromAssetId(ASSET_ID);

viewer.screenSpaceEventHandler.setInputAction(async function onLeftClick(
  movement,
) {
  const pickPosition = viewer.scene.pickPosition(movement.position);
  const pickFeature = viewer.scene.pick(movement.position);
  if (!pickPosition || !pickFeature) {
    return;
  }
  const element = pickFeature.getProperty("element");
  const elementId = `0x${element.toString(16)}`;
  console.log("elementId:", elementId);

  // Show the picked cursor position.
  addPoint(pickPosition, COLORS.picked);

  let result;
  try {
    result = await snapper.snap({
      elementId: elementId,
      testPoint: pickPosition,
      scene: viewer.scene,
      snapAperture: snapAperture,
      snapMode: snapMode,
    });
  } catch (error) {
    console.error("snap failed:", error);
    return;
  }
  console.log("snap result:", result);

  if (Cesium.defined(result) && Cesium.defined(result.snapPoint)) {
    addPoint(result.snapPoint, COLORS.snap);
    if (Cesium.defined(result.hitPoint)) {
      addPoint(result.hitPoint, COLORS.hit);
    }
  } else {
    console.warn("no snap possible for this element/point");
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Plot an ECEF Cartesian3 point with the given color pair.
function addPoint(position, color) {
  viewer.entities.add({
    position: position,
    point: {
      color: color.fill,
      pixelSize: 10,
      outlineColor: color.outline,
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

function addSnapApertureSlider() {
  const toolbar = document.getElementById("toolbar") || viewer.container;

  const container = document.createElement("div");
  container.style.cssText = "margin-top:4px; color:#fff; font:12px sans-serif;";

  const label = document.createElement("span");
  const setLabel = () => {
    label.textContent = `Snap aperture: ${snapAperture} px`;
  };

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "48";
  slider.step = "1";
  slider.value = String(snapAperture);
  slider.style.cssText = "vertical-align:middle; margin-left:8px; width:140px;";
  slider.addEventListener("input", function () {
    snapAperture = Number(slider.value);
    setLabel();
  });

  setLabel();
  container.appendChild(label);
  container.appendChild(slider);
  toolbar.appendChild(container);
}

// On-screen legend describing what each colored point means.
function addLegend() {
  const entries = [
    [COLORS.picked.swatch, "Picked position (cursor)"],
    [COLORS.snap.swatch, "Snap point"],
    [COLORS.hit.swatch, "Hit point"],
  ];

  const legend = document.createElement("div");
  legend.style.cssText =
    "position:absolute; top:10px; right:10px; z-index:1000; background:rgba(0,0,0,0.7);" +
    "color:#fff; padding:10px 12px; font:12px/1.5 sans-serif; border-radius:6px; pointer-events:none;";

  let html = "<b>Legend</b>";
  for (const [swatch, label] of entries) {
    html +=
      `<div style="margin-top:4px; display:flex; align-items:center;">` +
      `<span style="display:inline-block; width:12px; height:12px; border-radius:50%;` +
      ` background:${swatch}; border:2px solid #fff; margin-right:6px;"></span>${label}</div>`;
  }
  legend.innerHTML = html;
  viewer.container.appendChild(legend);
}
