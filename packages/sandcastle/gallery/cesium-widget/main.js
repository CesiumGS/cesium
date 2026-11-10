import * as Cesium from "cesium";

// Cesium.CesiumWidget is similar to Cesium.Viewer, but
// is trimmed down.  It is just a widget for the 3D globe;
// it does not include the animation, imagery selection,
// and other widgets, nor does it depend on the third-party
// Knockout library.
const widget = new Cesium.CesiumWidget("cesiumContainer", {
  shouldAnimate: true,
});

const position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 500);
const heading = Cesium.Math.toRadians(135);
const pitch = 0;
const roll = 0;
const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

const entity = widget.entities.add({
  position: position,
  orientation: orientation,
  model: {
    uri: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
    minimumPixelSize: 128,
    maximumScale: 20000,
  },
});
widget.trackedEntity = entity;
