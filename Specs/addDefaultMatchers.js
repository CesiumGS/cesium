import equals from "./equals.js";
import { Cartesian2 } from "../Source/Cesium.js";
import { defaultValue } from "../Source/Cesium.js";
import { defined } from "../Source/Cesium.js";
import { DeveloperError } from "../Source/Cesium.js";
import { FeatureDetection } from "../Source/Cesium.js";
import { Math as CesiumMath } from "../Source/Cesium.js";
import { PrimitiveType } from "../Source/Cesium.js";
import { RuntimeError } from "../Source/Cesium.js";
import { Buffer } from "../Source/Cesium.js";
import { BufferUsage } from "../Source/Cesium.js";
import { ClearCommand } from "../Source/Cesium.js";
import { DrawCommand } from "../Source/Cesium.js";
import { ShaderProgram } from "../Source/Cesium.js";
import { VertexArray } from "../Source/Cesium.js";

function createMissingFunctionMessageFunction(
  item,
  actualPrototype,
  expectedInterfacePrototype
) {
  return function () {
    return (
      "Expected function '" +
      item +
      "' to exist on " +
      actualPrototype.constructor.name +
      " because it should implement interface " +
      expectedInterfacePrototype.constructor.name +
      "."
    );
  };
}

function makeThrowFunction(debug, Type, name) {
  if (debug) {
    return function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          // based on the built-in Jasmine toThrow matcher
          let result = false;
          let exception;

          if (typeof actual !== "function") {
            throw new Error("Actual is not a function");
          }

          try {
            actual();
          } catch (e) {
            exception = e;
          }

          if (exception) {
            result = exception instanceof Type;
          }

          let message;
          if (result) {
            message = [
              "Expected function not to throw " + name + " , but it threw",
              exception.message || exception,
            ].join(" ");
          } else {
            message = "Expected function to throw " + name + ".";
          }

          return {
            pass: result,
            message: message,
          };
        },
      };
    };
  }

  return function () {
    return {
      compare: function (actual, expected) {
        return { pass: true };
      },
      negativeCompare: function (actual, expected) {
        return { pass: true };
      },
    };
  };
}

