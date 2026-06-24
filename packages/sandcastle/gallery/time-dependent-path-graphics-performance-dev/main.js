import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const intervalCountIncrement = 15;
let intervalCount = 15;
const intervalDurationSeconds = 60;
const pathResolutionSeconds = 5.0;

const startTime = Cesium.JulianDate.fromIso8601("2026-04-01T00:00:00Z");

const pathModeProperty = new Cesium.ConstantProperty(Cesium.PathMode.PORTIONS);
let pathEntity;

function addSecondsFromStart(seconds) {
  return Cesium.JulianDate.addSeconds(
    startTime,
    seconds,
    new Cesium.JulianDate(),
  );
}

function createIntervalColor(index) {
  const colors = [
    [255, 64, 64],
    [255, 144, 64],
    [255, 208, 64],
    [192, 224, 64],
    [96, 208, 96],
    [64, 224, 160],
    [64, 224, 224],
    [64, 160, 255],
    [64, 96, 255],
    [128, 64, 255],
    [192, 64, 255],
    [255, 64, 224],
    [255, 64, 160],
    [255, 96, 96],
    [224, 128, 255],
  ];

  const color = colors[index % colors.length];
  return Cesium.Color.fromBytes(color[0], color[1], color[2], 255);
}

function buildPath() {
  const totalDurationSeconds = intervalCount * intervalDurationSeconds;
  const stopTime = Cesium.JulianDate.addSeconds(
    startTime,
    totalDurationSeconds,
    new Cesium.JulianDate(),
  );

  viewer.clock.startTime = Cesium.JulianDate.clone(startTime);
  viewer.clock.stopTime = Cesium.JulianDate.clone(stopTime);
  viewer.clock.currentTime = Cesium.JulianDate.clone(startTime);
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 60;

  const pathPosition = new Cesium.SampledPositionProperty();
  for (let i = 0; i <= intervalCount; i++) {
    const progress = i / intervalCount;
    const longitude = -122.48 + progress * 0.28;
    const latitude = 37.71 + Math.sin(progress * Math.PI * 3.0) * 0.045;
    const height =
      12000 + progress * 7000 + Math.cos(progress * Math.PI * 4.0) * 1800;

    pathPosition.addSample(
      addSecondsFromStart(i * intervalDurationSeconds),
      Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
    );
  }

  const material = new Cesium.CompositeMaterialProperty();
  for (let i = 0; i < intervalCount; i++) {
    material.intervals.addInterval(
      Cesium.TimeInterval.fromIso8601({
        iso8601: `${Cesium.JulianDate.toIso8601(
          addSecondsFromStart(i * intervalDurationSeconds),
        )}/${Cesium.JulianDate.toIso8601(
          addSecondsFromStart((i + 1) * intervalDurationSeconds),
        )}`,
        data: new Cesium.ColorMaterialProperty(createIntervalColor(i)),
      }),
    );
  }

  if (Cesium.defined(pathEntity)) {
    viewer.entities.remove(pathEntity);
  }

  pathEntity = viewer.entities.add({
    name: "Time-dependent path stress test",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: startTime,
        stop: stopTime,
      }),
    ]),
    position: pathPosition,
    point: {
      pixelSize: 8,
      color: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      show: true,
    },
    label: {
      text: `${intervalCount}-interval path`,
      font: "14px sans-serif",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 3,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0.0, -18.0),
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.65),
    },
  });

  pathEntity.path = new Cesium.PathGraphics();
  pathEntity.path.show = new Cesium.ConstantProperty(true);
  pathEntity.path.width = new Cesium.ConstantProperty(8.0);
  pathEntity.path.resolution = new Cesium.ConstantProperty(
    pathResolutionSeconds,
  );
  pathEntity.path.materialMode = pathModeProperty;
  pathEntity.path.leadTime = new Cesium.ConstantProperty(totalDurationSeconds);
  pathEntity.path.trailTime = new Cesium.ConstantProperty(totalDurationSeconds);
  pathEntity.path.material = material;

  viewer.zoomTo(pathEntity);
}

buildPath();

const pathModeOptions = [
  {
    text: "Path mode: PORTIONS",
    value: Cesium.PathMode.PORTIONS,
    onselect: function () {
      pathModeProperty.setValue(Cesium.PathMode.PORTIONS);
    },
  },
  {
    text: "Path mode: WHOLE",
    value: Cesium.PathMode.WHOLE,
    onselect: function () {
      pathModeProperty.setValue(Cesium.PathMode.WHOLE);
    },
  },
];

Sandcastle.addToolbarMenu(pathModeOptions);

Sandcastle.addToolbarButton(
  `Add ${intervalCountIncrement} intervals`,
  function () {
    intervalCount += intervalCountIncrement;
    buildPath();
  },
);

Sandcastle.addToolbarButton(
  `Remove ${intervalCountIncrement} intervals`,
  function () {
    intervalCount = Math.max(
      intervalCountIncrement,
      intervalCount - intervalCountIncrement,
    );
    buildPath();
  },
);
