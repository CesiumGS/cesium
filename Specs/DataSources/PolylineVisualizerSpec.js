import { ApproximateTerrainHeights } from "../../Source/Cesium.js";
import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { ColorGeometryInstanceAttribute } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { ShowGeometryInstanceAttribute } from "../../Source/Cesium.js";
import { BoundingSphereState } from "../../Source/Cesium.js";
import { CallbackProperty } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { ConstantPositionProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";
import { PolylineArrowMaterialProperty } from "../../Source/Cesium.js";
import { PolylineGraphics } from "../../Source/Cesium.js";
import { PolylineVisualizer } from "../../Source/Cesium.js";
import { ClassificationType } from "../../Source/Cesium.js";
import { PolylineColorAppearance } from "../../Source/Cesium.js";
import { PolylineMaterialAppearance } from "../../Source/Cesium.js";
import { ShadowMode } from "../../Source/Cesium.js";
import createDynamicProperty from "../createDynamicProperty.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "DataSources/PolylineVisualizer",
  function () {
    var time = JulianDate.now();

    var scene;
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
        var isUpdated = visualizer.update(time);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);
      expect(visualizer.update(time)).toBe(true);
      expect(scene.primitives.length).toBe(0);
      expect(visualizer.isDestroyed()).toBe(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toBe(true);
    });

    it("Creates and removes static color polyline", function () {
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();

      var entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();

      var entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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

      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.clampToGround = new ConstantProperty(true);

      var entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.groundPrimitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.shadows = new ConstantProperty(shadows);

      var entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.depthFailMaterial = new ColorMaterialProperty();

      var entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.depthFailMaterial = new PolylineArrowMaterialProperty();

      var entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();
      polyline.depthFailMaterial = new PolylineArrowMaterialProperty();

      var entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();
      polyline.depthFailMaterial = new ColorMaterialProperty();

      var entity = new Entity();
      entity.position = new ConstantPositionProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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

      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.classificationType = new ConstantProperty(classificationType);
      polyline.clampToGround = true;

      var entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.groundPrimitives.get(0);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();

      var entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer).then(function () {
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new CallbackProperty(function () {
        return [
          Cartesian3.fromDegrees(0.0, 0.0),
          Cartesian3.fromDegrees(0.0, 0.000001),
        ];
      }, false);
      polyline.material = new ColorMaterialProperty();

      var entity = new Entity();
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
      var objects = new EntityCollection();
      expect(function () {
        return new PolylineVisualizer(undefined, objects);
      }).toThrowDeveloperError();
    });

    it("Update throws without time parameter", function () {
      var visualizer = new PolylineVisualizer(scene, new EntityCollection());
      expect(function () {
        visualizer.update(undefined);
      }).toThrowDeveloperError();
    });

    it("removes the listener from the entity collection when destroyed", function () {
      var entityCollection = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, entityCollection);

      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it("Computes dynamic geometry bounding sphere.", function () {
      var entityCollection = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, entityCollection);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new PolylineArrowMaterialProperty();

      var entity = new Entity();
      entity.polyline = polyline;
      entityCollection.add(entity);

      var state;
      var result = new BoundingSphere();

      return pollToPromise(function () {
        scene.initializeFrame();
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(entity, result);
        return state !== BoundingSphereState.PENDING;
      }).then(function () {
        var primitive = scene.primitives.get(0);
        expect(state).toBe(BoundingSphereState.DONE);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
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
      var entityCollection = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, entityCollection);

      var result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();

      visualizer.destroy();
    });

    it("Compute dynamic geometry bounding sphere throws without result.", function () {
      var entityCollection = new EntityCollection();
      var entity = new Entity();
      entityCollection.add(entity);
      var visualizer = new PolylineVisualizer(scene, entityCollection);

      expect(function () {
        visualizer.getBoundingSphere(entity, undefined);
      }).toThrowDeveloperError();

      visualizer.destroy();
    });

    it("Can remove an entity and then add a new instance with the same id.", function () {
      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var entity = new Entity({
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

        var entity2 = new Entity({
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
          var primitive = scene.primitives.get(0);
          var attributes = primitive.getGeometryInstanceAttributes(entity2);
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
      var entities = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, entities);

      var entity = entities.add({
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
          var primitive = scene.primitives.get(0);
          var attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );

          entity.show = false;

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          var primitive = scene.primitives.get(0);
          var attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(false)
          );

          entities.remove(entity);
          visualizer.destroy();
        });
    });

    it("Sets static geometry primitive show attribute when using dynamic fill material", function () {
      var entities = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, entities);

      var entity = entities.add({
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
          var primitive = scene.primitives.get(0);
          var attributes = primitive.getGeometryInstanceAttributes(entity);
          expect(attributes).toBeDefined();
          expect(attributes.show).toEqual(
            ShowGeometryInstanceAttribute.toValue(true)
          );

          entity.show = false;

          return visualizerUpdated(visualizer);
        })
        .then(function () {
          var primitive = scene.primitives.get(0);
          var attributes = primitive.getGeometryInstanceAttributes(entity);
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

      var objects = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, objects);

      var polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0.0, 0.0),
        Cartesian3.fromDegrees(0.0, 0.000001),
      ]);
      polyline.material = new ColorMaterialProperty();
      polyline.clampToGround = new ConstantProperty(true);

      var entity = new Entity();
      entity.polyline = polyline;
      objects.add(entity);

      return visualizerUpdated(visualizer)
        .then(function () {
          var primitive = scene.groundPrimitives.get(0);
          var attributes = primitive.getGeometryInstanceAttributes(entity);
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

      var entities = new EntityCollection();
      var visualizer = new PolylineVisualizer(scene, entities);

      var blueColor = Color.BLUE.withAlpha(0.5);
      var redColor = Color.RED.withAlpha(0.5);
      var positions = [
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
