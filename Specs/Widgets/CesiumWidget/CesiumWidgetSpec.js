/*global defineSuite*/
defineSuite(['Widgets/CesiumWidget/CesiumWidget',
             'Core/Clock',
             'Scene/Scene',
             'Scene/SceneTransitioner',
             'Scene/CentralBody',
             ], function(
             CesiumWidget,
             Clock,
             Scene,
             SceneTransitioner,
             CentralBody) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('sanity check', function() {
        var widget = new CesiumWidget(document.body);
        expect(widget.isDestroyed()).toEqual(false);
        expect(widget.getContainer()).toBeInstanceOf(HTMLElement);
        expect(widget.getCanvas()).toBeInstanceOf(HTMLElement);
        expect(widget.getLogo()).toBeInstanceOf(HTMLElement);
        expect(widget.getScene()).toBeInstanceOf(Scene);
        expect(widget.getCentralBody()).toBeInstanceOf(CentralBody);
        expect(widget.getClock()).toBeInstanceOf(Clock);
        expect(widget.getTransitioner()).toBeInstanceOf(SceneTransitioner);
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);
    });
});