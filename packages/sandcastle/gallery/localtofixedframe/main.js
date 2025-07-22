import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const canvas = viewer.canvas;
canvas.setAttribute("tabindex", "0"); // needed to put focus on the canvas
canvas.addEventListener("click", function () {
  canvas.focus();
});
canvas.focus();

const scene = viewer.scene;
const camera = viewer.camera;
const controller = scene.screenSpaceCameraController;
let r = 0;

const hpRoll = new Cesium.HeadingPitchRoll();
const hpRange = new Cesium.HeadingPitchRange();
const deltaRadians = Cesium.Math.toRadians(1.0);

const localFrames = [
  {
    pos: Cesium.Cartesian3.fromDegrees(-123.075, 44.045, 5000.0),
    converter: Cesium.Transforms.eastNorthUpToFixedFrame,
    comments: "Classical East North Up\nlocal Frame",
  },
  {
    pos: Cesium.Cartesian3.fromDegrees(-123.075, 44.05, 5500.0),
    converter: Cesium.Transforms.localFrameToFixedFrameGenerator(
      "north",
      "west",
    ),
    comments: "North West Up\nlocal Frame",
  },
  {
    pos: Cesium.Cartesian3.fromDegrees(-123.075, 44.04, 4500.0),
    converter: Cesium.Transforms.localFrameToFixedFrameGenerator("south", "up"),
    comments: "South Up West\nlocal Frame",
  },
  {
    pos: Cesium.Cartesian3.fromDegrees(-123.075, 44.05, 4500.0),
    converter: Cesium.Transforms.localFrameToFixedFrameGenerator("up", "east"),
    comments: "Up East North\nlocal Frame",
  },
  {
    pos: Cesium.Cartesian3.fromDegrees(-123.075, 44.04, 5500.0),
    converter: Cesium.Transforms.localFrameToFixedFrameGenerator(
      "down",
      "east",
    ),
    comments: "Down East South\nlocal Frame",
  },
];

const primitives = [];
const hprRollZero = new Cesium.HeadingPitchRoll();

for (let i = 0; i < localFrames.length; i++) {
  const position = localFrames[i].pos;
  const converter = localFrames[i].converter;
  const comments = localFrames[i].comments;
  try {
    const planePrimitive = scene.primitives.add(
      await Cesium.Model.fromGltfAsync({
        url: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
        modelMatrix: Cesium.Transforms.headingPitchRollToFixedFrame(
          position,
          hpRoll,
          Cesium.Ellipsoid.WGS84,
          converter,
        ),
        minimumPixelSize: 128,
      }),
    );

    primitives.push({
      primitive: planePrimitive,
      converter: converter,
      position: position,
    });
  } catch (error) {
    console.log(`Error loading model: ${error}`);
  }
  const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
    position,
    hprRollZero,
    Cesium.Ellipsoid.WGS84,
    converter,
  );
  scene.primitives.add(
    new Cesium.DebugModelMatrixPrimitive({
      modelMatrix: modelMatrix,
      length: 300.0,
      width: 10.0,
    }),
  );

  const positionLabel = position.clone();
  positionLabel.z = position.z + 300.0;
  viewer.entities.add({
    position: positionLabel,
    label: {
      text: comments,
      font: "18px Helvetica",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      HorizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
    },
  });
}

primitives[0].primitive.readyEvent.addEventListener((model) => {
  // Zoom to first model
  r = 2.0 * Math.max(model.boundingSphere.radius, camera.frustum.near);
  controller.minimumZoomDistance = r * 0.5;
  const center = model.boundingSphere.center;
  const heading = Cesium.Math.toRadians(90.0);
  const pitch = Cesium.Math.toRadians(0.0);
  hpRange.heading = heading;
  hpRange.pitch = pitch;
  hpRange.range = r * 100.0;
  camera.lookAt(center, hpRange);
});

document.addEventListener("keydown", function (e) {
  switch (e.code) {
    case "ArrowDown":
      // pitch down
      hpRoll.pitch -= deltaRadians;
      if (hpRoll.pitch < -Cesium.Math.TWO_PI) {
        hpRoll.pitch += Cesium.Math.TWO_PI;
      }
      break;
    case "ArrowUp":
      // pitch up
      hpRoll.pitch += deltaRadians;
      if (hpRoll.pitch > Cesium.Math.TWO_PI) {
        hpRoll.pitch -= Cesium.Math.TWO_PI;
      }
      break;
    case "ArrowRight":
      if (e.shiftKey) {
        // roll right
        hpRoll.roll += deltaRadians;
        if (hpRoll.roll > Cesium.Math.TWO_PI) {
          hpRoll.roll -= Cesium.Math.TWO_PI;
        }
      } else {
        // turn right
        hpRoll.heading += deltaRadians;
        if (hpRoll.heading > Cesium.Math.TWO_PI) {
          hpRoll.heading -= Cesium.Math.TWO_PI;
        }
      }
      break;
    case "ArrowLeft":
      if (e.shiftKey) {
        // roll left until
        hpRoll.roll -= deltaRadians;
        if (hpRoll.roll < 0.0) {
          hpRoll.roll += Cesium.Math.TWO_PI;
        }
      } else {
        // turn left
        hpRoll.heading -= deltaRadians;
        if (hpRoll.heading < 0.0) {
          hpRoll.heading += Cesium.Math.TWO_PI;
        }
      }
      break;
    default:
  }
});

const headingSpan = document.getElementById("heading");
const pitchSpan = document.getElementById("pitch");
const rollSpan = document.getElementById("roll");

viewer.scene.preUpdate.addEventListener(function (scene, time) {
  for (let i = 0; i < primitives.length; i++) {
    const primitive = primitives[i].primitive;
    const converter = primitives[i].converter;
    const position = primitives[i].position;
    Cesium.Transforms.headingPitchRollToFixedFrame(
      position,
      hpRoll,
      Cesium.Ellipsoid.WGS84,
      converter,
      primitive.modelMatrix,
    );
  }
});

viewer.scene.preRender.addEventListener(function (scene, time) {
  headingSpan.innerHTML = Cesium.Math.toDegrees(hpRoll.heading).toFixed(1);
  pitchSpan.innerHTML = Cesium.Math.toDegrees(hpRoll.pitch).toFixed(1);
  rollSpan.innerHTML = Cesium.Math.toDegrees(hpRoll.roll).toFixed(1);
});
