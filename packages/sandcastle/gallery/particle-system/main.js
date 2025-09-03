import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

//Set the random number seed for consistent results.
Cesium.Math.setRandomNumberSeed(3);

//Set bounds of our simulation time
const start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16));
const stop = Cesium.JulianDate.addSeconds(start, 120, new Cesium.JulianDate());

//Make sure viewer is at the desired time.
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = stop.clone();
viewer.clock.currentTime = start.clone();
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
viewer.clock.multiplier = 1;
viewer.clock.shouldAnimate = true;

//Set timeline to simulation bounds
viewer.timeline.zoomTo(start, stop);

const viewModel = {
  emissionRate: 5.0,
  gravity: 0.0,
  minimumParticleLife: 1.2,
  maximumParticleLife: 1.2,
  minimumSpeed: 1.0,
  maximumSpeed: 4.0,
  startScale: 1.0,
  endScale: 5.0,
  particleSize: 25.0,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

function computeModelMatrix(entity, time) {
  return entity.computeModelMatrix(time, new Cesium.Matrix4());
}

const emitterModelMatrix = new Cesium.Matrix4();
const translation = new Cesium.Cartesian3();
const rotation = new Cesium.Quaternion();
let hpr = new Cesium.HeadingPitchRoll();
const trs = new Cesium.TranslationRotationScale();

function computeEmitterModelMatrix() {
  hpr = Cesium.HeadingPitchRoll.fromDegrees(0.0, 0.0, 0.0, hpr);
  trs.translation = Cesium.Cartesian3.fromElements(-4.0, 0.0, 1.4, translation);
  trs.rotation = Cesium.Quaternion.fromHeadingPitchRoll(hpr, rotation);

  return Cesium.Matrix4.fromTranslationRotationScale(trs, emitterModelMatrix);
}

const pos1 = Cesium.Cartesian3.fromDegrees(
  -75.15787310614596,
  39.97862668312678,
);
const pos2 = Cesium.Cartesian3.fromDegrees(
  -75.1633691390455,
  39.95355089912078,
);
const position = new Cesium.SampledPositionProperty();

position.addSample(start, pos1);
position.addSample(stop, pos2);

const entity = viewer.entities.add({
  availability: new Cesium.TimeIntervalCollection([
    new Cesium.TimeInterval({
      start: start,
      stop: stop,
    }),
  ]),
  model: {
    uri: "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
    minimumPixelSize: 64,
  },
  viewFrom: new Cesium.Cartesian3(-100.0, 0.0, 100.0),
  position: position,
  orientation: new Cesium.VelocityOrientationProperty(position),
});
viewer.trackedEntity = entity;

const scene = viewer.scene;
const particleSystem = scene.primitives.add(
  new Cesium.ParticleSystem({
    image: "../../SampleData/smoke.png",

    startColor: Cesium.Color.LIGHTSEAGREEN.withAlpha(0.7),
    endColor: Cesium.Color.WHITE.withAlpha(0.0),

    startScale: viewModel.startScale,
    endScale: viewModel.endScale,

    minimumParticleLife: viewModel.minimumParticleLife,
    maximumParticleLife: viewModel.maximumParticleLife,

    minimumSpeed: viewModel.minimumSpeed,
    maximumSpeed: viewModel.maximumSpeed,

    imageSize: new Cesium.Cartesian2(
      viewModel.particleSize,
      viewModel.particleSize,
    ),

    emissionRate: viewModel.emissionRate,

    bursts: [
      // these burst will occasionally sync to create a multicolored effect
      new Cesium.ParticleBurst({
        time: 5.0,
        minimum: 10,
        maximum: 100,
      }),
      new Cesium.ParticleBurst({
        time: 10.0,
        minimum: 50,
        maximum: 100,
      }),
      new Cesium.ParticleBurst({
        time: 15.0,
        minimum: 200,
        maximum: 300,
      }),
    ],

    lifetime: 16.0,

    emitter: new Cesium.CircleEmitter(2.0),

    emitterModelMatrix: computeEmitterModelMatrix(),

    updateCallback: applyGravity,
  }),
);

const gravityScratch = new Cesium.Cartesian3();

function applyGravity(p, dt) {
  // We need to compute a local up vector for each particle in geocentric space.
  const position = p.position;

  Cesium.Cartesian3.normalize(position, gravityScratch);
  Cesium.Cartesian3.multiplyByScalar(
    gravityScratch,
    viewModel.gravity * dt,
    gravityScratch,
  );

  p.velocity = Cesium.Cartesian3.add(p.velocity, gravityScratch, p.velocity);
}

viewer.scene.preUpdate.addEventListener(function (scene, time) {
  particleSystem.modelMatrix = computeModelMatrix(entity, time);

  // Account for any changes to the emitter model matrix.
  particleSystem.emitterModelMatrix = computeEmitterModelMatrix();

  // Spin the emitter if enabled.
  if (viewModel.spin) {
    viewModel.heading += 1.0;
    viewModel.pitch += 1.0;
    viewModel.roll += 1.0;
  }
});

Cesium.knockout
  .getObservable(viewModel, "emissionRate")
  .subscribe(function (newValue) {
    particleSystem.emissionRate = parseFloat(newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "particleSize")
  .subscribe(function (newValue) {
    const particleSize = parseFloat(newValue);
    particleSystem.minimumImageSize.x = particleSize;
    particleSystem.minimumImageSize.y = particleSize;
    particleSystem.maximumImageSize.x = particleSize;
    particleSystem.maximumImageSize.y = particleSize;
  });

Cesium.knockout
  .getObservable(viewModel, "minimumParticleLife")
  .subscribe(function (newValue) {
    particleSystem.minimumParticleLife = parseFloat(newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "maximumParticleLife")
  .subscribe(function (newValue) {
    particleSystem.maximumParticleLife = parseFloat(newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "minimumSpeed")
  .subscribe(function (newValue) {
    particleSystem.minimumSpeed = parseFloat(newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "maximumSpeed")
  .subscribe(function (newValue) {
    particleSystem.maximumSpeed = parseFloat(newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "startScale")
  .subscribe(function (newValue) {
    particleSystem.startScale = parseFloat(newValue);
  });

Cesium.knockout
  .getObservable(viewModel, "endScale")
  .subscribe(function (newValue) {
    particleSystem.endScale = parseFloat(newValue);
  });

const options = [
  {
    text: "Circle Emitter",
    onselect: function () {
      particleSystem.emitter = new Cesium.CircleEmitter(2.0);
    },
  },
  {
    text: "Sphere Emitter",
    onselect: function () {
      particleSystem.emitter = new Cesium.SphereEmitter(2.5);
    },
  },
  {
    text: "Cone Emitter",
    onselect: function () {
      particleSystem.emitter = new Cesium.ConeEmitter(
        Cesium.Math.toRadians(45.0),
      );
    },
  },
  {
    text: "Box Emitter",
    onselect: function () {
      particleSystem.emitter = new Cesium.BoxEmitter(
        new Cesium.Cartesian3(10.0, 10.0, 10.0),
      );
    },
  },
];

Sandcastle.addToolbarMenu(options);
