import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import EllipsoidGeometry from "../Core/EllipsoidGeometry.js";
import EllipsoidOutlineGeometry from "../Core/EllipsoidOutlineGeometry.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import GeometryOffsetAttribute from "../Core/GeometryOffsetAttribute.js";
import Iso8601 from "../Core/Iso8601.js";
import Matrix4 from "../Core/Matrix4.js";
import OffsetGeometryInstanceAttribute from "../Core/OffsetGeometryInstanceAttribute.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import HeightReference from "../Scene/HeightReference.js";
import MaterialAppearance from "../Scene/MaterialAppearance.js";
import PerInstanceColorAppearance from "../Scene/PerInstanceColorAppearance.js";
import Primitive from "../Scene/Primitive.js";
import SceneMode from "../Scene/SceneMode.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import DynamicGeometryUpdater from "./DynamicGeometryUpdater.js";
import GeometryUpdater from "./GeometryUpdater.js";
import heightReferenceOnEntityPropertyChanged from "./heightReferenceOnEntityPropertyChanged.js";
import MaterialProperty from "./MaterialProperty.js";
import Property from "./Property.js";

const defaultMaterial = new ColorMaterialProperty(Color.WHITE);
const defaultOffset = Cartesian3.ZERO;

const offsetScratch = new Cartesian3();
const radiiScratch = new Cartesian3();
const innerRadiiScratch = new Cartesian3();
const scratchColor = new Color();
const unitSphere = new Cartesian3(1, 1, 1);

function EllipsoidGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.radii = undefined;
  this.innerRadii = undefined;
  this.minimumClock = undefined;
  this.maximumClock = undefined;
  this.minimumCone = undefined;
  this.maximumCone = undefined;
  this.stackPartitions = undefined;
  this.slicePartitions = undefined;
  this.subdivisions = undefined;
  this.offsetAttribute = undefined;
}

/**
 * A {@link GeometryUpdater} for ellipsoids.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias EllipsoidGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function EllipsoidGeometryUpdater(entity, scene) {
  GeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new EllipsoidGeometryOptions(entity),
    geometryPropertyName: "ellipsoid",
    observedPropertyNames: [
      "availability",
      "position",
      "orientation",
      "ellipsoid",
    ],
  });

  this._onEntityPropertyChanged(
    entity,
    "ellipsoid",
    entity.ellipsoid,
    undefined,
  );
}

if (defined(Object.create)) {
  EllipsoidGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
  EllipsoidGeometryUpdater.prototype.constructor = EllipsoidGeometryUpdater;
}

Object.defineProperties(EllipsoidGeometryUpdater.prototype, {
  /**
   * Gets the terrain offset property
   * @type {TerrainOffsetProperty}
   * @memberof EllipsoidGeometryUpdater.prototype
   * @readonly
   * @private
   */
  terrainOffsetProperty: {
    get: function () {
      return this._terrainOffsetProperty;
    },
  },
});

/**
 * Creates the geometry instance which represents the fill of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @param {boolean} [skipModelMatrix=false] Whether to compute a model matrix for the geometry instance
 * @param {Matrix4} [modelMatrixResult] Used to store the result of the model matrix calculation
 * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent a filled geometry.
 */
EllipsoidGeometryUpdater.prototype.createFillGeometryInstance = function (
  time,
  skipModelMatrix,
  modelMatrixResult,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  const entity = this._entity;
  const isAvailable = entity.isAvailable(time);

  let color;
  const show = new ShowGeometryInstanceAttribute(
    isAvailable &&
      entity.isShowing &&
      this._showProperty.getValue(time) &&
      this._fillProperty.getValue(time),
  );
  const distanceDisplayCondition =
    this._distanceDisplayConditionProperty.getValue(time);
  const distanceDisplayConditionAttribute =
    DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
      distanceDisplayCondition,
    );

  const attributes = {
    show: show,
    distanceDisplayCondition: distanceDisplayConditionAttribute,
    color: undefined,
    offset: undefined,
  };

  if (this._materialProperty instanceof ColorMaterialProperty) {
    let currentColor;
    if (
      defined(this._materialProperty.color) &&
      (this._materialProperty.color.isConstant || isAvailable)
    ) {
      currentColor = this._materialProperty.color.getValue(time, scratchColor);
    }
    if (!defined(currentColor)) {
      currentColor = Color.WHITE;
    }
    color = ColorGeometryInstanceAttribute.fromColor(currentColor);
    attributes.color = color;
  }
  if (defined(this._options.offsetAttribute)) {
    attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(
      Property.getValueOrDefault(
        this._terrainOffsetProperty,
        time,
        defaultOffset,
        offsetScratch,
      ),
    );
  }

  return new GeometryInstance({
    id: entity,
    geometry: new EllipsoidGeometry(this._options),
    modelMatrix: skipModelMatrix
      ? undefined
      : entity.computeModelMatrixForHeightReference(
          time,
          entity.ellipsoid.heightReference,
          this._options.radii.z * 0.5,
          this._scene.ellipsoid,
          modelMatrixResult,
        ),
    attributes: attributes,
  });
};

