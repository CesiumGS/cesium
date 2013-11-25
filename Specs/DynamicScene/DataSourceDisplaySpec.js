/*global defineSuite*/
defineSuite([
         'DynamicScene/DataSourceDisplay',
         'Core/Iso8601',
         'Core/JulianDate',
         'DynamicScene/DataSourceCollection',
         'Specs/createScene',
         'Specs/destroyScene',
         'Specs/MockDataSource'
     ], function(
         DataSourceDisplay,
         Iso8601,
         JulianDate,
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

    var MockVisualizer = function(scene, dynamicObjectCollection) {
        this.scene = scene;
        this.dynamicObjectCollection = dynamicObjectCollection;
        this.updatesCalled = 0;
        this.lastUpdateTime = undefined;
        this.destroyed = false;
    };

    MockVisualizer.prototype.getScene = function() {
        return this.scene;
    };

    MockVisualizer.prototype.getDynamicObjectCollection = function() {
        return this.dynamicObjectCollection;
    };

    MockVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        this.dynamicObjectCollection = dynamicObjectCollection;
    };

    MockVisualizer.prototype.update = function(time) {
        this.lastUpdateTime = time;
        this.updatesCalled++;
    };

    MockVisualizer.prototype.removeAllPrimitives = function() {
    };

    MockVisualizer.prototype.isDestroyed = function() {
        return this.destroyed;
    };

    MockVisualizer.prototype.destroy = function() {
        this.destroyed = true;
    };

    it('constructor sets expected values', function() {
        var visualizerTypes = [MockVisualizer];
        var display = new DataSourceDisplay(scene, dataSourceCollection, visualizerTypes);
        expect(display.getScene()).toBe(scene);
        expect(display.getVisualizerTypes()).toEqual(visualizerTypes);
        expect(display.getDataSources()).toBe(dataSourceCollection);
        expect(display.isDestroyed()).toEqual(false);
        display.destroy();
    });

    it('destroy does not destroy underlying data sources', function() {
        var dataSource = new MockDataSource();
        dataSourceCollection.add(dataSource);

        var display = new DataSourceDisplay(scene, dataSourceCollection);

        expect(dataSource.destroyed).toEqual(false);

        display.destroy();

        expect(dataSource.destroyed).toEqual(false);
        expect(display.isDestroyed()).toEqual(true);
    });

    it('update identifies time-varying/non-time-varying sources and updates them accordingly', function() {
        var staticSource = new MockDataSource();
        var dynamicSource = new MockDataSource();
        dynamicSource.isTimeVarying = true;

        var display = new DataSourceDisplay(scene, dataSourceCollection, [MockVisualizer]);
        dataSourceCollection.add(staticSource);
        dataSourceCollection.add(dynamicSource);

        var staticSourceVisualizer = staticSource._visualizerCollection.getVisualizers()[0];
        expect(staticSourceVisualizer).toBeInstanceOf(MockVisualizer);

        var dynamicSourceVisualizer = dynamicSource._visualizerCollection.getVisualizers()[0];
        expect(dynamicSourceVisualizer).toBeInstanceOf(MockVisualizer);

        //Nothing should have happened yet because we haven't called update.
        expect(staticSourceVisualizer.updatesCalled).toEqual(0);
        expect(dynamicSourceVisualizer.updatesCalled).toEqual(0);

        //Update should call update on the visualizer
        display.update(Iso8601.MINIMUM_VALUE);
        expect(staticSourceVisualizer.lastUpdateTime).toEqual(Iso8601.MINIMUM_VALUE);
        expect(staticSourceVisualizer.updatesCalled).toEqual(1);
        expect(dynamicSourceVisualizer.lastUpdateTime).toEqual(Iso8601.MINIMUM_VALUE);
        expect(dynamicSourceVisualizer.updatesCalled).toEqual(1);

        //Calling update again should do nothing for staticSource, but will for the dynamic one
        display.update(Iso8601.MAXIMUM_VALUE);
        expect(staticSourceVisualizer.lastUpdateTime).toEqual(Iso8601.MINIMUM_VALUE);
        expect(staticSourceVisualizer.updatesCalled).toEqual(1);
        expect(dynamicSourceVisualizer.lastUpdateTime).toEqual(Iso8601.MAXIMUM_VALUE);
        expect(dynamicSourceVisualizer.updatesCalled).toEqual(2);

        staticSource.getChangedEvent().raiseEvent(staticSource);

        //Calling update again should update both because staticSource raised it's changed event.
        var newTime = new JulianDate();
        display.update(newTime);
        expect(staticSourceVisualizer.lastUpdateTime).toEqual(newTime);
        expect(staticSourceVisualizer.updatesCalled).toEqual(2);
        expect(dynamicSourceVisualizer.lastUpdateTime).toEqual(newTime);
        expect(dynamicSourceVisualizer.updatesCalled).toEqual(3);

        display.destroy();
    });

    it('a static source can become dynamic (and vice versa)', function() {
        var source = new MockDataSource();
        dataSourceCollection.add(source);

        var display = new DataSourceDisplay(scene, dataSourceCollection, [MockVisualizer]);

        var sourceVisualizer = source._visualizerCollection.getVisualizers()[0];
        expect(sourceVisualizer).toBeInstanceOf(MockVisualizer);

        //Nothing should have happened yet because we haven't called update.
        expect(sourceVisualizer.updatesCalled).toEqual(0);

        //Update should call update on the visualizer
        display.update(Iso8601.MINIMUM_VALUE);
        expect(sourceVisualizer.lastUpdateTime).toBe(Iso8601.MINIMUM_VALUE);
        expect(sourceVisualizer.updatesCalled).toEqual(1);

        //Calling update again should do nothing for source, but will for the dynamic one
        display.update(Iso8601.MAXIMUM_VALUE);
        expect(sourceVisualizer.lastUpdateTime).toBe(Iso8601.MINIMUM_VALUE);
        expect(sourceVisualizer.updatesCalled).toEqual(1);

        //Scheduling a static source for update, but then changing it to time-varying
        //should only result in a single update
        source.getChangedEvent().raiseEvent(source);
        source.isTimeVarying = true;
        source.getChangedEvent().raiseEvent(source);

        //Every update should now result in the visualizer being updated
        var newTime = new JulianDate();
        display.update(newTime);
        expect(sourceVisualizer.lastUpdateTime).toBe(newTime);
        expect(sourceVisualizer.updatesCalled).toEqual(2);

        newTime = new JulianDate();
        display.update(newTime);
        expect(sourceVisualizer.lastUpdateTime).toBe(newTime);
        expect(sourceVisualizer.updatesCalled).toEqual(3);

        //Switch back to static
        source.isTimeVarying = false;
        source.getChangedEvent().raiseEvent(source);

        newTime = new JulianDate();
        display.update(newTime);
        expect(sourceVisualizer.lastUpdateTime).toBe(newTime);
        expect(sourceVisualizer.updatesCalled).toEqual(4);

        var oldTime = newTime;
        newTime = new JulianDate();
        display.update(newTime);
        expect(sourceVisualizer.lastUpdateTime).toBe(oldTime);
        expect(sourceVisualizer.updatesCalled).toEqual(4);

        display.destroy();
    });

    it('constructor throws if scene undefined', function() {
        expect(function(){
            return new DataSourceDisplay(undefined, dataSourceCollection, []);
        }).toThrow();
    });

    it('constructor throws if dataSourceCollection undefined', function() {
        expect(function(){
            return new DataSourceDisplay(scene, undefined, []);
        }).toThrow();
    });

    it('update throws if time undefined', function() {
        var display = new DataSourceDisplay(scene, dataSourceCollection);
        expect(function(){
            return display.update();
        }).toThrow();
        display.destroy();
    });
}, 'WebGL');
