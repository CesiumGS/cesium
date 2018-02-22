defineSuite([
    'DataSources/PolylineVisualizer',
    'Core/BoundingSphere',
    'Core/Cartesian3',
    'Core/Color',
    'Core/ColorGeometryInstanceAttribute',
    'Core/JulianDate',
    'Core/ShowGeometryInstanceAttribute',
    'DataSources/BoundingSphereState',
    'DataSources/CallbackProperty',
    'DataSources/ColorMaterialProperty',
    'DataSources/ConstantPositionProperty',
    'DataSources/ConstantProperty',
    'DataSources/Entity',
    'DataSources/EntityCollection',
    'DataSources/PolylineArrowMaterialProperty',
    'DataSources/PolylineGeometryUpdater',
    'DataSources/PolylineGraphics',
    'DataSources/SampledProperty',
    'DataSources/StaticGeometryColorBatch',
    'DataSources/StaticGeometryPerMaterialBatch',
    'DataSources/StaticGroundGeometryColorBatch',
    'DataSources/StaticOutlineGeometryBatch',
    'Scene/PolylineColorAppearance',
    'Scene/PolylineMaterialAppearance',
    'Scene/ShadowMode',
    'Specs/createDynamicProperty',
    'Specs/createScene',
    'Specs/pollToPromise'
], function(
    PolylineVisualizer,
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
    PolylineGeometryUpdater,
    PolylineGraphics,
    SampledProperty,
    StaticGeometryColorBatch,
    StaticGeometryPerMaterialBatch,
    StaticGroundGeometryColorBatch,
    StaticOutlineGeometryBatch,
    PolylineColorAppearance,
    PolylineMaterialAppearance,
    ShadowMode,
    createDynamicProperty,
    createScene,
    pollToPromise) {
    'use strict';

    var time = JulianDate.now();

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('Can create and destroy', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);
        expect(visualizer.update(time)).toBe(true);
        expect(scene.primitives.length).toBe(0);
        expect(visualizer.isDestroyed()).toBe(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toBe(true);
    });

    it('Creates and removes static color polyline', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new ColorMaterialProperty();

        var entity = new Entity();
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
            expect(primitive.appearance.closed).toBe(false);

            objects.remove(entity);

            return pollToPromise(function() {
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);
                return scene.primitives.length === 0;
            }).then(function(){
                visualizer.destroy();
            });
        });
    });

    it('Creates and removes static material polyline', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new PolylineArrowMaterialProperty();

        var entity = new Entity();
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);
            expect(primitive.appearance.closed).toBe(false);

            objects.remove(entity);

            return pollToPromise(function() {
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);
                return scene.primitives.length === 0;
            }).then(function(){
                visualizer.destroy();
            });
        });
    });

    function createAndRemoveGeometryWithShadows(shadows) {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new ColorMaterialProperty();
        polyline.shadows = new ConstantProperty(shadows);

        var entity = new Entity();
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            expect(primitive.shadows).toBe(shadows);

            objects.remove(entity);

            return pollToPromise(function() {
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);
                return scene.primitives.length === 0;
            }).then(function(){
                visualizer.destroy();
            });
        });
    }

    it('Creates and removes geometry with shadows disabled', function() {
        return createAndRemoveGeometryWithShadows(ShadowMode.DISABLED);
    });

    it('Creates and removes geometry with shadows enabled', function() {
        return createAndRemoveGeometryWithShadows(ShadowMode.ENABLED);
    });

    it('Creates and removes geometry with shadow casting only', function() {
        return createAndRemoveGeometryWithShadows(ShadowMode.CAST_ONLY);
    });

    it('Creates and removes geometry with shadow receiving only', function() {
        return createAndRemoveGeometryWithShadows(ShadowMode.RECEIVE_ONLY);
    });

    it('Creates and removes static color material and static color depth fail material', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new ColorMaterialProperty();
        polyline.depthFailMaterial = new ColorMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(attributes.depthFailColor).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
            expect(primitive.depthFailAppearance).toBeInstanceOf(PolylineColorAppearance);

            objects.remove(entity);

            return pollToPromise(function() {
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);
                return scene.primitives.length === 0;
            }).then(function(){
                visualizer.destroy();
            });
        });
    });

    it('Creates and removes static color material and static depth fail material', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new ColorMaterialProperty();
        polyline.depthFailMaterial = new PolylineArrowMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(attributes.depthFailColor).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);
            expect(primitive.depthFailAppearance).toBeInstanceOf(PolylineMaterialAppearance);

            objects.remove(entity);

            return pollToPromise(function() {
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);
                return scene.primitives.length === 0;
            }).then(function(){
                visualizer.destroy();
            });
        });
    });

    it('Creates and removes static material and static depth fail material', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new PolylineArrowMaterialProperty();
        polyline.depthFailMaterial = new PolylineArrowMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(attributes.depthFailColor).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);
            expect(primitive.depthFailAppearance).toBeInstanceOf(PolylineMaterialAppearance);

            objects.remove(entity);

            return pollToPromise(function() {
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);
                return scene.primitives.length === 0;
            }).then(function(){
                visualizer.destroy();
            });
        });
    });

    it('Creates and removes static material and static color depth fail material', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new PolylineArrowMaterialProperty();
        polyline.depthFailMaterial = new ColorMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(attributes.depthFailColor).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);
            expect(primitive.depthFailAppearance).toBeInstanceOf(PolylineColorAppearance);

            objects.remove(entity);

            return pollToPromise(function() {
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);
                return scene.primitives.length === 0;
            }).then(function(){
                visualizer.destroy();
            });
        });
    });

    it('Correctly handles geometry changing batches', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new ColorMaterialProperty();

        var entity = new Entity();
        entity.polyline = polyline;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);

            polyline.material = new PolylineArrowMaterialProperty();

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = visualizer.update(time);
                scene.render(time);
                return isUpdated;
            }).then(function() {
                primitive = scene.primitives.get(0);
                attributes = primitive.getGeometryInstanceAttributes(entity);
                expect(attributes).toBeDefined();
                expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
                expect(attributes.color).toBeUndefined();
                expect(primitive.appearance).toBeInstanceOf(PolylineMaterialAppearance);

                objects.remove(entity);
                scene.initializeFrame();
                expect(visualizer.update(time)).toBe(true);
                scene.render(time);

                expect(scene.primitives.length).toBe(0);

                visualizer.destroy();
            });
        });
    });

    it('Creates and removes dynamic polyline', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var polyline = new PolylineGraphics();
        polyline.positions = new CallbackProperty(function() {
            return [Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)];
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

    it('Constructor throws without scene', function() {
        var objects = new EntityCollection();
        expect(function() {
            return new PolylineVisualizer(undefined, objects);
        }).toThrowDeveloperError();
    });

    it('Update throws without time parameter', function() {
        var visualizer = new PolylineVisualizer(scene, new EntityCollection());
        expect(function() {
            visualizer.update(undefined);
        }).toThrowDeveloperError();
    });

    it('removes the listener from the entity collection when destroyed', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, entityCollection);
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
        visualizer.destroy();
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it('StaticGeometryPerMaterialBatch handles shared material being invalidated', function() {
        var batch = new StaticGeometryPerMaterialBatch(scene.primitives, PolylineMaterialAppearance, undefined, false, ShadowMode.DISABLED);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new PolylineArrowMaterialProperty();

        var entity = new Entity();
        entity.polyline = polyline;

        var polyline2 = new PolylineGraphics();
        polyline2.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline2.material = new PolylineArrowMaterialProperty();

        var entity2 = new Entity();
        entity2.polyline = polyline2;

        var updater = new PolylineGeometryUpdater(entity, scene);
        var updater2 = new PolylineGeometryUpdater(entity2, scene);
        batch.add(time, updater);
        batch.add(time, updater2);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.primitives.length).toEqual(1);
            polyline.material.color = new ConstantProperty(Color.RED);

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = batch.update(time);
                scene.render(time);
                return isUpdated;
            }).then(function() {
                expect(scene.primitives.length).toEqual(2);
                batch.removeAllPrimitives();
            });
        });
    });

    it('StaticGeometryColorBatch updates color attribute after rebuilding primitive', function() {
        var batch = new StaticGeometryColorBatch(scene.primitives, PolylineColorAppearance, undefined, false, ShadowMode.DISABLED);

        var entity = new Entity({
            polyline : {
                positions : [Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)],
                material : Color.RED
            }
        });

        var updater = new PolylineGeometryUpdater(entity, scene);
        batch.add(time, updater);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.primitives.length).toEqual(1);
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.color).toEqual([255, 0, 0, 255]);

            entity.polyline.material = Color.GREEN;
            batch.remove(updater);
            batch.add(time, updater);
            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = batch.update(time);
                scene.render(time);
                return isUpdated;
            }).then(function() {
                expect(scene.primitives.length).toEqual(1);
                var primitive = scene.primitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity);
                expect(attributes.color).toEqual([0, 128, 0, 255]);
                batch.removeAllPrimitives();
            });
        });
    });

    it('Computes dynamic geometry bounding sphere.', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, entityCollection);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new PolylineArrowMaterialProperty();

        var entity = new Entity();
        entity.polyline = polyline;
        entityCollection.add(entity);

        var state;
        var result = new BoundingSphere();

        return pollToPromise(function() {
            scene.initializeFrame();
            scene.render();
            visualizer.update(time);
            state = visualizer.getBoundingSphere(entity, result);
            return state !== BoundingSphereState.PENDING;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            expect(state).toBe(BoundingSphereState.DONE);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(result).toEqual(BoundingSphere.transform(attributes.boundingSphere, primitive.modelMatrix, new BoundingSphere()));

            visualizer.destroy();
        });
    });

    it('Compute dynamic geometry bounding sphere throws without entity.', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, entityCollection);

        var result = new BoundingSphere();
        expect(function() {
            visualizer.getBoundingSphere(undefined, result);
        }).toThrowDeveloperError();

        visualizer.destroy();
    });

    it('Compute dynamic geometry bounding sphere throws without result.', function() {
        var entityCollection = new EntityCollection();
        var entity = new Entity();
        entityCollection.add(entity);
        var visualizer = new PolylineVisualizer(scene, entityCollection);

        expect(function() {
            visualizer.getBoundingSphere(entity, undefined);
        }).toThrowDeveloperError();

        visualizer.destroy();
    });

    it('Can remove and entity and then add a new new instance with the same id.', function() {
        var objects = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, objects);

        var entity = new Entity({
            id : 'test',
            polyline : {
                positions: [Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)],
                material: Color.ORANGE
            }
        });
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            objects.remove(entity);

            var entity2 = new Entity({
                id : 'test',
                position : Cartesian3.fromDegrees(0, 0, 0),
                polyline : {
                    positions: [Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)],
                    material : Color.BLUE
                }
            });
            objects.add(entity2);

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = visualizer.update(time);
                scene.render(time);
                return isUpdated;
            }).then(function() {

                var primitive = scene.primitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity2);
                expect(attributes).toBeDefined();
                expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
                expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.BLUE));
                expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance);

                objects.remove(entity);

                return pollToPromise(function() {
                    scene.initializeFrame();
                    expect(visualizer.update(time)).toBe(true);
                    scene.render(time);
                    return scene.primitives.length === 0;
                }).then(function() {
                    visualizer.destroy();
                });
            });
        });
    });

    it('Sets static geometry primitive show attribute when using dynamic fill color', function() {
        var entities = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, entities);

        var entity = entities.add({
            polyline : {
                positions: [Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)],
                material : new ColorMaterialProperty(createDynamicProperty(Color.BLUE))
            }
        });

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));

            entity.show = false;

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = visualizer.update(time);
                scene.render(time);
                return isUpdated;
            });
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(false));

            entities.remove(entity);
            visualizer.destroy();
        });
    });

    it('Sets static geometry primitive show attribute when using dynamic fill material', function() {
        var entities = new EntityCollection();
        var visualizer = new PolylineVisualizer(scene, entities);

        var entity = entities.add({
            position : new Cartesian3(1234, 5678, 9101112),
            polyline : {
                positions: [Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)],
                material : new PolylineArrowMaterialProperty(createDynamicProperty(Color.BLUE))
            }
        });

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));

            entity.show = false;

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = visualizer.update(time);
                scene.render(time);
                return isUpdated;
            });
        }).then(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(false));

            entities.remove(entity);
            visualizer.destroy();
        });
    });
}, 'WebGL');
