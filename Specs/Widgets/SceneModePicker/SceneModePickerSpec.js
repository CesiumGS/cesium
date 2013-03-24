/*global defineSuite*/
defineSuite(['Widgets/SceneModePicker/SceneModePicker',
             'Widgets/ClockViewModel',
             'Core/JulianDate',
             'Core/ClockStep',
             'Core/ClockRange',
             'Core/Math',
             'Scene/SceneTransitioner',
             'Specs/createScene',
             'Specs/destroyScene'
            ], function(
              SceneModePicker,
              ClockViewModel,
              JulianDate,
              ClockStep,
              ClockRange,
              CesiumMath,
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
});