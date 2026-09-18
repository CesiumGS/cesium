import {
  Cartesian2,
  defined,
  DeveloperError,
  PrimitiveType,
  Buffer,
  BufferUsage,
  ClearCommand,
  DrawCommand,
  ShaderProgram,
  VertexArray,
  Math as CesiumMath,
} from "@cesium/engine";
import equals from "./equals.js";

function isTypedArray(o) {
  return ArrayBuffer.isView(o) && !(o instanceof DataView);
}

function typedArrayToArray(array) {
  if (isTypedArray(array)) {
    return Array.prototype.slice.call(array, 0);
  }
  return array;
}

function countRenderedPixels(rgba) {
  const pixelCount = rgba.length / 4;
  let count = 0;
  for (let i = 0; i < pixelCount; i++) {
    const index = i * 4;
    if (
      rgba[index] !== 0 ||
      rgba[index + 1] !== 0 ||
      rgba[index + 2] !== 0 ||
      rgba[index + 3] !== 255
    ) {
      count++;
    }
  }
  return count;
}

function renderAndReadPixels(options) {
  let scene;

  if (defined(options.scene)) {
    scene = options.scene;
    const time = options.time;
    scene.initializeFrame();
    if (defined(options.primeShadowMap)) {
      scene.render(time);
    }
    scene.render(time);
  } else {
    scene = options;
    scene.initializeFrame();
    scene.render();
  }

  return scene.context.readPixels();
}

function renderEquals(util, actual, expected, expectEqual) {
  const actualRgba = renderAndReadPixels(actual);

  // When the WebGL stub is used, all WebGL function calls are noops so
  // the expectation is not verified.  This allows running all the WebGL
  // tests, to exercise as much Cesium code as possible, even if the system
  // does not have a WebGL implementation or a reliable one.
  if (!!window.webglStub) {
    return { pass: true };
  }

  const eq = equals(util, actualRgba, expected);
  const pass = expectEqual ? eq : !eq;

  let message;
  if (!pass) {
    message = `Expected ${expectEqual ? "" : "not "}to render [${typedArrayToArray(expected)}], but actually rendered [${typedArrayToArray(actualRgba)}].`;
  }

  return { pass: pass, message: message };
}

function pickPrimitiveEquals(actual, expected, x, y, width, height) {
  const scene = actual;
  const windowPosition = new Cartesian2(x, y);
  const result = scene.pick(windowPosition, width, height);

  if (!!window.webglStub) {
    return { pass: true };
  }

  let pass;
  let message;

  if (defined(expected)) {
    pass = result.primitive === expected;
  } else {
    pass = !defined(result);
  }

  if (!pass) {
    message = `Expected to pick ${expected}, but picked: ${result}`;
  }

  return { pass: pass, message: message };
}

function drillPickPrimitiveEquals(actual, expected, x, y, width, height) {
  const scene = actual;
  const windowPosition = new Cartesian2(x, y);
  const result = scene.drillPick(windowPosition, undefined, width, height);

  if (!!window.webglStub) {
    return { pass: true };
  }

  let pass;
  let message;

  if (defined(expected)) {
    pass = result.length === expected;
  } else {
    pass = !defined(result);
  }

  if (!pass) {
    message = `Expected to pick ${expected}, but picked: ${result}`;
  }

  return { pass: pass, message: message };
}

function contextRenderAndReadPixels(options) {
  const context = options.context;
  let vs = options.vertexShader;
  const fs = options.fragmentShader;
  let sp = options.shaderProgram;
  const uniformMap = options.uniformMap;
  const modelMatrix = options.modelMatrix;
  const depth = options.depth ?? 0.0;
  const clear = options.clear ?? true;
  let clearColor;

  if (!defined(context)) {
    throw new DeveloperError("options.context is required.");
  }
  if (!defined(fs) && !defined(sp)) {
    throw new DeveloperError(
      "options.fragmentShader or options.shaderProgram is required.",
    );
  }
  if (defined(fs) && defined(sp)) {
    throw new DeveloperError(
      "Both options.fragmentShader and options.shaderProgram can not be used at the same time.",
    );
  }
  if (defined(vs) && defined(sp)) {
    throw new DeveloperError(
      "Both options.vertexShader and options.shaderProgram can not be used at the same time.",
    );
  }

  if (!defined(sp)) {
    if (!defined(vs)) {
      vs =
        "in vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
    }
    sp = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attributeLocations: { position: 0 },
    });
  }

  const va = new VertexArray({
    context: context,
    attributes: [
      {
        index: 0,
        vertexBuffer: Buffer.createVertexBuffer({
          context: context,
          typedArray: new Float32Array([0.0, 0.0, depth, 1.0]),
          usage: BufferUsage.STATIC_DRAW,
        }),
        componentsPerAttribute: 4,
      },
    ],
  });

  if (clear) {
    ClearCommand.ALL.execute(context);
    clearColor = context.readPixels();
  }

  const command = new DrawCommand({
    primitiveType: PrimitiveType.POINTS,
    shaderProgram: sp,
    vertexArray: va,
    uniformMap: uniformMap,
    modelMatrix: modelMatrix,
  });

  command.execute(context);
  const rgba = context.readPixels();

  sp.destroy();
  va.destroy();

  return { color: rgba, clearColor: clearColor };
}

