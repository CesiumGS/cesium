defineSuite([
        'DataSources/GeometryVisualizer',
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
        'DataSources/EllipseGeometryUpdater',
        'DataSources/EllipseGraphics',
        'DataSources/Entity',
        'DataSources/EntityCollection',
        'DataSources/GridMaterialProperty',
        'DataSources/SampledProperty',
        'DataSources/StaticGeometryColorBatch',
        'DataSources/StaticGeometryPerMaterialBatch',
        'DataSources/StaticGroundGeometryColorBatch',
        'DataSources/StaticOutlineGeometryBatch',
        'Scene/ClassificationType',
        'Scene/GroundPrimitive',
        'Scene/MaterialAppearance',
        'Scene/PerInstanceColorAppearance',
        'Scene/ShadowMode',
        'Specs/createDynamicProperty',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        GeometryVisualizer,
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
        EllipseGeometryUpdater,
        EllipseGraphics,
        Entity,
        EntityCollection,
        GridMaterialProperty,
        SampledProperty,
        StaticGeometryColorBatch,
        StaticGeometryPerMaterialBatch,
        StaticGroundGeometryColorBatch,
        StaticOutlineGeometryBatch,
        ClassificationType,
        GroundPrimitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        ShadowMode,
        createDynamicProperty,
        createScene,
        pollToPromise) {
    'use strict';

    var time = JulianDate.now();

    var scene;
    beforeAll(function() {
        scene = createScene();

        return GroundPrimitive.initializeTerrainHeights();
    });

    afterAll(function() {
        scene.destroyForSpecs();

        // Leave ground primitive uninitialized
        GroundPrimitive._initialized = false;
        GroundPrimitive._initPromise = undefined;
        GroundPrimitive._terrainHeights = undefined;
    });

    it('Can create and destroy', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);
        expect(visualizer.update(time)).toBe(true);
        expect(scene.primitives.length).toBe(0);
        expect(visualizer.isDestroyed()).toBe(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toBe(true);
    });

    it('Creates and removes static color open geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();
        ellipse.height = new ConstantProperty(0);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
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
            expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);
            expect(primitive.appearance.closed).toBe(true);

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

    it('Creates and removes static material open geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
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
            expect(primitive.appearance).toBeInstanceOf(MaterialAppearance);
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

    it('Creates and removes static color closed geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();
        ellipse.extrudedHeight = new ConstantProperty(1000);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
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
            expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);
            expect(primitive.appearance.closed).toBe(true);

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

    it('Creates and removes static material closed geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();
        ellipse.extrudedHeight = new ConstantProperty(1000);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
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
            expect(primitive.appearance).toBeInstanceOf(MaterialAppearance);
            expect(primitive.appearance.closed).toBe(true);

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

    it('Creates and removes static outline geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.outline = new ConstantProperty(true);
        ellipse.outlineColor = new ConstantProperty(Color.BLUE);
        ellipse.fill = new ConstantProperty(false);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
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
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.BLUE));
            expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);

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
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();
        ellipse.extrudedHeight = new ConstantProperty(1000);
        ellipse.shadows = new ConstantProperty(shadows);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
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

    function createAndRemoveGeometryWithClassificationType(type) {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();
        ellipse.classificationType = new ConstantProperty(type);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            var primitive = scene.groundPrimitives.get(0);
            expect(primitive.classificationType).toBe(type);

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

    it('Creates and removes geometry classifying terrain', function() {
        return createAndRemoveGeometryWithClassificationType(ClassificationType.TERRAIN);
    });

    it('Creates and removes geometry classifying 3D Tiles', function() {
        return createAndRemoveGeometryWithClassificationType(ClassificationType.CESIUM_3D_TILE);
    });

    it('Creates and removes geometry classifying both terrain and 3D Tiles', function() {
        return createAndRemoveGeometryWithClassificationType(ClassificationType.BOTH);
    });

    it('Correctly handles geometry changing batches', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();
        ellipse.height = new ConstantProperty(0);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
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
            expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);

            ellipse.material = new GridMaterialProperty();

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

    it('Correctly handles modifying translucent outline color', function() {
        var entities = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, entities);

        var color = Color.BLUE.withAlpha(0.5);
        var entity = entities.add({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                fill : false,
                outline : true,
                outlineColor : color
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
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(color));

            color = Color.RED.withAlpha(0.5);
            entity.ellipse.outlineColor.setValue(color);

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
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(color));

            entities.remove(entity);
            visualizer.destroy();
        });
    });

    it('Creates and removes dynamic geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new SampledProperty(Number);
        ellipse.semiMajorAxis.addSample(time, 2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.extrudedHeight = new ConstantProperty(1000);
        ellipse.material = new ColorMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
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

    it('Creates and removes dynamic geometry on terrain ', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new SampledProperty(Number);
        ellipse.semiMajorAxis.addSample(time, 2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
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

    it('Constructor throws without type', function() {
        var objects = new EntityCollection();
        expect(function() {
            return new GeometryVisualizer(undefined, scene, objects);
        }).toThrowDeveloperError();
    });

    it('Constructor throws without scene', function() {
        var objects = new EntityCollection();
        expect(function() {
            return new GeometryVisualizer(undefined, objects);
        }).toThrowDeveloperError();
    });

    it('Update throws without time parameter', function() {
        var visualizer = new GeometryVisualizer(scene, new EntityCollection());
        expect(function() {
            visualizer.update(undefined);
        }).toThrowDeveloperError();
    });

    it('removes the listener from the entity collection when destroyed', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, entityCollection);
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
        visualizer.destroy();
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it('Computes dynamic geometry bounding sphere.', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, entityCollection);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.height = new ConstantProperty(0);

        var entity = new Entity();
        entity.position = Cartesian3.fromDegrees(0, 0, 0);
        entity.ellipse = ellipse;
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
        var visualizer = new GeometryVisualizer(scene, entityCollection);

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
        var visualizer = new GeometryVisualizer(scene, entityCollection);

        expect(function() {
            visualizer.getBoundingSphere(entity, undefined);
        }).toThrowDeveloperError();

        visualizer.destroy();
    });

    it('Can remove and entity and then add a new new instance with the same id.', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, objects);

        var entity = new Entity({
            id : 'test',
            position : Cartesian3.fromDegrees(0, 0, 0),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                material : Color.ORANGE,
                height : 0
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
                ellipse : {
                    semiMajorAxis : 2,
                    semiMinorAxis : 1,
                    material : Color.BLUE,
                    height : 0
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
                expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance);

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
        var visualizer = new GeometryVisualizer(scene, entities);

        var entity = entities.add({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                material : new ColorMaterialProperty(createDynamicProperty(Color.BLUE)),
                height : 0
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

    it('Sets static geometry primitive show attribute when using dynamic outline color', function() {
        var entities = new EntityCollection();
        var visualizer = new GeometryVisualizer(scene, entities);

        var entity = entities.add({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                fill : false,
                outline : true,
                outlineColor : createDynamicProperty(Color.BLUE)
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
        var visualizer = new GeometryVisualizer(scene, entities);

        var entity = entities.add({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                material : new GridMaterialProperty({
                    color : createDynamicProperty(Color.BLUE)
                })
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
