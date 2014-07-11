/*global defineSuite*/
defineSuite([
        'DataSources/DataSourceDisplay',
        'Core/Iso8601',
        'DataSources/DataSourceCollection',
        'Specs/createScene',
        'Specs/destroyScene',
        'Specs/MockDataSource'
    ], function(
        DataSourceDisplay,
        Iso8601,
        DataSourceCollection,
        createScene,
        destroyScene,
        MockDataSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var dataSourceCollection;
    var scene;
    beforeAll(function() {
        scene = createScene();
        dataSourceCollection = new DataSourceCollection();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    var MockVisualizer = function(scene, entityCollection) {
        this.scene = scene;
        this.entityCollection = entityCollection;
        this.updatesCalled = 0;
        this.lastUpdateTime = undefined;
        this.destroyed = false;
    };

    MockVisualizer.prototype.update = function(time) {
        this.lastUpdateTime = time;
        this.updatesCalled++;
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
        var display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : visualizersCallback
        });
        expect(display.getScene()).toBe(scene);
        expect(display.getDataSources()).toBe(dataSourceCollection);
        expect(display.isDestroyed()).toEqual(false);
        display.destroy();
    });

    it('destroy does not destroy underlying data sources', function() {
        var dataSource = new MockDataSource();
        dataSourceCollection.add(dataSource);

        var display = new DataSourceDisplay({
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

        var display = new DataSourceDisplay({
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

        display.destroy();
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
        var display = new DataSourceDisplay({
            scene : scene,
            dataSourceCollection : dataSourceCollection,
            visualizersCallback : visualizersCallback
        });
        expect(function(){
            return display.update();
        }).toThrowDeveloperError();
        display.destroy();
    });
}, 'WebGL');