function expectContextToRender(actual, expected, expectEqual) {
  const options = actual;
  const context = options.context;
  const clear = options.clear ?? true;
  const epsilon = options.epsilon ?? 0;

  if (!defined(expected)) {
    expected = [255, 255, 255, 255];
  }

  const webglStub = !!window.webglStub;
  const output = contextRenderAndReadPixels(options);

  if (clear) {
    const clearedRgba = output.clearColor;
    if (!webglStub) {
      const expectedAlpha = context.options.webgl.alpha ? 0 : 255;
      if (
        clearedRgba[0] !== 0 ||
        clearedRgba[1] !== 0 ||
        clearedRgba[2] !== 0 ||
        clearedRgba[3] !== expectedAlpha
      ) {
        return {
          pass: false,
          message: `After clearing the framebuffer, expected context to render [0, 0, 0, ${expectedAlpha}], but rendered: ${clearedRgba}`,
        };
      }
    }
  }

  const rgba = output.color;

  if (!webglStub) {
    if (expectEqual) {
      if (
        !CesiumMath.equalsEpsilon(rgba[0], expected[0], 0, epsilon) ||
        !CesiumMath.equalsEpsilon(rgba[1], expected[1], 0, epsilon) ||
        !CesiumMath.equalsEpsilon(rgba[2], expected[2], 0, epsilon) ||
        !CesiumMath.equalsEpsilon(rgba[3], expected[3], 0, epsilon)
      ) {
        return {
          pass: false,
          message: `Expected context to render ${expected}, but rendered: ${rgba}`,
        };
      }
    } else if (
      CesiumMath.equalsEpsilon(rgba[0], expected[0], 0, epsilon) &&
      CesiumMath.equalsEpsilon(rgba[1], expected[1], 0, epsilon) &&
      CesiumMath.equalsEpsilon(rgba[2], expected[2], 0, epsilon) &&
      CesiumMath.equalsEpsilon(rgba[3], expected[3], 0, epsilon)
    ) {
      return {
        pass: false,
        message: `Expected context not to render ${expected}, but rendered: ${rgba}`,
      };
    }
  }

  return { pass: true };
}

