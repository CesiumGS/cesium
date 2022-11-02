import {
  ApproximateTerrainHeights,
  BoundingSphere,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  JulianDate,
  ShowGeometryInstanceAttribute,
  BoundingSphereState,
  CallbackProperty,
  ColorMaterialProperty,
  ConstantPositionProperty,
  ConstantProperty,
  Entity,
  EntityCollection,
  PolylineArrowMaterialProperty,
  PolylineGraphics,
  PolylineVisualizer,
  ClassificationType,
  PolylineColorAppearance,
  PolylineMaterialAppearance,
  ShadowMode,
} from "../../index.js";

import createDynamicProperty from "../../../../Specs/createDynamicProperty.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "DataSources/PolylineVisualizer",
  function () {
    const time = JulianDate.now();

    let scene;
    beforeAll(function () {
      scene = createScene();

      return ApproximateTerrainHeights.initialize();
    });

    afterAll(function () {
      scene.destroyForSpecs();

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
      const visualizer = new PolylineVisualizer(scene, objects);
      expect(visualizer.update(time)).toBe(true);
      expect(scene.primitives.length).toBe(0);
      expect(visualizer.isDestroyed()).toBe(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toBe(true);
    });

    it("Creates and removes static color polyline", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();

      const entity = new Entity();
      entity.polyline = polyline;
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
        expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
        expect(primitive.appearance.closed).toBe(false);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static material polyline", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();

      const entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toBeUndefined();
        expect(primitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);
        expect(primitive.appearance.closed).toBe(false);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static polylines on terrain", function () {
      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.clampToGround = new ConstantProperty(true);

      const entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.groundPrimitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toEqual(
          ColorGeometryInstanceAttribute.toValue(Color.WHITE)
        );
        expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
        expect(primitive.appearance.closed).toBe(false);

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    function createAndRemoveGeometryWithShadows(shadows) {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.shadows = new ConstantProperty(shadows);

      const entity = new Entity();
      entity.polyline = polyline;
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

    it("Creates and removes static color material and static color depth fail material", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.depthFailMaterial = new ColorMaterialProperty();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
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
        expect(attributes.depthFailColor).toEqual(
          ColorGeometryInstanceAttribute.toValue(Color.WHITE)
        );
        expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
        expect(primitive.depthFailAppearance).toBeInstanceOf(
          PolylineColorAppearance
        );

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static color material and static depth fail material", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.depthFailMaterial = new PolylineArrowMaterialProperty();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
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
        expect(attributes.depthFailColor).toBeUndefined();
        expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
        expect(primitive.depthFailAppearance).toBeInstanceOf(
          PolylineMaterialAppearance
        );

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static material and static depth fail material", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();
      polyline.depthFailMaterial = new PolylineArrowMaterialProperty();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toBeUndefined();
        expect(attributes.depthFailColor).toBeUndefined();
        expect(primitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);
        expect(primitive.depthFailAppearance).toBeInstanceOf(
          PolylineMaterialAppearance
        );

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    it("Creates and removes static material and static color depth fail material", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();
      polyline.depthFailMaterial = new ColorMaterialProperty();

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(
          ShowGeometryInstanceAttribute.toValue(true)
        );
        expect(attributes.color).toBeUndefined();
        expect(attributes.depthFailColor).toEqual(
          ColorGeometryInstanceAttribute.toValue(Color.WHITE)
        );
        expect(primitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);
        expect(primitive.depthFailAppearance).toBeInstanceOf(
          PolylineColorAppearance
        );

        objects.remove(entity);

        return visualizerEmpty(visualizer).then(function () {
          visualizer.destroy();
        });
      });
    });

    function createAndRemoveGeometryWithClassificationType(classificationType) {
      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.classificationType = new ConstantProperty(classificationType);
      polyline.clampToGround = true;

      const entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        const primitive = scene.groundPrimitives.get(0);
        expect(primitive.classificationType).toBe(classificationType);

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
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();

      const entity = new Entity();
      entity.polyline = polyline;
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
        expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);

        polyline.material = new PolylineArrowMaterialProperty();

        return visualizerUpdated(visualizer).then(function () {
          primitive = scene.primitives.get(0);
          attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );
          expect(attributes.color).toBeUndefined();
          expect(primitive.appearance).toBeInstanceOf(
            PolylineMaterialAppearance
          );

          objects.remove(entity);
          scene.initializeFrame();
          expect(visualizer.update(time)).toBe(true);
          scene.render(time);

          expect(scene.primitives.length).toBe(0);

          visualizer.destroy();
        });
      });
    });

    it("Creates and removes dynamic polyline", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new CallbackProperty(function () {
        return [
          Cartesian3.fromDegrees(0.0, 0.0),
          Cartesian3.fromDegrees(0.0, 0.000001),
        ];
      }, false);
      polyline.material = new ColorMaterialProperty();

      const entity = new Entity();
      entity.polyline = polyline;
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
        return new PolylineVisualizer(undefined, objects);
      }).toThrowDeveloperError();
    });

    it("Update throws without time parameter", function () {
      const visualizer = new PolylineVisualizer(scene, new EntityCollection());
      expect(function () {
        visualizer.update(undefined);
      }).toThrowDeveloperError();
    });

    it("removes the listener from the entity collection when destroyed", function () {
      const entityCollection = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, entityCollection);

      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it("Computes dynamic geometry bounding sphere.", function () {
      const entityCollection = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, entityCollection);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();

      const entity = new Entity();
      entity.polyline = polyline;
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
      const visualizer = new PolylineVisualizer(scene, entityCollection);

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
      const visualizer = new PolylineVisualizer(scene, entityCollection);

      expect(function () {
        visualizer.getBoundingSphere(entity, undefined);
      }).toThrowDeveloperError();

      visualizer.destroy();
    });

    it("Can remove an entity and then add a new instance with the same id.", function () {
      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const entity = new Entity({
        id: "test",
        polyline: {
          positions: [
            Cartesian3.fromDegrees(0.0, 0.0),
            Cartesian3.fromDegrees(0.0, 0.000001),
          ],
          material: Color.ORANGE,
        },
      });
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        objects.remove(entity);

        const entity2 = new Entity({
          id: "test",
          position: Cartesian3.fromDegrees(0, 0, 0),
          polyline: {
            positions: [
              Cartesian3.fromDegrees(0.0, 0.0),
              Cartesian3.fromDegrees(0.0, 0.000001),
            ],
            material: Color.BLUE,
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
          expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);

          objects.remove(entity);

          return visualizerEmpty(visualizer).then(function () {
            visualizer.destroy();
          });
        });
      });
    });

    it("Sets static geometry primitive show attribute when using dynamic fill color", function () {
      const entities = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, entities);

      const entity = entities.add({
        polyline: {
          positions: [
            Cartesian3.fromDegrees(0.0, 0.0),
            Cartesian3.fromDegrees(0.0, 0.000001),
          ],
          material: new ColorMaterialProperty(
            createDynamicProperty(Color.BLUE)
          ),
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
      const visualizer = new PolylineVisualizer(scene, entities);

      const entity = entities.add({
        position: new Cartesian3(1234, 5678, 9101112),
        polyline: {
          positions: [
            Cartesian3.fromDegrees(0.0, 0.0),
            Cartesian3.fromDegrees(0.0, 0.000001),
          ],
          material: new PolylineArrowMaterialProperty(
            createDynamicProperty(Color.BLUE)
          ),
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

    it("Sets static geometry primitive show attribute when clamped to ground", function () {
      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      const objects = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, objects);

      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.clampToGround = new ConstantProperty(true);

      const entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer)
        .then(function () {
          const primitive = scene.groundPrimitives.get(0);
          const attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );
          expect(attributes.color).toEqual(
            ColorGeometryInstanceAttribute.toValue(Color.WHITE)
          );
          expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
          expect(primitive.appearance.closed).toBe(false);

          entity.polyline.show = false;

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.primitives.length).toEqual(0);

          objects.remove(entity);
          visualizer.destroy();
        });
    });

    it("batches ground poylines by material if ground polylines are supported", function () {
      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      const entities = new EntityCollection();
      const visualizer = new PolylineVisualizer(scene, entities);

      const blueColor = Color.BLUE.withAlpha(0.5);
      const redColor = Color.RED.withAlpha(0.5);
      const positions = [
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ];
      entities.add({
        polyline: {
          positions: positions,
          material: blueColor,
          classificationType: ClassificationType.TERRAIN,
          clampToGround: true,
        },
      });

      return visualizerUpdated(visualizer)
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(1);

          entities.add({
            polyline: {
              positions: positions,
              material: blueColor,
              classificationType: ClassificationType.TERRAIN,
              clampToGround: true,
            },
          });

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(1);

          entities.add({
            polyline: {
              positions: positions,
              material: redColor,
              classificationType: ClassificationType.TERRAIN,
              clampToGround: true,
            },
          });

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(1);

          entities.add({
            polyline: {
              positions: positions,
              material: new PolylineArrowMaterialProperty(),
              classificationType: ClassificationType.TERRAIN,
              clampToGround: true,
            },
          });

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          expect(scene.groundPrimitives.length).toEqual(2);

          entities.add({
            polyline: {
              positions: positions,
              material: new PolylineArrowMaterialProperty(),
              classificationType: ClassificationType.CESIUM_3D_TILE,
              clampToGround: true,
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
