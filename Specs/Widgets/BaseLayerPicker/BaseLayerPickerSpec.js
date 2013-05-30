/*global defineSuite*/
defineSuite(['Widgets/BaseLayerPicker/BaseLayerPicker',
             'Scene/ImageryLayerCollection',
             'Specs/EventHelper'
            ], function(
              BaseLayerPicker,
              ImageryLayerCollection,
              EventHelper) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can create and destroy', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var layers = new ImageryLayerCollection();

        var widget = new BaseLayerPicker('testContainer', layers);
        expect(widget.getContainer()).toBe(container);
        expect(widget.getViewModel().getImageryLayers()).toBe(layers);
        expect(widget.isDestroyed()).toEqual(false);
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    it('mousedown event closes dropdown if target is not container', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new BaseLayerPicker('testContainer', new ImageryLayerCollection());

        widget.getViewModel().dropDownVisible(true);
        EventHelper.fireMouseDown(document.body);
        expect(widget.getViewModel().dropDownVisible()).toEqual(false);

        widget.getViewModel().dropDownVisible(true);
        EventHelper.fireMouseDown(container);
        expect(widget.getViewModel().dropDownVisible()).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('touchstart event closes dropdown if target is not container', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new BaseLayerPicker('testContainer', new ImageryLayerCollection());

        widget.getViewModel().dropDownVisible(true);

        widget.getViewModel().dropDownVisible(true);
        EventHelper.fireTouchStart(document.body);
        expect(widget.getViewModel().dropDownVisible()).toEqual(false);

        widget.getViewModel().dropDownVisible(true);
        EventHelper.fireTouchStart(container);
        expect(widget.getViewModel().dropDownVisible()).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('constructor throws with no layer collection', function() {
        expect(function() {
            return new BaseLayerPicker(document.body, undefined);
        }).toThrow();
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new BaseLayerPicker(undefined, new ImageryLayerCollection());
        }).toThrow();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new BaseLayerPicker('does not exist', new ImageryLayerCollection());
        }).toThrow();
    });
});