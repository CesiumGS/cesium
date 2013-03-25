/*global defineSuite*/
defineSuite(['Widgets/SceneModePicker/SceneModePicker',
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

    it('can create and destroy', function() {
        var scene = createScene();

        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', new SceneTransitioner(scene));
        widget.destroy();

        document.body.removeChild(container);
        destroyScene(scene);
    });

    it('mousedown event closes dropdown if target is not container', function() {
        var scene = createScene();

        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', new SceneTransitioner(scene));

        widget.viewModel.dropDownVisible(true);
        EventHelper.fireMouseDown(document.body);
        expect(widget.viewModel.dropDownVisible()).toEqual(false);

        widget.viewModel.dropDownVisible(true);
        EventHelper.fireMouseDown(container);
        expect(widget.viewModel.dropDownVisible()).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
        destroyScene(scene);
    });

    it('touchstart event closes dropdown if target is not container', function() {
        var scene = createScene();

        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new SceneModePicker('testContainer', new SceneTransitioner(scene));

        widget.viewModel.dropDownVisible(true);

        widget.viewModel.dropDownVisible(true);
        EventHelper.fireTouchStart(document.body);
        expect(widget.viewModel.dropDownVisible()).toEqual(false);

        widget.viewModel.dropDownVisible(true);
        EventHelper.fireTouchStart(container);
        expect(widget.viewModel.dropDownVisible()).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
        destroyScene(scene);
    });

    it('constructor throws with no transitioner', function() {
        expect(function() {
            return new SceneModePicker(document.body, undefined);
        }).toThrow();
    });

    it('constructor throws with no element', function() {
        var scene = createScene();
        expect(function() {
            return new SceneModePicker(undefined, new SceneTransitioner(scene));
        }).toThrow();
        destroyScene(scene);
    });

    it('constructor throws with string element that does not exist', function() {
        var scene = createScene();
        expect(function() {
            return new SceneModePicker('does not exist', new SceneTransitioner(scene));
        }).toThrow();
        destroyScene(scene);
    });
});