function createDefaultMatchers(debug) {
  return {
    toBeGreaterThanOrEqualTo: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return { pass: actual >= expected };
        },
      };
    },

    toBeLessThanOrEqualTo: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return { pass: actual <= expected };
        },
      };
    },

    toBeBetween: function (util, customEqualityTesters) {
      return {
        compare: function (actual, lower, upper) {
          if (lower > upper) {
            const tmp = upper;
            upper = lower;
            lower = tmp;
          }
          return { pass: actual >= lower && actual <= upper };
        },
      };
    },

    toStartWith: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return { pass: actual.slice(0, expected.length) === expected };
        },
      };
    },

    toEndWith: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return { pass: actual.slice(-expected.length) === expected };
        },
      };
    },

    toEqual: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return {
            pass: equals(util, customEqualityTesters, actual, expected),
          };
        },
      };
    },

    toEqualEpsilon: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected, epsilon) {
          function equalityTester(a, b) {
            if (Array.isArray(a) && Array.isArray(b)) {
              if (a.length !== b.length) {
                return false;
              }

              for (let i = 0; i < a.length; ++i) {
                if (!equalityTester(a[i], b[i])) {
                  return false;
                }
              }

              return true;
            }

            let to_run;
            if (defined(a)) {
              if (typeof a.equalsEpsilon === "function") {
                return a.equalsEpsilon(b, epsilon);
              } else if (a instanceof Object) {
                // Check if the current object has a static function named 'equalsEpsilon'
                to_run = Object.getPrototypeOf(a).constructor.equalsEpsilon;
                if (typeof to_run === "function") {
                  return to_run(a, b, epsilon);
                }
              }
            }

            if (defined(b)) {
              if (typeof b.equalsEpsilon === "function") {
                return b.equalsEpsilon(a, epsilon);
              } else if (b instanceof Object) {
                // Check if the current object has a static function named 'equalsEpsilon'
                to_run = Object.getPrototypeOf(b).constructor.equalsEpsilon;
                if (typeof to_run === "function") {
                  return to_run(b, a, epsilon);
                }
              }
            }

            if (typeof a === "number" || typeof b === "number") {
              return Math.abs(a - b) <= epsilon;
            }

            return undefined;
          }

          const result = equals(util, [equalityTester], actual, expected);

          return { pass: result };
        },
      };
    },

    toConformToInterface: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expectedInterface) {
          // All function properties on the prototype should also exist on the actual's prototype.
          const actualPrototype = actual.prototype;
          const expectedInterfacePrototype = expectedInterface.prototype;

          for (const item in expectedInterfacePrototype) {
            if (
              expectedInterfacePrototype.hasOwnProperty(item) &&
              typeof expectedInterfacePrototype[item] === "function" &&
              !actualPrototype.hasOwnProperty(item)
            ) {
              return {
                pass: false,
                message: createMissingFunctionMessageFunction(
                  item,
                  actualPrototype,
                  expectedInterfacePrototype
                ),
              };
            }
          }

          return { pass: true };
        },
      };
    },

    toBeInstanceOf: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expectedConstructor) {
          const result = {};
          if (expectedConstructor === String) {
            result.pass =
              typeof actual === "string" || actual instanceof String;
          } else if (expectedConstructor === Number) {
            result.pass =
              typeof actual === "number" || actual instanceof Number;
          } else if (expectedConstructor === Function) {
            result.pass =
              typeof actual === "function" || actual instanceof Function;
          } else if (expectedConstructor === Object) {
            result.pass = actual !== null && typeof actual === "object";
          } else if (expectedConstructor === Boolean) {
            result.pass = typeof actual === "boolean";
          } else {
            result.pass = actual instanceof expectedConstructor;
          }
          result.message =
            "Expected " +
            Object.prototype.toString.call(actual) +
            " to be instance of " +
            expectedConstructor.name +
            ", but was instance of " +
            (actual && actual.constructor.name);
          return result;
        },
      };
    },

    toRender: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return renderEquals(
            util,
            customEqualityTesters,
            actual,
            expected,
            true
          );
        },
      };
    },

    notToRender: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return renderEquals(
            util,
            customEqualityTesters,
            actual,
            expected,
            false
          );
        },
      };
    },

    toRenderAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          const actualRgba = renderAndReadPixels(actual);

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(actualRgba);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toRenderPixelCountAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          const actualRgba = renderAndReadPixels(actual);

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(countRenderedPixels(actualRgba));
          }

          return {
            pass: true,
          };
        },
      };
    },

    toPickPrimitive: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected, x, y, width, height) {
          return pickPrimitiveEquals(actual, expected, x, y, width, height);
        },
      };
    },

    notToPick: function (util, customEqualityTesters) {
      return {
        compare: function (actual, x, y, width, height) {
          return pickPrimitiveEquals(actual, undefined, x, y, width, height);
        },
      };
    },

    toDrillPickPrimitive: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected, x, y, width, height) {
          return drillPickPrimitiveEquals(actual, 1, x, y, width, height);
        },
      };
    },

    notToDrillPick: function (util, customEqualityTesters) {
      return {
        compare: function (actual, x, y, width, height) {
          return drillPickPrimitiveEquals(actual, 0, x, y, width, height);
        },
      };
    },

    toPickAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected, args) {
          const scene = actual;
          const result = scene.pick(defaultValue(args, new Cartesian2(0, 0)));

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(result);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toDrillPickAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected, limit) {
          const scene = actual;
          const pickedObjects = scene.drillPick(new Cartesian2(0, 0), limit);

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(pickedObjects);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toPickFromRayAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected, ray, objectsToExclude, width) {
          const scene = actual;
          const result = scene.pickFromRay(ray, objectsToExclude, width);

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(result);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toDrillPickFromRayAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (
          actual,
          expected,
          ray,
          limit,
          objectsToExclude,
          width
        ) {
          const scene = actual;
          const results = scene.drillPickFromRay(
            ray,
            limit,
            objectsToExclude,
            width
          );

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(results);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toSampleHeightAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (
          actual,
          expected,
          position,
          objectsToExclude,
          width
        ) {
          const scene = actual;
          const results = scene.sampleHeight(position, objectsToExclude, width);

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(results);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toClampToHeightAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (
          actual,
          expected,
          cartesian,
          objectsToExclude,
          width
        ) {
          const scene = actual;
          const results = scene.clampToHeight(
            cartesian,
            objectsToExclude,
            width
          );

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(results);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toPickPositionAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected, x, y) {
          const scene = actual;
          const canvas = scene.canvas;
          x = defaultValue(x, canvas.clientWidth / 2);
          y = defaultValue(y, canvas.clientHeight / 2);
          const result = scene.pickPosition(new Cartesian2(x, y));

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(result);
          }

          return {
            pass: true,
          };
        },
      };
    },

    toReadPixels: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          let context;
          let framebuffer;
          let epsilon = 0;

          const options = actual;
          if (defined(options.context)) {
            // options were passed to to a framebuffer
            context = options.context;
            framebuffer = options.framebuffer;
            epsilon = defaultValue(options.epsilon, epsilon);
          } else {
            context = options;
          }

          const rgba = context.readPixels({
            framebuffer: framebuffer,
          });

          let pass = true;
          let message;

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            if (
              !CesiumMath.equalsEpsilon(rgba[0], expected[0], 0, epsilon) ||
              !CesiumMath.equalsEpsilon(rgba[1], expected[1], 0, epsilon) ||
              !CesiumMath.equalsEpsilon(rgba[2], expected[2], 0, epsilon) ||
              !CesiumMath.equalsEpsilon(rgba[3], expected[3], 0, epsilon)
            ) {
              pass = false;
              if (epsilon === 0) {
                message =
                  "Expected context to render " +
                  expected +
                  ", but rendered: " +
                  rgba;
              } else {
                message =
                  "Expected context to render " +
                  expected +
                  " with epsilon = " +
                  epsilon +
                  ", but rendered: " +
                  rgba;
              }
            }
          }

          return {
            pass: pass,
            message: message,
          };
        },
      };
    },

    notToReadPixels: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          const context = actual;
          const rgba = context.readPixels();

          let pass = true;
          let message;

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            if (
              rgba[0] === expected[0] &&
              rgba[1] === expected[1] &&
              rgba[2] === expected[2] &&
              rgba[3] === expected[3]
            ) {
              pass = false;
              message =
                "Expected context not to render " +
                expected +
                ", but rendered: " +
                rgba;
            }
          }

          return {
            pass: pass,
            message: message,
          };
        },
      };
    },

    contextToRenderAndCall: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          const actualRgba = contextRenderAndReadPixels(actual).color;

          const webglStub = !!window.webglStub;
          if (!webglStub) {
            // The callback may have expectations that fail, which still makes the
            // spec fail, as we desired, even though this matcher sets pass to true.
            const callback = expected;
            callback(actualRgba);
          }

          return {
            pass: true,
          };
        },
      };
    },

    contextToRender: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return expectContextToRender(actual, expected, true);
        },
      };
    },

    notContextToRender: function (util, customEqualityTesters) {
      return {
        compare: function (actual, expected) {
          return expectContextToRender(actual, expected, false);
        },
      };
    },

    toBeImageOrImageBitmap: function (util, customEqualityTesters) {
      return {
        compare: function (actual) {
          if (typeof createImageBitmap !== "function") {
            return {
              pass: actual instanceof Image,
            };
          }

          return {
            pass: actual instanceof ImageBitmap || actual instanceof Image,
          };
        },
      };
    },
    toThrowDeveloperError: makeThrowFunction(
      debug,
      DeveloperError,
      "DeveloperError"
    ),

    toThrowRuntimeError: makeThrowFunction(true, RuntimeError, "RuntimeError"),

    toThrowSyntaxError: makeThrowFunction(true, SyntaxError, "SyntaxError"),
  };
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
    // options were passed to render the scene at a given time or prime shadow map
    scene = options.scene;
    const time = options.time;

    scene.initializeFrame();
    if (defined(options.primeShadowMap)) {
      scene.render(time); // Computes shadow near/far for next frame
    }
    scene.render(time);
  } else {
    scene = options;
    scene.initializeFrame();
    scene.render();
  }

  return scene.context.readPixels();
}