export function createRendererMatchers() {
  return {
    toRender: function (util) {
      return {
        compare: function (actual, expected) {
          return renderEquals(util, actual, expected, true);
        },
      };
    },
    notToRender: function (util) {
      return {
        compare: function (actual, expected) {
          return renderEquals(util, actual, expected, false);
        },
      };
    },
    toRenderAndCall: function (util) {
      return {
        compare: function (actual, expected) {
          const actualRgba = renderAndReadPixels(actual);
          if (!window.webglStub) {
            expected(actualRgba);
          }
          return { pass: true };
        },
      };
    },
    toRenderPixelCountAndCall: function (util) {
      return {
        compare: function (actual, expected) {
          const actualRgba = renderAndReadPixels(actual);
          if (!window.webglStub) {
            expected(countRenderedPixels(actualRgba));
          }
          return { pass: true };
        },
      };
    },
    toPickPrimitive: function (util) {
      return {
        compare: function (actual, expected, x, y, width, height) {
          return pickPrimitiveEquals(actual, expected, x, y, width, height);
        },
      };
    },
    notToPick: function (util) {
      return {
        compare: function (actual, x, y, width, height) {
          return pickPrimitiveEquals(actual, undefined, x, y, width, height);
        },
      };
    },
    toDrillPickPrimitive: function (util) {
      return {
        compare: function (actual, expected, x, y, width, height) {
          return drillPickPrimitiveEquals(actual, 1, x, y, width, height);
        },
      };
    },
    notToDrillPick: function (util) {
      return {
        compare: function (actual, x, y, width, height) {
          return drillPickPrimitiveEquals(actual, 0, x, y, width, height);
        },
      };
    },
    toPickAndCall: function (util) {
      return {
        compare: function (actual, expected, args) {
          const result = actual.pick(args ?? new Cartesian2(0, 0));
          if (!window.webglStub) {
            expected(result);
          }
          return { pass: true };
        },
      };
    },
    toSnapAndCall: function (util) {
      return {
        compare: function (actual, expected, args) {
          const result = actual.snap(args ?? new Cartesian2(0, 0));
          if (!window.webglStub) {
            expected(result);
          }
          return { pass: true };
        },
      };
    },
    toPickVoxelAndCall: function (util) {
      return {
        compare: function (actual, expected, args) {
          const result = actual.pickVoxel(args ?? new Cartesian2(0, 0));
          if (!window.webglStub) {
            expected(result);
          }
          return { pass: true };
        },
      };
    },
    toDrillPickAndCall: function (util) {
      return {
        compare: function (actual, expected, limit) {
          const pickedObjects = actual.drillPick(new Cartesian2(0, 0), limit);
          if (!window.webglStub) {
            expected(pickedObjects);
          }
          return { pass: true };
        },
      };
    },
    toPickFromRayAndCall: function (util) {
      return {
        compare: function (actual, expected, ray, objectsToExclude, width) {
          const result = actual.pickFromRay(ray, objectsToExclude, width);
          if (!window.webglStub) {
            expected(result);
          }
          return { pass: true };
        },
      };
    },
    toDrillPickFromRayAndCall: function (util) {
      return {
        compare: function (
          actual,
          expected,
          ray,
          limit,
          objectsToExclude,
          width,
        ) {
          const results = actual.drillPickFromRay(
            ray,
            limit,
            objectsToExclude,
            width,
          );
          if (!window.webglStub) {
            expected(results);
          }
          return { pass: true };
        },
      };
    },
    toSampleHeightAndCall: function (util) {
      return {
        compare: function (
          actual,
          expected,
          position,
          objectsToExclude,
          width,
        ) {
          const results = actual.sampleHeight(
            position,
            objectsToExclude,
            width,
          );
          if (!window.webglStub) {
            expected(results);
          }
          return { pass: true };
        },
      };
    },
    toClampToHeightAndCall: function (util) {
      return {
        compare: function (
          actual,
          expected,
          cartesian,
          objectsToExclude,
          width,
        ) {
          const results = actual.clampToHeight(
            cartesian,
            objectsToExclude,
            width,
          );
          if (!window.webglStub) {
            expected(results);
          }
          return { pass: true };
        },
      };
    },
    toPickPositionAndCall: function (util) {
      return {
        compare: function (actual, expected, x, y) {
          const canvas = actual.canvas;
          x = x ?? canvas.clientWidth / 2;
          y = y ?? canvas.clientHeight / 2;
          const result = actual.pickPosition(new Cartesian2(x, y));
          if (!window.webglStub) {
            expected(result);
          }
          return { pass: true };
        },
      };
    },
    toReadPixels: function (util) {
      return {
        compare: function (actual, expected) {
          let context;
          let framebuffer;
          let epsilon = 0;
          const options = actual;
          if (defined(options.context)) {
            context = options.context;
            framebuffer = options.framebuffer;
            epsilon = options.epsilon ?? epsilon;
          } else {
            context = options;
          }
          const rgba = context.readPixels({ framebuffer: framebuffer });
          let pass = true;
          let message;
          if (!window.webglStub) {
            if (
              !CesiumMath.equalsEpsilon(rgba[0], expected[0], 0, epsilon) ||
              !CesiumMath.equalsEpsilon(rgba[1], expected[1], 0, epsilon) ||
              !CesiumMath.equalsEpsilon(rgba[2], expected[2], 0, epsilon) ||
              !CesiumMath.equalsEpsilon(rgba[3], expected[3], 0, epsilon)
            ) {
              pass = false;
              message =
                epsilon === 0
                  ? `Expected context to render ${expected}, but rendered: ${rgba}`
                  : `Expected context to render ${expected} with epsilon = ${epsilon}, but rendered: ${rgba}`;
            }
          }
          return { pass: pass, message: message };
        },
      };
    },
    notToReadPixels: function (util) {
      return {
        compare: function (actual, expected) {
          const rgba = actual.readPixels();
          let pass = true;
          let message;
          if (!window.webglStub) {
            if (
              rgba[0] === expected[0] &&
              rgba[1] === expected[1] &&
              rgba[2] === expected[2] &&
              rgba[3] === expected[3]
            ) {
              pass = false;
              message = `Expected context not to render ${expected}, but rendered: ${rgba}`;
            }
          }
          return { pass: pass, message: message };
        },
      };
    },
    contextToRenderAndCall: function (util) {
      return {
        compare: function (actual, expected) {
          const actualRgba = contextRenderAndReadPixels(actual).color;
          if (!window.webglStub) {
            expected(actualRgba);
          }
          return { pass: true };
        },
      };
    },
    contextToRender: function (util) {
      return {
        compare: function (actual, expected) {
          return expectContextToRender(actual, expected, true);
        },
      };
    },
    notContextToRender: function (util) {
      return {
        compare: function (actual, expected) {
          return expectContextToRender(actual, expected, false);
        },
      };
    },
  };
}
