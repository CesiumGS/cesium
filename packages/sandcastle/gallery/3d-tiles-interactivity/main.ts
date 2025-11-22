import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const scene = viewer.scene;
if (!scene.pickPositionSupported) {
  window.alert("This browser does not support pickPosition.");
}

scene.globe.depthTestAgainstTerrain = true;

const viewModel = {
  rightClickAction: "annotate",
  middleClickAction: "hide",
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

const annotations = scene.primitives.add(new Cesium.LabelCollection());

// Set the initial camera view to look at Manhattan
const initialPosition = Cesium.Cartesian3.fromDegrees(
  -74.01881302800248,
  40.69114333714821,
  753,
);
const initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(
  21.27879878293835,
  -21.34390550872461,
  0.0716951918898415,
);
scene.camera.setView({
  destination: initialPosition,
  orientation: initialOrientation,
  endTransform: Cesium.Matrix4.IDENTITY,
});

let style;
// Load the NYC buildings tileset.
try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(75343);
  scene.primitives.add(tileset);
  style = new Cesium.Cesium3DTileStyle({
    meta: {
      description: "'Building ${BIN} has height ${Height}.'",
    },
  });
  tileset.style = style;
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

handler.setInputAction(function (movement) {
  const feature = scene.pick(movement.position);
  if (!Cesium.defined(feature)) {
    return;
  }

  const action = viewModel.rightClickAction;
  if (action === "annotate") {
    annotate(movement, feature);
  } else if (action === "properties") {
    printProperties(movement, feature);
  } else if (action === "zoom") {
    zoom(movement, feature);
  }
}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

handler.setInputAction(function (movement) {
  const feature = scene.pick(movement.position);
  if (!Cesium.defined(feature)) {
    return;
  }

  const action = viewModel.middleClickAction;
  if (action === "hide") {
    feature.show = false;
  }
}, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);

function annotate(movement, feature) {
  if (scene.pickPositionSupported) {
    const cartesian = scene.pickPosition(movement.position);
    if (Cesium.defined(cartesian)) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const height = `${cartographic.height.toFixed(2)} m`;

      annotations.add({
        position: cartesian,
        text: height,
        showBackground: true,
        font: "14px monospace",
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
  }
}

function printProperties(movement, feature) {
  console.log("Properties:");
  const propertyIds = feature.getPropertyIds();
  const length = propertyIds.length;
  for (let i = 0; i < length; ++i) {
    const propertyId = propertyIds[i];
    console.log(`  ${propertyId}: ${feature.getProperty(propertyId)}`);
  }

  // Evaluate feature description
  if (!Cesium.defined(style)) {
    return;
  }
  console.log(`Description : ${style.meta.description.evaluate(feature)}`);
}

function zoom(movement, feature) {
  const longitude = Cesium.Math.toRadians(feature.getProperty("Longitude"));
  const latitude = Cesium.Math.toRadians(feature.getProperty("Latitude"));
  const height = feature.getProperty("Height");

  const positionCartographic = new Cesium.Cartographic(
    longitude,
    latitude,
    height * 0.5,
  );
  const position =
    scene.globe.ellipsoid.cartographicToCartesian(positionCartographic);

  const camera = scene.camera;
  const heading = camera.heading;
  const pitch = camera.pitch;

  const offset = offsetFromHeadingPitchRange(heading, pitch, height * 2.0);

  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
  Cesium.Matrix4.multiplyByPoint(transform, offset, position);

  camera.flyTo({
    destination: position,
    orientation: {
      heading: heading,
      pitch: pitch,
    },
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
  });
}

function offsetFromHeadingPitchRange(heading, pitch, range) {
  pitch = Cesium.Math.clamp(
    pitch,
    -Cesium.Math.PI_OVER_TWO,
    Cesium.Math.PI_OVER_TWO,
  );
  heading = Cesium.Math.zeroToTwoPi(heading) - Cesium.Math.PI_OVER_TWO;

  const pitchQuat = Cesium.Quaternion.fromAxisAngle(
    Cesium.Cartesian3.UNIT_Y,
    -pitch,
  );
  const headingQuat = Cesium.Quaternion.fromAxisAngle(
    Cesium.Cartesian3.UNIT_Z,
    -heading,
  );
  const rotQuat = Cesium.Quaternion.multiply(
    headingQuat,
    pitchQuat,
    headingQuat,
  );
  const rotMatrix = Cesium.Matrix3.fromQuaternion(rotQuat);

  const offset = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_X);
  Cesium.Matrix3.multiplyByVector(rotMatrix, offset, offset);
  Cesium.Cartesian3.negate(offset, offset);
  Cesium.Cartesian3.multiplyByScalar(offset, range, offset);
  return offset;
}
