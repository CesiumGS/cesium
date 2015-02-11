/*global defineSuite*/
defineSuite([
        'Widgets/SceneModePicker/SceneModePicker',
        'Specs/createScene',
        'Specs/DomEventSimulator'
    ], function(
        SceneModePicker,
        createScene,
        DomEventSimulator) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('can create and destroy', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', scene);
        expect(widget.container).toBe(container);
        expect(widget.isDestroyed()).toEqual(false);

        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    it('mousedown event closes dropdown if target is not inside container', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', scene);

        widget.viewModel.dropDownVisible = true;
        DomEventSimulator.fireMouseDown(document.body);
        expect(widget.viewModel.dropDownVisible).toEqual(false);

        widget.viewModel.dropDownVisible = true;
        DomEventSimulator.fireMouseDown(container.firstChild);
        expect(widget.viewModel.dropDownVisible).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('touchstart event closes dropdown if target is not inside container', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', scene);

        widget.viewModel.dropDownVisible = true;
        DomEventSimulator.fireTouchStart(document.body);
        expect(widget.viewModel.dropDownVisible).toEqual(false);

        widget.viewModel.dropDownVisible = true;
        DomEventSimulator.fireTouchStart(container.firstChild);
        expect(widget.viewModel.dropDownVisible).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('constructor throws with no transitioner', function() {
        expect(function() {
            return new SceneModePicker(document.body, undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new SceneModePicker(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new SceneModePicker('does not exist', scene);
        }).toThrowDeveloperError();
    });
}, 'WebGL');