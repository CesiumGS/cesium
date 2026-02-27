import {
  FootprintPolygonBuilder,
  Cartesian3,
  ClassificationType,
  Color,
  Entity,
  GroundPrimitive,
  HeightReference,
  PolygonHierarchy,
} from "../../index.js";

describe("Scene/FootprintPolygonBuilder", function () {
  let hierarchy;

  beforeEach(function () {
    const positions = Cartesian3.fromDegreesArray([
      -75.0, 40.0,
      -74.0, 40.0,
      -74.0, 41.0,
      -75.0, 41.0,
    ]);
    hierarchy = new PolygonHierarchy(positions);
  });

  describe("createEntity", function () {
    it("creates an Entity with polygon graphics", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy);
      expect(entity).toBeInstanceOf(Entity);
      expect(entity.polygon).toBeDefined();
      expect(entity.polygon.hierarchy.getValue()).toEqual(hierarchy);
    });

    it("clamps polygon to ground", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy);
      expect(entity.polygon.heightReference.getValue()).toEqual(
        HeightReference.CLAMP_TO_GROUND,
      );
    });

    it("uses default material when none specified", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy);
      const material = entity.polygon.material.getValue();
      expect(material.color).toEqual(Color.WHITE.withAlpha(0.5));
    });

    it("uses provided material", function () {
      const color = Color.RED.withAlpha(0.3);
      const entity = FootprintPolygonBuilder.createEntity(hierarchy, {
        material: color,
      });
      const material = entity.polygon.material.getValue();
      expect(material.color).toEqual(color);
    });

    it("uses default classification type", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy);
      expect(entity.polygon.classificationType.getValue()).toEqual(
        ClassificationType.TERRAIN,
      );
    });

    it("uses provided classification type", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy, {
        classificationType: ClassificationType.BOTH,
      });
      expect(entity.polygon.classificationType.getValue()).toEqual(
        ClassificationType.BOTH,
      );
    });

    it("sets entity id when provided", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy, {
        id: "my-entity",
      });
      expect(entity.id).toEqual("my-entity");
    });

    it("sets entity name when provided", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy, {
        name: "Building A",
      });
      expect(entity.name).toEqual("Building A");
    });

    it("sets entity properties when provided", function () {
      const entity = FootprintPolygonBuilder.createEntity(hierarchy, {
        properties: { buildingId: 42 },
      });
      expect(entity.properties.buildingId.getValue()).toEqual(42);
    });

    it("throws without hierarchy", function () {
      expect(function () {
        FootprintPolygonBuilder.createEntity(undefined);
      }).toThrowDeveloperError();
    });
  });

  describe("createEntities", function () {
    let featureHierarchies;

    beforeEach(function () {
      featureHierarchies = new Map();
      featureHierarchies.set(0, hierarchy);

      const positions2 = Cartesian3.fromDegreesArray([
        -73.0, 40.0,
        -72.0, 40.0,
        -72.0, 41.0,
        -73.0, 41.0,
      ]);
      featureHierarchies.set(1, new PolygonHierarchy(positions2));
    });

    it("creates one entity per feature", function () {
      const entities = FootprintPolygonBuilder.createEntities(featureHierarchies);
      expect(entities.length).toEqual(2);
    });

    it("assigns feature-based IDs", function () {
      const entities = FootprintPolygonBuilder.createEntities(featureHierarchies);
      expect(entities[0].id).toEqual("footprint-0");
      expect(entities[1].id).toEqual("footprint-1");
    });

    it("stores featureId in entity properties", function () {
      const entities = FootprintPolygonBuilder.createEntities(featureHierarchies);
      expect(entities[0].properties.tilesetFeatureId.getValue()).toEqual(0);
      expect(entities[1].properties.tilesetFeatureId.getValue()).toEqual(1);
    });

    it("applies styleFeature callback", function () {
      const entities = FootprintPolygonBuilder.createEntities(
        featureHierarchies,
        {
          styleFeature: function (featureId) {
            if (featureId === 0) {
              return { material: Color.RED, name: "Red Feature" };
            }
            return undefined;
          },
        },
      );
      const material0 = entities[0].polygon.material.getValue();
      expect(material0.color).toEqual(Color.RED);
      expect(entities[0].name).toEqual("Red Feature");
    });

    it("returns empty array for empty map", function () {
      const entities = FootprintPolygonBuilder.createEntities(new Map());
      expect(entities.length).toEqual(0);
    });

    it("throws without featureHierarchies", function () {
      expect(function () {
        FootprintPolygonBuilder.createEntities(undefined);
      }).toThrowDeveloperError();
    });
  });

  describe("createBatchedGroundPrimitive", function () {
    let featureHierarchies;

    beforeEach(function () {
      featureHierarchies = new Map();
      featureHierarchies.set(0, hierarchy);
    });

    it("creates a GroundPrimitive", function () {
      const primitive =
        FootprintPolygonBuilder.createBatchedGroundPrimitive(featureHierarchies);
      expect(primitive).toBeInstanceOf(GroundPrimitive);
    });

    it("returns undefined for empty map", function () {
      const primitive =
        FootprintPolygonBuilder.createBatchedGroundPrimitive(new Map());
      expect(primitive).toBeUndefined();
    });

    it("applies per-instance styling", function () {
      const primitive =
        FootprintPolygonBuilder.createBatchedGroundPrimitive(
          featureHierarchies,
          {
            styleFeature: function (featureId) {
              if (featureId === 0) {
                return { color: Color.BLUE };
              }
              return undefined;
            },
          },
        );
      expect(primitive).toBeDefined();
    });

    it("uses provided classification type", function () {
      const primitive =
        FootprintPolygonBuilder.createBatchedGroundPrimitive(
          featureHierarchies,
          {
            classificationType: ClassificationType.CESIUM_3D_TILE,
          },
        );
      expect(primitive.classificationType).toEqual(
        ClassificationType.CESIUM_3D_TILE,
      );
    });

    it("throws without featureHierarchies", function () {
      expect(function () {
        FootprintPolygonBuilder.createBatchedGroundPrimitive(undefined);
      }).toThrowDeveloperError();
    });
  });
});
