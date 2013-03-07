/*global defineSuite*/
defineSuite(['Widgets/SceneMode/SceneModeWidget',
             'Widgets/ClockViewModel',
             'Core/JulianDate',
             'Core/ClockStep',
             'Core/ClockRange',
             'Core/Math',
             'Scene/SceneTransitioner',
             'Specs/createScene',
             'Specs/destroyScene'
            ], function(
              SceneModeWidget,
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
        var widget = new SceneModeWidget(document.body, new SceneTransitioner(scene));
        widget.destroy();
        destroyScene(scene);
    });
});