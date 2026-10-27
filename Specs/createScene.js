import {
  Cartesian2,
  Clock,
  ClockStep,
  clone,
  defined,
  JulianDate,
} from "@cesium/core";
import { Scene } from "@cesium/engine";
import createCanvas from "./createCanvas.js";
import getWebGLStub from "./getWebGLStub.js";

function createScene(options) {
  options = options ?? {};

  // Render tests can be difficult to debug. Let the caller choose a larger
  // canvas size temporarily. By stepping through a render test, you can see
  // what the camera sees after each render call.
  const debugWidth = window.debugCanvasWidth;
  const debugHeight = window.debugCanvasHeight ?? window.debugCanvasWidth;

  // save the canvas so we don't try to clone an HTMLCanvasElement
  const canvas = defined(options.canvas)
    ? options.canvas
    : createCanvas(debugWidth, debugHeight);
  options.canvas = undefined;

  options = clone(options, true);

  options.canvas = canvas;
  options.contextOptions = options.contextOptions ?? {};

  const contextOptions = options.contextOptions;
  contextOptions.webgl = contextOptions.webgl ?? {};
  contextOptions.webgl.antialias = contextOptions.webgl.antialias ?? false;
  contextOptions.webgl.stencil = contextOptions.webgl.stencil ?? true;
  if (!!window.webglStub) {
    contextOptions.getWebGLStub = getWebGLStub;
  }

  const scene = new Scene(options);
  scene.highDynamicRange = false;

  if (
    scene.context.drawingBufferWidth <= 2 ||
    scene.context.drawingBufferHeight <= 2
  ) {
    scene.msaaSamples = 1;
  }

  if (!!window.webglValidation) {
    const context = scene.context;
    context.validateShaderProgram = true;
    context.validateFramebuffer = true;
    context.logShaderCompilation = true;
    context.throwOnWebGLError = true;
  }

  // Add functions for test
  scene.destroyForSpecs = function () {
    const canvas = this.canvas;
    this.destroy();
    document.body.removeChild(canvas);
  };

  // Starts at a fixed time and advances one 60 fps frame per render, so
  // time-dependent results such as the sun direction do not depend on when
  // the specs run.
  const clock = new Clock({
    currentTime: new JulianDate(2457522.154792),
    clockStep: ClockStep.TICK_DEPENDENT,
    multiplier: 1.0 / 60.0,
    shouldAnimate: true,
  });
  scene.renderForSpecs = function (time) {
    this.initializeFrame();
    this.render(time ?? clock.currentTime);
    clock.tick();
  };

  scene.pickForSpecs = function () {
    this.pick(new Cartesian2(0, 0));
  };

  scene.rethrowRenderErrors = options.rethrowRenderErrors ?? true;

  return scene;
}
export default createScene;
