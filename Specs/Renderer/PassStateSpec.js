defineSuite([
        'Renderer/PassState'
    ], function(
        PassState) {
    'use strict';

    it('creates a pass state', function() {
        var context = {};
        var passState = new PassState(context);
        expect(passState.context).toBe(context);
        expect(passState.framebuffer).not.toBeDefined();
        expect(passState.blendingEnabled).not.toBeDefined();
        expect(passState.scissorTest).not.toBeDefined();
    });
});
