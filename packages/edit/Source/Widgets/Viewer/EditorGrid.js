// @ts-check

import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Check,
  Color,
  ComponentDatatype,
  Ellipsoid,
  FixedFrameTransforms,
  Matrix4,
  PrimitiveType,
  defined,
  destroyObject,
} from "@cesium/core";
import {
  BlendingState,
  Buffer,
  BufferUsage,
  DrawCommand,
  Pass,
  RenderState,
  SceneMode,
  ShaderProgram,
  VertexArray,
} from "@cesium/engine";
import EditorGridFS from "../../Shaders/EditorGridFS.js";
import EditorGridVS from "../../Shaders/EditorGridVS.js";

/** @import { Context, FrameState } from "@cesium/engine"; */

/**
 * How far the grid extends from the camera, as a multiple of the camera's
 * distance from the grid's plane.
 *
 * @ignore
 */
const FADE_DISTANCE_SCALE = 40.0;

// Depth-tested, so geometry in front of the grid hides it.
const RENDER_STATE_OPTIONS = {
  blending: BlendingState.ALPHA_BLEND,
  depthTest: { enabled: true },
  depthMask: false,
};

const ATTRIBUTE_LOCATIONS = { position: 0 };

const scratchCameraPosition = new Cartesian3();
const scratchCenter = new Cartesian3();

/**
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorGridOptions
 * @property {boolean} [show=true] Whether to draw the grid.
 * @property {Cartesian3} origin The grid's origin. The grid lies in the plane tangent to the ellipsoid at the origin's geodetic position, at the origin's height, with its x axis pointing east and its y axis north.
 * @property {number} [spacing=1.0] The finest lines' spacing, in meters.
 * @property {number} [subdivisions=10] How many cells of each level of lines make up one cell of the next coarser level.
 * @property {Color} [lineColor] The color of the lines.
 * @property {Color} [xAxisColor] The color of the line along the x (east) axis.
 * @property {Color} [yAxisColor] The color of the line along the y (north) axis.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid the grid's plane is tangent to.
 */

/**
 * An "infinite" reference grid on the ground plane, for reference in editing workflows.
 *
 * @alias EditorGrid
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {EditorGridOptions} options The grid's options.
 *
 * @example
 * const origin = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 100.0);
 * const grid = scene.primitives.add(new Cesium.EditorGrid({ origin }));
 * grid.spacing = 0.5;
 */
class EditorGrid {
  /** @type {Ellipsoid} */
  #ellipsoid;

  /**
   * The grid's transformation to world space, with x east, y north and z up.
   * Its translation is the grid's origin.
   */
  #modelMatrix = new Matrix4();

  /**
   * The inverse of the model matrix, from world space to the grid's.
   */
  #inverseModelMatrix = new Matrix4();

  /**
   * The camera's position in the grid plane's coordinate system.
   * The center of the area the grid covers.
   */
  #cameraPosition2D = new Cartesian2();

  /**
   * The distance from the camera at which the grid has faded out, in meters.
   */
  #extent = 0.0;

  #boundingVolume = new BoundingSphere();

  /** @type {DrawCommand|undefined} */
  #command;

  /** @type {ShaderProgram|undefined} */
  #shaderProgram;

  /** @type {VertexArray|undefined} */
  #vertexArray;

  /**
   * @param {EditorGridOptions} options
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    //>>includeEnd('debug');

    // The origin setter computes the model matrix from the ellipsoid.
    this.#ellipsoid = options.ellipsoid ?? Ellipsoid.default;
    this.origin = options.origin;

    /**
     * Whether to draw the grid.
     *
     * @type {boolean}
     * @default true
     */
    this.show = options.show ?? true;

    /**
     * The finest lines' spacing, in meters.
     *
     * @type {number}
     * @default 1.0
     */
    this.spacing = options.spacing ?? 1.0;

    /**
     * How many cells of each level of lines make up one cell of the next
     * coarser level.
     *
     * @type {number}
     * @default 10
     */
    this.subdivisions = options.subdivisions ?? 10;

    /**
     * The color of the lines.
     *
     * @type {Color}
     */
    this.lineColor = Color.clone(
      options.lineColor ?? new Color(0.5, 0.5, 0.5, 0.5),
    );

    /**
     * The color of the line along the x (east) axis.
     *
     * @type {Color}
     */
    this.xAxisColor = Color.clone(
      options.xAxisColor ?? new Color(1.0, 0.2, 0.32, 1.0),
    );

