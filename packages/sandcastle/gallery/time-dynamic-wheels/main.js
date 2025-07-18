import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

//Make sure viewer is at the desired time.
const start = Cesium.JulianDate.fromDate(new Date(2018, 11, 12, 15));
const totalSeconds = 10;
const stop = Cesium.JulianDate.addSeconds(
  start,
  totalSeconds,
  new Cesium.JulianDate(),
);
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = stop.clone();
viewer.clock.currentTime = start.clone();
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
viewer.timeline.zoomTo(start, stop);

// Create a path for our vehicle by lerping between two positions.
const position = new Cesium.SampledPositionProperty();
const startPosition = new Cesium.Cartesian3(
  -2379556.799372864,
  -4665528.205030263,
  3628013.106599678,
);
const endPosition = new Cesium.Cartesian3(
  -2379603.7074103747,
  -4665623.48990283,
  3627860.82704567,
);
// A velocity vector property will give us the entity's speed and direction at any given time.
const velocityVectorProperty = new Cesium.VelocityVectorProperty(
  position,
  false,
);
const velocityVector = new Cesium.Cartesian3();
// Store the wheel's rotation over time in a SampledProperty.
const wheelAngleProperty = new Cesium.SampledProperty(Number);
let wheelAngle = 0;

const numberOfSamples = 100;
for (let i = 0; i <= numberOfSamples; ++i) {
  const factor = i / numberOfSamples;
  const time = Cesium.JulianDate.addSeconds(
    start,
    factor * totalSeconds,
    new Cesium.JulianDate(),
  );

  // Lerp using a non-linear factor so that the vehicle accelerates.
  const locationFactor = Math.pow(factor, 2);
  const location = Cesium.Cartesian3.lerp(
    startPosition,
    endPosition,
    locationFactor,
    new Cesium.Cartesian3(),
  );
  position.addSample(time, location);
  // Rotate the wheels based on how fast the vehicle is moving at each timestep.
  velocityVectorProperty.getValue(time, velocityVector);
  const metersPerSecond = Cesium.Cartesian3.magnitude(velocityVector);
  const wheelRadius = 0.52; //in meters.
  const circumference = Math.PI * wheelRadius * 2;
  const rotationsPerSecond = metersPerSecond / circumference;

  wheelAngle +=
    ((Math.PI * 2 * totalSeconds) / numberOfSamples) * rotationsPerSecond;
  wheelAngleProperty.addSample(time, wheelAngle);
}

function updateSpeedLabel(time, result) {
  velocityVectorProperty.getValue(time, velocityVector);
  const metersPerSecond = Cesium.Cartesian3.magnitude(velocityVector);
  const kmPerHour = Math.round(metersPerSecond * 3.6);

  return `${kmPerHour} km/hr`;
}

const rotationProperty = new Cesium.CallbackProperty(function (time, result) {
  return Cesium.Quaternion.fromAxisAngle(
    Cesium.Cartesian3.UNIT_X,
    wheelAngleProperty.getValue(time),
    result,
  );
}, false);

const wheelTransformation = new Cesium.NodeTransformationProperty({
  rotation: rotationProperty,
});

const nodeTransformations = {
  Wheels: wheelTransformation,
  Wheels_mid: wheelTransformation,
  Wheels_rear: wheelTransformation,
};

// Add our vehicle model.
const vehicleEntity = viewer.entities.add({
  position: position,
  orientation: new Cesium.VelocityOrientationProperty(position), // Automatically set the vehicle's orientation to the direction it's facing.
  model: {
    uri: "../../SampleData/models/GroundVehicle/GroundVehicle.glb",
    runAnimations: false,
    nodeTransformations: nodeTransformations,
  },
  label: {
    text: new Cesium.CallbackProperty(updateSpeedLabel, false),
    font: "20px sans-serif",
    showBackground: true,
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 100.0),
    eyeOffset: new Cesium.Cartesian3(0, 3.5, 0),
  },
});

viewer.trackedEntity = vehicleEntity;
vehicleEntity.viewFrom = new Cesium.Cartesian3(-10.0, 7.0, 4.0);
