import {
  FootprintPolygonBuilder,
  Cartesian3,
  ClassificationType,
  Color,
  Entity,
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
});
