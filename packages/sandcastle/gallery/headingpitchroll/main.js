import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const canvas = viewer.canvas;
canvas.setAttribute("tabindex", "0"); // needed to put focus on the canvas
canvas.addEventListener("click", function () {
  canvas.focus();
});
canvas.focus();

const scene = viewer.scene;

const pathPosition = new Cesium.SampledPositionProperty();
viewer.entities.add({
  position: pathPosition,
  name: "path",
  path: {
    show: true,
    leadTime: 0,
    trailTime: 60,
    width: 10,
    resolution: 1,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.3,
      taperPower: 0.3,
      color: Cesium.Color.PALEGOLDENROD,
    }),
  },
});

const camera = viewer.camera;
const controller = scene.screenSpaceCameraController;
let r = 0;

const hpRoll = new Cesium.HeadingPitchRoll();
const hpRange = new Cesium.HeadingPitchRange();
let speed = 10;
const deltaRadians = Cesium.Math.toRadians(3.0);

let position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 5000.0);
let speedVector = new Cesium.Cartesian3();
const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator(
  "north",
  "west",
);

const headingSpan = document.getElementById("heading");
const pitchSpan = document.getElementById("pitch");
const rollSpan = document.getElementById("roll");
const speedSpan = document.getElementById("speed");
const fromBehind = document.getElementById("fromBehind");

try {
  const planePrimitive = scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
      modelMatrix: Cesium.Transforms.headingPitchRollToFixedFrame(
        position,
        hpRoll,
        Cesium.Ellipsoid.WGS84,
        fixedFrameTransform,
      ),
      minimumPixelSize: 128,
    }),
  );

  planePrimitive.readyEvent.addEventListener(() => {
    // Play and loop all animations at half-speed
    planePrimitive.activeAnimations.addAll({
      multiplier: 0.5,
      loop: Cesium.ModelAnimationLoop.REPEAT,
    });

    // Zoom to model
    r =
      2.0 * Math.max(planePrimitive.boundingSphere.radius, camera.frustum.near);
    controller.minimumZoomDistance = r * 0.5;
    const center = planePrimitive.boundingSphere.center;
    const heading = Cesium.Math.toRadians(230.0);
    const pitch = Cesium.Math.toRadians(-20.0);
    hpRange.heading = heading;
    hpRange.pitch = pitch;
    hpRange.range = r * 50.0;
    camera.lookAt(center, hpRange);
  });

  document.addEventListener("keydown", function (e) {
    switch (e.code) {
      case "ArrowDown":
        if (e.shiftKey) {
          // speed down
          speed = Math.max(--speed, 1);
        } else {
          // pitch down
          hpRoll.pitch -= deltaRadians;
          if (hpRoll.pitch < -Cesium.Math.TWO_PI) {
            hpRoll.pitch += Cesium.Math.TWO_PI;
          }
        }
        break;
      case "ArrowUp":
        if (e.shiftKey) {
          // speed up
          speed = Math.min(++speed, 100);
        } else {
          // pitch up
          hpRoll.pitch += deltaRadians;
          if (hpRoll.pitch > Cesium.Math.TWO_PI) {
            hpRoll.pitch -= Cesium.Math.TWO_PI;
          }
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

  viewer.scene.preUpdate.addEventListener(function (scene, time) {
    speedVector = Cesium.Cartesian3.multiplyByScalar(
      Cesium.Cartesian3.UNIT_X,
      speed / 10,
      speedVector,
    );
    position = Cesium.Matrix4.multiplyByPoint(
      planePrimitive.modelMatrix,
      speedVector,
      position,
    );
    pathPosition.addSample(Cesium.JulianDate.now(), position);
    Cesium.Transforms.headingPitchRollToFixedFrame(
      position,
      hpRoll,
      Cesium.Ellipsoid.WGS84,
      fixedFrameTransform,
      planePrimitive.modelMatrix,
    );

    if (fromBehind.checked) {
      // Zoom to model
      const center = planePrimitive.boundingSphere.center;
      hpRange.heading = hpRoll.heading;
      hpRange.pitch = hpRoll.pitch;
      camera.lookAt(center, hpRange);
    }
  });
} catch (error) {
  console.log(`Error loading model: ${error}`);
}

viewer.scene.preRender.addEventListener(function (scene, time) {
  headingSpan.innerHTML = Cesium.Math.toDegrees(hpRoll.heading).toFixed(1);
  pitchSpan.innerHTML = Cesium.Math.toDegrees(hpRoll.pitch).toFixed(1);
  rollSpan.innerHTML = Cesium.Math.toDegrees(hpRoll.roll).toFixed(1);
  speedSpan.innerHTML = speed.toFixed(1);
});