/**
 * Creates the geometry instance which represents the outline of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @param {boolean} [skipModelMatrix=false] Whether to compute a model matrix for the geometry instance
 * @param {Matrix4} [modelMatrixResult] Used to store the result of the model matrix calculation
 * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent an outlined geometry.
 */
EllipsoidGeometryUpdater.prototype.createOutlineGeometryInstance = function (
  time,
  skipModelMatrix,
  modelMatrixResult,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  const entity = this._entity;
  const isAvailable = entity.isAvailable(time);

  const outlineColor = Property.getValueOrDefault(
    this._outlineColorProperty,
    time,
    Color.BLACK,
    scratchColor,
  );
  const distanceDisplayCondition =
    this._distanceDisplayConditionProperty.getValue(time);

  const attributes = {
    show: new ShowGeometryInstanceAttribute(
      isAvailable &&
        entity.isShowing &&
        this._showProperty.getValue(time) &&
        this._showOutlineProperty.getValue(time),
    ),
    color: ColorGeometryInstanceAttribute.fromColor(outlineColor),
    distanceDisplayCondition:
      DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
        distanceDisplayCondition,
      ),
    offset: undefined,
  };
  if (defined(this._options.offsetAttribute)) {
    attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(
      Property.getValueOrDefault(
        this._terrainOffsetProperty,
        time,
        defaultOffset,
        offsetScratch,
      ),
    );
  }

  return new GeometryInstance({
    id: entity,
    geometry: new EllipsoidOutlineGeometry(this._options),
    modelMatrix: skipModelMatrix
      ? undefined
      : entity.computeModelMatrixForHeightReference(
          time,
          entity.ellipsoid.heightReference,
          this._options.radii.z * 0.5,
          this._scene.ellipsoid,
          modelMatrixResult,
        ),
    attributes: attributes,
  });
};

EllipsoidGeometryUpdater.prototype._computeCenter = function (time, result) {
  return Property.getValueOrUndefined(this._entity.position, time, result);
};

EllipsoidGeometryUpdater.prototype._isHidden = function (entity, ellipsoid) {
  return (
    !defined(entity.position) ||
    !defined(ellipsoid.radii) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, ellipsoid)
  );
};

EllipsoidGeometryUpdater.prototype._isDynamic = function (entity, ellipsoid) {
  return (
    !entity.position.isConstant || //
    !Property.isConstant(entity.orientation) || //
    !ellipsoid.radii.isConstant || //
    !Property.isConstant(ellipsoid.innerRadii) || //
    !Property.isConstant(ellipsoid.stackPartitions) || //
    !Property.isConstant(ellipsoid.slicePartitions) || //
    !Property.isConstant(ellipsoid.outlineWidth) || //
    !Property.isConstant(ellipsoid.minimumClock) || //
    !Property.isConstant(ellipsoid.maximumClock) || //
    !Property.isConstant(ellipsoid.minimumCone) || //
    !Property.isConstant(ellipsoid.maximumCone) || //
    !Property.isConstant(ellipsoid.subdivisions)
  );
};

