/*global defineSuite*/
defineSuite(['Widgets/CesiumWidget/CesiumWidget'
             ], function(
             CesiumWidget) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('sanity check', function() {
        var widget = new CesiumWidget(document.body);
        expect(widget.isDestroyed()).toEqual(false);
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);
    });
});