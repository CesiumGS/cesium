import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

function createPrimitives(scene) {
  const polylines = scene.primitives.add(new Cesium.PolylineCollection());

  // A simple polyline with two points.
  const polyline = polylines.add({
    positions: Cesium.PolylinePipeline.generateCartesianArc({
      positions: Cesium.Cartesian3.fromDegreesArray([
        -120.0, 40.0, -110.0, 30.0,
      ]),
    }),
    material: Cesium.Material.fromType("Color", {
      color: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
    }),
  });
  Sandcastle.declare(polyline); // For highlighting on mouseover in Sandcastle.

  // Apply a polyline outline material
  const widePolyline = polylines.add({
    positions: Cesium.PolylinePipeline.generateCartesianArc({
      positions: Cesium.Cartesian3.fromDegreesArray([
        -105.0, 40.0, -100.0, 38.0, -105.0, 35.0, -100.0, 32.0,
      ]),
    }),
    material: Cesium.Material.fromType(Cesium.Material.PolylineOutlineType, {
      outlineWidth: 5.0,
    }),
    width: 10.0,
  });
  Sandcastle.declare(widePolyline); // For highlighting on mouseover in Sandcastle.

  // Apply a polyline glow material
  const coloredPolyline = polylines.add({
    positions: Cesium.PolylinePipeline.generateCartesianArc({
      positions: Cesium.Cartesian3.fromDegreesArray([-95.0, 30.0, -85.0, 40.0]),
    }),
    material: Cesium.Material.fromType(Cesium.Material.PolylineGlowType, {
      glowPower: 0.2,
      taperPower: 0.2,
      color: new Cesium.Color(1.0, 0.5, 0.0, 1.0),
    }),
    width: 10.0,
  });
  Sandcastle.declare(coloredPolyline); // For highlighting on mouseover in Sandcastle.

  // A polyline loop
  const loopPolyline = polylines.add({
    positions: Cesium.PolylinePipeline.generateCartesianArc({
      positions: Cesium.Cartesian3.fromDegreesArray([
        -105.0, 30.0, -105.0, 25.0, -100.0, 22.0, -100.0, 28.0,
      ]),
    }),
    width: 3.0,
    loop: true,
  });
  Sandcastle.declare(loopPolyline); // For highlighting on mouseover in Sandcastle.

  // Draw a line in a local reference frame
  // The arrow points to the east, i.e. along the local x-axis.
  const localPolylines = scene.primitives.add(new Cesium.PolylineCollection());
  const center = Cesium.Cartesian3.fromDegrees(-80.0, 35.0);
  localPolylines.modelMatrix =
    Cesium.Transforms.eastNorthUpToFixedFrame(center);

  const localPolyline = localPolylines.add({
    positions: [
      new Cesium.Cartesian3(0.0, 0.0, 0.0),
      new Cesium.Cartesian3(1000000.0, 0.0, 0.0),
    ],
    width: 10.0,
    material: Cesium.Material.fromType(Cesium.Material.PolylineArrowType),
  });
  Sandcastle.declare(localPolyline); // For highlighting on mouseover in Sandcastle.

  //Polyline using the fade material
  const fadingPolyline = polylines.add({
    positions: Cesium.PolylinePipeline.generateCartesianArc({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 43, 500000, -125, 43, 500000,
      ]),
    }),
    width: 5,
    material: Cesium.Material.fromType(Cesium.Material.FadeType, {
      repeat: false,
      fadeInColor: Cesium.Color.CYAN,
      fadeOutColor: Cesium.Color.CYAN.withAlpha(0),
      time: new Cesium.Cartesian2(0.0, 0.0),
      fadeDirection: {
        x: true,
        y: false,
      },
    }),
  });
  Sandcastle.declare(fadingPolyline); // For highlighting on mouseover in Sandcastle.

  // A rhumb line with two points.
  const rhumbLine = polylines.add({
    positions: Cesium.PolylinePipeline.generateCartesianRhumbArc({
      positions: Cesium.Cartesian3.fromDegreesArray([
        -130.0, 30.0, -75.0, 30.0,
      ]),
    }),
    width: 5,
    material: Cesium.Material.fromType("Color", {
      color: new Cesium.Color(0.0, 1.0, 0.0, 1.0),
    }),
  });
  Sandcastle.declare(rhumbLine); // For highlighting on mouseover in Sandcastle.
}

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
  const pickedPrimitive = viewer.scene.pick(movement.endPosition);
  Sandcastle.highlight(pickedPrimitive);
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

createPrimitives(viewer.scene);
