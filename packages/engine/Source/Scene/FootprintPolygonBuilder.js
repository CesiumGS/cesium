import Check from "../Core/Check.js";
import ClassificationType from "./ClassificationType.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import Entity from "../DataSources/Entity.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import GroundPrimitive from "./GroundPrimitive.js";
import HeightReference from "./HeightReference.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import PolygonGeometry from "../Core/PolygonGeometry.js";
import PolygonGraphics from "../DataSources/PolygonGraphics.js";

/**
 * Builds terrain-draped polygon entities or batched {@link GroundPrimitive}
 * instances from pre-computed {@link PolygonHierarchy} footprints.
 *
 * This is the "Polygon Creation Layer" described in the architecture — it
 * takes polygon hierarchies produced by {@link PolygonBoundaryExtractor} and
 * turns them into renderable objects.
 *
 * @namespace FootprintPolygonBuilder
 *
 * @private
 */
const FootprintPolygonBuilder = {};

/**
 * Creates a single {@link Entity} with a {@link PolygonGraphics} that is
 * clamped to the ground.
 *
 * @param {PolygonHierarchy} hierarchy The polygon outer ring and holes.
 * @param {object} [options] Additional options.
 * @param {Color} [options.material=Color.WHITE.withAlpha(0.5)] The polygon fill color / material.
 * @param {ClassificationType} [options.classificationType=ClassificationType.TERRAIN] How the polygon classifies.
 * @param {string} [options.id] An optional entity ID.
 * @param {string} [options.name] An optional entity name.
 * @param {object} [options.properties] Arbitrary key-value properties to attach to the entity.
 * @returns {Entity} A new entity with the polygon draping on terrain.
 *
 * @exception {DeveloperError} hierarchy is required.
 */
FootprintPolygonBuilder.createEntity = function (hierarchy, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("hierarchy", hierarchy);
  //>>includeEnd('debug');

  options = options ?? {};

  const material = options.material ?? Color.WHITE.withAlpha(0.5);
  const classificationType =
    options.classificationType ?? ClassificationType.TERRAIN;

  const entityOptions = {
    polygon: new PolygonGraphics({
      hierarchy: hierarchy,
      heightReference: HeightReference.CLAMP_TO_GROUND,
      material: material,
      classificationType: classificationType,
    }),
  };

  if (defined(options.id)) {
    entityOptions.id = options.id;
  }
  if (defined(options.name)) {
    entityOptions.name = options.name;
  }
  if (defined(options.properties)) {
    entityOptions.properties = options.properties;
  }

  return new Entity(entityOptions);
};

/**
 * Creates a batch of {@link Entity} objects from a map of feature IDs to
 * polygon hierarchies. This is handy for creating one entity per feature.
 *
 * @param {Map<number, PolygonHierarchy>} featureHierarchies Map from feature ID to hierarchy.
 * @param {object} [options] Options forwarded to {@link FootprintPolygonBuilder.createEntity}.
 * @param {function} [options.styleFeature] A function `(featureId) => { material, name }` for per-feature styling.
 * @returns {Entity[]} An array of entities.
 *
 * @exception {DeveloperError} featureHierarchies is required.
 */
FootprintPolygonBuilder.createEntities = function (
  featureHierarchies,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("featureHierarchies", featureHierarchies);
  //>>includeEnd('debug');

  options = options ?? {};

  const entities = [];
  for (const [featureId, hierarchy] of featureHierarchies) {
    const entityOptions = {
      material: options.material,
      classificationType: options.classificationType,
      id: `footprint-${featureId}`,
      properties: { tilesetFeatureId: featureId },
    };

    if (typeof options.styleFeature === "function") {
      const style = options.styleFeature(featureId);
      if (defined(style)) {
        if (defined(style.material)) {
          entityOptions.material = style.material;
        }
        if (defined(style.name)) {
          entityOptions.name = style.name;
        }
      }
    }

    entities.push(
      FootprintPolygonBuilder.createEntity(hierarchy, entityOptions),
    );
  }
  return entities;
};

/**
 * Creates a single {@link GroundPrimitive} containing multiple
 * {@link GeometryInstance} objects — one per feature. This is much more
 * efficient than individual entities for large feature counts.
 *
 * @param {Map<number, PolygonHierarchy>} featureHierarchies Map from feature ID to hierarchy.
 * @param {object} [options] Options.
 * @param {Color} [options.color=Color.WHITE.withAlpha(0.5)] Default color for all instances.
 * @param {ClassificationType} [options.classificationType=ClassificationType.TERRAIN] Classification type.
 * @param {function} [options.styleFeature] `(featureId) => { color }` for per-instance coloring.
 * @returns {GroundPrimitive} A ground primitive ready to be added to the scene.
 *
 * @exception {DeveloperError} featureHierarchies is required.
 */
FootprintPolygonBuilder.createBatchedGroundPrimitive = function (
  featureHierarchies,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("featureHierarchies", featureHierarchies);
  //>>includeEnd('debug');

  options = options ?? {};

  const defaultColor = options.color ?? Color.WHITE.withAlpha(0.5);
  const classificationType =
    options.classificationType ?? ClassificationType.TERRAIN;

  const instances = [];
  for (const [featureId, hierarchy] of featureHierarchies) {
    let color = defaultColor;
    if (typeof options.styleFeature === "function") {
      const style = options.styleFeature(featureId);
      if (defined(style) && defined(style.color)) {
        color = style.color;
      }
    }

    instances.push(
      new GeometryInstance({
        geometry: new PolygonGeometry({
          polygonHierarchy: hierarchy,
        }),
        id: featureId,
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(color),
        },
      }),
    );
  }

  if (instances.length === 0) {
    return undefined;
  }

  return new GroundPrimitive({
    geometryInstances: instances,
    appearance: new PerInstanceColorAppearance(),
    classificationType: classificationType,
  });
};

export default FootprintPolygonBuilder;
