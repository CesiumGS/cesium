import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Snap-to-geometry against an ion asset backed by a BIM/CAD Database model.
// Left-click the tileset to snap: the picked element and cursor position are
// sent to the ion element snap endpoint via Cesium.IonSnapService, and the
// returned snap/hit points are plotted. Requires a geolocated asset backed by
// a BIM/CAD Database model, on an account with the asset elements feature
// enabled.

// The id (numeric) of an ion asset backed by a BIM/CAD Database model, on an
// account with the asset elements feature enabled.
const ASSET_ID = 5161569;

const viewer = new Cesium.Viewer("cesiumContainer", {});

// Use real world terrain: the default ellipsoid surface sits above the
// model's ground level and would clip into it.
viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
viewer.scene.globe.depthTestAgainstTerrain = true;
// Include translucent geometry in the depth used by pickPosition, so clicking
// transparent surfaces yields a test point on the surface rather than on
// whatever opaque geometry lies behind it.
viewer.scene.pickTranslucentDepth = true;

// Snap tolerance in CSS pixels, adjustable live via the slider.
const DEFAULT_SNAP_APERTURE = Cesium.IonSnapService.DEFAULT_SNAP_APERTURE;
let snapAperture = DEFAULT_SNAP_APERTURE;

// Color scheme (kept in sync with the on-screen legend, which renders each
// swatch with the same white border the points use as their outline).
const COLORS = {
  picked: {
    fill: Cesium.Color.LIME,
    swatch: "#00ff00",
  },
  snap: {
    fill: Cesium.Color.RED,
    swatch: "#ff0000",
  },
  snapSurface: {
    fill: Cesium.Color.ORANGE,
    swatch: "#ffa500",
  },
  hit: {
    fill: Cesium.Color.PINK,
    swatch: "#ffc0cb",
  },
};

// Snap mode selector — with keypoint modes (nearest keypoint, center) the snap
// point (red) visibly separates from the hit point (pink); with Nearest they
// coincide by design.
let snapMode = Cesium.IonSnapMode.NEAREST;
Sandcastle.addToolbarMenu(
  Object.entries(Cesium.IonSnapMode).map(([name, value]) => ({
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

// Fetches the transform from the asset's source reference frame a single time. Subsequently, every call to snap() reuses it.
const snapper = await Cesium.IonSnapService.fromAssetId(ASSET_ID);

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

  // Only show the most recent snap. The picked point gives immediate
  // feedback; everything is redrawn largest-first once the snap returns so
  // coincident points nest as rings (hit > snap > picked) instead of hiding
  // each other.
  viewer.entities.removeAll();
  addPoint(pickPosition, COLORS.picked, 8);

  let result;
  try {
    const canvas = viewer.scene.canvas;
    result = await snapper.snap({
      elementId: elementId,
      testPoint: pickPosition,
      camera: viewer.camera,
      canvasWidth: canvas.clientWidth,
      canvasHeight: canvas.clientHeight,
      snapAperture: snapAperture,
      snapMode: snapMode,
    });
  } catch (error) {
    console.error("snap failed:", error);
    return;
  }
  console.log("snap result:", result);

  if (Cesium.defined(result) && Cesium.defined(result.snapPoint)) {
    // geometryType SURFACE means the snap tracked the surface under the cursor;
    // any other type means it was pulled to an edge/keypoint.
    const onSurface =
      result.geometryType === Cesium.IonSnapGeometryType.SURFACE;
    console.log(onSurface ? "tracked surface" : "snapped to edge/keypoint");
    viewer.entities.removeAll();
    if (Cesium.defined(result.hitPoint)) {
      addRing(result.hitPoint, COLORS.hit, 20);
    }
    addPoint(
      result.snapPoint,
      onSurface ? COLORS.snapSurface : COLORS.snap,
      14,
    );
    addPoint(pickPosition, COLORS.picked, 8);
    addLeaderLine(pickPosition, result.snapPoint);
  } else {
    console.warn("no snap possible for this element/point");
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Plot an ECEF Cartesian3 point with the given color pair.
function addPoint(position, color, pixelSize) {
  viewer.entities.add({
    position: position,
    point: {
      color: color.fill,
      pixelSize: pixelSize,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

// Plot a hollow ring, so points stacked at the same position stay visible
// through its center regardless of render order.
function addRing(position, color, pixelSize) {
  viewer.entities.add({
    position: position,
    point: {
      color: Cesium.Color.TRANSPARENT,
      pixelSize: pixelSize,
      outlineColor: color.fill,
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

// Show how far the snap pulled the point away from the cursor.
function addLeaderLine(from, to) {
  if (Cesium.Cartesian3.distance(from, to) < 0.001) {
    return;
  }
  viewer.entities.add({
    polyline: {
      positions: [from, to],
      width: 2,
      material: Cesium.Color.WHITE,
      arcType: Cesium.ArcType.NONE,
      depthFailMaterial: Cesium.Color.WHITE.withAlpha(0.4),
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
    [COLORS.picked.swatch, "Picked position (cursor)", false],
    [COLORS.snap.swatch, "Snap point (edge/keypoint)", false],
    [COLORS.snapSurface.swatch, "Snap point (surface)", false],
    [COLORS.hit.swatch, "Hit point (ring)", true],
  ];

  const legend = document.createElement("div");
  legend.style.cssText =
    "position:absolute; top:10px; right:10px; z-index:1000; background:rgba(0,0,0,0.7);" +
    "color:#fff; padding:10px 12px; font:12px/1.5 sans-serif; border-radius:6px; pointer-events:none;";

  let html = "<b>Legend</b>";
  for (const [swatch, label, isRing] of entries) {
    const style = isRing
      ? `background:transparent; border:3px solid ${swatch};`
      : `background:${swatch}; border:2px solid #fff;`;
    html +=
      `<div style="margin-top:4px; display:flex; align-items:center;">` +
      `<span style="display:inline-block; width:12px; height:12px; border-radius:50%;` +
      ` ${style} margin-right:6px;"></span>${label}</div>`;
  }
  legend.innerHTML = html;
  viewer.container.appendChild(legend);
}