    /**
     * The color of the line along the y (north) axis.
     *
     * @type {Color}
     */
    this.yAxisColor = Color.clone(
      options.yAxisColor ?? new Color(0.55, 0.86, 0.0, 1.0),
    );
  }

  /**
   * The grid's origin. The grid lies in the plane tangent to the ellipsoid
   * at the origin's geodetic position, at the origin's height, with its x
   * axis pointing east and its y axis north.
   * <p>
   * The grid copies the assigned value, and returns a copy. To move the
   * grid, assign a new origin.
   * </p>
   *
   * @type {Cartesian3}
   */
  get origin() {
    return Matrix4.getTranslation(this.#modelMatrix, new Cartesian3());
  }

  set origin(value) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("origin", value);
    //>>includeEnd('debug');

    FixedFrameTransforms.eastNorthUpToFixedFrame(
      value,
      this.#ellipsoid,
      this.#modelMatrix,
    );
    Matrix4.inverseTransformation(this.#modelMatrix, this.#inverseModelMatrix);
  }

  /**
   * The ellipsoid the grid's plane is tangent to.
   *
   * @type {Ellipsoid}
   * @readonly
   */
  get ellipsoid() {
    return this.#ellipsoid;
  }

  /**
   * Called when rendering the scene to add the grid's draw command.
   * <p>
   * Do not call this function directly.
   * </p>
   *
   * @param {FrameState} frameState The frame state.
   * @private
   */
  update(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThan("spacing", this.spacing, 0.0);
    Check.typeOf.number.greaterThan("subdivisions", this.subdivisions, 1.0);
    //>>includeEnd('debug');

    if (!this.#shouldDraw(frameState)) {
      return;
    }

    this.#updateExtent(frameState);
    this.#command ??= this.#createCommand(frameState.context);
    frameState.commandList.push(this.#command);
  }

  /**
   * Whether to draw the grid this pass: it's shown, and this is a render
   * pass in 3D. Without a pick ID, the command would draw its colors into the
   * pick pass's framebuffer, which reads them as pick IDs.
   *
   * @param {FrameState} frameState The frame state.
   * @returns {boolean}
   * @ignore
   */
  #shouldDraw(frameState) {
    return (
      this.show &&
      frameState.passes.render &&
      frameState.mode === SceneMode.SCENE3D
    );
  }

  /**
   * Centers the area the grid covers below the camera, and sizes it with the
   * camera's distance from the plane, so the grid looks infinite.
   *
   * @param {FrameState} frameState The frame state.
   * @ignore
   */
  #updateExtent(frameState) {
    const cameraPosition = Matrix4.multiplyByPoint(
      this.#inverseModelMatrix,
      frameState.camera.positionWC,
      scratchCameraPosition,
    );
    Cartesian2.fromCartesian3(cameraPosition, this.#cameraPosition2D);

    // Close to the plane, the grid still extends a few of its coarse cells.
    const minimumDistance = this.spacing * this.subdivisions;
    this.#extent =
      Math.max(Math.abs(cameraPosition.z), minimumDistance) *
      FADE_DISTANCE_SCALE;

    const center = Cartesian3.fromElements(
      cameraPosition.x,
      cameraPosition.y,
      0.0,
      scratchCenter,
    );

    Matrix4.multiplyByPoint(
      this.#modelMatrix,
      center,
      this.#boundingVolume.center,
    );

    this.#boundingVolume.radius = this.#extent * Math.SQRT2;
  }

  /**
   * @param {Context} context The context to create GPU resources in.
   * @returns {DrawCommand} The grid's draw command.
   * @ignore
   */
  #createCommand(context) {
    this.#vertexArray = new VertexArray({
      context,
      attributes: [
        {
          index: ATTRIBUTE_LOCATIONS.position,
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          vertexBuffer: Buffer.createVertexBuffer({
            context,
            typedArray: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            usage: BufferUsage.STATIC_DRAW,
          }),
        },
      ],
    });

    this.#shaderProgram = ShaderProgram.fromCache({
      context,
      vertexShaderSource: EditorGridVS,
      fragmentShaderSource: EditorGridFS,
      attributeLocations: ATTRIBUTE_LOCATIONS,
    });

    return new DrawCommand({
      vertexArray: this.#vertexArray,
      shaderProgram: this.#shaderProgram,
      renderState: RenderState.fromCache(RENDER_STATE_OPTIONS),
      uniformMap: {
        u_spacing: () => this.spacing,
        u_subdivisions: () => this.subdivisions,
        u_lineColor: () => this.lineColor,
        u_xAxisColor: () => this.xAxisColor,
        u_yAxisColor: () => this.yAxisColor,
        u_cameraPosition: () => this.#cameraPosition2D,
        u_extent: () => this.#extent,
      },
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
      modelMatrix: this.#modelMatrix,
      boundingVolume: this.#boundingVolume,
      pass: Pass.TRANSLUCENT,
      owner: this,
    });
  }

  /**
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Frees the grid's resources. Removing the grid from the scene's
   * primitives, or destroying the scene, calls this.
   *
   * @returns {void}
   */
  destroy() {
    this.#vertexArray?.destroy();
    this.#shaderProgram?.destroy();
    if (defined(this.#command)) {
      RenderState.removeFromCache(RENDER_STATE_OPTIONS);
    }
    return destroyObject(this);
  }
}

export default EditorGrid;
