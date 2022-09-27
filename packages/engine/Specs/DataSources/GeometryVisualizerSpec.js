import {
  ApproximateTerrainHeights,
  BoundingSphere,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  JulianDate,
  ShowGeometryInstanceAttribute,
  BoundingSphereState,
  ColorMaterialProperty,
  ConstantPositionProperty,
  ConstantProperty,
  EllipseGraphics,
  Entity,
  EntityCollection,
  GeometryVisualizer,
  GridMaterialProperty,
  SampledProperty,
  ClassificationType,
  GroundPrimitive,
  MaterialAppearance,
  PerInstanceColorAppearance,
  ShadowMode,
} from "../../index.js";

import createDynamicProperty from "../../../../Specs/createDynamicProperty.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "DataSources/GeometryVisualizer",
  function () {
    const time = JulianDate.now();

    let scene;
    beforeAll(function () {
      scene = createScene();

      return GroundPrimitive.initializeTerrainHeights();
    });

    afterAll(function () {
      scene.destroyForSpecs();

      // Leave ground primitive uninitialized
      GroundPrimitive._initialized = false;
      GroundPrimitive._initPromise = undefined;
      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function visualizerUpdated(visualizer) {
      return pollToPromise(function () {
        scene.initializeFrame();
        const isUpdated = visualizer.update(time);
        scene.render(time);
        return isUpdated;
      });
    }

    function visualizerEmpty(visualizer) {
      return pollToPromise(function () {
        scene.initializeFrame();
        expect(visualizer.update(time)).toBe(true);
        scene.render(time);
        return (
          scene.primitives.length === 0 && scene.groundPrimitives.length === 0
        );
      });
    }

    it("Can create and destroy", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );
      expect(visualizer.update(time)).toBe(true);
      expect(scene.primitives.length).toBe(0);
      expect(visualizer.isDestroyed()).toBe(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toBe(true);
    });

    it("Creates and removes static color open geometry", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new ColorMaterialProperty();
      ellipse.height = new ConstantProperty(0);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toEqual(
          ColorGeometryInstanceAttribute.toValue(Color.WHITE)
        );
        expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);
        expect(primitive.appearance.closed).toBe(true);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static material open geometry", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new GridMaterialProperty();
      ellipse.height = new ConstantProperty(1.0);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toBeUndefined();
        expect(primitive.appearance).toBeInstanceOf(MaterialAppearance);
        expect(primitive.appearance.closed).toBe(false);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static color closed geometry", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new ColorMaterialProperty();
      ellipse.extrudedHeight = new ConstantProperty(1000);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toEqual(
          ColorGeometryInstanceAttribute.toValue(Color.WHITE)
        );
        expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);
        expect(primitive.appearance.closed).toBe(true);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static material closed geometry", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new GridMaterialProperty();
      ellipse.extrudedHeight = new ConstantProperty(1000);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toBeUndefined();
        expect(primitive.appearance).toBeInstanceOf(MaterialAppearance);
        expect(primitive.appearance.closed).toBe(true);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static outline geometry", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.outline = new ConstantProperty(true);
      ellipse.outlineColor = new ConstantProperty(Color.BLUE);
      ellipse.fill = new ConstantProperty(false);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toEqual(
          ColorGeometryInstanceAttribute.toValue(Color.BLUE)
        );
        expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    function createAndRemoveGeometryWithShadows(shadows) {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new ColorMaterialProperty();
      ellipse.extrudedHeight = new ConstantProperty(1000);
      ellipse.shadows = new ConstantProperty(shadows);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        expect(primitive.shadows).toBe(shadows);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    }

    it("Creates and removes geometry with shadows disabled", function () {
      return createAndRemoveGeometryWithShadows(ShadowMode.DISABLED);
    });

    it("Creates and removes geometry with shadows enabled", function () {
      return createAndRemoveGeometryWithShadows(ShadowMode.ENABLED);
    });

    it("Creates and removes geometry with shadow casting only", function () {
      return createAndRemoveGeometryWithShadows(ShadowMode.CAST_ONLY);
    });

    it("Creates and removes geometry with shadow receiving only", function () {
      return createAndRemoveGeometryWithShadows(ShadowMode.RECEIVE_ONLY);
    });

    function createAndRemoveGeometryWithClassificationType(type) {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new ColorMaterialProperty();
      ellipse.classificationType = new ConstantProperty(type);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.groundPrimitives.get(0);
        expect(primitive.classificationType).toBe(type);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    }

    it("Creates and removes geometry classifying terrain", function () {
      return createAndRemoveGeometryWithClassificationType(
        ClassificationType.TERRAIN
      );
    });

    it("Creates and removes geometry classifying 3D Tiles", function () {
      return createAndRemoveGeometryWithClassificationType(
        ClassificationType.CESIUM_3D_TILE
      );
    });

    it("Creates and removes geometry classifying both terrain and 3D Tiles", function () {
      return createAndRemoveGeometryWithClassificationType(
        ClassificationType.BOTH
      );
    });

    it("Correctly handles geometry changing batches", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new ColorMaterialProperty();
      ellipse.height = new ConstantProperty(0);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        let primitive = scene.primitives.get(0);
        let attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toEqual(
          ColorGeometryInstanceAttribute.toValue(Color.WHITE)
        );
        expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);

        ellipse.material = new GridMaterialProperty();

        return visualizerUpdated(visualizer).then(function () {
          primitive = scene.primitives.get(0);
          attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );
          expect(attributes.color).toBeUndefined();
          expect(primitive.appearance).toBeInstanceOf(MaterialAppearance);

          objects.remove(entity);
          scene.initializeFrame();
          expect(visualizer.update(time)).toBe(true);
          scene.render(time);

          expect(scene.primitives.length).toBe(0);

          visualizer.destroy();
        });
      });
    });

    it("Correctly handles modifying translucent outline color", function () {
      const entities = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entities,
        scene.primitives,
        scene.groundPrimitives
      );

      let color = Color.BLUE.withAlpha(0.5);
      const entity = entities.add({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          fill: false,
          outline: true,
          outlineColor: color,
        },
      });

      return visualizerUpdated(visualizer)
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.color).toEqual(
            ColorGeometryInstanceAttribute.toValue(color)
          );

          color = Color.RED.withAlpha(0.5);
          entity.ellipse.outlineColor.setValue(color);

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.color).toEqual(
            ColorGeometryInstanceAttribute.toValue(color)
          );

          entities.remove(entity);
          visualizer.destroy();
        });
    });

    it("Creates and removes dynamic geometry", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new SampledProperty(Number);
      ellipse.semiMajorAxis.addSample(time, 2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.extrudedHeight = new ConstantProperty(1000);
      ellipse.material = new ColorMaterialProperty();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      scene.initializeFrame();
      expect(visualizer.update(time)).toBe(true);
      scene.render(time);
      objects.remove(entity);
      scene.initializeFrame();
      expect(visualizer.update(time)).toBe(true);
      scene.render(time);
      expect(scene.primitives.length).toBe(0);
      visualizer.destroy();
    });

    it("Creates and removes dynamic geometry on terrain ", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new SampledProperty(Number);
      ellipse.semiMajorAxis.addSample(time, 2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.material = new ColorMaterialProperty();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.ellipse = ellipse;
      objects.add(entity);

      scene.initializeFrame();
      expect(visualizer.update(time)).toBe(true);
      scene.render(time);
      objects.remove(entity);
      scene.initializeFrame();
      expect(visualizer.update(time)).toBe(true);
      scene.render(time);
      expect(scene.primitives.length).toBe(0);
      visualizer.destroy();
    });

    it("Constructor throws without scene", function () {
      const objects = new EntityCollection();
      expect(function () {
        return new GeometryVisualizer(
          undefined,
          objects,
          scene.primitives,
          scene.groundPrimitives
        );
      }).toThrowDeveloperError();
    });

    it("Constructor throws without entityCollection", function () {
      expect(function () {
        return new GeometryVisualizer(
          scene,
          undefined,
          scene.primitives,
          scene.groundPrimitives
        );
      }).toThrowDeveloperError();
    });

    it("Update throws without time parameter", function () {
      const visualizer = new GeometryVisualizer(
        scene,
        new EntityCollection(),
        scene.primitives,
        scene.groundPrimitives
      );
      expect(function () {
        visualizer.update(undefined);
      }).toThrowDeveloperError();
    });

    it("removes the listener from the entity collection when destroyed", function () {
      const entityCollection = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entityCollection,
        scene.primitives,
        scene.groundPrimitives
      );
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it("calls destroy on all updaterSets", function () {
      const entityCollection = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entityCollection,
        scene.primitives,
        scene.groundPrimitives
      );

      const destroySpy = jasmine.createSpy("destroy");
      visualizer._updaterSets.set("test", {
        destroy: destroySpy,
      });

      expect(visualizer._updaterSets.values.length).toBe(1);

      visualizer.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(visualizer._updaterSets.values.length).toBe(0);
    });

    it("Computes dynamic geometry bounding sphere.", function () {
      const entityCollection = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entityCollection,
        scene.primitives,
        scene.groundPrimitives
      );

      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.height = new ConstantProperty(0);

      const entity = new Entity();
      entity.position = Cartesian3.fromDegrees(0, 0, 0);
      entity.ellipse = ellipse;
      entityCollection.add(entity);

      let state;
      const result = new BoundingSphere();

      return pollToPromise(function () {
        scene.initializeFrame();
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(entity, result);
        return state !== BoundingSphereState.PENDING;
      }).then(function () {
        const primitive = scene.primitives.get(0);
        expect(state).toBe(BoundingSphereState.DONE);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(result).toEqual(
          BoundingSphere.transform(
            attributes.boundingSphere,
            primitive.modelMatrix,
            new BoundingSphere()
          )
        );

        visualizer.destroy();
      });
    });

    it("Compute dynamic geometry bounding sphere throws without entity.", function () {
      const entityCollection = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entityCollection,
        scene.primitives,
        scene.groundPrimitives
      );

      const result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();

      visualizer.destroy();
    });

    it("Compute dynamic geometry bounding sphere throws without result.", function () {
      const entityCollection = new EntityCollection();
      const entity = new Entity();
      entityCollection.add(entity);
      const visualizer = new GeometryVisualizer(
        scene,
        entityCollection,
        scene.primitives,
        scene.groundPrimitives
      );

      expect(function () {
        visualizer.getBoundingSphere(entity, undefined);
      }).toThrowDeveloperError();

      visualizer.destroy();
    });

    it("Can remove and entity and then add a new new instance with the same id.", function () {
      const objects = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        objects,
        scene.primitives,
        scene.groundPrimitives
      );

      const entity = new Entity({
        id: "test",
        position: Cartesian3.fromDegrees(0, 0, 0),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          material: Color.ORANGE,
          height: 0,
        },
      });
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        objects.remove(entity);

        const entity2 = new Entity({
          id: "test",
          position: Cartesian3.fromDegrees(0, 0, 0),
          ellipse: {
            semiMajorAxis: 2,
            semiMinorAxis: 1,
            material: Color.BLUE,
            height: 0,
          },
        });
        objects.add(entity2);

        return visualizerUpdated(visualizer).then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity2);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );
          expect(attributes.color).toEqual(
            ColorGeometryInstanceAttribute.toValue(Color.BLUE)
          );
          expect(primitive.appearance).toBeInstanceOf(
            PerInstanceColorAppearance
          );

          objects.remove(entity);

          return visualizerEmpty(visualizer).then(function () {
            visualizer.destroy();
          });
        });
      });
    });

    it("Sets static geometry primitive show attribute when using dynamic fill color", function () {
      const entities = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entities,
        scene.primitives,
        scene.groundPrimitives
      );

      const entity = entities.add({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          material: new ColorMaterialProperty(
            createDynamicProperty(Color.BLUE)
          ),
          height: 0,
        },
      });

      return visualizerUpdated(visualizer)
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );

          entity.show = false;

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(false)
          );

          entities.remove(entity);
          visualizer.destroy();
        });
    });

    it("Sets static geometry primitive show attribute when using dynamic outline color", function () {
      const entities = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entities,
        scene.primitives,
        scene.groundPrimitives
      );

      const entity = entities.add({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          fill: false,
          outline: true,
          outlineColor: createDynamicProperty(Color.BLUE),
        },
      });

      return visualizerUpdated(visualizer)
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );

          entity.show = false;

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(false)
          );

          entities.remove(entity);
          visualizer.destroy();
        });
    });

    it("Sets static geometry primitive show attribute when using dynamic fill material", function () {
      const entities = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entities,
        scene.primitives,
        scene.groundPrimitives
      );

      const entity = entities.add({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          material: new GridMaterialProperty({
            color: createDynamicProperty(Color.BLUE),
          }),
          height: 0.0,
        },
      });

      return visualizerUpdated(visualizer)
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );

          entity.show = false;

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          const primitive = scene.primitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(false)
          );

          entities.remove(entity);
          visualizer.destroy();
        });
    });

    it("batches ground entities by material if ground entity materials is supported", function () {
      if (
        !GroundPrimitive.isSupported(scene) ||
        !GroundPrimitive.supportsMaterials(scene)
      ) {
        return;
      }

      const entities = new EntityCollection();
      const visualizer = new GeometryVisualizer(
        scene,
        entities,
        scene.primitives,
        scene.groundPrimitives
      );

      const blueColor = Color.BLUE.withAlpha(0.5);
      entities.add({
        position: Cartesian3.fromDegrees(1, 2),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          material: blueColor,
          classificationType: ClassificationType.TERRAIN,
        },
      });

      return visualizerUpdated(visualizer)
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(1);

          entities.add({
            position: Cartesian3.fromDegrees(12, 34),
            ellipse: {
              semiMajorAxis: 2,
              semiMinorAxis: 1,
              material: blueColor,
              classificationType: ClassificationType.TERRAIN,
            },
          });

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(1);

          entities.add({
            position: Cartesian3.fromDegrees(45, 67),
            ellipse: {
              semiMajorAxis: 2,
              semiMinorAxis: 1,
              material: Color.BLUE.withAlpha(0.6),
              classificationType: ClassificationType.TERRAIN,
            },
          });

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(1);

          entities.add({
            position: Cartesian3.fromDegrees(-1, -2),
            ellipse: {
              semiMajorAxis: 2,
              semiMinorAxis: 1,
              material: "./Data/Images/White.png",
              classificationType: ClassificationType.TERRAIN,
            },
          });

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(2);

          entities.add({
            position: Cartesian3.fromDegrees(-12, -34),
            ellipse: {
              semiMajorAxis: 2,
              semiMinorAxis: 1,
              material: "./Data/Images/White.png",
              classificationType: ClassificationType.CESIUM_3D_TILE,
            },
          });

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(3);

          entities.removeAll();
          visualizer.destroy();
        });
    });
  },
  "WebGL"
);
