import Check from "../Core/Check.js";
import ClassificationType from "./ClassificationType.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import Entity from "../DataSources/Entity.js";
import HeightReference from "./HeightReference.js";
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

export default FootprintPolygonBuilder;
