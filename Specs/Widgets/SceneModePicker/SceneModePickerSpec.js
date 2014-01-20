/*global defineSuite*/
defineSuite([
         'Widgets/SceneModePicker/SceneModePicker',
         'Scene/SceneTransitioner',
         'Specs/createScene',
         'Specs/destroyScene',
         'Specs/EventHelper'
     ], function(
         SceneModePicker,
         SceneTransitioner,
         createScene,
         destroyScene,
         EventHelper) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('can create and destroy', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', new SceneTransitioner(scene));
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

        var widget = new SceneModePicker('testContainer', new SceneTransitioner(scene));

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
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', new SceneTransitioner(scene));

        widget.viewModel.dropDownVisible = true;
        EventHelper.fireTouchStart(document.body);
        expect(widget.viewModel.dropDownVisible).toEqual(false);

        widget.viewModel.dropDownVisible = true;
        EventHelper.fireTouchStart(container.firstChild);
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
            return new SceneModePicker(undefined, new SceneTransitioner(scene));
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new SceneModePicker('does not exist', new SceneTransitioner(scene));
        }).toThrowDeveloperError();
    });
}, 'WebGL');