EllipsoidGeometryUpdater.prototype._setStaticOptions = function (
  entity,
  ellipsoid,
) {
  const heightReference = Property.getValueOrDefault(
    ellipsoid.heightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE,
  );
  const options = this._options;
  options.vertexFormat =
    this._materialProperty instanceof ColorMaterialProperty
      ? PerInstanceColorAppearance.VERTEX_FORMAT
      : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
  options.radii = ellipsoid.radii.getValue(
    Iso8601.MINIMUM_VALUE,
    options.radii,
  );
  options.innerRadii = Property.getValueOrUndefined(
    ellipsoid.innerRadii,
    options.radii,
  );
  options.minimumClock = Property.getValueOrUndefined(
    ellipsoid.minimumClock,
    Iso8601.MINIMUM_VALUE,
  );
  options.maximumClock = Property.getValueOrUndefined(
    ellipsoid.maximumClock,
    Iso8601.MINIMUM_VALUE,
  );
  options.minimumCone = Property.getValueOrUndefined(
    ellipsoid.minimumCone,
    Iso8601.MINIMUM_VALUE,
  );
  options.maximumCone = Property.getValueOrUndefined(
    ellipsoid.maximumCone,
    Iso8601.MINIMUM_VALUE,
  );
  options.stackPartitions = Property.getValueOrUndefined(
    ellipsoid.stackPartitions,
    Iso8601.MINIMUM_VALUE,
  );
  options.slicePartitions = Property.getValueOrUndefined(
    ellipsoid.slicePartitions,
    Iso8601.MINIMUM_VALUE,
  );
  options.subdivisions = Property.getValueOrUndefined(
    ellipsoid.subdivisions,
    Iso8601.MINIMUM_VALUE,
  );
  options.offsetAttribute =
    heightReference !== HeightReference.NONE
      ? GeometryOffsetAttribute.ALL
      : undefined;
};

EllipsoidGeometryUpdater.prototype._onEntityPropertyChanged =
  heightReferenceOnEntityPropertyChanged;

EllipsoidGeometryUpdater.DynamicGeometryUpdater =
  DynamicEllipsoidGeometryUpdater;

/**
 * @private
 */
function DynamicEllipsoidGeometryUpdater(
  geometryUpdater,
  primitives,
  groundPrimitives,
) {
  DynamicGeometryUpdater.call(
    this,
    geometryUpdater,
    primitives,
    groundPrimitives,
  );

  this._scene = geometryUpdater._scene;
  this._modelMatrix = new Matrix4();
  this._attributes = undefined;
  this._outlineAttributes = undefined;
  this._lastSceneMode = undefined;
  this._lastShow = undefined;
  this._lastOutlineShow = undefined;
  this._lastOutlineWidth = undefined;
  this._lastOutlineColor = undefined;
  this._lastOffset = new Cartesian3();
  this._material = {};
}

if (defined(Object.create)) {
  DynamicEllipsoidGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype,
  );
  DynamicEllipsoidGeometryUpdater.prototype.constructor =
    DynamicEllipsoidGeometryUpdater;
}

