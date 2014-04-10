/*global defineSuite*/
defineSuite([
         'Widgets/BaseLayerPicker/BaseLayerPicker',
         'Scene/ImageryLayerCollection',
         'Scene/EllipsoidTerrainProvider',
         'Specs/EventHelper'
     ], function(
         BaseLayerPicker,
         ImageryLayerCollection,
         EllipsoidTerrainProvider,
         EventHelper) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var MockCentralBody = function(){
        this.imageryLayers = new ImageryLayerCollection();
        this.terrainProvider = new EllipsoidTerrainProvider();
    };

    it('can create and destroy', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var centralBody = new MockCentralBody();
        var widget = new BaseLayerPicker('testContainer', {
            centralBody : centralBody
        });
        expect(widget.container).toBe(container);
        expect(widget.viewModel.centralBody).toBe(centralBody);
        expect(widget.isDestroyed()).toEqual(false);
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    it('mousedown event closes dropdown if target is not inside container', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new BaseLayerPicker('testContainer', {
            centralBody : new MockCentralBody()
        });

        widget.viewModel.dropDownVisible = true;
        EventHelper.fireMouseDown(document.body);
        expect(widget.viewModel.dropDownVisible).toEqual(false);

        widget.viewModel.dropDownVisible = true;
        EventHelper.fireMouseDown(container.firstChild);
        expect(widget.viewModel.dropDownVisible).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('touchstart event closes dropdown if target is not inside container', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new BaseLayerPicker('testContainer', {
            centralBody : new MockCentralBody()
        });

        widget.viewModel.dropDownVisible = true;

        widget.viewModel.dropDownVisible = true;
        EventHelper.fireTouchStart(document.body);
        expect(widget.viewModel.dropDownVisible).toEqual(false);

        widget.viewModel.dropDownVisible = true;
        EventHelper.fireTouchStart(container.firstChild);
        expect(widget.viewModel.dropDownVisible).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('constructor throws with no layer collection', function() {
        expect(function() {
            return new BaseLayerPicker(document.body, undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new BaseLayerPicker(undefined, {
                centralBody : new MockCentralBody()
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new BaseLayerPicker('does not exist', {
                centralBody : new MockCentralBody()
            });
        }).toThrowDeveloperError();
    });
});