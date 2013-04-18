/*global defineSuite*/
defineSuite([
         'Renderer/PassState'
     ], function(
         PassState) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('creates a pass state', function() {
        var passState = new PassState();
        expect(passState.framebuffer).not.toBeDefined();
        expect(passState.blendingEnabled).not.toBeDefined();
        expect(passState.scissorTest).not.toBeDefined();
    });
});