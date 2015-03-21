/*global defineSuite*/
defineSuite([
        'DataSources/DataSourceDisplay',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Iso8601',
        'DataSources/BoundingSphereState',
        'DataSources/DataSourceCollection',
        'DataSources/Entity',
        'Specs/createScene',
        'Specs/MockDataSource'
    ], function(
        DataSourceDisplay,
        BoundingSphere,
        Cartesian3,
        Iso8601,
        BoundingSphereState,
        DataSourceCollection,
        Entity,
        createScene,
        MockDataSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var dataSourceCollection;
    var scene;
    var display;
    beforeAll(function() {
        scene = createScene();
        dataSourceCollection = new DataSourceCollection();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        if (!display.isDestroyed()) {
            display.destroy();
        }
    });

    var MockVisualizer = function(scene, entityCollection) {
        this.scene = scene;
        this.entityCollection = entityCollection;
        this.updatesCalled = 0;
        this.lastUpdateTime = undefined;
        this.destroyed = false;

        this.getBoundingSphereResult = undefined;
        this.getBoundingSphereState = undefined;
    };

    MockVisualizer.prototype.update = function(time) {
        this.lastUpdateTime = time;
        this.updatesCalled++;
    };

    MockVisualizer.prototype.getBoundingSphere = function(entity, result) {
        this.getBoundingSphereResult.clone(result);
        return this.getBoundingSphereState;
    };

    MockVisualizer.prototype.isDestroyed = function() {
        return this.destroyed;
    };

    MockVisualizer.prototype.destroy = function() {
        this.destroyed = true;
    };

    var visualizersCallback = function() {
        return [new MockVisualizer()];
    };

    it('constructor sets expected values', function() {
        display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : visualizersCallback
        });

        expect(display.scene).toBe(scene);
        expect(display.dataSources).toBe(dataSourceCollection);
        expect(display.isDestroyed()).toEqual(false);
        expect(display.defaultDataSource).toBeDefined();

        //deprecated
        expect(display.getScene()).toBe(scene);
        expect(display.getDataSources()).toBe(dataSourceCollection);

        display.destroy();
    });

    it('Computes complete bounding sphere.', function() {
        var visualizer1 = new MockVisualizer();
        visualizer1.getBoundingSphereResult = new BoundingSphere(new Cartesian3(1, 2, 3), 456);
        visualizer1.getBoundingSphereState = BoundingSphereState.DONE;

        var visualizer2 = new MockVisualizer();
        visualizer2.getBoundingSphereResult = new BoundingSphere(new Cartesian3(7, 8, 9), 1011);
        visualizer2.getBoundingSphereState = BoundingSphereState.DONE;

        display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : function() {
                return [visualizer1, visualizer2];
            }
        });

        var entity = new Entity();
        var dataSource = new MockDataSource();
        dataSource.entities.add(entity);
        display.dataSources.add(dataSource);

        var result = new BoundingSphere();
        var state = display.getBoundingSphere(entity, true, result);

        var expected = BoundingSphere.union(visualizer1.getBoundingSphereResult, visualizer2.getBoundingSphereResult);

        expect(state).toBe(BoundingSphereState.DONE);
        expect(result).toEqual(expected);
    });

    it('Computes partial bounding sphere.', function() {
        var visualizer1 = new MockVisualizer();
        visualizer1.getBoundingSphereResult = new BoundingSphere(new Cartesian3(1, 2, 3), 456);
        visualizer1.getBoundingSphereState = BoundingSphereState.PENDING;

        var visualizer2 = new MockVisualizer();
        visualizer2.getBoundingSphereResult = new BoundingSphere(new Cartesian3(7, 8, 9), 1011);
        visualizer2.getBoundingSphereState = BoundingSphereState.DONE;

        display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : function() {
                return [visualizer1, visualizer2];
            }
        });

        var entity = new Entity();
        var dataSource = new MockDataSource();
        dataSource.entities.add(entity);
        display.dataSources.add(dataSource);

        var result = new BoundingSphere();
        var state = display.getBoundingSphere(entity, true, result);

        expect(state).toBe(BoundingSphereState.DONE);
        expect(result).toEqual(visualizer2.getBoundingSphereResult);
    });

    it('Fails complete bounding sphere if allowPartial false.', function() {
        var visualizer1 = new MockVisualizer();
        visualizer1.getBoundingSphereResult = new BoundingSphere(new Cartesian3(1, 2, 3), 456);
        visualizer1.getBoundingSphereState = BoundingSphereState.PENDING;

        var visualizer2 = new MockVisualizer();
        visualizer2.getBoundingSphereResult = new BoundingSphere(new Cartesian3(7, 8, 9), 1011);
        visualizer2.getBoundingSphereState = BoundingSphereState.DONE;

        display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : function() {
                return [visualizer1, visualizer2];
            }
        });

        var entity = new Entity();
        display.defaultDataSource.entities.add(entity);

        var result = new BoundingSphere();
        var state = display.getBoundingSphere(entity, false, result);

        expect(state).toBe(BoundingSphereState.PENDING);
    });

    it('Fails bounding sphere for entity without visualization.', function() {
        display = new DataSourceDisplay({
            dataSourceCollection : dataSourceCollection,
            scene : scene
        });
        var entity = new Entity();
        var dataSource = new MockDataSource();
        dataSource.entities.add(entity);
        display.dataSources.add(dataSource);
        var result = new BoundingSphere();
        var state = display.getBoundingSphere(entity, false, result);
        expect(state).toBe(BoundingSphereState.FAILED);
        display.destroy();
    });

    it('Fails bounding sphere for entity not in a data source.', function() {
        display = new DataSourceDisplay({
            dataSourceCollection : dataSourceCollection,
            scene : scene
        });
        var entity = new Entity();
        var result = new BoundingSphere();
        var state = display.getBoundingSphere(entity, false, result);
        expect(state).toBe(BoundingSphereState.FAILED);
        display.destroy();
    });

    it('Compute bounding sphere throws without entity.', function() {
        display = new DataSourceDisplay({
            dataSourceCollection : dataSourceCollection,
            scene : scene
        });
        var entity = new Entity();
        var result = new BoundingSphere();
        expect(function() {
            display.getBoundingSphere(undefined, false, result);
        }).toThrowDeveloperError();
    });

    it('Compute bounding sphere throws without result.', function() {
        display = new DataSourceDisplay({
            dataSourceCollection : dataSourceCollection,
            scene : scene
        });
        var entity = new Entity();
        expect(function() {
            display.getBoundingSphere(entity, false, undefined);
        }).toThrowDeveloperError();
    });

    it('Compute bounding sphere throws without allowPartial.', function() {
        display = new DataSourceDisplay({
            dataSourceCollection : dataSourceCollection,
            scene : scene
        });
        var entity = new Entity();
        var result = new BoundingSphere();
        expect(function() {
            display.getBoundingSphere(entity, undefined, result);
        }).toThrowDeveloperError();
    });

    it('destroy does not destroy underlying data sources', function() {
        var dataSource = new MockDataSource();
        dataSourceCollection.add(dataSource);

        display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection
        });

        expect(dataSource.destroyed).toEqual(false);

        display.destroy();

        expect(dataSource.destroyed).toEqual(false);
        expect(display.isDestroyed()).toEqual(true);
    });

    it('calling update updates data sources', function() {
        var source1 = new MockDataSource();
        var source2 = new MockDataSource();

        display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : visualizersCallback
        });
        dataSourceCollection.add(source1);
        dataSourceCollection.add(source2);

        var source1Visualizer = source1._visualizers[0];
        expect(source1Visualizer).toBeInstanceOf(MockVisualizer);

        var source2Visualizer = source2._visualizers[0];
        expect(source2Visualizer).toBeInstanceOf(MockVisualizer);

        //Nothing should have happened yet because we haven't called update.
        expect(source1Visualizer.updatesCalled).toEqual(0);
        expect(source2Visualizer.updatesCalled).toEqual(0);

        //Update should call update on the visualizers
        display.update(Iso8601.MINIMUM_VALUE);
        expect(source1Visualizer.lastUpdateTime).toEqual(Iso8601.MINIMUM_VALUE);
        expect(source1Visualizer.updatesCalled).toEqual(1);
        expect(source2Visualizer.lastUpdateTime).toEqual(Iso8601.MINIMUM_VALUE);
        expect(source2Visualizer.updatesCalled).toEqual(1);
    });

    it('constructor throws if scene undefined', function() {
        expect(function(){
            return new DataSourceDisplay({
                scene : undefined,
                dataSourceCollection : dataSourceCollection,
                visualizersCallback : visualizersCallback
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws if options undefined', function() {
        expect(function(){
            return new DataSourceDisplay(undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws if dataSourceCollection undefined', function() {
        expect(function(){
            return new DataSourceDisplay({
                scene : scene,
                dataSourceCollection : undefined,
                visualizersCallback : visualizersCallback
            });
        }).toThrowDeveloperError();
    });

    it('update throws if time undefined', function() {
        display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : visualizersCallback
        });
        expect(function(){
            return display.update();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