DynamicEllipsoidGeometryUpdater.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  const entity = this._entity;
  const ellipsoid = entity.ellipsoid;
  if (
    !entity.isShowing ||
    !entity.isAvailable(time) ||
    !Property.getValueOrDefault(ellipsoid.show, time, true)
  ) {
    if (defined(this._primitive)) {
      this._primitive.show = false;
    }

    if (defined(this._outlinePrimitive)) {
      this._outlinePrimitive.show = false;
    }
    return;
  }

  const radii = Property.getValueOrUndefined(
    ellipsoid.radii,
    time,
    radiiScratch,
  );
  let modelMatrix = defined(radii)
    ? entity.computeModelMatrixForHeightReference(
        time,
        ellipsoid.heightReference,
        radii.z * 0.5,
        this._scene.ellipsoid,
        this._modelMatrix,
      )
    : undefined;
  if (!defined(modelMatrix) || !defined(radii)) {
    if (defined(this._primitive)) {
      this._primitive.show = false;
    }

    if (defined(this._outlinePrimitive)) {
      this._outlinePrimitive.show = false;
    }
    return;
  }

  //Compute attributes and material.
  const showFill = Property.getValueOrDefault(ellipsoid.fill, time, true);
  const showOutline = Property.getValueOrDefault(
    ellipsoid.outline,
    time,
    false,
  );
  const outlineColor = Property.getValueOrClonedDefault(
    ellipsoid.outlineColor,
    time,
    Color.BLACK,
    scratchColor,
  );
  const material = MaterialProperty.getValue(
    time,
    ellipsoid.material ?? defaultMaterial,
    this._material,
  );

  // Check properties that could trigger a primitive rebuild.
  const innerRadii = Property.getValueOrUndefined(
    ellipsoid.innerRadii,
    time,
    innerRadiiScratch,
  );
  const minimumClock = Property.getValueOrUndefined(
    ellipsoid.minimumClock,
    time,
  );
  const maximumClock = Property.getValueOrUndefined(
    ellipsoid.maximumClock,
    time,
  );
  const minimumCone = Property.getValueOrUndefined(ellipsoid.minimumCone, time);
  const maximumCone = Property.getValueOrUndefined(ellipsoid.maximumCone, time);
  const stackPartitions = Property.getValueOrUndefined(
    ellipsoid.stackPartitions,
    time,
  );
  const slicePartitions = Property.getValueOrUndefined(
    ellipsoid.slicePartitions,
    time,
  );
  const subdivisions = Property.getValueOrUndefined(
    ellipsoid.subdivisions,
    time,
  );
  const outlineWidth = Property.getValueOrDefault(
    ellipsoid.outlineWidth,
    time,
    1.0,
  );
  const heightReference = Property.getValueOrDefault(
    ellipsoid.heightReference,
    time,
    HeightReference.NONE,
  );
  const offsetAttribute =
    heightReference !== HeightReference.NONE
      ? GeometryOffsetAttribute.ALL
      : undefined;

  //In 3D we use a fast path by modifying Primitive.modelMatrix instead of regenerating the primitive every frame.
  //Also check for height reference because this method doesn't work when the height is relative to terrain.
  const sceneMode = this._scene.mode;
  const in3D =
    sceneMode === SceneMode.SCENE3D && heightReference === HeightReference.NONE;

  const options = this._options;

  const shadows = this._geometryUpdater.shadowsProperty.getValue(time);

  const distanceDisplayConditionProperty =
    this._geometryUpdater.distanceDisplayConditionProperty;
  const distanceDisplayCondition =
    distanceDisplayConditionProperty.getValue(time);

  const offset = Property.getValueOrDefault(
    this._geometryUpdater.terrainOffsetProperty,
    time,
    defaultOffset,
    offsetScratch,
  );

  //We only rebuild the primitive if something other than the radii has changed
  //For the radii, we use unit sphere and then deform it with a scale matrix.
  const rebuildPrimitives =
    !in3D ||
    this._lastSceneMode !== sceneMode ||
    !defined(this._primitive) || //
    options.stackPartitions !== stackPartitions ||
    options.slicePartitions !== slicePartitions || //
    (defined(innerRadii) &&
      !Cartesian3.equals(options.innerRadii !== innerRadii)) ||
    options.minimumClock !== minimumClock || //
    options.maximumClock !== maximumClock ||
    options.minimumCone !== minimumCone || //
    options.maximumCone !== maximumCone ||
    options.subdivisions !== subdivisions || //
    this._lastOutlineWidth !== outlineWidth ||
    options.offsetAttribute !== offsetAttribute;

  if (rebuildPrimitives) {
    const primitives = this._primitives;
    primitives.removeAndDestroy(this._primitive);
    primitives.removeAndDestroy(this._outlinePrimitive);
    this._primitive = undefined;
    this._outlinePrimitive = undefined;
    this._lastSceneMode = sceneMode;
    this._lastOutlineWidth = outlineWidth;

    options.stackPartitions = stackPartitions;
    options.slicePartitions = slicePartitions;
    options.subdivisions = subdivisions;
    options.offsetAttribute = offsetAttribute;
    options.radii = Cartesian3.clone(in3D ? unitSphere : radii, options.radii);
    if (defined(innerRadii)) {
      if (in3D) {
        options.innerRadii = Cartesian3.fromElements(
          innerRadii.x / radii.x,
          innerRadii.y / radii.y,
          innerRadii.z / radii.z,
          options.innerRadii,
        );
      } else {
        options.innerRadii = Cartesian3.clone(innerRadii, options.innerRadii);
      }
    } else {
      options.innerRadii = undefined;
    }
    options.minimumClock = minimumClock;
    options.maximumClock = maximumClock;
    options.minimumCone = minimumCone;
    options.maximumCone = maximumCone;

    const appearance = new MaterialAppearance({
      material: material,
      translucent: material.isTranslucent(),
      closed: true,
    });
    options.vertexFormat = appearance.vertexFormat;

    const fillInstance = this._geometryUpdater.createFillGeometryInstance(
      time,
      in3D,
      this._modelMatrix,
    );

    this._primitive = primitives.add(
      new Primitive({
        geometryInstances: fillInstance,
        appearance: appearance,
        asynchronous: false,
        shadows: shadows,
      }),
    );

    const outlineInstance = this._geometryUpdater.createOutlineGeometryInstance(
      time,
      in3D,
      this._modelMatrix,
    );
    this._outlinePrimitive = primitives.add(
      new Primitive({
        geometryInstances: outlineInstance,
        appearance: new PerInstanceColorAppearance({
          flat: true,
          translucent: outlineInstance.attributes.color.value[3] !== 255,
          renderState: {
            lineWidth:
              this._geometryUpdater._scene.clampLineWidth(outlineWidth),
          },
        }),
        asynchronous: false,
        shadows: shadows,
      }),
    );

    this._lastShow = showFill;
    this._lastOutlineShow = showOutline;
    this._lastOutlineColor = Color.clone(outlineColor, this._lastOutlineColor);
    this._lastDistanceDisplayCondition = distanceDisplayCondition;
    this._lastOffset = Cartesian3.clone(offset, this._lastOffset);
  } else if (this._primitive.ready) {
    //Update attributes only.
    const primitive = this._primitive;
    const outlinePrimitive = this._outlinePrimitive;

    primitive.show = true;
    outlinePrimitive.show = true;
    primitive.appearance.material = material;

    let attributes = this._attributes;
    if (!defined(attributes)) {
      attributes = primitive.getGeometryInstanceAttributes(entity);
      this._attributes = attributes;
    }
    if (showFill !== this._lastShow) {
      attributes.show = ShowGeometryInstanceAttribute.toValue(
        showFill,
        attributes.show,
      );
      this._lastShow = showFill;
    }

    let outlineAttributes = this._outlineAttributes;

    if (!defined(outlineAttributes)) {
      outlineAttributes =
        outlinePrimitive.getGeometryInstanceAttributes(entity);
      this._outlineAttributes = outlineAttributes;
    }

    if (showOutline !== this._lastOutlineShow) {
      outlineAttributes.show = ShowGeometryInstanceAttribute.toValue(
        showOutline,
        outlineAttributes.show,
      );
      this._lastOutlineShow = showOutline;
    }

    if (!Color.equals(outlineColor, this._lastOutlineColor)) {
      outlineAttributes.color = ColorGeometryInstanceAttribute.toValue(
        outlineColor,
        outlineAttributes.color,
      );
      Color.clone(outlineColor, this._lastOutlineColor);
    }

    if (
      !DistanceDisplayCondition.equals(
        distanceDisplayCondition,
        this._lastDistanceDisplayCondition,
      )
    ) {
      attributes.distanceDisplayCondition =
        DistanceDisplayConditionGeometryInstanceAttribute.toValue(
          distanceDisplayCondition,
          attributes.distanceDisplayCondition,
        );
      outlineAttributes.distanceDisplayCondition =
        DistanceDisplayConditionGeometryInstanceAttribute.toValue(
          distanceDisplayCondition,
          outlineAttributes.distanceDisplayCondition,
        );
      DistanceDisplayCondition.clone(
        distanceDisplayCondition,
        this._lastDistanceDisplayCondition,
      );
    }

    if (!Cartesian3.equals(offset, this._lastOffset)) {
      attributes.offset = OffsetGeometryInstanceAttribute.toValue(
        offset,
        attributes.offset,
      );
      outlineAttributes.offset = OffsetGeometryInstanceAttribute.toValue(
        offset,
        attributes.offset,
      );
      Cartesian3.clone(offset, this._lastOffset);
    }
  }

  if (in3D) {
    //Since we are scaling a unit sphere, we can't let any of the values go to zero.
    //Instead we clamp them to a small value.  To the naked eye, this produces the same results
    //that you get passing EllipsoidGeometry a radii with a zero component.
    radii.x = Math.max(radii.x, 0.001);
    radii.y = Math.max(radii.y, 0.001);
    radii.z = Math.max(radii.z, 0.001);

    modelMatrix = Matrix4.multiplyByScale(modelMatrix, radii, modelMatrix);
    this._primitive.modelMatrix = modelMatrix;
    this._outlinePrimitive.modelMatrix = modelMatrix;
  }
};
export default EllipsoidGeometryUpdater;
