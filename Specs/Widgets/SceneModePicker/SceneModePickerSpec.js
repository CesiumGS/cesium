/*global defineSuite*/
defineSuite(['Widgets/SceneModePicker/SceneModePicker',
             'Scene/SceneTransitioner',
             'Specs/createScene',
             'Specs/destroyScene'
            ], function(
              SceneModePicker,
              SceneTransitioner,
              createScene,
              destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('sanity check', function() {
        var scene = createScene();
        var widget = new SceneModePicker(document.body, new SceneTransitioner(scene));
        widget.destroy();
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
});