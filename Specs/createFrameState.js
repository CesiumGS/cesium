import {
  Atmosphere,
  defaultValue,
  GeographicProjection,
  JulianDate,
  Camera,
  CreditDisplay,
  FrameState,
  JobScheduler,
} from "@cesium/engine";

function createFrameState(context, camera, frameNumber, time) {
  // Mock frame-state for testing.
  const frameState = new FrameState(
    context,
    new CreditDisplay(
      document.createElement("div"),
      undefined,
      document.createElement("div"),
    ),
    new JobScheduler(),
  );

  const projection = new GeographicProjection();
  frameState.mapProjection = projection;
  frameState.frameNumber = defaultValue(frameNumber, 1.0);
  frameState.time = defaultValue(
    time,
    JulianDate.fromDate(new Date("January 1, 2011 12:00:00 EST")),
  );

  camera = defaultValue(
    camera,
    new Camera({
      drawingBufferWidth: 1,
      drawingBufferHeight: 1,
      mapProjection: projection,
    }),
  );
  frameState.camera = camera;
  frameState.cullingVolume = camera.frustum.computeCullingVolume(
    camera.position,
    camera.direction,
    camera.up,
  );

  frameState.verticalExaggeration = 1.0;
  frameState.verticalExaggerationRelativeHeight = 0.0;

  frameState.passes.render = true;
  frameState.passes.pick = false;

  frameState.minimumDisableDepthTestDistance = 0.0;

  frameState.atmosphere = new Atmosphere();

  return frameState;
}
export default createFrameState;
