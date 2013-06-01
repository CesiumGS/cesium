/*global defineSuite*/
defineSuite([
         'Widgets/CesiumWidget/CesiumWidget',
         'Core/Clock',
         'Core/ScreenSpaceEventHandler',
         'Scene/Scene',
         'Scene/SceneTransitioner',
         'Scene/CentralBody'
     ], function(
         CesiumWidget,
         Clock,
         ScreenSpaceEventHandler,
         Scene,
         SceneTransitioner,
         CentralBody) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('sanity check', function() {
        var widget = new CesiumWidget(document.body);
        expect(widget.isDestroyed()).toEqual(false);
        expect(widget.container).toBeInstanceOf(HTMLElement);
        expect(widget.canvas).toBeInstanceOf(HTMLElement);
        expect(widget.cesiumLogo).toBeInstanceOf(HTMLElement);
        expect(widget.scene).toBeInstanceOf(Scene);
        expect(widget.centralBody).toBeInstanceOf(CentralBody);
        expect(widget.clock).toBeInstanceOf(Clock);
        expect(widget.transitioner).toBeInstanceOf(SceneTransitioner);
        expect(widget.screenSpaceEventHandler).toBeInstanceOf(ScreenSpaceEventHandler);
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);
    });
});