/*global defineSuite*/
defineSuite([
         'DynamicScene/VisualizerCollection',
         'Core/JulianDate'
     ], function(
         VisualizerCollection,
         JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function MockVisualizer() {
        this.updateTime = undefined;
        this.isDestroyed = false;
        this.removeAllPrimitivesCalled = false;
    }

    MockVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        this.mockCollection = dynamicObjectCollection;
    };

    MockVisualizer.prototype.update = function(time) {
        this.updateTime = time;
    };

    MockVisualizer.prototype.removeAllPrimitives = function() {
        this.removeAllPrimitivesCalled = true;
    };

    MockVisualizer.prototype.destroy = function() {
        this.isDestroyed = true;
    };

    function MockDynamicObjectCollection() {
    }

    it('Default constructor creates expected default properties', function() {
        var visualizers = new VisualizerCollection();
        expect(visualizers.getVisualizers().length).toEqual(0);
        expect(visualizers.getDynamicObjectCollection()).toBeUndefined();
        expect(visualizers.isDestroyed()).toEqual(false);
    });

    it('Constructor assigns expected paramters to properies', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        expect(visualizers.getVisualizers().length).toEqual(1);
        expect(visualizers.getDynamicObjectCollection()).toEqual(mockCollection);
        expect(mockVisualizer.mockCollection).toEqual(mockCollection);
    });

    it('Constructor assigns expected paramters to properies', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        expect(visualizers.getVisualizers().length).toEqual(1);
        expect(visualizers.getDynamicObjectCollection()).toEqual(mockCollection);
        expect(mockVisualizer.mockCollection).toEqual(mockCollection);
    });

    it('setVisualizers destroys old visualizers by default', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        visualizers.setVisualizers([]);
        expect(mockVisualizer.isDestroyed).toEqual(true);
    });

    it('setVisualizers does not destroys old visualizers if told', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        visualizers.setVisualizers([], false);
        expect(mockVisualizer.isDestroyed).toEqual(false);
    });

    it('setVisualizers does not destroys visualizers that is in new list', function() {
        var mockVisualizer = new MockVisualizer();
        var mockVisualizer2 = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer, mockVisualizer2], mockCollection);
        visualizers.setVisualizers([mockVisualizer]);
        expect(mockVisualizer.isDestroyed).toEqual(false);
        expect(mockVisualizer2.isDestroyed).toEqual(true);
    });

    it('destroy destroys old visualizers by default', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        visualizers.destroy();
        expect(visualizers.isDestroyed()).toEqual(true);
        expect(mockVisualizer.isDestroyed).toEqual(true);
    });

    it('destroy does not destroy old visualizers if told', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        visualizers.destroy(false);
        expect(visualizers.isDestroyed()).toEqual(true);
        expect(mockVisualizer.isDestroyed).toEqual(false);
    });

    it('setDynamicObjectCollection calls setDynamicObjectCollection on underlying visualizers', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer]);
        visualizers.setDynamicObjectCollection(mockCollection);
        expect(mockVisualizer.mockCollection).toEqual(mockCollection);
    });

    it('update calls update on underlying visualizers', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        var updateTime = new JulianDate();
        visualizers.update(updateTime);
        expect(mockVisualizer.updateTime).toEqual(updateTime);
    });

    it('removeAllPrimitives calls removeAllPrimitives on underlying visualizers', function() {
        var mockVisualizer = new MockVisualizer();
        var mockCollection = new MockDynamicObjectCollection();

        var visualizers = new VisualizerCollection([mockVisualizer], mockCollection);
        visualizers.removeAllPrimitives();
        expect(mockVisualizer.removeAllPrimitivesCalled).toEqual(true);
    });
});