function isTypedArray(o) {
  return FeatureDetection.typedArrayTypes.some(function (type) {
    return o instanceof type;
  });
}

function typedArrayToArray(array) {
  if (isTypedArray(array)) {
    return Array.prototype.slice.call(array, 0);
  }
  return array;
}

function renderEquals(
  util,
  customEqualityTesters,
  actual,
  expected,
  expectEqual
) {
  const actualRgba = renderAndReadPixels(actual);

  // When the WebGL stub is used, all WebGL function calls are noops so
  // the expectation is not verified.  This allows running all the WebGL
  // tests, to exercise as much Cesium code as possible, even if the system
  // doesn't have a WebGL implementation or a reliable one.
  if (!!window.webglStub) {
    return {
      pass: true,
    };
  }

  const eq = equals(util, customEqualityTesters, actualRgba, expected);
  const pass = expectEqual ? eq : !eq;

  let message;
  if (!pass) {
    message =
      "Expected " +
      (expectEqual ? "" : "not ") +
      "to render [" +
      typedArrayToArray(expected) +
      "], but actually rendered [" +
      typedArrayToArray(actualRgba) +
      "].";
  }

  return {
    pass: pass,
    message: message,
  };
}

function pickPrimitiveEquals(actual, expected, x, y, width, height) {
  const scene = actual;
  const windowPosition = new Cartesian2(x, y);
  const result = scene.pick(windowPosition, width, height);

  if (!!window.webglStub) {
    return {
      pass: true,
    };
  }

  let pass = true;
  let message;

  if (defined(expected)) {
    pass = result.primitive === expected;
  } else {
    pass = !defined(result);
  }

  if (!pass) {
    message = "Expected to pick " + expected + ", but picked: " + result;
  }

  return {
    pass: pass,
    message: message,
  };
}

