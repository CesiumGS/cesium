import {
  Cartesian3,
  defaultValue,
  defined,
  GeographicProjection,
  Matrix4,
  Camera,
} from "@cesium/engine";

function MockScene(canvas) {
  canvas = defaultValue(canvas, {
    clientWidth: 512,
    clientHeight: 384,
  });

  this.canvas = canvas;
  this.drawingBufferWidth = canvas.clientWidth * 2;
  this.drawingBufferHeight = canvas.clientHeight * 2;
  this.mapProjection = new GeographicProjection();
}

function createCamera(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const scene = new MockScene(options.canvas);
  const camera = new Camera(scene);
  camera.frustum.near = defaultValue(options.near, 0.01);
  camera.frustum.far = defaultValue(options.far, 10.0);

  const offset = defaultValue(options.offset, new Cartesian3(-1.0, 0.0, 0.0));

  if (defined(options.target)) {
    camera.lookAt(options.target, offset);
  } else if (defined(options.transform)) {
    camera.lookAtTransform(options.transform, offset);
  } else {
    camera.lookAtTransform(Matrix4.IDENTITY, offset);
  }

  return camera;
}
export default createCamera;
