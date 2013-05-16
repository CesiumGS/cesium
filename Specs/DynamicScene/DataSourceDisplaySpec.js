/*global defineSuite*/
defineSuite(['DynamicScene/DataSourceDisplay',
             'Core/Event',
             'DynamicScene/DynamicObjectCollection',
             'Specs/createScene',
             'Specs/destroyScene'
            ], function(
                    DataSourceDisplay,
                    Event,
                    DynamicObjectCollection,
                    createScene,
                    destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    var MockDataSource = function() {
        var event = new Event();
        this.getChangedEvent = function() {
            return event;
        };

        var errorEvent = new Event();

        this.getErrorEvent = function() {
            return errorEvent;
        };

        this.getClock = function() {
            return undefined;
        };

        var dynamicObjectCollection = new DynamicObjectCollection();

        this.getDynamicObjectCollection = function() {
            return dynamicObjectCollection;
        };

        this.getIsTemporal = function() {
            return false;
        };

        this.destroyCalled = false;
        this.destroy = function() {
            this.destroyCalled = true;
        };
    };

    it('constructor sets expected values', function() {
        var display = new DataSourceDisplay(scene);
        expect(display.getScene()).toBe(scene);
        expect(display.getDataSources().getLength()).toEqual(0);
        expect(display.isDestroyed()).toEqual(false);
        display.destroy();
    });

    it('destroy destroys underlying data sources', function() {
        var display = new DataSourceDisplay(scene);
        var dataSource = new MockDataSource();
        var dataSourceNoDestroy = new MockDataSource();
        delete dataSourceNoDestroy.destroy;
        display.getDataSources().add(dataSource);
        display.getDataSources().add(dataSourceNoDestroy);

        expect(dataSource.destroyCalled).toEqual(false);
        expect(dataSourceNoDestroy.destroyCalled).toEqual(false);

        display.destroy();

        expect(dataSource.destroyCalled).toEqual(true);
        expect(dataSourceNoDestroy.destroyCalled).toEqual(false);
        expect(display.isDestroyed()).toEqual(true);
    });

    it('constructor throws if scene undefined', function() {
        expect(function(){
            return new DataSourceDisplay(undefined, []);
        }).toThrow();
    });
});