function drillPickPrimitiveEquals(actual, expected, x, y, width, height) {
  const scene = actual;
  const windowPosition = new Cartesian2(x, y);
  const result = scene.drillPick(windowPosition, undefined, width, height);

  if (!!window.webglStub) {
    return {
      pass: true,
    };
  }

  let pass = true;
  let message;

  if (defined(expected)) {
    pass = result.length === expected;
  } else {
    pass = !defined(result);
  }

  if (!pass) {
    message = "Expected to pick " + expected + ", but picked: " + result;
  }

  return {
    pass: pass,
    message: message,
  };
}

function contextRenderAndReadPixels(options) {
  const context = options.context;
  let vs = options.vertexShader;
  const fs = options.fragmentShader;
  let sp = options.shaderProgram;
  const uniformMap = options.uniformMap;
  const modelMatrix = options.modelMatrix;
  const depth = defaultValue(options.depth, 0.0);
  const clear = defaultValue(options.clear, true);
  let clearColor;

  if (!defined(context)) {
    throw new DeveloperError("options.context is required.");
  }

  if (!defined(fs) && !defined(sp)) {
    throw new DeveloperError(
      "options.fragmentShader or options.shaderProgram is required."
    );
  }

  if (defined(fs) && defined(sp)) {
    throw new DeveloperError(
      "Both options.fragmentShader and options.shaderProgram can not be used at the same time."
    );
  }

  if (defined(vs) && defined(sp)) {
    throw new DeveloperError(
      "Both options.vertexShader and options.shaderProgram can not be used at the same time."
    );
  }

  if (!defined(sp)) {
    if (!defined(vs)) {
      vs =
        "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
    }
    sp = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attributeLocations: {
        position: 0,
      },
    });
  }

  let va = new VertexArray({
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

  sp = sp.destroy();
  va = va.destroy();

  return {
    color: rgba,
    clearColor: clearColor,
  };
}

function expectContextToRender(actual, expected, expectEqual) {
  const options = actual;
  const context = options.context;
  const clear = defaultValue(options.clear, true);
  const epsilon = defaultValue(options.epsilon, 0);

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
          message:
            "After clearing the framebuffer, expected context to render [0, 0, 0, " +
            expectedAlpha +
            "], but rendered: " +
            clearedRgba,
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
          message:
            "Expected context to render " +
            expected +
            ", but rendered: " +
            rgba,
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
        message:
          "Expected context not to render " +
          expected +
          ", but rendered: " +
          rgba,
      };
    }
  }

  return {
    pass: true,
  };
}

function addDefaultMatchers(debug) {
  return function () {
    this.addMatchers(createDefaultMatchers(debug));
  };
}
export default addDefaultMatchers;
