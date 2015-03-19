/*global defineSuite*/
defineSuite([
        'Renderer/PassState'
    ], function(
        PassState) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('creates a pass state', function() {
        var context = {};
        var passState = new PassState(context);
        expect(passState.context).toBe(context);
        expect(passState.framebuffer).not.toBeDefined();
        expect(passState.blendingEnabled).not.toBeDefined();
        expect(passState.scissorTest).not.toBeDefined();
    });
});